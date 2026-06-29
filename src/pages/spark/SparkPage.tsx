import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { ResearchSession } from "../../lib/api-hooks";
import {
  useLatestResearch,
  useTriggerResearch,
  useGetResearchBrief,
  useOrgProfile,
  useUpdateOrgSettings,
  useStreak,
} from "../../lib/api-hooks";

// ── Types ──────────────────────────────────────────────────────────────────────

interface FeedItem {
  title: string;
  summary: string;
  angle: string;
  urgency: "high" | "medium" | "low";
  hook: string;
  sources?: { title: string; url: string; snippet?: string }[];
  // World & Politics
  post_risk?: "low" | "medium" | "high";
  risk_reason?: string;
  // Creative Angles
  surprise_factor?: "low" | "medium" | "high";
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
  const [expanded, setExpanded] = useState(false);
  const [deepDiveStatus, setDeepDiveStatus] = useState<"idle" | "loading">("idle");
  const triggerResearch = useTriggerResearch();
  const navigate = useNavigate();
  const dotColor = section.dot[item.urgency] ?? section.dot.low;

  async function handleDeepDive() {
    setDeepDiveStatus("loading");
    try {
      const session = await triggerResearch.mutateAsync({ mode: "deep_dive", topic: item.title }) as ResearchSession;
      navigate(`/spark/research/${session.id}`);
    } catch {
      setDeepDiveStatus("idle");
    }
  }

  return (
    <div
      className={`bg-white border rounded-2xl transition-all duration-150 ${expanded ? "border-slate-200 shadow-sm" : "border-slate-100 hover:border-slate-200 hover:shadow-sm cursor-pointer"}`}
      onClick={() => !expanded && setExpanded(true)}
    >
      {/* Card header — always visible */}
      <div className="p-4 space-y-2">
        <div className="flex items-start gap-2.5">
          <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${dotColor}`} />
          <p className="text-sm font-semibold text-slate-900 leading-snug flex-1">{item.title}</p>
          <button
            onClick={(e) => { e.stopPropagation(); setExpanded(v => !v); }}
            className="text-slate-300 hover:text-slate-500 flex-shrink-0 transition-colors"
          >
            <svg className={`w-4 h-4 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>

        <p className={`text-sm text-slate-500 leading-relaxed pl-4 ${expanded ? "" : "line-clamp-2"}`}>{item.summary}</p>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-slate-50 pt-3">
          {item.hook && (
            <p className="text-xs text-slate-400 italic pl-4">"{item.hook}"</p>
          )}

          {item.angle && (
            <div className={`text-xs px-3 py-2 rounded-xl ${section.bg} ${section.color} leading-relaxed`}>
              {item.angle}
            </div>
          )}

          {/* World & Politics: risk badge */}
          {item.post_risk && item.post_risk !== "low" && (
            <div className={`flex items-center gap-1.5 pl-4 text-[11px] font-medium ${item.post_risk === "high" ? "text-red-600" : "text-amber-600"}`}>
              <svg className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {item.post_risk === "high" ? "High sensitivity" : "Moderate sensitivity"}
              {item.risk_reason && item.risk_reason !== "none" && ` — ${item.risk_reason}`}
            </div>
          )}

          {/* Creative Angles: surprise factor badge */}
          {item.surprise_factor && (
            <div className={`pl-4 text-[11px] font-medium ${item.surprise_factor === "high" ? "text-violet-600" : "text-slate-400"}`}>
              {item.surprise_factor === "high" ? "Highly original angle" : item.surprise_factor === "medium" ? "Original angle" : ""}
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
              className={`flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${section.bg} ${section.color} hover:opacity-80`}
            >
              Write post →
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onCampaign(item.title); }}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Campaign →
            </button>
            {deepDiveStatus === "idle" ? (
              <button
                onClick={(e) => { e.stopPropagation(); handleDeepDive(); }}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Research deeper
              </button>
            ) : (
              <span className="flex items-center gap-1 px-3 py-1.5 text-xs text-indigo-400">
                <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Starting…
              </span>
            )}
          </div>
        </div>
      )}
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
  const navigate = useNavigate();
  const { data: session, isLoading, refetch } = useLatestResearch(section.mode);
  const triggerResearch = useTriggerResearch();
  const result = session?.result as FeedResult | null | undefined;
  const isRunning = session?.status === "pending" || session?.status === "running";
  const isFailed = session?.status === "failed";
  const [throttled, setThrottled] = useState(false);

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
    } catch (e: unknown) {
      const status = (e as { response?: { status?: number } })?.response?.status;
      if (status === 429) setThrottled(true);
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
        <div className="flex items-center gap-2">
          {throttled && (
            <span className="text-[11px] text-amber-500 font-medium">Refreshed recently</span>
          )}
          <button
            onClick={() => { setThrottled(false); handleRefresh(); }}
            disabled={isRunning || triggerResearch.isPending}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-40"
            title={throttled ? "Refreshed within the last 4 hours" : "Refresh this section"}
          >
            <svg className={`w-3.5 h-3.5 ${isRunning ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {/* Section summary */}
      {result?.section_summary && !isRunning && (
        <p className={`text-xs px-3 py-2 rounded-xl ${section.bg} ${section.color} font-medium`}>
          {result.section_summary}
        </p>
      )}

      {/* Loading */}
      {(isLoading || isRunning) && (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-28 skeleton rounded-2xl" />
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
          <button
            onClick={() => navigate(`/spark/sections/${section.mode}`)}
            className={`w-full text-center text-xs font-semibold py-2.5 rounded-xl border border-dashed transition-colors ${section.border} ${section.color} hover:${section.bg}`}
          >
            Show more →
          </button>
        </div>
      )}
    </section>
  );
}

// ── Competitors editor ─────────────────────────────────────────────────────────

function CompetitorsEditor({
  initial,
  initialUrls,
  onSave,
}: {
  initial: string[];
  initialUrls: Record<string, string>;
  onSave: (list: string[], urls: Record<string, string>) => void;
}) {
  const [items, setItems] = useState(initial);
  const [urls, setUrls] = useState<Record<string, string>>(initialUrls);
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (!editing) {
      setItems(initial);
      setUrls(initialUrls);
    }
  }, [initial, initialUrls]);

  function add() {
    const t = draft.trim();
    if (t && !items.includes(t)) setItems([...items, t]);
    setDraft("");
  }

  function remove(i: number) {
    const removed = items[i];
    setItems(items.filter((_, j) => j !== i));
    setUrls(prev => { const next = { ...prev }; delete next[removed]; return next; });
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tracking competitors</p>
        {!editing ? (
          <button onClick={() => setEditing(true)} className="text-xs text-indigo-600 font-medium hover:underline">Edit</button>
        ) : (
          <button onClick={() => { onSave(items, urls); setEditing(false); }} className="text-xs text-emerald-600 font-semibold hover:underline">Save</button>
        )}
      </div>
      {items.length === 0 && !editing && (
        <p className="text-xs text-slate-400 italic">No competitors tracked — add some to unlock the Competitor feed.</p>
      )}
      {!editing ? (
        <div className="flex flex-wrap gap-2">
          {items.map((item, i) => (
            <span key={i} className="flex items-center gap-1 bg-slate-100 text-slate-700 text-xs px-2.5 py-1 rounded-full font-medium">
              {item}
            </span>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="flex items-center gap-1 bg-slate-100 text-slate-700 text-xs px-2.5 py-1 rounded-full font-medium flex-shrink-0">
                {item}
                <button onClick={() => remove(i)} className="text-slate-400 hover:text-slate-600 ml-0.5">×</button>
              </span>
              <input
                value={urls[item] ?? ""}
                onChange={e => setUrls(prev => ({ ...prev, [item]: e.target.value }))}
                placeholder="Website URL (optional)"
                className="text-xs px-2.5 py-1 border border-slate-200 rounded-full outline-none focus:border-indigo-400 flex-1 min-w-0"
              />
            </div>
          ))}
          <div className="flex items-center gap-2">
            <input
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
              onBlur={add}
              placeholder="Add competitor…"
              className="text-xs px-2.5 py-1 border border-slate-200 rounded-full outline-none focus:border-indigo-400 min-w-[130px]"
            />
          </div>
        </div>
      )}
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
  const { data: streak } = useStreak();

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

  function handleNewDeck(topic?: string) {
    navigate("/decks/new", { state: topic ? { topic } : undefined });
  }

  async function handleCampaign(topic: string) {
    try {
      const brief = await getResearchBrief.mutateAsync();
      navigate("/campaigns/new", { state: { prefill: { ...brief, topic } } });
    } catch {
      navigate("/campaigns/new", { state: { prefill: { topic, name: `${topic} Campaign` } } });
    }
  }

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">

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
            <div className="flex items-center gap-2">
              {streak && streak.current_streak > 0 && (
                <div
                  className="flex items-center gap-1 px-2.5 py-1 bg-white/15 rounded-xl cursor-default"
                  title={`Longest streak: ${streak.longest_streak} days · ${streak.total_published} posts published`}
                >
                  <span className="text-sm leading-none">🔥</span>
                  <span className="text-xs font-bold text-white">{streak.current_streak}d</span>
                </div>
              )}
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
          </div>
          {pulseResult?.summary ? (
            <p className="text-sm text-white/90 leading-relaxed">{pulseResult.summary}</p>
          ) : (
            <p className="text-sm text-white/60 italic">No brief yet — refresh to generate your daily pulse.</p>
          )}
        </div>

        {/* ── Quick actions ── */}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => handleNewDeck()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:border-indigo-300 hover:text-indigo-600 rounded-xl transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            New deck
          </button>
        </div>

        {/* ── Competitors config ── */}
        <CompetitorsEditor
          initial={org?.competitors ?? []}
          initialUrls={org?.competitor_urls ?? {}}
          onSave={(list, urls) => updateOrg.mutate({ competitors: list, competitor_urls: urls })}
        />

        {/* ── Feed sections — 2×2 grid on desktop, single column on mobile ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
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
    </div>
  );
}
