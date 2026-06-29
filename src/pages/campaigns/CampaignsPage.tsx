import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCampaigns, useDeleteCampaign, type Campaign } from "../../lib/api-hooks";
import { Button } from "../../components/ui/Button";

const STATUS_STYLES: Record<string, string> = {
  draft:            "bg-slate-100 text-slate-600",
  generating:       "bg-blue-50 text-blue-600",
  ready_for_review: "bg-amber-50 text-amber-700",
  active:           "bg-emerald-50 text-emerald-700",
  completed:        "bg-indigo-50 text-indigo-700",
};

const STATUS_LABELS: Record<string, string> = {
  draft:            "Draft",
  generating:       "Generating…",
  ready_for_review: "Ready for review",
  active:           "Active",
  completed:        "Completed",
};

const FREQ_LABELS: Record<number, string> = {
  1: "Daily", 7: "Weekly", 14: "Bi-weekly", 30: "Monthly",
};

const POST_STATUS_STYLES: Record<string, string> = {
  draft:            "bg-slate-100 text-slate-600",
  pending_approval: "bg-amber-50 text-amber-700",
  approved:         "bg-emerald-50 text-emerald-700",
  scheduled:        "bg-blue-50 text-blue-700",
  published:        "bg-indigo-50 text-indigo-700",
  rejected:         "bg-red-50 text-red-600",
};

const POST_STATUS_LABELS: Record<string, string> = {
  draft:            "Draft",
  pending_approval: "Pending",
  approved:         "Approved",
  scheduled:        "Scheduled",
  published:        "Published",
  rejected:         "Rejected",
};

function CampaignCard({ campaign, onDelete }: { campaign: Campaign; onDelete: () => void }) {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);
  const approved = campaign.approved_count ?? campaign.campaign_posts.filter(cp => cp.post.status === "approved" || cp.post.status === "scheduled" || cp.post.status === "published").length;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 hover:border-indigo-200 hover:shadow-sm transition-all overflow-hidden">
      {/* Card header — clickable to expand */}
      <div
        className="p-5 space-y-4 cursor-pointer"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLES[campaign.status] ?? STATUS_STYLES.draft}`}>
                {STATUS_LABELS[campaign.status] ?? campaign.status}
              </span>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${campaign.mode === "series" ? "bg-violet-50 text-violet-700" : "bg-sky-50 text-sky-700"}`}>
                {campaign.mode === "series" ? "Series" : "Collection"}
              </span>
            </div>
            <h3 className="text-base font-bold text-slate-900 truncate">{campaign.name}</h3>
            <p className="text-xs text-slate-500 line-clamp-2">{campaign.topic}</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 mt-1">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="text-slate-300 hover:text-red-400 transition-colors"
              title="Delete campaign"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
            <svg
              className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="bg-slate-50 rounded-xl p-2">
            <p className="text-lg font-bold text-slate-900">{campaign.post_count}</p>
            <p className="text-xs text-slate-500">Posts</p>
          </div>
          <div className="bg-slate-50 rounded-xl p-2">
            <p className="text-lg font-bold text-slate-900">{FREQ_LABELS[campaign.frequency_days] ?? `${campaign.frequency_days}d`}</p>
            <p className="text-xs text-slate-500">Frequency</p>
          </div>
          <div className="bg-slate-50 rounded-xl p-2">
            <p className="text-lg font-bold text-slate-900">{approved}/{campaign.post_count}</p>
            <p className="text-xs text-slate-500">Approved</p>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>Starts {new Date(campaign.start_date).toLocaleDateString()}</span>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); navigate(`/campaigns/${campaign.id}`); }}
            className="text-indigo-500 hover:text-indigo-700 font-medium transition-colors"
          >
            Manage →
          </button>
        </div>
      </div>

      {/* Inline posts list */}
      {expanded && campaign.campaign_posts.length > 0 && (
        <div className="border-t border-slate-100 divide-y divide-slate-50">
          {campaign.campaign_posts.map((cp) => {
            const post = cp.post;
            const preview = post.content ? post.content.slice(0, 120) + (post.content.length > 120 ? "…" : "") : "No content yet.";
            return (
              <div key={cp.id} className="px-5 py-3 flex items-start gap-3 hover:bg-slate-50/60 transition-colors">
                <div className="w-6 h-6 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-indigo-500">{cp.sequence_number}</span>
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${POST_STATUS_STYLES[post.status] ?? POST_STATUS_STYLES.draft}`}>
                    {POST_STATUS_LABELS[post.status] ?? post.status}
                  </span>
                  <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">{preview}</p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate(`/composer/${post.id}`, { state: { campaignId: cp.campaign_id } })}
                  className="text-xs font-medium text-indigo-500 hover:text-indigo-700 transition-colors flex-shrink-0 mt-0.5"
                >
                  Edit
                </button>
              </div>
            );
          })}
        </div>
      )}

      {expanded && campaign.campaign_posts.length === 0 && (
        <div className="border-t border-slate-100 px-5 py-4 text-xs text-slate-400 text-center">
          No posts yet — campaign is still generating.
        </div>
      )}
    </div>
  );
}

export default function CampaignsPage() {
  const navigate = useNavigate();
  const { data: campaigns = [], isLoading } = useCampaigns();
  const deleteCampaign = useDeleteCampaign();

  return (
    <div className="h-full overflow-y-auto px-4 py-5 md:px-8 md:py-7 space-y-7">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Campaigns</h1>
          <p className="text-sm text-slate-500 mt-1">Multi-post content campaigns with scheduled publishing.</p>
        </div>
        <Button onClick={() => navigate("/campaigns/new")}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          New campaign
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-56 bg-white rounded-2xl border border-slate-100 animate-pulse" />
          ))}
        </div>
      ) : campaigns.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center">
            <svg className="w-8 h-8 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <div>
            <p className="text-base font-semibold text-slate-700">No campaigns yet</p>
            <p className="text-sm text-slate-400 mt-1">Create a series or collection to start building a content strategy.</p>
          </div>
          <Button onClick={() => navigate("/campaigns/new")}>Create your first campaign</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {campaigns.map(c => (
            <CampaignCard
              key={c.id}
              campaign={c}
              onDelete={() => deleteCampaign.mutate(c.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
