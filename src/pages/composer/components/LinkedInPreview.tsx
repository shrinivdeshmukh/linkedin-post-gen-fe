import { useState } from "react";

interface LinkedInPreviewProps {
  content: string;
  displayName?: string;
  postType: string;
  imageUrl?: string | null;
}

const LINKEDIN_CHAR_LIMIT = 3000;
const PREVIEW_CUTOFF = 210;

export function LinkedInPreview({
  content,
  displayName = "Your Name",
  postType,
  imageUrl,
}: LinkedInPreviewProps) {
  const [expanded, setExpanded] = useState(false);

  const charCount = content.length;
  const overLimit = charCount > LINKEDIN_CHAR_LIMIT;
  const isTruncated = charCount > PREVIEW_CUTOFF;

  const displayText =
    isTruncated && !expanded ? content.slice(0, PREVIEW_CUTOFF) + "…" : content;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700">Preview</h3>
        <span
          className={`text-xs font-medium tabular-nums ${
            overLimit
              ? "text-red-500"
              : charCount > 2500
              ? "text-amber-500"
              : "text-slate-400"
          }`}
        >
          {charCount.toLocaleString()} / {LINKEDIN_CHAR_LIMIT.toLocaleString()}
        </span>
      </div>

      {/* LinkedIn card mock */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        {/* Browser bar */}
        <div className="bg-slate-50 border-b border-slate-100 px-4 py-2 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-red-400" />
          <div className="w-2 h-2 rounded-full bg-amber-400" />
          <div className="w-2 h-2 rounded-full bg-emerald-400" />
          <div className="flex-1 mx-2 h-5 bg-slate-200 rounded text-xs text-slate-400 flex items-center px-2">
            linkedin.com
          </div>
        </div>

        <div className="p-4 space-y-3">
          {/* Author row */}
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
              {displayName[0]?.toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900 leading-tight">{displayName}</p>
              <p className="text-xs text-slate-500">Executive · 1st</p>
              <p className="text-xs text-slate-400">Just now · 🌐</p>
            </div>
          </div>

          {/* Content */}
          {content ? (
            <div className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap break-words">
              {displayText}
              {isTruncated && !expanded && (
                <button
                  type="button"
                  onClick={() => setExpanded(true)}
                  className="text-slate-500 font-semibold hover:text-slate-700 ml-1"
                >
                  see more
                </button>
              )}
              {expanded && (
                <button
                  type="button"
                  onClick={() => setExpanded(false)}
                  className="text-slate-500 font-semibold hover:text-slate-700 ml-1"
                >
                  see less
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <div className="h-3 bg-slate-100 rounded-full w-full" />
              <div className="h-3 bg-slate-100 rounded-full w-5/6" />
              <div className="h-3 bg-slate-100 rounded-full w-4/6" />
              <p className="text-xs text-slate-400 text-center pt-2">Your post will appear here</p>
            </div>
          )}

          {/* Image */}
          {postType === "image" && (
            imageUrl ? (
              <div className="rounded-xl overflow-hidden border border-slate-200">
                <img src={imageUrl} alt="Post image" className="w-full object-cover max-h-56" />
              </div>
            ) : (
              <div className="rounded-xl bg-slate-100 h-40 flex items-center justify-center border border-slate-200">
                <div className="text-center space-y-1">
                  <svg className="w-8 h-8 text-slate-300 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01" />
                  </svg>
                  <p className="text-xs text-slate-400">Image will appear here</p>
                </div>
              </div>
            )
          )}

          {/* Carousel placeholder */}
          {postType === "carousel" && (
            <div className="rounded-xl bg-slate-100 h-40 flex items-center justify-center border border-slate-200 relative">
              <div className="absolute top-2 right-2 text-xs bg-white/80 text-slate-500 px-2 py-0.5 rounded-full border border-slate-200">
                1 / 5
              </div>
              <p className="text-xs text-slate-400">Carousel slides will appear here</p>
            </div>
          )}

          {/* Poll placeholder */}
          {postType === "poll" && (
            <div className="space-y-2 rounded-xl border border-slate-200 p-3">
              {["Option 1", "Option 2", "Option 3"].map((opt) => (
                <div key={opt} className="h-8 border border-slate-300 rounded-lg flex items-center px-3">
                  <div className="w-3 h-3 rounded-full border-2 border-slate-300 mr-2" />
                  <span className="text-xs text-slate-400">{opt}</span>
                </div>
              ))}
              <p className="text-xs text-slate-400 text-center">7 days · 0 votes</p>
            </div>
          )}

          {/* Engagement row */}
          <div className="pt-1 border-t border-slate-100 flex items-center gap-4 text-xs text-slate-400">
            <span>👍 Like</span>
            <span>💬 Comment</span>
            <span>🔁 Repost</span>
            <span>✉️ Send</span>
          </div>
        </div>
      </div>

      {overLimit && (
        <p className="text-xs text-red-500 font-medium">
          ⚠️ Over LinkedIn's 3,000 character limit by {(charCount - LINKEDIN_CHAR_LIMIT).toLocaleString()} characters
        </p>
      )}
    </div>
  );
}
