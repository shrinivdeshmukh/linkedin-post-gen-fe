import { ToneSlider } from "../../../components/onboarding/ToneSlider";
import { TagInput } from "../../../components/onboarding/TagInput";
import { Button } from "../../../components/ui/Button";

const TOPIC_SUGGESTIONS = [
  "Leadership",
  "Technology",
  "Strategy",
  "Innovation",
  "Culture",
  "Finance",
  "AI & ML",
  "Product",
  "Startups",
  "Sustainability",
  "Operations",
  "Marketing",
  "Future of Work",
  "Diversity & Inclusion",
];

const AUDIENCE_SUGGESTIONS = [
  "CTOs & engineers",
  "Investors & VCs",
  "Enterprise buyers",
  "Startup founders",
  "HR & talent teams",
  "Marketing leaders",
  "Board members",
  "General professionals",
];

export interface VoiceToneData {
  tone: {
    formal: number;       // 0=casual, 100=formal
    analytical: number;   // 0=storytelling, 100=analytical
    bold: number;         // 0=reserved, 100=bold
  };
  topics: string[];
  audience: string[];
}

interface VoiceToneStepProps {
  data: VoiceToneData;
  onChange: (data: VoiceToneData) => void;
  onNext: () => void;
  onBack: () => void;
}

export function VoiceToneStep({ data, onChange, onNext, onBack }: VoiceToneStepProps) {
  function setTone(key: keyof VoiceToneData["tone"], val: number) {
    onChange({ ...data, tone: { ...data.tone, [key]: val } });
  }

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h2 className="text-xl font-bold text-slate-900">Define your voice</h2>
        <p className="text-sm text-slate-500">
          This trains the AI to write posts that actually sound like you.
        </p>
      </div>

      {/* Tone sliders */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">
          Tone
        </h3>
        <div className="bg-slate-50 rounded-2xl p-5 space-y-5 border border-slate-100">
          <ToneSlider
            leftLabel="Casual"
            rightLabel="Formal"
            value={data.tone.formal}
            onChange={(v) => setTone("formal", v)}
          />
          <ToneSlider
            leftLabel="Storytelling"
            rightLabel="Analytical"
            value={data.tone.analytical}
            onChange={(v) => setTone("analytical", v)}
          />
          <ToneSlider
            leftLabel="Reserved"
            rightLabel="Bold"
            value={data.tone.bold}
            onChange={(v) => setTone("bold", v)}
          />
        </div>
      </div>

      {/* Topics */}
      <div className="space-y-2">
        <div>
          <h3 className="text-sm font-semibold text-slate-700">Topics you write about</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Pick from suggestions or type your own, press Enter to add.
          </p>
        </div>
        <TagInput
          tags={data.topics}
          onChange={(topics) => onChange({ ...data, topics })}
          placeholder="Add a topic…"
          suggestions={TOPIC_SUGGESTIONS}
        />
      </div>

      {/* Audience */}
      <div className="space-y-2">
        <div>
          <h3 className="text-sm font-semibold text-slate-700">Who are you writing for?</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Your target audience on LinkedIn.
          </p>
        </div>
        <TagInput
          tags={data.audience}
          onChange={(audience) => onChange({ ...data, audience })}
          placeholder="Add an audience…"
          suggestions={AUDIENCE_SUGGESTIONS}
        />
      </div>

      <div className="flex gap-3 pt-2">
        <Button variant="outline" size="lg" onClick={onBack} className="w-28">
          Back
        </Button>
        <Button
          size="lg"
          fullWidth
          onClick={onNext}
          disabled={data.topics.length === 0 || data.audience.length === 0}
        >
          Continue
        </Button>
      </div>
    </div>
  );
}
