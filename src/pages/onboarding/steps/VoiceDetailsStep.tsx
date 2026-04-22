import { useState } from "react";
import { TagInput } from "../../../components/onboarding/TagInput";
import { Button } from "../../../components/ui/Button";

const AVOID_SUGGESTIONS = [
  "Buzzwords",
  "Political topics",
  "Competitor names",
  "Excessive jargon",
  "Humble bragging",
  "Controversial opinions",
  "Sales language",
  "Acronyms",
];

export interface VoiceDetailsData {
  avoid: string[];
  sample_posts: string[];
  free_form: string;
}

interface VoiceDetailsStepProps {
  data: VoiceDetailsData;
  onChange: (data: VoiceDetailsData) => void;
  onNext: () => void;
  onBack: () => void;
  loading?: boolean;
}

export function VoiceDetailsStep({
  data,
  onChange,
  onNext,
  onBack,
  loading,
}: VoiceDetailsStepProps) {
  const [sampleInput, setSampleInput] = useState("");

  function addSample() {
    const trimmed = sampleInput.trim();
    if (trimmed && data.sample_posts.length < 3) {
      onChange({ ...data, sample_posts: [...data.sample_posts, trimmed] });
      setSampleInput("");
    }
  }

  function removeSample(i: number) {
    onChange({
      ...data,
      sample_posts: data.sample_posts.filter((_, idx) => idx !== i),
    });
  }

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h2 className="text-xl font-bold text-slate-900">Fine-tune your style</h2>
        <p className="text-sm text-slate-500">
          The more context you give, the better the AI captures your voice.
        </p>
      </div>

      {/* Avoid */}
      <div className="space-y-2">
        <div>
          <h3 className="text-sm font-semibold text-slate-700">What to always avoid</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Things that should never appear in your posts.
          </p>
        </div>
        <TagInput
          tags={data.avoid}
          onChange={(avoid) => onChange({ ...data, avoid })}
          placeholder="Add something to avoid…"
          suggestions={AVOID_SUGGESTIONS}
        />
      </div>

      {/* Sample posts */}
      <div className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-700">
            Sample posts{" "}
            <span className="text-slate-400 font-normal">
              (up to 3, optional but recommended)
            </span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Paste your best past LinkedIn posts — this is the strongest signal for the AI.
          </p>
        </div>

        {data.sample_posts.map((post, i) => (
          <div
            key={i}
            className="relative bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm text-slate-700 leading-relaxed"
          >
            <p className="pr-8 line-clamp-3">{post}</p>
            <button
              type="button"
              onClick={() => removeSample(i)}
              className="absolute top-3 right-3 text-slate-400 hover:text-red-500 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}

        {data.sample_posts.length < 3 && (
          <div className="space-y-2">
            <textarea
              value={sampleInput}
              onChange={(e) => setSampleInput(e.target.value)}
              placeholder={`Paste sample post ${data.sample_posts.length + 1}…`}
              rows={4}
              className="w-full px-3.5 py-3 text-sm text-slate-900 bg-white border border-slate-300 rounded-xl placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent hover:border-slate-400 transition-colors resize-none"
            />
            <button
              type="button"
              onClick={addSample}
              disabled={!sampleInput.trim()}
              className="text-sm text-indigo-600 hover:text-indigo-700 font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              + Add this post
            </button>
          </div>
        )}
      </div>

      {/* Free form */}
      <div className="space-y-2">
        <div>
          <h3 className="text-sm font-semibold text-slate-700">
            Anything else?{" "}
            <span className="text-slate-400 font-normal">(optional)</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Any other context about your voice, style, or what makes your posts unique.
          </p>
        </div>
        <textarea
          value={data.free_form}
          onChange={(e) => onChange({ ...data, free_form: e.target.value })}
          placeholder="e.g. I like to open with a personal story, I never use exclamation marks, I prefer short paragraphs…"
          rows={3}
          className="w-full px-3.5 py-3 text-sm text-slate-900 bg-white border border-slate-300 rounded-xl placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent hover:border-slate-400 transition-colors resize-none"
        />
      </div>

      <div className="flex gap-3 pt-2">
        <Button variant="outline" size="lg" onClick={onBack} className="w-28">
          Back
        </Button>
        <Button size="lg" fullWidth onClick={onNext} loading={loading}>
          Finish setup
        </Button>
      </div>
    </div>
  );
}
