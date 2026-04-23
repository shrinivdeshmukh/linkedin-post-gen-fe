import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSeoResearch, useCreatePost, useGenerateBlogOutline } from "../lib/api-hooks";
import { Button } from "./ui/Button";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

type Step = "pick" | "blog-topic" | "blog-seo";

const WORD_COUNT_OPTIONS = [800, 1200, 1500, 2000, 2500];

export function ComposeModal({ isOpen, onClose }: Props) {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("pick");
  const [topic, setTopic] = useState("");
  const [wordCount, setWordCount] = useState(1200);
  const [createdPostId, setCreatedPostId] = useState<string | null>(null);

  const createPost = useCreatePost();
  const seoResearch = useSeoResearch();
  const generateOutline = useGenerateBlogOutline();

  const seoResult = seoResearch.data;

  if (!isOpen) return null;

  function handleClose() {
    setStep("pick");
    setTopic("");
    setCreatedPostId(null);
    seoResearch.reset();
    onClose();
  }

  async function handleBlogContinue() {
    if (!topic.trim()) return;
    // Create draft post first
    const post = await createPost.mutateAsync({ type: "text", medium: "blog", title: topic });
    setCreatedPostId(post.id);
    // Run SEO research
    await seoResearch.mutateAsync(topic);
    setStep("blog-seo");
  }

  async function handleGenerateOutline() {
    if (!createdPostId || !seoResult) return;
    await generateOutline.mutateAsync({
      postId: createdPostId,
      primary_keyword: seoResult.primary_keyword,
      secondary_keywords: seoResult.secondary_keywords,
      word_count: wordCount,
    });
    handleClose();
    navigate(`/blog/${createdPostId}`);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md mx-4 p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900">
            {step === "pick" ? "Create content" : step === "blog-topic" ? "Blog topic" : "SEO research"}
          </h2>
          <button onClick={handleClose} className="text-slate-400 hover:text-slate-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {step === "pick" && (
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => { handleClose(); navigate("/composer"); }}
              className="p-5 rounded-xl border-2 border-slate-200 hover:border-indigo-400 text-left transition-all group"
            >
              <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center mb-3 group-hover:bg-indigo-100">
                <svg className="w-4 h-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-slate-800">LinkedIn post</p>
              <p className="text-xs text-slate-400 mt-0.5">Short-form, auto-publish</p>
            </button>
            <button
              onClick={() => setStep("blog-topic")}
              className="p-5 rounded-xl border-2 border-slate-200 hover:border-indigo-400 text-left transition-all group"
            >
              <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center mb-3 group-hover:bg-indigo-100">
                <svg className="w-4 h-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-slate-800">Blog article</p>
              <p className="text-xs text-slate-400 mt-0.5">Long-form, post on website</p>
            </button>
          </div>
        )}

        {step === "blog-topic" && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">What do you want to write about?</label>
              <textarea
                value={topic}
                onChange={e => setTopic(e.target.value)}
                rows={3}
                placeholder="e.g. Why fintech founders underestimate regulatory risk"
                className="w-full px-3.5 py-3 text-sm border border-slate-300 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-400"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setStep("pick")}>Back</Button>
              <Button
                fullWidth
                loading={createPost.isPending || seoResearch.isPending}
                disabled={!topic.trim() || createPost.isPending || seoResearch.isPending}
                onClick={handleBlogContinue}
              >
                {seoResearch.isPending ? "Researching keywords…" : "Continue"}
              </Button>
            </div>
          </div>
        )}

        {step === "blog-seo" && seoResult && (
          <div className="space-y-4">
            <div className="space-y-3">
              <div>
                <p className="text-xs font-medium text-slate-500 mb-1">Primary keyword</p>
                <span className="inline-block bg-indigo-50 text-indigo-700 text-sm font-medium px-3 py-1 rounded-lg">{seoResult.primary_keyword}</span>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 mb-1">Secondary keywords</p>
                <div className="flex flex-wrap gap-1.5">
                  {seoResult.secondary_keywords.map((kw, i) => (
                    <span key={i} className="bg-slate-100 text-slate-600 text-xs px-2.5 py-1 rounded-lg">{kw}</span>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 mb-1.5">Target word count</p>
                <div className="flex flex-wrap gap-1.5">
                  {WORD_COUNT_OPTIONS.map(wc => (
                    <button
                      key={wc}
                      onClick={() => setWordCount(wc)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${wordCount === wc ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300"}`}
                    >
                      {wc.toLocaleString()}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-slate-400 mt-1">Recommended: ~{seoResult.recommended_word_count.toLocaleString()} words based on what's ranking</p>
              </div>
            </div>
            <Button
              fullWidth
              loading={generateOutline.isPending}
              disabled={generateOutline.isPending}
              onClick={handleGenerateOutline}
            >
              {generateOutline.isPending ? "Generating outline…" : "Generate outline"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
