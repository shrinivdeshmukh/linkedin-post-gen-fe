import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../../lib/api";

interface PublicVideo {
  slug: string;
  title: string;
  spaces_url: string;
  mime_type: string;
  created_at: string;
}

export default function VideoPublicPage() {
  const { slug } = useParams<{ slug: string }>();
  const [video, setVideo] = useState<PublicVideo | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) return;
    api.get(`/videos/public/${slug}`)
      .then((r) => setVideo(r.data))
      .catch(() => setNotFound(true));
  }, [slug]);

  if (notFound) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center space-y-3">
          <p className="text-white text-lg font-semibold">Video not found</p>
          <p className="text-slate-400 text-sm">This link may have expired or been removed.</p>
        </div>
      </div>
    );
  }

  if (!video) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-2 border-white/20 border-t-white animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Video */}
      <div className="flex-1 flex items-center justify-center p-4 md:p-8">
        <div className="w-full max-w-4xl space-y-4">
          <video
            src={video.spaces_url}
            controls
            autoPlay={false}
            className="w-full rounded-2xl shadow-2xl bg-black"
            style={{ maxHeight: "70vh" }}
          />
          <div className="flex items-start justify-between gap-4 px-1">
            <div>
              <h1 className="text-white text-lg font-semibold leading-snug">{video.title}</h1>
              <p className="text-slate-400 text-sm mt-1">
                {new Date(video.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
              </p>
            </div>
            <a
              href={video.spaces_url}
              download
              className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 border border-slate-700 hover:border-slate-500 text-slate-300 hover:text-white text-sm rounded-xl transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download
            </a>
          </div>
        </div>
      </div>

      {/* Footer branding */}
      <div className="flex items-center justify-center py-5 border-t border-slate-800">
        <a
          href="https://postcards.studio"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-slate-500 hover:text-slate-300 transition-colors text-sm"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          Made with postcards.studio
        </a>
      </div>
    </div>
  );
}
