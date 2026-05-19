import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  useVideo,
  useUpdateVideo,
  useRetriggerTranscription,
  useConfirmLanguage,
  useTranslations,
  useTranslate,
} from "../../lib/api-hooks";

const LANGUAGES = [
  { code: "ar", name: "Arabic" },
  { code: "zh", name: "Chinese (Simplified)" },
  { code: "zh-TW", name: "Chinese (Traditional)" },
  { code: "nl", name: "Dutch" },
  { code: "en", name: "English" },
  { code: "fr", name: "French" },
  { code: "de", name: "German" },
  { code: "hi", name: "Hindi" },
  { code: "id", name: "Indonesian" },
  { code: "it", name: "Italian" },
  { code: "ja", name: "Japanese" },
  { code: "ko", name: "Korean" },
  { code: "ms", name: "Malay" },
  { code: "mr", name: "Marathi" },
  { code: "pt", name: "Portuguese" },
  { code: "ru", name: "Russian" },
  { code: "es", name: "Spanish" },
  { code: "sw", name: "Swahili" },
  { code: "ta", name: "Tamil" },
  { code: "tr", name: "Turkish" },
  { code: "vi", name: "Vietnamese" },
];

function TranscriptStatusBadge({ status }: { status: string }) {
  if (status === "done") return null;
  const map: Record<string, { label: string; color: string }> = {
    none: { label: "No transcript", color: "bg-slate-100 text-slate-500" },
    pending: { label: "Queued…", color: "bg-amber-50 text-amber-600" },
    processing: { label: "Transcribing…", color: "bg-blue-50 text-blue-600" },
    failed: { label: "Transcription failed", color: "bg-red-50 text-red-600" },
  };
  const { label, color } = map[status] ?? map.none;
  const spinning = status === "pending" || status === "processing";
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${color}`}>
      {spinning && (
        <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
        </svg>
      )}
      {label}
    </span>
  );
}

export default function VideoDetailPage() {
  const { videoId } = useParams<{ videoId: string }>();
  const navigate = useNavigate();
  const { data: video, isLoading } = useVideo(videoId ?? null);
  const updateVideo = useUpdateVideo();
  const retrigger = useRetriggerTranscription();
  const confirmLanguage = useConfirmLanguage();

  const { data: translations } = useTranslations(videoId ?? null);
  const translate = useTranslate();

  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [copied, setCopied] = useState(false);
  const [correctingLang, setCorrectingLang] = useState(false);
  const [langDraft, setLangDraft] = useState("");
  const [selectedLangCode, setSelectedLangCode] = useState(LANGUAGES[5].code); // French default
  const [copiedTranscript, setCopiedTranscript] = useState(false);
  const [copiedTranslation, setCopiedTranslation] = useState(false);
  const [upgradeError, setUpgradeError] = useState(false);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center text-slate-400">
        <svg className="w-6 h-6 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
        </svg>
      </div>
    );
  }

  if (!video) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center space-y-2">
          <p className="text-slate-600 font-medium">Video not found</p>
          <Link to="/media" className="text-sm text-indigo-600 hover:underline">Back to Media</Link>
        </div>
      </div>
    );
  }

  const shareUrl = `${window.location.origin}/v/${video.slug}`;

  function handleCopyLink() {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function submitTitleEdit() {
    const t = titleDraft.trim();
    if (t && t !== video!.title) updateVideo.mutate({ id: video!.id, title: t });
    setEditingTitle(false);
  }

  function handleGeneratePost() {
    navigate("/composer", { state: { rawContext: video!.transcript } });
  }

  function handleConfirmLanguage(lang?: string) {
    confirmLanguage.mutate({ id: video!.id, detected_language: lang });
    setCorrectingLang(false);
  }

  function handleCopyTranscript() {
    navigator.clipboard.writeText(video!.transcript ?? "");
    setCopiedTranscript(true);
    setTimeout(() => setCopiedTranscript(false), 2000);
  }

  function handleCopyTranslation(text: string) {
    navigator.clipboard.writeText(text);
    setCopiedTranslation(true);
    setTimeout(() => setCopiedTranslation(false), 2000);
  }

  function handleTranslate() {
    setUpgradeError(false);
    const lang = LANGUAGES.find((l) => l.code === selectedLangCode)!;
    translate.mutate(
      { videoId: video!.id, language_code: lang.code, language_name: lang.name },
      {
        onError: (err: unknown) => {
          const status = (err as { response?: { status?: number } }).response?.status;
          if (status === 402) setUpgradeError(true);
        },
      }
    );
  }

  const activeTranslation = translations?.find((t) => t.language_code === selectedLangCode) ?? null;

  return (
    <div className="h-full overflow-y-auto px-4 py-5 md:px-8 md:py-7">
      {/* Back nav */}
      <Link
        to="/media"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors mb-5"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Media Library
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* ── Left: Player + meta ───────────────────────────────────────── */}
        <div className="space-y-4">
          {/* Title */}
          <div>
            {editingTitle ? (
              <input
                autoFocus
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                onBlur={submitTitleEdit}
                onKeyDown={(e) => {
                  if (e.key === "Enter") submitTitleEdit();
                  if (e.key === "Escape") setEditingTitle(false);
                }}
                className="w-full text-2xl font-bold text-slate-900 border-b-2 border-indigo-400 bg-transparent outline-none"
              />
            ) : (
              <h1
                className="text-2xl font-bold text-slate-900 cursor-pointer hover:text-indigo-700 transition-colors"
                onClick={() => { setEditingTitle(true); setTitleDraft(video.title); }}
                title="Click to rename"
              >
                {video.title}
              </h1>
            )}
            <p className="text-sm text-slate-400 mt-1">
              Uploaded {new Date(video.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
            </p>
          </div>

          {/* Video player */}
          <div className="rounded-2xl overflow-hidden bg-slate-950 shadow-lg">
            <video
              src={video.spaces_url}
              controls
              className="w-full"
              style={{ maxHeight: "55vh" }}
            />
          </div>

          {/* Actions row */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleCopyLink}
              className="flex items-center gap-1.5 text-sm text-slate-600 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 rounded-xl px-3 py-1.5 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              {copied ? "Copied!" : "Copy share link"}
            </button>
            <a
              href={video.spaces_url}
              download
              className="flex items-center gap-1.5 text-sm text-slate-600 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 rounded-xl px-3 py-1.5 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download
            </a>
          </div>
        </div>

        {/* ── Right: Transcript ─────────────────────────────────────────── */}
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-slate-900">Transcript</h2>
              <TranscriptStatusBadge status={video.transcript_status} />
            </div>
            {video.transcript_status === "failed" && (
              <button
                onClick={() => retrigger.mutate(video.id)}
                disabled={retrigger.isPending}
                className="text-xs font-medium px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-colors disabled:opacity-50"
              >
                Retry
              </button>
            )}
          </div>

          {/* Language confirmation banner */}
          {video.transcript_status === "done" && video.detected_language && !video.language_confirmed && (
            <div className="flex items-center justify-between gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl">
              {correctingLang ? (
                <div className="flex items-center gap-2 flex-1">
                  <input
                    autoFocus
                    value={langDraft}
                    onChange={(e) => setLangDraft(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleConfirmLanguage(langDraft); if (e.key === "Escape") setCorrectingLang(false); }}
                    placeholder="e.g. Hinglish, Singlish…"
                    className="flex-1 text-sm border border-amber-300 rounded-lg px-2.5 py-1 bg-white outline-none focus:ring-2 focus:ring-amber-300"
                  />
                  <button
                    onClick={() => handleConfirmLanguage(langDraft)}
                    className="text-xs font-medium px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors"
                  >
                    Save
                  </button>
                </div>
              ) : (
                <>
                  <p className="text-sm text-amber-800">
                    Detected language: <strong>{video.detected_language}</strong>. Is that right?
                  </p>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleConfirmLanguage()}
                      className="text-xs font-medium px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors"
                    >
                      Yes, correct
                    </button>
                    <button
                      onClick={() => { setCorrectingLang(true); setLangDraft(video.detected_language ?? ""); }}
                      className="text-xs font-medium px-3 py-1.5 border border-amber-300 hover:bg-amber-100 text-amber-700 rounded-lg transition-colors"
                    >
                      Correct it
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Confirmed language chip */}
          {video.transcript_status === "done" && video.detected_language && video.language_confirmed && (
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 bg-green-50 text-green-700 rounded-full border border-green-200">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                {video.detected_language}
              </span>
            </div>
          )}

          {/* Transcript body */}
          {video.transcript_status === "done" && video.transcript ? (
            <div className="space-y-3">
              {/* Transcript panel */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 max-h-[55vh] overflow-y-auto">
                <pre className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed font-sans">
                  {video.transcript}
                </pre>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyTranscript}
                  className="flex items-center gap-1.5 text-sm text-slate-600 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 rounded-xl px-3 py-1.5 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  {copiedTranscript ? "Copied!" : "Copy transcript"}
                </button>
                <button
                  onClick={handleGeneratePost}
                  className="flex items-center gap-1.5 text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-xl transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Generate LinkedIn post
                </button>
              </div>

              {/* Translation panel */}
              <div className="mt-2 pt-4 border-t border-slate-100 space-y-3">
                <h3 className="text-sm font-semibold text-slate-900">Translate</h3>

                {/* Cached translation chips */}
                {translations && translations.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs text-slate-400 mr-0.5">Done:</span>
                    {translations.map((t) => (
                      <button
                        key={t.language_code}
                        onClick={() => { setSelectedLangCode(t.language_code); setUpgradeError(false); }}
                        className={`text-xs font-medium px-2.5 py-1 rounded-full border transition-colors ${
                          selectedLangCode === t.language_code
                            ? "bg-indigo-600 text-white border-indigo-600"
                            : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:text-indigo-600"
                        }`}
                      >
                        {t.language_name}
                      </button>
                    ))}
                  </div>
                )}

                {/* New language selector */}
                <div className="flex items-center gap-2">
                  <select
                    value={selectedLangCode}
                    onChange={(e) => { setSelectedLangCode(e.target.value); setUpgradeError(false); }}
                    className="flex-1 text-sm border border-slate-200 rounded-xl px-3 py-1.5 bg-white text-slate-700 outline-none focus:ring-2 focus:ring-indigo-300"
                  >
                    {LANGUAGES.map((l) => (
                      <option key={l.code} value={l.code}>{l.name}</option>
                    ))}
                  </select>
                  <button
                    onClick={handleTranslate}
                    disabled={translate.isPending}
                    className="flex items-center gap-1.5 text-sm font-medium px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl transition-colors disabled:opacity-50"
                  >
                    {translate.isPending ? (
                      <>
                        <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                        </svg>
                        Translating…
                      </>
                    ) : activeTranslation ? "Re-translate" : "Translate"}
                  </button>
                </div>

                {upgradeError && (
                  <div className="flex items-center justify-between gap-3 px-4 py-3 bg-indigo-50 border border-indigo-200 rounded-xl">
                    <p className="text-sm text-indigo-800">Translation is available on paid plans.</p>
                    <Link
                      to="/settings/billing"
                      className="text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg transition-colors flex-shrink-0"
                    >
                      Upgrade
                    </Link>
                  </div>
                )}

                {activeTranslation && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-slate-500">{activeTranslation.language_name}</span>
                      <button
                        onClick={() => handleCopyTranslation(activeTranslation.translated_text)}
                        className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        {copiedTranslation ? "Copied!" : "Copy"}
                      </button>
                    </div>
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 max-h-[45vh] overflow-y-auto">
                      <pre className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed font-sans">
                        {activeTranslation.translated_text}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : video.transcript_status === "none" ? (
            <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed border-slate-200 rounded-2xl text-center">
              <svg className="w-10 h-10 text-slate-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
              {(video.duration_seconds ?? 0) > 600 ? (
                <>
                  <p className="text-sm text-slate-500 font-medium">Transcription not started</p>
                  <p className="text-xs text-slate-400 mt-1 max-w-xs">This video is over 10 minutes — transcription was skipped automatically to preserve your quota.</p>
                </>
              ) : (
                <p className="text-sm text-slate-500 font-medium">No transcript yet</p>
              )}
              <button
                onClick={() => retrigger.mutate(video.id)}
                disabled={retrigger.isPending}
                className="mt-3 text-sm font-medium px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-colors disabled:opacity-50"
              >
                {retrigger.isPending ? "Starting…" : "Transcribe now"}
              </button>
            </div>
          ) : (video.transcript_status === "pending" || video.transcript_status === "processing") ? (
            <div className="flex flex-col items-center justify-center py-16 bg-blue-50 border border-blue-100 rounded-2xl text-center">
              <svg className="w-8 h-8 text-blue-400 animate-spin mb-3" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              <p className="text-sm font-medium text-blue-700">Transcribing your audio…</p>
              <p className="text-xs text-blue-500 mt-1">This usually takes 1–3 minutes. Page will update automatically.</p>
            </div>
          ) : (
            /* failed */
            <div className="flex flex-col items-center justify-center py-16 bg-red-50 border border-red-100 rounded-2xl text-center">
              <svg className="w-8 h-8 text-red-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p className="text-sm font-medium text-red-700">Transcription failed</p>
              <button
                onClick={() => retrigger.mutate(video.id)}
                disabled={retrigger.isPending}
                className="mt-3 text-sm font-medium px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl transition-colors disabled:opacity-50"
              >
                {retrigger.isPending ? "Starting…" : "Try again"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
