import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useCreateDeck } from "../../lib/api-hooks";

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

export default function NewDeckPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const prefill = (location.state as { topic?: string; key_messages?: string[] } | null) ?? {};

  const createDeck = useCreateDeck();

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

  function addKeyMessage() { setKeyMessages(m => [...m, ""]); }
  function updateKeyMessage(i: number, val: string) {
    setKeyMessages(m => m.map((v, idx) => idx === i ? val : v));
  }
  function removeKeyMessage(i: number) {
    setKeyMessages(m => m.filter((_, idx) => idx !== i));
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
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600">Additional context <span className="text-slate-400 font-normal">(product details, data, talking points)</span></label>
                <textarea
                  value={extraContext}
                  onChange={e => setExtraContext(e.target.value)}
                  rows={4}
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
