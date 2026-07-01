import { useEffect } from "react";
import { createPortal } from "react-dom";

interface ImageLightboxProps {
  src: string;
  alt?: string;
  onClose: () => void;
  onDownload?: () => void;
}

export function ImageLightbox({ src, alt = "Image", onClose, onDownload }: ImageLightboxProps) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 animate-fade-in"
      style={{ animationDuration: "120ms" }}
      onClick={onClose}
    >
      <div
        className="relative max-w-4xl max-h-[90vh] w-full mx-4 animate-scale-in"
        style={{ animationDuration: "150ms" }}
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={src}
          alt={alt}
          className="w-full h-full max-h-[90vh] object-contain rounded-2xl shadow-2xl"
        />

        {/* Action bar */}
        <div className="absolute top-3 right-3 flex items-center gap-2">
          {onDownload && (
            <button
              type="button"
              onClick={onDownload}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/90 hover:bg-white text-slate-700 hover:text-indigo-600 rounded-lg text-xs font-medium shadow transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="flex items-center justify-center w-8 h-8 bg-white/90 hover:bg-white text-slate-700 hover:text-red-500 rounded-lg shadow transition-colors"
            aria-label="Close"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Click outside hint */}
        <p className="absolute bottom-3 left-1/2 -translate-x-1/2 text-white/50 text-xs">
          Click outside or press Esc to close
        </p>
      </div>
    </div>,
    document.body,
  );
}
