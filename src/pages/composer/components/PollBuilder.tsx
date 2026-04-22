import { Input } from "../../../components/ui/Input";

export interface PollData {
  question: string;
  options: string[];
  duration_days: number;
}

interface PollBuilderProps {
  data: PollData;
  onChange: (data: PollData) => void;
}

const DURATION_OPTIONS = [
  { value: 1, label: "1 day" },
  { value: 3, label: "3 days" },
  { value: 7, label: "1 week" },
  { value: 14, label: "2 weeks" },
];

export function PollBuilder({ data, onChange }: PollBuilderProps) {
  function setOption(i: number, value: string) {
    const next = [...data.options];
    next[i] = value;
    onChange({ ...data, options: next });
  }

  function addOption() {
    if (data.options.length < 4)
      onChange({ ...data, options: [...data.options, ""] });
  }

  function removeOption(i: number) {
    if (data.options.length > 2)
      onChange({ ...data, options: data.options.filter((_, idx) => idx !== i) });
  }

  return (
    <div className="space-y-5 bg-slate-50 rounded-2xl p-5 border border-slate-100">
      <h3 className="text-sm font-semibold text-slate-700">Poll settings</h3>

      <Input
        label="Poll question"
        placeholder="What do you think about…?"
        value={data.question}
        onChange={(e) => onChange({ ...data, question: e.target.value })}
      />

      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-700">Options</label>
        {data.options.map((opt, i) => (
          <div key={i} className="flex gap-2 items-center">
            <Input
              placeholder={`Option ${i + 1}`}
              value={opt}
              onChange={(e) => setOption(i, e.target.value)}
            />
            {data.options.length > 2 && (
              <button
                type="button"
                onClick={() => removeOption(i)}
                className="text-slate-400 hover:text-red-500 transition-colors flex-shrink-0"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        ))}
        {data.options.length < 4 && (
          <button
            type="button"
            onClick={addOption}
            className="text-sm text-indigo-600 hover:text-indigo-700 font-medium transition-colors"
          >
            + Add option
          </button>
        )}
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-700">Duration</label>
        <div className="flex gap-2 flex-wrap">
          {DURATION_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => onChange({ ...data, duration_days: value })}
              className={[
                "px-3.5 py-2 text-sm rounded-xl border font-medium transition-colors",
                data.duration_days === value
                  ? "bg-indigo-600 text-white border-indigo-600"
                  : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300",
              ].join(" ")}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
