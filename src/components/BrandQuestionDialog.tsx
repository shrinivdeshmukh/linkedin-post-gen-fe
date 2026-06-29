import { useState } from "react";
import { useAnswerBrandQuestion, useSkipBrandQuestion, type BrandQuestion } from "../lib/api-hooks";

interface Props {
  question: BrandQuestion;
  onDone: () => void;
}

const DIMENSION_LABELS: Record<string, string> = {
  audience: "Your audience",
  themes: "Your themes",
  tone: "Your tone",
  avoid: "What to avoid",
  calibration: "Your brand",
};

export default function BrandQuestionDialog({ question, onDone }: Props) {
  const [answer, setAnswer] = useState("");
  const answerMutation = useAnswerBrandQuestion();
  const skipMutation = useSkipBrandQuestion();

  async function handleSubmit() {
    if (!answer.trim()) return;
    await answerMutation.mutateAsync({ promptId: question.id, answer: answer.trim() });
    onDone();
  }

  async function handleSkip() {
    await skipMutation.mutateAsync(question.id);
    onDone();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-indigo-500" />
            <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wide">
              Building your brand voice · {DIMENSION_LABELS[question.dimension] ?? question.dimension}
            </span>
          </div>
          <p className="text-slate-900 font-semibold text-base leading-snug">
            {question.question}
          </p>
        </div>

        {/* Input */}
        <div className="px-6 py-4">
          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="A sentence or two is plenty…"
            rows={3}
            autoFocus
            className="w-full text-sm text-slate-800 placeholder:text-slate-400 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400/40 focus:border-indigo-400 transition"
          />
        </div>

        {/* Actions */}
        <div className="px-6 pb-5 flex items-center justify-between">
          <button
            onClick={handleSkip}
            disabled={skipMutation.isPending}
            className="text-sm text-slate-400 hover:text-slate-600 transition-colors"
          >
            Skip for now
          </button>
          <button
            onClick={handleSubmit}
            disabled={!answer.trim() || answerMutation.isPending}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-sm font-semibold rounded-xl transition-colors"
          >
            {answerMutation.isPending ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
