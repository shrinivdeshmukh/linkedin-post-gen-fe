import { useRef, useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { useMeeting, useUpdateMeeting, useDeleteMeeting, type MeetingSuggestion } from "../../lib/api-hooks";
import { useWebRecorder } from "../../hooks/useWebRecorder";
import api from "../../lib/api";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDuration(secs: number | null): string {
  if (!secs) return "—";
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short", day: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

const TYPE_LABELS: Record<string, string> = {
  customer: "Customer call", investor: "Investor call",
  team: "Team meeting", board: "Board meeting", general: "General meeting",
};

// ── Audio Player ──────────────────────────────────────────────────────────────

function AudioPlayer({ src }: { src: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  function togglePlay() {
    const a = audioRef.current;
    if (!a) return;
    if (playing) { a.pause(); setPlaying(false); }
    else { a.play(); setPlaying(true); }
  }

  function handleSeek(e: React.ChangeEvent<HTMLInputElement>) {
    const a = audioRef.current;
    if (!a) return;
    a.currentTime = Number(e.target.value);
    setCurrentTime(Number(e.target.value));
  }

  function fmt(s: number) {
    if (!isFinite(s) || isNaN(s)) return "0:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  }

  return (
    <div className="flex items-center gap-3 bg-slate-50 rounded-xl px-4 py-3 border border-slate-200">
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onDurationChange={(e) => setDuration(e.currentTarget.duration)}
        onEnded={() => setPlaying(false)}
      />
      <button
        onClick={togglePlay}
        className="w-9 h-9 rounded-full bg-indigo-600 hover:bg-indigo-700 flex items-center justify-center text-white flex-shrink-0 transition-colors"
      >
        {playing ? (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <rect x="6" y="4" width="4" height="16" rx="1" />
            <rect x="14" y="4" width="4" height="16" rx="1" />
          </svg>
        ) : (
          <svg className="w-4 h-4 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
      </button>
      <div className="flex-1 space-y-1">
        <input
          type="range" min={0} max={duration || 0} value={currentTime}
          onChange={handleSeek}
          className="w-full h-1.5 accent-indigo-600 cursor-pointer"
        />
        <div className="flex justify-between text-xs text-slate-400">
          <span>{fmt(currentTime)}</span>
          <span>{fmt(duration)}</span>
        </div>
      </div>
      <a href={src} download className="text-slate-400 hover:text-slate-600 transition-colors" title="Download">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
      </a>
    </div>
  );
}

// ── Transcript Panel ──────────────────────────────────────────────────────────

type TranscriptChunk = {
  seq: number;
  speaker: string;
  start?: string;
  end?: string;
  text: string;
};

// Assign a stable color index to each unique speaker label
const SPEAKER_COLORS = [
  { bar: "bg-indigo-400", label: "text-indigo-600", bg: "bg-indigo-50" },
  { bar: "bg-violet-400", label: "text-violet-600", bg: "bg-violet-50" },
  { bar: "bg-emerald-400", label: "text-emerald-600", bg: "bg-emerald-50" },
  { bar: "bg-amber-400", label: "text-amber-600", bg: "bg-amber-50" },
  { bar: "bg-rose-400", label: "text-rose-600", bg: "bg-rose-50" },
  { bar: "bg-cyan-400", label: "text-cyan-600", bg: "bg-cyan-50" },
];

function speakerColor(speaker: string, speakerIndex: Map<string, number>) {
  if (!speakerIndex.has(speaker)) speakerIndex.set(speaker, speakerIndex.size);
  return SPEAKER_COLORS[speakerIndex.get(speaker)! % SPEAKER_COLORS.length];
}

function TranscriptPanel({ chunks, status }: {
  chunks: TranscriptChunk[] | null;
  status: string;
}) {
  if ((status === "processing" || status === "recording") && (!chunks || chunks.length === 0)) {
    return (
      <div className="flex items-center gap-2 py-8 justify-center text-sm text-slate-400">
        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        Transcribing…
      </div>
    );
  }
  if (!chunks || chunks.length === 0) {
    return <p className="py-8 text-center text-sm text-slate-400">No transcript yet.</p>;
  }

  const speakerIndex = new Map<string, number>();

  return (
    <div className="space-y-3 text-sm">
      {chunks.map((c, i) => {
        const color = speakerColor(c.speaker, speakerIndex);
        return (
          <div key={i} className="flex gap-3">
            <div className={`w-1 rounded-full flex-shrink-0 mt-1 ${color.bar}`} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className={`text-[11px] font-bold uppercase tracking-wide ${color.label}`}>
                  {c.speaker}
                </span>
                {c.start && (
                  <span className="text-[11px] text-slate-400 font-mono">{c.start}</span>
                )}
              </div>
              <p className="text-slate-700 leading-relaxed">{c.text}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Chat Panel ────────────────────────────────────────────────────────────────

type ChatMessage = { role: "user" | "assistant"; content: string };

const QUICK_PROMPTS = [
  "Summarize this meeting",
  "List action items",
  "Draft a LinkedIn post from the key insights",
  "What were the main decisions?",
];

function ChatPanel({ meetingId, transcriptReady }: { meetingId: string; transcriptReady: boolean }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send(text: string) {
    if (!text.trim() || streaming) return;
    const userMsg: ChatMessage = { role: "user", content: text.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setStreaming(true);

    let assistantText = "";
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    try {
      const token = await (await import("../../lib/firebase")).auth.currentUser?.getIdToken();
      const res = await fetch(`${api.defaults.baseURL}/meetings/${meetingId}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: text.trim(),
          history: messages.slice(-10).map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6);
          if (data === "[DONE]") break;
          try {
            assistantText += JSON.parse(data);
          } catch {
            assistantText += data; // fallback for plain-text chunks
          }
          setMessages((prev) => [
            ...prev.slice(0, -1),
            { role: "assistant", content: assistantText },
          ]);
        }
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev.slice(0, -1),
        { role: "assistant", content: "Something went wrong. Please try again." },
      ]);
    } finally {
      setStreaming(false);
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
        {messages.length === 0 && (
          <div className="space-y-2">
            <p className="text-xs text-slate-400 text-center py-2">Ask anything about this meeting</p>
            {!transcriptReady && (
              <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2 text-center">
                Transcript is still processing — responses will improve once it's ready
              </p>
            )}
            <div className="grid grid-cols-1 gap-1.5 pt-1">
              {QUICK_PROMPTS.map((p) => (
                <button
                  key={p}
                  onClick={() => send(p)}
                  className="text-left text-xs px-3 py-2 rounded-lg border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 text-slate-600 hover:text-indigo-700 transition-colors"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
              m.role === "user"
                ? "bg-indigo-600 text-white rounded-br-sm whitespace-pre-wrap"
                : "bg-white border border-slate-200 text-slate-700 rounded-bl-sm"
            }`}>
              {m.role === "assistant" && m.content ? (
                <ReactMarkdown components={{
                  h1: ({children}) => <p className="font-semibold mb-1">{children}</p>,
                  h2: ({children}) => <p className="font-semibold mb-1">{children}</p>,
                  h3: ({children}) => <p className="font-semibold mb-1">{children}</p>,
                  p: ({children}) => <p className="mb-1 last:mb-0">{children}</p>,
                  ul: ({children}) => <ul className="list-disc ml-4 my-1 space-y-0.5">{children}</ul>,
                  ol: ({children}) => <ol className="list-decimal ml-4 my-1 space-y-0.5">{children}</ol>,
                  li: ({children}) => <li className="leading-snug">{children}</li>,
                  strong: ({children}) => <strong className="font-semibold">{children}</strong>,
                  code: ({children}) => <code className="bg-slate-100 rounded px-1 text-xs font-mono">{children}</code>,
                }}>{m.content}</ReactMarkdown>
              ) : m.content || (
                <span className="inline-flex gap-1 items-center text-slate-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-300 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-300 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-300 animate-bounce" style={{ animationDelay: "300ms" }} />
                </span>
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-slate-100">
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
            placeholder="Ask about this meeting…"
            rows={2}
            className="flex-1 text-sm border border-slate-200 rounded-xl px-3 py-2 resize-none outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 placeholder:text-slate-400"
          />
          <button
            onClick={() => send(input)}
            disabled={!input.trim() || streaming}
            className="w-9 h-9 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white flex items-center justify-center flex-shrink-0 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Suggestions ───────────────────────────────────────────────────────────────

const SUGGESTION_ICONS: Record<string, React.ReactNode> = {
  post: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  ),
  campaign: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
    </svg>
  ),
  deck: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
    </svg>
  ),
};

const SUGGESTION_COLORS: Record<string, string> = {
  post: "bg-indigo-50 text-indigo-600 border-indigo-100",
  campaign: "bg-violet-50 text-violet-600 border-violet-100",
  deck: "bg-amber-50 text-amber-600 border-amber-100",
};

function SuggestionCard({ s, onUse }: { s: MeetingSuggestion; onUse: (s: MeetingSuggestion) => void }) {
  return (
    <div className="flex items-start gap-3 p-4 bg-white rounded-xl border border-slate-200 hover:border-indigo-200 hover:shadow-sm transition-all group">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 border ${SUGGESTION_COLORS[s.type] ?? "bg-slate-50 text-slate-500 border-slate-100"}`}>
        {SUGGESTION_ICONS[s.type]}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{s.type}</span>
        </div>
        <p className="text-sm font-semibold text-slate-800 leading-snug">{s.title}</p>
        <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{s.context}</p>
      </div>
      <button
        onClick={() => onUse(s)}
        className="flex-shrink-0 text-xs font-semibold text-indigo-600 border border-indigo-200 rounded-lg px-2.5 py-1.5 hover:bg-indigo-50 transition-colors opacity-0 group-hover:opacity-100"
      >
        Use
      </button>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

function fmtElapsed(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

export default function MeetingDetailPage() {
  const { meetingId } = useParams<{ meetingId: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: meeting, isLoading, refetch } = useMeeting(meetingId ?? null);
  const updateMeeting = useUpdateMeeting();
  const deleteMeeting = useDeleteMeeting();
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [activeTab, setActiveTab] = useState<"transcript" | "analysis">("transcript");

  const recorder = useWebRecorder();

  // Auto-start recording if ?autoRecord=1 is in URL
  useEffect(() => {
    if (!meetingId || !searchParams.get("autoRecord")) return;
    // Remove param immediately so refresh doesn't re-trigger
    setSearchParams({}, { replace: true });
    recorder.start(meetingId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meetingId]);

  // After saving, refetch the meeting to show transcript status
  useEffect(() => {
    if (recorder.phase === "done") refetch();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recorder.phase]);

  function saveTitle() {
    if (!meeting || !titleDraft.trim() || titleDraft.trim() === meeting.title) {
      setEditingTitle(false);
      return;
    }
    updateMeeting.mutate({ id: meeting.id, title: titleDraft.trim() });
    setEditingTitle(false);
  }

  async function handleDelete() {
    if (!meeting) return;
    if (!window.confirm(`Delete "${meeting.title}"? This cannot be undone.`)) return;
    await deleteMeeting.mutateAsync(meeting.id);
    navigate("/meetings");
  }

  function handleUseSuggestion(s: MeetingSuggestion) {
    if (s.type === "post") {
      navigate("/composer", { state: { spark: { topic: s.title, rawContext: s.context } } });
    } else if (s.type === "campaign") {
      navigate("/campaigns/new", { state: { spark: { topic: s.title, rawContext: s.context } } });
    } else if (s.type === "deck") {
      navigate("/decks/new", { state: { spark: { topic: s.title, rawContext: s.context } } });
    }
  }

  if (isLoading) {
    return (
      <div className="h-full overflow-y-auto px-4 py-5 md:px-8 md:py-7 space-y-4">
        <div className="h-8 w-64 skeleton rounded-xl" />
        <div className="h-4 w-48 skeleton rounded" />
        <div className="h-20 skeleton rounded-xl" />
        <div className="h-96 skeleton rounded-xl" />
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-sm text-slate-400">Meeting not found.</p>
      </div>
    );
  }

  const isProcessing = meeting.status === "processing" || meeting.transcript_status === "processing";

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Top bar */}
      <div className="px-4 py-4 md:px-8 border-b border-slate-100 bg-white flex-shrink-0">
        <button
          onClick={() => navigate("/meetings")}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 transition-colors mb-3"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          All meetings
        </button>

        <div className="flex items-start gap-3 flex-wrap">
          <div className="flex-1 min-w-0">
            {editingTitle ? (
              <input
                autoFocus
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                onBlur={saveTitle}
                onKeyDown={(e) => { if (e.key === "Enter") saveTitle(); if (e.key === "Escape") setEditingTitle(false); }}
                className="text-xl font-bold text-slate-900 border border-indigo-400 rounded-lg px-2 py-0.5 outline-none ring-2 ring-indigo-200 w-full"
              />
            ) : (
              <button
                onClick={() => { setTitleDraft(meeting.title); setEditingTitle(true); }}
                className="text-xl font-bold text-slate-900 hover:text-indigo-700 transition-colors text-left flex items-center gap-2 group"
              >
                {meeting.title}
                <svg className="w-4 h-4 text-slate-300 group-hover:text-indigo-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>
            )}
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              <span className="text-xs text-slate-400">{formatDate(meeting.created_at)}</span>
              {meeting.duration_seconds && <span className="text-xs text-slate-400">· {formatDuration(meeting.duration_seconds)}</span>}
              {meeting.meeting_type && <span className="text-xs text-slate-400">· {TYPE_LABELS[meeting.meeting_type] ?? meeting.meeting_type}</span>}
            </div>
          </div>

          {/* Status pill */}
          {isProcessing && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-amber-50 text-amber-600 border border-amber-100">
              <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Analyzing…
            </span>
          )}

          {/* Delete button */}
          <button
            onClick={handleDelete}
            disabled={deleteMeeting.isPending}
            title="Delete meeting"
            className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Recording banner */}
      {(recorder.phase === "requesting" || recorder.phase === "recording" || recorder.phase === "saving") && (
        <div className={`flex-shrink-0 flex items-center gap-3 px-4 md:px-8 py-3 border-b ${
          recorder.phase === "saving" ? "bg-amber-50 border-amber-100" : "bg-red-50 border-red-100"
        }`}>
          {recorder.phase === "requesting" && (
            <svg className="w-4 h-4 animate-spin text-red-500 flex-shrink-0" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          )}
          {recorder.phase === "recording" && (
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
          )}
          {recorder.phase === "saving" && (
            <svg className="w-4 h-4 animate-spin text-amber-500 flex-shrink-0" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          )}

          <span className={`text-sm font-semibold ${recorder.phase === "saving" ? "text-amber-700" : "text-red-600"}`}>
            {recorder.phase === "requesting" && "Starting recording…"}
            {recorder.phase === "saving" && "Saving your meeting…"}
            {recorder.phase === "recording" && (
              <>Recording · <span className="font-mono">{fmtElapsed(recorder.elapsed)}</span></>
            )}
          </span>

          {recorder.phase === "recording" && (
            <span className="text-xs text-red-400 hidden sm:inline">Mic recording</span>
          )}

          <div className="flex-1" />

          {recorder.phase === "recording" && (
            <button
              onClick={() => recorder.stop()}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-semibold rounded-lg transition-colors"
            >
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                <rect x="4" y="4" width="16" height="16" rx="2" />
              </svg>
              Stop & Save
            </button>
          )}
        </div>
      )}

      {/* Recorder error */}
      {recorder.phase === "error" && recorder.error && (
        <div className="flex-shrink-0 flex items-center gap-2 px-4 md:px-8 py-3 bg-red-50 border-b border-red-100 text-sm text-red-600">
          <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          {recorder.error}
        </div>
      )}

      {/* Body: two-column on desktop */}
      <div className="flex-1 overflow-hidden flex flex-col lg:flex-row min-h-0">

        {/* Left: audio + transcript + analysis */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-5 min-w-0">

          {/* Audio player */}
          {meeting.spaces_url ? (
            <AudioPlayer src={meeting.spaces_url} />
          ) : (
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
              Audio will appear here after recording ends
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
            {(["transcript", "analysis"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize ${
                  activeTab === tab ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {activeTab === "transcript" && (
            <TranscriptPanel chunks={meeting.transcript_json} status={meeting.transcript_status} />
          )}

          {activeTab === "analysis" && (
            <div className="space-y-5">
              {isProcessing && !meeting.summary && (
                <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 rounded-xl px-4 py-3">
                  <svg className="w-4 h-4 animate-spin flex-shrink-0" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  AI is analyzing the transcript…
                </div>
              )}

              {meeting.summary && (
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-2">Summary</h3>
                  <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 rounded-xl px-4 py-3 border border-slate-100">
                    {meeting.summary}
                  </p>
                </div>
              )}

              {meeting.key_points_json && meeting.key_points_json.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-2">Key Points</h3>
                  <ul className="space-y-2">
                    {meeting.key_points_json.map((p, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-sm text-slate-700">
                        <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                          {i + 1}
                        </span>
                        {p}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {meeting.action_items_json && meeting.action_items_json.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-2">Action Items</h3>
                  <ul className="space-y-1.5">
                    {meeting.action_items_json.map((a, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                        <svg className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {a}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {!meeting.summary && !isProcessing && (
                <p className="text-sm text-slate-400 text-center py-6">
                  Analysis will appear once the meeting is finalized.
                </p>
              )}
            </div>
          )}

          {/* Suggestions */}
          {meeting.suggestions_json && meeting.suggestions_json.length > 0 && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">
                ✦ Content Suggestions
              </h3>
              <div className="space-y-2">
                {meeting.suggestions_json.map((s, i) => (
                  <SuggestionCard key={i} s={s} onUse={handleUseSuggestion} />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: chat */}
        <div className="w-full lg:w-80 xl:w-96 border-t lg:border-t-0 lg:border-l border-slate-100 flex flex-col min-h-0 bg-white" style={{ height: "100%" }}>
          <div className="px-4 py-3 border-b border-slate-100 flex-shrink-0">
            <h2 className="text-sm font-semibold text-slate-700">Chat with this meeting</h2>
            <p className="text-xs text-slate-400 mt-0.5">Ask questions, get summaries, create content</p>
          </div>
          <div className="flex-1 min-h-0">
            <ChatPanel meetingId={meeting.id} transcriptReady={meeting.transcript_status === "done"} />
          </div>
        </div>
      </div>
    </div>
  );
}
