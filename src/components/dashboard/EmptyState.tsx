import { useNavigate } from "react-router-dom";
import { Button } from "../ui/Button";
import type { PostStatus } from "../../lib/api-hooks";

interface EmptyStateProps {
  filter: PostStatus | "all";
}

const MESSAGES: Partial<Record<PostStatus | "all", { title: string; body: string; cta?: string }>> = {
  all: {
    title: "No posts yet",
    body: "Create your first AI-powered LinkedIn post in under 60 seconds.",
    cta: "Write your first post",
  },
  draft: {
    title: "No drafts",
    body: "Posts you're working on will appear here.",
    cta: "Start a new post",
  },
  pending_approval: {
    title: "Nothing pending",
    body: "Posts submitted for approval will appear here.",
  },
  approved: {
    title: "No approved posts",
    body: "Approved posts ready to publish will appear here.",
  },
  scheduled: {
    title: "Nothing scheduled",
    body: "Posts scheduled for publishing will appear here.",
    cta: "Schedule a post",
  },
  published: {
    title: "Nothing published yet",
    body: "Posts you've published to LinkedIn will appear here.",
    cta: "Create your first post",
  },
  rejected: {
    title: "No rejected posts",
    body: "Posts returned for edits will appear here.",
  },
};

export function EmptyState({ filter }: EmptyStateProps) {
  const navigate = useNavigate();
  const msg = MESSAGES[filter] ?? MESSAGES.all!;

  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center mb-4">
        <svg className="w-8 h-8 text-indigo-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      </div>
      <h3 className="text-base font-semibold text-slate-700">{msg.title}</h3>
      <p className="text-sm text-slate-400 mt-1 max-w-xs">{msg.body}</p>
      {msg.cta && (
        <Button className="mt-5" onClick={() => navigate("/composer")}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          {msg.cta}
        </Button>
      )}
    </div>
  );
}
