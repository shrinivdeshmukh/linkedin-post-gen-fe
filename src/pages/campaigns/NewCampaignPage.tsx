import { useState, type KeyboardEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useCreateCampaign, type CampaignCreatePayload } from "../../lib/api-hooks";
import { Button } from "../../components/ui/Button";

const TARGET_OUTCOMES = [
  "Build thought leadership",
  "Drive inbound leads",
  "Announce something",
  "Share expertise",
  "Grow community",
];

const POST_COUNTS = [2, 3, 4, 5, 6, 8];

const FREQUENCIES = [
  { days: 1,  label: "Daily" },
  { days: 7,  label: "Weekly" },
  { days: 14, label: "Bi-weekly" },
  { days: 30, label: "Monthly" },
];

type Step = 1 | 2 | 3;

interface FormState {
  // Step 1
  name: string;
  topic: string;
  target_outcome: string;
  key_messages: string[];
  // Step 2
  mode: "series" | "collection";
  post_count: number;
  frequency_days: number;
  start_date: string;
  // Step 3
  post_type: "text" | "image";
  tone_override: string;
}

const STEP_TITLES = ["Campaign brief", "Format & schedule", "Style & generate"];

function StepIndicator({ current }: { current: Step }) {
  return (
    <div className="flex items-center gap-2">
      {([1, 2, 3] as Step[]).map((s) => (
        <div key={s} className="flex items-center gap-2">
          <div className={[
            "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all",
            s < current ? "bg-indigo-600 text-white" :
            s === current ? "bg-indigo-600 text-white ring-4 ring-indigo-100" :
            "bg-slate-100 text-slate-400",
          ].join(" ")}>
            {s < current ? (
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            ) : s}
          </div>
          {s < 3 && <div className={`w-8 h-0.5 ${s < current ? "bg-indigo-600" : "bg-slate-200"}`} />}
        </div>
      ))}
    </div>
  );
}

function KeyMessagesInput({ messages, onChange }: { messages: string[]; onChange: (m: string[]) => void }) {
  const [draft, setDraft] = useState("");

  function add() {
    const trimmed = draft.trim();
    if (trimmed && !messages.includes(trimmed)) {
      onChange([...messages, trimmed]);
    }
    setDraft("");
  }

  function onKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") { e.preventDefault(); add(); }
    if (e.key === "Backspace" && draft === "" && messages.length > 0) {
      onChange(messages.slice(0, -1));
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2 p-3 bg-white border border-slate-300 rounded-xl min-h-[48px] focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-transparent">
        {messages.map((m, i) => (
          <span key={i} className="flex items-center gap-1.5 bg-indigo-50 text-indigo-700 text-xs font-medium px-2.5 py-1 rounded-lg">
            {m}
            <button type="button" onClick={() => onChange(messages.filter((_, j) => j !== i))} className="text-indigo-300 hover:text-indigo-600">✕</button>
          </span>
        ))}
        <input
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={onKey}
          onBlur={add}
          placeholder={messages.length === 0 ? "Type a key message and press Enter…" : "Add another…"}
          className="flex-1 min-w-[180px] text-sm text-slate-900 placeholder:text-slate-400 outline-none bg-transparent"
        />
      </div>
      <p className="text-xs text-slate-400">Press Enter to add each message. These are the core ideas to weave across all posts.</p>
    </div>
  );
}

export default function NewCampaignPage() {
  const navigate = useNavigate();
  const createCampaign = useCreateCampaign();
  const [step, setStep] = useState<Step>(1);

  const today = new Date().toISOString().split("T")[0];

  const [form, setForm] = useState<FormState>({
    name: "",
    topic: "",
    target_outcome: TARGET_OUTCOMES[0],
    key_messages: [],
    mode: "series",
    post_count: 4,
    frequency_days: 7,
    start_date: today,
    post_type: "text",
    tone_override: "",
  });

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm(f => ({ ...f, [key]: value }));
  }

  function canAdvance(): boolean {
    if (step === 1) return form.name.trim().length > 0 && form.topic.trim().length > 0 && form.key_messages.length > 0;
    if (step === 2) return form.start_date.length > 0;
    return true;
  }

  async function handleGenerate() {
    const payload: CampaignCreatePayload = {
      name: form.name,
      topic: form.topic,
      target_outcome: form.target_outcome,
      key_messages: form.key_messages,
      mode: form.mode,
      post_count: form.post_count,
      frequency_days: form.frequency_days,
      start_date: form.start_date,
      post_type: form.post_type,
      include_images: form.post_type === "image",
      tone_override: form.tone_override.trim() || undefined,
    };
    const campaign = await createCampaign.mutateAsync(payload);
    navigate(`/campaigns/${campaign.id}`);
  }

  return (
    <div className="h-full overflow-y-auto px-8 py-7">
      <div className="max-w-2xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button onClick={() => navigate("/campaigns")} className="text-slate-400 hover:text-slate-600 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-slate-900">New Campaign</h1>
            <p className="text-sm text-slate-500">{STEP_TITLES[step - 1]}</p>
          </div>
          <StepIndicator current={step} />
        </div>

        {/* Step 1 — Brief */}
        {step === 1 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">Campaign name</label>
              <input
                value={form.name}
                onChange={e => set("name", e.target.value)}
                placeholder="e.g. Fintech Thought Leadership Q2"
                className="w-full px-4 py-2.5 text-sm text-slate-900 bg-white border border-slate-300 rounded-xl placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">Topic / brief</label>
              <textarea
                value={form.topic}
                onChange={e => set("topic", e.target.value)}
                placeholder="e.g. Why fintech founders underestimate regulatory risk — and what to do about it"
                rows={3}
                className="w-full px-4 py-2.5 text-sm text-slate-900 bg-white border border-slate-300 rounded-xl placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">Target outcome</label>
              <div className="flex flex-wrap gap-2">
                {TARGET_OUTCOMES.map(o => (
                  <button
                    key={o}
                    type="button"
                    onClick={() => set("target_outcome", o)}
                    className={[
                      "px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
                      form.target_outcome === o
                        ? "bg-indigo-600 text-white border-indigo-600"
                        : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300",
                    ].join(" ")}
                  >
                    {o}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">Key messages</label>
              <KeyMessagesInput messages={form.key_messages} onChange={m => set("key_messages", m)} />
            </div>
          </div>
        )}

        {/* Step 2 — Format & schedule */}
        {step === 2 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6">
            <div className="space-y-3">
              <label className="text-sm font-semibold text-slate-700">Campaign type</label>
              <div className="grid grid-cols-2 gap-3">
                {(["series", "collection"] as const).map(m => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => set("mode", m)}
                    className={[
                      "p-4 rounded-xl border-2 text-left transition-all",
                      form.mode === m ? "border-indigo-600 bg-indigo-50" : "border-slate-200 hover:border-indigo-200",
                    ].join(" ")}
                  >
                    <p className={`text-sm font-bold ${form.mode === m ? "text-indigo-700" : "text-slate-800"}`}>
                      {m === "series" ? "Connected series" : "Themed collection"}
                    </p>
                    <p className={`text-xs mt-1 ${form.mode === m ? "text-indigo-500" : "text-slate-500"}`}>
                      {m === "series"
                        ? "Posts build on each other — Part 1 of 4, Part 2 of 4… A narrative arc."
                        : "Independent posts on the same theme, each standing alone."}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Number of posts</label>
              <div className="flex gap-2 flex-wrap">
                {POST_COUNTS.map(n => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => set("post_count", n)}
                    className={[
                      "w-12 h-10 rounded-xl text-sm font-semibold border transition-all",
                      form.post_count === n
                        ? "bg-indigo-600 text-white border-indigo-600"
                        : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300",
                    ].join(" ")}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Posting frequency</label>
              <div className="flex gap-2 flex-wrap">
                {FREQUENCIES.map(f => (
                  <button
                    key={f.days}
                    type="button"
                    onClick={() => set("frequency_days", f.days)}
                    className={[
                      "px-4 py-2 rounded-xl text-sm font-medium border transition-all",
                      form.frequency_days === f.days
                        ? "bg-indigo-600 text-white border-indigo-600"
                        : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300",
                    ].join(" ")}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">Start date</label>
              <input
                type="date"
                value={form.start_date}
                onChange={e => set("start_date", e.target.value)}
                min={today}
                className="px-4 py-2.5 text-sm text-slate-900 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <p className="text-xs text-slate-400">
                {form.post_count} posts · {FREQUENCIES.find(f => f.days === form.frequency_days)?.label.toLowerCase()} · last post on{" "}
                {new Date(new Date(form.start_date).getTime() + (form.post_count - 1) * form.frequency_days * 86400000).toLocaleDateString()}
              </p>
            </div>
          </div>
        )}

        {/* Step 3 — Style & generate */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Post format</label>
                <div className="flex gap-3">
                  {(["text", "image"] as const).map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => set("post_type", t)}
                      className={[
                        "px-5 py-2 rounded-xl text-sm font-medium border transition-all",
                        form.post_type === t
                          ? "bg-indigo-600 text-white border-indigo-600"
                          : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300",
                      ].join(" ")}
                    >
                      {t === "text" ? "Text only" : "With images"}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700">
                  Tone override <span className="font-normal text-slate-400">(optional)</span>
                </label>
                <textarea
                  value={form.tone_override}
                  onChange={e => set("tone_override", e.target.value)}
                  placeholder="e.g. Confident but not arrogant. Data-driven with a human touch. Avoid jargon."
                  rows={2}
                  className="w-full px-4 py-2.5 text-sm text-slate-900 bg-white border border-slate-300 rounded-xl placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
                <p className="text-xs text-slate-400">Leave blank to use your workspace voice profile.</p>
              </div>
            </div>

            {/* Summary */}
            <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5 space-y-3">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Campaign summary</p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-slate-500">Name</span><span className="font-medium text-slate-800">{form.name}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Type</span><span className="font-medium text-slate-800 capitalize">{form.mode}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Posts</span><span className="font-medium text-slate-800">{form.post_count}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Frequency</span><span className="font-medium text-slate-800">{FREQUENCIES.find(f => f.days === form.frequency_days)?.label}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Starts</span><span className="font-medium text-slate-800">{new Date(form.start_date).toLocaleDateString()}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Format</span><span className="font-medium text-slate-800 capitalize">{form.post_type}</span></div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between pt-2">
          <Button
            variant="ghost"
            onClick={() => step === 1 ? navigate("/campaigns") : setStep((s) => (s - 1) as Step)}
          >
            {step === 1 ? "Cancel" : "← Back"}
          </Button>
          {step < 3 ? (
            <Button disabled={!canAdvance()} onClick={() => setStep((s) => (s + 1) as Step)}>
              Continue →
            </Button>
          ) : (
            <Button
              disabled={createCampaign.isPending}
              loading={createCampaign.isPending}
              onClick={handleGenerate}
            >
              {createCampaign.isPending ? "Creating campaign…" : "Generate campaign ✦"}
            </Button>
          )}
        </div>

        {createCampaign.isError && (
          <p className="text-sm text-red-500 text-center">Generation failed. Please try again.</p>
        )}
      </div>
    </div>
  );
}
