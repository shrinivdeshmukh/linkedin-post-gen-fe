import type { PostType } from "../../../lib/api-hooks";

const TYPES: { type: PostType; label: string; icon: React.ReactNode; description: string }[] = [
  {
    type: "text",
    label: "Text",
    description: "Written post",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h7" />
      </svg>
    ),
  },
  {
    type: "image",
    label: "Image",
    description: "Photo + caption",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    type: "carousel",
    label: "Carousel",
    description: "Multi-slide PDF",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
      </svg>
    ),
  },
  {
    type: "poll",
    label: "Poll",
    description: "Ask your network",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
];

interface PostTypeSelectorProps {
  value: PostType;
  onChange: (type: PostType) => void;
  disabled?: boolean;
}

export function PostTypeSelector({ value, onChange, disabled }: PostTypeSelectorProps) {
  return (
    <div className="flex gap-2">
      {TYPES.map(({ type, label, icon, description }) => (
        <button
          key={type}
          type="button"
          disabled={disabled}
          onClick={() => onChange(type)}
          className={[
            "flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-sm font-medium border transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed",
            value === type
              ? "bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-200"
              : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50",
          ].join(" ")}
          title={description}
        >
          {icon}
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
}
