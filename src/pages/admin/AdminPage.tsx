import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { adminApi, getAdminKey, setAdminKey } from "../../lib/admin-api";
import type { AdminOrgSummary } from "../../lib/admin-api";

function fmt(bytes: number) {
  if (bytes >= 1_073_741_824) return `${(bytes / 1_073_741_824).toFixed(1)} GB`;
  if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(1)} MB`;
  return `${(bytes / 1024).toFixed(0)} KB`;
}

function PlanBadge({ org }: { org: AdminOrgSummary }) {
  const color =
    org.plan === "locked"
      ? "bg-red-100 text-red-700"
      : !org.plan_active
      ? "bg-slate-100 text-slate-500"
      : org.plan === "trial"
      ? "bg-amber-100 text-amber-700"
      : org.plan_source === "manual"
      ? "bg-purple-100 text-purple-700"
      : "bg-green-100 text-green-700";
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${color}`}>
      {org.plan}{org.plan_source === "manual" ? " ★" : ""}
    </span>
  );
}

export default function AdminPage() {
  const navigate = useNavigate();
  const [key, setKey] = useState(getAdminKey());
  const [keyInput, setKeyInput] = useState("");
  const [orgs, setOrgs] = useState<AdminOrgSummary[] | null>(null);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  async function loadOrgs(adminKey?: string) {
    if (adminKey) setAdminKey(adminKey);
    setLoading(true);
    setError("");
    try {
      const data = await adminApi.listOrgs();
      setOrgs(data);
      setKey(adminKey ?? getAdminKey());
    } catch (e: unknown) {
      const status = (e as { response?: { status?: number } }).response?.status;
      if (status === 403) setError("Wrong admin key.");
      else setError("Failed to load orgs.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (key) loadOrgs();
  }, []);

  if (!key || error === "Wrong admin key.") {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 w-full max-w-sm space-y-4">
          <h1 className="text-lg font-bold text-slate-900">Admin access</h1>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <input
            type="password"
            autoFocus
            placeholder="Admin secret key"
            value={keyInput}
            onChange={(e) => setKeyInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") loadOrgs(keyInput); }}
            className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-300"
          />
          <button
            onClick={() => loadOrgs(keyInput)}
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold py-2 rounded-xl transition-colors disabled:opacity-50"
          >
            {loading ? "Checking…" : "Enter"}
          </button>
        </div>
      </div>
    );
  }

  const filtered = (orgs ?? []).filter(
    (o) =>
      o.name.toLowerCase().includes(search.toLowerCase()) ||
      o.slug.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-slate-900">Admin panel</h1>
          <p className="text-xs text-slate-400">{orgs?.length ?? 0} organisations</p>
        </div>
        <button
          onClick={() => { setOrgs(null); setKey(""); }}
          className="text-xs text-slate-500 hover:text-slate-800 transition-colors"
        >
          Sign out
        </button>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6 space-y-4">
        {/* Search */}
        <input
          type="text"
          placeholder="Search by name or slug…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-sm text-sm border border-slate-200 rounded-xl px-3 py-2 bg-white outline-none focus:ring-2 focus:ring-indigo-300"
        />

        {/* Table */}
        {loading ? (
          <div className="text-sm text-slate-400">Loading…</div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-100 bg-slate-50">
                <tr>
                  {["Org", "Plan", "Status", "Posts", "Videos / Storage", "Users", "Created"].map((h) => (
                    <th key={h} className="text-left text-xs font-semibold text-slate-500 px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((org) => (
                  <tr
                    key={org.id}
                    onClick={() => navigate(`/admin/orgs/${org.id}`)}
                    className="hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{org.name}</p>
                      <p className="text-xs text-slate-400">{org.slug}</p>
                    </td>
                    <td className="px-4 py-3">
                      <PlanBadge org={org} />
                    </td>
                    <td className="px-4 py-3">
                      {org.plan_active ? (
                        <span className="text-xs text-green-600 font-medium">Active</span>
                      ) : (
                        <span className="text-xs text-red-500 font-medium">Inactive</span>
                      )}
                      {org.plan_expires_at && (
                        <p className="text-xs text-slate-400 mt-0.5">
                          Exp {new Date(org.plan_expires_at).toLocaleDateString()}
                        </p>
                      )}
                      {org.trial_active && (
                        <p className="text-xs text-amber-600 mt-0.5">
                          Trial ends {new Date(org.trial_ends_at).toLocaleDateString()}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {org.post_generations_used}
                      {org.post_generations_limit !== null ? ` / ${org.post_generations_limit}` : " / ∞"}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {org.video_count} · {fmt(org.video_storage_used_bytes)}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{org.user_count}</td>
                    <td className="px-4 py-3 text-xs text-slate-400">
                      {new Date(org.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-sm text-slate-400">No orgs found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
