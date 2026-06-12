import { useSearchParams } from "react-router-dom";
import ComposerPage from "../composer/ComposerPage";
import NewCampaignPage from "../campaigns/NewCampaignPage";
import PodcastPage from "../podcast/PodcastPage";

type Tab = "post" | "campaign" | "podcast";

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  {
    id: "post",
    label: "Post",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
      </svg>
    ),
  },
  {
    id: "campaign",
    label: "Campaign",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
    ),
  },
  {
    id: "podcast",
    label: "Podcast",
    icon: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
      </svg>
    ),
  },
];

export default function StudioPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = (searchParams.get("tab") as Tab) ?? "post";

  return (
    <div className="h-full flex flex-col bg-slate-50">
      {/* Tab bar */}
      <div className="flex-shrink-0 bg-white border-b border-slate-100 px-5">
        <div className="flex items-center gap-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setSearchParams({ tab: t.id })}
              className={`flex items-center gap-2 px-4 py-3.5 text-sm font-medium border-b-2 transition-colors ${
                tab === t.id
                  ? "border-indigo-600 text-indigo-700"
                  : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-200"
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content — existing pages render in full */}
      <div className="flex-1 overflow-hidden">
        {tab === "post"     && <ComposerPage />}
        {tab === "campaign" && <NewCampaignPage />}
        {tab === "podcast"  && <PodcastPage />}
      </div>
    </div>
  );
}
