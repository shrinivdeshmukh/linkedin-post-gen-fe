import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { useQueryClient } from "@tanstack/react-query";
import type { ChatMessage } from "../../lib/api-hooks";
import {
  streamSaviMessage,
  useConversation,
  useConversations,
  useCreateConversation,
} from "../../lib/api-hooks";

// ── Types ──────────────────────────────────────────────────────────────────────

interface DisplayMessage {
  id?: string;
  role: "user" | "assistant" | "tool";
  content: string;
  isStreaming?: boolean;
  toolName?: string;
  toolSummary?: string;
  action?: { type: string; post_id?: string };
}

const INACTIVITY_MS = 90_000; // 90 seconds

// ── Floating button ────────────────────────────────────────────────────────────

export default function FloatingChat() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [bounce, setBounce] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const inactivityTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasBouncedThisSession = useRef(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { data: conversations } = useConversations();
  const { data: conv } = useConversation(conversationId);
  const createConversation = useCreateConversation();

  // Hydrate messages when conversation loads
  useEffect(() => {
    if (!conv?.messages || messages.length > 0) return;
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

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Inactivity bounce — only once per session
  useEffect(() => {
    function resetTimer() {
      if (isOpen || hasBouncedThisSession.current) return;
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
      setBounce(false);
      inactivityTimer.current = setTimeout(() => {
        if (!isOpen && !hasBouncedThisSession.current) {
          setBounce(true);
          hasBouncedThisSession.current = true;
        }
      }, INACTIVITY_MS);
    }

    const events = ["mousemove", "mousedown", "keypress", "scroll", "touchstart"];
    events.forEach((e) => window.addEventListener(e, resetTimer, { passive: true }));
    resetTimer();

    return () => {
      events.forEach((e) => window.removeEventListener(e, resetTimer));
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    };
  }, [isOpen]);

  async function handleOpen() {
    setBounce(false);
    setIsOpen(true);

    // Load or create conversation
    if (!conversationId) {
      const latest = conversations?.[0];
      if (latest) {
        setConversationId(latest.id);
      } else {
        const created = await createConversation.mutateAsync();
        setConversationId(created.id);
      }
    }

    setTimeout(() => textareaRef.current?.focus(), 150);
  }

  async function handleNewChat() {
    const created = await createConversation.mutateAsync();
    setConversationId(created.id);
    setMessages([]);
  }

  async function handleSend() {
    const text = input.trim();
    if (!text || isStreaming || !conversationId) return;
    setInput("");

    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setMessages((prev) => [...prev, { role: "assistant", content: "", isStreaming: true }]);
    setIsStreaming(true);

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
          const finalAction = actions[0];
          setMessages((prev) => {
            const next = [...prev];
            const last = next[next.length - 1];
            if (last?.role === "assistant") {
              next[next.length - 1] = { ...last, isStreaming: false, action: finalAction };
            }
            return next;
          });
          qc.invalidateQueries({ queryKey: ["conversations"] });
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

  function handleActionClick(action: { type: string; post_id?: string }) {
    setIsOpen(false);
    if (action.type === "open_composer" && action.post_id) {
      navigate(`/composer/${action.post_id}`);
    } else if (action.type === "open_pulse_ai") {
      navigate("/spark");
    }
  }

  return (
    <>
      {/* Slide-over panel */}
      {isOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)}>
          <div
            className="absolute bottom-20 right-4 w-[380px] h-[560px] bg-white rounded-2xl shadow-2xl border border-slate-100 flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-gradient-to-r from-violet-600 to-indigo-600">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center">
                  <span className="text-[11px] font-bold text-white">S</span>
                </div>
                <span className="text-sm font-semibold text-white">Savi</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleNewChat}
                  title="New chat"
                  className="p-1 text-white/70 hover:text-white transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                </button>
                <button
                  onClick={() => { setIsOpen(false); navigate(`/chat/${conversationId ?? ""}`); }}
                  title="Full history"
                  className="p-1 text-white/70 hover:text-white transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                  </svg>
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 text-white/70 hover:text-white transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto py-4 space-y-3">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full gap-2 text-center px-6">
                  <p className="text-sm text-slate-500 font-medium">What can I help you with?</p>
                  <div className="flex flex-col gap-1.5 w-full">
                    {["What should I post today?", "Research AI regulation trends", "Draft a post about our latest launch"].map((s) => (
                      <button
                        key={s}
                        onClick={() => { setInput(s); textareaRef.current?.focus(); }}
                        className="text-xs text-left px-3 py-2 rounded-xl border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50 text-slate-600 transition-colors"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {messages.map((msg, i) => (
                <div key={msg.id ?? i}>
                  {msg.role === "tool" ? (
                    <div className="flex items-center gap-2 px-4 py-1 text-xs text-slate-400">
                      <svg className={`w-3 h-3 flex-shrink-0 ${msg.toolSummary ? "text-indigo-400" : "animate-spin text-indigo-300"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      <span>{msg.toolSummary || `Running ${msg.toolName}…`}</span>
                    </div>
                  ) : msg.role === "user" ? (
                    <div className="flex justify-end px-3">
                      <div className="max-w-[85%] bg-gradient-to-br from-violet-600 to-indigo-600 text-white text-sm rounded-2xl rounded-tr-sm px-3.5 py-2 leading-relaxed">
                        {msg.content}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-2 px-3">
                      <div className="w-5 h-5 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-[9px] font-bold text-white">S</span>
                      </div>
                      <div className="flex-1">
                        <div className="text-sm text-slate-800 leading-relaxed prose prose-sm prose-slate max-w-none prose-p:my-0.5 prose-ul:my-0.5 prose-ol:my-0.5 prose-li:my-0 prose-headings:my-1">
                          <ReactMarkdown>{msg.content}</ReactMarkdown>
                          {msg.isStreaming && (
                            <span className="inline-block w-1 h-3 bg-indigo-500 ml-0.5 animate-pulse rounded-sm" />
                          )}
                        </div>
                        {msg.action && !msg.isStreaming && (
                          <button
                            onClick={() => handleActionClick(msg.action!)}
                            className="mt-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                          >
                            {msg.action.type === "open_composer" ? "Open in composer →" : "View Pulse AI →"}
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="border-t border-slate-100 p-3">
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
                  className="flex-1 resize-none text-sm border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100 disabled:opacity-50 max-h-24 overflow-y-auto"
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || isStreaming}
                  className="flex-shrink-0 w-8 h-8 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center disabled:opacity-40 hover:opacity-90 transition-opacity"
                >
                  <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating button */}
      <button
        onClick={handleOpen}
        className={`fixed bottom-4 right-4 z-50 w-13 h-13 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 shadow-lg shadow-indigo-200 flex items-center justify-center hover:opacity-90 transition-all duration-200 ${bounce ? "animate-bounce" : ""}`}
        style={{ width: 52, height: 52 }}
        title="Chat with Savi"
      >
        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      </button>
    </>
  );
}
