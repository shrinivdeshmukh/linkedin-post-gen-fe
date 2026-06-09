import { useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  useMediaCollection,
  useUploadToCollection,
  useDeleteMediaItem,
  useGenerateShareLink,
  useRevokeShareLink,
  useUpdateCollectionSettings,
  type MediaItem,
} from "../../lib/api-hooks";

function formatBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}

// ─── Lightbox / slideshow ─────────────────────────────────────────────────────
function Lightbox({ items, index, onClose, allowDownload }: {
  items: MediaItem[];
  index: number;
  onClose: () => void;
  allowDownload: boolean;
}) {
  const [cur, setCur] = useState(index);
  const item = items[cur];

  function prev(e: React.MouseEvent) { e.stopPropagation(); setCur((c) => (c - 1 + items.length) % items.length); }
  function next(e: React.MouseEvent) { e.stopPropagation(); setCur((c) => (c + 1) % items.length); }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowLeft") setCur((c) => (c - 1 + items.length) % items.length);
    if (e.key === "ArrowRight") setCur((c) => (c + 1) % items.length);
    if (e.key === "Escape") onClose();
  }

  async function handleDownload(e: React.MouseEvent) {
    e.stopPropagation();
    const res = await fetch(item.spaces_url);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = item.title || "image";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
      onClick={onClose}
      onKeyDown={handleKey}
      tabIndex={0}
      autoFocus
    >
      {/* Close */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-white/70 hover:text-white p-2 rounded-xl transition-colors"
      >
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Counter + download */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-3">
        <span className="text-white/60 text-sm">{cur + 1} / {items.length}</span>
        {allowDownload && (
          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 text-white/70 hover:text-white text-sm transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download
          </button>
        )}
      </div>

      {/* Prev */}
      {items.length > 1 && (
        <button
          onClick={prev}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white p-3 rounded-2xl hover:bg-white/10 transition-all"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      )}

      {/* Image */}
      <img
        src={item.spaces_url}
        alt={item.title}
        className="max-w-[85vw] max-h-[85vh] object-contain rounded-xl"
        onClick={(e) => e.stopPropagation()}
      />

      {/* Next */}
      {items.length > 1 && (
        <button
          onClick={next}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white p-3 rounded-2xl hover:bg-white/10 transition-all"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}

      {/* Strip */}
      {items.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 max-w-[90vw] overflow-x-auto px-2">
          {items.map((it, i) => (
            <button
              key={it.id}
              onClick={(e) => { e.stopPropagation(); setCur(i); }}
              className={`flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden border-2 transition-all ${i === cur ? "border-white" : "border-transparent opacity-50 hover:opacity-80"}`}
            >
              <img src={it.spaces_url} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Share panel ──────────────────────────────────────────────────────────────
function SharePanel({ collectionId, shareToken, allowDownload, allowUpload, onClose }: {
  collectionId: string;
  shareToken: string | null | undefined;
  allowDownload: boolean;
  allowUpload: boolean;
  onClose: () => void;
}) {
  const generateLink = useGenerateShareLink();
  const revokeLink = useRevokeShareLink();
  const updateSettings = useUpdateCollectionSettings();
  const [copied, setCopied] = useState(false);

  const shareUrl = shareToken ? `${window.location.origin}/shared/collections/${shareToken}` : null;

  function copyLink() {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900">Share collection</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Link */}
        {shareUrl ? (
          <div className="space-y-2">
            <p className="text-xs font-medium text-slate-500">Shareable link</p>
            <div className="flex gap-2">
              <input
                readOnly
                value={shareUrl}
                className="flex-1 text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-600 outline-none"
              />
              <button
                onClick={copyLink}
                className={`px-3 py-2 rounded-xl text-sm font-medium transition-colors ${copied ? "bg-emerald-100 text-emerald-700" : "bg-indigo-600 text-white hover:bg-indigo-700"}`}
              >
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
            <button
              onClick={() => revokeLink.mutate(collectionId)}
              disabled={revokeLink.isPending}
              className="text-xs text-red-500 hover:text-red-700 transition-colors disabled:opacity-50"
            >
              {revokeLink.isPending ? "Revoking…" : "Revoke link"}
            </button>
          </div>
        ) : (
          <div className="bg-slate-50 rounded-2xl p-4 text-center space-y-3">
            <p className="text-sm text-slate-600">No shareable link yet. Generate one to share this collection.</p>
            <button
              onClick={() => generateLink.mutate(collectionId)}
              disabled={generateLink.isPending}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50"
            >
              {generateLink.isPending ? "Generating…" : "Generate link"}
            </button>
          </div>
        )}

        {/* Permissions */}
        <div className="space-y-3 pt-2 border-t border-slate-100">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Permissions for visitors</p>
          {[
            { key: "allow_download", label: "Allow download", desc: "Visitors can download individual images", value: allowDownload },
            { key: "allow_upload", label: "Allow upload", desc: "Visitors can add images to this collection", value: allowUpload },
          ].map(({ key, label, desc, value }) => (
            <div key={key} className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-slate-700">{label}</p>
                <p className="text-xs text-slate-400">{desc}</p>
              </div>
              <button
                type="button"
                onClick={() => updateSettings.mutate({ id: collectionId, [key]: !value })}
                disabled={updateSettings.isPending}
                className={`relative w-10 h-6 rounded-full transition-colors flex-shrink-0 ${value ? "bg-indigo-600" : "bg-slate-200"}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${value ? "translate-x-4" : "translate-x-0"}`} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function MediaCollectionDetailPage() {
  const { collectionId } = useParams<{ collectionId: string }>();
  const navigate = useNavigate();
  const uploadRef = useRef<HTMLInputElement>(null);

  const { data: collection, isLoading } = useMediaCollection(collectionId ?? null);
  const upload = useUploadToCollection();
  const deleteItem = useDeleteMediaItem();

  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const items = collection?.items ?? [];

  return (
    <div className="h-full flex flex-col bg-slate-50">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-100 bg-white flex-shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/media")} className="text-slate-400 hover:text-slate-600 transition-colors flex-shrink-0">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-slate-900 truncate">{collection?.name ?? "Collection"}</h1>
            <p className="text-sm text-slate-400">{items.length} image{items.length !== 1 ? "s" : ""}</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Share */}
            <button
              onClick={() => setShareOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-indigo-300 text-slate-600 transition-all"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              Share
              {collection?.share_token && (
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
              )}
            </button>
            {/* Upload */}
            <button
              onClick={() => uploadRef.current?.click()}
              disabled={upload.isPending}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl transition-colors"
            >
              {upload.isPending ? (
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
              )}
              Upload
            </button>
          </div>
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
            upload.mutate({ collectionId: collectionId!, file: f })
          );
          e.target.value = "";
        }}
      />

      {/* Grid */}
      <div className="flex-1 overflow-y-auto p-5 md:p-6">
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="aspect-square bg-slate-100 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center h-72 border-2 border-dashed border-slate-200 rounded-2xl cursor-pointer hover:border-indigo-300 transition-colors"
            onClick={() => uploadRef.current?.click()}
          >
            <svg className="w-12 h-12 text-slate-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-sm font-semibold text-slate-500">No images yet</p>
            <p className="text-xs text-slate-400 mt-1">Click to upload</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3">
            {items.map((item, i) => (
              <div
                key={item.id}
                className="group relative aspect-square rounded-2xl overflow-hidden border border-slate-200 cursor-pointer hover:border-indigo-300 hover:shadow-md transition-all"
                onClick={() => setLightboxIndex(i)}
              >
                <img src={item.spaces_url} alt={item.title} className="w-full h-full object-cover" />

                {/* Overlay */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors" />

                {/* Actions */}
                <div className="absolute top-2 right-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  {deleteConfirm === item.id ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteItem.mutate(item.id);
                        setDeleteConfirm(null);
                      }}
                      className="px-2 py-1 bg-red-500 text-white text-[11px] font-semibold rounded-lg"
                    >
                      Delete?
                    </button>
                  ) : (
                    <button
                      onClick={(e) => { e.stopPropagation(); setDeleteConfirm(item.id); setTimeout(() => setDeleteConfirm(null), 3000); }}
                      className="p-1.5 bg-black/60 text-white/80 hover:text-white rounded-lg transition-colors"
                      title="Delete"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>

                {/* Source badge */}
                {item.source === "generated" && (
                  <span className="absolute bottom-2 left-2 bg-black/60 text-white text-[9px] font-semibold px-1.5 py-0.5 rounded-full">AI</span>
                )}

                {/* Size badge */}
                <span className="absolute bottom-2 right-2 bg-black/50 text-white/80 text-[9px] px-1.5 py-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                  {formatBytes(item.file_size)}
                </span>
              </div>
            ))}

            {/* Upload placeholder */}
            <button
              type="button"
              onClick={() => uploadRef.current?.click()}
              className="aspect-square rounded-2xl border-2 border-dashed border-slate-200 hover:border-indigo-300 flex items-center justify-center transition-colors group"
            >
              <svg className="w-6 h-6 text-slate-300 group-hover:text-indigo-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <Lightbox
          items={items}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          allowDownload={collection?.allow_download ?? true}
        />
      )}

      {/* Share panel */}
      {shareOpen && collection && (
        <SharePanel
          collectionId={collection.id}
          shareToken={collection.share_token}
          allowDownload={collection.allow_download ?? true}
          allowUpload={collection.allow_upload ?? false}
          onClose={() => setShareOpen(false)}
        />
      )}
    </div>
  );
}
