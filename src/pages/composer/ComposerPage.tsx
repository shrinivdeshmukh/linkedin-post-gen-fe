import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AIResultCard } from "./components/AIResultCard";
import { PostEditor } from "./components/PostEditor";
import { LinkedInPreview } from "./components/LinkedInPreview";
import { PollBuilder, type PollData } from "./components/PollBuilder";
import { ImageUploadPanel } from "./components/ImageUploadPanel";
import { Button } from "../../components/ui/Button";
import {
  useCreatePost,
  useUpdatePost,
  useGenerateAI,
  useSubmitPost,
  usePost,
  usePublishPost,
  useLinkedInStatus,
  type PostType,
  type AIResult,
} from "../../lib/api-hooks";
import { useMe } from "../../lib/api-hooks";

type Phase = "setup" | "generating" | "results" | "editing";

const DEFAULT_POLL: PollData = {
  question: "",
  options: ["", ""],
  duration_days: 7,
};

const MODEL_ORDER = ["openai", "claude", "gemini"] as const;
const MODEL_LABELS: Record<string, string> = {
  openai: "GPT-4o",
  claude: "Claude",
  gemini: "Gemini",
};

const POST_TYPE_OPTIONS: { type: PostType; label: string; icon: React.ReactNode }[] = [
  {
    type: "image",
    label: "Image",
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    type: "carousel",
    label: "Carousel",
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
      </svg>
    ),
  },
  {
    type: "poll",
    label: "Poll",
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
];

export default function ComposerPage() {
  const navigate = useNavigate();
  const { postId: urlPostId } = useParams<{ postId: string }>();
  const { data: me } = useMe();
  const { data: existingPost } = usePost(urlPostId ?? null);
  const { data: liAccount } = useLinkedInStatus();

  const [postType, setPostType] = useState<PostType>("text");
  const [topic, setTopic] = useState("");
  const [postId, setPostId] = useState<string | null>(urlPostId ?? null);
  const [content, setContent] = useState("");
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [activeModel, setActiveModel] = useState<string>("openai");
  const [aiResults, setAiResults] = useState<AIResult[] | null>(null);
  const [phase, setPhase] = useState<Phase>("setup");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [pollData, setPollData] = useState<PollData>(DEFAULT_POLL);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [hydrated, setHydrated] = useState(!urlPostId);

  // Load existing post into state
  useEffect(() => {
    if (existingPost && !hydrated) {
      setPostType((existingPost.type as PostType) ?? "text");
      setContent(existingPost.content ?? "");
      setSelectedModel(existingPost.ai_model_used ?? null);
      setPostId(existingPost.id);
      const savedImageUrl = existingPost.content_json?.image_url as string | undefined;
      const savedImageData = existingPost.content_json?.image_data as string | undefined;
      const savedMimeType = (existingPost.content_json?.mime_type as string | undefined) ?? "image/png";
      if (savedImageUrl) {
        setImageUrl(savedImageUrl);
      } else if (savedImageData) {
        setImageUrl(`data:${savedMimeType};base64,${savedImageData}`);
      }
      if (existingPost.content) setPhase("editing");
      setHydrated(true);
    }
  }, [existingPost, hydrated]);

  const createPost = useCreatePost();
  const updatePost = useUpdatePost();
  const generateAI = useGenerateAI();
  const submitPost = useSubmitPost();
  const publishPost = usePublishPost();

  function handleTypeToggle(type: PostType) {
    const next = postType === type ? "text" : type;
    setPostType(next);
    setPostId(null);
    setAiResults(null);
    setContent("");
    setPhase("setup");
  }

  async function handleGenerate() {
    if (!topic.trim()) return;
    setPhase("generating");
    setAiResults(null);

    try {
      let id = postId;
      if (!id) {
        const post = await createPost.mutateAsync({ type: postType });
        id = post.id;
        setPostId(id);
      }
      const results = await generateAI.mutateAsync({ postId: id, topic });
      setAiResults(results);
      // Default to openai if available, otherwise first successful result
      const openaiResult = results.find((r) => r.model === "openai" && !r.error);
      const fallback = results.find((r) => !r.error);
      setActiveModel(openaiResult?.model ?? fallback?.model ?? "openai");
      setPhase("results");
    } catch {
      setPhase("setup");
    }
  }

  function handleSelectResult(fullPost: string, model: string) {
    setContent(fullPost);
    setSelectedModel(model);
    setPhase("editing");
    if (postId) {
      updatePost.mutate({ id: postId, content: fullPost, ai_model_used: model });
    }
  }

  async function handleSaveDraft() {
    if (!postId) return;
    setSaveStatus("saving");
    try {
      await updatePost.mutateAsync({ id: postId, content, ai_model_used: selectedModel ?? undefined });
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch {
      setSaveStatus("error");
    }
  }

  async function handleSubmitForApproval() {
    if (!postId) return;
    await handleSaveDraft();
    await submitPost.mutateAsync(postId);
    navigate("/approvals");
  }

  const activeResult = aiResults?.find((r) => r.model === activeModel) ?? null;
  const isOwner = me?.role === "owner";
  const canSubmit = phase === "editing" && content.trim().length > 0 && !!postId;
  const liConnected = !!liAccount?.is_active;

  async function handlePublishToLinkedIn() {
    if (!postId) return;
    await handleSaveDraft();
    await publishPost.mutateAsync(postId);
    navigate("/dashboard");
  }

  return (
    <div className="h-full flex flex-col gap-0">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-3 px-4 py-3 md:px-6 md:py-4 border-b border-slate-100 bg-white flex-shrink-0 flex-wrap">
        <div className="flex items-center gap-3">
          <h1 className="text-base md:text-lg font-bold text-slate-900">{urlPostId ? "Edit Post" : "New Post"}</h1>
          {saveStatus === "saving" && <span className="text-xs text-slate-400 animate-pulse">Saving…</span>}
          {saveStatus === "saved" && <span className="text-xs text-emerald-500 font-medium">✓ Saved</span>}
          {saveStatus === "error" && <span className="text-xs text-red-500">Save failed</span>}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {phase === "editing" && (
            <>
              <Button variant="ghost" size="sm" onClick={() => navigator.clipboard.writeText(content)}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copy
              </Button>
              <Button variant="outline" size="sm" onClick={handleSaveDraft} loading={saveStatus === "saving"} disabled={!postId}>
                Save draft
              </Button>
              {!isOwner && (
                <Button size="sm" onClick={handleSubmitForApproval} disabled={!canSubmit} loading={submitPost.isPending}>
                  Submit for approval
                </Button>
              )}
              {isOwner && (
                <Button
                  size="sm"
                  disabled={!canSubmit || !liConnected || publishPost.isPending}
                  loading={publishPost.isPending}
                  onClick={handlePublishToLinkedIn}
                  title={!liConnected ? "Connect LinkedIn in Settings first" : undefined}
                >
                  {liConnected ? "Publish to LinkedIn" : "Connect LinkedIn"}
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 flex flex-col md:flex-row overflow-auto md:overflow-hidden">
        {/* Left panel */}
        <div className="flex-1 overflow-y-auto px-4 py-4 md:px-6 md:py-6 space-y-6">

          {/* Topic input */}
          <div className="space-y-3">
            <label className="text-sm font-semibold text-slate-700">
              What do you want to post about?
            </label>
            <div className="flex gap-3">
              <textarea
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleGenerate(); }}
                placeholder="e.g. Why most leaders underestimate company culture during hypergrowth…"
                rows={2}
                className="flex-1 px-4 py-3 text-sm text-slate-900 bg-white border border-slate-300 rounded-xl placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent hover:border-slate-400 transition-colors resize-none"
              />
              <Button
                onClick={handleGenerate}
                loading={phase === "generating"}
                disabled={!topic.trim() || phase === "generating"}
                size="lg"
                className="self-start"
              >
                <SparklesIcon />
                Generate
              </Button>
            </div>

            {/* Post type checkboxes */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-slate-400 font-medium">Add:</span>
              {POST_TYPE_OPTIONS.map(({ type, label, icon }) => {
                const checked = postType === type;
                return (
                  <button
                    key={type}
                    type="button"
                    disabled={phase === "generating"}
                    onClick={() => handleTypeToggle(type)}
                    className={[
                      "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed",
                      checked
                        ? "bg-indigo-600 text-white border-indigo-600"
                        : "bg-white text-slate-500 border-slate-200 hover:border-indigo-300 hover:text-indigo-600",
                    ].join(" ")}
                  >
                    <span className={checked ? "text-white" : "text-slate-400"}>{icon}</span>
                    {label}
                    {checked && (
                      <svg className="w-3 h-3 ml-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                );
              })}
              <span className="text-xs text-slate-400">· ⌘+Enter to generate</span>
            </div>
          </div>

          {/* Generating skeleton */}
          {phase === "generating" && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-indigo-600 font-medium">
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Running Claude, GPT-4o & Gemini in parallel…
              </div>
              <div className="rounded-2xl border-2 border-slate-200 bg-slate-50 p-5 space-y-3 animate-pulse">
                <div className="flex gap-2">
                  {["GPT-4o", "Claude", "Gemini"].map((m) => (
                    <div key={m} className="h-7 w-16 bg-slate-200 rounded-lg" />
                  ))}
                </div>
                <div className="space-y-2 pt-2">
                  <div className="h-4 bg-slate-200 rounded-full w-3/4" />
                  <div className="h-3 bg-slate-200 rounded-full w-full" />
                  <div className="h-3 bg-slate-200 rounded-full w-5/6" />
                  <div className="h-3 bg-slate-200 rounded-full w-4/6" />
                </div>
              </div>
            </div>
          )}

          {/* AI Results — single model view with toggle */}
          {(phase === "results" || phase === "editing") && aiResults && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-700">AI Result</h2>
                <button
                  type="button"
                  onClick={handleGenerate}
                  className="text-xs text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Regenerate
                </button>
              </div>

              {/* Model tabs */}
              <div className="flex gap-1.5 p-1 bg-slate-100 rounded-xl w-fit">
                {MODEL_ORDER.map((model) => {
                  const result = aiResults.find((r) => r.model === model);
                  const failed = result?.error;
                  return (
                    <button
                      key={model}
                      type="button"
                      disabled={!!failed}
                      onClick={() => setActiveModel(model)}
                      className={[
                        "px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed",
                        activeModel === model
                          ? "bg-white text-slate-900 shadow-sm"
                          : "text-slate-500 hover:text-slate-700",
                      ].join(" ")}
                    >
                      {MODEL_LABELS[model]}
                      {failed && <span className="ml-1 text-red-400">✕</span>}
                    </button>
                  );
                })}
              </div>

              {/* Single result card */}
              {activeResult && (
                <AIResultCard
                  result={activeResult}
                  selected={selectedModel === activeResult.model}
                  onSelect={handleSelectResult}
                />
              )}
            </div>
          )}

          {/* Image panel — visible as soon as Image is checked */}
          {postType === "image" && (
            <ImageUploadPanel
              postId={postId}
              topic={topic}
              imageUrl={imageUrl}
              onChange={(url) => {
                setImageUrl(url);
                if (postId) {
                  updatePost.mutate({
                    id: postId,
                    content_json: url ? { image_url: url } : {},
                  });
                }
              }}
            />
          )}

          {/* Editor */}
          {phase === "editing" && (
            <div className="space-y-5">
              <PostEditor content={content} onChange={setContent} />
              {postType === "poll" && <PollBuilder data={pollData} onChange={setPollData} />}
              {postType === "carousel" && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-sm text-amber-700">
                  <p className="font-semibold">Carousel slide builder coming soon</p>
                  <p className="text-xs mt-1 text-amber-600">Write your slide content in the editor above. The carousel PDF generator will be available in the next update.</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right panel */}
        <div className="w-full md:w-80 xl:w-96 md:flex-shrink-0 border-t md:border-t-0 md:border-l border-slate-100 bg-slate-50/50 overflow-y-auto px-4 py-4 md:px-5 md:py-6 space-y-6">
          <LinkedInPreview
            content={content}
            displayName={me?.display_name ?? "You"}
            postType={postType}
            imageUrl={imageUrl}
          />

          {phase === "editing" && (
            <div className="space-y-2 pt-2 border-t border-slate-200">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Publish</h3>
              <Button variant="outline" fullWidth size="md" onClick={() => navigator.clipboard.writeText(content)}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copy to clipboard
              </Button>
              <Button variant="outline" fullWidth size="md" onClick={handleSaveDraft} loading={saveStatus === "saving"} disabled={!postId}>
                Save as draft
              </Button>
              {!isOwner && (
                <Button fullWidth size="md" onClick={handleSubmitForApproval} loading={submitPost.isPending} disabled={!canSubmit}>
                  Submit for approval
                </Button>
              )}
              {isOwner && (
                <Button
                  fullWidth
                  size="md"
                  disabled={!canSubmit || !liConnected || publishPost.isPending}
                  loading={publishPost.isPending}
                  onClick={handlePublishToLinkedIn}
                  title={!liConnected ? "Connect LinkedIn in Settings first" : undefined}
                >
                  {liConnected ? "Publish to LinkedIn" : "Connect LinkedIn in Settings"}
                </Button>
              )}
            </div>
          )}

          {phase === "setup" && (
            <div className="bg-indigo-50 rounded-2xl p-4 space-y-2">
              <p className="text-xs font-semibold text-indigo-700 uppercase tracking-wider">Tips</p>
              <ul className="text-xs text-indigo-600 space-y-1.5 list-disc list-inside">
                <li>Be specific — "Why remote teams fail" beats "remote work"</li>
                <li>Add a personal angle or recent experience</li>
                <li>Include the audience: "For founders who…"</li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SparklesIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
    </svg>
  );
}
