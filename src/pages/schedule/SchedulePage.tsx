import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  usePosts,
  useSchedulePost,
  useUnschedulePost,
  usePublishPost,
  type Post,
  type PostType,
} from "../../lib/api-hooks";
import { Button } from "../../components/ui/Button";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const userTz = Intl.DateTimeFormat().resolvedOptions().timeZone;

function localMinDatetime() {
  const d = new Date(Date.now() + 2 * 60 * 1000);
  const off = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - off).toISOString().slice(0, 16);
}

function toLocalInput(isoUtc: string): string {
  const d = new Date(isoUtc);
  const off = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - off).toISOString().slice(0, 16);
}

function formatScheduled(isoUtc: string) {
  return new Date(isoUtc).toLocaleString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

function formatPreview(localVal: string) {
  if (!localVal) return "";
  return new Date(localVal).toLocaleString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function groupPosts(posts: Post[]): {
  overdue: Post[];
  today: Post[];
  tomorrow: Post[];
  thisWeek: Post[];
  later: Post[];
} {
  const now = new Date();
  const todayStart = startOfDay(now);
  const tomorrowStart = new Date(todayStart.getTime() + 86400000);
  const weekEnd = new Date(todayStart.getTime() + 7 * 86400000);

  const overdue: Post[] = [];
  const today: Post[] = [];
  const tomorrow: Post[] = [];
  const thisWeek: Post[] = [];
  const later: Post[] = [];

  for (const p of posts) {
    if (!p.scheduled_at) continue;
    const d = new Date(p.scheduled_at);
    if (d < now) {
      overdue.push(p);
    } else if (d < tomorrowStart) {
      today.push(p);
    } else if (d < new Date(tomorrowStart.getTime() + 86400000)) {
      tomorrow.push(p);
    } else if (d < weekEnd) {
      thisWeek.push(p);
    } else {
      later.push(p);
    }
  }

  const byTime = (a: Post, b: Post) =>
    new Date(a.scheduled_at!).getTime() - new Date(b.scheduled_at!).getTime();

  return {
    overdue: overdue.sort(byTime),
    today: today.sort(byTime),
    tomorrow: tomorrow.sort(byTime),
    thisWeek: thisWeek.sort(byTime),
    later: later.sort(byTime),
  };
}

// ─── Post type icons ──────────────────────────────────────────────────────────

const TYPE_ICONS: Record<PostType, React.ReactNode> = {
  text: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h7" />
    </svg>
  ),
  image: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  carousel: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
    </svg>
  ),
  poll: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
  video: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
    </svg>
  ),
  link: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
    </svg>
  ),
};

// ─── Post card ────────────────────────────────────────────────────────────────

function ScheduledPostCard({
  post,
  isOverdue,
  onReschedule,
  onCancel,
  onPublishNow,
}: {
  post: Post;
  isOverdue: boolean;
  onReschedule: (post: Post) => void;
  onCancel: (id: string) => void;
  onPublishNow: (id: string) => void;
}) {
  const navigate = useNavigate();
  const preview = (post.content ?? "").slice(0, 160).trim();

  return (
    <div className={`bg-white rounded-2xl border p-4 space-y-3 ${isOverdue ? "border-amber-200 bg-amber-50/40" : "border-slate-100"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className={`flex-shrink-0 p-1.5 rounded-lg ${isOverdue ? "bg-amber-100 text-amber-600" : "bg-slate-100 text-slate-500"}`}>
            {TYPE_ICONS[post.type as PostType] ?? TYPE_ICONS.text}
          </span>
          <div className="min-w-0">
            <p className="text-sm text-slate-700 leading-snug line-clamp-2">
              {preview || <span className="italic text-slate-400">No content yet</span>}
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5">
          {isOverdue ? (
            <span className="flex items-center gap-1 text-xs font-semibold text-amber-600 bg-amber-100 px-2.5 py-1 rounded-full">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
              Overdue
            </span>
          ) : (
            <span className="flex items-center gap-1 text-xs text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {post.scheduled_at ? formatScheduled(post.scheduled_at) : "—"}
            </span>
          )}
          {isOverdue && post.scheduled_at && (
            <span className="text-xs text-amber-500">{formatScheduled(post.scheduled_at)}</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isOverdue && (
            <button
              onClick={() => onPublishNow(post.id)}
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 px-2.5 py-1 rounded-lg hover:bg-emerald-50 transition-colors"
            >
              Publish now
            </button>
          )}
          <button
            onClick={() => navigate(`/composer/${post.id}`)}
            className="text-xs text-slate-500 hover:text-indigo-600 px-2.5 py-1 rounded-lg hover:bg-indigo-50 transition-colors"
          >
            Edit
          </button>
          <button
            onClick={() => onReschedule(post)}
            className="text-xs font-medium text-indigo-600 hover:text-indigo-700 px-2.5 py-1 rounded-lg hover:bg-indigo-50 transition-colors"
          >
            Reschedule
          </button>
          <button
            onClick={() => onCancel(post.id)}
            className="text-xs text-slate-400 hover:text-red-500 px-2.5 py-1 rounded-lg hover:bg-red-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Group section ────────────────────────────────────────────────────────────

function Group({
  label,
  posts,
  isOverdue = false,
  onReschedule,
  onCancel,
  onPublishNow,
}: {
  label: string;
  posts: Post[];
  isOverdue?: boolean;
  onReschedule: (post: Post) => void;
  onCancel: (id: string) => void;
  onPublishNow: (id: string) => void;
}) {
  if (posts.length === 0) return null;
  return (
    <div className="space-y-2">
      <h2 className={`text-xs font-semibold uppercase tracking-wider ${isOverdue ? "text-amber-500" : "text-slate-400"}`}>
        {label} · {posts.length}
      </h2>
      {posts.map((p) => (
        <ScheduledPostCard
          key={p.id}
          post={p}
          isOverdue={isOverdue}
          onReschedule={onReschedule}
          onCancel={onCancel}
          onPublishNow={onPublishNow}
        />
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SchedulePage() {
  const navigate = useNavigate();
  const { data: allPostsRaw = [], isLoading } = usePosts();
  const allPosts = allPostsRaw.filter((p) => p.status === "scheduled");
  const schedulePost = useSchedulePost();
  const unschedulePost = useUnschedulePost();
  const publishPost = usePublishPost();

  const [reschedulingPost, setReschedulingPost] = useState<Post | null>(null);
  const [scheduleValue, setScheduleValue] = useState("");
  const [scheduleError, setScheduleError] = useState("");
  const [cancelConfirmId, setCancelConfirmId] = useState<string | null>(null);

  const groups = groupPosts(allPosts);
  const total = allPosts.length;

  function openReschedule(post: Post) {
    setReschedulingPost(post);
    setScheduleValue(post.scheduled_at ? toLocalInput(post.scheduled_at) : "");
    setScheduleError("");
  }

  async function handleRescheduleSubmit() {
    if (!reschedulingPost || !scheduleValue) return;
    setScheduleError("");
    try {
      await schedulePost.mutateAsync({
        postId: reschedulingPost.id,
        publishAt: new Date(scheduleValue).toISOString(),
      });
      setReschedulingPost(null);
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setScheduleError(msg ?? "Failed to reschedule. Please try again.");
    }
  }

  return (
    <div className="h-full overflow-y-auto px-4 py-5 md:px-8 md:py-7 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Schedule</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {total === 0 ? "No posts scheduled yet." : `${total} post${total > 1 ? "s" : ""} queued for publishing.`}
          </p>
        </div>
        <Button onClick={() => navigate("/composer")}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          New post
        </Button>
      </div>

      {/* Timezone */}
      <p className="text-xs text-slate-400 -mt-2">
        All times shown in your local timezone · {userTz}
      </p>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-white rounded-2xl border border-slate-100 animate-pulse" />
          ))}
        </div>
      ) : total === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center">
            <svg className="w-7 h-7 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <p className="text-slate-700 font-semibold">Nothing scheduled</p>
            <p className="text-slate-400 text-sm mt-1">Approve a post then hit the calendar icon to schedule it.</p>
          </div>
          <Button variant="outline" onClick={() => navigate("/dashboard")}>Go to dashboard</Button>
        </div>
      ) : (
        <div className="space-y-7">
          <Group
            label="Overdue"
            posts={groups.overdue}
            isOverdue
            onReschedule={openReschedule}
            onCancel={setCancelConfirmId}
            onPublishNow={(id) => publishPost.mutate(id)}
          />
          <Group
            label="Today"
            posts={groups.today}
            onReschedule={openReschedule}
            onCancel={setCancelConfirmId}
            onPublishNow={(id) => publishPost.mutate(id)}
          />
          <Group
            label="Tomorrow"
            posts={groups.tomorrow}
            onReschedule={openReschedule}
            onCancel={setCancelConfirmId}
            onPublishNow={(id) => publishPost.mutate(id)}
          />
          <Group
            label="This week"
            posts={groups.thisWeek}
            onReschedule={openReschedule}
            onCancel={setCancelConfirmId}
            onPublishNow={(id) => publishPost.mutate(id)}
          />
          <Group
            label="Later"
            posts={groups.later}
            onReschedule={openReschedule}
            onCancel={setCancelConfirmId}
            onPublishNow={(id) => publishPost.mutate(id)}
          />
        </div>
      )}

      {/* Reschedule modal */}
      {reschedulingPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={() => setReschedulingPost(null)}>
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm space-y-4" onClick={(e) => e.stopPropagation()}>
            <div>
              <h2 className="text-base font-bold text-slate-900">Reschedule post</h2>
              <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{reschedulingPost.content?.slice(0, 80)}…</p>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-600 block">New date & time</label>
              <input
                type="datetime-local"
                min={localMinDatetime()}
                value={scheduleValue}
                onChange={(e) => { setScheduleValue(e.target.value); setScheduleError(""); }}
                className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-300"
              />
              <p className="text-[11px] text-slate-400">Timezone: {userTz}</p>
              {scheduleValue && (
                <p className="text-[11px] text-indigo-600 font-medium">Will post: {formatPreview(scheduleValue)}</p>
              )}
            </div>
            {scheduleError && <p className="text-xs text-red-500">{scheduleError}</p>}
            <div className="flex items-center gap-3 pt-1">
              <button
                onClick={handleRescheduleSubmit}
                disabled={!scheduleValue || schedulePost.isPending}
                className="flex-1 text-sm font-semibold py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-colors disabled:opacity-50"
              >
                {schedulePost.isPending ? "Saving…" : "Confirm"}
              </button>
              <button onClick={() => setReschedulingPost(null)} className="text-sm text-slate-500 hover:text-slate-800">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel confirm modal */}
      {cancelConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={() => setCancelConfirmId(null)}>
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm space-y-4" onClick={(e) => e.stopPropagation()}>
            <div>
              <h2 className="text-base font-bold text-slate-900">Cancel schedule?</h2>
              <p className="text-sm text-slate-500 mt-1">The post will move back to Approved and won't be published automatically.</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={async () => {
                  await unschedulePost.mutateAsync(cancelConfirmId);
                  setCancelConfirmId(null);
                }}
                disabled={unschedulePost.isPending}
                className="flex-1 text-sm font-semibold py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl transition-colors disabled:opacity-50"
              >
                {unschedulePost.isPending ? "Cancelling…" : "Yes, cancel it"}
              </button>
              <button onClick={() => setCancelConfirmId(null)} className="text-sm text-slate-500 hover:text-slate-800">
                Keep it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
