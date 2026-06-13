import { useRef, useState } from "react";
import { useVideos, useExtractVideoContext, type Video } from "../../../lib/api-hooks";
import api from "../../../lib/api";
import { useQueryClient } from "@tanstack/react-query";

interface VideoUploadPanelProps {
  videoId: string | null;
  onChange: (video: Video | null) => void;
  onContext?: (text: string | null) => void;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function VideoUploadPanel({ videoId, onChange, onContext }: VideoUploadPanelProps) {
  const { data: library } = useVideos();
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showLibrary, setShowLibrary] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [contextStatus, setContextStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const extractVideoContext = useExtractVideoContext();

  const selected = library?.videos.find((v) => v.id === videoId) ?? null;

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ["video/mp4", "video/quicktime", "video/x-msvideo", "video/x-matroska", "video/webm"];
    if (!allowedTypes.includes(file.type)) {
      setError("Unsupported format. Use MP4, MOV, AVI, MKV, or WebM.");
      return;
    }
    if (file.size > 500 * 1024 * 1024) {
      setError("Maximum file size is 500 MB.");
      return;
    }

    setUploading(true);
    setError(null);
    setProgress(0);

    try {
      // Step 1: get presigned URL
      const { data: presign } = await api.post("/videos/presign", {
        filename: file.name,
        content_type: file.type,
        file_size: file.size,
      });

      // Step 2: upload directly to Spaces
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", presign.upload_url);
        xhr.setRequestHeader("Content-Type", file.type);
        xhr.upload.onprogress = (evt) => {
          if (evt.lengthComputable) setProgress(Math.round((evt.loaded / evt.total) * 100));
        };
        xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Upload failed: ${xhr.status}`)));
        xhr.onerror = () => reject(new Error("Network error during upload"));
        xhr.send(file);
      });

      // Step 3: confirm and get video record
      const { data: video } = await api.post<Video>("/videos/confirm", {
        key: presign.key,
        title: file.name.replace(/\.[^/.]+$/, ""),
        filename: file.name,
        file_size: file.size,
        mime_type: file.type,
      });

      qc.invalidateQueries({ queryKey: ["videos"] });
      onChange(video);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(msg ?? "Upload failed.");
    } finally {
      setUploading(false);
      setProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-semibold text-slate-700">Video</label>
        {selected && (
          <button
            type="button"
            onClick={() => { onChange(null); setContextStatus("idle"); onContext?.(null); }}
            className="text-xs text-slate-400 hover:text-red-500 transition-colors"
          >
            Remove
          </button>
        )}
      </div>

      {/* Selected video preview */}
      {selected ? (
        <>
          <div className="rounded-2xl overflow-hidden border border-slate-200 bg-slate-900">
            <video
              src={selected.spaces_url}
              controls
              className="w-full max-h-56 object-contain"
            />
            <div className="px-4 py-2.5 bg-white border-t border-slate-100 flex items-center justify-between">
              <p className="text-xs font-medium text-slate-700 truncate">{selected.title}</p>
              <span className="text-xs text-slate-400 flex-shrink-0 ml-2">{formatBytes(selected.file_size)}</span>
            </div>
          </div>

          {/* Use video as context for AI generation */}
          {onContext && (
            contextStatus === "done" ? (
              <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-xl text-sm">
                <svg className="w-4 h-4 text-emerald-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-emerald-700 font-medium flex-1 text-xs">Video analysed — AI will use it as context</span>
                <button
                  type="button"
                  onClick={() => { setContextStatus("idle"); onContext(null); }}
                  className="text-emerald-400 hover:text-emerald-600"
                  title="Remove context"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ) : contextStatus === "loading" ? (
              <div className="flex items-center gap-2 px-3 py-2 bg-indigo-50 border border-indigo-200 rounded-xl text-xs text-indigo-600">
                <svg className="w-4 h-4 animate-spin flex-shrink-0" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Analysing video… this takes ~20s
              </div>
            ) : (
              <button
                type="button"
                onClick={async () => {
                  setContextStatus("loading");
                  try {
                    const result = await extractVideoContext.mutateAsync(selected.id);
                    onContext(result.text);
                    setContextStatus("done");
                  } catch {
                    setContextStatus("error");
                    onContext(null);
                  }
                }}
                className={[
                  "flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium border transition-all w-full",
                  contextStatus === "error"
                    ? "bg-red-50 border-red-200 text-red-600 hover:bg-red-100"
                    : "bg-white border-slate-200 text-slate-500 hover:border-indigo-300 hover:text-indigo-600",
                ].join(" ")}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                {contextStatus === "error" ? "Analysis failed — try again" : "Use video as context for AI"}
              </button>
            )
          )}
        </>
      ) : (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 p-6 space-y-3 text-center">
          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center mx-auto">
            <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.677V15.32a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
            </svg>
          </div>
          <div className="flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="text-sm text-indigo-600 font-medium hover:text-indigo-700 disabled:opacity-50"
            >
              Upload video
            </button>
            {(library?.videos.length ?? 0) > 0 && (
              <>
                <span className="text-xs text-slate-300">or</span>
                <button
                  type="button"
                  onClick={() => setShowLibrary(true)}
                  className="text-sm text-indigo-600 font-medium hover:text-indigo-700"
                >
                  Choose from library
                </button>
              </>
            )}
          </div>
          <p className="text-xs text-slate-400">MP4, MOV · max 500 MB</p>
        </div>
      )}

      {/* Upload progress */}
      {uploading && (
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-slate-500">
            <span>Uploading…</span>
            <span>{progress}%</span>
          </div>
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-500 rounded-full transition-all duration-200"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Error */}
      {error && <p className="text-xs text-red-600">{error}</p>}

      <input
        ref={fileInputRef}
        type="file"
        accept=".mp4,.mov,.avi,.mkv,.webm"
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* Library picker modal */}
      {showLibrary && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowLibrary(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
              <h2 className="text-sm font-bold text-slate-900">Choose from library</h2>
              <button onClick={() => setShowLibrary(false)} className="text-slate-400 hover:text-slate-600">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="overflow-y-auto p-4 grid grid-cols-2 gap-3">
              {(library?.videos ?? []).map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => { onChange(v); setShowLibrary(false); }}
                  className="text-left rounded-xl border border-slate-200 overflow-hidden hover:border-indigo-300 hover:shadow-sm transition-all"
                >
                  <div className="bg-slate-900 aspect-video relative">
                    <video src={v.spaces_url} className="w-full h-full object-cover opacity-60" preload="metadata" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-8 h-8 rounded-full bg-white/80 flex items-center justify-center">
                        <svg className="w-3.5 h-3.5 text-slate-700 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </div>
                    </div>
                  </div>
                  <div className="px-3 py-2">
                    <p className="text-xs font-medium text-slate-800 truncate">{v.title}</p>
                    <p className="text-xs text-slate-400">{formatBytes(v.file_size)}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
