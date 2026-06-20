import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useResearchSection, type ResearchSectionItem } from "../../lib/api-hooks";
import { useTriggerResearch } from "../../lib/api-hooks";

// ── Section config (mirrors SparkPage) ────────────────────────────────────────

const SECTION_CONFIG = {
  competitor_feed: {
    title: "Competitor Intelligence",
    color: "text-rose-600",
    bg: "bg-rose-50",
    border: "border-rose-100",
    dot: { high: "bg-rose-500", medium: "bg-rose-300", low: "bg-rose-200" },
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
      </svg>
    ),
  },
  industry_trends: {
    title: "Industry Trends",
    color: "text-indigo-600",
    bg: "bg-indigo-50",
    border: "border-indigo-100",
    dot: { high: "bg-indigo-500", medium: "bg-indigo-300", low: "bg-indigo-200" },
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    ),
  },
  world_politics: {
    title: "World & Politics",
    color: "text-amber-600",
    bg: "bg-amber-50",
    border: "border-amber-100",
    dot: { high: "bg-amber-500", medium: "bg-amber-300", low: "bg-amber-200" },
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  creative_angles: {
    title: "Creative Angles",
    color: "text-violet-600",
    bg: "bg-violet-50",
    border: "border-violet-100",
    dot: { high: "bg-violet-500", medium: "bg-violet-300", low: "bg-violet-200" },
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
  },
} as const;

type SectionMode = keyof typeof SECTION_CONFIG;

// ── Item card ──────────────────────────────────────────────────────────────────

function SectionItemCard({
  item,
  config,
  onWritePost,
  onCampaign,
  onDeepDive,
  deepDiving,
}: {
  item: ResearchSectionItem;
  config: typeof SECTION_CONFIG[SectionMode];
  onWritePost: (title: string, context: string) => void;
  onCampaign: (topic: string) => void;
  onDeepDive: (title: string) => void;
  deepDiving: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const dotColor = config.dot[item.urgency] ?? config.dot.low;
  const date = item.session_date
    ? new Date(item.session_date).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
    : null;

  return (
    <div
      className={`bg-white border rounded-2xl transition-all duration-150 ${expanded ? "border-slate-200 shadow-sm" : "border-slate-100 hover:border-slate-200 hover:shadow-sm cursor-pointer"}`}
      onClick={() => !expanded && setExpanded(true)}
    >
      <div className="p-4 space-y-2">
        <div className="flex items-start gap-2.5">
          <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${dotColor}`} />
          <p className="text-sm font-semibold text-slate-900 leading-snug flex-1">{item.title}</p>
          <div className="flex items-center gap-2 flex-shrink-0">
            {date && <span className="text-[10px] text-slate-300">{date}</span>}
            <button
              onClick={(e) => { e.stopPropagation(); setExpanded(v => !v); }}
              className="text-slate-300 hover:text-slate-500 transition-colors"
            >
              <svg className={`w-4 h-4 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        </div>
        <p className={`text-sm text-slate-500 leading-relaxed pl-4 ${expanded ? "" : "line-clamp-2"}`}>{item.summary}</p>
      </div>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-slate-50 pt-3">
          {item.hook && (
            <p className="text-xs text-slate-400 italic pl-4">"{item.hook}"</p>
          )}
          {item.angle && (
            <div className={`text-xs px-3 py-2 rounded-xl ${config.bg} ${config.color} leading-relaxed`}>
              {item.angle}
            </div>
          )}
          {item.post_risk && item.post_risk !== "low" && (
            <div className={`flex items-center gap-1.5 pl-4 text-[11px] font-medium ${item.post_risk === "high" ? "text-red-600" : "text-amber-600"}`}>
              <svg className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {item.post_risk === "high" ? "High sensitivity" : "Moderate sensitivity"}
              {item.risk_reason && item.risk_reason !== "none" && ` — ${item.risk_reason}`}
            </div>
          )}
          {item.surprise_factor && item.surprise_factor !== "low" && (
            <div className={`pl-4 text-[11px] font-medium ${item.surprise_factor === "high" ? "text-violet-600" : "text-slate-400"}`}>
              {item.surprise_factor === "high" ? "Highly original angle" : "Original angle"}
            </div>
          )}
          {item.sources && item.sources.length > 0 && (
            <div className="flex gap-1.5 flex-wrap pl-4">
              {item.sources.slice(0, 3).map((s, i) => (
                <a
                  key={i}
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-[11px] text-slate-400 hover:text-indigo-600 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-full truncate max-w-[160px] transition-colors"
                >
                  {s.title || s.url}
                </a>
              ))}
            </div>
          )}
          <div className="flex gap-2 pl-4 pt-1 flex-wrap">
            <button
              onClick={(e) => { e.stopPropagation(); onWritePost(item.title, `${item.hook}\n\n${item.angle}`); }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${config.bg} ${config.color} hover:opacity-80`}
            >
              Write post →
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onCampaign(item.title); }}
              className="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Campaign →
            </button>
            {deepDiving ? (
              <span className="flex items-center gap-1 px-3 py-1.5 text-xs text-indigo-400">
                <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Starting…
              </span>
            ) : (
              <button
                onClick={(e) => { e.stopPropagation(); onDeepDive(item.title); }}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Research deeper
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function SparkSectionPage() {
  const { mode } = useParams<{ mode: string }>();
  const navigate = useNavigate();
  const triggerResearch = useTriggerResearch();
  const { data, isLoading, refetch } = useResearchSection(mode ?? null);
  const [deepDivingTitle, setDeepDivingTitle] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [throttled, setThrottled] = useState(false);

  const config = SECTION_CONFIG[mode as SectionMode];
  if (!config) {
    return <div className="p-8 text-slate-500">Unknown section.</div>;
  }

  async function handleRefresh() {
    setThrottled(false);
    setRefreshing(true);
    try {
      await triggerResearch.mutateAsync({ mode: mode! });
      setTimeout(() => { refetch(); setRefreshing(false); }, 2000);
    } catch (e: unknown) {
      const status = (e as { response?: { status?: number } })?.response?.status;
      if (status === 429) setThrottled(true);
      setRefreshing(false);
    }
  }

  async function handleDeepDive(title: string) {
    setDeepDivingTitle(title);
    try {
      const session = await triggerResearch.mutateAsync({ mode: "deep_dive", topic: title }) as { id: string };
      navigate(`/spark/research/${session.id}`);
    } catch {
      setDeepDivingTitle(null);
    }
  }

  function handleWritePost(title: string, context: string) {
    navigate("/studio", { state: { spark: { topic: title, rawContext: context } } });
  }

  function handleCampaign(topic: string) {
    navigate("/campaigns/new", { state: { prefill: { topic, name: `${topic} Campaign` } } });
  }

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/spark")}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${config.bg} ${config.color}`}>
            {config.icon}
          </div>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-slate-900">{config.title}</h1>
            {data && !isLoading && (
              <p className="text-xs text-slate-400">{data.total} item{data.total !== 1 ? "s" : ""} across recent sessions</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {throttled && (
              <span className="text-[11px] text-amber-500 font-medium">Refreshed recently</span>
            )}
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-200 hover:border-slate-300 rounded-xl transition-colors disabled:opacity-50"
            >
              <svg className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
          </div>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="space-y-3 animate-pulse">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-24 bg-slate-100 rounded-2xl" />
            ))}
          </div>
        )}

        {/* Empty */}
        {!isLoading && data && data.items.length === 0 && (
          <div className="bg-white border border-slate-100 rounded-2xl p-10 text-center space-y-3">
            <p className="text-sm text-slate-400">No data yet for this section.</p>
            <button
              onClick={handleRefresh}
              className={`text-sm font-semibold ${config.color} hover:underline`}
            >
              Run research →
            </button>
          </div>
        )}

        {/* Cards */}
        {!isLoading && data && data.items.length > 0 && (
          <div className="space-y-3">
            {data.items.map((item, i) => (
              <SectionItemCard
                key={i}
                item={item}
                config={config}
                onWritePost={handleWritePost}
                onCampaign={handleCampaign}
                onDeepDive={handleDeepDive}
                deepDiving={deepDivingTitle === item.title}
              />
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
