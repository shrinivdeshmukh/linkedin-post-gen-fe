import { useState, useRef } from "react";
import {
  usePodcastVoices,
  usePodcastJob,
  usePodcastJobs,
  useGeneratePodcast,
  useDeletePodcastJob,
  type PodcastConfig,
  type PodcastVoice,
} from "../../lib/api-hooks";

// ── Voice picker ──────────────────────────────────────────────────────────────

function VoicePicker({
  label,
  value,
  onChange,
  voices,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  voices: PodcastVoice[];
}) {
  const males = voices.filter((v) => v.gender === "M");
  const females = voices.filter((v) => v.gender === "F");

  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full text-sm border border-slate-300 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
      >
        <optgroup label="Male voices">
          {males.map((v) => (
            <option key={v.id} value={v.id}>{v.id} — {v.style}</option>
          ))}
        </optgroup>
        <optgroup label="Female voices">
          {females.map((v) => (
            <option key={v.id} value={v.id}>{v.id} — {v.style}</option>
          ))}
        </optgroup>
      </select>
    </div>
  );
}

// ── Podcast player ────────────────────────────────────────────────────────────

function PodcastPlayer({ url, title }: { url: string; title: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);

  return (
    <div className="bg-gradient-to-br from-indigo-600 to-violet-600 rounded-2xl p-5 text-white space-y-3">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
          <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
          </svg>
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold truncate">{title}</p>
          <p className="text-xs text-indigo-200">Your AI podcast is ready</p>
        </div>
      </div>
      <audio ref={audioRef} controls src={url} className="w-full h-10 accent-white" />
      <a
        href={url}
        download
        className="flex items-center justify-center gap-2 w-full py-2.5 bg-white/20 hover:bg-white/30 border border-white/30 text-white text-sm font-semibold rounded-xl transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        Download MP3
      </a>
    </div>
  );
}

// ── Status banner ─────────────────────────────────────────────────────────────

function StatusBanner({ status, error }: { status: string; error?: string | null }) {
  const steps = [
    { key: "pending",    label: "Queued" },
    { key: "scripting",  label: "Writing script" },
    { key: "generating", label: "Synthesising audio" },
    { key: "complete",   label: "Done" },
  ];
  const currentIdx = steps.findIndex((s) => s.key === status);

  if (status === "failed") {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-xl space-y-1">
        <p className="text-sm font-semibold text-red-700">Generation failed</p>
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    );
  }

  return (
    <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl space-y-3">
      <div className="flex items-center gap-2">
        <svg className="w-4 h-4 text-indigo-600 animate-spin flex-shrink-0" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
        <p className="text-sm font-medium text-indigo-700">
          {steps.find((s) => s.key === status)?.label ?? "Processing"}…
        </p>
      </div>
      <div className="flex gap-1.5">
        {steps.map((s, i) => (
          <div
            key={s.key}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              i < currentIdx ? "bg-indigo-500" :
              i === currentIdx ? "bg-indigo-400 animate-pulse" :
              "bg-indigo-100"
            }`}
          />
        ))}
      </div>
      <p className="text-xs text-indigo-500">This takes 1–3 minutes. You can leave this page and come back.</p>
    </div>
  );
}

// ── History item ──────────────────────────────────────────────────────────────

function HistoryItem({ job, onPlay, onDelete }: {
  job: { id: string; config: PodcastConfig; status: string; audio_url: string | null; duration_seconds: number | null; created_at: string };
  onPlay: () => void;
  onDelete: () => void;
}) {
  const date = new Date(job.created_at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  const dur = job.duration_seconds ? `${Math.floor(job.duration_seconds / 60)}:${String(job.duration_seconds % 60).padStart(2, "0")}` : null;

  return (
    <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-200 hover:border-indigo-200 transition-colors">
      <div className="w-9 h-9 bg-indigo-50 rounded-lg flex items-center justify-center flex-shrink-0">
        <svg className="w-4 h-4 text-indigo-500" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-900 truncate">
          {job.config.host1_name} & {job.config.host2_name} · {job.config.tone}
        </p>
        <p className="text-xs text-slate-400">{date}{dur ? ` · ${dur}` : ""}</p>
      </div>
      {job.status === "complete" && job.audio_url && (
        <button type="button" onClick={onPlay} className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 px-3 py-1.5 bg-indigo-50 rounded-lg transition-colors">
          Play
        </button>
      )}
      <button type="button" onClick={onDelete} className="text-slate-300 hover:text-red-400 transition-colors p-1">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </div>
  );
}

// ── Default config ────────────────────────────────────────────────────────────

const DEFAULT_CONFIG: PodcastConfig = {
  host1_name: "Alex",
  host1_voice: "Puck",
  host2_name: "Jordan",
  host2_voice: "Aoede",
  tone: "conversational",
  length: "medium",
  creativity: 0.5,
};

// ── Main page ─────────────────────────────────────────────────────────────────

export default function PodcastPage() {
  const { data: voices = [] } = usePodcastVoices();
  const { data: jobs = [], isLoading: jobsLoading } = usePodcastJobs();
  const generatePodcast = useGeneratePodcast();
  const deleteJob = useDeletePodcastJob();

  const [blogContent, setBlogContent] = useState("");
  const [config, setConfig] = useState<PodcastConfig>(DEFAULT_CONFIG);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [playingUrl, setPlayingUrl] = useState<string | null>(null);
  const [playingTitle, setPlayingTitle] = useState("");

  const { data: activeJob } = usePodcastJob(activeJobId);
  const isInProgress = activeJob && (activeJob.status === "pending" || activeJob.status === "scripting" || activeJob.status === "generating");

  function updateConfig<K extends keyof PodcastConfig>(key: K, value: PodcastConfig[K]) {
    setConfig((prev) => ({ ...prev, [key]: value }));
  }

  async function handleGenerate() {
    if (!blogContent.trim() || blogContent.trim().length < 100) return;
    try {
      const job = await generatePodcast.mutateAsync({
        blog_content: blogContent.trim(),
        config,
      });
      setActiveJobId(job.id);
      setPlayingUrl(null);
    } catch {
      // error shown via generatePodcast.error
    }
  }

  // Show player when active job completes
  useEffect(() => {
    if (activeJob?.status === "complete" && activeJob.audio_url) {
      setPlayingUrl(activeJob.audio_url);
      setPlayingTitle(`${activeJob.config.host1_name} & ${activeJob.config.host2_name}`);
    }
  }, [activeJob?.status, activeJob?.audio_url]);

  const toneOptions: { value: PodcastConfig["tone"]; label: string; desc: string }[] = [
    { value: "conversational", label: "Conversational", desc: "Friendly chat" },
    { value: "interview",      label: "Interview",      desc: "Host interviews guest" },
    { value: "debate",         label: "Debate",         desc: "Healthy disagreement" },
    { value: "educational",    label: "Educational",    desc: "Teach the listener" },
  ];

  const lengthOptions: { value: PodcastConfig["length"]; label: string; desc: string }[] = [
    { value: "short",  label: "Short",  desc: "3–5 min" },
    { value: "medium", label: "Medium", desc: "8–10 min" },
    { value: "long",   label: "Long",   desc: "15–18 min" },
  ];

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-7 h-7 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                </svg>
              </div>
              <h1 className="text-xl font-bold text-slate-900">Blog to Podcast</h1>
            </div>
            <p className="text-sm text-slate-500">Turn any blog post into a natural two-host AI podcast.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

          {/* Left: input + config */}
          <div className="lg:col-span-3 space-y-5">

            {/* Blog input */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Blog content</label>
              <textarea
                value={blogContent}
                onChange={(e) => setBlogContent(e.target.value)}
                placeholder="Paste your blog post here… (min 100 characters)"
                rows={10}
                className="w-full text-sm border border-slate-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 resize-none placeholder:text-slate-400"
              />
              <p className="text-xs text-slate-400">{blogContent.trim().length} characters</p>
            </div>

            {/* Tone */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Tone</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {toneOptions.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => updateConfig("tone", t.value)}
                    className={[
                      "py-2.5 px-3 rounded-xl border text-left transition-all",
                      config.tone === t.value
                        ? "bg-indigo-600 border-indigo-600 text-white"
                        : "bg-white border-slate-200 text-slate-700 hover:border-indigo-300",
                    ].join(" ")}
                  >
                    <p className="text-xs font-semibold">{t.label}</p>
                    <p className={`text-[11px] mt-0.5 ${config.tone === t.value ? "text-indigo-200" : "text-slate-400"}`}>{t.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Length */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Length</label>
              <div className="flex gap-2">
                {lengthOptions.map((l) => (
                  <button
                    key={l.value}
                    type="button"
                    onClick={() => updateConfig("length", l.value)}
                    className={[
                      "flex-1 py-2.5 rounded-xl border text-center transition-all",
                      config.length === l.value
                        ? "bg-indigo-600 border-indigo-600 text-white"
                        : "bg-white border-slate-200 text-slate-700 hover:border-indigo-300",
                    ].join(" ")}
                  >
                    <p className="text-xs font-semibold">{l.label}</p>
                    <p className={`text-[11px] mt-0.5 ${config.length === l.value ? "text-indigo-200" : "text-slate-400"}`}>{l.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Creativity slider */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Creativity</label>
                <span className="text-xs text-slate-400">
                  {config.creativity < 0.35 ? "Faithful to source" : config.creativity > 0.65 ? "Free to expand" : "Balanced"}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={config.creativity}
                onChange={(e) => updateConfig("creativity", parseFloat(e.target.value))}
                className="w-full accent-indigo-600"
              />
              <div className="flex justify-between text-[11px] text-slate-400">
                <span>Stick to blog</span>
                <span>Editorialize freely</span>
              </div>
            </div>

          </div>

          {/* Right: speaker config + generate */}
          <div className="lg:col-span-2 space-y-5">

            {/* Speaker 1 */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Host 1</p>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Name</label>
                <input
                  value={config.host1_name}
                  onChange={(e) => updateConfig("host1_name", e.target.value)}
                  maxLength={50}
                  className="w-full text-sm border border-slate-300 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              {voices.length > 0 && (
                <VoicePicker label="Voice" value={config.host1_voice} onChange={(v) => updateConfig("host1_voice", v)} voices={voices} />
              )}
            </div>

            {/* Speaker 2 */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Host 2</p>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Name</label>
                <input
                  value={config.host2_name}
                  onChange={(e) => updateConfig("host2_name", e.target.value)}
                  maxLength={50}
                  className="w-full text-sm border border-slate-300 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              {voices.length > 0 && (
                <VoicePicker label="Voice" value={config.host2_voice} onChange={(v) => updateConfig("host2_voice", v)} voices={voices} />
              )}
            </div>

            {/* Generate button */}
            <button
              type="button"
              onClick={handleGenerate}
              disabled={blogContent.trim().length < 100 || !!isInProgress || generatePodcast.isPending}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-sm rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              {generatePodcast.isPending || isInProgress ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" /></svg>
                  Generating…
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" /></svg>
                  Generate podcast
                </>
              )}
            </button>

            {generatePodcast.error && (
              <p className="text-xs text-red-600 text-center">
                {(generatePodcast.error as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? "Failed to start generation"}
              </p>
            )}
          </div>
        </div>

        {/* Active job status */}
        {activeJobId && activeJob && activeJob.status !== "complete" && (
          <StatusBanner status={activeJob.status} error={activeJob.error} />
        )}

        {/* Player — shown when a new job just completed */}
        {playingUrl && !jobs.some((j) => j.audio_url === playingUrl) && (
          <PodcastPlayer url={playingUrl} title={playingTitle} />
        )}

        {/* History */}
        {!jobsLoading && jobs.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Past podcasts</h2>
            <div className="space-y-2">
              {jobs.map((job) => (
                <div key={job.id}>
                  <HistoryItem
                    job={job}
                    onPlay={() => {
                      if (job.audio_url) {
                        setPlayingUrl(job.audio_url);
                        setPlayingTitle(`${job.config.host1_name} & ${job.config.host2_name}`);
                      }
                    }}
                    onDelete={() => deleteJob.mutate(job.id)}
                  />
                  {playingUrl === job.audio_url && (
                    <div className="mt-2">
                      <PodcastPlayer url={playingUrl} title={playingTitle} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
