import { useNavigate, useParams } from "react-router-dom";
import {
  useCampaign,
  useApproveCampaign,
  useRegenerateCampaign,
  useRegenerateCampaignPost,
  useMe,
  type CampaignPost,
} from "../../lib/api-hooks";
import { Button } from "../../components/ui/Button";

const STATUS_STYLES: Record<string, string> = {
  draft:            "bg-slate-100 text-slate-600",
  pending_approval: "bg-amber-50 text-amber-700",
  approved:         "bg-emerald-50 text-emerald-700",
  scheduled:        "bg-blue-50 text-blue-700",
  published:        "bg-indigo-50 text-indigo-700",
  rejected:         "bg-red-50 text-red-600",
};

const STATUS_LABELS: Record<string, string> = {
  draft:            "Draft",
  pending_approval: "Pending",
  approved:         "Approved",
  scheduled:        "Scheduled",
  published:        "Published",
  rejected:         "Rejected",
};

const CAMPAIGN_STATUS_STYLES: Record<string, string> = {
  generating:       "bg-blue-50 text-blue-700",
  ready_for_review: "bg-amber-50 text-amber-700",
  active:           "bg-emerald-50 text-emerald-700",
  completed:        "bg-indigo-50 text-indigo-700",
};

const CAMPAIGN_STATUS_LABELS: Record<string, string> = {
  generating:       "Generating…",
  ready_for_review: "Ready for review",
  active:           "Active",
  completed:        "Completed",
};

const FREQ_LABELS: Record<number, string> = {
  1: "daily", 7: "weekly", 14: "bi-weekly", 30: "monthly",
};

function BlogPostCard({ cp, onRegenerate }: { cp: CampaignPost; onRegenerate: (id: string) => void }) {
  const navigate = useNavigate();
  const post = cp.post;
  const cj = post.content_json as Record<string, unknown> | undefined;

  async function handleCopyFormatted() {
    if (!post.content) return;
    const { marked } = await import("marked");
    const html = marked.parse(post.content) as string;
    try {
      const item = new ClipboardItem({ "text/html": new Blob([html], { type: "text/html" }), "text/plain": new Blob([html], { type: "text/plain" }) });
      await navigator.clipboard.write([item]);
    } catch {
      await navigator.clipboard.writeText(html);
    }
  }

  function handleDownloadImage() {
    const imageData = cj?.hero_image_data as string | undefined;
    if (!imageData) return;
    const a = document.createElement("a");
    a.href = `data:image/png;base64,${imageData}`;
    a.download = `${post.title ?? "hero"}.png`;
    a.click();
  }

  const wordCount = post.content ? post.content.split(/\s+/).filter(Boolean).length : 0;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-bold text-indigo-600">{cp.sequence_number}</span>
          </div>
          <div>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLES[post.status] ?? STATUS_STYLES.draft}`}>
              {STATUS_LABELS[post.status] ?? post.status}
            </span>
            {wordCount > 0 && <p className="text-xs text-slate-400 mt-0.5">~{wordCount.toLocaleString()} words</p>}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => onRegenerate(post.id)} className="text-xs text-slate-400 hover:text-indigo-600 transition-colors font-medium">↻ Redo</button>
          {post.content && <button onClick={handleCopyFormatted} className="text-xs text-slate-400 hover:text-indigo-600 transition-colors font-medium">Copy HTML</button>}
          {cj?.hero_image_data ? <button onClick={handleDownloadImage} className="text-xs text-slate-400 hover:text-indigo-600 transition-colors font-medium">Image</button> : null}
          {cj?.hero_image_url ? <button onClick={() => navigator.clipboard.writeText(cj.hero_image_url as string)} className="text-xs text-slate-400 hover:text-indigo-600 transition-colors font-medium">Copy URL</button> : null}
          <Button size="sm" variant="outline" onClick={() => navigate(`/blog/${post.id}`)}>Edit</Button>
        </div>
      </div>
      <h3 className="text-sm font-semibold text-slate-800">{post.title ?? "Untitled article"}</h3>
      {cj?.primary_keyword ? (
        <span className="inline-block bg-indigo-50 text-indigo-700 text-xs font-medium px-2.5 py-1 rounded-lg">
          {cj.primary_keyword as string}
        </span>
      ) : null}
      {post.content && <p className="text-xs text-slate-500 line-clamp-2">{post.content.replace(/[#*`]/g, "").slice(0, 200)}…</p>}
    </div>
  );
}

function PostCard({
  cp,
  onRegenerate,
}: {
  cp: CampaignPost;
  onRegenerate: (postId: string) => void;
}) {
  const navigate = useNavigate();
  const post = cp.post;

  // Route to the blog composer for blog posts
  if (post.medium === "blog") {
    return <BlogPostCard cp={cp} onRegenerate={onRegenerate} />;
  }

  const preview = post.content ? post.content.slice(0, 200) + (post.content.length > 200 ? "…" : "") : "No content yet.";

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-bold text-indigo-600">{cp.sequence_number}</span>
          </div>
          <div>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLES[post.status] ?? STATUS_STYLES.draft}`}>
              {STATUS_LABELS[post.status] ?? post.status}
            </span>
            {post.scheduled_at && (
              <p className="text-xs text-slate-400 mt-0.5">
                {new Date(post.scheduled_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => onRegenerate(post.id)}
            className="text-xs text-slate-400 hover:text-indigo-600 transition-colors font-medium"
          >
            ↻ Redo
          </button>
          <Button size="sm" variant="outline" onClick={() => navigate(`/composer/${post.id}`)}>
            Edit
          </Button>
        </div>
      </div>

      {(post.content_json?.image_data as string | undefined) && (
        <img
          src={`data:${(post.content_json?.mime_type as string | undefined) ?? "image/png"};base64,${post.content_json?.image_data as string}`}
          alt="Post image"
          className="w-full rounded-xl object-cover max-h-48"
        />
      )}

      <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{preview}</p>

      {Array.isArray(post.content_json?.hashtags) && (post.content_json?.hashtags as string[]).length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {(post.content_json?.hashtags as string[]).map((tag, i) => (
            <span key={i} className="text-xs text-indigo-500 font-medium">#{tag.replace(/^#/, "")}</span>
          ))}
        </div>
      )}
    </div>
  );
}

export default function CampaignDetailPage() {
  const { campaignId } = useParams<{ campaignId: string }>();
  const navigate = useNavigate();
  const { data: me } = useMe();
  const { data: campaign, isLoading } = useCampaign(campaignId ?? null);
  const approveCampaign = useApproveCampaign();
  const regenerateCampaign = useRegenerateCampaign();
  const regeneratePost = useRegenerateCampaignPost();

  const isOwner = me?.role === "owner";

  if (isLoading) {
    return (
      <div className="h-full overflow-y-auto px-4 py-5 md:px-8 md:py-7 space-y-5">
        <div className="h-8 w-48 bg-slate-100 rounded-xl animate-pulse" />
        <div className="h-40 bg-white rounded-2xl border border-slate-100 animate-pulse" />
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-36 bg-white rounded-2xl border border-slate-100 animate-pulse" />
        ))}
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-slate-500">Campaign not found.</p>
      </div>
    );
  }

  const sorted = [...campaign.campaign_posts].sort((a, b) => a.sequence_number - b.sequence_number);
  const allApproved = sorted.every(cp => ["approved", "scheduled", "published"].includes(cp.post.status));
  const canApprove = isOwner && campaign.status === "ready_for_review" && sorted.length > 0;

  return (
    <div className="h-full overflow-y-auto px-4 py-5 md:px-8 md:py-7 space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <button onClick={() => navigate("/campaigns")} className="text-slate-400 hover:text-slate-600 transition-colors mt-1 flex-shrink-0">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1 min-w-0 space-y-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${CAMPAIGN_STATUS_STYLES[campaign.status] ?? "bg-slate-100 text-slate-600"}`}>
                {CAMPAIGN_STATUS_LABELS[campaign.status] ?? campaign.status}
              </span>
              <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${campaign.mode === "series" ? "bg-violet-50 text-violet-700" : "bg-sky-50 text-sky-700"}`}>
                {campaign.mode === "series" ? "Connected series" : "Themed collection"}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">{campaign.name}</h1>
            <p className="text-sm text-slate-500 mt-1">{campaign.topic}</p>
          </div>

          {/* Actions — full width row below title on mobile */}
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              loading={regenerateCampaign.isPending}
              disabled={regenerateCampaign.isPending}
              onClick={() => regenerateCampaign.mutate(campaign.id)}
            >
              ↻ Regenerate all
            </Button>
            {canApprove && (
              <Button
                size="sm"
                loading={approveCampaign.isPending}
                disabled={approveCampaign.isPending}
                onClick={() => approveCampaign.mutate(campaign.id)}
              >
                Approve & schedule all
              </Button>
            )}
            {campaign.status === "active" && (
              <span className="text-xs text-emerald-600 font-medium bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                ✓ Scheduled
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Meta strip */}
      <div className="flex flex-wrap gap-4 px-4 py-4 md:px-5 bg-slate-50 rounded-2xl border border-slate-200 text-sm">
        <div>
          <p className="text-xs text-slate-400 font-medium uppercase tracking-wider mb-0.5">Posts</p>
          <p className="font-semibold text-slate-800">{campaign.post_count}</p>
        </div>
        <div>
          <p className="text-xs text-slate-400 font-medium uppercase tracking-wider mb-0.5">Frequency</p>
          <p className="font-semibold text-slate-800 capitalize">{FREQ_LABELS[campaign.frequency_days] ?? `${campaign.frequency_days}d`}</p>
        </div>
        <div>
          <p className="text-xs text-slate-400 font-medium uppercase tracking-wider mb-0.5">Start date</p>
          <p className="font-semibold text-slate-800">{new Date(campaign.start_date).toLocaleDateString()}</p>
        </div>
        <div>
          <p className="text-xs text-slate-400 font-medium uppercase tracking-wider mb-0.5">Target outcome</p>
          <p className="font-semibold text-slate-800">{campaign.target_outcome}</p>
        </div>
        {campaign.key_messages.length > 0 && (
          <div className="flex-1 min-w-0">
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wider mb-1">Key messages</p>
            <div className="flex flex-wrap gap-1.5">
              {campaign.key_messages.map((m, i) => (
                <span key={i} className="text-xs bg-white border border-slate-200 text-slate-600 px-2 py-0.5 rounded-lg">{m}</span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Posts */}
      {campaign.status === "generating" ? (
        <div className="flex flex-col items-center justify-center py-16 space-y-4">
          <svg className="w-8 h-8 animate-spin text-indigo-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
          <p className="text-sm text-slate-500">Generating your campaign posts…</p>
        </div>
      ) : sorted.length === 0 ? (
        <p className="text-center text-slate-400 py-12">No posts generated yet.</p>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-700">Posts ({sorted.length})</h2>
            {!allApproved && campaign.status === "ready_for_review" && (
              <p className="text-xs text-slate-400">Review each post, edit if needed, then approve the campaign.</p>
            )}
          </div>
          <div className="space-y-4">
            {sorted.map(cp => (
              <PostCard
                key={cp.id}
                cp={cp}
                onRegenerate={(postId) => regeneratePost.mutate({ campaignId: campaign.id, postId })}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
