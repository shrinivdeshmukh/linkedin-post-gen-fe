import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMeetings, useCreateMeeting, useDeleteMeeting, type MeetingListItem } from "../../lib/api-hooks";

function formatDuration(secs: number | null): string {
  if (!secs) return "—";
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

const TYPE_LABELS: Record<string, string> = {
  customer: "Customer",
  investor: "Investor",
  team: "Team",
  board: "Board",
  general: "General",
};

function StatusBadge({ status, transcriptStatus }: { status: MeetingListItem["status"]; transcriptStatus: MeetingListItem["transcript_status"] }) {
  if (status === "recording") return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-600 border border-red-100">
      <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
      Recording
    </span>
  );
  if (status === "processing" || transcriptStatus === "processing") return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-600 border border-amber-100">
      <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
      Processing
    </span>
  );
  if (status === "ready") return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-600 border border-emerald-100">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
      Ready
    </span>
  );
  return (
    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-500">
      {status}
    </span>
  );
}

function MeetingRow({
  meeting,
  selected,
  onToggle,
}: {
  meeting: MeetingListItem;
  selected: boolean;
  onToggle: (id: string) => void;
}) {
  const navigate = useNavigate();
  return (
    <div className={`flex items-center gap-3 px-5 py-4 transition-colors ${selected ? "bg-indigo-50" : "hover:bg-slate-50"}`}>
      {/* Checkbox */}
      <input
        type="checkbox"
        checked={selected}
        onChange={() => onToggle(meeting.id)}
        onClick={(e) => e.stopPropagation()}
        className="w-4 h-4 rounded border-slate-300 accent-indigo-600 cursor-pointer flex-shrink-0"
      />

      {/* Clickable row area */}
      <button
        onClick={() => navigate(`/meetings/${meeting.id}`)}
        className="flex items-center gap-4 flex-1 min-w-0 text-left group"
      >
        {/* Icon */}
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${selected ? "bg-indigo-100" : "bg-indigo-50 group-hover:bg-indigo-100"}`}>
          <svg className="w-4 h-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
        </div>

        {/* Title + meta */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-800 truncate group-hover:text-indigo-700 transition-colors">
            {meeting.title}
          </p>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className="text-xs text-slate-400">{formatDate(meeting.created_at)}</span>
            {meeting.duration_seconds && (
              <span className="text-xs text-slate-400">· {formatDuration(meeting.duration_seconds)}</span>
            )}
            {!meeting.duration_seconds && meeting.chunk_count > 0 && (
              <span className="text-xs text-slate-400">· ~{meeting.chunk_count * 30}s</span>
            )}
            {meeting.meeting_type && (
              <span className="text-xs text-slate-400">· {TYPE_LABELS[meeting.meeting_type] ?? meeting.meeting_type}</span>
            )}
          </div>
        </div>

        {/* Status badge */}
        <StatusBadge status={meeting.status} transcriptStatus={meeting.transcript_status} />

        {/* Arrow */}
        <svg className="w-4 h-4 text-slate-300 group-hover:text-indigo-400 transition-colors flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  );
}

export default function MeetingsPage() {
  const { data: meetings, isLoading } = useMeetings();
  const navigate = useNavigate();
  const createMeeting = useCreateMeeting();
  const deleteMeeting = useDeleteMeeting();
  const [starting, setStarting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (!meetings) return;
    if (selected.size === meetings.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(meetings.map((m) => m.id)));
    }
  }

  async function handleBulkDelete() {
    if (selected.size === 0) return;
    if (!window.confirm(`Delete ${selected.size} meeting${selected.size > 1 ? "s" : ""}? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      await Promise.all([...selected].map((id) => deleteMeeting.mutateAsync(id)));
      setSelected(new Set());
    } finally {
      setDeleting(false);
    }
  }

  async function handleNewRecording() {
    setStarting(true);
    try {
      const meeting = await createMeeting.mutateAsync({
        title: `Meeting – ${new Date().toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`,
      });
      navigate(`/meetings/${meeting.id}?autoRecord=1`);
    } catch {
      setStarting(false);
    }
  }

  const allSelected = !!meetings && meetings.length > 0 && selected.size === meetings.length;
  const someSelected = selected.size > 0;

  return (
    <div className="h-full overflow-y-auto px-4 py-5 md:px-8 md:py-7 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Meetings</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Record, transcribe and create content from your meetings
          </p>
        </div>
        <div className="flex items-center gap-2">
          {someSelected && (
            <button
              onClick={handleBulkDelete}
              disabled={deleting}
              className="flex items-center gap-2 px-4 py-2 bg-red-50 hover:bg-red-100 disabled:opacity-60 text-red-600 text-sm font-semibold rounded-xl border border-red-200 transition-colors"
            >
              {deleting ? (
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              )}
              Delete {selected.size}
            </button>
          )}
          <button
            onClick={handleNewRecording}
            disabled={starting}
            className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-colors"
          >
            {starting ? (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <span className="w-2.5 h-2.5 rounded-full bg-white" />
            )}
            New Recording
          </button>
        </div>
      </div>

      {/* How it works banner — shown only when empty */}
      {!isLoading && (!meetings || meetings.length === 0) && (
        <div className="bg-gradient-to-br from-indigo-50 to-violet-50 border border-indigo-100 rounded-2xl p-6 space-y-4">
          <h2 className="text-base font-bold text-slate-800">How it works</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { step: "1", title: "Install the extension", desc: "Add Postcards to Chrome, connect your API key from Settings → API Keys" },
              { step: "2", title: "Record your meeting", desc: "Open Google Meet or Teams, click the extension icon and hit Record" },
              { step: "3", title: "Create content", desc: "Stop recording — the extension uploads here automatically. Chat with AI to draft posts, campaigns, and decks." },
            ].map((s) => (
              <div key={s.step} className="flex gap-3">
                <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-600 text-xs font-bold flex items-center justify-center flex-shrink-0">
                  {s.step}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-700">{s.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* List */}
      {isLoading ? (
        <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-4">
              <div className="w-9 h-9 rounded-xl skeleton" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-48 skeleton rounded" />
                <div className="h-3 w-32 skeleton rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : meetings && meetings.length > 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100">
          {/* Select-all row */}
          <div className="flex items-center gap-3 px-5 py-2.5 bg-slate-50 rounded-t-2xl border-b border-slate-100">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleSelectAll}
              className="w-4 h-4 rounded border-slate-300 accent-indigo-600 cursor-pointer"
            />
            <span className="text-xs text-slate-500">
              {someSelected ? `${selected.size} selected` : "Select all"}
            </span>
          </div>
          {meetings.map((m) => (
            <MeetingRow key={m.id} meeting={m} selected={selected.has(m.id)} onToggle={toggleSelect} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
