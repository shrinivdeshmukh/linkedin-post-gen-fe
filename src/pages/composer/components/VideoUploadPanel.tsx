import { useRef, useState } from "react";
import { useVideos, type Video } from "../../../lib/api-hooks";
import api from "../../../lib/api";
import { useQueryClient } from "@tanstack/react-query";

interface VideoUploadPanelProps {
  videoId: string | null;
  onChange: (video: Video | null) => void;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function VideoUploadPanel({ videoId, onChange }: VideoUploadPanelProps) {
  const { data: library } = useVideos();
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showLibrary, setShowLibrary] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

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

    const formData = new FormData();
    formData.append("file", file);
    formData.append("title", file.name.replace(/\.[^/.]+$/, ""));

    try {
      const { data: video } = await api.post<Video>("/videos", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (evt) => {
          if (evt.total) setProgress(Math.round((evt.loaded / evt.total) * 100));
        },
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
            onClick={() => onChange(null)}
            className="text-xs text-slate-400 hover:text-red-500 transition-colors"
          >
            Remove
          </button>
        )}
      </div>

      {/* Selected video preview */}
      {selected ? (
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
