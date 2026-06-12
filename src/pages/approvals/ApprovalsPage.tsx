import { useState } from "react";
import { usePosts, useApprovePost, useSchedulePost, useMe, type Post } from "../../lib/api-hooks";
import { StatusBadge } from "../../components/dashboard/StatusBadge";

const userTz = Intl.DateTimeFormat().resolvedOptions().timeZone;


function formatPreview(val: string) {
  if (!val) return "";
  return new Date(val).toLocaleString(undefined, {
    weekday: "short", day: "numeric", month: "short",
    hour: "numeric", minute: "2-digit", timeZoneName: "short",
  });
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}


export default function ApprovalsPage() {
  const { data: me } = useMe();
  const { data: allPosts = [], isLoading } = usePosts();
  const isOwner = me?.role === "owner";
  // Owners see pending + approved. Non-owners also see rejected so they know why.
  const posts = allPosts.filter((p) =>
    isOwner
      ? ["pending_approval", "approved"].includes(p.status)
      : ["pending_approval", "approved", "rejected"].includes(p.status)
  );
  const approvePost = useApprovePost();
  const schedulePost = useSchedulePost();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [rejectMode, setRejectMode] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [scheduleValue, setScheduleValue] = useState("");
  const [scheduleError, setScheduleError] = useState("");
  const [scheduling, setScheduling] = useState(false);

  const pendingCount = posts.filter((p) => p.status === "pending_approval").length;
  const approvedCount = posts.filter((p) => p.status === "approved").length;
  const rejectedCount = posts.filter((p) => p.status === "rejected").length;
  const selected = posts.find((p) => p.id === selectedId) ?? posts[0] ?? null;

  // Auto-select first post
  if (!selectedId && posts.length > 0 && !selected) {
    setSelectedId(posts[0].id);
  }

  async function handleSchedule() {
    if (!selected || !scheduleValue) return;
    setScheduleError("");
    setScheduling(true);
    try {
      await schedulePost.mutateAsync({ postId: selected.id, publishAt: new Date(scheduleValue).toISOString() });
      setSelectedId(null);
      setScheduleValue("");
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setScheduleError(msg ?? "Failed to schedule. Please try again.");
    } finally {
      setScheduling(false);
    }
  }

  async function handleApprove() {
    if (!selected) return;
    await approvePost.mutateAsync({ id: selected.id, action: "approve" });
    setSelectedId(null);
    setRejectMode(false);
    setRejectReason("");
  }

  async function handleReject() {
    if (!selected) return;
    await approvePost.mutateAsync({ id: selected.id, action: "reject", reason: rejectReason || undefined });
    setSelectedId(null);
    setRejectMode(false);
    setRejectReason("");
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-4 py-4 md:px-6 md:py-5 border-b border-slate-100 bg-white flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-slate-900">Approvals</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {isLoading ? "Loading…" : posts.length === 0
                ? "No posts pending review"
                : [
                    pendingCount > 0 ? `${pendingCount} pending review` : "",
                    approvedCount > 0 ? `${approvedCount} approved` : "",
                    rejectedCount > 0 ? `${rejectedCount} rejected` : "",
                  ].filter(Boolean).join(" · ")}
            </p>
          </div>
          {!isOwner && (
            <span className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-3 py-1.5 rounded-full font-medium">
              Your posts submitted for approval appear here
            </span>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left — post list */}
        <div className="w-72 xl:w-80 flex-shrink-0 border-r border-slate-100 overflow-y-auto bg-slate-50/50">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 bg-slate-100 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : posts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                <svg className="w-7 h-7 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-sm font-medium text-slate-600">All caught up!</p>
              <p className="text-xs text-slate-400 mt-1">No posts pending approval.</p>
            </div>
          ) : (
            <div className="p-3 space-y-2">
              {posts.map((post) => (
                <PostListItem
                  key={post.id}
                  post={post}
                  selected={post.id === (selected?.id)}
                  onClick={() => { setSelectedId(post.id); setRejectMode(false); setRejectReason(""); }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Right — post detail */}
        <div className="flex-1 overflow-y-auto">
          {!selected ? (
            <div className="flex items-center justify-center h-full text-slate-400 text-sm">
              Select a post to review
            </div>
          ) : (
            <div className="max-w-2xl mx-auto px-4 py-5 md:px-6 md:py-6 space-y-6">
              {/* Post meta */}
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3 flex-wrap">
                  <StatusBadge status={selected.status} />
                  <span className="text-xs text-slate-400 capitalize">{selected.type} post</span>
                  <span className="text-xs text-slate-400">· {timeAgo(selected.updated_at)}</span>
                </div>
                <a
                  href={`/composer/${selected.id}`}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 hover:underline flex items-center gap-1"
                >
                  Edit in composer
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>

              {/* Post content */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                    {me?.display_name?.[0]?.toUpperCase() ?? "U"}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{me?.display_name ?? "Team member"}</p>
                    <p className="text-xs text-slate-400">Just now · 🌐</p>
                  </div>
                </div>
                <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap break-words">
                  {selected.content ?? <span className="text-slate-400 italic">No content</span>}
                </p>
              </div>

              {/* Schedule block — shown for approved posts */}
              {isOwner && selected.status === "approved" && (
                <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 space-y-3">
                  <p className="text-sm font-semibold text-indigo-800">Plan a date</p>
                  <div className="space-y-1">
                    <input
                      type="datetime-local"
                      
                      value={scheduleValue}
                      onChange={(e) => { setScheduleValue(e.target.value); setScheduleError(""); }}
                      className="w-full text-sm border border-indigo-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
                    />
                    <p className="text-[11px] text-indigo-400">Timezone: {userTz}</p>
                    {scheduleValue && (
                      <p className="text-[11px] text-indigo-600 font-medium">Planned: {formatPreview(scheduleValue)}</p>
                    )}
                  </div>
                  {scheduleError && <p className="text-xs text-red-500">{scheduleError}</p>}
                  <button
                    type="button"
                    onClick={handleSchedule}
                    disabled={!scheduleValue || scheduling}
                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors"
                  >
                    {scheduling ? "Saving…" : "Save date"}
                  </button>
                </div>
              )}

              {/* Owner actions */}
              {isOwner && selected.status === "pending_approval" && (
                <div className="space-y-3">
                  {!rejectMode ? (
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={handleApprove}
                        disabled={approvePost.isPending}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors"
                      >
                        {approvePost.isPending ? (
                          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                        Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => setRejectMode(true)}
                        disabled={approvePost.isPending}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-white hover:bg-red-50 disabled:opacity-50 text-red-600 border border-red-200 hover:border-red-300 text-sm font-semibold rounded-xl transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        Reject
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3 bg-red-50 border border-red-100 rounded-2xl p-4">
                      <p className="text-sm font-semibold text-red-700">Rejection reason <span className="font-normal text-red-500">(optional)</span></p>
                      <textarea
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        placeholder="Let the author know what to improve…"
                        rows={3}
                        className="w-full px-3 py-2 text-sm text-slate-900 bg-white border border-red-200 rounded-xl placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={handleReject}
                          disabled={approvePost.isPending}
                          className="flex-1 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors"
                        >
                          {approvePost.isPending ? "Rejecting…" : "Confirm reject"}
                        </button>
                        <button
                          type="button"
                          onClick={() => { setRejectMode(false); setRejectReason(""); }}
                          className="px-4 py-2 bg-white border border-slate-200 text-slate-600 text-sm font-medium rounded-xl hover:bg-slate-50 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Non-owner status messages */}
              {!isOwner && selected.status === "pending_approval" && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3">
                  <svg className="w-5 h-5 text-amber-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm text-amber-700">Waiting for owner approval. You'll be notified once reviewed.</p>
                </div>
              )}
              {!isOwner && selected.status === "rejected" && (
                <div className="bg-red-50 border border-red-200 rounded-2xl p-4 space-y-2">
                  <p className="text-sm font-semibold text-red-700">Post rejected</p>
                  {selected.rejection_reason && (
                    <p className="text-sm text-red-600 italic">"{selected.rejection_reason}"</p>
                  )}
                  <p className="text-xs text-slate-500">Open the post in the composer to edit and re-submit.</p>
                  <a href={`/composer/${selected.id}`} className="inline-block text-xs font-semibold text-indigo-600 hover:underline">Edit post →</a>
                </div>
              )}
              {!isOwner && selected.status === "approved" && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center gap-3">
                  <svg className="w-5 h-5 text-emerald-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <p className="text-sm text-emerald-700">Approved — the owner will schedule or publish this post.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PostListItem({ post, selected, onClick }: { post: Post; selected: boolean; onClick: () => void }) {
  const excerpt = post.content
    ? post.content.slice(0, 72) + (post.content.length > 72 ? "…" : "")
    : post.title ?? "Untitled post";

  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "w-full text-left px-4 py-3.5 rounded-2xl border transition-all duration-150",
        selected
          ? "bg-white border-indigo-200 shadow-sm"
          : "bg-white border-slate-100 hover:border-indigo-200 hover:shadow-sm",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <span className="text-xs font-medium text-slate-500 capitalize">{post.type}</span>
        <span className="text-xs text-slate-400 flex-shrink-0">{timeAgo(post.updated_at)}</span>
      </div>
      <p className="text-sm text-slate-800 leading-snug line-clamp-2">{excerpt}</p>
      {selected && (
        <div className="mt-2 w-1.5 h-1.5 rounded-full bg-indigo-500 ml-auto" />
      )}
    </button>
  );
}
