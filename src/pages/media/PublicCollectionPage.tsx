import { useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { usePublicCollection, type MediaItem } from "../../lib/api-hooks";
import api from "../../lib/api";

function formatBytes(b: number) {
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}

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
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft") setCur((c) => (c - 1 + items.length) % items.length);
        if (e.key === "ArrowRight") setCur((c) => (c + 1) % items.length);
        if (e.key === "Escape") onClose();
      }}
      tabIndex={0}
      autoFocus
    >
      <button onClick={onClose} className="absolute top-4 right-4 text-white/70 hover:text-white p-2 rounded-xl">
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
      <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-3">
        <span className="text-white/60 text-sm">{cur + 1} / {items.length}</span>
        {allowDownload && (
          <button onClick={handleDownload} className="flex items-center gap-1.5 text-white/70 hover:text-white text-sm">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download
          </button>
        )}
      </div>
      {items.length > 1 && (
        <button onClick={prev} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white p-3 rounded-2xl hover:bg-white/10">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/></svg>
        </button>
      )}
      <img src={item.spaces_url} alt={item.title} className="max-w-[85vw] max-h-[85vh] object-contain rounded-xl" onClick={(e) => e.stopPropagation()} />
      {items.length > 1 && (
        <button onClick={next} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white p-3 rounded-2xl hover:bg-white/10">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/></svg>
        </button>
      )}
      {items.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 max-w-[90vw] overflow-x-auto px-2">
          {items.map((it, i) => (
            <button key={it.id} onClick={(e) => { e.stopPropagation(); setCur(i); }}
              className={`flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden border-2 transition-all ${i === cur ? "border-white" : "border-transparent opacity-50 hover:opacity-80"}`}>
              <img src={it.spaces_url} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function PublicCollectionPage() {
  const { token } = useParams<{ token: string }>();
  const uploadRef = useRef<HTMLInputElement>(null);
  const { data: collection, isLoading, isError } = usePublicCollection(token ?? null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  const items = collection?.items ?? [];

  async function handleUpload(files: FileList | null) {
    if (!files || !token) return;
    setUploading(true);
    setUploadError("");
    try {
      for (const file of Array.from(files)) {
        const form = new FormData();
        form.append("file", file);
        await api.post(`/public/collections/${token}/upload`, form, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }
      window.location.reload();
    } catch {
      setUploadError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (isError || !collection) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-3 px-4 text-center">
        <svg className="w-12 h-12 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
        </svg>
        <p className="text-lg font-semibold text-slate-700">Link not found</p>
        <p className="text-sm text-slate-400">This collection link may have been revoked or doesn't exist.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 px-5 py-5 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-6 h-6 bg-indigo-600 rounded-md flex items-center justify-center">
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <span className="text-xs font-semibold text-slate-400">postcards.studio</span>
            </div>
            <h1 className="text-xl font-bold text-slate-900">{collection.name}</h1>
            <p className="text-sm text-slate-400">{items.length} image{items.length !== 1 ? "s" : ""}</p>
          </div>
          <div className="flex items-center gap-2">
            {collection.allow_upload && (
              <button
                onClick={() => uploadRef.current?.click()}
                disabled={uploading}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl transition-colors"
              >
                {uploading ? (
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                )}
                Add images
              </button>
            )}
          </div>
        </div>
      </div>

      <input ref={uploadRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleUpload(e.target.files)} />

      {/* Error */}
      {uploadError && (
        <div className="max-w-6xl mx-auto px-5 pt-4">
          <p className="text-sm text-red-500 bg-red-50 rounded-xl px-4 py-2">{uploadError}</p>
        </div>
      )}

      {/* Grid */}
      <div className="max-w-6xl mx-auto px-5 py-6">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-slate-200 rounded-2xl">
            <svg className="w-10 h-10 text-slate-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-sm text-slate-400">No images in this collection yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3">
            {items.map((item, i) => (
              <div
                key={item.id}
                className="group relative aspect-square rounded-2xl overflow-hidden border border-slate-200 cursor-pointer hover:border-slate-300 hover:shadow-md transition-all"
                onClick={() => setLightboxIndex(i)}
              >
                <img src={item.spaces_url} alt={item.title} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                {collection.allow_download && (
                  <div className="absolute bottom-0 left-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        const res = await fetch(item.spaces_url);
                        const blob = await res.blob();
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = item.title || "image";
                        a.click();
                        URL.revokeObjectURL(url);
                      }}
                      className="w-full text-center text-[11px] font-medium bg-black/60 text-white/90 py-1 rounded-lg"
                    >
                      Download · {formatBytes(item.file_size)}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <Lightbox
          items={items}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          allowDownload={collection.allow_download ?? true}
        />
      )}
    </div>
  );
}
