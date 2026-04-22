import type { PostStatus } from "../../lib/api-hooks";

const CONFIG: Record<PostStatus, { label: string; classes: string; dot: string }> = {
  draft: {
    label: "Draft",
    classes: "bg-slate-100 text-slate-600",
    dot: "bg-slate-400",
  },
  pending_approval: {
    label: "Pending",
    classes: "bg-amber-50 text-amber-700",
    dot: "bg-amber-400",
  },
  approved: {
    label: "Approved",
    classes: "bg-emerald-50 text-emerald-700",
    dot: "bg-emerald-400",
  },
  scheduled: {
    label: "Scheduled",
    classes: "bg-blue-50 text-blue-700",
    dot: "bg-blue-400",
  },
  published: {
    label: "Published",
    classes: "bg-indigo-50 text-indigo-700",
    dot: "bg-indigo-500",
  },
  rejected: {
    label: "Rejected",
    classes: "bg-red-50 text-red-600",
    dot: "bg-red-400",
  },
};

interface StatusBadgeProps {
  status: PostStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const { label, classes, dot } = CONFIG[status] ?? CONFIG.draft;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${classes}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      {label}
    </span>
  );
}
