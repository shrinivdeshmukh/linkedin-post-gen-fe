import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  usePosts,
  useUpdatePost,
  useSchedulePost,
  useUnschedulePost,
  usePublishPost,
  type Post,
} from "../../lib/api-hooks";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const STATUS_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  draft:            { bg: "bg-slate-100",   text: "text-slate-600",  dot: "bg-slate-400" },
  pending_approval: { bg: "bg-amber-50",    text: "text-amber-700",  dot: "bg-amber-400" },
  approved:         { bg: "bg-emerald-50",  text: "text-emerald-700", dot: "bg-emerald-500" },
  scheduled:        { bg: "bg-blue-50",     text: "text-blue-700",   dot: "bg-blue-500" },
  published:        { bg: "bg-indigo-50",   text: "text-indigo-700", dot: "bg-indigo-500" },
  rejected:         { bg: "bg-red-50",      text: "text-red-600",    dot: "bg-red-400" },
};


function toDateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function postsForMonth(posts: Post[], year: number, month: number): Map<string, Post[]> {
  const map = new Map<string, Post[]>();
  for (const p of posts) {
    if (!p.scheduled_at) continue;
    const d = new Date(p.scheduled_at);
    if (d.getFullYear() === year && d.getMonth() === month) {
      const key = toDateKey(d);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(p);
    }
  }
  return map;
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

function PostPill({ post, onClick }: { post: Post; onClick: () => void }) {
  const colors = STATUS_COLORS[post.status] ?? STATUS_COLORS.draft;
  const label = post.medium === "blog"
    ? (post.title ?? "Blog post").slice(0, 22)
    : (post.content ?? post.title ?? "Post").slice(0, 22);

  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className={`w-full text-left text-[10px] font-medium px-1.5 py-0.5 rounded-md truncate flex items-center gap-1 ${colors.bg} ${colors.text} hover:opacity-80 transition-opacity`}
      title={post.medium === "blog" ? post.title ?? "Blog post" : post.content ?? "Post"}
    >
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${colors.dot}`} />
      {post.medium === "blog" ? "Blog: " : ""}{label}
    </button>
  );
}

// PostScheduleDrawer — right-side panel with date setting + full scheduling actions
function PostScheduleDrawer({ post, onClose }: { post: Post; onClose: () => void }) {
  const navigate = useNavigate();
  const updatePost = useUpdatePost();
  const schedulePost = useSchedulePost();
  const unschedulePost = useUnschedulePost();
  const publishPost = usePublishPost();

  const [dateValue, setDateValue] = useState<string>(() => {
    if (!post.scheduled_at) return "";
    const d = new Date(post.scheduled_at);
    const off = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - off).toISOString().slice(0, 16);
  });

  const isPending =
    updatePost.isPending || schedulePost.isPending ||
    unschedulePost.isPending || publishPost.isPending;

  const excerpt = post.medium === "blog"
    ? post.title ?? "Blog post"
    : (post.content ?? post.title ?? "Untitled").slice(0, 160);

  const colors = STATUS_COLORS[post.status] ?? STATUS_COLORS.draft;

  function minDatetime() {
    const d = new Date(Date.now() + 2 * 60 * 1000);
    const off = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - off).toISOString().slice(0, 16);
  }

  async function handleSaveDate() {
    await updatePost.mutateAsync({
      id: post.id,
      scheduled_at: dateValue ? new Date(dateValue).toISOString() : null,
    });
  }

  async function handleSchedule() {
    if (!dateValue) return;
    await schedulePost.mutateAsync({ postId: post.id, publishAt: new Date(dateValue).toISOString() });
    onClose();
  }

  async function handleUnschedule() {
    await unschedulePost.mutateAsync(post.id);
    onClose();
  }

  async function handlePublishNow() {
    await publishPost.mutateAsync(post.id);
    onClose();
  }

  async function handleClearDate() {
    await updatePost.mutateAsync({ id: post.id, scheduled_at: null });
    onClose();
  }

  function openPost() {
    onClose();
    if (post.medium === "blog") navigate(`/blog/${post.id}`);
    else navigate(`/composer/${post.id}`);
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-sm bg-white shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${colors.bg} ${colors.text}`}>
              {post.status.replace("_", " ")}
            </span>
            <span className="text-xs text-slate-400 capitalize">
              {post.medium === "blog" ? "blog" : post.type}
            </span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Post preview */}
          <div className="bg-slate-50 rounded-xl p-4">
            <p className="text-sm text-slate-700 line-clamp-4">{excerpt}</p>
            <button onClick={openPost} className="mt-2 text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1">
              Open post
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </button>
          </div>

          {/* Date/time picker */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Date & time</label>
            <input
              type="datetime-local"
              value={dateValue}
              min={minDatetime()}
              onChange={(e) => setDateValue(e.target.value)}
              disabled={post.status === "published"}
              className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-indigo-300 disabled:bg-slate-50 disabled:text-slate-400"
            />
            {post.status !== "scheduled" && post.status !== "published" && (
              <div className="flex gap-2">
                <button
                  onClick={handleSaveDate}
                  disabled={isPending || !dateValue}
                  className="flex-1 text-sm py-2 font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors disabled:opacity-40"
                >
                  {updatePost.isPending ? "Saving…" : "Save date"}
                </button>
                {post.scheduled_at && (
                  <button
                    onClick={handleClearDate}
                    disabled={isPending}
                    className="px-3 py-2 text-sm text-red-500 hover:text-red-700 border border-red-100 hover:border-red-200 rounded-xl transition-colors disabled:opacity-40"
                  >
                    Clear
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Scheduling actions */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Publishing</label>

            {post.status === "published" && (
              <div className="rounded-xl bg-indigo-50 border border-indigo-100 px-4 py-3 text-sm text-indigo-700">
                Published {post.published_at
                  ? new Date(post.published_at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
                  : ""}
              </div>
            )}

            {post.status === "scheduled" && (
              <div className="space-y-2">
                <div className="rounded-xl bg-blue-50 border border-blue-100 px-4 py-3 text-sm text-blue-700 flex items-center gap-2">
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Scheduled for {post.scheduled_at
                    ? new Date(post.scheduled_at).toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
                    : "—"}
                </div>
                <button
                  onClick={handlePublishNow}
                  disabled={isPending}
                  className="w-full py-2.5 text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-colors disabled:opacity-50"
                >
                  {publishPost.isPending ? "Publishing…" : "Publish now"}
                </button>
                <button
                  onClick={handleUnschedule}
                  disabled={isPending}
                  className="w-full py-2.5 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors disabled:opacity-50"
                >
                  {unschedulePost.isPending ? "Unscheduling…" : "Unschedule"}
                </button>
              </div>
            )}

            {(post.status === "approved" || post.status === "draft" || post.status === "pending_approval") && (
              <div className="space-y-2">
                {post.status !== "approved" && (
                  <p className="text-[11px] text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
                    Post must be approved before scheduling.
                  </p>
                )}
                <button
                  onClick={handleSchedule}
                  disabled={isPending || !dateValue || post.status !== "approved"}
                  className="w-full py-2.5 text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-colors disabled:opacity-40"
                >
                  {schedulePost.isPending ? "Scheduling…" : "Schedule for publishing"}
                </button>
                <button
                  onClick={handlePublishNow}
                  disabled={isPending || post.status !== "approved"}
                  className="w-full py-2.5 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors disabled:opacity-40"
                >
                  {publishPost.isPending ? "Publishing…" : "Publish now"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// DayCellModal — clicking an empty day cell opens this to pick a post to assign
function DayDetailPanel({
  date,
  posts,
  onPickPost,
  onEditDate,
  onClose,
}: {
  date: Date;
  posts: Post[];
  onPickPost: () => void;
  onEditDate: (p: Post) => void;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const dateLabel = date.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" });

  function navToPost(p: Post) {
    onClose();
    if (p.medium === "blog") navigate(`/blog/${p.id}`);
    else navigate(`/composer/${p.id}`);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">{dateLabel}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {posts.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-2">No posts planned for this day.</p>
        ) : (
          <div className="space-y-2">
            {posts.map((p) => {
              const colors = STATUS_COLORS[p.status] ?? STATUS_COLORS.draft;
              const label = p.medium === "blog" ? p.title ?? "Blog post" : p.content?.slice(0, 60) ?? "Post";
              return (
                <div key={p.id} className={`rounded-xl p-3 flex items-start gap-3 ${colors.bg}`}>
                  <span className={`w-2 h-2 rounded-full mt-1 flex-shrink-0 ${colors.dot}`} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-semibold ${colors.text} capitalize mb-0.5`}>
                      {p.medium === "blog" ? "Blog" : p.type} · {p.status.replace("_", " ")}
                    </p>
                    <p className="text-xs text-slate-600 line-clamp-2">{label}</p>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button
                      onClick={() => onEditDate(p)}
                      title="Change date"
                      className="p-1 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-white transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => navToPost(p)}
                      title="Open post"
                      className="p-1 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-white transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <button
          onClick={onPickPost}
          className="w-full py-2 text-sm font-medium text-indigo-600 border border-indigo-200 rounded-xl hover:bg-indigo-50 transition-colors"
        >
          + Assign a post to this date
        </button>
      </div>
    </div>
  );
}

// PostPickerModal — pick any unscheduled post and assign a date
function PostPickerModal({ targetDate, allPosts, onClose }: { targetDate: Date; allPosts: Post[]; onClose: () => void }) {
  const updatePost = useUpdatePost();
  const [search, setSearch] = useState("");

  const candidates = allPosts.filter((p) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (p.content ?? "").toLowerCase().includes(q) ||
      (p.title ?? "").toLowerCase().includes(q)
    );
  });

  async function assign(post: Post) {
    const d = new Date(targetDate);
    d.setHours(9, 0, 0, 0); // default 9am
    await updatePost.mutateAsync({ id: post.id, scheduled_at: d.toISOString() });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm space-y-4 max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between flex-shrink-0">
          <h2 className="text-sm font-bold text-slate-900">
            Assign to {targetDate.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <input
          type="text"
          placeholder="Search posts…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-300 flex-shrink-0"
          autoFocus
        />
        <div className="overflow-y-auto flex-1 space-y-2 min-h-0">
          {candidates.length === 0 && (
            <p className="text-sm text-slate-400 text-center py-4">No posts found.</p>
          )}
          {candidates.map((p) => {
            const colors = STATUS_COLORS[p.status] ?? STATUS_COLORS.draft;
            const label = p.medium === "blog" ? p.title ?? "Blog post" : p.content?.slice(0, 80) ?? "Post";
            return (
              <button
                key={p.id}
                onClick={() => assign(p)}
                disabled={updatePost.isPending}
                className="w-full text-left rounded-xl border border-slate-100 p-3 hover:border-indigo-200 hover:bg-indigo-50/40 transition-all space-y-1 disabled:opacity-50"
              >
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${colors.bg} ${colors.text}`}>
                    {p.status.replace("_", " ")}
                  </span>
                  <span className="text-[10px] text-slate-400 capitalize">{p.medium === "blog" ? "blog" : p.type}</span>
                </div>
                <p className="text-xs text-slate-700 line-clamp-2">{label}</p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function ContentCalendarPage() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [drawerPost, setDrawerPost] = useState<Post | null>(null);
  const [pickingForDay, setPickingForDay] = useState<Date | null>(null);

  const { data: allPosts = [], isLoading } = usePosts();
  const postMap = postsForMonth(allPosts, year, month);

  const daysInMonth = getDaysInMonth(year, month);
  const firstDow = getFirstDayOfWeek(year, month);
  const todayKey = toDateKey(today);

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
  }
  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
  }

  // Count posts with planned dates
  const plannedCount = allPosts.filter(p => p.scheduled_at).length;

  // Grid cells: leading empty + day cells
  const cells: Array<{ day: number | null }> = [];
  for (let i = 0; i < firstDow; i++) cells.push({ day: null });
  for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d });
  // Pad to complete last row
  while (cells.length % 7 !== 0) cells.push({ day: null });

  return (
    <div className="h-full flex flex-col bg-slate-50">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-100 bg-white flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-slate-900">Content Calendar</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {isLoading ? "Loading…" : `${plannedCount} post${plannedCount !== 1 ? "s" : ""} planned`}
            </p>
          </div>

          {/* Legend */}
          <div className="hidden md:flex items-center gap-3 text-[11px] text-slate-500">
            {[
              { label: "Draft", dot: "bg-slate-400" },
              { label: "Pending", dot: "bg-amber-400" },
              { label: "Approved", dot: "bg-emerald-500" },
              { label: "Published", dot: "bg-indigo-500" },
            ].map(({ label, dot }) => (
              <span key={label} className="flex items-center gap-1">
                <span className={`w-2 h-2 rounded-full ${dot}`} />
                {label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Calendar */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Month navigation */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <button
              onClick={prevMonth}
              className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="text-center">
              <h2 className="text-base font-bold text-slate-900">{MONTHS[month]} {year}</h2>
            </div>
            <button
              onClick={nextMonth}
              className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Day-of-week headers */}
          <div className="grid grid-cols-7 border-b border-slate-100">
            {DAYS.map((d) => (
              <div key={d} className="py-2.5 text-center text-xs font-semibold text-slate-400 uppercase tracking-wide">
                {d}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 divide-x divide-y divide-slate-100">
            {cells.map((cell, idx) => {
              if (cell.day === null) {
                return <div key={`empty-${idx}`} className="min-h-[90px] bg-slate-50/50" />;
              }
              const cellDate = new Date(year, month, cell.day);
              const key = toDateKey(cellDate);
              const cellPosts = postMap.get(key) ?? [];
              const isToday = key === todayKey;
              const isPast = cellDate < today && !isToday;

              return (
                <div
                  key={key}
                  onClick={() => setSelectedDay(cellDate)}
                  className={`min-h-[90px] p-2 cursor-pointer transition-colors group ${
                    isToday ? "bg-indigo-50/60" : isPast ? "bg-slate-50/30" : "bg-white hover:bg-slate-50/60"
                  }`}
                >
                  {/* Day number */}
                  <div className="flex items-center justify-between mb-1.5">
                    <span
                      className={`text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full ${
                        isToday
                          ? "bg-indigo-600 text-white"
                          : isPast
                          ? "text-slate-300"
                          : "text-slate-600 group-hover:text-slate-900"
                      }`}
                    >
                      {cell.day}
                    </span>
                    {cellPosts.length === 0 && !isPast && (
                      <span className="opacity-0 group-hover:opacity-100 text-[10px] text-slate-300 transition-opacity">
                        +
                      </span>
                    )}
                  </div>

                  {/* Post pills */}
                  <div className="space-y-0.5">
                    {cellPosts.slice(0, 3).map((p) => (
                      <PostPill
                        key={p.id}
                        post={p}
                        onClick={() => setSelectedDay(cellDate)}
                      />
                    ))}
                    {cellPosts.length > 3 && (
                      <p className="text-[10px] text-slate-400 pl-1">+{cellPosts.length - 3} more</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Upcoming list */}
        {(() => {
          const upcoming = allPosts
            .filter((p) => p.scheduled_at && new Date(p.scheduled_at) >= today)
            .sort((a, b) => new Date(a.scheduled_at!).getTime() - new Date(b.scheduled_at!).getTime())
            .slice(0, 8);
          if (upcoming.length === 0) return null;
          return (
            <div className="mt-6">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Upcoming</h3>
              <div className="space-y-2">
                {upcoming.map((p) => {
                  const colors = STATUS_COLORS[p.status] ?? STATUS_COLORS.draft;
                  const d = new Date(p.scheduled_at!);
                  const label = p.medium === "blog" ? p.title ?? "Blog post" : p.content?.slice(0, 80) ?? "Untitled";
                  return (
                    <button
                      key={p.id}
                      onClick={() => setDrawerPost(p)}
                      className="w-full text-left bg-white border border-slate-100 rounded-xl p-3.5 flex items-center gap-3 hover:border-indigo-200 hover:shadow-sm transition-all"
                    >
                      <div className="text-center flex-shrink-0 w-10">
                        <p className="text-xs font-bold text-slate-500">{MONTHS[d.getMonth()].slice(0, 3).toUpperCase()}</p>
                        <p className="text-lg font-bold text-slate-900 leading-none">{d.getDate()}</p>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${colors.bg} ${colors.text}`}>
                            {p.status.replace("_", " ")}
                          </span>
                          <span className="text-[10px] text-slate-400 capitalize">
                            {p.medium === "blog" ? "blog" : p.type}
                          </span>
                        </div>
                        <p className="text-sm text-slate-700 truncate">{label}</p>
                      </div>
                      <svg className="w-4 h-4 text-slate-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })()}
      </div>

      {/* Day detail panel */}
      {selectedDay && !drawerPost && (
        <DayDetailPanel
          date={selectedDay}
          posts={postMap.get(toDateKey(selectedDay)) ?? []}
          onPickPost={() => { setPickingForDay(selectedDay); setSelectedDay(null); }}
          onEditDate={(p) => { setDrawerPost(p); setSelectedDay(null); }}
          onClose={() => setSelectedDay(null)}
        />
      )}

      {/* Schedule drawer */}
      {drawerPost && (
        <PostScheduleDrawer post={drawerPost} onClose={() => setDrawerPost(null)} />
      )}

      {/* Post picker modal */}
      {pickingForDay && (
        <PostPickerModal
          targetDate={pickingForDay}
          allPosts={allPosts}
          onClose={() => setPickingForDay(null)}
        />
      )}
    </div>
  );
}
