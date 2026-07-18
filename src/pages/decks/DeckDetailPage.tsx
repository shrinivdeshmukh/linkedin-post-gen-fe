import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useDeck, useRegenerateDeck, useSlides, useUpdateSlide, useUpdateShareSettings, useDeckLeads, useDeckAnalytics } from "../../lib/api-hooks";
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
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);

  // Edit panel state
  const [editOpen, setEditOpen] = useState(false);
  const [iframeVersion, setIframeVersion] = useState(0);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editHtml, setEditHtml] = useState("");
  const [editDirty, setEditDirty] = useState(false);

  // Regenerate modal state
  const [regenModal, setRegenModal] = useState(false);
  const [protectSlides, setProtectSlides] = useState<number[]>([]);

  // Share settings panel state
  const [shareOpen, setShareOpen] = useState(false);
  const [sharePassword, setSharePassword] = useState(deck?.share_password ?? "");
  const [leadEnabled, setLeadEnabled] = useState(deck?.lead_capture_enabled ?? false);
  const [leadFields, setLeadFields] = useState<Array<{ name: string; label: string; type: string; required: boolean }>>(
    (deck?.lead_capture_fields as Array<{ name: string; label: string; type: string; required: boolean }>) ?? []
  );
  const [accessList, setAccessList] = useState<Record<string, string>>({});  // fieldName -> newline-joined values
  const [shareSaved, setShareSaved] = useState(false);
  const updateShare = useUpdateShareSettings();
  const { data: leads = [] } = useDeckLeads(shareOpen && deck?.status === "ready" ? (deckId ?? null) : null);
  const { data: analytics } = useDeckAnalytics(shareOpen && deck?.status === "ready" ? (deckId ?? null) : null);

  const { data: slides = [], isLoading: slidesLoading } = useSlides(editOpen ? (deckId ?? null) : null);
  const updateSlide = useUpdateSlide();

  const isGenerating = deck?.status === "generating" || isLoading;
  const isFailed = deck?.status === "failed";
  const isReady = deck?.status === "ready";

  // Share URL uses the frontend route so users see app.postcards.studio, not the backend.
  // The iframe preview still points directly to the backend HTML endpoint.
  const publicUrl = deck?.slug ? `${window.location.origin}/d/${deck.slug}` : null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const slideOverrides: Record<string, string> = (deck?.slides_json as any)?._slide_overrides ?? {};
  const overrideIndices = Object.keys(slideOverrides).map(Number);
  const slideCount: number = (deck?.slides_json as any)?._slide_count ?? 8;

  // Sync share settings from deck data when panel opens
  useEffect(() => {
    if (shareOpen && deck) {
      setSharePassword(deck.share_password ?? "");
      setLeadEnabled(deck.lead_capture_enabled ?? false);
      setLeadFields((deck.lead_capture_fields as Array<{ name: string; label: string; type: string; required: boolean }>) ?? []);
      const raw = (deck.access_list ?? {}) as Record<string, string[]>;
      setAccessList(Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, v.join("\n")])));
    }
  }, [shareOpen, deck]);

  // Fetch owner preview HTML (bypasses gate) whenever deck becomes ready or is edited
  useEffect(() => {
    if (!deckId || deck?.status !== "ready") return;
    api.get(`/decks/${deckId}/preview-html`, { responseType: "text" })
      .then((r) => setPreviewHtml(r.data))
      .catch(() => setPreviewHtml(null));
  }, [deckId, deck?.status, iframeVersion]);

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

  async function saveShareSettings() {
    if (!deckId) return;
    // Convert newline-joined textarea values back to arrays, drop empty fields
    const accessListParsed: Record<string, string[]> = {};
    for (const [field, raw] of Object.entries(accessList)) {
      const vals = raw.split("\n").map((v) => v.trim()).filter(Boolean);
      if (vals.length > 0) accessListParsed[field] = vals;
    }
    await updateShare.mutateAsync({
      id: deckId,
      share_password: sharePassword.trim() || null,
      lead_capture_enabled: leadEnabled,
      lead_capture_fields: leadFields.length > 0 ? leadFields : null,
      access_list: Object.keys(accessListParsed).length > 0 ? accessListParsed : null,
    });
    setShareSaved(true);
    setTimeout(() => setShareSaved(false), 2000);
  }

  function addLeadField() {
    setLeadFields((prev) => [...prev, { name: `field_${prev.length + 1}`, label: "", type: "text", required: false }]);
  }

  function removeLeadField(idx: number) {
    setLeadFields((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateLeadField(idx: number, key: string, value: string | boolean) {
    setLeadFields((prev) => prev.map((f, i) => i === idx ? { ...f, [key]: value } : f));
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
                onClick={() => navigate(`/decks/${deckId}/analytics`)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white border border-slate-600 hover:border-slate-400 rounded-lg transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Analytics
              </button>
              <button
                onClick={() => setShareOpen((o) => !o)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors border ${
                  shareOpen
                    ? "bg-indigo-600 border-indigo-600 text-white"
                    : "text-slate-300 hover:text-white border-slate-600 hover:border-slate-400"
                }`}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Share settings
                {(deck?.share_password || deck?.lead_capture_enabled) && (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                )}
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

          {isReady && (
            previewHtml ? (
              <iframe
                key={iframeVersion}
                srcDoc={previewHtml}
                className="w-full h-full border-0"
                title={deck?.title ?? "Deck"}
                sandbox="allow-scripts allow-same-origin allow-popups"
              />
            ) : (
              <div className="flex items-center justify-center w-full h-full">
                <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              </div>
            )
          )}
        </div>

        {/* Share settings panel */}
        {shareOpen && isReady && (
          <div className="w-80 flex-shrink-0 bg-slate-800 border-l border-slate-700 flex flex-col overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-700 flex items-center justify-between flex-shrink-0">
              <p className="text-sm font-semibold text-white">Share settings</p>
              <button onClick={() => setShareOpen(false)} className="p-1 text-slate-400 hover:text-white rounded transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              <div className="px-4 py-4 space-y-5">
                {/* Password */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Password protection</label>
                  <input
                    type="text"
                    value={sharePassword}
                    onChange={(e) => setSharePassword(e.target.value)}
                    placeholder="Leave blank for no password"
                    className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                  />
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-[11px] text-slate-500">Viewers must enter this password to access the deck.</p>
                    <button
                      type="button"
                      onClick={() => setSharePassword(Math.random().toString(36).slice(2, 8) + Math.random().toString(36).slice(2, 8))}
                      className="text-[11px] text-indigo-400 hover:text-indigo-300 transition-colors flex-shrink-0 ml-2"
                    >
                      Generate
                    </button>
                  </div>
                </div>

                {/* Lead capture toggle */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-xs font-semibold text-slate-300">Lead capture</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">Collect info before showing the deck.</p>
                    </div>
                    <button
                      onClick={() => setLeadEnabled((v) => !v)}
                      className={`relative w-10 h-5 rounded-full transition-colors ${leadEnabled ? "bg-indigo-600" : "bg-slate-600"}`}
                    >
                      <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${leadEnabled ? "translate-x-5" : ""}`} />
                    </button>
                  </div>

                  {leadEnabled && (
                    <div className="space-y-3">
                      {leadFields.map((f, idx) => (
                        <div key={idx} className="bg-slate-900 rounded-lg p-3 space-y-2">
                          <div className="flex items-center gap-2">
                            <input
                              value={f.label}
                              onChange={(e) => updateLeadField(idx, "label", e.target.value)}
                              placeholder="Field label (e.g. Full Name)"
                              className="flex-1 px-2 py-1.5 text-xs bg-slate-800 border border-slate-600 rounded text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                            />
                            <button onClick={() => removeLeadField(idx)} className="p-1 text-slate-500 hover:text-red-400 transition-colors">
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                          <div className="flex items-center gap-2">
                            <select
                              value={f.type}
                              onChange={(e) => updateLeadField(idx, "type", e.target.value)}
                              className="flex-1 px-2 py-1.5 text-xs bg-slate-800 border border-slate-600 rounded text-white focus:border-indigo-500 focus:outline-none"
                            >
                              <option value="text">Text</option>
                              <option value="email">Email</option>
                              <option value="tel">Phone</option>
                            </select>
                            <label className="flex items-center gap-1.5 text-[11px] text-slate-400 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={f.required}
                                onChange={(e) => updateLeadField(idx, "required", e.target.checked)}
                                className="w-3.5 h-3.5 accent-indigo-500"
                              />
                              Required
                            </label>
                          </div>
                        </div>
                      ))}
                      <button
                        onClick={addLeadField}
                        className="w-full py-1.5 text-xs text-indigo-400 hover:text-indigo-300 border border-dashed border-slate-600 hover:border-indigo-500 rounded-lg transition-colors"
                      >
                        + Add field
                      </button>
                    </div>
                  )}
                </div>

                {/* Access control */}
                {leadEnabled && leadFields.length > 0 && (
                  <div>
                    <div className="mb-2">
                      <p className="text-xs font-semibold text-slate-300">Access control</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Restrict access to specific values per field. Leave blank to allow anyone.
                      </p>
                    </div>
                    <div className="space-y-3">
                      {leadFields.map((f) => (
                        <div key={f.name}>
                          <label className="block text-[11px] font-medium text-slate-400 mb-1">
                            Allowed {f.label || f.name}s
                          </label>
                          <textarea
                            rows={3}
                            value={accessList[f.name] ?? ""}
                            onChange={(e) => setAccessList((prev) => ({ ...prev, [f.name]: e.target.value }))}
                            placeholder={`One allowed value per line\ne.g. john@company.com`}
                            className="w-full px-2 py-1.5 text-xs bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-600 focus:border-indigo-500 focus:outline-none resize-none font-mono leading-relaxed"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Save button */}
            <div className="px-4 py-3 border-t border-slate-700 flex-shrink-0">
              <button
                onClick={saveShareSettings}
                disabled={updateShare.isPending}
                className="w-full py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg transition-colors"
              >
                {shareSaved ? "Saved!" : updateShare.isPending ? "Saving…" : "Save settings"}
              </button>
            </div>

            {/* Analytics */}
            {analytics && (
              <div className="border-t border-slate-700">
                <div className="px-4 py-3 border-b border-slate-700">
                  <p className="text-xs font-semibold text-slate-300">Analytics</p>
                </div>
                <div className="px-4 py-3 grid grid-cols-2 gap-3">
                  <div className="bg-slate-900 rounded-lg px-3 py-2 text-center">
                    <p className="text-lg font-bold text-white">{analytics.total_views}</p>
                    <p className="text-[11px] text-slate-400">Views</p>
                  </div>
                  <div className="bg-slate-900 rounded-lg px-3 py-2 text-center">
                    <p className="text-lg font-bold text-white">{analytics.unique_ips}</p>
                    <p className="text-[11px] text-slate-400">Unique visitors</p>
                  </div>
                </div>
                {Object.keys(analytics.by_country).length > 0 && (
                  <div className="px-4 pb-3 space-y-1.5">
                    <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Top countries</p>
                    {Object.entries(analytics.by_country).slice(0, 5).map(([country, count]) => (
                      <div key={country} className="flex items-center justify-between">
                        <p className="text-[11px] text-slate-300">{country}</p>
                        <p className="text-[11px] text-slate-500">{count}</p>
                      </div>
                    ))}
                  </div>
                )}
                {Object.keys(analytics.by_device).length > 0 && (
                  <div className="px-4 pb-3 space-y-1.5">
                    <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Device</p>
                    {Object.entries(analytics.by_device).map(([d, count]) => (
                      <div key={d} className="flex items-center justify-between">
                        <p className="text-[11px] text-slate-300 capitalize">{d}</p>
                        <p className="text-[11px] text-slate-500">{count}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Leads list */}
            {leads.length > 0 && (
              <div className="border-t border-slate-700">
                <div className="px-4 py-3 border-b border-slate-700">
                  <p className="text-xs font-semibold text-slate-300">Leads ({leads.length})</p>
                </div>
                <div className="max-h-48 overflow-y-auto divide-y divide-slate-700">
                  {leads.map((lead) => (
                    <div key={lead.id} className="px-4 py-2.5">
                      {Object.entries(lead.fields_json).map(([k, v]) => (
                        <p key={k} className="text-[11px] text-slate-300 truncate">{v}</p>
                      ))}
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        {lead.country ? `${lead.city ?? ""} ${lead.country} · ` : ""}
                        {lead.device_type ?? ""} · {new Date(lead.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

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
