import { useNavigate } from "react-router-dom";
import { StatusBadge } from "./StatusBadge";
import type { Post, PostType } from "../../lib/api-hooks";

const TYPE_ICONS: Record<PostType, React.ReactNode> = {
  text: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h7" />
    </svg>
  ),
  image: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01" />
    </svg>
  ),
  carousel: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7" />
    </svg>
  ),
  poll: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
};

const MODEL_LABEL: Record<string, { label: string; color: string }> = {
  claude: { label: "Claude", color: "text-orange-600 bg-orange-50" },
  openai: { label: "GPT-4o", color: "text-emerald-600 bg-emerald-50" },
  gemini: { label: "Gemini", color: "text-blue-600 bg-blue-50" },
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

interface PostRowProps {
  post: Post;
  onCopy: (content: string) => void;
  onDelete?: (id: string) => void;
}

export function PostRow({ post, onCopy, onDelete }: PostRowProps) {
  const navigate = useNavigate();
  const excerpt = post.content
    ? post.content.slice(0, 80) + (post.content.length > 80 ? "…" : "")
    : post.title ?? "Untitled post";

  const model = post.ai_model_used ? MODEL_LABEL[post.ai_model_used] : null;

  return (
    <div
      className="flex items-center gap-4 px-4 py-3.5 bg-white rounded-2xl border border-slate-100 hover:border-indigo-200 hover:shadow-sm transition-all duration-150 cursor-pointer group"
      onClick={() => navigate(`/composer/${post.id}`)}
    >
      {/* Type icon */}
      <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center flex-shrink-0 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
        {TYPE_ICONS[post.type]}
      </div>

      {/* Excerpt */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-800 truncate">{excerpt}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-slate-400 capitalize">{post.type}</span>
          {model && (
            <>
              <span className="text-slate-200">·</span>
              <span className={`text-xs font-medium px-1.5 py-0.5 rounded-md ${model.color}`}>
                {model.label}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Status */}
      <div className="flex-shrink-0">
        <StatusBadge status={post.status} />
      </div>

      {/* Date */}
      <span className="text-xs text-slate-400 flex-shrink-0 w-16 text-right">
        {timeAgo(post.updated_at)}
      </span>

      {/* Actions */}
      <div
        className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          title="Edit"
          onClick={() => navigate(`/composer/${post.id}`)}
          className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        </button>
        {post.content && (
          <button
            title="Copy text"
            onClick={() => onCopy(post.content!)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </button>
        )}
        {post.status === "draft" && onDelete && (
          <button
            title="Delete draft"
            onClick={() => onDelete(post.id)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
