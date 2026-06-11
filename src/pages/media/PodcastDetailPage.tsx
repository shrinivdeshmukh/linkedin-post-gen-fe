import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { usePodcastJob, useDeletePodcastJob } from "../../lib/api-hooks";

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
  const [copied, setCopied] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

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
        {transcript.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-base font-semibold text-slate-900">Transcript</h2>
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3">
              {transcript.map((line, i) => (
                <div key={i} className="flex gap-3">
                  <span className={`text-xs font-bold flex-shrink-0 w-16 pt-0.5 truncate ${speakerColors[speakers.indexOf(line.speaker) % speakerColors.length]}`}>
                    {line.speaker}
                  </span>
                  <p className="text-sm text-slate-700 leading-relaxed">{line.text}</p>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
