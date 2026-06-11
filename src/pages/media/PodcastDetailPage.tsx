import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { usePodcastJob, useDeletePodcastJob, useTranscribePodcast, useGeneratePodcastVideo } from "../../lib/api-hooks";

// ── Transcript helpers ────────────────────────────────────────────────────────

interface TranscriptLine { speaker: string; text: string; }

function parseTranscript(script: string): TranscriptLine[] {
  return script.split("\n").map((line) => {
    const colon = line.indexOf(":");
    if (colon === -1) return null;
    const speaker = line.slice(0, colon).trim();
    const text = line.slice(colon + 1).trim().replace(/\[[^\]]+\]/g, "").replace(/\s+/g, " ").trim();
    if (!speaker || !text) return null;
    return { speaker, text };
  }).filter((l): l is TranscriptLine => l !== null);
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function PodcastDetailPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const { data: job, isLoading } = usePodcastJob(jobId ?? null);
  const deleteJob = useDeletePodcastJob();
  const transcribeJob = useTranscribePodcast();
  const generateVideo = useGeneratePodcastVideo();
  const [copied, setCopied] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [videoMode, setVideoMode] = useState<"static" | "animated" | "cinematic">("static");

  function copyShareLink() {
    navigator.clipboard.writeText(`${window.location.origin}/p/${jobId}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleDelete() {
    if (!jobId) return;
    await deleteJob.mutateAsync(jobId);
    navigate("/media");
  }

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-slate-200 border-t-indigo-500 animate-spin" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-3 text-center px-4">
        <p className="text-slate-600 font-medium">Podcast not found</p>
        <button type="button" onClick={() => navigate("/media")} className="text-sm text-indigo-600 hover:underline">
          Back to Media
        </button>
      </div>
    );
  }

  const title = `${job.config.host1_name} & ${job.config.host2_name}`;
  const date = new Date(job.created_at).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
  const duration = job.duration_seconds
    ? `${Math.floor(job.duration_seconds / 60)}:${String(job.duration_seconds % 60).padStart(2, "0")}`
    : null;

  const transcript = job.script ? parseTranscript(job.script) : [];
  const speakers = [...new Set(transcript.map((l) => l.speaker))];
  const speakerColors = ["text-indigo-600", "text-violet-600"];

  return (
    <div className="h-full overflow-y-auto px-4 py-5 md:px-8 md:py-7">
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Back */}
        <button
          type="button"
          onClick={() => navigate("/media")}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Media Library
        </button>

        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-indigo-500 bg-indigo-50 px-2.5 py-1 rounded-full">
                AI Podcast
              </span>
              {duration && <span className="text-xs text-slate-400">{duration}</span>}
              <span className="text-xs text-slate-400 capitalize">{job.config.tone} · {job.config.length}</span>
              {(job.config as { language?: string }).language === "hi-en" && (
                <span className="text-xs font-semibold bg-orange-50 text-orange-500 px-2 py-0.5 rounded-full">Hinglish</span>
              )}
            </div>
            <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
            <p className="text-sm text-slate-400">{date}</p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={copyShareLink}
              className="flex items-center gap-1.5 text-sm font-medium px-3 py-2 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              {copied ? "Copied!" : "Copy shareable link"}
            </button>
            {job.audio_url && (
              <a
                href={job.audio_url}
                download
                className="flex items-center gap-1.5 text-sm font-medium px-3 py-2 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download MP3
              </a>
            )}
            {!confirmDelete ? (
              <button type="button" onClick={() => setConfirmDelete(true)}
                className="flex items-center gap-1.5 text-sm font-medium px-3 py-2 border border-slate-200 rounded-xl hover:border-red-200 hover:text-red-500 text-slate-400 transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete
              </button>
            ) : (
              <button type="button" onClick={handleDelete} disabled={deleteJob.isPending}
                className="text-sm font-medium px-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl disabled:opacity-50 transition-colors">
                {deleteJob.isPending ? "Deleting…" : "Confirm delete"}
              </button>
            )}
          </div>
        </div>

        {/* Player */}
        {job.audio_url ? (
          <div className="bg-gradient-to-br from-indigo-600 to-violet-600 rounded-2xl p-6 text-white shadow-lg space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                </svg>
              </div>
              <div>
                <p className="font-semibold">{title}</p>
                <p className="text-sm text-indigo-200">Your AI podcast</p>
              </div>
            </div>
            <audio controls src={job.audio_url} className="w-full h-10 accent-white" />
          </div>
        ) : (
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 text-center">
            <p className="text-sm text-slate-500">
              {job.status === "failed" ? (job.error ?? "Generation failed") : "Audio not yet ready"}
            </p>
          </div>
        )}

        {/* Transcript */}
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-slate-900">Transcript</h2>
              {job.detected_language && (
                <span className="text-xs font-medium px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full">
                  {job.detected_language}
                </span>
              )}
              {(job.transcript_status === "pending" || job.transcript_status === "processing") && (
                <span className="flex items-center gap-1.5 text-xs text-indigo-600">
                  <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>
                  {job.transcript_status === "pending" ? "Queued…" : "Transcribing…"}
                </span>
              )}
            </div>
            {job.status === "complete" && job.transcript_status === "none" && (
              <button
                type="button"
                onClick={() => jobId && transcribeJob.mutate(jobId)}
                disabled={transcribeJob.isPending}
                className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl transition-colors"
              >
                {transcribeJob.isPending ? (
                  <><svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>Starting…</>
                ) : (
                  <>Generate timestamped transcript</>
                )}
              </button>
            )}
            {job.transcript_status === "failed" && (
              <button
                type="button"
                onClick={() => jobId && transcribeJob.mutate(jobId)}
                disabled={transcribeJob.isPending}
                className="text-sm font-medium px-3 py-1.5 border border-red-200 text-red-500 hover:bg-red-50 rounded-xl transition-colors"
              >
                Retry transcription
              </button>
            )}
          </div>

          {/* Gemini timestamped transcript */}
          {job.transcript_status === "done" && job.transcript && (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 max-h-96 overflow-y-auto">
              <pre className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed font-sans">
                {job.transcript}
              </pre>
            </div>
          )}

          {/* Fallback: script-parsed transcript while waiting or if transcription not triggered */}
          {job.transcript_status !== "done" && transcript.length > 0 && (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3">
              {job.transcript_status === "none" && (
                <p className="text-xs text-slate-400 mb-2">Script-based transcript (no timestamps). Generate a timestamped transcript above.</p>
              )}
              {transcript.map((line, i) => (
                <div key={i} className="flex gap-3">
                  <span className={`text-xs font-bold flex-shrink-0 w-16 pt-0.5 truncate ${speakerColors[speakers.indexOf(line.speaker) % speakerColors.length]}`}>
                    {line.speaker}
                  </span>
                  <p className="text-sm text-slate-700 leading-relaxed">{line.text}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* AI Video */}
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-slate-900">AI Video</h2>
              {(job.video_status === "pending" || job.video_status === "generating_visuals" || job.video_status === "rendering") && (
                <span className="flex items-center gap-1.5 text-xs text-indigo-600">
                  <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>
                  {{
                    pending: "Queued…",
                    generating_visuals: "Generating visuals…",
                    rendering: "Rendering video…",
                  }[job.video_status]}
                </span>
              )}
            </div>

            {job.transcript_status === "done" && job.video_status === "none" && (
              <div className="flex items-center gap-2 flex-wrap">
                {/* Mode toggle */}
                <div className="flex items-center bg-slate-100 rounded-xl p-0.5 text-xs font-medium">
                  {(["static", "animated", "cinematic"] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setVideoMode(mode)}
                      className={`px-3 py-1.5 rounded-lg capitalize transition-colors ${videoMode === mode ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                    >
                      {mode === "cinematic" ? "✦ Cinematic" : mode.charAt(0).toUpperCase() + mode.slice(1)}
                    </button>
                  ))}
                </div>
                {videoMode === "cinematic" && (
                  <span className="text-xs text-violet-500 font-medium">Real scenes via Veo · 15–30 min</span>
                )}
                <button
                  type="button"
                  onClick={() => jobId && generateVideo.mutate({
                    jobId,
                    animated: videoMode === "animated",
                    cinematic: videoMode === "cinematic",
                  })}
                  disabled={generateVideo.isPending}
                  className="flex items-center gap-2 text-sm font-medium px-4 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 disabled:opacity-50 text-white rounded-xl transition-all shadow-sm"
                >
                  {generateVideo.isPending ? (
                    <><svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>Starting…</>
                  ) : (
                    <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.677V15.32a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z"/></svg>Generate AI video</>
                  )}
                </button>
              </div>
            )}

            {job.video_status === "failed" && (
              <button
                type="button"
                onClick={() => jobId && generateVideo.mutate({ jobId, animated: videoMode === "animated", cinematic: videoMode === "cinematic" })}
                disabled={generateVideo.isPending}
                className="text-sm font-medium px-3 py-1.5 border border-red-200 text-red-500 hover:bg-red-50 rounded-xl transition-colors"
              >
                Retry video generation
              </button>
            )}

            {job.transcript_status !== "done" && job.video_status === "none" && (
              <p className="text-xs text-slate-400">Generate a transcript first to enable video generation.</p>
            )}
          </div>

          {job.video_status === "complete" && job.video_url && (
            <div className="space-y-3">
              <div className="rounded-2xl overflow-hidden bg-slate-950 shadow-xl">
                <video src={job.video_url} controls className="w-full" style={{ maxHeight: "60vh" }} />
              </div>
              <div className="flex gap-3">
                <a
                  href={job.video_url}
                  download
                  className="flex items-center gap-1.5 text-sm font-medium px-3 py-2 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                  Download MP4
                </a>
              </div>
            </div>
          )}

          {(job.video_status === "generating_visuals" || job.video_status === "rendering" || job.video_status === "pending") && (
            <div className="p-5 bg-indigo-50 border border-indigo-100 rounded-2xl space-y-3">
              <div className="flex gap-3">
                {[
                  { key: "pending",            label: "Queued" },
                  { key: "generating_visuals", label: "Generating visuals" },
                  { key: "rendering",          label: "Rendering video" },
                  { key: "complete",           label: "Done" },
                ].map((step) => {
                  const order = ["pending", "generating_visuals", "rendering", "complete"];
                  const cur = order.indexOf(job.video_status);
                  const me = order.indexOf(step.key);
                  return (
                    <div key={step.key} className={`h-1.5 flex-1 rounded-full transition-colors ${me < cur ? "bg-indigo-500" : me === cur ? "bg-indigo-400 animate-pulse" : "bg-indigo-100"}`} />
                  );
                })}
              </div>
              <p className="text-xs text-indigo-600 font-medium">
                {{
                  pending: "Waiting to start…",
                  generating_visuals: "Claude is writing visual descriptions, then generating images with Gemini…",
                  rendering: "FFmpeg is assembling your video…",
                }[job.video_status as string] ?? ""}
              </p>
              <p className="text-xs text-indigo-400">This takes 5–15 minutes depending on podcast length. You can leave and come back.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
