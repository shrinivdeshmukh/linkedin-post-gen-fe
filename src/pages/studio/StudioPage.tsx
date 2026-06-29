import { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import ComposerPage from "../composer/ComposerPage";
import NewCampaignPage from "../campaigns/NewCampaignPage";
import PodcastPage from "../podcast/PodcastPage";
import { useLatestResearch, useGetResearchBrief } from "../../lib/api-hooks";

type Tab = "post" | "campaign" | "podcast";

interface SparkTopic {
  title: string;
  summary: string;
  angle: string;
  urgency: string;
}
interface SparkConnection {
  event: string;
  post_idea: string;
  hook: string;
}
interface SparkResult {
  summary?: string;
  daily_pick?: { topic_index: number; why_now: string; hook: string };
  topics?: SparkTopic[];
  creative_connections?: SparkConnection[];
  recommended_campaign?: { name: string; topic: string; key_messages: string[] };
}

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  {
    id: "post",
    label: "Post",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
      </svg>
    ),
  },
  {
    id: "campaign",
    label: "Campaign",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
    ),
  },
  {
    id: "podcast",
    label: "Podcast",
    icon: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
      </svg>
    ),
  },
];

// ── Spark research panel ───────────────────────────────────────────────────────

function SparkPanel({ onUsePost, onUseCampaign }: {
  onUsePost: (topic: string, rawContext: string) => void;
  onUseCampaign: (prefill: object) => void;
}) {
  const { data: session, isLoading } = useLatestResearch("auto_pulse");
  const getResearchBrief = useGetResearchBrief();
  const result = session?.result as SparkResult | null | undefined;
  const isRunning = session?.status === "pending" || session?.status === "running";

  const lastUpdated = session?.completed_at
    ? new Date(session.completed_at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
    : null;

  async function handleCampaignFromRecommended() {
    try {
      const brief = await getResearchBrief.mutateAsync();
      onUseCampaign(brief);
    } catch {
      if (result?.recommended_campaign) {
        onUseCampaign({ topic: result.recommended_campaign.topic, name: result.recommended_campaign.name });
      }
    }
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Panel header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-md flex items-center justify-center flex-shrink-0">
            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">Spark</span>
        </div>
        {lastUpdated && (
          <span className="text-[10px] text-slate-400">{lastUpdated}</span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">

        {/* Loading */}
        {(isLoading || isRunning) && (
          <div className="space-y-2">
            {[1, 2, 3].map(i => <div key={i} className="h-20 skeleton rounded-xl" />)}
          </div>
        )}

        {/* No research yet */}
        {!isLoading && !isRunning && !session && (
          <div className="flex flex-col items-center justify-center py-8 text-center gap-2">
            <svg className="w-8 h-8 text-slate-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <p className="text-xs text-slate-400">No research yet.</p>
            <a href="/spark" className="text-xs text-indigo-600 font-medium hover:underline">Run Spark →</a>
          </div>
        )}

        {/* Daily pick */}
        {result?.daily_pick && result.topics?.[result.daily_pick.topic_index] && (() => {
          const pick = result.daily_pick!;
          const t = result.topics![pick.topic_index];
          return (
            <div className="bg-gradient-to-br from-violet-600 to-indigo-600 rounded-xl p-3 space-y-2">
              <div className="flex items-center gap-1.5">
                <svg className="w-3 h-3 text-yellow-300 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
                <span className="text-[10px] font-bold text-white/80 uppercase tracking-wider">Post this today</span>
              </div>
              <p className="text-xs font-semibold text-white leading-snug">{t.title}</p>
              <p className="text-[11px] text-indigo-200 line-clamp-2">{pick.why_now}</p>
              <button
                onClick={() => onUsePost(t.title, `${pick.hook}\n\n${t.angle}`)}
                className="w-full py-1.5 text-xs font-bold bg-white text-indigo-700 rounded-lg hover:bg-indigo-50 transition-colors"
              >
                Write this post →
              </button>
            </div>
          );
        })()}

        {/* Topics */}
        {result?.topics && result.topics.length > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">Topics</p>
            {result.topics.map((t, i) => {
              const dot = t.urgency === "high" ? "bg-red-400" : t.urgency === "medium" ? "bg-amber-400" : "bg-slate-300";
              return (
                <div key={i} className="bg-white border border-slate-100 rounded-xl p-3 space-y-2 hover:border-indigo-200 transition-colors">
                  <div className="flex items-start gap-2">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-1 ${dot}`} />
                    <p className="text-xs font-semibold text-slate-800 leading-snug">{t.title}</p>
                  </div>
                  <p className="text-[11px] text-slate-500 line-clamp-2 pl-4">{t.summary}</p>
                  <div className="flex gap-1.5 pl-4">
                    <button
                      onClick={() => onUsePost(t.title, t.angle)}
                      className="flex-1 py-1 text-[11px] font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
                    >
                      Post →
                    </button>
                    <button
                      onClick={() => onUseCampaign({ topic: t.title, name: `${t.title} Campaign` })}
                      className="flex-1 py-1 text-[11px] font-semibold text-violet-600 bg-violet-50 hover:bg-violet-100 rounded-lg transition-colors"
                    >
                      Campaign →
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Creative connections */}
        {result?.creative_connections && result.creative_connections.length > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">Creative connections</p>
            {result.creative_connections.map((c, i) => (
              <div key={i} className="bg-white border border-slate-100 rounded-xl p-3 space-y-2 hover:border-violet-200 transition-colors">
                <p className="text-xs font-semibold text-slate-800 leading-snug">{c.event}</p>
                <p className="text-[11px] text-slate-500 line-clamp-2 italic">"{c.hook}"</p>
                <button
                  onClick={() => onUsePost(c.event, `${c.hook}\n\n${c.post_idea}`)}
                  className="w-full py-1 text-[11px] font-semibold text-violet-600 bg-violet-50 hover:bg-violet-100 rounded-lg transition-colors"
                >
                  Write post →
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Recommended campaign */}
        {result?.recommended_campaign && (
          <div className="space-y-2">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">Recommended campaign</p>
            <div className="bg-gradient-to-br from-indigo-50 to-violet-50 border border-indigo-100 rounded-xl p-3 space-y-2">
              <p className="text-xs font-bold text-indigo-900">{result.recommended_campaign.name}</p>
              <p className="text-[11px] text-indigo-700 line-clamp-2">{result.recommended_campaign.topic}</p>
              <button
                onClick={handleCampaignFromRecommended}
                disabled={getResearchBrief.isPending}
                className="w-full py-1.5 text-[11px] font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors disabled:opacity-50"
              >
                {getResearchBrief.isPending ? "Loading…" : "Start campaign →"}
              </button>
            </div>
          </div>
        )}

        {/* Full Spark link */}
        {result && (
          <a
            href="/spark"
            className="flex items-center justify-center gap-1 py-2 text-xs text-slate-400 hover:text-indigo-600 transition-colors"
          >
            Open full Spark
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        )}
      </div>
    </div>
  );
}

// ── Studio page ────────────────────────────────────────────────────────────────

export default function StudioPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const tab = (searchParams.get("tab") as Tab) ?? "post";
  const [sparkOpen, setSparkOpen] = useState(true);
  const [composerKey, setComposerKey] = useState(0);
  const [campaignKey, setCampaignKey] = useState(0);

  function usePost(topic: string, rawContext: string) {
    navigate("/studio?tab=post", { state: { spark: { topic, rawContext } } });
    setComposerKey((k) => k + 1);
  }

  function useCampaign(prefill: object) {
    navigate("/studio?tab=campaign", { state: { prefill } });
    setCampaignKey((k) => k + 1);
  }

  return (
    <div className="h-full flex flex-col bg-slate-50">
      {/* Tab bar */}
      <div className="flex-shrink-0 bg-white border-b border-slate-100 px-5 flex items-center justify-between">
        <div className="flex items-center gap-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setSearchParams({ tab: t.id })}
              className={`flex items-center gap-2 px-4 py-3.5 text-sm font-medium border-b-2 transition-colors ${
                tab === t.id
                  ? "border-indigo-600 text-indigo-700"
                  : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-200"
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        {/* Spark toggle */}
        <button
          onClick={() => setSparkOpen((o) => !o)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors mr-1 ${
            sparkOpen
              ? "bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
              : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
          }`}
          title={sparkOpen ? "Hide Spark panel" : "Show Spark research"}
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          Spark
        </button>
      </div>

      {/* Body: main content + optional spark panel */}
      <div className="flex-1 overflow-hidden flex">
        {/* Tab content */}
        <div className={`flex-1 overflow-hidden transition-all ${sparkOpen ? "min-w-0" : ""}`}>
          {tab === "post"     && <ComposerPage key={composerKey} />}
          {tab === "campaign" && <NewCampaignPage key={campaignKey} />}
          {tab === "podcast"  && <PodcastPage />}
        </div>

        {/* Spark panel */}
        {sparkOpen && (
          <div className="hidden lg:flex flex-col w-72 flex-shrink-0 border-l border-slate-200 bg-white overflow-hidden">
            <SparkPanel onUsePost={usePost} onUseCampaign={useCampaign} />
          </div>
        )}
      </div>
    </div>
  );
}
