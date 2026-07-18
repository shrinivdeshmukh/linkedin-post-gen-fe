import { useNavigate, useParams } from "react-router-dom";
import { useDeck, useDeckAnalytics, useDeckLeads } from "../../lib/api-hooks";

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl px-5 py-4">
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-xs text-slate-400 mt-0.5">{label}</p>
    </div>
  );
}

function BreakdownBar({ label, count, max }: { label: string; count: number; max: number }) {
  const pct = max > 0 ? (count / max) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <p className="w-28 text-xs text-slate-300 truncate flex-shrink-0">{label}</p>
      <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
        <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${pct}%` }} />
      </div>
      <p className="w-8 text-xs text-slate-400 text-right flex-shrink-0">{count}</p>
    </div>
  );
}

export default function DeckAnalyticsPage() {
  const { deckId } = useParams<{ deckId: string }>();
  const navigate = useNavigate();
  const { data: deck } = useDeck(deckId ?? null);
  const { data: analytics, isLoading } = useDeckAnalytics(deckId ?? null);
  const { data: leads = [] } = useDeckLeads(deckId ?? null);

  const topCountryMax = analytics ? Math.max(...Object.values(analytics.by_country), 1) : 1;
  const topDeviceMax = analytics ? Math.max(...Object.values(analytics.by_device), 1) : 1;
  const topOsMax = analytics ? Math.max(...Object.values(analytics.by_os), 1) : 1;
  const topBrowserMax = analytics ? Math.max(...Object.values(analytics.by_browser), 1) : 1;

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-900">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 bg-slate-800 border-b border-slate-700 flex-shrink-0">
        <button
          onClick={() => navigate(`/decks/${deckId}`)}
          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <p className="text-sm font-semibold text-white">{deck?.title ?? "Analytics"}</p>
          <p className="text-[11px] text-slate-400">View analytics</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : !analytics ? (
        <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">No analytics data yet.</div>
      ) : (
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8">
          {/* Summary stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard label="Total views" value={analytics.total_views} />
            <StatCard label="Unique visitors" value={analytics.unique_ips} />
            <StatCard label="Countries" value={Object.keys(analytics.by_country).length} />
            <StatCard label="Leads captured" value={leads.length} />
          </div>

          {/* Breakdown charts */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {Object.keys(analytics.by_country).length > 0 && (
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
                <p className="text-xs font-semibold text-slate-300 mb-4">Countries</p>
                <div className="space-y-3">
                  {Object.entries(analytics.by_country).map(([k, v]) => (
                    <BreakdownBar key={k} label={k} count={v} max={topCountryMax} />
                  ))}
                </div>
              </div>
            )}
            {Object.keys(analytics.by_device).length > 0 && (
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
                <p className="text-xs font-semibold text-slate-300 mb-4">Device type</p>
                <div className="space-y-3">
                  {Object.entries(analytics.by_device).map(([k, v]) => (
                    <BreakdownBar key={k} label={k} count={v} max={topDeviceMax} />
                  ))}
                </div>
              </div>
            )}
            {Object.keys(analytics.by_os).length > 0 && (
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
                <p className="text-xs font-semibold text-slate-300 mb-4">Operating system</p>
                <div className="space-y-3">
                  {Object.entries(analytics.by_os).map(([k, v]) => (
                    <BreakdownBar key={k} label={k} count={v} max={topOsMax} />
                  ))}
                </div>
              </div>
            )}
            {Object.keys(analytics.by_browser).length > 0 && (
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
                <p className="text-xs font-semibold text-slate-300 mb-4">Browser</p>
                <div className="space-y-3">
                  {Object.entries(analytics.by_browser).map(([k, v]) => (
                    <BreakdownBar key={k} label={k} count={v} max={topBrowserMax} />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Full views table */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-700">
              <p className="text-xs font-semibold text-slate-300">All views ({analytics.recent_views.length} most recent)</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-700">
                    {["Date & time", "Country", "City", "Device", "OS", "Browser", "IP"].map((h) => (
                      <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold text-slate-400 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {analytics.recent_views.map((v) => (
                    <tr key={v.id} className="hover:bg-slate-700/30 transition-colors">
                      <td className="px-4 py-2.5 text-slate-300 whitespace-nowrap">
                        {new Date(v.created_at).toLocaleString()}
                      </td>
                      <td className="px-4 py-2.5 text-slate-300">{v.country ?? "—"}</td>
                      <td className="px-4 py-2.5 text-slate-300">{v.city ?? "—"}</td>
                      <td className="px-4 py-2.5 text-slate-300 capitalize">{v.device_type ?? "—"}</td>
                      <td className="px-4 py-2.5 text-slate-300">{v.os ?? "—"}</td>
                      <td className="px-4 py-2.5 text-slate-300">{v.browser ?? "—"}</td>
                      <td className="px-4 py-2.5 text-slate-500 font-mono">{v.ip_address ?? "—"}</td>
                    </tr>
                  ))}
                  {analytics.recent_views.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-slate-500">No views yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Leads table */}
          {leads.length > 0 && (
            <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-700">
                <p className="text-xs font-semibold text-slate-300">Leads captured ({leads.length})</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-700">
                      {["Date", "Fields submitted", "Country", "City", "Device", "OS", "Browser"].map((h) => (
                        <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold text-slate-400 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50">
                    {leads.map((lead) => (
                      <tr key={lead.id} className="hover:bg-slate-700/30 transition-colors">
                        <td className="px-4 py-2.5 text-slate-300 whitespace-nowrap">
                          {new Date(lead.created_at).toLocaleString()}
                        </td>
                        <td className="px-4 py-2.5 text-slate-300 max-w-xs">
                          {Object.entries(lead.fields_json).map(([k, v]) => (
                            <span key={k} className="inline-block mr-2"><span className="text-slate-500">{k}:</span> {v}</span>
                          ))}
                        </td>
                        <td className="px-4 py-2.5 text-slate-300">{lead.country ?? "—"}</td>
                        <td className="px-4 py-2.5 text-slate-300">{lead.city ?? "—"}</td>
                        <td className="px-4 py-2.5 text-slate-300 capitalize">{lead.device_type ?? "—"}</td>
                        <td className="px-4 py-2.5 text-slate-300">{lead.os ?? "—"}</td>
                        <td className="px-4 py-2.5 text-slate-300">{lead.browser ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
