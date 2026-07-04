import { useRef, useState, useCallback, useEffect } from "react";
import api from "../lib/api";

export type RecorderPhase = "idle" | "requesting" | "recording" | "saving" | "done" | "error";

interface UseWebRecorderReturn {
  phase: RecorderPhase;
  elapsed: number; // seconds since recording started
  hasTabAudio: boolean; // whether screen share audio is captured
  error: string | null;
  start: (meetingId: string) => Promise<void>;
  stop: () => Promise<void>;
}

export function useWebRecorder(): UseWebRecorderReturn {
  const [phase, setPhase] = useState<RecorderPhase>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [hasTabAudio, setHasTabAudio] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Current 30s chunk buffers
  const micChunksRef = useRef<Blob[]>([]);
  const tabChunksRef = useRef<Blob[]>([]);
  // Full recording buffers for Spaces upload
  const allMicRef = useRef<Blob[]>([]);
  const allTabRef = useRef<Blob[]>([]);

  const micRecorderRef = useRef<MediaRecorder | null>(null);
  const tabRecorderRef = useRef<MediaRecorder | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const tabStreamRef = useRef<MediaStream | null>(null);
  const chunkIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef(0);
  const seqRef = useRef(0);
  const meetingIdRef = useRef<string | null>(null);

  function stopStreams() {
    micStreamRef.current?.getTracks().forEach((t) => t.stop());
    tabStreamRef.current?.getTracks().forEach((t) => t.stop());
    micStreamRef.current = null;
    tabStreamRef.current = null;
  }

  const uploadCurrentChunk = useCallback(async (mId: string) => {
    const micBlobs = micChunksRef.current.splice(0);
    const tabBlobs = tabChunksRef.current.splice(0);
    if (!micBlobs.length && !tabBlobs.length) return;

    seqRef.current += 1;
    const form = new FormData();
    form.append("seq", String(seqRef.current));
    if (micBlobs.length) form.append("mic_audio", new Blob(micBlobs, { type: "audio/webm" }), "mic.webm");
    if (tabBlobs.length) form.append("tab_audio", new Blob(tabBlobs, { type: "audio/webm" }), "tab.webm");
    try {
      await api.post(`/meetings/${mId}/chunks-web`, form);
    } catch (e: unknown) {
      const status = (e as { response?: { status?: number } })?.response?.status;
      if (status === 409) return; // meeting already finalized — ignore
      console.warn("[WebRecorder] chunk upload failed:", e);
    }
  }, []);

  const start = useCallback(async (mId: string): Promise<void> => {
    // Set ref synchronously so second StrictMode call sees it immediately
    if (meetingIdRef.current === mId) return;
    meetingIdRef.current = mId;

    setError(null);
    setPhase("requesting");

    let micStream: MediaStream;
    try {
      micStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    } catch {
      meetingIdRef.current = null; // allow retry
      setError("Microphone access denied. Please allow mic access and try again.");
      setPhase("error");
      return;
    }

    // Web recorder is mic-only — the Chrome extension handles tab/screen capture.
    micStreamRef.current = micStream;
    tabStreamRef.current = null;
    setHasTabAudio(false);
    seqRef.current = 0;
    micChunksRef.current = [];
    tabChunksRef.current = [];
    allMicRef.current = [];
    allTabRef.current = [];

    const mimeType = getSupportedMimeType();
    const recorderOpts = mimeType ? { mimeType } : {};

    const micRecorder = new MediaRecorder(micStream, recorderOpts);
    micRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) { micChunksRef.current.push(e.data); allMicRef.current.push(e.data); }
    };
    micRecorderRef.current = micRecorder;

    micRecorder.start(1000);
    startTimeRef.current = Date.now();
    setElapsed(0);

    timerIntervalRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);

    chunkIntervalRef.current = setInterval(() => {
      if (meetingIdRef.current) uploadCurrentChunk(meetingIdRef.current);
    }, 180000);

    setPhase("recording");
  }, [uploadCurrentChunk]);

  const stop = useCallback(async (): Promise<void> => {
    const mId = meetingIdRef.current;
    if (!mId) return;

    setPhase("saving");
    clearInterval(chunkIntervalRef.current!);
    clearInterval(timerIntervalRef.current!);

    const durationSeconds = Math.floor((Date.now() - startTimeRef.current) / 1000);

    // Stop recorders and collect final chunks
    await new Promise<void>((resolve) => {
      const recorders = [micRecorderRef.current, tabRecorderRef.current].filter(Boolean) as MediaRecorder[];
      if (!recorders.length) { resolve(); return; }
      let n = recorders.length;
      recorders.forEach((r) => {
        r.addEventListener("stop", () => { if (--n === 0) resolve(); }, { once: true });
        r.stop();
      });
      setTimeout(resolve, 3000); // failsafe
    });

    stopStreams();

    // Upload remaining chunks
    await uploadCurrentChunk(mId);

    // Finalize — triggers AI analysis
    try {
      await api.post(`/meetings/${mId}/finalize`, {
        file_size: new Blob(allMicRef.current).size,
        duration_seconds: durationSeconds,
      });
    } catch (e) {
      console.warn("[WebRecorder] finalize failed:", e);
    }

    // Upload full audio to Spaces in background, then patch spaces_key
    const allChunks = [...allMicRef.current, ...allTabRef.current];
    if (allChunks.length) {
      uploadToSpaces(mId, allChunks, durationSeconds).catch((e) =>
        console.warn("[WebRecorder] Spaces upload failed:", e)
      );
    }

    setPhase("done");
  }, [uploadCurrentChunk]);

  // Warn before unload while recording
  useEffect(() => {
    if (phase !== "recording") return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [phase]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearInterval(chunkIntervalRef.current!);
      clearInterval(timerIntervalRef.current!);
      stopStreams();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { phase, elapsed, hasTabAudio, error, start, stop };
}

function getSupportedMimeType(): string | undefined {
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
    "audio/mp4",
  ];
  return candidates.find((t) => MediaRecorder.isTypeSupported(t));
}

async function uploadToSpaces(meetingId: string, chunks: Blob[], durationSeconds: number) {
  const blob = new Blob(chunks, { type: "audio/webm" });
  const { data: presign } = await api.post<{ upload_url: string; key: string }>("/meetings/presign", {
    meeting_id: meetingId,
    file_size: blob.size,
    content_type: "audio/webm",
  });
  await fetch(presign.upload_url, { method: "PUT", body: blob, headers: { "Content-Type": "audio/webm" } });
  // Patch audio key without re-triggering analysis
  await api.patch(`/meetings/${meetingId}/audio`, { spaces_key: presign.key, file_size: blob.size, duration_seconds: durationSeconds });
}
