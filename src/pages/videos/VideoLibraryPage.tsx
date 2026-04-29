import { useRef, useState } from "react";
import { useVideos, useDeleteVideo, useUpdateVideo, type Video } from "../../lib/api-hooks";
import api from "../../lib/api";
import { useQueryClient } from "@tanstack/react-query";

const ACCEPTED = ".mp4,.mov,.avi,.mkv,.webm";
const MAX_BYTES = 500 * 1024 * 1024;

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function StorageBar({ used, limit }: { used: number; limit: number | null }) {
  const pct = limit ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  const warn = limit !== null && pct >= 80;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-slate-700">Video storage</span>
        <span className={warn ? "text-amber-600 font-semibold" : "text-slate-500"}>
          {formatBytes(used)} / {limit === null ? "∞" : formatBytes(limit)}
        </span>
      </div>
      {limit !== null && (
        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${pct >= 100 ? "bg-red-500" : pct >= 80 ? "bg-amber-400" : "bg-indigo-500"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  );
}

function VideoCard({ video, onDelete, deleting, onRename }: { video: Video; onDelete: () => void; deleting: boolean; onRename: (title: string) => void }) {
  const [playing, setPlaying] = useState(false);
  const [copied, setCopied] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(video.title);
  const shareUrl = `${window.location.origin}/v/${video.slug}`;

  function handleRenameSubmit() {
    const trimmed = editTitle.trim();
    if (trimmed && trimmed !== video.title) onRename(trimmed);
    setEditing(false);
  }

  function handleCopyUrl() {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden group">
      {/* Video preview */}
      <div className="relative bg-slate-900 aspect-video">
        {playing ? (
          <video src={video.spaces_url} controls autoPlay className="w-full h-full object-contain" />
        ) : (
          <>
            <video src={video.spaces_url} className="w-full h-full object-cover opacity-70" preload="metadata" />
            <button onClick={() => setPlaying(true)} className="absolute inset-0 flex items-center justify-center">
              <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <svg className="w-5 h-5 text-slate-800 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
            </button>
          </>
        )}
      </div>

      {/* Info + actions */}
      <div className="p-3 space-y-2">
        {editing ? (
          <input
            autoFocus
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onBlur={handleRenameSubmit}
            onKeyDown={(e) => { if (e.key === "Enter") handleRenameSubmit(); if (e.key === "Escape") { setEditTitle(video.title); setEditing(false); } }}
            className="w-full text-sm font-medium text-slate-800 border border-indigo-400 rounded-lg px-2 py-0.5 outline-none ring-2 ring-indigo-200"
          />
        ) : (
          <button
            type="button"
            onClick={() => { setEditTitle(video.title); setEditing(true); }}
            className="w-full text-left text-sm font-medium text-slate-800 truncate hover:text-indigo-600 transition-colors group/title flex items-center gap-1"
            title="Click to rename"
          >
            <span className="truncate">{video.title}</span>
            <svg className="w-3 h-3 text-slate-300 group-hover/title:text-indigo-400 flex-shrink-0 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </button>
        )}
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span>{formatBytes(video.file_size)}</span>
          {video.linkedin_asset_urn && <span className="text-emerald-500 font-medium">· LinkedIn ready</span>}
        </div>

        {confirmDelete ? (
          <div className="flex items-center gap-2 pt-1">
            <p className="text-xs text-red-600 flex-1">Delete this video?</p>
            <button
              onClick={() => { onDelete(); setConfirmDelete(false); }}
              disabled={deleting}
              className="text-xs font-semibold text-white bg-red-500 hover:bg-red-600 disabled:opacity-50 rounded-lg px-2.5 py-1.5 transition-colors flex items-center gap-1"
            >
              {deleting && (
                <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              )}
              {deleting ? "Deleting…" : "Yes, delete"}
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              disabled={deleting}
              className="text-xs text-slate-500 border border-slate-200 rounded-lg px-2.5 py-1.5 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 pt-1">
            <button
              onClick={handleCopyUrl}
              className="flex-1 text-xs text-indigo-600 border border-indigo-200 rounded-lg px-2.5 py-1.5 hover:bg-indigo-50 transition-colors font-medium"
            >
              {copied ? "Copied!" : "Copy share link"}
            </button>
            <a
              href={shareUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-slate-500 border border-slate-200 rounded-lg px-2.5 py-1.5 hover:bg-slate-50 hover:border-slate-300 transition-colors"
              title="Open public page"
            >
              ↗
            </a>
            <a
              href={video.spaces_url}
              download
              className="text-xs text-slate-500 border border-slate-200 rounded-lg px-2.5 py-1.5 hover:bg-slate-50 hover:border-slate-300 transition-colors"
              title="Download"
            >
              ↓
            </a>
            <button
              onClick={() => setConfirmDelete(true)}
              className="text-xs text-red-400 border border-red-100 rounded-lg px-2.5 py-1.5 hover:bg-red-50 hover:border-red-200 transition-colors"
            >
              Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function VideoLibraryPage() {
  const { data: library, isLoading } = useVideos();
  const deleteVideo = useDeleteVideo();
  const updateVideo = useUpdateVideo();
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ["video/mp4", "video/quicktime", "video/x-msvideo", "video/x-matroska", "video/webm"];
    if (!allowedTypes.includes(file.type)) {
      setError("Unsupported format. Please upload MP4, MOV, AVI, MKV, or WebM.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("File is too large. Maximum size is 500 MB.");
      return;
    }

    setUploading(true);
    setError(null);
    setProgress(0);

    try {
      // Step 1: get a presigned URL from the backend (fast)
      const { data: presign } = await api.post("/videos/presign", {
        filename: file.name,
        content_type: file.type,
        file_size: file.size,
      });

      // Step 2: PUT directly to Spaces (bypasses backend timeout)
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", presign.upload_url);
        xhr.setRequestHeader("Content-Type", file.type);
        xhr.upload.onprogress = (ev) => {
          if (ev.lengthComputable) setProgress(Math.round((ev.loaded / ev.total) * 100));
        };
        xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Spaces upload failed: ${xhr.status}`)));
        xhr.onerror = () => reject(new Error("Network error during upload"));
        xhr.send(file);
      });

      // Step 3: tell the backend to record the video
      await api.post("/videos/confirm", {
        key: presign.key,
        title: file.name.replace(/\.[^/.]+$/, ""),
        filename: file.name,
        file_size: file.size,
        mime_type: file.type,
      });

      qc.invalidateQueries({ queryKey: ["videos"] });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(msg ?? "Upload failed. Please try again.");
    } finally {
      setUploading(false);
      setProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  const videos = library?.videos ?? [];
  const usedBytes = library?.total_storage_bytes ?? 0;
  const limitBytes = library?.storage_limit_bytes ?? null;

  return (
    <div className="h-full overflow-y-auto px-4 py-5 md:px-8 md:py-7 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Video Library</h1>
          <p className="text-sm text-slate-500 mt-0.5">Upload and manage videos for LinkedIn posts</p>
        </div>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          Upload video
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED}
          className="hidden"
          onChange={handleFileSelect}
        />
      </div>

      {/* Storage bar */}
      <div className="bg-white rounded-2xl border border-slate-200 px-5 py-4">
        <StorageBar used={usedBytes} limit={limitBytes} />
      </div>

      {/* Upload progress */}
      {uploading && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-2xl px-5 py-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-indigo-700">Uploading…</span>
            <span className="text-indigo-500">{progress}%</span>
          </div>
          <div className="h-1.5 bg-indigo-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-500 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl px-5 py-3 flex items-center justify-between">
          <p className="text-sm text-red-700">{error}</p>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Videos grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl bg-slate-100 aspect-video animate-pulse" />
          ))}
        </div>
      ) : videos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.677V15.32a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-slate-600">No videos yet</p>
          <p className="text-xs text-slate-400">Upload an MP4 or MOV to get started</p>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="text-sm text-indigo-600 font-medium hover:text-indigo-700"
          >
            Upload your first video
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {videos.map((video) => (
            <VideoCard
              key={video.id}
              video={video}
              onDelete={() => deleteVideo.mutate(video.id)}
              deleting={deleteVideo.isPending && deleteVideo.variables === video.id}
              onRename={(title) => updateVideo.mutate({ id: video.id, title })}
            />
          ))}
        </div>
      )}
    </div>
  );
}
