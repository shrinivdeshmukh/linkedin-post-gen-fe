import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  useAnalyticsSummary,
  usePostsAnalytics,
  useFollowerHistory,
  useAnalyticsInsights,
  useTriggerAnalyticsSync,
  type PostAnalyticsItem,
} from "../../lib/api-hooks";

// ── KPI Card ──────────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  sub,
  positive,
}: {
  label: string;
  value: string | number;
  sub?: string;
  positive?: boolean;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5 flex flex-col gap-1">
      <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">{label}</span>
      <span className="text-3xl font-bold text-slate-800">{value}</span>
      {sub && (
        <span className={`text-xs font-medium ${positive === true ? "text-emerald-500" : positive === false ? "text-red-400" : "text-slate-400"}`}>
          {sub}
        </span>
      )}
    </div>
  );
}

// ── Overview Tab ──────────────────────────────────────────────────────────────

function OverviewTab() {
  const { data: summary, isLoading } = useAnalyticsSummary();
  const { data: posts } = usePostsAnalytics();
  const { data: followers } = useFollowerHistory(90);

  if (isLoading) return <div className="text-sm text-slate-400 py-12 text-center">Loading…</div>;
  if (!summary) return null;

  if (!summary.linkedin_connected) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
        <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center">
          <svg className="w-6 h-6 text-blue-500" fill="currentColor" viewBox="0 0 24 24">
            <path d="M19 3a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h14m-.5 15.5v-5.3a3.26 3.26 0 00-3.26-3.26c-.85 0-1.84.52-2.32 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 011.4 1.4v4.93h2.79M6.88 8.56a1.68 1.68 0 001.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 00-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
          </svg>
        </div>
        <p className="font-semibold text-slate-700">Connect LinkedIn to see analytics</p>
        <p className="text-sm text-slate-400 max-w-xs">
          Analytics are pulled from your LinkedIn account. Connect it in Settings → LinkedIn.
        </p>
      </div>
    );
  }

  // Post type performance for bar chart
  const typeMap: Record<string, { total_eng: number; count: number; total_imp: number }> = {};
  for (const p of posts ?? []) {
    const t = p.post_type;
    if (!typeMap[t]) typeMap[t] = { total_eng: 0, count: 0, total_imp: 0 };
    typeMap[t].total_eng += p.engagement_rate;
    typeMap[t].count += 1;
    typeMap[t].total_imp += p.impressions;
  }
  const typeData = Object.entries(typeMap).map(([type, v]) => ({
    type: type.charAt(0).toUpperCase() + type.slice(1),
    avg_engagement: parseFloat((v.total_eng / v.count).toFixed(2)),
    avg_impressions: Math.round(v.total_imp / v.count),
  }));

  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Total Impressions" value={summary.total_impressions.toLocaleString()} />
        <KpiCard label="Avg Engagement Rate" value={`${summary.avg_engagement_rate}%`} />
        <KpiCard
          label="Followers"
          value={summary.current_followers?.toLocaleString() ?? "—"}
          sub={
            summary.follower_growth_30d != null
              ? `${summary.follower_growth_30d >= 0 ? "+" : ""}${summary.follower_growth_30d} last 30 days`
              : undefined
          }
          positive={summary.follower_growth_30d != null ? summary.follower_growth_30d >= 0 : undefined}
        />
        <KpiCard
          label="Posts Tracked"
          value={summary.posts_with_analytics}
          sub={`of ${summary.posts_published} published`}
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Follower growth */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Follower Growth (90 days)</h3>
          {followers && followers.length > 1 ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={followers} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v) => v.slice(5)} />
                <YAxis tick={{ fontSize: 10 }} domain={["auto", "auto"]} />
                <Tooltip formatter={(v: number) => [v.toLocaleString(), "Followers"]} labelStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="follower_count" stroke="#6366f1" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-xs text-slate-400 py-8 text-center">Not enough data yet — sync to start tracking follower growth.</p>
          )}
        </div>

        {/* Engagement by post type */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Avg Engagement Rate by Post Type</h3>
          {typeData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={typeData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="type" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 10 }} unit="%" />
                <Tooltip formatter={(v: number) => [`${v}%`, "Engagement Rate"]} labelStyle={{ fontSize: 11 }} />
                <Bar dataKey="avg_engagement" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-xs text-slate-400 py-8 text-center">No post analytics data yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Posts Tab ─────────────────────────────────────────────────────────────────

type SortKey = "impressions" | "engagement_rate" | "reactions" | "published_at";

function PostsTab() {
  const { data: posts, isLoading } = usePostsAnalytics();
  const navigate = useNavigate();
  const [sort, setSort] = useState<SortKey>("impressions");

  if (isLoading) return <div className="text-sm text-slate-400 py-12 text-center">Loading…</div>;
  if (!posts?.length) return (
    <p className="text-sm text-slate-400 py-12 text-center">No post analytics yet. Publish a post and sync.</p>
  );

  const sorted = [...posts].sort((a, b) => {
    if (sort === "published_at") {
      return (b.published_at ?? "").localeCompare(a.published_at ?? "");
    }
    return (b[sort] as number) - (a[sort] as number);
  });

  const SortBtn = ({ k, label }: { k: SortKey; label: string }) => (
    <button
      onClick={() => setSort(k)}
      className={`text-xs font-medium px-2 py-1 rounded-lg transition-colors ${sort === k ? "bg-indigo-50 text-indigo-600" : "text-slate-400 hover:text-slate-600"}`}
    >
      {label}
    </button>
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1 flex-wrap">
        <span className="text-xs text-slate-400 mr-1">Sort by:</span>
        <SortBtn k="impressions" label="Impressions" />
        <SortBtn k="engagement_rate" label="Engagement" />
        <SortBtn k="reactions" label="Reactions" />
        <SortBtn k="published_at" label="Date" />
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Post</th>
              <th className="text-right px-3 py-3 text-xs font-semibold text-slate-500">Impressions</th>
              <th className="text-right px-3 py-3 text-xs font-semibold text-slate-500">Reactions</th>
              <th className="text-right px-3 py-3 text-xs font-semibold text-slate-500">Comments</th>
              <th className="text-right px-3 py-3 text-xs font-semibold text-slate-500">Eng %</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500">Published</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((p: PostAnalyticsItem) => (
              <tr
                key={p.post_id}
                onClick={() => navigate(`/composer/${p.post_id}`)}
                className="border-b border-slate-50 last:border-0 hover:bg-slate-50 cursor-pointer transition-colors"
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-500 capitalize">
                      {p.post_type}
                    </span>
                    <span className="text-slate-700 truncate max-w-[220px]">{p.title}</span>
                  </div>
                </td>
                <td className="px-3 py-3 text-right text-slate-700 font-medium">{p.impressions.toLocaleString()}</td>
                <td className="px-3 py-3 text-right text-slate-500">{p.reactions}</td>
                <td className="px-3 py-3 text-right text-slate-500">{p.comments}</td>
                <td className="px-3 py-3 text-right">
                  <span className={`font-semibold ${p.engagement_rate >= 2 ? "text-emerald-600" : p.engagement_rate >= 1 ? "text-amber-500" : "text-slate-400"}`}>
                    {p.engagement_rate}%
                  </span>
                </td>
                <td className="px-4 py-3 text-right text-slate-400 text-xs">
                  {p.published_at ? new Date(p.published_at).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Followers Tab ─────────────────────────────────────────────────────────────

function FollowersTab() {
  const [days, setDays] = useState(90);
  const { data: followers, isLoading } = useFollowerHistory(days);
  const { data: summary } = useAnalyticsSummary();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {[30, 60, 90].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors ${days === d ? "bg-indigo-600 text-white border-indigo-600" : "border-slate-200 text-slate-500 hover:border-indigo-300"}`}
            >
              {d}d
            </button>
          ))}
        </div>
        {summary?.current_followers != null && (
          <div className="text-right">
            <span className="text-2xl font-bold text-slate-800">{summary.current_followers.toLocaleString()}</span>
            <span className="text-xs text-slate-400 ml-1">followers now</span>
            {summary.follower_growth_30d != null && (
              <div className={`text-xs font-medium ${summary.follower_growth_30d >= 0 ? "text-emerald-500" : "text-red-400"}`}>
                {summary.follower_growth_30d >= 0 ? "+" : ""}{summary.follower_growth_30d} last 30 days
              </div>
            )}
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 p-5">
        {isLoading ? (
          <div className="h-64 flex items-center justify-center text-sm text-slate-400">Loading…</div>
        ) : followers && followers.length > 1 ? (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={followers} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v) => v.slice(5)} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 10 }} domain={["auto", "auto"]} />
              <Tooltip formatter={(v: number) => [v.toLocaleString(), "Followers"]} labelStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="follower_count" stroke="#6366f1" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-64 flex flex-col items-center justify-center gap-2 text-center">
            <p className="text-sm text-slate-400">No follower history yet.</p>
            <p className="text-xs text-slate-300">Run a sync to start capturing daily snapshots.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Insights Tab ──────────────────────────────────────────────────────────────

function InsightsTab() {
  const { data: insights, isLoading, refetch } = useAnalyticsInsights();
  const syncMutation = useTriggerAnalyticsSync();

  async function handleRefresh() {
    await syncMutation.mutateAsync();
    await refetch();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">AI-generated insights based on your post performance data.</p>
        <button
          onClick={handleRefresh}
          disabled={syncMutation.isPending || isLoading}
          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600 hover:border-indigo-300 hover:text-indigo-600 disabled:opacity-50 transition-colors"
        >
          <svg className={`w-3.5 h-3.5 ${syncMutation.isPending ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {syncMutation.isPending ? "Syncing…" : "Sync & refresh"}
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 bg-slate-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {(insights ?? []).map((insight, i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-100 p-4 flex gap-3 items-start">
              <div className="w-7 h-7 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg className="w-3.5 h-3.5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <p className="text-sm text-slate-700 leading-relaxed">{insight}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

type Tab = "overview" | "posts" | "followers" | "insights";

export default function AnalyticsPage() {
  const [tab, setTab] = useState<Tab>("overview");
  const syncMutation = useTriggerAnalyticsSync();

  const tabs: { key: Tab; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "posts", label: "Posts" },
    { key: "followers", label: "Followers" },
    { key: "insights", label: "AI Insights" },
  ];

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Analytics</h1>
          <p className="text-sm text-slate-400 mt-0.5">LinkedIn performance data for your account</p>
        </div>
        <button
          onClick={() => syncMutation.mutate()}
          disabled={syncMutation.isPending}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          <svg className={`w-4 h-4 ${syncMutation.isPending ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {syncMutation.isPending ? "Syncing…" : "Sync now"}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${tab === t.key ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "overview" && <OverviewTab />}
      {tab === "posts" && <PostsTab />}
      {tab === "followers" && <FollowersTab />}
      {tab === "insights" && <InsightsTab />}
    </div>
  );
}
