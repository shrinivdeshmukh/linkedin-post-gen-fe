import type { AIResult } from "../../../lib/api-hooks";

const MODEL_META: Record<string, { label: string; color: string; bg: string }> = {
  claude:  { label: "Claude",  color: "text-orange-700", bg: "bg-orange-50" },
  openai:  { label: "GPT-4o",  color: "text-emerald-700", bg: "bg-emerald-50" },
  gemini:  { label: "Gemini",  color: "text-blue-700",   bg: "bg-blue-50" },
};

interface AIResultCardProps {
  result: AIResult;
  selected: boolean;
  onSelect: (fullPost: string, model: string) => void;
}

export function AIResultCard({ result, selected, onSelect }: AIResultCardProps) {
  const meta = MODEL_META[result.model] ?? { label: result.model, color: "text-slate-700", bg: "bg-slate-50" };

  if (result.error) {
    return (
      <div className="rounded-2xl border border-red-100 bg-red-50 p-6 flex items-center justify-center min-h-[120px]">
        <p className="text-sm text-red-500 text-center">Generation failed for {meta.label}. Try regenerating.</p>
      </div>
    );
  }

  return (
    <div
      className={[
        "rounded-2xl border-2 p-5 flex flex-col gap-4 transition-all duration-200 cursor-pointer",
        selected
          ? "border-indigo-500 bg-indigo-50/40 shadow-md shadow-indigo-100"
          : "border-slate-200 bg-white hover:border-indigo-300 hover:shadow-sm",
      ].join(" ")}
      onClick={() => onSelect(result.full_post ?? "", result.model)}
    >
      {/* Hook */}
      {result.hook && (
        <div>
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Hook</p>
          <p className="text-sm font-semibold text-slate-900 leading-snug">{result.hook}</p>
        </div>
      )}

      {/* Body */}
      {result.body && (
        <div>
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Body</p>
          <p className="text-sm text-slate-600 leading-relaxed line-clamp-6">{result.body}</p>
        </div>
      )}

      {/* CTA */}
      {result.cta && (
        <div>
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">CTA</p>
          <p className="text-sm text-slate-700 italic">{result.cta}</p>
        </div>
      )}

      {/* Hashtags */}
      {result.hashtags && result.hashtags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {result.hashtags.map((tag) => (
            <span key={tag} className="text-xs text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
              #{tag.replace(/^#/, "")}
            </span>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-100">
        <span className="text-xs text-slate-400">{(result.full_post ?? "").length} chars</span>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onSelect(result.full_post ?? "", result.model); }}
          className={[
            "text-xs font-semibold px-4 py-1.5 rounded-lg transition-colors",
            selected
              ? "bg-indigo-600 text-white"
              : "bg-slate-100 text-slate-700 hover:bg-indigo-600 hover:text-white",
          ].join(" ")}
        >
          {selected ? "✓ Using this draft" : "Use this draft"}
        </button>
      </div>
    </div>
  );
}
