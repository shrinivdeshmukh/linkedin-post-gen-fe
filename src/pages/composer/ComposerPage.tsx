import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "../../lib/api";
import { useParams, useLocation } from "react-router-dom";
import { AIResultCard } from "./components/AIResultCard";
import { PostEditor } from "./components/PostEditor";
import { LinkedInPreview } from "./components/LinkedInPreview";
import { PollBuilder, type PollData } from "./components/PollBuilder";
import { CarouselBuilder, type Slide } from "./components/CarouselBuilder";
import { ImageUploadPanel } from "./components/ImageUploadPanel";
import { VideoUploadPanel } from "./components/VideoUploadPanel";
import { ContextAttachmentPanel } from "./components/ContextAttachmentPanel";
import type { Video } from "../../lib/api-hooks";
import { Button } from "../../components/ui/Button";
import {
  useCreatePost,
  useUpdatePost,
  useGenerateAI,
  useSubmitPost,
  usePublishPost,
  useSchedulePost,
  useUnschedulePost,
  useApprovePost,
  useLinkedInStatus,
  type PostType,
  type PostStatus,
  type AIResult,
  type Post,
} from "../../lib/api-hooks";
import { useMe } from "../../lib/api-hooks";

type Phase = "setup" | "generating" | "results" | "editing";

const DEFAULT_POLL: PollData = {
  question: "",
  options: ["", ""],
  duration_days: 7,
};

const MODEL_ORDER = ["claude", "gemini"] as const;
const MODEL_LABELS: Record<string, string> = {
  claude: "Option 1",
  gemini: "Option 2",
};

const POST_TYPE_OPTIONS: { type: PostType; label: string; icon: React.ReactNode }[] = [
  {
    type: "video",
    label: "Video",
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.677V15.32a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
      </svg>
    ),
  },
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
  {
    type: "link",
    label: "Link",
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
      </svg>
    ),
  },
];

export default function ComposerPage() {
  const { postId: urlPostId } = useParams<{ postId: string }>();
  const location = useLocation();
  const locationState = location.state as { rawContext?: string; spark?: { topic?: string; rawContext?: string } } | null;
  const sparkState = locationState?.spark;
  const { data: me } = useMe();
  // No-cache fetch — always load fresh post data, never show stale content
  const { data: existingPost } = useQuery<Post>({
    queryKey: ["post-composer", urlPostId],
    queryFn: async () => (await api.get(`/posts/${urlPostId}`)).data,
    enabled: !!urlPostId,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: "always",
  });
  const { data: liAccount } = useLinkedInStatus();

  const [postType, setPostType] = useState<PostType>("text");
  const [postLength, setPostLength] = useState<"short" | "medium" | "long">("medium");
  const [topic, setTopic] = useState(sparkState?.topic ?? "");
  const [postId, setPostId] = useState<string | null>(urlPostId ?? null);
  const [content, setContent] = useState("");
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [activeModel, setActiveModel] = useState<string>("openai");
  const [aiResults, setAiResults] = useState<AIResult[] | null>(null);
  const [phase, setPhase] = useState<Phase>("setup");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [linkUrl, setLinkUrl] = useState("");
  const [slides, setSlides] = useState<Slide[]>([]);
  const [carouselMode, setCarouselMode] = useState<"builder" | "upload">("builder");
  const [carouselPdf, setCarouselPdf] = useState<{ name: string; base64: string } | null>(null);
  const [documentContext, setDocumentContext] = useState<string | null>(null);
  const initialRawContext = sparkState?.rawContext ?? locationState?.rawContext ?? "";
  const [rawContext, setRawContext] = useState(initialRawContext);
  const [showRawContext, setShowRawContext] = useState(!!initialRawContext);
  const [pollData, setPollData] = useState<PollData>(DEFAULT_POLL);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [scheduleDate, setScheduleDate] = useState<string>("");
  const [scheduleTime, setScheduleTime] = useState<string>("09:00");
  const [scheduledAt, setScheduledAt] = useState<string | null>(null);
  const [postStatus, setPostStatus] = useState<PostStatus>("draft");
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);
  const [rejectMode, setRejectMode] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const hydrated = useRef(false);

  // Load existing post into state once when fresh data arrives
  useEffect(() => {
    if (existingPost && !hydrated.current) {
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
      const savedLinkUrl = existingPost.content_json?.link_url as string | undefined;
      if (savedLinkUrl) setLinkUrl(savedLinkUrl);
      const savedSlides = existingPost.content_json?.slides as Slide[] | undefined;
      if (savedSlides && savedSlides.length > 0) setSlides(savedSlides);
      const savedPdfB64 = existingPost.content_json?.carousel_pdf as string | undefined;
      const savedPdfName = existingPost.content_json?.carousel_pdf_name as string | undefined;
      if (savedPdfB64) {
        setCarouselMode("upload");
        setCarouselPdf({ name: savedPdfName ?? "document.pdf", base64: savedPdfB64 });
      }
      if (existingPost.content) setPhase("editing");
      if (existingPost.scheduled_at) {
        const d = new Date(existingPost.scheduled_at);
        const off = d.getTimezoneOffset() * 60000;
        const local = new Date(d.getTime() - off);
        setScheduleDate(local.toISOString().slice(0, 10));
        setScheduleTime(local.toISOString().slice(11, 16));
        setScheduledAt(existingPost.scheduled_at);
      }
      setPostStatus((existingPost.status as PostStatus) ?? "draft");
      if (existingPost.rejection_reason) setRejectionReason(existingPost.rejection_reason);
      hydrated.current = true;
    }
  }, [existingPost]);

  const createPost = useCreatePost();
  const updatePost = useUpdatePost();
  const generateAI = useGenerateAI();
  const submitPost = useSubmitPost();
  const publishPost = usePublishPost();
  const schedulePost = useSchedulePost();
  const unschedulePost = useUnschedulePost();
  const approvePost = useApprovePost();

  function handleTypeToggle(type: PostType) {
    const next = postType === type ? "text" : type;
    setPostType(next);
    // Only clear attachment state — never wipe content, postId, aiResults, or phase
    setImageUrl(null);
    setSelectedVideo(null);
    setLinkUrl("");
    setSlides([]);
    setCarouselMode("builder");
    setCarouselPdf(null);
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
      const results = await generateAI.mutateAsync({ postId: id, topic, document_context: documentContext, raw_context: rawContext.trim() || null, post_length: postLength });
      setAiResults(results);
      const fallback = results.find((r) => !r.error);
      setActiveModel(fallback?.model ?? "claude");
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
      const extraJson: Record<string, unknown> = {};
      if (postType === "link" && linkUrl) extraJson.link_url = linkUrl;
      if (postType === "carousel") {
        if (carouselMode === "upload" && carouselPdf) {
          extraJson.carousel_pdf = carouselPdf.base64;
          extraJson.carousel_pdf_name = carouselPdf.name;
        } else if (slides.length > 0) {
          extraJson.slides = slides;
        }
      }
      await updatePost.mutateAsync({
        id: postId,
        content,
        ai_model_used: selectedModel ?? undefined,
        ...(Object.keys(extraJson).length > 0 ? { content_json: extraJson } : {}),
      });
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch (err) {
      setSaveStatus("error");
      throw err;
    }
  }

  async function handleSubmitForApproval() {
    if (!postId) return;
    try {
      await handleSaveDraft();
    } catch {
      return;
    }
    await submitPost.mutateAsync(postId);
    setPostStatus("pending_approval");
  }

  const activeResult = aiResults?.find((r) => r.model === activeModel) ?? null;
  const isOwner = me?.role === "owner";
  const canSubmit = phase === "editing" && content.trim().length > 0 && !!postId;
  const liConnected = !!liAccount?.is_active;

  async function handlePublishToLinkedIn() {
    if (!postId) return;
    try {
      await handleSaveDraft();
    } catch {
      return;
    }
    await publishPost.mutateAsync(postId);
    setPostStatus("published");
  }

  async function handleSchedule() {
    if (!postId || !scheduleDate) return;
    try {
      await handleSaveDraft();
    } catch {
      return;
    }
    const publishAt = new Date(`${scheduleDate}T${scheduleTime}:00`).toISOString();
    await schedulePost.mutateAsync({ postId, publishAt });
    setScheduledAt(publishAt);
    setPostStatus("scheduled");
  }

  async function handleUnschedule() {
    if (!postId) return;
    await unschedulePost.mutateAsync(postId);
    setScheduledAt(null);
    setScheduleDate("");
    setScheduleTime("09:00");
    setPostStatus("approved");
  }

  async function handleApprove() {
    if (!postId) return;
    await approvePost.mutateAsync({ id: postId, action: "approve" });
    setPostStatus("approved");
    setRejectMode(false);
  }

  async function handleReject() {
    if (!postId) return;
    await approvePost.mutateAsync({ id: postId, action: "reject", reason: rejectReason || undefined });
    setPostStatus("rejected");
    setRejectionReason(rejectReason || null);
    setRejectMode(false);
    setRejectReason("");
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
                Copy
              </Button>
              {["draft", "rejected"].includes(postStatus) && (
                <Button variant="outline" size="sm" onClick={handleSaveDraft} loading={saveStatus === "saving"} disabled={!postId}>
                  Save draft
                </Button>
              )}
              {!isOwner && ["draft", "rejected"].includes(postStatus) && (
                <Button size="sm" onClick={handleSubmitForApproval} disabled={!canSubmit} loading={submitPost.isPending}>
                  Submit for approval
                </Button>
              )}
              {isOwner && (postStatus === "draft" || postStatus === "pending_approval") && (
                <Button size="sm" onClick={handleApprove} loading={approvePost.isPending} disabled={approvePost.isPending || !canSubmit}>
                  Approve
                </Button>
              )}
              {isOwner && !["pending_approval", "published", "scheduled"].includes(postStatus) && (
                <Button size="sm" disabled={!canSubmit || !liConnected || publishPost.isPending} loading={publishPost.isPending} onClick={handlePublishToLinkedIn} title={!liConnected ? "Connect LinkedIn in Settings first" : undefined}>
                  {liConnected ? "Publish" : "Connect LinkedIn"}
                </Button>
              )}
              {postStatus === "pending_approval" && !isOwner && (
                <span className="text-xs text-amber-600 font-medium bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">Awaiting review</span>
              )}
              {postStatus === "scheduled" && (
                <span className="text-xs text-indigo-600 font-medium bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-full">Scheduled</span>
              )}
              {postStatus === "published" && (
                <span className="text-xs text-emerald-600 font-medium bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">Published</span>
              )}
              {postStatus === "rejected" && (
                <span className="text-xs text-red-600 font-medium bg-red-50 border border-red-200 px-2.5 py-1 rounded-full">Rejected</span>
              )}
            </>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 flex flex-col md:flex-row overflow-y-auto md:overflow-hidden">
        {/* Left panel */}
        <div className="flex-1 md:overflow-y-auto px-4 py-4 md:px-6 md:py-6 space-y-6">

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

            {/* Post length selector */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-medium">Length:</span>
              {(["short", "medium", "long"] as const).map((len) => (
                <button
                  key={len}
                  type="button"
                  disabled={phase === "generating"}
                  onClick={() => setPostLength(len)}
                  className={[
                    "px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-150 capitalize disabled:opacity-50 disabled:cursor-not-allowed",
                    postLength === len
                      ? "bg-indigo-600 text-white border-indigo-600"
                      : "bg-white text-slate-500 border-slate-200 hover:border-indigo-300 hover:text-indigo-600",
                  ].join(" ")}
                >
                  {len}
                </button>
              ))}
              <span className="text-xs text-slate-400">
                {postLength === "short" ? "~300–600 chars" : postLength === "medium" ? "~600–1200 chars" : "~1500–2500 chars"}
              </span>
            </div>

            <ContextAttachmentPanel onContext={setDocumentContext} />

            {/* Raw brain dump */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setShowRawContext((v) => !v)}
                className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-indigo-600 transition-colors font-medium"
              >
                <svg className={`w-3 h-3 transition-transform ${showRawContext ? "rotate-90" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
                What actually happened? <span className="font-normal text-slate-300">(optional — makes posts more personal)</span>
              </button>
              {showRawContext && (
                <textarea
                  value={rawContext}
                  onChange={(e) => setRawContext(e.target.value)}
                  placeholder="Dump it raw — what really happened? A specific moment, a number, a mistake, a realisation. The messier and more specific the better. e.g. 'We missed our Q3 target by 40%. I blamed the market for 2 weeks before I realised it was our onboarding that was broken…'"
                  rows={4}
                  className="w-full px-3.5 py-3 text-sm text-slate-900 bg-amber-50 border border-amber-200 rounded-xl placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent resize-none"
                />
              )}
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
                Generating options…
              </div>
              <div className="rounded-2xl border-2 border-slate-200 bg-slate-50 p-5 space-y-3 animate-pulse">
                <div className="flex gap-2">
                  {["Option 1", "Option 2"].map((m) => (
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

          {/* Video panel */}
          {postType === "video" && (
            <VideoUploadPanel
              videoId={selectedVideo?.id ?? null}
              onContext={setDocumentContext}
              onChange={(video) => {
                setSelectedVideo(video);
                if (!video) setDocumentContext(null);
                if (postId) {
                  updatePost.mutate({
                    id: postId,
                    content_json: video ? { video_id: video.id } : {},
                  });
                }
              }}
            />
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

          {/* Link URL panel */}
          {postType === "link" && (
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Article / link URL</label>
              <input
                type="url"
                value={linkUrl}
                onChange={(e) => {
                  setLinkUrl(e.target.value);
                  if (postId) {
                    updatePost.mutate({ id: postId, content_json: { link_url: e.target.value } });
                  }
                }}
                placeholder="https://…"
                className="w-full px-4 py-2.5 text-sm text-slate-900 bg-white border border-slate-300 rounded-xl placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              <p className="text-xs text-slate-400">LinkedIn will automatically pull the preview card for this URL.</p>
            </div>
          )}

          {/* Editor */}
          {phase === "editing" && (
            <div className="space-y-5">
              <PostEditor content={content} onChange={setContent} />
              {postType === "poll" && <PollBuilder data={pollData} onChange={setPollData} />}
              {postType === "carousel" && (
                <div className="space-y-3">
                  {/* Mode toggle */}
                  <div className="flex gap-1 p-1 bg-slate-100 rounded-xl w-fit">
                    {(["builder", "upload"] as const).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setCarouselMode(mode)}
                        className={[
                          "px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150",
                          carouselMode === mode
                            ? "bg-white text-slate-900 shadow-sm"
                            : "text-slate-500 hover:text-slate-700",
                        ].join(" ")}
                      >
                        {mode === "builder" ? "Build slides" : "Upload PDF"}
                      </button>
                    ))}
                  </div>

                  {carouselMode === "builder" && (
                    <CarouselBuilder
                      slides={slides}
                      onChange={(next) => {
                        setSlides(next);
                        if (postId) {
                          updatePost.mutate({ id: postId, content_json: { slides: next } });
                        }
                      }}
                    />
                  )}

                  {carouselMode === "upload" && (
                    <div className="space-y-2">
                      {carouselPdf ? (
                        <div className="flex items-center gap-3 px-4 py-3 bg-indigo-50 border border-indigo-200 rounded-xl">
                          <svg className="w-5 h-5 text-indigo-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                          </svg>
                          <span className="text-sm text-indigo-800 font-medium flex-1 truncate">{carouselPdf.name}</span>
                          <button
                            type="button"
                            onClick={() => {
                              setCarouselPdf(null);
                              if (postId) updatePost.mutate({ id: postId, content_json: {} });
                            }}
                            className="text-xs text-indigo-400 hover:text-red-500 font-medium"
                          >
                            Remove
                          </button>
                        </div>
                      ) : (
                        <label className="flex flex-col items-center gap-2 px-5 py-6 border-2 border-dashed border-slate-200 rounded-xl cursor-pointer hover:border-indigo-300 hover:bg-indigo-50/50 transition-colors">
                          <svg className="w-8 h-8 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                          <span className="text-sm font-medium text-slate-600">Upload a PDF</span>
                          <span className="text-xs text-slate-400">Each page becomes one slide · max 100 MB</span>
                          <input
                            type="file"
                            accept="application/pdf"
                            className="sr-only"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              const reader = new FileReader();
                              reader.onload = () => {
                                const dataUrl = reader.result as string;
                                // strip "data:application/pdf;base64," prefix
                                const base64 = dataUrl.split(",")[1];
                                setCarouselPdf({ name: file.name, base64 });
                                if (postId) {
                                  updatePost.mutate({
                                    id: postId,
                                    content_json: { carousel_pdf: base64, carousel_pdf_name: file.name },
                                  });
                                }
                              };
                              reader.readAsDataURL(file);
                            }}
                          />
                        </label>
                      )}
                      <p className="text-xs text-slate-400">LinkedIn will display each page as a swipeable slide in the feed.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right panel */}
        <div className="w-full md:w-80 xl:w-96 md:flex-shrink-0 border-t md:border-t-0 md:border-l border-slate-100 bg-slate-50/50 md:flex md:flex-col">
          {/* Scrollable preview area */}
          <div className="md:flex-1 md:overflow-y-auto px-4 py-4 md:px-5 md:py-6 space-y-4">
            <LinkedInPreview
              content={content}
              displayName={me?.display_name ?? "You"}
              postType={postType}
              imageUrl={imageUrl}
            />

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

          {/* Pinned publish actions — desktop only */}
          {phase === "editing" && (
            <div className="hidden md:block flex-shrink-0 px-5 py-4 border-t border-slate-200 bg-slate-50/80 space-y-3">

              {/* ── Published ── */}
              {postStatus === "published" && (
                <div className="flex items-center gap-2 px-3 py-2.5 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <svg className="w-4 h-4 text-emerald-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <p className="text-xs font-semibold text-emerald-700">Published to LinkedIn</p>
                </div>
              )}

              {/* ── Scheduled ── */}
              {postStatus === "scheduled" && scheduledAt && (
                <div className="bg-indigo-50 border border-indigo-200 rounded-xl px-3 py-2.5 space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="text-xs font-semibold text-indigo-700">Scheduled</p>
                  </div>
                  <p className="text-xs text-indigo-600">
                    {new Date(scheduledAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </p>
                  <button onClick={handleUnschedule} disabled={unschedulePost.isPending} className="text-xs text-red-500 hover:text-red-700 font-medium disabled:opacity-50">
                    {unschedulePost.isPending ? "Removing…" : "Unschedule"}
                  </button>
                </div>
              )}

              {/* ── Pending approval (non-owner view) ── */}
              {postStatus === "pending_approval" && !isOwner && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 space-y-1.5">
                  <div className="flex items-start gap-2">
                    <svg className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-xs text-amber-700 font-medium">Submitted — awaiting owner review.</p>
                  </div>
                  <a href="/approvals" className="text-xs text-indigo-600 font-medium hover:underline pl-6">View in approvals →</a>
                </div>
              )}

              {/* ── Owner review (own draft or submitted by team member) ── */}
              {isOwner && (postStatus === "draft" || postStatus === "pending_approval") && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Review</p>
                  {!rejectMode ? (
                    <div className="flex gap-2">
                      <Button fullWidth size="md" onClick={handleApprove} loading={approvePost.isPending} disabled={!canSubmit}>
                        Approve
                      </Button>
                      {postStatus === "pending_approval" && (
                        <button
                          onClick={() => setRejectMode(true)}
                          disabled={approvePost.isPending}
                          className="flex-1 py-2 text-sm font-semibold text-red-600 bg-white border border-red-200 hover:bg-red-50 rounded-xl transition-colors disabled:opacity-50"
                        >
                          Reject
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2 bg-red-50 border border-red-100 rounded-xl p-3">
                      <textarea
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        placeholder="Reason (optional)…"
                        rows={2}
                        className="w-full text-xs border border-red-200 rounded-lg px-2.5 py-2 outline-none focus:ring-2 focus:ring-red-300 resize-none bg-white placeholder:text-slate-400"
                      />
                      <div className="flex gap-2">
                        <button onClick={handleReject} disabled={approvePost.isPending} className="flex-1 py-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50">
                          {approvePost.isPending ? "Rejecting…" : "Confirm reject"}
                        </button>
                        <button onClick={() => { setRejectMode(false); setRejectReason(""); }} className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── Rejected ── */}
              {postStatus === "rejected" && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2.5 space-y-2">
                  <p className="text-xs font-semibold text-red-700">Rejected</p>
                  {rejectionReason && <p className="text-xs text-red-600 italic">"{rejectionReason}"</p>}
                  {!isOwner && (
                    <p className="text-xs text-slate-500">Edit your post and re-submit for approval.</p>
                  )}
                </div>
              )}

              {/* ── Approved (non-owner) ── */}
              {postStatus === "approved" && !isOwner && (
                <div className="flex items-center gap-2 px-3 py-2.5 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <svg className="w-4 h-4 text-emerald-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <p className="text-xs font-semibold text-emerald-700">Approved — owner will schedule.</p>
                </div>
              )}

              {/* ── Schedule + Publish (draft, approved, or rejected for owner) ── */}
              {(postStatus === "draft" || postStatus === "approved" || (postStatus === "rejected" && !isOwner) || (isOwner && ["draft", "approved", "rejected"].includes(postStatus))) && postStatus !== "scheduled" && postStatus !== "published" && !(postStatus === "approved" && !isOwner) && (
                <>
                  <div className="space-y-1.5">
                    <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Schedule</h3>
                    <div className="flex gap-1.5">
                      <input type="date" value={scheduleDate} onChange={(e) => setScheduleDate(e.target.value)} className="flex-1 min-w-0 text-xs border border-slate-200 rounded-xl px-2.5 py-1.5 outline-none focus:ring-2 focus:ring-indigo-300 bg-white" />
                      <input type="time" value={scheduleTime} onChange={(e) => setScheduleTime(e.target.value)} className="w-24 text-xs border border-slate-200 rounded-xl px-2.5 py-1.5 outline-none focus:ring-2 focus:ring-indigo-300 bg-white" />
                    </div>
                    <Button variant="outline" fullWidth size="md" onClick={handleSchedule} disabled={!canSubmit || !scheduleDate || schedulePost.isPending} loading={schedulePost.isPending}>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      Schedule post
                    </Button>
                  </div>
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Publish</h3>
                </>
              )}

              {/* Always-available actions */}
              {postStatus !== "published" && (
                <Button variant="outline" fullWidth size="md" onClick={() => navigator.clipboard.writeText(content)}>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copy to clipboard
                </Button>
              )}
              {["draft", "rejected"].includes(postStatus) && (
                <Button variant="outline" fullWidth size="md" onClick={handleSaveDraft} loading={saveStatus === "saving"} disabled={!postId}>
                  Save as draft
                </Button>
              )}
              {!isOwner && ["draft", "rejected"].includes(postStatus) && (
                <Button fullWidth size="md" onClick={handleSubmitForApproval} loading={submitPost.isPending} disabled={!canSubmit}>
                  Submit for approval
                </Button>
              )}
              {isOwner && !["pending_approval", "published", "scheduled"].includes(postStatus) && (
                <Button fullWidth size="md" disabled={!canSubmit || !liConnected || publishPost.isPending} loading={publishPost.isPending} onClick={handlePublishToLinkedIn} title={!liConnected ? "Connect LinkedIn in Settings first" : undefined}>
                  {liConnected ? "Publish to LinkedIn" : "Connect LinkedIn in Settings"}
                </Button>
              )}
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
