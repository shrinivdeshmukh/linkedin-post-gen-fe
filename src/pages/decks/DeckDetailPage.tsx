import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useDeck, useRegenerateDeck } from "../../lib/api-hooks";
import api from "../../lib/api";

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function DeckDetailPage() {
  const { deckId } = useParams<{ deckId: string }>();
  const navigate = useNavigate();
  const { data: deck, isLoading } = useDeck(deckId ?? null);
  const regenerate = useRegenerateDeck();
  const [downloading, setDownloading] = useState<"html" | "pdf" | null>(null);

  const isGenerating = deck?.status === "generating" || isLoading;
  const isFailed = deck?.status === "failed";
  const isReady = deck?.status === "ready";

  const publicUrl = deck?.slug ? `${window.location.origin}/d/${deck.slug}` : null;

  function copyLink() {
    if (publicUrl) navigator.clipboard.writeText(publicUrl);
  }

  async function downloadHtml() {
    if (!deckId) return;
    setDownloading("html");
    try {
      const res = await api.get(`/decks/${deckId}/export/html`, { responseType: "blob" });
      const filename = `${deck?.title?.replace(/\s+/g, "_").toLowerCase() ?? "deck"}.html`;
      triggerDownload(res.data, filename);
    } finally {
      setDownloading(null);
    }
  }

  async function downloadPdf() {
    if (!deckId) return;
    setDownloading("pdf");
    try {
      const res = await api.get(`/decks/${deckId}/export/pdf`, { responseType: "blob" });
      const filename = `${deck?.title?.replace(/\s+/g, "_").toLowerCase() ?? "deck"}.pdf`;
      triggerDownload(res.data, filename);
    } finally {
      setDownloading(null);
    }
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-900">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-800 border-b border-slate-700 flex-shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/decks")}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <p className="text-sm font-semibold text-white leading-tight">{deck?.title ?? "Loading…"}</p>
            <p className="text-[11px] text-slate-400 capitalize">{deck?.format} · {deck?.font_family}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isReady && (
            <>
              <button
                onClick={copyLink}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white border border-slate-600 hover:border-slate-400 rounded-lg transition-colors"
                title={publicUrl ?? ""}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copy link
              </button>
              <button
                onClick={downloadHtml}
                disabled={downloading !== null}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white border border-slate-600 hover:border-slate-400 rounded-lg transition-colors disabled:opacity-50"
              >
                <svg className={`w-3.5 h-3.5 ${downloading === "html" ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                {downloading === "html" ? "…" : "HTML"}
              </button>
              <button
                onClick={downloadPdf}
                disabled={downloading !== null}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors disabled:opacity-50"
              >
                <svg className={`w-3.5 h-3.5 ${downloading === "pdf" ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                {downloading === "pdf" ? "…" : "PDF"}
              </button>
              <button
                onClick={() => deckId && regenerate.mutate(deckId)}
                disabled={regenerate.isPending}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white border border-slate-600 hover:border-slate-400 rounded-lg transition-colors disabled:opacity-40"
              >
                <svg className={`w-3.5 h-3.5 ${regenerate.isPending ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Regenerate
              </button>
            </>
          )}
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-hidden flex items-center justify-center">
        {isGenerating && (
          <div className="flex flex-col items-center gap-4 text-center p-8">
            <div className="w-12 h-12 rounded-2xl bg-indigo-900/50 flex items-center justify-center">
              <svg className="w-6 h-6 text-indigo-400 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Generating your deck…</p>
              <p className="text-xs text-slate-400 mt-1">Extracting brand colors, writing slides, rendering HTML. ~20–40s.</p>
            </div>
          </div>
        )}

        {isFailed && (
          <div className="flex flex-col items-center gap-4 text-center p-8">
            <p className="text-sm text-red-400">{deck?.error ?? "Generation failed"}</p>
            <button
              onClick={() => deckId && regenerate.mutate(deckId)}
              className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700"
            >
              Try again
            </button>
          </div>
        )}

        {isReady && deck?.slug && (
          <iframe
            src={`${api.defaults.baseURL}/decks/public/${deck.slug}/html`}
            className="w-full h-full border-0"
            title={deck.title}
            sandbox="allow-scripts allow-same-origin allow-popups"
          />
        )}
      </div>
    </div>
  );
}
