/**
 * ContextAttachmentPanel — lets the user upload a PDF or image to extract
 * context text that gets injected into the AI generation prompt.
 * The file is sent to POST /context/extract and discarded server-side.
 */
import { useRef, useState } from "react";
import api from "../../../lib/api";

interface Props {
  onContext: (text: string | null) => void;
}

export function ContextAttachmentPanel({ onContext }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [fileName, setFileName] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleFile(file: File) {
    setFileName(file.name);
    setStatus("loading");
    setErrorMsg(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await api.post<{ text: string; char_count: number }>("/context/extract", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      onContext(res.data.text);
      setStatus("done");
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        "Failed to process file.";
      setErrorMsg(msg);
      setStatus("error");
      onContext(null);
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  function handleRemove() {
    setStatus("idle");
    setFileName(null);
    setErrorMsg(null);
    onContext(null);
  }

  if (status === "done" && fileName) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-xl text-sm">
        <svg className="w-4 h-4 text-emerald-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span className="text-emerald-700 font-medium truncate flex-1">{fileName}</span>
        <span className="text-emerald-500 text-xs">Context extracted</span>
        <button
          type="button"
          onClick={handleRemove}
          className="text-emerald-400 hover:text-emerald-600 ml-1"
          title="Remove"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
      className="relative"
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,image/*"
        className="sr-only"
        onChange={handleChange}
      />
      {status === "loading" ? (
        <div className="flex items-center gap-2 px-3 py-2 bg-indigo-50 border border-indigo-200 rounded-xl text-sm text-indigo-600">
          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
          Extracting context from {fileName}…
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className={[
            "flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium border transition-all",
            status === "error"
              ? "bg-red-50 border-red-200 text-red-600 hover:bg-red-100"
              : "bg-white border-slate-200 text-slate-500 hover:border-indigo-300 hover:text-indigo-600",
          ].join(" ")}
          title="Attach a PDF or image to give AI more context"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
          </svg>
          {status === "error" ? (errorMsg ?? "Error — try again") : "Attach PDF / Image"}
        </button>
      )}
    </div>
  );
}
