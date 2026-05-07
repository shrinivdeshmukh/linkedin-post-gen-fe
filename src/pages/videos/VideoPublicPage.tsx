import { useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../../lib/api";

interface PublicVideo {
  slug: string;
  title: string;
  spaces_url: string;
  mime_type: string;
  transcript: string | null;
  detected_language: string | null;
  created_at: string;
}

const SPEEDS = [0.5, 1, 1.25, 1.5, 2];

export default function VideoPublicPage() {
  const { slug } = useParams<{ slug: string }>();
  const [video, setVideo] = useState<PublicVideo | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [copied, setCopied] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!slug) return;
    api.get(`/videos/public/${slug}`)
      .then((r) => setVideo(r.data))
      .catch(() => setNotFound(true));
  }, [slug]);

  function handleSpeedChange(s: number) {
    setSpeed(s);
    if (videoRef.current) videoRef.current.playbackRate = s;
  }

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
              <svg className="w-8 h-8 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.677V15.32a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
              </svg>
            </div>
            <p className="text-slate-900 text-lg font-semibold">Video not found</p>
            <p className="text-slate-400 text-sm max-w-xs mx-auto">This link may have expired or been removed by its owner.</p>
          </div>
        </div>
      </div>
    );
  }

  if (!video) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <TopBar />
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-slate-200 border-t-indigo-500 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <TopBar />

      {/* Main content */}
      <main className="flex-1 w-full max-w-4xl mx-auto px-4 py-8 space-y-4">
        {/* Title */}
        <h1 className="text-2xl font-bold text-slate-900 leading-snug">{video.title}</h1>
        <p className="text-sm text-slate-400">
          Shared on {new Date(video.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
        </p>

        {/* Player */}
        <div className="rounded-2xl overflow-hidden bg-slate-950 shadow-xl">
          <video
            ref={videoRef}
            src={video.spaces_url}
            controls
            className="w-full"
            style={{ maxHeight: "60vh" }}
          />
        </div>

        {/* Speed + actions row */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          {/* Playback speed */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-400 font-medium mr-1">Speed</span>
            {SPEEDS.map((s) => (
              <button
                key={s}
                onClick={() => handleSpeedChange(s)}
                className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-colors ${
                  speed === s
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {s}×
              </button>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyLink}
              className="flex items-center gap-1.5 text-sm text-slate-600 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 rounded-xl px-3 py-1.5 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              {copied ? "Copied!" : "Copy link"}
            </button>
            <a
              href={video.spaces_url}
              download
              className="flex items-center gap-1.5 text-sm text-slate-600 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 rounded-xl px-3 py-1.5 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download
            </a>
          </div>
        </div>

        {/* Transcript */}
        {video.transcript && (
          <div className="mt-4 space-y-3">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-slate-900">Transcript</h2>
              {video.detected_language && (
                <span className="text-xs font-medium px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full">
                  {video.detected_language}
                </span>
              )}
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 max-h-80 overflow-y-auto">
              <pre className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed font-sans">
                {video.transcript}
              </pre>
            </div>
          </div>
        )}

        {/* CTA banner */}
        <div className="mt-6 rounded-2xl bg-indigo-50 border border-indigo-100 px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-slate-900">Create and share videos like this</p>
            <p className="text-sm text-slate-500 mt-0.5">postcards.studio helps CXOs build their personal brand on LinkedIn.</p>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <Link
              to="/login"
              className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
            >
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

      {/* Footer */}
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
