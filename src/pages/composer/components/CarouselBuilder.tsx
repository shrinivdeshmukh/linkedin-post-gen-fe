import { Button } from "../../../components/ui/Button";

export interface Slide {
  title: string;
  body: string;
}

interface Props {
  slides: Slide[];
  onChange: (slides: Slide[]) => void;
}

export function CarouselBuilder({ slides, onChange }: Props) {
  function addSlide() {
    onChange([...slides, { title: "", body: "" }]);
  }

  function removeSlide(i: number) {
    onChange(slides.filter((_, idx) => idx !== i));
  }

  function moveUp(i: number) {
    if (i === 0) return;
    const next = [...slides];
    [next[i - 1], next[i]] = [next[i], next[i - 1]];
    onChange(next);
  }

  function moveDown(i: number) {
    if (i === slides.length - 1) return;
    const next = [...slides];
    [next[i], next[i + 1]] = [next[i + 1], next[i]];
    onChange(next);
  }

  function updateSlide(i: number, field: "title" | "body", value: string) {
    const next = slides.map((s, idx) => (idx === i ? { ...s, [field]: value } : s));
    onChange(next);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-700">
          Carousel slides
          <span className="ml-2 text-xs font-normal text-slate-400">
            {slides.length} slide{slides.length !== 1 ? "s" : ""} · each page = one swipe
          </span>
        </p>
        <Button variant="outline" size="sm" onClick={addSlide}>
          + Add slide
        </Button>
      </div>

      {slides.length === 0 && (
        <div className="border border-dashed border-slate-200 rounded-xl p-5 text-center text-sm text-slate-400">
          No slides yet. Add your first slide above.
        </div>
      )}

      {slides.map((slide, i) => (
        <div key={i} className="border border-slate-200 rounded-xl p-4 space-y-2.5 bg-white">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Slide {i + 1}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => moveUp(i)}
                disabled={i === 0}
                className="p-1 rounded hover:bg-slate-100 disabled:opacity-30 text-slate-400"
                title="Move up"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => moveDown(i)}
                disabled={i === slides.length - 1}
                className="p-1 rounded hover:bg-slate-100 disabled:opacity-30 text-slate-400"
                title="Move down"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => removeSlide(i)}
                className="p-1 rounded hover:bg-red-50 text-slate-400 hover:text-red-500"
                title="Remove slide"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <input
            type="text"
            value={slide.title}
            onChange={(e) => updateSlide(i, "title", e.target.value)}
            placeholder="Slide headline…"
            className="w-full px-3 py-2 text-sm font-semibold text-slate-900 bg-slate-50 border border-slate-200 rounded-lg placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
          <textarea
            value={slide.body}
            onChange={(e) => updateSlide(i, "body", e.target.value)}
            placeholder="Slide content — a key insight, stat, or story beat…"
            rows={3}
            className="w-full px-3 py-2 text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-lg placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
          />
        </div>
      ))}
    </div>
  );
}
