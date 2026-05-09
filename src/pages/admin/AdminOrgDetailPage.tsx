import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { adminApi, AdminOrgDetail, GrantPlanPayload } from "../../lib/admin-api";

function fmt(bytes: number) {
  if (bytes >= 1_073_741_824) return `${(bytes / 1_073_741_824).toFixed(1)} GB`;
  if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(1)} MB`;
  return `${(bytes / 1024).toFixed(0)} KB`;
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between py-2.5 border-b border-slate-100 last:border-0 gap-4">
      <span className="text-xs font-medium text-slate-500 w-40 flex-shrink-0">{label}</span>
      <span className="text-sm text-slate-800 text-right">{value ?? <span className="text-slate-300">—</span>}</span>
    </div>
  );
}

const PRESET_PLANS = ["trial", "solo", "team", "agency", "enterprise", "locked"];

export default function AdminOrgDetailPage() {
  const { orgId } = useParams<{ orgId: string }>();
  const [org, setOrg] = useState<AdminOrgDetail | null>(null);
  const [error, setError] = useState("");
  const [showGrant, setShowGrant] = useState(false);
  const [showRevoke, setShowRevoke] = useState(false);
  const [saving, setSaving] = useState(false);

  // Grant form state
  const [gPlan, setGPlan] = useState("enterprise");
  const [gExpiry, setGExpiry] = useState("");
  const [gNote, setGNote] = useState("");
  const [gSource, setGSource] = useState("manual");
  const [gPostGen, setGPostGen] = useState<string>("");
  const [gImgGen, setGImgGen] = useState<string>("");
  const [gStorage, setGStorage] = useState<string>("");
  const [gSeats, setGSeats] = useState<string>("");
  const [gTranslate, setGTranslate] = useState(true);

  // Revoke form state
  const [rAction, setRAction] = useState<"trial" | "lock">("trial");
  const [rDays, setRDays] = useState("7");

  useEffect(() => {
    if (!orgId) return;
    adminApi.getOrg(orgId).then(setOrg).catch(() => setError("Failed to load org"));
  }, [orgId]);

  async function handleGrant() {
    if (!org) return;
    setSaving(true);
    try {
      const payload: GrantPlanPayload = {
        plan: gPlan,
        plan_expires_at: gExpiry ? new Date(gExpiry).toISOString() : null,
        plan_note: gNote || null,
        plan_source: gSource,
        post_generations: gPostGen !== "" ? parseInt(gPostGen) : null,
        image_generations: gImgGen !== "" ? parseInt(gImgGen) : null,
        video_storage_mb: gStorage !== "" ? parseInt(gStorage) : null,
        seats: gSeats !== "" ? parseInt(gSeats) : null,
        translate: gTranslate,
      };
      const updated = await adminApi.grantPlan(org.id, payload);
      setOrg({ ...org, ...updated });
      setShowGrant(false);
    } catch {
      alert("Failed to grant plan");
    } finally {
      setSaving(false);
    }
  }

  async function handleRevoke() {
    if (!org) return;
    setSaving(true);
    try {
      const updated = await adminApi.revoke(org.id, { action: rAction, reset_trial_days: parseInt(rDays) });
      setOrg({ ...org, ...updated });
      setShowRevoke(false);
    } catch {
      alert("Failed to revoke plan");
    } finally {
      setSaving(false);
    }
  }

  if (error) return <div className="p-8 text-sm text-red-600">{error}</div>;
  if (!org) return <div className="p-8 text-sm text-slate-400">Loading…</div>;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center gap-4">
        <Link to="/admin" className="text-sm text-slate-500 hover:text-slate-800 transition-colors">← All orgs</Link>
        <div>
          <h1 className="text-lg font-bold text-slate-900">{org.name}</h1>
          <p className="text-xs text-slate-400">{org.slug} · {org.id}</p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-6 space-y-6">
        {/* Plan actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => { setShowGrant(true); setShowRevoke(false); setGPlan(org.plan); setGNote(org.plan_note ?? ""); setGExpiry(org.plan_expires_at ? org.plan_expires_at.slice(0, 10) : ""); }}
            className="text-sm font-medium px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-colors"
          >
            Grant / Edit plan
          </button>
          <button
            onClick={() => { setShowRevoke(true); setShowGrant(false); }}
            className="text-sm font-medium px-4 py-2 border border-red-200 text-red-600 hover:bg-red-50 rounded-xl transition-colors"
          >
            Revoke plan
          </button>
          {org.stripe_customer_id && (
            <a
              href={`https://dashboard.stripe.com/customers/${org.stripe_customer_id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl transition-colors"
            >
              Stripe ↗
            </a>
          )}
        </div>

        {/* Grant plan panel */}
        {showGrant && (
          <div className="bg-white border border-indigo-200 rounded-2xl p-6 space-y-4">
            <h2 className="text-sm font-bold text-slate-900">Grant plan</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-slate-500 block mb-1">Plan name</label>
                <input
                  list="plan-presets"
                  value={gPlan}
                  onChange={(e) => setGPlan(e.target.value)}
                  className="w-full text-sm border border-slate-200 rounded-xl px-3 py-1.5 outline-none focus:ring-2 focus:ring-indigo-300"
                  placeholder="enterprise, solo, custom…"
                />
                <datalist id="plan-presets">
                  {PRESET_PLANS.map((p) => <option key={p} value={p} />)}
                </datalist>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 block mb-1">Source</label>
                <select
                  value={gSource}
                  onChange={(e) => setGSource(e.target.value)}
                  className="w-full text-sm border border-slate-200 rounded-xl px-3 py-1.5 bg-white outline-none focus:ring-2 focus:ring-indigo-300"
                >
                  <option value="manual">manual</option>
                  <option value="stripe">stripe</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 block mb-1">Expires on</label>
                <input
                  type="date"
                  value={gExpiry}
                  onChange={(e) => setGExpiry(e.target.value)}
                  className="w-full text-sm border border-slate-200 rounded-xl px-3 py-1.5 outline-none focus:ring-2 focus:ring-indigo-300"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 block mb-1">Note</label>
                <input
                  value={gNote}
                  onChange={(e) => setGNote(e.target.value)}
                  placeholder="Bank transfer ₹85,000 — May 2026"
                  className="w-full text-sm border border-slate-200 rounded-xl px-3 py-1.5 outline-none focus:ring-2 focus:ring-indigo-300"
                />
              </div>
            </div>

            <p className="text-xs font-semibold text-slate-500 mt-2">Custom limits <span className="font-normal text-slate-400">(leave blank to use plan defaults)</span></p>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: "Post generations / mo", val: gPostGen, set: setGPostGen },
                { label: "Image generations / mo", val: gImgGen, set: setGImgGen },
                { label: "Video storage (MB)", val: gStorage, set: setGStorage },
                { label: "Seats", val: gSeats, set: setGSeats },
              ].map(({ label, val, set }) => (
                <div key={label}>
                  <label className="text-xs font-medium text-slate-500 block mb-1">{label}</label>
                  <input
                    type="number"
                    value={val}
                    onChange={(e) => set(e.target.value)}
                    placeholder="unlimited"
                    className="w-full text-sm border border-slate-200 rounded-xl px-3 py-1.5 outline-none focus:ring-2 focus:ring-indigo-300"
                  />
                </div>
              ))}
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={gTranslate} onChange={(e) => setGTranslate(e.target.checked)} />
              Translation enabled
            </label>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={handleGrant}
                disabled={saving}
                className="text-sm font-semibold px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-colors disabled:opacity-50"
              >
                {saving ? "Saving…" : "Grant plan"}
              </button>
              <button onClick={() => setShowGrant(false)} className="text-sm text-slate-500 hover:text-slate-800">Cancel</button>
            </div>
          </div>
        )}

        {/* Revoke panel */}
        {showRevoke && (
          <div className="bg-white border border-red-200 rounded-2xl p-6 space-y-4">
            <h2 className="text-sm font-bold text-slate-900">Revoke plan</h2>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="radio" name="rAction" value="trial" checked={rAction === "trial"} onChange={() => setRAction("trial")} />
                Revert to trial
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="radio" name="rAction" value="lock" checked={rAction === "lock"} onChange={() => setRAction("lock")} />
                Lock account
              </label>
            </div>
            {rAction === "trial" && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-600">Give trial days:</span>
                <input
                  type="number"
                  value={rDays}
                  onChange={(e) => setRDays(e.target.value)}
                  className="w-20 text-sm border border-slate-200 rounded-xl px-3 py-1.5 outline-none focus:ring-2 focus:ring-indigo-300"
                />
              </div>
            )}
            <div className="flex items-center gap-3">
              <button
                onClick={handleRevoke}
                disabled={saving}
                className="text-sm font-semibold px-5 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl transition-colors disabled:opacity-50"
              >
                {saving ? "Revoking…" : "Confirm revoke"}
              </button>
              <button onClick={() => setShowRevoke(false)} className="text-sm text-slate-500 hover:text-slate-800">Cancel</button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Plan & billing */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h2 className="text-sm font-bold text-slate-900 mb-3">Plan & billing</h2>
            <Row label="Plan" value={<span className="font-medium">{org.plan}</span>} />
            <Row label="Source" value={org.plan_source} />
            <Row label="Active" value={org.plan_active ? "Yes" : "No"} />
            <Row label="Trial active" value={org.trial_active ? "Yes" : "No"} />
            <Row label="Trial ends" value={org.trial_active ? new Date(org.trial_ends_at).toLocaleDateString() : null} />
            <Row label="Plan expires" value={org.plan_expires_at ? new Date(org.plan_expires_at).toLocaleDateString() : null} />
            <Row label="Next payment" value={org.next_payment_at ? new Date(org.next_payment_at).toLocaleDateString() : null} />
            <Row label="Next amount" value={org.next_payment_amount_cents ? `$${(org.next_payment_amount_cents / 100).toFixed(2)}` : null} />
            <Row label="Stripe customer" value={org.stripe_customer_id} />
            {org.plan_note && <Row label="Note" value={<span className="italic text-slate-600">{org.plan_note}</span>} />}
          </div>

          {/* Usage */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h2 className="text-sm font-bold text-slate-900 mb-3">Usage</h2>
            <Row label="Posts generated" value={`${org.post_generations_used} / ${org.post_generations_limit ?? "∞"}`} />
            <Row label="Images generated" value={`${org.image_generations_used} / ${org.image_generations_limit ?? "∞"}`} />
            <Row label="Videos" value={`${org.video_count}`} />
            <Row label="Video storage" value={fmt(org.video_storage_used_bytes)} />
            <Row label="Posts (total)" value={org.post_count} />
            <Row label="Seats used" value={org.user_count} />
            <Row label="Created" value={new Date(org.created_at).toLocaleDateString()} />
          </div>

          {/* Custom limits */}
          {org.custom_limits && (
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <h2 className="text-sm font-bold text-slate-900 mb-3">Custom limits</h2>
              {Object.entries(org.custom_limits).map(([k, v]) => (
                <Row key={k} label={k} value={String(v)} />
              ))}
            </div>
          )}

          {/* Users */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h2 className="text-sm font-bold text-slate-900 mb-3">Users ({org.users.length})</h2>
            <div className="space-y-2">
              {org.users.map((u) => (
                <div key={u.id} className="flex items-center justify-between text-sm">
                  <div>
                    <p className="font-medium text-slate-800">{u.display_name ?? u.email}</p>
                    <p className="text-xs text-slate-400">{u.email}</p>
                  </div>
                  <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">{u.role}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
