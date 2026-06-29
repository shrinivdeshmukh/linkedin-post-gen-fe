import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMe, usePosts, useDeletePost, useSchedulePost, useAchievements, useStreak, useCampaigns, type PostStatus } from "../../lib/api-hooks";
import { StatCard } from "../../components/dashboard/StatCard";
import { PostRow } from "../../components/dashboard/PostRow";
import { EmptyState } from "../../components/dashboard/EmptyState";
import { Button } from "../../components/ui/Button";

const userTz = Intl.DateTimeFormat().resolvedOptions().timeZone;

function localMinDatetime() {
  const d = new Date(Date.now() + 2 * 60 * 1000); // now + 2 min
  const off = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - off).toISOString().slice(0, 16);
}

function formatPreview(localDatetimeValue: string) {
  if (!localDatetimeValue) return "";
  const d = new Date(localDatetimeValue);
  return d.toLocaleString(undefined, {
    weekday: "short", day: "numeric", month: "short", year: "numeric",
    hour: "numeric", minute: "2-digit", timeZoneName: "short",
  });
}

type FilterTab = PostStatus | "all";

const TABS: { key: FilterTab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "draft", label: "Drafts" },
  { key: "pending_approval", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "scheduled", label: "Scheduled" },
  { key: "published", label: "Published" },
  { key: "rejected", label: "Rejected" },
];

function greeting(name?: string) {
  const hour = new Date().getHours();
  const time = hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";
  return `Good ${time}${name ? `, ${name.split(" ")[0]}` : ""}`;
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const { data: me } = useMe();
  const { data: posts = [], isLoading } = usePosts();
  const deletePost = useDeletePost();
  const schedulePost = useSchedulePost();
  const { data: achievements = [] } = useAchievements();
  const { data: streak } = useStreak();
  const { data: campaigns = [] } = useCampaigns();
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [page, setPage] = useState(1);
  const [copied, setCopied] = useState(false);
  const [schedulingPostId, setSchedulingPostId] = useState<string | null>(null);

  const PAGE_SIZE = 10;
  const [scheduleValue, setScheduleValue] = useState("");
  const [scheduleError, setScheduleError] = useState("");

  // Compute stats
  const stats = {
    total: posts.length,
    published: posts.filter((p) => p.status === "published").length,
    pending: posts.filter((p) => p.status === "pending_approval").length,
    scheduled: posts.filter((p) => p.status === "scheduled").length,
  };

  // Next Action derivation — priority order
  const pendingCount = stats.pending;
  const campaignNeedingReview = campaigns.find(
    (c) => c.status === "ready_for_review" || (c.status === "active" && (c.campaign_posts ?? []).some((cp) => cp.post.status === "pending_approval"))
  ) ?? null;
  const lastPublished = posts
    .filter((p) => p.status === "published" && p.published_at)
    .sort((a, b) => new Date(b.published_at!).getTime() - new Date(a.published_at!).getTime())[0] ?? null;
  const daysSinceLast = lastPublished
    ? Math.floor((Date.now() - new Date(lastPublished.published_at!).getTime()) / 86_400_000)
    : null;

  type NextAction = { icon: React.ReactNode; headline: string; sub: string; cta: string; onClick: () => void; accent: string };
  const nextAction: NextAction = (() => {
    if (pendingCount > 0) return {
      icon: <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />,
      headline: `${pendingCount} post${pendingCount > 1 ? "s" : ""} waiting for your approval`,
      sub: "Review and approve before they can be scheduled or published.",
      cta: "Review now",
      onClick: () => navigate("/approvals"),
      accent: "amber",
    };
    if (campaignNeedingReview) return {
      icon: <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />,
      headline: `"${campaignNeedingReview.name}" is ready for review`,
      sub: "Your campaign posts are generated and waiting for your sign-off.",
      cta: "Open campaign",
      onClick: () => navigate(`/campaigns/${campaignNeedingReview.id}`),
      accent: "violet",
    };
    if (daysSinceLast !== null && daysSinceLast >= 5) return {
      icon: <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />,
      headline: `You haven't posted in ${daysSinceLast} days`,
      sub: "Consistency builds an audience. Share something today — even a short take.",
      cta: "Write a post",
      onClick: () => navigate("/composer"),
      accent: "indigo",
    };
    return {
      icon: <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />,
      headline: "What do you want to share today?",
      sub: "Turn an idea, insight, or experience into a LinkedIn post.",
      cta: "Create post",
      onClick: () => navigate("/composer"),
      accent: "indigo",
    };
  })();

  const accentMap: Record<string, { bg: string; border: string; icon: string; btn: string; sub: string }> = {
    amber:  { bg: "bg-amber-50",  border: "border-amber-200",  icon: "text-amber-500",  btn: "bg-amber-500 hover:bg-amber-600",  sub: "text-amber-700" },
    violet: { bg: "bg-violet-50", border: "border-violet-200", icon: "text-violet-500", btn: "bg-violet-600 hover:bg-violet-700", sub: "text-violet-700" },
    indigo: { bg: "bg-indigo-50", border: "border-indigo-200", icon: "text-indigo-500", btn: "bg-indigo-600 hover:bg-indigo-700", sub: "text-indigo-700" },
  };
  const ac = accentMap[nextAction.accent];

  // Filter posts for active tab
  const filtered =
    activeTab === "all" ? posts : posts.filter((p) => p.status === activeTab);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function changeTab(tab: FilterTab) {
    setActiveTab(tab);
    setPage(1);
  }

  // Count per tab for badges
  const countByStatus = posts.reduce<Record<string, number>>((acc, p) => {
    acc[p.status] = (acc[p.status] ?? 0) + 1;
    return acc;
  }, {});

  function handleCopy(content: string) {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function openSchedule(postId: string) {
    setSchedulingPostId(postId);
    setScheduleValue("");
    setScheduleError("");
  }

  async function handleScheduleSubmit() {
    if (!schedulingPostId || !scheduleValue) return;
    setScheduleError("");
    try {
      await schedulePost.mutateAsync({
        postId: schedulingPostId,
        publishAt: new Date(scheduleValue).toISOString(),
      });
      setSchedulingPostId(null);
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setScheduleError(msg ?? "Failed to schedule. Please try again.");
    }
  }

  return (
    <div className="h-full overflow-y-auto px-4 py-5 md:px-8 md:py-7 space-y-7">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap animate-slide-up">
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-0.5">Today</p>
          <h1 className="text-2xl font-bold text-slate-900">
            {greeting(me?.display_name)}
          </h1>
        </div>
        <Button onClick={() => navigate("/composer")}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          New post
        </Button>
      </div>

      {/* Achievements + streak — shown right below greeting when earned */}
      {achievements.length > 0 && (
        <div className="flex items-center justify-between gap-3 flex-wrap animate-fade-in">
          <div className="flex gap-1.5 flex-wrap">
            {achievements.map((a) => (
              <div
                key={a.type}
                title={`${a.title}: ${a.description}\nEarned ${new Date(a.earned_at).toLocaleDateString()}`}
                className="flex items-center gap-1.5 px-2.5 py-1 bg-white border border-slate-100 rounded-xl text-xs font-medium text-slate-700 cursor-default hover:border-indigo-200 hover:bg-indigo-50 transition-colors"
              >
                <span className="text-sm leading-none">{a.icon}</span>
                <span>{a.title}</span>
              </div>
            ))}
          </div>
          {streak && (
            <div className="flex items-center gap-1.5 text-xs text-slate-500 flex-shrink-0">
              <span>🔥</span>
              <span><span className="font-semibold text-slate-700">{streak.current_streak}</span>-day streak</span>
              <span className="text-slate-300">·</span>
              <span><span className="font-semibold text-slate-700">{streak.total_published}</span> published</span>
              {streak.longest_streak > streak.current_streak && (
                <>
                  <span className="text-slate-300">·</span>
                  <span>best <span className="font-semibold text-slate-700">{streak.longest_streak}</span>d</span>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* Next Action card */}
      {isLoading ? (
        <div className="h-20 skeleton" />
      ) : (
        <div className={`flex items-start gap-4 p-5 rounded-2xl border animate-scale-in ${ac.bg} ${ac.border}`}>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-white/70 ${ac.icon}`}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              {nextAction.icon}
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-slate-900 leading-snug">{nextAction.headline}</p>
            <p className={`text-xs mt-0.5 leading-relaxed ${ac.sub} opacity-80`}>{nextAction.sub}</p>
          </div>
          <button
            type="button"
            onClick={nextAction.onClick}
            className={`flex-shrink-0 text-xs font-semibold text-white px-4 py-2 rounded-xl transition-colors ${ac.btn}`}
          >
            {nextAction.cta}
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 stagger-children">
        <StatCard
          label="Total Posts"
          value={stats.total}
          color="indigo"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          }
        />
        <StatCard
          label="Published"
          value={stats.published}
          color="emerald"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StatCard
          label="Pending Approval"
          value={stats.pending}
          color="amber"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StatCard
          label="Scheduled"
          value={stats.scheduled}
          color="blue"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          }
        />
      </div>

      {/* Posts section */}
      <div className="space-y-4">
        {/* Filter tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1">
          {TABS.map(({ key, label }) => {
            const count = key === "all" ? posts.length : (countByStatus[key] ?? 0);
            const isActive = activeTab === key;
            return (
              <button
                key={key}
                onClick={() => changeTab(key)}
                className={[
                  "flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all duration-150",
                  isActive
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-100",
                ].join(" ")}
              >
                {label}
                {count > 0 && (
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                      isActive ? "bg-white/20 text-white" : "bg-slate-200 text-slate-500"
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Copy toast */}
        {copied && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-sm px-4 py-2.5 rounded-xl shadow-lg z-50 flex items-center gap-2 animate-slide-up">
            <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            Copied to clipboard
          </div>
        )}

        {/* Post list */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 skeleton" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState filter={activeTab} />
        ) : (
          <>
            <div className="space-y-2 stagger-children">
              {paginated.map((post) => (
                <PostRow
                  key={post.id}
                  post={post}
                  onCopy={handleCopy}
                  onDelete={(id) => deletePost.mutate(id)}
                  onSchedule={openSchedule}
                />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-1">
                <p className="text-xs text-slate-400">
                  {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={[
                        "w-7 h-7 rounded-lg text-xs font-medium transition-colors",
                        p === page
                          ? "bg-indigo-600 text-white"
                          : "text-slate-500 hover:bg-slate-100",
                      ].join(" ")}
                    >
                      {p}
                    </button>
                  ))}
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Schedule modal */}
      {schedulingPostId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={() => setSchedulingPostId(null)}>
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm space-y-4 animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div>
              <h2 className="text-base font-bold text-slate-900">Schedule post</h2>
              <p className="text-xs text-slate-400 mt-0.5">Pick a date and time — we'll post automatically.</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-600 block">Date & time</label>
              <input
                type="datetime-local"
                min={localMinDatetime()}
                value={scheduleValue}
                onChange={(e) => { setScheduleValue(e.target.value); setScheduleError(""); }}
                className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-300"
              />
              <p className="text-[11px] text-slate-400">Your timezone: {userTz}</p>
              {scheduleValue && (
                <p className="text-[11px] text-indigo-600 font-medium">Will post: {formatPreview(scheduleValue)}</p>
              )}
            </div>

            {scheduleError && (
              <p className="text-xs text-red-500">{scheduleError}</p>
            )}

            <div className="flex items-center gap-3 pt-1">
              <button
                onClick={handleScheduleSubmit}
                disabled={!scheduleValue || schedulePost.isPending}
                className="flex-1 text-sm font-semibold py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-colors disabled:opacity-50"
              >
                {schedulePost.isPending ? "Scheduling…" : "Confirm schedule"}
              </button>
              <button onClick={() => setSchedulingPostId(null)} className="text-sm text-slate-500 hover:text-slate-800">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tip banner — only when no posts */}
      {stats.total === 0 && !isLoading && (
        <div className="bg-gradient-to-r from-indigo-600 to-violet-600 rounded-2xl p-6 text-white flex items-center justify-between gap-6">
          <div className="space-y-1">
            <p className="font-semibold">Start with a topic you care about</p>
            <p className="text-indigo-200 text-sm">
              The best LinkedIn posts come from genuine expertise. What do you know that others don't?
            </p>
          </div>
          <Button
            variant="secondary"
            onClick={() => navigate("/composer")}
            className="flex-shrink-0 bg-white text-indigo-700 hover:bg-indigo-50"
          >
            Get started
          </Button>
        </div>
      )}
    </div>
  );
}
