import { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useCreateDeck, useUploadDeckFile, useDeleteDeckFile, useDeckFile } from "../../lib/api-hooks";
import type { DeckFileItem } from "../../lib/api-hooks";

const FONTS = [
  "Inter",
  "Plus Jakarta Sans",
  "Space Grotesk",
  "DM Sans",
  "Playfair Display",
  "Sora",
  "Raleway",
  "Nunito",
];

type Step = "format" | "content" | "brand";

// Small component that polls a single file until ready, then notifies parent
function PollDeckFile({
  id,
  onReady,
  onDelete,
}: {
  id: string;
  onReady: (file: DeckFileItem) => void;
  onDelete: (id: string) => void;
}) {
  const { data } = useDeckFile(id);
  const deleteMutation = useDeleteDeckFile();
  const notifiedRef = useRef(false);

  useEffect(() => {
    if (data?.status === "ready" && !notifiedRef.current) {
      notifiedRef.current = true;
      onReady(data);
    }
  }, [data?.status]);

  const filename = data?.original_filename ?? "Uploading…";
  const status = data?.status ?? "parsing";

  return (
    <div className="flex items-center gap-2 py-1.5 px-3 bg-slate-50 border border-slate-200 rounded-xl">
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-slate-700 truncate">{filename}</p>
        {status === "parsing" && (
          <p className="text-xs text-indigo-500 flex items-center gap-1 mt-0.5">
            <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Parsing…
          </p>
        )}
        {status === "ready" && (
          <p className="text-xs text-emerald-600 mt-0.5">Parsed — context added</p>
        )}
        {status === "failed" && (
          <p className="text-xs text-red-500 mt-0.5">{data?.error ?? "Parse failed"}</p>
        )}
      </div>
      <button
        onClick={async () => {
          if (data) await deleteMutation.mutateAsync(id);
          onDelete(id);
        }}
        className="p-1 text-slate-300 hover:text-red-400 transition-colors flex-shrink-0"
        title="Remove file"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

export default function NewDeckPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const prefill = (location.state as { topic?: string; key_messages?: string[] } | null) ?? {};

  const createDeck = useCreateDeck();
  const uploadDeckFile = useUploadDeckFile();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>("format");
  const [format, setFormat] = useState<"deck" | "onepager">("deck");
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [title, setTitle] = useState("");
  const [topic, setTopic] = useState(prefill.topic ?? "");
  const [keyMessages, setKeyMessages] = useState<string[]>(prefill.key_messages ?? [""]);
  const [slideCount, setSlideCount] = useState(8);
  const [brandLogoUrl, setBrandLogoUrl] = useState("");
  const [companyUrl, setCompanyUrl] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [extraContext, setExtraContext] = useState("");
  const [fontFamily, setFontFamily] = useState("Inter");
  const [customFont, setCustomFont] = useState("");

  // Uploaded deck files (by id) — polled until ready
  const [uploadedFileIds, setUploadedFileIds] = useState<string[]>([]);
  const appendedSummaries = useRef<Set<string>>(new Set());

  function addKeyMessage() { setKeyMessages(m => [...m, ""]); }
  function updateKeyMessage(i: number, val: string) {
    setKeyMessages(m => m.map((v, idx) => idx === i ? val : v));
  }
  function removeKeyMessage(i: number) {
    setKeyMessages(m => m.filter((_, idx) => idx !== i));
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    const form = new FormData();
    form.append("file", file);
    const result = await uploadDeckFile.mutateAsync(form);
    setUploadedFileIds(ids => [...ids, result.id]);
  }

  function handleFileReady(file: DeckFileItem) {
    if (appendedSummaries.current.has(file.id)) return;
    appendedSummaries.current.add(file.id);
    if (file.parsed_summary) {
      setExtraContext(prev => {
        const prefix = prev.trim() ? prev.trim() + "\n\n" : "";
        const points = file.key_points?.length
          ? "\n\nKey points:\n" + file.key_points.map(p => `- ${p}`).join("\n")
          : "";
        return prefix + `[From ${file.original_filename}]\n${file.parsed_summary}${points}`;
      });
    }
  }

  function handleFileDeleted(id: string) {
    setUploadedFileIds(ids => ids.filter(i => i !== id));
  }

  async function handleSubmit() {
    if (!title.trim() || !topic.trim()) return;
    const deck = await createDeck.mutateAsync({
      title: title.trim(),
      topic: topic.trim(),
      format,
      theme,
      key_messages: keyMessages.filter(m => m.trim()),
      slide_count: slideCount,
      brand_logo_url: brandLogoUrl.trim() || undefined,
      company_url: companyUrl.trim() || undefined,
      company_name: companyName.trim() || undefined,
      extra_context: extraContext.trim() || undefined,
      font_family: customFont.trim() || fontFamily,
    });
    navigate(`/decks/${deck.id}`);
  }

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => step === "format" ? navigate("/decks") : setStep(step === "brand" ? "content" : "format")}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">New Deck</p>
            <h1 className="text-lg font-bold text-slate-900">
              {step === "format" ? "Choose format" : step === "content" ? "Content" : "Brand & style"}
            </h1>
          </div>
        </div>

        {/* Step indicator */}
        <div className="flex gap-1.5">
          {(["format", "content", "brand"] as Step[]).map((s, i) => (
            <div key={s} className={`h-1 rounded-full flex-1 transition-colors ${
              ["format", "content", "brand"].indexOf(step) >= i ? "bg-indigo-500" : "bg-slate-200"
            }`} />
          ))}
        </div>

        {/* ── Step 1: Format ── */}
        {step === "format" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {([
                { value: "deck", label: "Slide Deck", desc: "Multi-slide presentation with navigation", icon: "🖥️" },
                { value: "onepager", label: "One-pager", desc: "Single scrollable summary page", icon: "📄" },
              ] as const).map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setFormat(opt.value)}
                  className={`p-4 rounded-2xl border-2 text-left transition-all ${
                    format === opt.value
                      ? "border-indigo-500 bg-indigo-50"
                      : "border-slate-100 bg-white hover:border-indigo-200"
                  }`}
                >
                  <span className="text-2xl">{opt.icon}</span>
                  <p className="text-sm font-semibold text-slate-900 mt-2">{opt.label}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{opt.desc}</p>
                </button>
              ))}
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Theme</p>
              <div className="grid grid-cols-2 gap-3">
                {([
                  { value: "dark", label: "Dark", bg: "#0F172A", text: "#F8FAFC" },
                  { value: "light", label: "Light", bg: "#FAFAFA", text: "#1E293B" },
                ] as const).map(t => (
                  <button
                    key={t.value}
                    onClick={() => setTheme(t.value)}
                    className={`p-3 rounded-xl border-2 flex items-center gap-3 transition-all ${
                      theme === t.value ? "border-indigo-500" : "border-slate-100 hover:border-indigo-200"
                    }`}
                    style={{ background: t.bg }}
                  >
                    <span className="text-xs font-semibold" style={{ color: t.text }}>{t.label}</span>
                    <div className="ml-auto flex gap-1">
                      {["#6366F1","#A78BFA","#818CF8"].map(c => (
                        <span key={c} className="w-3 h-3 rounded-full" style={{ background: c }} />
                      ))}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => setStep("content")}
              className="w-full py-3 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors"
            >
              Continue →
            </button>
          </div>
        )}

        {/* ── Step 2: Content ── */}
        {step === "content" && (
          <div className="space-y-4">
            <div className="bg-white border border-slate-100 rounded-2xl p-4 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600">Deck title</label>
                <input
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. Q2 2025 Investor Update"
                  className="w-full text-sm px-3 py-2.5 border border-slate-200 rounded-xl outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600">Topic / brief</label>
                <textarea
                  value={topic}
                  onChange={e => setTopic(e.target.value)}
                  rows={3}
                  placeholder="What is this deck about? Describe the goal, audience, and main message."
                  className="w-full text-sm px-3 py-2.5 border border-slate-200 rounded-xl outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 resize-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-600">Key messages</label>
                {keyMessages.map((msg, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      value={msg}
                      onChange={e => updateKeyMessage(i, e.target.value)}
                      placeholder={`Key message ${i + 1}`}
                      className="flex-1 text-sm px-3 py-2 border border-slate-200 rounded-xl outline-none focus:border-indigo-400"
                    />
                    {keyMessages.length > 1 && (
                      <button onClick={() => removeKeyMessage(i)} className="p-2 text-slate-300 hover:text-red-400 transition-colors">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
                <button onClick={addKeyMessage} className="text-xs text-indigo-600 font-semibold hover:underline">
                  + Add message
                </button>
              </div>
              {format === "deck" && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600">Number of slides</label>
                  <input
                    type="number"
                    min={4}
                    max={20}
                    value={slideCount}
                    onChange={e => setSlideCount(Number(e.target.value))}
                    className="w-24 text-sm px-3 py-2 border border-slate-200 rounded-xl outline-none focus:border-indigo-400"
                  />
                </div>
              )}
            </div>

            <button
              onClick={() => setStep("brand")}
              disabled={!title.trim() || !topic.trim()}
              className="w-full py-3 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-40"
            >
              Continue →
            </button>
          </div>
        )}

        {/* ── Step 3: Brand & style ── */}
        {step === "brand" && (
          <div className="space-y-4">
            <div className="bg-white border border-slate-100 rounded-2xl p-4 space-y-4">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Brand</p>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600">Company name</label>
                <input
                  value={companyName}
                  onChange={e => setCompanyName(e.target.value)}
                  placeholder="Acme Corp"
                  className="w-full text-sm px-3 py-2.5 border border-slate-200 rounded-xl outline-none focus:border-indigo-400"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600">Logo URL <span className="text-slate-400 font-normal">(used to extract your color palette)</span></label>
                <input
                  value={brandLogoUrl}
                  onChange={e => setBrandLogoUrl(e.target.value)}
                  placeholder="https://yourcompany.com/logo.png"
                  className="w-full text-sm px-3 py-2.5 border border-slate-200 rounded-xl outline-none focus:border-indigo-400"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600">Company / product URL</label>
                <input
                  value={companyUrl}
                  onChange={e => setCompanyUrl(e.target.value)}
                  placeholder="https://yourcompany.com"
                  className="w-full text-sm px-3 py-2.5 border border-slate-200 rounded-xl outline-none focus:border-indigo-400"
                />
              </div>

              {/* ── File upload ── */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-600">
                    Source documents <span className="text-slate-400 font-normal">(PDF, Excel, DOCX, CSV, images)</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadDeckFile.isPending}
                    className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 disabled:opacity-40 transition-colors"
                  >
                    {uploadDeckFile.isPending ? (
                      <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    ) : (
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                    )}
                    Upload file
                  </button>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.xlsx,.xls,.csv,.docx,.txt,.png,.jpg,.jpeg,.webp"
                  className="hidden"
                  onChange={handleFileChange}
                />
                {uploadDeckFile.isError && (
                  <p className="text-xs text-red-500">
                    {(uploadDeckFile.error as Error)?.message ?? "Upload failed"}
                  </p>
                )}
                {uploadedFileIds.length > 0 && (
                  <div className="space-y-1.5">
                    {uploadedFileIds.map(id => (
                      <PollDeckFile
                        key={id}
                        id={id}
                        onReady={handleFileReady}
                        onDelete={handleFileDeleted}
                      />
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600">
                  Additional context <span className="text-slate-400 font-normal">(auto-filled from uploaded files, or paste manually)</span>
                </label>
                <textarea
                  value={extraContext}
                  onChange={e => setExtraContext(e.target.value)}
                  rows={5}
                  placeholder="Paste in any text from a doc, spreadsheet, or notes. The AI will use this to populate the slides accurately."
                  className="w-full text-sm px-3 py-2.5 border border-slate-200 rounded-xl outline-none focus:border-indigo-400 resize-none"
                />
              </div>
            </div>

            <div className="bg-white border border-slate-100 rounded-2xl p-4 space-y-4">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Typography</p>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600">Font family</label>
                <div className="grid grid-cols-2 gap-2">
                  {FONTS.map(f => (
                    <button
                      key={f}
                      onClick={() => { setFontFamily(f); setCustomFont(""); }}
                      className={`px-3 py-2 text-xs rounded-lg border transition-all text-left ${
                        fontFamily === f && !customFont
                          ? "border-indigo-500 bg-indigo-50 text-indigo-700 font-semibold"
                          : "border-slate-200 text-slate-600 hover:border-indigo-200"
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
                <div className="mt-2 space-y-1">
                  <label className="text-xs text-slate-400">Or enter a custom Google Font name</label>
                  <input
                    value={customFont}
                    onChange={e => setCustomFont(e.target.value)}
                    placeholder="e.g. Fraunces"
                    className="w-full text-sm px-3 py-2 border border-slate-200 rounded-xl outline-none focus:border-indigo-400"
                  />
                </div>
              </div>
            </div>

            <button
              onClick={handleSubmit}
              disabled={createDeck.isPending}
              className="w-full py-3 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {createDeck.isPending ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Creating…
                </>
              ) : (
                "Generate deck →"
              )}
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
