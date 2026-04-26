import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMe, usePosts, useDeletePost, type PostStatus } from "../../lib/api-hooks";
import { StatCard } from "../../components/dashboard/StatCard";
import { PostRow } from "../../components/dashboard/PostRow";
import { EmptyState } from "../../components/dashboard/EmptyState";
import { Button } from "../../components/ui/Button";

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
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [copied, setCopied] = useState(false);

  // Compute stats
  const stats = {
    total: posts.length,
    published: posts.filter((p) => p.status === "published").length,
    pending: posts.filter((p) => p.status === "pending_approval").length,
    scheduled: posts.filter((p) => p.status === "scheduled").length,
  };

  // Filter posts for active tab
  const filtered =
    activeTab === "all" ? posts : posts.filter((p) => p.status === activeTab);

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

  return (
    <div className="h-full overflow-y-auto px-4 py-5 md:px-8 md:py-7 space-y-7">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {greeting(me?.display_name)}
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            {stats.total === 0
              ? "Ready to build your LinkedIn presence?"
              : `You have ${stats.pending > 0 ? `${stats.pending} post${stats.pending > 1 ? "s" : ""} pending approval` : `${stats.total} post${stats.total > 1 ? "s" : ""} in your workspace`}.`}
          </p>
        </div>
        <Button onClick={() => navigate("/composer")}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          New post
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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
                onClick={() => setActiveTab(key)}
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
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-sm px-4 py-2.5 rounded-xl shadow-lg z-50 flex items-center gap-2">
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
              <div key={i} className="h-16 bg-white rounded-2xl border border-slate-100 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState filter={activeTab} />
        ) : (
          <div className="space-y-2">
            {filtered.map((post) => (
              <PostRow
                key={post.id}
                post={post}
                onCopy={handleCopy}
                onDelete={(id) => deletePost.mutate(id)}
              />
            ))}
          </div>
        )}
      </div>

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
