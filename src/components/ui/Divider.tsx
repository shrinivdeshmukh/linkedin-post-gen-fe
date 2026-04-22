export function Divider({ label = "or" }: { label?: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-px bg-slate-200" />
      <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">
        {label}
      </span>
      <div className="flex-1 h-px bg-slate-200" />
    </div>
  );
}
