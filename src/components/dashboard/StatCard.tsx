interface StatCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: "indigo" | "emerald" | "amber" | "blue";
  trend?: string;
}

const colorMap = {
  indigo: { bg: "bg-indigo-50", icon: "text-indigo-600", value: "text-indigo-700" },
  emerald: { bg: "bg-emerald-50", icon: "text-emerald-600", value: "text-emerald-700" },
  amber: { bg: "bg-amber-50", icon: "text-amber-600", value: "text-amber-700" },
  blue: { bg: "bg-blue-50", icon: "text-blue-600", value: "text-blue-700" },
};

export function StatCard({ label, value, icon, color, trend }: StatCardProps) {
  const c = colorMap[color];
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5 flex items-start gap-4 shadow-sm">
      <div className={`w-10 h-10 rounded-xl ${c.bg} flex items-center justify-center flex-shrink-0 ${c.icon}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{label}</p>
        <p className={`text-2xl font-bold mt-0.5 ${c.value}`}>{value}</p>
        {trend && <p className="text-xs text-slate-400 mt-0.5">{trend}</p>}
      </div>
    </div>
  );
}
