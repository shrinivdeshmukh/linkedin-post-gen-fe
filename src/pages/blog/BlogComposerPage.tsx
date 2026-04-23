import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import CharacterCount from "@tiptap/extension-character-count";
import Placeholder from "@tiptap/extension-placeholder";
import { marked } from "marked";
import TurndownService from "turndown";
import {
  usePost,
  useUpdatePost,
  useGenerateBlogOutline,
  useGenerateBlogDraft,
  useSeoResearch,
  useGenerateImage,
} from "../../lib/api-hooks";
import { Button } from "../../components/ui/Button";

const WORD_COUNT_OPTIONS = [800, 1200, 1500, 2000, 2500];

const td = new TurndownService({ headingStyle: "atx", bulletListMarker: "-" });

function EditorToolbar({ editor }: { editor: ReturnType<typeof useEditor> }) {
  if (!editor) return null;
  const btn = (active: boolean, onClick: () => void, label: string) => (
    <button
      type="button"
      onClick={onClick}
      className={`px-2 py-1 rounded text-xs font-medium transition-colors ${active ? "bg-indigo-100 text-indigo-700" : "text-slate-600 hover:bg-slate-100"}`}
    >
      {label}
    </button>
  );
  return (
    <div className="flex items-center gap-1 px-3 py-2 border-b border-slate-200 bg-white flex-wrap">
      {btn(editor.isActive("heading", { level: 1 }), () => editor.chain().focus().toggleHeading({ level: 1 }).run(), "H1")}
      {btn(editor.isActive("heading", { level: 2 }), () => editor.chain().focus().toggleHeading({ level: 2 }).run(), "H2")}
      {btn(editor.isActive("heading", { level: 3 }), () => editor.chain().focus().toggleHeading({ level: 3 }).run(), "H3")}
      <span className="w-px h-4 bg-slate-200 mx-1" />
      {btn(editor.isActive("bold"), () => editor.chain().focus().toggleBold().run(), "B")}
      {btn(editor.isActive("italic"), () => editor.chain().focus().toggleItalic().run(), "I")}
      {btn(editor.isActive("blockquote"), () => editor.chain().focus().toggleBlockquote().run(), '"')}
      <span className="w-px h-4 bg-slate-200 mx-1" />
      {btn(editor.isActive("bulletList"), () => editor.chain().focus().toggleBulletList().run(), "• List")}
      {btn(editor.isActive("orderedList"), () => editor.chain().focus().toggleOrderedList().run(), "1. List")}
    </div>
  );
}

export default function BlogComposerPage() {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();
  const { data: post, isLoading } = usePost(postId ?? null);
  const updatePost = useUpdatePost();
  const generateOutline = useGenerateBlogOutline();
  const generateDraft = useGenerateBlogDraft();
  const seoResearch = useSeoResearch();
  const generateImage = useGenerateImage();

  const [hydrated, setHydrated] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "idle">("idle");
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied">("idle");
  const [wordCount, setWordCount] = useState(1200);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // suppress unused warning — useCallback used below
  void useCallback;

  const cj = post?.content_json as Record<string, unknown> | undefined;

  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false }),
      CharacterCount,
      Placeholder.configure({ placeholder: "Your blog article will appear here after generation…" }),
    ],
    content: "",
    onUpdate: ({ editor: ed }) => {
      setSaveStatus("saving");
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(async () => {
        const markdown = td.turndown(ed.getHTML());
        if (postId) {
          await updatePost.mutateAsync({ id: postId, content: markdown });
          setSaveStatus("saved");
        }
      }, 1500);
    },
  });

  useEffect(() => {
    if (post?.content && editor && !hydrated) {
      const html = marked.parse(post.content) as string;
      editor.commands.setContent(html);
      setHydrated(true);
    }
    if (cj?.target_word_count && typeof cj.target_word_count === "number") {
      setWordCount(cj.target_word_count);
    }
  }, [post, editor, hydrated, cj?.target_word_count]);

  async function handleCopyFormatted() {
    if (!editor) return;
    const html = editor.getHTML();
    try {
      const blob = new Blob([html], { type: "text/html" });
      const item = new ClipboardItem({ "text/html": blob, "text/plain": new Blob([html], { type: "text/plain" }) });
      await navigator.clipboard.write([item]);
    } catch {
      await navigator.clipboard.writeText(html);
    }
    setCopyStatus("copied");
    setTimeout(() => setCopyStatus("idle"), 2000);
  }

  async function handleCopyMarkdown() {
    if (!editor) return;
    const markdown = td.turndown(editor.getHTML());
    await navigator.clipboard.writeText(markdown);
    setCopyStatus("copied");
    setTimeout(() => setCopyStatus("idle"), 2000);
  }

  async function handleGenerateOutline() {
    if (!postId || !cj?.primary_keyword) return;
    await generateOutline.mutateAsync({
      postId,
      primary_keyword: cj.primary_keyword as string,
      secondary_keywords: (cj.secondary_keywords as string[]) || [],
      word_count: wordCount,
    });
  }

  async function handleGenerateDraft() {
    if (!postId) return;
    const result = await generateDraft.mutateAsync(postId);
    if (result.content && editor) {
      const html = marked.parse(result.content) as string;
      editor.commands.setContent(html);
      setHydrated(true);
    }
  }

  async function handleRunSeo() {
    if (!postId || !post?.title) return;
    const result = await seoResearch.mutateAsync(post.title);
    const existingCj = (post?.content_json as Record<string, unknown>) || {};
    await updatePost.mutateAsync({
      id: postId,
      content_json: {
        ...existingCj,
        primary_keyword: result.primary_keyword,
        secondary_keywords: result.secondary_keywords,
        meta_title: result.meta_title,
        meta_description: result.meta_description,
        recommended_word_count: result.recommended_word_count,
      },
    });
  }

  async function handleGenerateHeroImage() {
    if (!postId || !post?.title) return;
    const result = await generateImage.mutateAsync({
      postId,
      topic: post.title,
      brand_colors: [],
      style: "professional",
      aspect_ratio: "16:9",
    });
    const existingCj = (post?.content_json as Record<string, unknown>) || {};
    await updatePost.mutateAsync({
      id: postId,
      content_json: {
        ...existingCj,
        hero_image_data: result.image_data,
        hero_image_mime: result.mime_type,
      },
    });
  }

  function handleDownloadImage() {
    const imageData = cj?.hero_image_data as string | undefined;
    const mime = (cj?.hero_image_mime as string | undefined) ?? "image/png";
    if (!imageData) return;
    const a = document.createElement("a");
    a.href = `data:${mime};base64,${imageData}`;
    a.download = `${post?.title ?? "hero-image"}.png`;
    a.click();
  }

  const wordCountNum = (editor?.storage.characterCount as { words: () => number } | undefined)?.words() ?? 0;
  const targetWords = (cj?.target_word_count as number | undefined) ?? wordCount;
  const wordCountPct = targetWords > 0 ? Math.min(100, Math.round((wordCountNum / targetWords) * 100)) : 0;

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-6 py-3 border-b border-slate-200 bg-white flex-shrink-0">
        <button onClick={() => navigate(-1)} className="text-slate-400 hover:text-slate-600 transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-semibold text-slate-900 truncate">{post?.title ?? "Blog article"}</h1>
          <p className="text-xs text-slate-400">
            {saveStatus === "saving" ? "Saving…" : saveStatus === "saved" ? "Saved" : "Blog"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleCopyMarkdown}>
            Copy Markdown
          </Button>
          <Button size="sm" onClick={handleCopyFormatted}>
            {copyStatus === "copied" ? "Copied!" : "Copy formatted"}
          </Button>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Editor panel */}
        <div className="flex-1 flex flex-col overflow-hidden border-r border-slate-200">
          <EditorToolbar editor={editor} />

          {/* Hero image */}
          {cj?.hero_image_data ? (
            <div className="relative mx-6 mt-4 rounded-xl overflow-hidden" style={{ aspectRatio: "16/9" }}>
              <img
                src={`data:${(cj.hero_image_mime as string | undefined) ?? "image/png"};base64,${cj.hero_image_data as string}`}
                alt="Hero"
                className="w-full h-full object-cover"
              />
              <button
                onClick={handleDownloadImage}
                className="absolute top-3 right-3 bg-white/90 hover:bg-white text-slate-700 text-xs font-medium px-3 py-1.5 rounded-lg shadow-sm transition-colors"
              >
                Download
              </button>
            </div>
          ) : (
            <div className="mx-6 mt-4">
              <button
                onClick={handleGenerateHeroImage}
                disabled={generateImage.isPending || !post?.title}
                className="w-full py-8 border-2 border-dashed border-slate-200 rounded-xl text-sm text-slate-400 hover:border-indigo-300 hover:text-indigo-500 disabled:opacity-50 transition-colors"
              >
                {generateImage.isPending ? "Generating hero image…" : "+ Generate hero image (16:9)"}
              </button>
            </div>
          )}

          <div className="flex-1 overflow-y-auto px-6 py-4">
            <EditorContent
              editor={editor}
              className="prose prose-slate max-w-none min-h-[400px] focus:outline-none [&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-[400px]"
            />
          </div>
        </div>

        {/* SEO sidebar */}
        <div className="w-72 flex-shrink-0 overflow-y-auto p-5 space-y-5 bg-slate-50">
          {/* Generate actions */}
          {!post?.content && (
            <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
              <p className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Generate</p>
              {!Boolean(cj?.outline) ? (
                <>
                  <div className="space-y-1.5">
                    <label className="text-xs text-slate-600">Target word count</label>
                    <div className="flex flex-wrap gap-1.5">
                      {WORD_COUNT_OPTIONS.map(wc => (
                        <button
                          key={wc}
                          onClick={() => setWordCount(wc)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${wordCount === wc ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300"}`}
                        >
                          {wc.toLocaleString()}
                        </button>
                      ))}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    fullWidth
                    loading={generateOutline.isPending}
                    disabled={generateOutline.isPending || !cj?.primary_keyword as boolean}
                    onClick={handleGenerateOutline}
                  >
                    Generate outline
                  </Button>
                </>
              ) : (
                <Button
                  size="sm"
                  fullWidth
                  loading={generateDraft.isPending}
                  disabled={generateDraft.isPending}
                  onClick={handleGenerateDraft}
                >
                  {generateDraft.isPending ? "Writing article…" : "Generate full draft"}
                </Button>
              )}
            </div>
          )}

          {/* Word count meter */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-slate-700">Word count</p>
              <span className="text-xs text-slate-500">{wordCountNum.toLocaleString()} / {targetWords.toLocaleString()}</span>
            </div>
            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${wordCountPct >= 90 ? "bg-emerald-500" : wordCountPct >= 60 ? "bg-indigo-500" : "bg-slate-300"}`}
                style={{ width: `${wordCountPct}%` }}
              />
            </div>
          </div>

          {/* SEO section */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-slate-700 uppercase tracking-wider">SEO</p>
              <button
                onClick={handleRunSeo}
                disabled={seoResearch.isPending || !post?.title}
                className="text-xs text-indigo-500 hover:text-indigo-700 font-medium disabled:opacity-40"
              >
                {seoResearch.isPending ? "Researching…" : "Re-run"}
              </button>
            </div>

            {!!cj?.primary_keyword && (
              <div className="space-y-1">
                <p className="text-xs text-slate-500">Primary keyword</p>
                <span className="inline-block bg-indigo-50 text-indigo-700 text-xs font-medium px-2.5 py-1 rounded-lg">
                  {cj.primary_keyword as string}
                </span>
              </div>
            )}

            {Array.isArray(cj?.secondary_keywords) && (cj.secondary_keywords as string[]).length > 0 && (
              <div className="space-y-1">
                <p className="text-xs text-slate-500">Secondary keywords</p>
                <div className="flex flex-wrap gap-1">
                  {(cj.secondary_keywords as string[]).map((kw, i) => (
                    <span key={i} className="bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded-lg">{kw}</span>
                  ))}
                </div>
              </div>
            )}

            {!!cj?.meta_title && (
              <div className="space-y-1">
                <p className="text-xs text-slate-500">Meta title <span className="text-slate-400">({(cj.meta_title as string).length}/60)</span></p>
                <p className="text-xs text-slate-700 bg-slate-50 rounded-lg p-2">{cj.meta_title as string}</p>
              </div>
            )}

            {!!cj?.meta_description && (
              <div className="space-y-1">
                <p className="text-xs text-slate-500">Meta description <span className="text-slate-400">({(cj.meta_description as string).length}/160)</span></p>
                <p className="text-xs text-slate-700 bg-slate-50 rounded-lg p-2">{cj.meta_description as string}</p>
              </div>
            )}
          </div>

          {/* Outline preview */}
          {!!cj?.outline && (
            <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-2">
              <p className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Outline</p>
              <p className="text-xs font-medium text-slate-800">{(cj.outline as Record<string, unknown>)?.title as string}</p>
              {Array.isArray((cj.outline as Record<string, unknown>)?.sections) && (
                <ul className="space-y-1">
                  {((cj.outline as Record<string, unknown>).sections as Array<{ h2: string }>).map((s, i) => (
                    <li key={i} className="text-xs text-slate-500">• {s.h2}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
