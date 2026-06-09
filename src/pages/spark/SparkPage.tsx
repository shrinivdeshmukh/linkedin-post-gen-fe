import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  useLatestResearch,
  useResearchSession,
  useTriggerResearch,
  useGetResearchBrief,
  useOrgProfile,
  useUpdateOrgSettings,
} from "../../lib/api-hooks";

// ── Result types ──────────────────────────────────────────────────────────────

interface SparkTopic {
  title: string;
  summary: string;
  angle: string;
  urgency: string;
  sources?: { title: string; url: string; snippet?: string }[];
}

interface SparkConnection {
  event: string;
  relevance: string;
  post_idea: string;
  hook: string;
}

interface SparkCompetitor {
  name: string;
  update: string;
  opportunity: string;
}

interface SparkResult {
  mode?: string;
  summary?: string;
  topics?: SparkTopic[];
  creative_connections?: SparkConnection[];
  competitor_updates?: SparkCompetitor[];
  recommended_campaign?: {
    name: string;
    topic: string;
    target_outcome: string;
    key_messages: string[];
  };
}

// ── Shared components ─────────────────────────────────────────────────────────

function UrgencyBadge({ urgency }: { urgency: string }) {
  const colors =
    urgency === "high"
      ? "bg-red-50 text-red-700 border-red-200"
      : urgency === "medium"
      ? "bg-amber-50 text-amber-700 border-amber-200"
      : "bg-slate-50 text-slate-500 border-slate-200";
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${colors}`}>
      {urgency}
    </span>
  );
}

function LoadingSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3 animate-pulse">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-28 bg-slate-100 rounded-xl" />
      ))}
    </div>
  );
}

// ── Competitors editor ─────────────────────────────────────────────────────────

function CompetitorsEditor({
  initial,
  onSave,
}: {
  initial: string[];
  onSave: (list: string[]) => void;
}) {
  const [items, setItems] = useState(initial);
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState(false);

  function add() {
    const trimmed = draft.trim();
    if (trimmed && !items.includes(trimmed)) setItems([...items, trimmed]);
    setDraft("");
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold text-slate-700">Competitors to track</p>
        {!editing ? (
          <button type="button" onClick={() => setEditing(true)} className="text-xs text-indigo-600 hover:text-indigo-700 font-medium">Edit</button>
        ) : (
          <button type="button" onClick={() => { onSave(items); setEditing(false); }} className="text-xs text-green-600 hover:text-green-700 font-semibold">Save</button>
        )}
      </div>
      {items.length === 0 && !editing && (
        <p className="text-xs text-slate-400 italic">No competitors tracked. Click Edit to add some.</p>
      )}
      <div className="flex flex-wrap gap-2">
        {items.map((item, i) => (
          <span key={i} className="flex items-center gap-1 bg-slate-100 text-slate-700 text-xs px-2.5 py-1 rounded-full font-medium">
            {item}
            {editing && (
              <button type="button" onClick={() => setItems(items.filter((_, j) => j !== i))} className="text-slate-400 hover:text-slate-600 ml-0.5">×</button>
            )}
          </span>
        ))}
        {editing && (
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
            onBlur={add}
            placeholder="Add competitor…"
            className="text-xs px-2.5 py-1 border border-slate-300 rounded-full outline-none focus:border-indigo-400 min-w-[120px]"
          />
        )}
      </div>
    </div>
  );
}

// ── Deep Dive modal ────────────────────────────────────────────────────────────

function DeepDiveModal({ onSubmit, onClose }: { onSubmit: (mode: string, topic?: string, url?: string) => void; onClose: () => void }) {
  const [tab, setTab] = useState<"topic" | "url">("topic");
  const [topic, setTopic] = useState("");
  const [url, setUrl] = useState("");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="px-6 py-5 border-b border-slate-100">
          <h2 className="text-base font-bold text-slate-900">Custom research</h2>
          <p className="text-sm text-slate-500 mt-0.5">Ask a question or analyse a URL.</p>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div className="flex gap-2">
            <button type="button" onClick={() => setTab("topic")} className={`flex-1 py-2 text-sm font-medium rounded-xl transition-colors ${tab === "topic" ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>Research a topic</button>
            <button type="button" onClick={() => setTab("url")} className={`flex-1 py-2 text-sm font-medium rounded-xl transition-colors ${tab === "url" ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>Analyse a URL</button>
          </div>
          {tab === "topic" ? (
            <textarea value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. How will new tariff policies affect hiring in tech?" rows={3} className="w-full text-sm border border-slate-300 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 resize-none placeholder:text-slate-400" />
          ) : (
            <input type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com/article" className="w-full text-sm border border-slate-300 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-400" />
          )}
        </div>
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex gap-3">
          <button type="button" onClick={() => { if (tab === "topic" && topic.trim()) onSubmit("deep_dive", topic.trim()); if (tab === "url" && url.trim()) onSubmit("url_analysis", undefined, url.trim()); }} disabled={(tab === "topic" && !topic.trim()) || (tab === "url" && !url.trim())} className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors">Run research</button>
          <button type="button" onClick={onClose} className="px-4 py-2.5 border border-slate-200 text-slate-600 text-sm font-medium rounded-xl hover:bg-slate-50 transition-colors">Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ── Grid view ─────────────────────────────────────────────────────────────────

function TopicGridCard({ topic, onClick }: { topic: SparkTopic; onClick: () => void }) {
  const urgencyDot =
    topic.urgency === "high" ? "bg-red-400" :
    topic.urgency === "medium" ? "bg-amber-400" : "bg-slate-300";

  return (
    <button
      type="button"
      onClick={onClick}
      className="group text-left bg-white rounded-2xl border border-slate-200 p-5 hover:border-indigo-300 hover:shadow-md transition-all duration-150 space-y-3"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${urgencyDot}`} />
          <p className="text-sm font-semibold text-slate-900 leading-snug">{topic.title}</p>
        </div>
        <UrgencyBadge urgency={topic.urgency} />
      </div>
      <p className="text-sm text-slate-500 line-clamp-2">{topic.summary}</p>
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-400">{topic.sources?.length ?? 0} source{(topic.sources?.length ?? 0) !== 1 ? "s" : ""}</span>
        <span className="text-xs font-semibold text-indigo-600 group-hover:text-indigo-700 flex items-center gap-1">
          Explore deeper
          <svg className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </span>
      </div>
    </button>
  );
}

// ── Detail view ───────────────────────────────────────────────────────────────

function DeepDiveDetail({
  topic,
  sessionId,
  onBack,
  onCreateCampaign,
}: {
  topic: SparkTopic;
  sessionId: string;
  onBack: () => void;
  onCreateCampaign: () => void;
}) {
  const { data: session } = useResearchSession(sessionId);
  const result = session?.result as SparkResult | null | undefined;
  const isRunning = session?.status === "pending" || session?.status === "running";
  const isFailed = session?.status === "failed";

  return (
    <div className="space-y-6">
      {/* Back + title */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors font-medium"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to overview
        </button>
        <div className="h-4 w-px bg-slate-200" />
        <UrgencyBadge urgency={topic.urgency} />
      </div>

      <div>
        <h2 className="text-lg font-bold text-slate-900">{topic.title}</h2>
        <p className="text-sm text-slate-500 mt-1">{topic.summary}</p>
      </div>

      {/* Loading */}
      {isRunning && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 p-4 bg-indigo-50 border border-indigo-100 rounded-xl">
            <svg className="w-4 h-4 text-indigo-600 animate-spin flex-shrink-0" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            <p className="text-sm text-indigo-700 font-medium">Running deep research on this topic…</p>
          </div>
          <LoadingSkeleton rows={3} />
        </div>
      )}

      {/* Failed */}
      {isFailed && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
          <p className="text-sm font-semibold text-red-700">Research failed</p>
          <p className="text-xs text-red-600 mt-1">{session?.error ?? "Unknown error"}</p>
        </div>
      )}

      {/* Results */}
      {!isRunning && !isFailed && result && (
        <div className="space-y-6">
          {/* Summary */}
          {result.summary && (
            <div className="p-4 bg-gradient-to-r from-indigo-50 to-violet-50 border border-indigo-100 rounded-xl">
              <p className="text-sm text-indigo-900">{result.summary}</p>
            </div>
          )}

          {/* Topics / angles */}
          {result.topics && result.topics.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Content angles</h3>
              {result.topics.map((t, i) => (
                <div key={i} className="bg-white rounded-xl border border-slate-200 p-4 space-y-2">
                  <p className="text-sm font-semibold text-slate-900">{t.title}</p>
                  <p className="text-sm text-slate-600">{t.summary}</p>
                  <div className="p-3 bg-indigo-50 rounded-lg border border-indigo-100">
                    <p className="text-xs font-medium text-indigo-700 mb-1">Post angle</p>
                    <p className="text-sm text-indigo-800">{t.angle}</p>
                  </div>
                  {t.sources && t.sources.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {t.sources.map((s, j) => (
                        <a key={j} href={s.url} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-600 hover:underline bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100 truncate max-w-[200px]">
                          {s.title || s.url}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Creative connections */}
          {result.creative_connections && result.creative_connections.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Creative connections</h3>
              {result.creative_connections.map((item, i) => (
                <div key={i} className="bg-white rounded-xl border border-slate-200 p-4 space-y-2">
                  <p className="text-sm font-semibold text-slate-900">{item.event}</p>
                  <p className="text-sm text-slate-600">{item.relevance}</p>
                  <div className="p-2.5 bg-violet-50 rounded-lg border border-violet-100">
                    <p className="text-xs font-medium text-violet-700 mb-1">Post idea</p>
                    <p className="text-sm text-violet-900">{item.post_idea}</p>
                  </div>
                  <p className="text-sm text-slate-600 italic pl-3 border-l-2 border-slate-200">"{item.hook}"</p>
                </div>
              ))}
            </div>
          )}

          {/* Campaign CTA */}
          {result.recommended_campaign && (
            <div className="bg-gradient-to-br from-indigo-600 to-violet-600 rounded-2xl p-6 text-white space-y-3">
              <div>
                <p className="text-xs font-semibold text-indigo-200 uppercase tracking-wider mb-1">Recommended campaign</p>
                <h3 className="text-base font-bold">{result.recommended_campaign.name}</h3>
                <p className="text-sm text-indigo-100 mt-1">{result.recommended_campaign.topic}</p>
              </div>
              {result.recommended_campaign.key_messages?.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {result.recommended_campaign.key_messages.map((msg, i) => (
                    <span key={i} className="text-xs bg-white/20 text-white px-2.5 py-1 rounded-full">{msg}</span>
                  ))}
                </div>
              )}
              <button type="button" onClick={onCreateCampaign} className="flex items-center gap-2 mt-1 px-5 py-2.5 bg-white text-indigo-700 text-sm font-bold rounded-xl hover:bg-indigo-50 transition-colors">
                Create campaign →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function SparkPage() {
  const navigate = useNavigate();

  // Base auto_pulse session
  const { data: baseSession, isLoading, refetch } = useLatestResearch("auto_pulse");
  const triggerResearch = useTriggerResearch();
  const getResearchBrief = useGetResearchBrief();
  const { data: org } = useOrgProfile();
  const updateOrg = useUpdateOrgSettings();

  // Navigation state
  const [view, setView] = useState<"grid" | "detail">("grid");
  const [selectedTopic, setSelectedTopic] = useState<SparkTopic | null>(null);
  const [deepDiveSessionId, setDeepDiveSessionId] = useState<string | null>(null);

  const [deepDiveOpen, setDeepDiveOpen] = useState(false);
  const [briefLoading, setBriefLoading] = useState(false);

  // Poll while base session is running
  useEffect(() => {
    if (baseSession?.status === "pending" || baseSession?.status === "running") {
      const timer = setInterval(() => refetch(), 3000);
      return () => clearInterval(timer);
    }
  }, [baseSession?.status, refetch]);

  const isRunning = baseSession?.status === "pending" || baseSession?.status === "running";
  const isStale = isRunning && baseSession?.created_at
    ? Date.now() - new Date(baseSession.created_at).getTime() > 3 * 60 * 1000
    : false;
  const baseResult = baseSession?.result as SparkResult | null | undefined;

  async function handleRefresh(mode = "auto_pulse", topic?: string, url?: string) {
    setDeepDiveOpen(false);
    try {
      const session = await triggerResearch.mutateAsync({ mode, topic, url });
      if (mode === "auto_pulse") {
        setView("grid");
        setTimeout(() => refetch(), 1000);
      } else {
        // Custom deep dive from the modal — go straight to detail
        setSelectedTopic({ title: topic ?? url ?? "Research", summary: "", angle: "", urgency: "medium" });
        setDeepDiveSessionId(session.id);
        setView("detail");
      }
    } catch {
      // error shown via triggerResearch.error
    }
  }

  async function handleTopicClick(topic: SparkTopic) {
    setSelectedTopic(topic);
    setView("detail");
    try {
      const session = await triggerResearch.mutateAsync({
        mode: "deep_dive",
        topic: `${topic.title}: ${topic.summary}`,
      });
      setDeepDiveSessionId(session.id);
    } catch {
      // error handled in detail view
    }
  }

  function handleBack() {
    setView("grid");
    setSelectedTopic(null);
    setDeepDiveSessionId(null);
  }

  async function handleCreateCampaign() {
    setBriefLoading(true);
    try {
      const brief = await getResearchBrief.mutateAsync();
      navigate("/campaigns/new", { state: { prefill: brief } });
    } catch {
      navigate("/campaigns/new");
    } finally {
      setBriefLoading(false);
    }
  }

  const lastUpdated = baseSession?.completed_at
    ? new Date(baseSession.completed_at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
    : null;

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-7 h-7 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h1 className="text-xl font-bold text-slate-900">Spark</h1>
            </div>
            <p className="text-sm text-slate-500">
              Your contextual intelligence feed{lastUpdated ? ` · Updated ${lastUpdated}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setDeepDiveOpen(true)} disabled={triggerResearch.isPending} className="px-3.5 py-2 text-sm font-medium border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 disabled:opacity-50 transition-colors">
              Custom research
            </button>
            <button type="button" onClick={() => handleRefresh("auto_pulse")} disabled={isRunning && !isStale || triggerResearch.isPending} className="flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl transition-colors">
              {isRunning && !isStale ? (
                <>
                  <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" /></svg>
                  Running…
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                  Refresh
                </>
              )}
            </button>
          </div>
        </div>

        {/* Trigger error */}
        {triggerResearch.error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-sm text-red-700">
              {(triggerResearch.error as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? "Failed to start research. Try again."}
            </p>
          </div>
        )}

        {/* Stale */}
        {isStale && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
            <p className="text-sm font-semibold text-amber-800">Research is taking longer than expected</p>
            <p className="text-xs text-amber-700">The background worker may not be running. Try again.</p>
            <button type="button" onClick={() => handleRefresh("auto_pulse")} disabled={triggerResearch.isPending} className="text-xs font-semibold text-amber-800 underline">Retry</button>
          </div>
        )}

        {/* Loading base session */}
        {(isLoading || (isRunning && !isStale)) && view === "grid" && (
          <div className="space-y-4">
            {isRunning && !isStale && (
              <div className="flex items-center gap-2 p-4 bg-indigo-50 border border-indigo-100 rounded-xl">
                <svg className="w-4 h-4 text-indigo-600 animate-spin flex-shrink-0" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" /></svg>
                <p className="text-sm text-indigo-700 font-medium">Spark is researching your world… this takes about 30 seconds.</p>
              </div>
            )}
            <LoadingSkeleton rows={4} />
          </div>
        )}

        {/* No session yet */}
        {!isLoading && !isRunning && !baseSession && view === "grid" && (
          <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
            <div className="w-14 h-14 bg-gradient-to-br from-violet-100 to-indigo-100 rounded-2xl flex items-center justify-center">
              <svg className="w-7 h-7 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">No research yet</h2>
              <p className="text-sm text-slate-500 mt-1 max-w-xs">Spark researches industry news, world events, and competitor moves — then surfaces content topics you can explore deeper.</p>
            </div>
            <button type="button" onClick={() => handleRefresh("auto_pulse")} disabled={triggerResearch.isPending} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-colors">
              Run Spark now
            </button>
          </div>
        )}

        {/* Failed */}
        {!isLoading && !isStale && baseSession?.status === "failed" && view === "grid" && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl space-y-2">
            <p className="text-sm font-semibold text-red-700">Research failed</p>
            <p className="text-xs text-red-600">{baseSession.error ?? "Unknown error"}</p>
            <button type="button" onClick={() => handleRefresh("auto_pulse")} className="text-xs font-semibold text-red-700 underline">Try again</button>
          </div>
        )}

        {/* ── GRID VIEW ── */}
        {!isLoading && !isRunning && baseSession?.status === "complete" && baseResult && view === "grid" && (
          <div className="space-y-8">

            {/* Summary */}
            {baseResult.summary && (
              <div className="p-4 bg-gradient-to-r from-indigo-50 to-violet-50 border border-indigo-100 rounded-xl">
                <p className="text-sm text-indigo-900">{baseResult.summary}</p>
              </div>
            )}

            {/* Competitors */}
            <CompetitorsEditor initial={org?.competitors ?? []} onSave={(list) => updateOrg.mutate({ competitors: list })} />

            {/* Topic cards */}
            {baseResult.topics && baseResult.topics.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Topics to explore</h2>
                  <p className="text-xs text-slate-400">Click any topic to research deeper</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {baseResult.topics.map((topic, i) => (
                    <TopicGridCard
                      key={i}
                      topic={topic}
                      onClick={() => handleTopicClick(topic)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Creative connections */}
            {baseResult.creative_connections && baseResult.creative_connections.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Creative connections</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {baseResult.creative_connections.map((item, i) => (
                    <div key={i} className="bg-white rounded-xl border border-slate-200 p-4 space-y-2">
                      <p className="text-sm font-semibold text-slate-900">{item.event}</p>
                      <p className="text-sm text-slate-600">{item.relevance}</p>
                      <div className="p-2.5 bg-violet-50 rounded-lg border border-violet-100">
                        <p className="text-xs font-medium text-violet-700 mb-1">Post idea</p>
                        <p className="text-sm text-violet-900">{item.post_idea}</p>
                      </div>
                      <p className="text-sm text-slate-500 italic pl-3 border-l-2 border-slate-200">"{item.hook}"</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Competitor pulse */}
            {baseResult.competitor_updates && baseResult.competitor_updates.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Competitor pulse</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {baseResult.competitor_updates.map((item, i) => (
                    <div key={i} className="bg-white rounded-xl border border-slate-200 p-4 space-y-2">
                      <p className="text-sm font-semibold text-slate-900">{item.name}</p>
                      <p className="text-sm text-slate-600">{item.update}</p>
                      <div className="p-2.5 bg-green-50 rounded-lg border border-green-100">
                        <p className="text-xs font-medium text-green-700 mb-0.5">Your angle</p>
                        <p className="text-sm text-green-800">{item.opportunity}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Campaign CTA */}
            {baseResult.recommended_campaign && (
              <div className="bg-gradient-to-br from-indigo-600 to-violet-600 rounded-2xl p-6 text-white space-y-3">
                <div>
                  <p className="text-xs font-semibold text-indigo-200 uppercase tracking-wider mb-1">Recommended campaign</p>
                  <h3 className="text-lg font-bold">{baseResult.recommended_campaign.name}</h3>
                  <p className="text-sm text-indigo-100 mt-1">{baseResult.recommended_campaign.topic}</p>
                </div>
                {baseResult.recommended_campaign.key_messages?.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {baseResult.recommended_campaign.key_messages.map((msg, i) => (
                      <span key={i} className="text-xs bg-white/20 text-white px-2.5 py-1 rounded-full">{msg}</span>
                    ))}
                  </div>
                )}
                <button type="button" onClick={handleCreateCampaign} disabled={briefLoading} className="flex items-center gap-2 mt-1 px-5 py-2.5 bg-white text-indigo-700 text-sm font-bold rounded-xl hover:bg-indigo-50 transition-colors disabled:opacity-70">
                  {briefLoading ? "Loading…" : "Create campaign →"}
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── DETAIL VIEW ── */}
        {view === "detail" && selectedTopic && deepDiveSessionId && (
          <DeepDiveDetail
            topic={selectedTopic}
            sessionId={deepDiveSessionId}
            onBack={handleBack}
            onCreateCampaign={handleCreateCampaign}
          />
        )}

      </div>

      {deepDiveOpen && (
        <DeepDiveModal onSubmit={handleRefresh} onClose={() => setDeepDiveOpen(false)} />
      )}
    </div>
  );
}
