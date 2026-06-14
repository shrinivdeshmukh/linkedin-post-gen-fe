import { useNavigate } from "react-router-dom";
import { useDecks, useDeleteDeck, type DeckItem } from "../../lib/api-hooks";

function statusBadge(status: DeckItem["status"]) {
  if (status === "generating") return (
    <span className="flex items-center gap-1 text-[11px] font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
      <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
      Generating
    </span>
  );
  if (status === "failed") return (
    <span className="text-[11px] font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">Failed</span>
  );
  return (
    <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">Ready</span>
  );
}

export default function DecksPage() {
  const navigate = useNavigate();
  const { data: decks = [], isLoading } = useDecks();
  const deleteD = useDeleteDeck();

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Decks</p>
            <h1 className="text-xl font-bold text-slate-900 mt-0.5">Decks & One-pagers</h1>
          </div>
          <button
            onClick={() => navigate("/decks/new")}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            New deck
          </button>
        </div>

        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1,2,3].map(i => (
              <div key={i} className="bg-white rounded-2xl border border-slate-100 h-40 animate-pulse" />
            ))}
          </div>
        )}

        {!isLoading && decks.length === 0 && (
          <div className="bg-white border border-slate-100 rounded-2xl p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center mx-auto">
              <svg className="w-6 h-6 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-slate-800">No decks yet</p>
            <p className="text-xs text-slate-400">Create a stunning HTML deck or one-pager from any topic.</p>
            <button
              onClick={() => navigate("/decks/new")}
              className="mt-2 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors"
            >
              Create your first deck
            </button>
          </div>
        )}

        {!isLoading && decks.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {decks.map(deck => (
              <div
                key={deck.id}
                className="bg-white border border-slate-100 rounded-2xl p-4 space-y-3 hover:border-indigo-200 hover:shadow-sm transition-all cursor-pointer group"
                onClick={() => deck.status === "ready" && navigate(`/decks/${deck.id}`)}
              >
                {/* Preview thumbnail */}
                <div
                  className="w-full h-28 rounded-xl flex items-center justify-center text-2xl font-bold overflow-hidden relative"
                  style={{ background: deck.brand_colors?.bg || (deck.theme === "dark" ? "#0F172A" : "#F8FAFC") }}
                >
                  {deck.brand_logo_url ? (
                    <img src={deck.brand_logo_url} alt="" className="h-10 w-auto object-contain" />
                  ) : (
                    <span style={{ color: deck.brand_colors?.accent || "#6366F1", fontSize: 13, fontWeight: 700, letterSpacing: "0.05em" }}>
                      {deck.title.slice(0, 24)}
                    </span>
                  )}
                  <div className="absolute top-2 right-2">
                    {statusBadge(deck.status)}
                  </div>
                </div>

                <div>
                  <p className="text-sm font-semibold text-slate-900 leading-snug line-clamp-1">{deck.title}</p>
                  <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{deck.topic}</p>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-slate-400 capitalize">{deck.format}</span>
                    <span className="text-slate-200">·</span>
                    <span className="text-[11px] text-slate-400">{deck.font_family}</span>
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); deleteD.mutate(deck.id); }}
                    className="opacity-0 group-hover:opacity-100 p-1 text-slate-300 hover:text-red-500 transition-all"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
