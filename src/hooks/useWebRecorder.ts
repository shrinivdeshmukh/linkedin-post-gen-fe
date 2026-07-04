import { useRef, useState, useCallback, useEffect } from "react";
import api from "../lib/api";

export type RecorderPhase = "idle" | "requesting" | "recording" | "saving" | "done" | "error";

interface UseWebRecorderReturn {
  phase: RecorderPhase;
  elapsed: number;
  error: string | null;
  start: (meetingId: string) => Promise<void>;
  stop: () => Promise<void>;
}

export function useWebRecorder(): UseWebRecorderReturn {
  const [phase, setPhase] = useState<RecorderPhase>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const allChunksRef = useRef<Blob[]>([]);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef(0);
  const meetingIdRef = useRef<string | null>(null);

  function cleanup() {
    clearInterval(timerRef.current!);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  const start = useCallback(async (mId: string): Promise<void> => {
    if (meetingIdRef.current === mId) return; // StrictMode guard
    meetingIdRef.current = mId;

    setError(null);
    setPhase("requesting");

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    } catch {
      meetingIdRef.current = null;
      setError("Microphone access denied. Please allow mic access and try again.");
      setPhase("error");
      return;
    }

    streamRef.current = stream;
    allChunksRef.current = [];

    const mimeType = getSupportedMimeType();
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : {});
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) allChunksRef.current.push(e.data);
    };
    recorderRef.current = recorder;
    recorder.start(1000);

    startTimeRef.current = Date.now();
    setElapsed(0);
    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);

    setPhase("recording");
  }, []);

  const stop = useCallback(async (): Promise<void> => {
    const mId = meetingIdRef.current;
    if (!mId) return;

    setPhase("saving");
    clearInterval(timerRef.current!);

    const durationSeconds = Math.floor((Date.now() - startTimeRef.current) / 1000);

    // Stop recorder and collect all remaining data
    await new Promise<void>((resolve) => {
      const r = recorderRef.current;
      if (!r || r.state === "inactive") { resolve(); return; }
      r.addEventListener("stop", () => resolve(), { once: true });
      r.stop();
      setTimeout(resolve, 3000);
    });

    cleanup();

    // Send full recording as a single chunk for transcription
    const blob = new Blob(allChunksRef.current, { type: "audio/webm" });
    if (blob.size > 0) {
      try {
        const form = new FormData();
        form.append("seq", "1");
        form.append("mic_audio", blob, "recording.webm");
        await api.post(`/meetings/${mId}/chunks-web`, form);
      } catch (e: unknown) {
        const status = (e as { response?: { status?: number } })?.response?.status;
        if (status !== 409) console.warn("[WebRecorder] upload failed:", e);
      }
    }

    // Finalize — triggers AI analysis
    try {
      await api.post(`/meetings/${mId}/finalize`, {
        file_size: blob.size,
        duration_seconds: durationSeconds,
      });
    } catch (e) {
      console.warn("[WebRecorder] finalize failed:", e);
    }

    // Upload to Spaces in background for audio playback
    if (blob.size > 0) {
      uploadToSpaces(mId, blob, durationSeconds).catch((e) =>
        console.warn("[WebRecorder] Spaces upload failed:", e)
      );
    }

    setPhase("done");
  }, []);

  // Warn before unload while recording
  useEffect(() => {
    if (phase !== "recording") return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [phase]);

  useEffect(() => () => cleanup(), []);  // eslint-disable-line react-hooks/exhaustive-deps

  return { phase, elapsed, error, start, stop };
}

function getSupportedMimeType(): string | undefined {
  return ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", "audio/mp4"]
    .find((t) => MediaRecorder.isTypeSupported(t));
}

async function uploadToSpaces(meetingId: string, blob: Blob, durationSeconds: number) {
  const { data: presign } = await api.post<{ upload_url: string; key: string }>("/meetings/presign", {
    meeting_id: meetingId,
    file_size: blob.size,
    content_type: "audio/webm",
  });
  await fetch(presign.upload_url, { method: "PUT", body: blob, headers: { "Content-Type": "audio/webm" } });
  await api.patch(`/meetings/${meetingId}/audio`, {
    spaces_key: presign.key,
    file_size: blob.size,
    duration_seconds: durationSeconds,
  });
}
