import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import type { ChatConversation, ChatMessage } from "../../lib/api-hooks";
import {
  streamSaviMessage,
  useConversation,
  useConversations,
  useCreateConversation,
  useDeleteConversation,
} from "../../lib/api-hooks";
import { useQueryClient } from "@tanstack/react-query";

// ── Types ─────────────────────────────────────────────────────────────────────

interface DisplayMessage {
  id?: string;
  role: "user" | "assistant" | "tool";
  content: string;
  isStreaming?: boolean;
  toolName?: string;
  toolSummary?: string;
  action?: { type: string; post_id?: string };
}

// ── Message bubble ────────────────────────────────────────────────────────────

function MessageBubble({ msg, navigate }: { msg: DisplayMessage; navigate: ReturnType<typeof useNavigate> }) {
  if (msg.role === "tool") {
    return (
      <div className="flex items-center gap-2 px-4 py-2 text-xs text-slate-400">
        <svg className={`w-3 h-3 flex-shrink-0 ${msg.toolSummary ? "text-indigo-400" : "animate-spin text-indigo-300"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        <span>{msg.toolSummary || `Running ${msg.toolName}…`}</span>
      </div>
    );
  }

  if (msg.role === "user") {
    return (
      <div className="flex justify-end px-4">
        <div className="max-w-[80%] bg-gradient-to-br from-violet-600 to-indigo-600 text-white text-sm rounded-2xl rounded-tr-sm px-4 py-2.5 leading-relaxed">
          {msg.content}
        </div>
      </div>
    );
  }

  // Assistant
  return (
    <div className="flex flex-col gap-2 px-4">
      <div className="flex items-start gap-2.5">
        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center flex-shrink-0 mt-0.5">
          <span className="text-[10px] font-bold text-white">S</span>
        </div>
        <div className="flex-1">
          <div className="text-sm text-slate-800 leading-relaxed prose prose-sm prose-slate max-w-none prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5 prose-headings:my-2">
            <ReactMarkdown>{msg.content}</ReactMarkdown>
            {msg.isStreaming && (
              <span className="inline-block w-1.5 h-3.5 bg-indigo-500 ml-0.5 animate-pulse rounded-sm" />
            )}
          </div>
          {msg.action && !msg.isStreaming && (
            <button
              onClick={() => {
                if (msg.action?.type === "open_composer" && msg.action.post_id) {
                  navigate(`/composer/${msg.action.post_id}`);
                } else if (msg.action?.type === "open_pulse_ai") {
                  navigate("/spark");
                }
              }}
              className="mt-2 text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
            >
              {msg.action.type === "open_composer" ? "Open in composer →" : "View Pulse AI →"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Conversation view ──────────────────────────────────────────────────────────

function ConversationView({ conversationId }: { conversationId: string }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: conv, isLoading } = useConversation(conversationId);
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Hydrate messages from DB
  useEffect(() => {
    if (!conv?.messages) return;
    setMessages(
      conv.messages
        .filter((m: ChatMessage) => m.role === "user" || m.role === "assistant")
        .map((m: ChatMessage) => ({
          id: m.id,
          role: m.role,
          content: m.content ?? "",
          action: m.tool_action ?? undefined,
        }))
    );
  }, [conv?.messages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend() {
    const text = input.trim();
    if (!text || isStreaming) return;
    setInput("");

    // Optimistically add user message
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setIsStreaming(true);

    setMessages((prev) => [...prev, { role: "assistant", content: "", isStreaming: true }]);

    let finalAction: DisplayMessage["action"] | undefined;

    try {
      for await (const event of streamSaviMessage(conversationId, text)) {
        if (event.type === "text" && event.delta) {
          setMessages((prev) => {
            const next = [...prev];
            const last = next[next.length - 1];
            if (last?.role === "assistant") {
              next[next.length - 1] = { ...last, content: last.content + event.delta };
            }
            return next;
          });
        } else if (event.type === "tool_start") {
          setMessages((prev) => [
            ...prev,
            { role: "tool", content: "", toolName: event.name },
          ]);
        } else if (event.type === "tool_result") {
          setMessages((prev) => {
            const next = [...prev];
            // Update the last tool message
            for (let i = next.length - 1; i >= 0; i--) {
              if (next[i].role === "tool" && !next[i].toolSummary) {
                next[i] = { ...next[i], toolSummary: event.summary };
                break;
              }
            }
            return next;
          });
        } else if (event.type === "done") {
          const actions = event.tool_actions ?? [];
          finalAction = actions[0];
          setMessages((prev) => {
            const next = [...prev];
            const last = next[next.length - 1];
            if (last?.role === "assistant") {
              next[next.length - 1] = { ...last, isStreaming: false, action: finalAction };
            }
            return next;
          });
          qc.invalidateQueries({ queryKey: ["conversations"] });
          qc.invalidateQueries({ queryKey: ["conversation", conversationId] });
        } else if (event.type === "error") {
          setMessages((prev) => {
            const next = [...prev];
            const last = next[next.length - 1];
            if (last?.role === "assistant") {
              next[next.length - 1] = { ...last, content: "Something went wrong. Please try again.", isStreaming: false };
            }
            return next;
          });
        }
      }
    } finally {
      setIsStreaming(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
        Loading…
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-6 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-8">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
              <span className="text-xl font-bold text-white">S</span>
            </div>
            <p className="text-slate-700 font-semibold">Hi, I'm Savi</p>
            <p className="text-sm text-slate-400 max-w-xs">Your AI chief of staff. Ask me what to post, research a topic, or draft something from your Pulse AI feed.</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <MessageBubble key={msg.id ?? i} msg={msg} navigate={navigate} />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-slate-100 p-4">
        <div className="flex gap-2 items-end">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Ask Savi anything…"
            rows={1}
            disabled={isStreaming}
            className="flex-1 resize-none text-sm border border-slate-200 rounded-xl px-3.5 py-2.5 outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100 disabled:opacity-50 max-h-32 overflow-y-auto"
            style={{ lineHeight: "1.5" }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isStreaming}
            className="flex-shrink-0 w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center disabled:opacity-40 hover:opacity-90 transition-opacity"
          >
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
        <p className="text-[11px] text-slate-300 mt-1.5 pl-1">Enter to send · Shift+Enter for new line</p>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ChatPage() {
  const navigate = useNavigate();
  const { conversationId } = useParams<{ conversationId?: string }>();
  const { data: conversations, isLoading } = useConversations();
  const createConversation = useCreateConversation();
  const deleteConversation = useDeleteConversation();

  async function handleNewChat() {
    const conv = await createConversation.mutateAsync();
    navigate(`/chat/${conv.id}`);
  }

  function formatDate(iso: string) {
    const d = new Date(iso);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
    if (diffDays === 0) return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return d.toLocaleDateString(undefined, { weekday: "short" });
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <div className="w-64 flex-shrink-0 border-r border-slate-100 flex flex-col bg-white">
        <div className="p-4 border-b border-slate-100">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
              <span className="text-xs font-bold text-white">S</span>
            </div>
            <span className="text-sm font-bold text-slate-800">Savi</span>
          </div>
          <button
            onClick={handleNewChat}
            disabled={createConversation.isPending}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            New chat
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-2">
          {isLoading && (
            <div className="space-y-2 p-3 animate-pulse">
              {[1, 2, 3].map((i) => <div key={i} className="h-12 bg-slate-100 rounded-xl" />)}
            </div>
          )}
          {conversations?.map((conv: ChatConversation) => (
            <button
              key={conv.id}
              onClick={() => navigate(`/chat/${conv.id}`)}
              className={`w-full text-left px-3 py-2.5 mx-1 rounded-xl transition-colors group relative ${
                conversationId === conv.id
                  ? "bg-violet-50 text-violet-700"
                  : "hover:bg-slate-50 text-slate-700"
              }`}
              style={{ width: "calc(100% - 8px)" }}
            >
              <p className="text-xs font-medium truncate pr-6">
                {conv.title || "New conversation"}
              </p>
              {conv.preview && (
                <p className="text-[11px] text-slate-400 truncate mt-0.5">{conv.preview}</p>
              )}
              <span className="absolute right-2 top-2.5 text-[10px] text-slate-300">
                {formatDate(conv.updated_at)}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteConversation.mutate(conv.id);
                  if (conversationId === conv.id) navigate("/chat");
                }}
                className="absolute right-2 bottom-2 opacity-0 group-hover:opacity-100 transition-opacity text-slate-300 hover:text-red-400"
                title="Delete"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </button>
          ))}
          {!isLoading && conversations?.length === 0 && (
            <p className="text-xs text-slate-400 text-center py-8 px-4">No conversations yet. Start one above.</p>
          )}
        </div>
      </div>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-h-0">
        {conversationId ? (
          <ConversationView conversationId={conversationId} />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-8">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
              <span className="text-2xl font-bold text-white">S</span>
            </div>
            <div>
              <p className="text-slate-700 font-semibold text-lg">Hi, I'm Savi</p>
              <p className="text-sm text-slate-400 max-w-sm mt-1">
                Your AI chief of staff for LinkedIn. Start a new conversation or pick one from the sidebar.
              </p>
            </div>
            <button
              onClick={handleNewChat}
              className="px-4 py-2 text-sm font-semibold bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl hover:opacity-90 transition-opacity"
            >
              Start chatting →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
