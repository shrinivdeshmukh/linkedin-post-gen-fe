import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  useMediaCollections,
  useMediaCollection,
  useCreateMediaCollection,
  useRenameMediaCollection,
  useDeleteMediaCollection,
  useUploadToCollection,
  useDeleteMediaItem,
  useVideos,
  useDeleteVideo,
  usePodcastJobs,
  useDeletePodcastJob,
  type MediaCollection,
  type MediaItem,
  type Video,
  type PodcastJob,
} from "../../lib/api-hooks";
import api from "../../lib/api";
import axios from "axios";
import { useQueryClient } from "@tanstack/react-query";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

// ─── Collection card ─────────────────────────────────────────────────────────

function CollectionCard({
  collection,
  onOpen,
  onRename,
  onDelete,
}: {
  collection: MediaCollection;
  onOpen: () => void;
  onRename: (name: string) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(collection.name);

  function submitRename() {
    const t = draft.trim();
    if (t && t !== collection.name) onRename(t);
    setEditing(false);
  }

  return (
    <div className="group bg-white rounded-2xl border border-slate-200 overflow-hidden hover:border-indigo-200 hover:shadow-sm transition-all cursor-pointer">
      {/* Thumbnail */}
      <div className="aspect-video bg-slate-100 relative overflow-hidden" onClick={onOpen}>
        {collection.thumbnail_url ? (
          <img src={collection.thumbnail_url} alt={collection.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg className="w-8 h-8 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}
        {collection.campaign_id && (
          <span className="absolute top-2 left-2 bg-indigo-600 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full">Campaign</span>
        )}
      </div>

      {/* Footer */}
      <div className="px-3 py-2.5 flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1" onClick={onOpen}>
          {editing ? (
            <input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={submitRename}
              onKeyDown={(e) => { if (e.key === "Enter") submitRename(); if (e.key === "Escape") setEditing(false); }}
              onClick={(e) => e.stopPropagation()}
              className="w-full text-sm font-medium text-slate-900 border-b border-indigo-400 bg-transparent outline-none"
            />
          ) : (
            <p className="text-sm font-medium text-slate-800 truncate">{collection.name}</p>
          )}
          <p className="text-xs text-slate-400">{collection.item_count} image{collection.item_count !== 1 ? "s" : ""}</p>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          <button
            type="button"
            title="Rename"
            onClick={(e) => { e.stopPropagation(); setEditing(true); setDraft(collection.name); }}
            className="p-1 text-slate-400 hover:text-indigo-600 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </button>
          <button
            type="button"
            title="Delete"
            onClick={(e) => { e.stopPropagation(); if (confirm(`Delete collection "${collection.name}"? This will also delete all images inside.`)) onDelete(); }}
            className="p-1 text-slate-400 hover:text-red-500 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Collection detail drawer ─────────────────────────────────────────────────

function CollectionDetail({
  collectionId,
  onClose,
}: {
  collectionId: string;
  onClose: () => void;
}) {
  const { data: collection, isLoading } = useMediaCollection(collectionId);
  const uploadRef = useRef<HTMLInputElement>(null);
  const upload = useUploadToCollection();
  const deleteItem = useDeleteMediaItem();
  const [lightbox, setLightbox] = useState<MediaItem | null>(null);

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative ml-auto w-full max-w-2xl bg-white h-full flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 flex-shrink-0">
          <div>
            <h2 className="text-base font-semibold text-slate-900">{collection?.name ?? "Collection"}</h2>
            <p className="text-xs text-slate-400">{collection?.items.length ?? 0} images</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => uploadRef.current?.click()}
              disabled={upload.isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl transition-colors"
            >
              {upload.isPending ? (
                <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
              ) : (
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
              )}
              Upload image
            </button>
            <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors p-1">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
        </div>
        <input
          ref={uploadRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            Array.from(e.target.files ?? []).forEach((f) =>
              upload.mutate({ collectionId, file: f })
            );
            e.target.value = "";
          }}
        />

        {/* Grid */}
        <div className="flex-1 overflow-y-auto p-5">
          {isLoading ? (
            <div className="grid grid-cols-3 gap-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="aspect-square bg-slate-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : !collection?.items.length ? (
            <div
              className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-slate-200 rounded-2xl cursor-pointer hover:border-indigo-300 transition-colors"
              onClick={() => uploadRef.current?.click()}
            >
              <svg className="w-10 h-10 text-slate-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
              <p className="text-sm text-slate-500 font-medium">No images yet</p>
              <p className="text-xs text-slate-400 mt-1">Click to upload images</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {collection.items.map((item) => (
                <div key={item.id} className="group relative aspect-square rounded-xl overflow-hidden border border-slate-200 cursor-pointer" onClick={() => setLightbox(item)}>
                  <img src={item.spaces_url} alt={item.title} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                    <button
                      type="button"
                      title="Delete"
                      onClick={(e) => { e.stopPropagation(); if (confirm("Delete this image?")) deleteItem.mutate(item.id); }}
                      className="opacity-0 group-hover:opacity-100 p-1.5 bg-red-500 text-white rounded-lg transition-opacity"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                    </button>
                  </div>
                  {item.source === "generated" && (
                    <span className="absolute bottom-1.5 right-1.5 bg-black/60 text-white text-[9px] font-medium px-1.5 py-0.5 rounded-full">AI</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/80" onClick={() => setLightbox(null)}>
          <img src={lightbox.spaces_url} alt={lightbox.title} className="max-w-full max-h-full rounded-xl object-contain" />
        </div>
      )}
    </div>
  );
}

// ─── Videos tab (reused from VideoLibraryPage) ────────────────────────────────

const VIDEO_ACCEPTED = ".mp4,.mov,.avi,.mkv,.webm";
const VIDEO_MAX_BYTES = 5 * 1024 * 1024 * 1024;
const MULTIPART_THRESHOLD = 100 * 1024 * 1024;
const MULTIPART_PART_SIZE = 100 * 1024 * 1024;

function VideoCard({ video, onDelete, deleting }: { video: Video; onDelete: () => void; deleting: boolean }) {
  const navigate = useNavigate();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [copied, setCopied] = useState(false);
  const shareUrl = `${window.location.origin}/v/${video.slug}`;

  const statusColors: Record<string, string> = {
    done: "bg-green-100 text-green-700",
    processing: "bg-blue-100 text-blue-600",
    pending: "bg-amber-100 text-amber-600",
    failed: "bg-red-100 text-red-600",
    none: "bg-slate-100 text-slate-400",
  };
  const statusLabels: Record<string, string> = {
    done: "Transcribed",
    processing: "Transcribing…",
    pending: "Queued…",
    failed: "Failed",
    none: "",
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:border-indigo-200 hover:shadow-sm transition-all">
      {/* Thumbnail / play area — clicking opens detail page */}
      <button
        type="button"
        onClick={() => navigate(`/media/videos/${video.id}`)}
        className="w-full aspect-video bg-slate-900 flex items-center justify-center group"
      >
        <div className="w-12 h-12 bg-white/20 group-hover:bg-white/30 rounded-full flex items-center justify-center transition-colors">
          <svg className="w-5 h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
        </div>
      </button>

      <div className="p-3 space-y-2">
        <button
          type="button"
          onClick={() => navigate(`/media/videos/${video.id}`)}
          className="w-full text-left text-sm font-medium text-slate-800 truncate hover:text-indigo-600 transition-colors"
        >
          {video.title}
        </button>
        <div className="flex items-center gap-2">
          <p className="text-xs text-slate-400">{formatBytes(video.file_size)}</p>
          {video.transcript_status !== "none" ? (
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${statusColors[video.transcript_status]}`}>
              {statusLabels[video.transcript_status]}
            </span>
          ) : (video.duration_seconds ?? 0) > 600 ? (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-400">
              Transcribe manually
            </span>
          ) : null}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => { navigator.clipboard.writeText(shareUrl); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
            className="flex-1 text-xs font-medium px-3 py-1.5 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 transition-colors"
          >
            {copied ? "Copied!" : "Copy link"}
          </button>
          {!confirmDelete ? (
            <button type="button" onClick={() => setConfirmDelete(true)} className="text-xs font-medium px-3 py-1.5 border border-slate-200 rounded-xl hover:border-red-200 hover:text-red-500 text-slate-400 transition-colors">Delete</button>
          ) : (
            <button type="button" onClick={onDelete} disabled={deleting} className="text-xs font-medium px-3 py-1.5 bg-red-500 text-white rounded-xl disabled:opacity-50 transition-colors">{deleting ? "…" : "Confirm"}</button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Podcast card ─────────────────────────────────────────────────────────────

function PodcastCard({ job, onDelete, deleting }: { job: PodcastJob; onDelete: () => void; deleting: boolean }) {
  const [playing, setPlaying] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  function formatDuration(s: number | null) {
    if (!s) return "";
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  }

  function togglePlay() {
    if (!audioRef.current) return;
    if (playing) { audioRef.current.pause(); setPlaying(false); }
    else { audioRef.current.play(); setPlaying(true); }
  }

  const title = job.config?.host1_name && job.config?.host2_name
    ? `${job.config.host1_name} & ${job.config.host2_name}`
    : "Podcast";
  const date = new Date(job.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" });

  const statusColors: Record<string, string> = {
    complete: "bg-green-100 text-green-700",
    scripting: "bg-blue-100 text-blue-600",
    generating: "bg-indigo-100 text-indigo-600",
    pending: "bg-amber-100 text-amber-600",
    failed: "bg-red-100 text-red-600",
  };
  const statusLabels: Record<string, string> = {
    complete: "Ready",
    scripting: "Writing script…",
    generating: "Synthesising…",
    pending: "Queued…",
    failed: "Failed",
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:border-indigo-200 hover:shadow-sm transition-all">
      {/* Waveform / play area */}
      <div className="bg-gradient-to-br from-indigo-50 to-purple-50 px-4 py-5 flex items-center gap-3">
        <button
          type="button"
          onClick={togglePlay}
          disabled={job.status !== "complete"}
          className="w-10 h-10 flex-shrink-0 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-full flex items-center justify-center transition-colors"
        >
          {playing ? (
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
          ) : (
            <svg className="w-4 h-4 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
          )}
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-800 truncate">{title}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-slate-400">{date}</span>
            {job.duration_seconds && <span className="text-xs text-slate-400">{formatDuration(job.duration_seconds)}</span>}
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${statusColors[job.status]}`}>
              {statusLabels[job.status]}
            </span>
          </div>
        </div>
      </div>

      {job.audio_url && (
        <audio ref={audioRef} src={job.audio_url} onEnded={() => setPlaying(false)} preload="none" />
      )}

      {/* Footer actions */}
      <div className="px-3 py-2.5 flex items-center gap-2">
        {job.audio_url && (
          <a
            href={job.audio_url}
            download
            className="flex-1 text-xs font-medium px-3 py-1.5 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 transition-colors text-center"
          >
            Download
          </a>
        )}
        {!confirmDelete ? (
          <button type="button" onClick={() => setConfirmDelete(true)}
            className="text-xs font-medium px-3 py-1.5 border border-slate-200 rounded-xl hover:border-red-200 hover:text-red-500 text-slate-400 transition-colors">
            Delete
          </button>
        ) : (
          <button type="button" onClick={onDelete} disabled={deleting}
            className="text-xs font-medium px-3 py-1.5 bg-red-500 text-white rounded-xl disabled:opacity-50 transition-colors">
            {deleting ? "…" : "Confirm"}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function MediaLibraryPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<"images" | "videos" | "podcasts">("images");
  const [openCollectionId, setOpenCollectionId] = useState<string | null>(null);
  const [newCollectionName, setNewCollectionName] = useState("");
  const [showNewCollection, setShowNewCollection] = useState(false);

  const { data: collections, isLoading: collectionsLoading } = useMediaCollections();
  const createCollection = useCreateMediaCollection();
  const renameCollection = useRenameMediaCollection();
  const deleteCollection = useDeleteMediaCollection();

  // Videos
  const { data: videoLibrary } = useVideos();

  // Podcasts
  const { data: podcastJobs } = usePodcastJobs();
  const deletePodcast = useDeletePodcastJob();
  const deleteVideo = useDeleteVideo();
  const videoUploadRef = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();
  const [videoUploading, setVideoUploading] = useState(false);
  const [videoUploadProgress, setVideoUploadProgress] = useState<number | null>(null);

  async function getVideoDuration(file: File): Promise<number | null> {
    return new Promise((resolve) => {
      const video = document.createElement("video");
      video.preload = "metadata";
      video.onloadedmetadata = () => { URL.revokeObjectURL(video.src); resolve(isFinite(video.duration) ? video.duration : null); };
      video.onerror = () => resolve(null);
      video.src = URL.createObjectURL(file);
    });
  }

  async function handleVideoUpload(file: File) {
    if (file.size > VIDEO_MAX_BYTES) { alert("File too large (max 5 GB)"); return; }
    setVideoUploading(true);
    setVideoUploadProgress(0);

    const mimeType = file.type || "video/mp4";
    let key = "";
    let uploadId: string | null = null;

    try {
      const duration_seconds = await getVideoDuration(file);

      if (file.size > MULTIPART_THRESHOLD) {
        // ── Multipart upload (>100 MB) ──────────────────────────────────────
        const { data: mp } = await api.post<{
          upload_id: string; key: string; public_url: string;
          parts: { part_number: number; upload_url: string }[];
        }>("/videos/presign-multipart", { filename: file.name, content_type: mimeType, file_size: file.size });

        key = mp.key;
        uploadId = mp.upload_id;
        const totalParts = mp.parts.length;
        let done = 0;

        // Upload in batches of 3 concurrent parts
        for (let i = 0; i < mp.parts.length; i += 3) {
          await Promise.all(
            mp.parts.slice(i, i + 3).map(async (part) => {
              const start = (part.part_number - 1) * MULTIPART_PART_SIZE;
              const chunk = file.slice(start, start + MULTIPART_PART_SIZE);
              await axios.put(part.upload_url, chunk, { headers: { "Content-Type": mimeType } });
              done++;
              setVideoUploadProgress(Math.round((done / totalParts) * 95));
            })
          );
        }

        await api.post("/videos/complete-multipart", { key, upload_id: uploadId });
        uploadId = null; // successfully completed — no need to abort
      } else {
        // ── Single PUT upload (≤100 MB) ─────────────────────────────────────
        const { data: presign } = await api.post<{ upload_url: string; key: string }>(
          "/videos/presign",
          { filename: file.name, content_type: mimeType, file_size: file.size }
        );
        key = presign.key;

        await axios.put(presign.upload_url, file, {
          headers: { "Content-Type": mimeType },
          onUploadProgress: (e) =>
            setVideoUploadProgress(e.total ? Math.round((e.loaded / e.total) * 95) : null),
        });
      }

      setVideoUploadProgress(98);

      await api.post("/videos/confirm", {
        key,
        title: file.name.replace(/\.[^.]+$/, ""),
        filename: file.name,
        file_size: file.size,
        mime_type: mimeType,
        duration_seconds,
      });

      qc.invalidateQueries({ queryKey: ["videos"] });
    } catch {
      // Abort any in-progress multipart upload to avoid orphaned storage
      if (uploadId && key) {
        api.post("/videos/abort-multipart", { key, upload_id: uploadId }).catch(() => {});
      }
      alert("Upload failed. Please try again.");
    } finally {
      setVideoUploading(false);
      setVideoUploadProgress(null);
    }
  }

  async function handleCreateCollection() {
    const name = newCollectionName.trim();
    if (!name) return;
    await createCollection.mutateAsync(name);
    setNewCollectionName("");
    setShowNewCollection(false);
  }

  return (
    <div className="h-full overflow-y-auto px-4 py-5 md:px-8 md:py-7 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Media</h1>
          <p className="text-sm text-slate-500 mt-0.5">Images, videos and podcasts for your posts.</p>
        </div>

        {tab === "images" && (
          <button
            type="button"
            onClick={() => setShowNewCollection(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg>
            New collection
          </button>
        )}

        {tab === "videos" && (
          <button
            type="button"
            onClick={() => videoUploadRef.current?.click()}
            disabled={videoUploading}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors"
          >
            {videoUploading ? (
              <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
                {videoUploadProgress !== null ? `${videoUploadProgress}%` : "Uploading…"}</>
            ) : (
              <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>Upload video</>
            )}
          </button>
        )}

        {tab === "podcasts" && (
          <button
            type="button"
            onClick={() => navigate("/podcast")}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"/></svg>
            Podcast studio
          </button>
        )}
      </div>

      {/* Upload progress bar */}
      {videoUploading && videoUploadProgress !== null && (
        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
          <div
            className="bg-indigo-500 h-1.5 rounded-full transition-all duration-300"
            style={{ width: `${videoUploadProgress}%` }}
          />
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-0.5 p-0.5 bg-slate-100 rounded-xl w-fit">
        {(["images", "videos", "podcasts"] as const).map((t) => (
          <button key={t} type="button" onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize ${tab === t ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
            {t}
          </button>
        ))}
      </div>

      {/* New collection form */}
      {tab === "images" && showNewCollection && (
        <div className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-slate-200">
          <input
            autoFocus
            value={newCollectionName}
            onChange={(e) => setNewCollectionName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleCreateCollection(); if (e.key === "Escape") setShowNewCollection(false); }}
            placeholder="Collection name…"
            className="flex-1 text-sm px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
          <button type="button" onClick={handleCreateCollection} disabled={!newCollectionName.trim() || createCollection.isPending}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors">
            {createCollection.isPending ? "Creating…" : "Create"}
          </button>
          <button type="button" onClick={() => setShowNewCollection(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
      )}

      {/* Images tab */}
      {tab === "images" && (
        collectionsLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <div key={i} className="aspect-video bg-slate-100 rounded-2xl animate-pulse" />)}
          </div>
        ) : !collections?.length ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <svg className="w-12 h-12 text-slate-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
            <p className="text-base font-medium text-slate-600">No image collections yet</p>
            <p className="text-sm text-slate-400 mt-1">Create a collection and upload images, or generate images via a campaign.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {collections.map((c) => (
              <CollectionCard
                key={c.id}
                collection={c}
onOpen={() => navigate(`/media/collections/${c.id}`)}
                onRename={(name) => renameCollection.mutate({ id: c.id, name })}
                onDelete={() => deleteCollection.mutate(c.id)}
              />
            ))}
          </div>
        )
      )}

      {/* Videos tab */}
      {tab === "videos" && (
        <div className="space-y-4">
          <input ref={videoUploadRef} type="file" accept={VIDEO_ACCEPTED} className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleVideoUpload(f); e.target.value = ""; }} />

          {!videoLibrary?.videos.length ? (
            <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed border-slate-200 rounded-2xl cursor-pointer hover:border-indigo-300 transition-colors"
              onClick={() => videoUploadRef.current?.click()}>
              <svg className="w-12 h-12 text-slate-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.677V15.32a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z"/></svg>
              <p className="text-base font-medium text-slate-600">No videos yet</p>
              <p className="text-sm text-slate-400 mt-1">Upload MP4, MOV, or WebM — up to 5 GB</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {videoLibrary.videos.map((v) => (
                <VideoCard key={v.id} video={v}
                  onDelete={() => deleteVideo.mutate(v.id)}
                  deleting={deleteVideo.isPending} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Podcasts tab */}
      {tab === "podcasts" && (
        !podcastJobs?.length ? (
          <div
            className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed border-slate-200 rounded-2xl cursor-pointer hover:border-indigo-300 transition-colors"
            onClick={() => navigate("/podcast")}
          >
            <svg className="w-12 h-12 text-slate-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"/></svg>
            <p className="text-base font-medium text-slate-600">No podcasts yet</p>
            <p className="text-sm text-slate-400 mt-1">Go to Podcast Studio to generate your first episode</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {podcastJobs.map((job) => (
              <PodcastCard
                key={job.id}
                job={job}
                onDelete={() => deletePodcast.mutate(job.id)}
                deleting={deletePodcast.isPending}
              />
            ))}
          </div>
        )
      )}

      {/* Collection detail drawer */}
      {openCollectionId && (
        <CollectionDetail collectionId={openCollectionId} onClose={() => setOpenCollectionId(null)} />
      )}
    </div>
  );
}
