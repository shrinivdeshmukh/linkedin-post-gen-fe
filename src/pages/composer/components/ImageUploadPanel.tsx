import { useRef, useState } from "react";
import { useGenerateImage } from "../../../lib/api-hooks";

interface ImageUploadPanelProps {
  postId: string | null;
  topic: string;
  imageUrl: string | null;
  onChange: (url: string | null, file: File | null) => void;
}

const STYLES = [
  { value: "professional", label: "Professional" },
  { value: "creative",     label: "Creative" },
  { value: "bold",         label: "Bold" },
  { value: "minimal",      label: "Minimal" },
];

const ASPECT_RATIOS = [
  { value: "1:1",  label: "1:1", hint: "Square" },
  { value: "4:5",  label: "4:5", hint: "Portrait" },
  { value: "16:9", label: "16:9", hint: "Landscape" },
];

const DEFAULT_COLOR = "#6366F1";

export function ImageUploadPanel({ postId, topic, imageUrl, onChange }: ImageUploadPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [mode, setMode] = useState<"ai" | "upload">("ai");

  // AI generation state
  const [colors, setColors] = useState<string[]>([DEFAULT_COLOR]);
  const [style, setStyle] = useState("professional");
  const [aspectRatio, setAspectRatio] = useState("1:1");
  const [logoUrl, setLogoUrl] = useState("");
  const [additionalInstructions, setAdditionalInstructions] = useState("");
  const [, setGeneratedDataUrl] = useState<string | null>(null);

  const generateImage = useGenerateImage();

  function handleFile(file: File) {
    if (!file.type.startsWith("image/")) return;
    onChange(URL.createObjectURL(file), file);
    setGeneratedDataUrl(null);
  }

  function addColor() {
    if (colors.length < 3) setColors([...colors, "#000000"]);
  }

  function updateColor(i: number, val: string) {
    setColors(colors.map((c, idx) => (idx === i ? val : c)));
  }

  function removeColor(i: number) {
    setColors(colors.filter((_, idx) => idx !== i));
  }

  async function handleGenerate() {
    if (!postId) return;
    setGeneratedDataUrl(null);
    try {
      const result = await generateImage.mutateAsync({
        postId,
        topic,
        brand_colors: colors,
        style,
        aspect_ratio: aspectRatio,
        logo_url: logoUrl || undefined,
        additional_instructions: additionalInstructions || undefined,
      });
      const dataUrl = `data:${result.mime_type};base64,${result.image_data}`;
      setGeneratedDataUrl(dataUrl);
      onChange(dataUrl, null);
    } catch {
      // error shown via isPending state
    }
  }

  // If image already set (generated or uploaded), show preview
  if (imageUrl) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-semibold text-slate-700">Image</label>
          <button
            type="button"
            onClick={() => { onChange(null, null); setGeneratedDataUrl(null); }}
            className="text-xs text-slate-400 hover:text-red-500 transition-colors"
          >
            Remove
          </button>
        </div>
        <div className="relative group rounded-2xl overflow-hidden border border-slate-200">
          <img src={imageUrl} alt="Post image" className="w-full max-h-72 object-cover" />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
        </div>
        <button
          type="button"
          onClick={() => { onChange(null, null); setGeneratedDataUrl(null); }}
          className="w-full text-xs text-indigo-600 hover:text-indigo-700 font-medium py-1"
        >
          ↩ Generate a different image
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="text-sm font-semibold text-slate-700">Image</label>
        {/* Mode toggle */}
        <div className="flex gap-0.5 p-0.5 bg-slate-100 rounded-lg">
          {(["ai", "upload"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={[
                "px-3 py-1 rounded-md text-xs font-medium transition-all",
                mode === m ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700",
              ].join(" ")}
            >
              {m === "ai" ? "✦ Generate" : "↑ Upload"}
            </button>
          ))}
        </div>
      </div>

      {mode === "ai" ? (
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
          {/* Brand colors */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-600">Brand colours</p>
            <div className="flex items-center gap-2 flex-wrap">
              {colors.map((color, i) => (
                <div key={i} className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2 py-1.5">
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => updateColor(i, e.target.value)}
                    className="w-5 h-5 rounded cursor-pointer border-0 bg-transparent"
                  />
                  <span className="text-xs font-mono text-slate-500">{color}</span>
                  {colors.length > 1 && (
                    <button type="button" onClick={() => removeColor(i)} className="text-slate-300 hover:text-red-400 ml-0.5 text-xs leading-none">✕</button>
                  )}
                </div>
              ))}
              {colors.length < 3 && (
                <button
                  type="button"
                  onClick={addColor}
                  className="text-xs text-indigo-600 hover:text-indigo-700 font-medium border border-dashed border-indigo-300 rounded-lg px-2 py-1.5"
                >
                  + Add colour
                </button>
              )}
            </div>
          </div>

          {/* Style */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-600">Style</p>
            <div className="flex gap-1.5 flex-wrap">
              {STYLES.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setStyle(value)}
                  className={[
                    "px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
                    style === value
                      ? "bg-indigo-600 text-white border-indigo-600"
                      : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300",
                  ].join(" ")}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Aspect ratio */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-600">Aspect ratio</p>
            <div className="flex gap-1.5">
              {ASPECT_RATIOS.map(({ value, label, hint }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setAspectRatio(value)}
                  className={[
                    "flex flex-col items-center px-3 py-2 rounded-lg border text-xs font-medium transition-all",
                    aspectRatio === value
                      ? "bg-indigo-600 text-white border-indigo-600"
                      : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300",
                  ].join(" ")}
                >
                  <span className="font-semibold">{label}</span>
                  <span className={`text-[10px] ${aspectRatio === value ? "text-indigo-200" : "text-slate-400"}`}>{hint}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Logo URL */}
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-slate-600">Company logo URL <span className="font-normal text-slate-400">(optional)</span></p>
            <input
              type="url"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="https://example.com/logo.png"
              className="w-full px-3 py-2 text-xs text-slate-900 bg-white border border-slate-200 rounded-xl placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {logoUrl && <p className="text-[10px] text-slate-400">The logo will be incorporated tastefully into the image composition.</p>}
          </div>

          {/* Additional instructions */}
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-slate-600">Additional instructions <span className="font-normal text-slate-400">(optional)</span></p>
            <textarea
              value={additionalInstructions}
              onChange={(e) => setAdditionalInstructions(e.target.value)}
              placeholder="e.g. Include an abstract cityscape, avoid faces, dark background…"
              rows={2}
              className="w-full px-3 py-2 text-xs text-slate-900 bg-white border border-slate-200 rounded-xl placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>

          {/* Generate button */}
          <button
            type="button"
            onClick={handleGenerate}
            disabled={generateImage.isPending || !postId || !topic.trim()}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-colors"
          >
            {generateImage.isPending ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Generating…
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
                Generate image
              </>
            )}
          </button>

          {generateImage.isError && (
            <p className="text-xs text-red-500 text-center">Generation failed. Try again.</p>
          )}
        </div>
      ) : (
        /* Manual upload */
        <>
          <div
            className={[
              "border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-colors",
              dragging ? "border-indigo-400 bg-indigo-50" : "border-slate-200 hover:border-indigo-300 hover:bg-slate-50",
            ].join(" ")}
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              const file = e.dataTransfer.files[0];
              if (file) handleFile(file);
            }}
          >
            <svg className="w-10 h-10 text-slate-300 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-sm font-medium text-slate-600">Drop an image, or <span className="text-indigo-600">browse</span></p>
            <p className="text-xs text-slate-400 mt-1">PNG, JPG up to 10MB</p>
          </div>
          <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
        </>
      )}
    </div>
  );
}
