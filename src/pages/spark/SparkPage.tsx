import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  useLatestResearch,
  useTriggerResearch,
  useGetResearchBrief,
  useOrgProfile,
  useUpdateOrgSettings,
} from "../../lib/api-hooks";

// ── Types ──────────────────────────────────────────────────────────────────────

interface FeedItem {
  title: string;
  summary: string;
  angle: string;
  urgency: "high" | "medium" | "low";
  hook: string;
  sources?: { title: string; url: string; snippet?: string }[];
}

interface FeedResult {
  section_summary?: string;
  items?: FeedItem[];
}

// Legacy auto_pulse types (still used for Studio sidebar)
interface SparkTopic {
  title: string;
  summary: string;
  angle: string;
  urgency: string;
  why_now?: string;
  sources?: { title: string; url: string; snippet?: string }[];
}

// ── Constants ──────────────────────────────────────────────────────────────────

const FEED_SECTIONS = [
  {
    mode: "competitor_feed",
    title: "Competitor Intelligence",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
      </svg>
    ),
    color: "text-rose-600",
    bg: "bg-rose-50",
    border: "border-rose-100",
    dot: { high: "bg-rose-500", medium: "bg-rose-300", low: "bg-rose-200" },
  },
  {
    mode: "industry_trends",
    title: "Industry Trends",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    ),
    color: "text-indigo-600",
    bg: "bg-indigo-50",
    border: "border-indigo-100",
    dot: { high: "bg-indigo-500", medium: "bg-indigo-300", low: "bg-indigo-200" },
  },
  {
    mode: "world_politics",
    title: "World & Politics",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    color: "text-amber-600",
    bg: "bg-amber-50",
    border: "border-amber-100",
    dot: { high: "bg-amber-500", medium: "bg-amber-300", low: "bg-amber-200" },
  },
  {
    mode: "creative_angles",
    title: "Creative Angles",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
    color: "text-violet-600",
    bg: "bg-violet-50",
    border: "border-violet-100",
    dot: { high: "bg-violet-500", medium: "bg-violet-300", low: "bg-violet-200" },
  },
] as const;

// ── Feed card ──────────────────────────────────────────────────────────────────

function FeedCard({
  item,
  section,
  onWritePost,
  onCampaign,
}: {
  item: FeedItem;
  section: typeof FEED_SECTIONS[number];
  onWritePost: (title: string, context: string) => void;
  onCampaign: (topic: string) => void;
}) {
  const dotColor = section.dot[item.urgency] ?? section.dot.low;

  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-4 space-y-3 hover:border-slate-200 hover:shadow-sm transition-all duration-150">
      <div className="flex items-start gap-2.5">
        <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${dotColor}`} />
        <p className="text-sm font-semibold text-slate-900 leading-snug">{item.title}</p>
      </div>

      <p className="text-sm text-slate-500 leading-relaxed pl-4 line-clamp-3">{item.summary}</p>

      {item.hook && (
        <p className="text-xs text-slate-400 italic pl-4 line-clamp-2">"{item.hook}"</p>
      )}

      {item.sources && item.sources.length > 0 && (
        <div className="flex gap-1.5 flex-wrap pl-4">
          {item.sources.slice(0, 3).map((s, i) => (
            <a
              key={i}
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-slate-400 hover:text-indigo-600 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-full truncate max-w-[160px] transition-colors"
            >
              {s.title || s.url}
            </a>
          ))}
        </div>
      )}

      <div className="flex gap-2 pl-4 pt-1">
        <button
          onClick={() => onWritePost(item.title, `${item.hook}\n\n${item.angle}`)}
          className={`flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${section.bg} ${section.color} hover:opacity-80`}
        >
          Write post →
        </button>
        <button
          onClick={() => onCampaign(item.title)}
          className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors"
        >
          Campaign →
        </button>
      </div>
    </div>
  );
}

// ── Feed section ───────────────────────────────────────────────────────────────

function FeedSection({
  section,
  onWritePost,
  onCampaign,
}: {
  section: typeof FEED_SECTIONS[number];
  onWritePost: (title: string, context: string) => void;
  onCampaign: (topic: string) => void;
}) {
  const { data: session, isLoading, refetch } = useLatestResearch(section.mode);
  const triggerResearch = useTriggerResearch();
  const result = session?.result as FeedResult | null | undefined;
  const isRunning = session?.status === "pending" || session?.status === "running";
  const isFailed = session?.status === "failed";

  useEffect(() => {
    if (isRunning) {
      const timer = setInterval(() => refetch(), 3000);
      return () => clearInterval(timer);
    }
  }, [isRunning, refetch]);

  const lastUpdated = session?.completed_at
    ? new Date(session.completed_at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
    : null;

  async function handleRefresh() {
    try {
      await triggerResearch.mutateAsync({ mode: section.mode });
      setTimeout(() => refetch(), 1000);
    } catch {
      // 409 = already running, ignore
    }
  }

  return (
    <section className="space-y-3">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${section.bg} ${section.color}`}>
            {section.icon}
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-800">{section.title}</h2>
            {lastUpdated && !isRunning && (
              <p className="text-[11px] text-slate-400">Updated {lastUpdated}</p>
            )}
            {isRunning && (
              <p className="text-[11px] text-indigo-500 animate-pulse">Researching…</p>
            )}
          </div>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isRunning || triggerResearch.isPending}
          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-40"
          title="Refresh this section"
        >
          <svg className={`w-3.5 h-3.5 ${isRunning ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      {/* Section summary */}
      {result?.section_summary && !isRunning && (
        <p className={`text-xs px-3 py-2 rounded-xl ${section.bg} ${section.color} font-medium`}>
          {result.section_summary}
        </p>
      )}

      {/* Loading */}
      {(isLoading || isRunning) && (
        <div className="space-y-3 animate-pulse">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-28 bg-slate-100 rounded-2xl" />
          ))}
        </div>
      )}

      {/* Failed */}
      {isFailed && !isRunning && (
        <div className="bg-red-50 border border-red-100 rounded-2xl p-4 text-sm text-red-600">
          Research failed. <button onClick={handleRefresh} className="underline font-medium">Try again</button>
        </div>
      )}

      {/* Empty */}
      {!isLoading && !isRunning && !isFailed && (!result?.items || result.items.length === 0) && (
        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-6 text-center space-y-2">
          <p className="text-sm text-slate-400">No data yet.</p>
          <button onClick={handleRefresh} disabled={triggerResearch.isPending} className={`text-xs font-semibold ${section.color} hover:underline`}>
            Run research →
          </button>
        </div>
      )}

      {/* Cards */}
      {!isRunning && result?.items && result.items.length > 0 && (
        <div className="space-y-3">
          {result.items.slice(0, 4).map((item, i) => (
            <FeedCard key={i} item={item} section={section} onWritePost={onWritePost} onCampaign={onCampaign} />
          ))}
        </div>
      )}
    </section>
  );
}

// ── Competitors editor ─────────────────────────────────────────────────────────

function CompetitorsEditor({ initial, onSave }: { initial: string[]; onSave: (list: string[]) => void }) {
  const [items, setItems] = useState(initial);
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState(false);

  function add() {
    const t = draft.trim();
    if (t && !items.includes(t)) setItems([...items, t]);
    setDraft("");
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tracking competitors</p>
        {!editing ? (
          <button onClick={() => setEditing(true)} className="text-xs text-indigo-600 font-medium hover:underline">Edit</button>
        ) : (
          <button onClick={() => { onSave(items); setEditing(false); }} className="text-xs text-emerald-600 font-semibold hover:underline">Save</button>
        )}
      </div>
      {items.length === 0 && !editing && (
        <p className="text-xs text-slate-400 italic">No competitors tracked — add some to unlock the Competitor feed.</p>
      )}
      <div className="flex flex-wrap gap-2">
        {items.map((item, i) => (
          <span key={i} className="flex items-center gap-1 bg-slate-100 text-slate-700 text-xs px-2.5 py-1 rounded-full font-medium">
            {item}
            {editing && (
              <button onClick={() => setItems(items.filter((_, j) => j !== i))} className="text-slate-400 hover:text-slate-600 ml-0.5">×</button>
            )}
          </span>
        ))}
        {editing && (
          <input
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
            onBlur={add}
            placeholder="Add competitor…"
            className="text-xs px-2.5 py-1 border border-slate-200 rounded-full outline-none focus:border-indigo-400 min-w-[130px]"
          />
        )}
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function SparkPage() {
  const navigate = useNavigate();
  const triggerResearch = useTriggerResearch();
  const getResearchBrief = useGetResearchBrief();
  const { data: org } = useOrgProfile();
  const updateOrg = useUpdateOrgSettings();

  // Today's brief — reads latest auto_pulse for the summary line
  const { data: pulseSession } = useLatestResearch("auto_pulse");
  const pulseResult = pulseSession?.result as { summary?: string; topics?: SparkTopic[] } | null | undefined;

  const lastPulse = pulseSession?.completed_at
    ? new Date(pulseSession.completed_at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
    : null;

  async function handleRefreshAll() {
    const modes = ["competitor_feed", "industry_trends", "world_politics", "creative_angles"];
    await Promise.allSettled(modes.map(mode => triggerResearch.mutateAsync({ mode })));
  }

  function handleWritePost(title: string, context: string) {
    navigate("/studio", { state: { spark: { topic: title, rawContext: context } } });
  }

  async function handleCampaign(topic: string) {
    try {
      const brief = await getResearchBrief.mutateAsync();
      navigate("/studio", { state: { prefill: { ...brief, topic } } });
    } catch {
      navigate("/studio?tab=campaign", { state: { prefill: { topic, name: `${topic} Campaign` } } });
    }
  }

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-8">

        {/* ── Today's brief ── */}
        <div className="bg-gradient-to-br from-violet-600 to-indigo-700 rounded-2xl p-5 space-y-3 shadow-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-white/20 rounded-lg flex items-center justify-center">
                <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <p className="text-xs font-bold text-white/70 uppercase tracking-wider">Today's Brief</p>
                {lastPulse && <p className="text-[11px] text-white/50">Updated {lastPulse}</p>}
              </div>
            </div>
            <button
              onClick={handleRefreshAll}
              disabled={triggerResearch.isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white/15 hover:bg-white/25 text-white rounded-xl transition-colors disabled:opacity-50"
            >
              <svg className={`w-3 h-3 ${triggerResearch.isPending ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh all
            </button>
          </div>
          {pulseResult?.summary ? (
            <p className="text-sm text-white/90 leading-relaxed">{pulseResult.summary}</p>
          ) : (
            <p className="text-sm text-white/60 italic">No brief yet — refresh to generate your daily pulse.</p>
          )}
        </div>

        {/* ── Competitors config ── */}
        <CompetitorsEditor
          initial={org?.competitors ?? []}
          onSave={list => updateOrg.mutate({ competitors: list })}
        />

        {/* ── Feed sections ── */}
        {FEED_SECTIONS.map(section => (
          <FeedSection
            key={section.mode}
            section={section}
            onWritePost={handleWritePost}
            onCampaign={handleCampaign}
          />
        ))}

      </div>
    </div>
  );
}
