import { useNavigate, useParams } from "react-router-dom";
import { useResearchSession } from "../../lib/api-hooks";

// ── Types ──────────────────────────────────────────────────────────────────────

interface ResearchTopic {
  title: string;
  summary: string;
  angle: string;
  urgency: "high" | "medium" | "low";
  why_now?: string;
  sources?: { title: string; url: string; snippet?: string }[];
}

interface CreativeConnection {
  event: string;
  relevance: string;
  post_idea: string;
  hook: string;
}

interface RecommendedCampaign {
  name: string;
  topic: string;
  target_outcome: string;
  key_messages: string[];
}

interface DeepDiveResult {
  summary?: string;
  daily_pick?: { topic_index: number; why_now: string; hook: string };
  topics?: ResearchTopic[];
  creative_connections?: CreativeConnection[];
  recommended_campaign?: RecommendedCampaign;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const URGENCY_DOT: Record<string, string> = {
  high: "bg-indigo-500",
  medium: "bg-indigo-300",
  low: "bg-indigo-200",
};

// ── Page ───────────────────────────────────────────────────────────────────────

export default function DeepResearchPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { data: session } = useResearchSession(sessionId ?? null);

  const isRunning = session?.status === "pending" || session?.status === "running";
  const isFailed = session?.status === "failed";
  const result = session?.result as DeepDiveResult | null | undefined;
  const topics = result?.topics ?? [];
  const dailyPickIdx = result?.daily_pick?.topic_index ?? 0;

  function handleWritePost(title: string, context: string) {
    navigate("/studio", { state: { spark: { topic: title, rawContext: context } } });
  }

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/spark")}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Deep Research</p>
            <h1 className="text-lg font-bold text-slate-900 leading-tight">{session?.topic ?? "Research"}</h1>
          </div>
        </div>

        {/* Loading */}
        {isRunning && (
          <div className="bg-white border border-slate-100 rounded-2xl p-8 flex flex-col items-center gap-4 text-center">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
              <svg className="w-5 h-5 text-indigo-500 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">Researching…</p>
              <p className="text-xs text-slate-400 mt-1">Running deep research on "{session?.topic}". This takes about 30–60 seconds.</p>
            </div>
          </div>
        )}

        {/* Failed */}
        {isFailed && (
          <div className="bg-red-50 border border-red-100 rounded-2xl p-6 text-sm text-red-600 text-center">
            Research failed: {session?.error ?? "Unknown error"}
          </div>
        )}

        {/* Results */}
        {!isRunning && result && (
          <>
            {/* Summary banner */}
            {result.summary && (
              <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-2xl p-5">
                <p className="text-xs font-bold text-white/60 uppercase tracking-wider mb-2">Research Summary</p>
                <p className="text-sm text-white/90 leading-relaxed">{result.summary}</p>
              </div>
            )}

            {/* Daily pick highlight */}
            {result.daily_pick && topics[dailyPickIdx] && (
              <div className="bg-white border-2 border-indigo-200 rounded-2xl p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-lg bg-indigo-50 flex items-center justify-center">
                    <svg className="w-3 h-3 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <p className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Top Pick</p>
                </div>
                <p className="text-sm font-semibold text-slate-900">{topics[dailyPickIdx].title}</p>
                <p className="text-xs text-indigo-600 font-medium">{result.daily_pick.why_now}</p>
                {result.daily_pick.hook && (
                  <p className="text-xs text-slate-400 italic">"{result.daily_pick.hook}"</p>
                )}
                <button
                  onClick={() => handleWritePost(topics[dailyPickIdx].title, `${result.daily_pick!.hook}\n\n${topics[dailyPickIdx].angle}`)}
                  className="mt-1 flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors"
                >
                  Write post →
                </button>
              </div>
            )}

            {/* All topics */}
            {topics.length > 0 && (
              <section className="space-y-3">
                <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1">Content Opportunities</h2>
                {topics.map((topic, i) => (
                  <div key={i} className="bg-white border border-slate-100 rounded-2xl p-4 space-y-2.5">
                    <div className="flex items-start gap-2.5">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${URGENCY_DOT[topic.urgency] ?? URGENCY_DOT.low}`} />
                      <p className="text-sm font-semibold text-slate-900 leading-snug flex-1">{topic.title}</p>
                      {i === dailyPickIdx && (
                        <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-full flex-shrink-0">Top pick</span>
                      )}
                    </div>
                    <p className="text-sm text-slate-500 leading-relaxed pl-4">{topic.summary}</p>
                    {topic.angle && (
                      <p className="text-xs bg-slate-50 text-slate-600 rounded-xl px-3 py-2 leading-relaxed">{topic.angle}</p>
                    )}
                    {topic.why_now && (
                      <p className="text-xs text-indigo-500 font-medium pl-4">{topic.why_now}</p>
                    )}
                    {topic.sources && topic.sources.length > 0 && (
                      <div className="flex gap-1.5 flex-wrap pl-4">
                        {topic.sources.slice(0, 3).map((s, j) => (
                          <a
                            key={j}
                            href={s.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] text-slate-400 hover:text-indigo-600 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-full truncate max-w-[180px] transition-colors"
                          >
                            {s.title || s.url}
                          </a>
                        ))}
                      </div>
                    )}
                    <div className="pl-4">
                      <button
                        onClick={() => handleWritePost(topic.title, `${topic.angle}\n\n${topic.summary}`)}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors"
                      >
                        Write post →
                      </button>
                    </div>
                  </div>
                ))}
              </section>
            )}

            {/* Creative connections */}
            {result.creative_connections && result.creative_connections.length > 0 && (
              <section className="space-y-3">
                <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1">Creative Angles</h2>
                {result.creative_connections.map((cc, i) => (
                  <div key={i} className="bg-white border border-slate-100 rounded-2xl p-4 space-y-2">
                    <p className="text-sm font-semibold text-slate-900">{cc.event}</p>
                    <p className="text-xs text-slate-500 leading-relaxed">{cc.relevance}</p>
                    {cc.post_idea && (
                      <p className="text-xs bg-violet-50 text-violet-700 rounded-xl px-3 py-2 leading-relaxed">{cc.post_idea}</p>
                    )}
                    {cc.hook && (
                      <p className="text-xs text-slate-400 italic pl-1">"{cc.hook}"</p>
                    )}
                    <button
                      onClick={() => handleWritePost(cc.event, `${cc.post_idea}\n\n${cc.hook}`)}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-violet-50 text-violet-600 hover:bg-violet-100 transition-colors"
                    >
                      Write post →
                    </button>
                  </div>
                ))}
              </section>
            )}

            {/* Recommended campaign */}
            {result.recommended_campaign && (
              <section className="space-y-3">
                <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1">Recommended Campaign</h2>
                <div className="bg-white border border-slate-100 rounded-2xl p-4 space-y-3">
                  <div>
                    <p className="text-sm font-bold text-slate-900">{result.recommended_campaign.name}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{result.recommended_campaign.target_outcome}</p>
                  </div>
                  {result.recommended_campaign.key_messages?.length > 0 && (
                    <ul className="space-y-1.5 pl-1">
                      {result.recommended_campaign.key_messages.map((msg, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-slate-600">
                          <span className="w-1 h-1 rounded-full bg-indigo-400 flex-shrink-0 mt-1.5" />
                          {msg}
                        </li>
                      ))}
                    </ul>
                  )}
                  <button
                    onClick={() => navigate("/campaigns/new", { state: { prefill: result.recommended_campaign } })}
                    className="w-full mt-1 py-2 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-colors"
                  >
                    Build this campaign →
                  </button>
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}
