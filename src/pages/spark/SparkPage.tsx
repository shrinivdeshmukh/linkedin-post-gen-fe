import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  useLatestResearch,
  useTriggerResearch,
  useGetResearchBrief,
  useOrgProfile,
  useUpdateOrgSettings,
  type ResearchSession,
} from "../../lib/api-hooks";

// ── Sub-components ────────────────────────────────────────────────────────────

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

function TopicCard({ topic }: { topic: { title: string; summary: string; angle: string; urgency: string; sources?: { title: string; url: string }[] } }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-900 leading-snug">{topic.title}</h3>
        <UrgencyBadge urgency={topic.urgency} />
      </div>
      <p className="text-sm text-slate-600">{topic.summary}</p>
      <div className="p-3 bg-indigo-50 rounded-lg border border-indigo-100">
        <p className="text-xs font-medium text-indigo-700 mb-1">Content angle</p>
        <p className="text-sm text-indigo-800">{topic.angle}</p>
      </div>
      {topic.sources && topic.sources.length > 0 && (
        <div>
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
          >
            {expanded ? "Hide" : "Show"} {topic.sources.length} source{topic.sources.length !== 1 ? "s" : ""}
          </button>
          {expanded && (
            <ul className="mt-2 space-y-1">
              {topic.sources.map((s, i) => (
                <li key={i}>
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-indigo-600 hover:underline truncate block"
                  >
                    {s.title || s.url}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function ConnectionCard({ item }: { item: { event: string; relevance: string; post_idea: string; hook: string } }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
      <div className="flex items-start gap-2">
        <div className="flex-shrink-0 w-1.5 h-full">
          <div className="w-1.5 h-1.5 bg-violet-400 rounded-full mt-1.5" />
        </div>
        <div className="space-y-1">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">World event</p>
          <p className="text-sm font-medium text-slate-900">{item.event}</p>
        </div>
      </div>
      <div className="ml-3.5 space-y-2">
        <p className="text-sm text-slate-600">{item.relevance}</p>
        <div className="p-3 bg-violet-50 rounded-lg border border-violet-100">
          <p className="text-xs font-medium text-violet-700 mb-1">Post idea</p>
          <p className="text-sm text-violet-900">{item.post_idea}</p>
        </div>
        <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
          <p className="text-xs font-medium text-slate-500 mb-1">Hook</p>
          <p className="text-sm text-slate-800 italic">"{item.hook}"</p>
        </div>
      </div>
    </div>
  );
}

function CompetitorCard({ item }: { item: { name: string; update: string; opportunity: string } }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-2">
      <p className="text-sm font-semibold text-slate-900">{item.name}</p>
      <p className="text-sm text-slate-600">{item.update}</p>
      <div className="p-2.5 bg-green-50 rounded-lg border border-green-100">
        <p className="text-xs font-medium text-green-700 mb-0.5">Your angle</p>
        <p className="text-sm text-green-800">{item.opportunity}</p>
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-5 w-48 bg-slate-200 rounded-lg" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-36 bg-slate-100 rounded-xl" />
        ))}
      </div>
      <div className="h-5 w-48 bg-slate-200 rounded-lg mt-6" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1, 2].map((i) => (
          <div key={i} className="h-48 bg-slate-100 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

// ── Competitors Editor ─────────────────────────────────────────────────────────

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
    if (trimmed && !items.includes(trimmed)) {
      const next = [...items, trimmed];
      setItems(next);
    }
    setDraft("");
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold text-slate-700">Competitors to track</p>
        {!editing ? (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-xs text-indigo-600 hover:text-indigo-700 font-medium"
          >
            Edit
          </button>
        ) : (
          <button
            type="button"
            onClick={() => { onSave(items); setEditing(false); }}
            className="text-xs text-green-600 hover:text-green-700 font-semibold"
          >
            Save
          </button>
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
              <button
                type="button"
                onClick={() => setItems(items.filter((_, j) => j !== i))}
                className="text-slate-400 hover:text-slate-600 ml-0.5"
              >
                ×
              </button>
            )}
          </span>
        ))}
        {editing && (
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); add(); }
            }}
            onBlur={add}
            placeholder="Add competitor…"
            className="text-xs px-2.5 py-1 border border-slate-300 rounded-full outline-none focus:border-indigo-400 min-w-[120px]"
          />
        )}
      </div>
    </div>
  );
}

// ── DeepDive Modal ─────────────────────────────────────────────────────────────

function DeepDiveModal({
  onSubmit,
  onClose,
}: {
  onSubmit: (mode: string, topic?: string, url?: string) => void;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<"topic" | "url">("topic");
  const [topic, setTopic] = useState("");
  const [url, setUrl] = useState("");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="px-6 py-5 border-b border-slate-100">
          <h2 className="text-base font-bold text-slate-900">Deep research</h2>
          <p className="text-sm text-slate-500 mt-0.5">Ask a question or analyse a URL for content ideas.</p>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setTab("topic")}
              className={`flex-1 py-2 text-sm font-medium rounded-xl transition-colors ${tab === "topic" ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
            >
              Research a topic
            </button>
            <button
              type="button"
              onClick={() => setTab("url")}
              className={`flex-1 py-2 text-sm font-medium rounded-xl transition-colors ${tab === "url" ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
            >
              Analyse a URL
            </button>
          </div>
          {tab === "topic" ? (
            <textarea
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. How will the new tariff policies affect hiring in tech?"
              rows={3}
              className="w-full text-sm border border-slate-300 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 resize-none placeholder:text-slate-400"
            />
          ) : (
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/article"
              className="w-full text-sm border border-slate-300 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-400"
            />
          )}
        </div>
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex gap-3">
          <button
            type="button"
            onClick={() => {
              if (tab === "topic" && topic.trim()) onSubmit("deep_dive", topic.trim());
              if (tab === "url" && url.trim()) onSubmit("url_analysis", undefined, url.trim());
            }}
            disabled={(tab === "topic" && !topic.trim()) || (tab === "url" && !url.trim())}
            className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors"
          >
            Run research
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 border border-slate-200 text-slate-600 text-sm font-medium rounded-xl hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function SparkPage() {
  const navigate = useNavigate();
  const { data: session, isLoading, refetch } = useLatestResearch();
  const triggerResearch = useTriggerResearch();
  const getResearchBrief = useGetResearchBrief();
  const { data: org } = useOrgProfile();
  const updateOrg = useUpdateOrgSettings();

  const [deepDiveOpen, setDeepDiveOpen] = useState(false);
  const [briefLoading, setBriefLoading] = useState(false);

  // Poll while research is in progress
  useEffect(() => {
    if (session?.status === "pending" || session?.status === "running") {
      const timer = setInterval(() => refetch(), 3000);
      return () => clearInterval(timer);
    }
  }, [session?.status, refetch]);

  const isRunning = session?.status === "pending" || session?.status === "running";
  const result = session?.result;

  async function handleTrigger(mode = "auto_pulse", topic?: string, url?: string) {
    setDeepDiveOpen(false);
    try {
      await triggerResearch.mutateAsync({ mode, topic, url });
      setTimeout(() => refetch(), 1000);
    } catch {
      // error shown in UI via triggerResearch.error
    }
  }

  async function handleCreateCampaign() {
    setBriefLoading(true);
    try {
      const brief = await getResearchBrief.mutateAsync();
      navigate("/campaigns/new", { state: { prefill: brief } });
    } catch {
      // fall back to empty campaign
      navigate("/campaigns/new");
    } finally {
      setBriefLoading(false);
    }
  }

  function handleSaveCompetitors(list: string[]) {
    updateOrg.mutate({ competitors: list });
  }

  const lastUpdated = session?.completed_at
    ? new Date(session.completed_at).toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8">

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
            <button
              type="button"
              onClick={() => setDeepDiveOpen(true)}
              disabled={isRunning || triggerResearch.isPending}
              className="px-3.5 py-2 text-sm font-medium border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 disabled:opacity-50 transition-colors"
            >
              Deep research
            </button>
            <button
              type="button"
              onClick={() => handleTrigger("auto_pulse")}
              disabled={isRunning || triggerResearch.isPending}
              className="flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl transition-colors"
            >
              {isRunning ? (
                <>
                  <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Running…
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
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

        {/* Loading state */}
        {(isLoading || isRunning) && (
          <div>
            {isRunning && (
              <div className="flex items-center gap-2 p-4 bg-indigo-50 border border-indigo-100 rounded-xl mb-4">
                <svg className="w-4 h-4 text-indigo-600 animate-spin flex-shrink-0" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                <p className="text-sm text-indigo-700 font-medium">
                  Spark is researching your world… this takes about 30 seconds.
                </p>
              </div>
            )}
            <LoadingSkeleton />
          </div>
        )}

        {/* No session yet */}
        {!isLoading && !isRunning && !session && (
          <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
            <div className="w-14 h-14 bg-gradient-to-br from-violet-100 to-indigo-100 rounded-2xl flex items-center justify-center">
              <svg className="w-7 h-7 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">No research yet</h2>
              <p className="text-sm text-slate-500 mt-1 max-w-xs">
                Spark researches industry news, world events, and competitor moves — then surfaces content ideas tailored to your voice.
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleTrigger("auto_pulse")}
              disabled={triggerResearch.isPending}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-colors"
            >
              Run Spark now
            </button>
          </div>
        )}

        {/* Failed session */}
        {!isLoading && session?.status === "failed" && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl space-y-2">
            <p className="text-sm font-semibold text-red-700">Research failed</p>
            <p className="text-xs text-red-600">{session.error ?? "Unknown error"}</p>
            <button
              type="button"
              onClick={() => handleTrigger("auto_pulse")}
              className="text-xs font-semibold text-red-700 underline"
            >
              Try again
            </button>
          </div>
        )}

        {/* Results */}
        {!isLoading && !isRunning && session?.status === "complete" && result && (
          <div className="space-y-8">

            {/* Summary */}
            {result.summary && (
              <div className="p-4 bg-gradient-to-r from-indigo-50 to-violet-50 border border-indigo-100 rounded-xl">
                <p className="text-sm text-indigo-900">{result.summary}</p>
              </div>
            )}

            {/* Competitors editor */}
            <CompetitorsEditor
              initial={org?.competitors ?? []}
              onSave={handleSaveCompetitors}
            />

            {/* Content opportunities */}
            {result.topics?.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Content opportunities</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {result.topics.map((topic: Parameters<typeof TopicCard>[0]["topic"], i: number) => (
                    <TopicCard key={i} topic={topic} />
                  ))}
                </div>
              </div>
            )}

            {/* Creative connections */}
            {result.creative_connections?.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Creative connections</h2>
                  <span className="text-xs text-slate-400 font-normal normal-case tracking-normal">World events → your content</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {result.creative_connections.map((item: Parameters<typeof ConnectionCard>[0]["item"], i: number) => (
                    <ConnectionCard key={i} item={item} />
                  ))}
                </div>
              </div>
            )}

            {/* Competitor updates */}
            {result.competitor_updates?.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Competitor pulse</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {result.competitor_updates.map((item: Parameters<typeof CompetitorCard>[0]["item"], i: number) => (
                    <CompetitorCard key={i} item={item} />
                  ))}
                </div>
              </div>
            )}

            {/* Campaign CTA */}
            {result.recommended_campaign && (
              <div className="bg-gradient-to-br from-indigo-600 to-violet-600 rounded-2xl p-6 text-white space-y-3">
                <div>
                  <p className="text-xs font-semibold text-indigo-200 uppercase tracking-wider mb-1">Recommended campaign</p>
                  <h3 className="text-lg font-bold">{result.recommended_campaign.name}</h3>
                  <p className="text-sm text-indigo-100 mt-1">{result.recommended_campaign.topic}</p>
                </div>
                {result.recommended_campaign.key_messages?.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {result.recommended_campaign.key_messages.map((msg: string, i: number) => (
                      <span key={i} className="text-xs bg-white/20 text-white px-2.5 py-1 rounded-full">
                        {msg}
                      </span>
                    ))}
                  </div>
                )}
                <button
                  type="button"
                  onClick={handleCreateCampaign}
                  disabled={briefLoading}
                  className="flex items-center gap-2 mt-2 px-5 py-2.5 bg-white text-indigo-700 text-sm font-bold rounded-xl hover:bg-indigo-50 transition-colors disabled:opacity-70"
                >
                  {briefLoading ? "Loading…" : "Create campaign →"}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {deepDiveOpen && (
        <DeepDiveModal
          onSubmit={handleTrigger}
          onClose={() => setDeepDiveOpen(false)}
        />
      )}
    </div>
  );
}
