import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useDeck, useRegenerateDeck, useSlides, useUpdateSlide } from "../../lib/api-hooks";
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

  // Edit panel state
  const [editOpen, setEditOpen] = useState(false);
  const [iframeVersion, setIframeVersion] = useState(0);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editHtml, setEditHtml] = useState("");
  const [editDirty, setEditDirty] = useState(false);

  // Regenerate modal state
  const [regenModal, setRegenModal] = useState(false);
  const [protectSlides, setProtectSlides] = useState<number[]>([]);

  const { data: slides = [], isLoading: slidesLoading } = useSlides(editOpen ? (deckId ?? null) : null);
  const updateSlide = useUpdateSlide();

  const isGenerating = deck?.status === "generating" || isLoading;
  const isFailed = deck?.status === "failed";
  const isReady = deck?.status === "ready";

  // Point to the backend HTML endpoint — it has OG tags injected so WhatsApp/Slack
  // previews show the deck title and thumbnail image correctly.
  const publicUrl = deck?.slug ? `${api.defaults.baseURL}/decks/public/${deck.slug}/html` : null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const slideOverrides: Record<string, string> = (deck?.slides_json as any)?._slide_overrides ?? {};
  const overrideIndices = Object.keys(slideOverrides).map(Number);
  const slideCount: number = (deck?.slides_json as any)?._slide_count ?? 8;

  // Load slide HTML into editor when selection changes
  useEffect(() => {
    if (editingIdx === null) return;
    const slide = slides.find((s) => s.index === editingIdx);
    if (slide) {
      setEditHtml(slide.inner_html);
      setEditDirty(false);
    }
  }, [editingIdx, slides]);

  // Reset editor when edit panel closes
  useEffect(() => {
    if (!editOpen) {
      setEditingIdx(null);
      setEditHtml("");
      setEditDirty(false);
    }
  }, [editOpen]);

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

  async function saveSlide() {
    if (!deckId || editingIdx === null) return;
    await updateSlide.mutateAsync({ deckId, index: editingIdx, inner_html: editHtml });
    setEditDirty(false);
    setIframeVersion((v) => v + 1);
  }

  function openRegenModal() {
    if (overrideIndices.length > 0) {
      setProtectSlides([...overrideIndices]); // default: protect all edited slides
      setRegenModal(true);
    } else {
      regenerate.mutate({ id: deckId! });
    }
  }

  function confirmRegen() {
    setRegenModal(false);
    setEditOpen(false);
    regenerate.mutate({ id: deckId!, protect: protectSlides });
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
              {/* Edit slides toggle */}
              <button
                onClick={() => setEditOpen((o) => !o)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors border ${
                  editOpen
                    ? "bg-indigo-600 border-indigo-600 text-white"
                    : "text-slate-300 hover:text-white border-slate-600 hover:border-slate-400"
                }`}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit slides
                {overrideIndices.length > 0 && (
                  <span className="ml-0.5 w-4 h-4 rounded-full bg-amber-500 text-white text-[10px] flex items-center justify-center font-bold">
                    {overrideIndices.length}
                  </span>
                )}
              </button>

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
                onClick={openRegenModal}
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
      <div className="flex-1 overflow-hidden flex">
        {/* Deck viewer */}
        <div className="flex-1 flex items-center justify-center overflow-hidden">
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
                onClick={() => deckId && regenerate.mutate({ id: deckId })}
                className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700"
              >
                Try again
              </button>
            </div>
          )}

          {isReady && deck?.slug && (
            <iframe
              key={iframeVersion}
              src={`${api.defaults.baseURL}/decks/public/${deck.slug}/html`}
              className="w-full h-full border-0"
              title={deck.title}
              sandbox="allow-scripts allow-same-origin allow-popups"
            />
          )}
        </div>

        {/* Edit panel */}
        {editOpen && isReady && (
          <div className="w-80 flex-shrink-0 bg-slate-800 border-l border-slate-700 flex flex-col overflow-hidden">
            {/* Panel header */}
            <div className="px-4 py-3 border-b border-slate-700 flex items-center justify-between flex-shrink-0">
              <p className="text-sm font-semibold text-white">Edit slides</p>
              <button onClick={() => setEditOpen(false)} className="p-1 text-slate-400 hover:text-white rounded transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Slide list */}
            <div className="px-3 py-3 border-b border-slate-700 flex flex-wrap gap-2 flex-shrink-0">
              {slidesLoading
                ? Array.from({ length: slideCount }).map((_, i) => (
                    <div key={i} className="w-10 h-8 bg-slate-700 rounded animate-pulse" />
                  ))
                : slides.map((slide) => {
                    const isModified = overrideIndices.includes(slide.index);
                    const isActive = editingIdx === slide.index;
                    return (
                      <button
                        key={slide.index}
                        onClick={() => setEditingIdx(slide.index)}
                        className={`relative w-10 h-8 rounded text-xs font-semibold transition-colors ${
                          isActive
                            ? "bg-indigo-600 text-white"
                            : "bg-slate-700 text-slate-300 hover:bg-slate-600 hover:text-white"
                        }`}
                      >
                        {slide.index + 1}
                        {isModified && (
                          <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-400" />
                        )}
                      </button>
                    );
                  })}
            </div>

            {/* Editor area */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {editingIdx === null ? (
                <div className="flex-1 flex items-center justify-center p-6">
                  <p className="text-xs text-slate-500 text-center">Select a slide above to edit its content</p>
                </div>
              ) : (
                <>
                  <div className="px-4 pt-3 pb-2 flex-shrink-0">
                    <p className="text-xs font-medium text-slate-300">Slide {editingIdx + 1}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">Edit text between HTML tags only. Don't change class or style attributes.</p>
                  </div>
                  <div className="flex-1 px-3 overflow-hidden">
                    <textarea
                      value={editHtml}
                      onChange={(e) => { setEditHtml(e.target.value); setEditDirty(true); }}
                      spellCheck={false}
                      className="w-full h-full resize-none bg-slate-900 text-slate-200 text-[11px] font-mono leading-relaxed rounded-lg border border-slate-600 focus:border-indigo-500 focus:outline-none p-3"
                    />
                  </div>
                  <div className="px-3 py-3 flex gap-2 flex-shrink-0">
                    <button
                      onClick={saveSlide}
                      disabled={updateSlide.isPending || !editDirty}
                      className="flex-1 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg transition-colors"
                    >
                      {updateSlide.isPending ? "Saving…" : "Save slide"}
                    </button>
                    <button
                      onClick={() => {
                        const slide = slides.find((s) => s.index === editingIdx);
                        if (slide) { setEditHtml(slide.inner_html); setEditDirty(false); }
                      }}
                      disabled={!editDirty}
                      className="px-3 py-2 text-xs font-medium text-slate-400 hover:text-white disabled:opacity-40 rounded-lg transition-colors"
                    >
                      Discard
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Regenerate modal — shown when edited slides exist */}
      {regenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-slate-800 rounded-2xl shadow-xl w-full max-w-sm border border-slate-700 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-700">
              <p className="text-sm font-bold text-white">Regenerate deck</p>
              <p className="text-xs text-slate-400 mt-0.5">
                You've manually edited {overrideIndices.length} slide{overrideIndices.length !== 1 ? "s" : ""}. Choose which to keep:
              </p>
            </div>
            <div className="px-5 py-4 space-y-2 max-h-60 overflow-y-auto">
              {overrideIndices.map((idx) => (
                <label key={idx} className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={protectSlides.includes(idx)}
                    onChange={(e) =>
                      setProtectSlides((prev) =>
                        e.target.checked ? [...prev, idx] : prev.filter((i) => i !== idx)
                      )
                    }
                    className="w-4 h-4 rounded accent-indigo-500"
                  />
                  <span className="text-sm text-slate-200 group-hover:text-white transition-colors">
                    Slide {idx + 1} — keep my edits
                  </span>
                </label>
              ))}
            </div>
            <div className="px-5 py-4 border-t border-slate-700 flex gap-3">
              <button
                onClick={confirmRegen}
                disabled={regenerate.isPending}
                className="flex-1 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl transition-colors"
              >
                {regenerate.isPending ? "Starting…" : "Regenerate"}
              </button>
              <button
                onClick={() => setRegenModal(false)}
                className="px-4 py-2.5 text-sm font-medium text-slate-400 hover:text-white border border-slate-600 rounded-xl transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
