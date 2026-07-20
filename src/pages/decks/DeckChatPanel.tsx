import { useRef, useState, useEffect } from "react";
import { useDeckChat, DeckChatMessage } from "../../lib/api-hooks";

interface Props {
  deckId: string;
  onClose: () => void;
  onChangesApplied: () => void;
}

interface ChatBubble {
  role: "user" | "assistant";
  text: string;
  files?: string[];
  slidesChanged?: number[];
  error?: boolean;
}

const ACCEPTED = ".pdf,.xlsx,.xls,.csv,.png,.jpg,.jpeg,.gif,.webp,.txt,.md";

export default function DeckChatPanel({ deckId, onClose, onChangesApplied }: Props) {
  const [bubbles, setBubbles] = useState<ChatBubble[]>([]);
  const [input, setInput] = useState("");
  const [attached, setAttached] = useState<File[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const chat = useDeckChat();

  // Build history for multi-turn context (text only)
  const history: DeckChatMessage[] = bubbles
    .filter((b) => !b.error)
    .map((b) => ({ role: b.role, content: b.text }));

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [bubbles, chat.isPending]);

  function handleFileAdd(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    setAttached((prev) => [...prev, ...files]);
    e.target.value = "";
  }

  function removeFile(idx: number) {
    setAttached((prev) => prev.filter((_, i) => i !== idx));
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  async function send() {
    const msg = input.trim();
    if (!msg && attached.length === 0) return;
    if (chat.isPending) return;

    const fileNames = attached.map((f) => f.name);
    setBubbles((prev) => [...prev, { role: "user", text: msg, files: fileNames }]);
    setInput("");
    const filesToSend = [...attached];
    setAttached([]);

    try {
      const result = await chat.mutateAsync({ deckId, message: msg, files: filesToSend, history });
      setBubbles((prev) => [...prev, {
        role: "assistant",
        text: result.reply,
        slidesChanged: result.slides_changed,
      }]);
      if (result.slides_changed.length > 0) {
        onChangesApplied();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong.";
      setBubbles((prev) => [...prev, { role: "assistant", text: msg, error: true }]);
    }
  }

  return (
    <div className="w-96 flex-shrink-0 bg-slate-800 border-l border-slate-700 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-700 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-indigo-400" />
          <p className="text-sm font-semibold text-white">Chat to edit</p>
        </div>
        <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {bubbles.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center gap-3 py-8">
            <div className="w-10 h-10 rounded-xl bg-indigo-900/50 flex items-center justify-center">
              <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-white">Describe your changes</p>
              <p className="text-xs text-slate-400 mt-1 max-w-xs">
                Attach PDFs, spreadsheets, or screenshots and tell me what to update.
              </p>
            </div>
            <div className="text-left w-full space-y-2 mt-2">
              {[
                "Make slide 3 more concise",
                "Update the numbers on slide 5 using this spreadsheet",
                "Match the style in this screenshot",
              ].map((ex) => (
                <button
                  key={ex}
                  onClick={() => setInput(ex)}
                  className="w-full text-left px-3 py-2 text-xs text-slate-300 bg-slate-900 hover:bg-slate-700 rounded-lg transition-colors"
                >
                  "{ex}"
                </button>
              ))}
            </div>
          </div>
        )}

        {bubbles.map((b, i) => (
          <div key={i} className={`flex ${b.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 ${
              b.role === "user"
                ? "bg-indigo-600 text-white rounded-br-sm"
                : b.error
                  ? "bg-red-900/40 border border-red-700/50 text-red-300 rounded-bl-sm"
                  : "bg-slate-700 text-slate-100 rounded-bl-sm"
            }`}>
              {/* Attached files */}
              {b.files && b.files.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {b.files.map((name) => (
                    <span key={name} className="flex items-center gap-1 px-2 py-0.5 bg-indigo-700/60 rounded text-[11px] text-indigo-200">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                      </svg>
                      {name}
                    </span>
                  ))}
                </div>
              )}
              {b.text && <p className="text-sm leading-relaxed whitespace-pre-wrap">{b.text}</p>}
              {/* Slides changed badge */}
              {b.slidesChanged && b.slidesChanged.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {b.slidesChanged.map((idx) => (
                    <span key={idx} className="px-1.5 py-0.5 bg-indigo-500/30 text-indigo-300 text-[11px] rounded font-medium">
                      Slide {idx + 1}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Thinking indicator */}
        {chat.isPending && (
          <div className="flex justify-start">
            <div className="bg-slate-700 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
              <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
              <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Attached files preview */}
      {attached.length > 0 && (
        <div className="px-3 pb-2 flex flex-wrap gap-1.5 flex-shrink-0">
          {attached.map((f, i) => (
            <span key={i} className="flex items-center gap-1.5 px-2 py-1 bg-slate-700 border border-slate-600 rounded-lg text-[11px] text-slate-300">
              <svg className="w-3 h-3 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
              <span className="max-w-[120px] truncate">{f.name}</span>
              <button onClick={() => removeFile(i)} className="text-slate-500 hover:text-red-400 transition-colors ml-0.5">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Input area */}
      <div className="px-3 pb-3 flex-shrink-0 border-t border-slate-700 pt-3">
        <div className="flex items-end gap-2 bg-slate-900 border border-slate-600 focus-within:border-indigo-500 rounded-xl px-3 py-2 transition-colors">
          <input
            ref={fileRef}
            type="file"
            multiple
            accept={ACCEPTED}
            onChange={handleFileAdd}
            className="hidden"
          />
          <button
            onClick={() => fileRef.current?.click()}
            className="p-1 text-slate-400 hover:text-indigo-400 transition-colors flex-shrink-0 mb-0.5"
            title="Attach file"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
          </button>
          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              e.target.style.height = "auto";
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
            }}
            onKeyDown={handleKeyDown}
            placeholder="Describe what to change… (Enter to send)"
            disabled={chat.isPending}
            className="flex-1 bg-transparent text-sm text-white placeholder-slate-500 resize-none focus:outline-none leading-relaxed disabled:opacity-50"
            style={{ maxHeight: 120 }}
          />
          <button
            onClick={send}
            disabled={chat.isPending || (!input.trim() && attached.length === 0)}
            className="p-1.5 text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-colors flex-shrink-0 mb-0.5"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
        <p className="text-[10px] text-slate-600 mt-1.5 text-center">Shift+Enter for new line · supports PDF, Excel, images</p>
      </div>
    </div>
  );
}
