import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../../lib/api";
import type { PodcastJob } from "../../lib/api-hooks";

export default function PodcastPublicPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const [job, setJob] = useState<PodcastJob | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!jobId) return;
    api.get(`/public/podcast/${jobId}`)
      .then((r) => setJob(r.data))
      .catch(() => setNotFound(true));
  }, [jobId]);

  function handleCopyLink() {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <TopBar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-3 px-4">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto">
              <svg className="w-8 h-8 text-slate-300" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
              </svg>
            </div>
            <p className="text-slate-900 text-lg font-semibold">Podcast not found</p>
            <p className="text-slate-400 text-sm max-w-xs mx-auto">This link may have expired or been removed by its owner.</p>
          </div>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <TopBar />
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-slate-200 border-t-indigo-500 animate-spin" />
        </div>
      </div>
    );
  }

  const title = `${job.config.host1_name} & ${job.config.host2_name}`;
  const date = new Date(job.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const duration = job.duration_seconds
    ? `${Math.floor(job.duration_seconds / 60)}:${String(job.duration_seconds % 60).padStart(2, "0")}`
    : null;

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <TopBar />

      <main className="flex-1 w-full max-w-2xl mx-auto px-4 py-10 space-y-6">
        {/* Header */}
        <div className="space-y-1">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-500 bg-indigo-50 px-2.5 py-1 rounded-full">
              AI Podcast
            </span>
            {duration && (
              <span className="text-xs text-slate-400">{duration}</span>
            )}
          </div>
          <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
          <p className="text-sm text-slate-400">Generated on {date}</p>
        </div>

        {/* Player card */}
        <div className="bg-gradient-to-br from-indigo-600 to-violet-600 rounded-2xl p-6 text-white space-y-4 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
              </svg>
            </div>
            <div>
              <p className="font-bold">{title}</p>
              <p className="text-sm text-indigo-200 capitalize">{job.config.tone} · {job.config.length}</p>
            </div>
          </div>
          <audio controls src={job.audio_url ?? undefined} className="w-full h-10 accent-white" />
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={handleCopyLink}
            className="flex items-center gap-1.5 text-sm text-slate-600 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 rounded-xl px-4 py-2 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            {copied ? "Copied!" : "Copy link"}
          </button>
          {job.audio_url && (
            <a
              href={job.audio_url}
              download
              className="flex items-center gap-1.5 text-sm text-slate-600 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 rounded-xl px-4 py-2 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download MP3
            </a>
          )}
        </div>

        {/* CTA banner */}
        <div className="rounded-2xl bg-indigo-50 border border-indigo-100 px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-slate-900">Create AI podcasts from your blog posts</p>
            <p className="text-sm text-slate-500 mt-0.5">postcards.studio helps CXOs build their personal brand on LinkedIn.</p>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <Link to="/login" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
              Sign in
            </Link>
            <Link
              to="/signup"
              className="text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl transition-colors"
            >
              Get started free →
            </Link>
          </div>
        </div>
      </main>

      <footer className="border-t border-slate-100 py-4 text-center">
        <a
          href="https://postcards.studio"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
        >
          Powered by postcards.studio
        </a>
      </footer>
    </div>
  );
}

function TopBar() {
  return (
    <header className="border-b border-slate-100 px-4 py-3 flex items-center justify-between">
      <a href="https://postcards.studio" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center">
          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <span className="text-sm font-bold text-slate-900">postcards.studio</span>
      </a>
      <div className="flex items-center gap-3">
        <Link to="/login" className="text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors">
          Sign in
        </Link>
        <Link
          to="/signup"
          className="text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-xl transition-colors"
        >
          Get started free
        </Link>
      </div>
    </header>
  );
}
