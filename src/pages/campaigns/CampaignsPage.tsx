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

function CampaignCard({ campaign, onDelete }: { campaign: Campaign; onDelete: () => void }) {
  const navigate = useNavigate();
  const approved = campaign.approved_count ?? campaign.campaign_posts.filter(cp => cp.post.status === "approved" || cp.post.status === "scheduled" || cp.post.status === "published").length;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 hover:border-indigo-200 hover:shadow-sm transition-all">
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
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="text-slate-300 hover:text-red-400 transition-colors flex-shrink-0 mt-1"
          title="Delete campaign"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
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
      </div>

      <Button fullWidth size="sm" variant="outline" onClick={() => navigate(`/campaigns/${campaign.id}`)}>
        View campaign →
      </Button>
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
