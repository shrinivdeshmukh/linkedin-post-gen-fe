import { useRef, useEffect } from "react";

interface PostEditorProps {
  content: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function PostEditor({ content, onChange, placeholder }: PostEditorProps) {
  const ref = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
  }, [content]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-semibold text-slate-700">Edit your post</label>
        <div className="flex items-center gap-3">
          {/* Formatting hint */}
          <span className="text-xs text-slate-400">
            Tip: blank lines create visual spacing on LinkedIn
          </span>
        </div>
      </div>

      <div className="relative">
        <textarea
          ref={ref}
          value={content}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder ?? "Start writing your post…"}
          className="w-full min-h-[200px] px-4 py-3.5 text-sm text-slate-900 bg-white border border-slate-300 rounded-2xl placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent hover:border-slate-400 transition-colors resize-none leading-relaxed"
        />
      </div>

      {/* Quick format toolbar */}
      <div className="flex items-center gap-1 flex-wrap">
        {[
          {
            label: "Add hook",
            action: () =>
              onChange(
                "Here's something most people get wrong:\n\n" + content
              ),
          },
          {
            label: "Add CTA",
            action: () =>
              onChange(
                content +
                  "\n\nWhat's your take? Drop it in the comments 👇"
              ),
          },
          {
            label: "Add hashtags",
            action: () =>
              onChange(content + "\n\n#Leadership #Strategy #Innovation"),
          },
          {
            label: "Add line breaks",
            action: () => onChange(content.replace(/\. /g, ".\n\n")),
          },
        ].map(({ label, action }) => (
          <button
            key={label}
            type="button"
            onClick={action}
            className="text-xs text-slate-500 border border-slate-200 rounded-lg px-2.5 py-1 hover:bg-slate-50 hover:border-slate-300 hover:text-slate-700 transition-colors"
          >
            + {label}
          </button>
        ))}
      </div>
    </div>
  );
}
