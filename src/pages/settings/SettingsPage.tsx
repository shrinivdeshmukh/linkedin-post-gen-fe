import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  useLinkedInStatus,
  useLinkedInDisconnect,
  usePlanStatus,
  useCreateCheckout,
  useCreatePortal,
  type BillingPeriod,
} from "../../lib/api-hooks";

const PLAN_LABELS: Record<string, string> = {
  trial: "Free trial",
  solo: "Solo — $79/mo",
  team: "Team — $199/mo",
  agency: "Agency — $499/mo",
};

function UsageMeter({ label, used, limit }: { label: string; used: number; limit: number | null }) {
  const pct = limit === null ? 0 : Math.min(100, Math.round((used / limit) * 100));
  const warn = limit !== null && pct >= 80;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-slate-700">{label}</span>
        <span className={warn ? "text-amber-600 font-semibold" : "text-slate-500"}>
          {used} / {limit === null ? "∞" : limit}
        </span>
      </div>
      {limit !== null && (
        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${pct >= 100 ? "bg-red-500" : pct >= 80 ? "bg-amber-400" : "bg-indigo-500"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  );
}

const LINKEDIN_CLIENT_ID = import.meta.env.VITE_LINKEDIN_CLIENT_ID ?? "";
const LINKEDIN_REDIRECT_URI = import.meta.env.VITE_LINKEDIN_REDIRECT_URI ?? `${window.location.origin}/linkedin/callback`;
const LINKEDIN_SCOPE = "openid profile email w_member_social";

function initiateLinkedInOAuth() {
  const state = crypto.randomUUID();
  sessionStorage.setItem("linkedin_oauth_state", state);
  const params = new URLSearchParams({
    response_type: "code",
    client_id: LINKEDIN_CLIENT_ID,
    redirect_uri: LINKEDIN_REDIRECT_URI,
    scope: LINKEDIN_SCOPE,
    state,
  });
  window.location.href = `https://www.linkedin.com/oauth/v2/authorization?${params}`;
}

const PLAN_PRICING = [
  {
    key: "solo" as const,
    label: "Solo",
    monthly: "$79/mo",
    annual: "$759/yr ($63/mo)",
  },
  {
    key: "team" as const,
    label: "Team",
    monthly: "$199/mo",
    annual: "$1,910/yr ($159/mo)",
  },
  {
    key: "agency" as const,
    label: "Agency",
    monthly: "$499/mo",
    annual: "$4,790/yr ($399/mo)",
  },
];

export default function SettingsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: liAccount, isLoading } = useLinkedInStatus();
  const disconnect = useLinkedInDisconnect();
  const { data: plan } = usePlanStatus();
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>("monthly");
  const checkout = useCreateCheckout();
  const portal = useCreatePortal();

  const linkedinParam = searchParams.get("linkedin");
  const billingParam = searchParams.get("billing");

  const isPaidPlan = plan && !["trial"].includes(plan.plan);

  useEffect(() => {
    if (linkedinParam) {
      const t = setTimeout(() => setSearchParams({}, { replace: true }), 3000);
      return () => clearTimeout(t);
    }
  }, [linkedinParam]);

  useEffect(() => {
    if (billingParam) {
      const t = setTimeout(() => setSearchParams({}, { replace: true }), 4000);
      return () => clearTimeout(t);
    }
  }, [billingParam]);

  return (
    <div className="h-full overflow-y-auto px-8 py-7 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-sm text-slate-500 mt-1">Manage your workspace integrations.</p>
      </div>

      {/* Billing status banners */}
      {billingParam === "success" && (
        <div className="flex items-center gap-2 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700 font-medium">
          <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          Subscription activated! Your plan will update shortly.
        </div>
      )}
      {billingParam === "cancelled" && (
        <div className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-600">
          Checkout cancelled. No charges were made.
        </div>
      )}

      {/* Plan & usage card */}
      {plan && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Plan & usage</h2>
              <p className="text-sm text-slate-500 mt-0.5">
                {PLAN_LABELS[plan.plan] ?? plan.plan}
                {plan.trial_active && plan.days_remaining !== null && (
                  <span className="ml-2 text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                    {plan.days_remaining === 0 ? "Expires today" : `${plan.days_remaining}d remaining`}
                  </span>
                )}
                {plan.read_only && (
                  <span className="ml-2 text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full">Expired</span>
                )}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {isPaidPlan && (
                <button
                  type="button"
                  onClick={() => portal.mutate()}
                  disabled={portal.isPending}
                  className="text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors"
                >
                  {portal.isPending ? "Loading…" : "Manage billing"}
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowUpgrade(true)}
                className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
              >
                {isPaidPlan ? "Change plan →" : "Upgrade →"}
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <UsageMeter
              label="Post generations"
              used={plan.post_generations_used}
              limit={plan.post_generations_limit}
            />
            <UsageMeter
              label="Image generations"
              used={plan.image_generations_used}
              limit={plan.image_generations_limit}
            />
          </div>

          <p className="text-xs text-slate-400">Usage resets monthly.</p>
        </div>
      )}

      {/* Upgrade modal */}
      {showUpgrade && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setShowUpgrade(false); }}
        >
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Choose a plan</h2>
              <button
                type="button"
                onClick={() => setShowUpgrade(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Billing period toggle */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl w-fit">
              <button
                type="button"
                onClick={() => setBillingPeriod("monthly")}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  billingPeriod === "monthly"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => setBillingPeriod("annual")}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  billingPeriod === "annual"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                Annual <span className="text-emerald-600 font-semibold">–20%</span>
              </button>
            </div>

            {/* Plan cards */}
            <div className="space-y-3">
              {PLAN_PRICING.map((p) => (
                <div
                  key={p.key}
                  className="flex items-center justify-between p-4 border border-slate-200 rounded-xl hover:border-indigo-300 transition-colors"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{p.label}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {billingPeriod === "monthly" ? p.monthly : p.annual}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={checkout.isPending}
                    onClick={() =>
                      checkout.mutate({ plan: p.key, billing_period: billingPeriod })
                    }
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-colors"
                  >
                    {checkout.isPending ? "Loading…" : "Select"}
                  </button>
                </div>
              ))}
            </div>

            <p className="text-xs text-slate-400 text-center">
              Secure checkout via Stripe. Cancel anytime.
            </p>
          </div>
        </div>
      )}

      {/* LinkedIn integration card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
        <div className="flex items-center gap-3">
          {/* LinkedIn icon */}
          <div className="w-10 h-10 rounded-xl bg-[#0A66C2] flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
            </svg>
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-900">LinkedIn</h2>
            <p className="text-sm text-slate-500">Publish posts directly to your LinkedIn profile.</p>
          </div>
        </div>

        {/* Status banner */}
        {linkedinParam === "connected" && (
          <div className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700 font-medium">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            LinkedIn connected successfully!
          </div>
        )}
        {linkedinParam === "error" && (
          <div className="px-4 py-2.5 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
            Connection failed. Please try again.
          </div>
        )}

        {isLoading ? (
          <div className="h-10 bg-slate-100 rounded-xl animate-pulse" />
        ) : liAccount?.is_active ? (
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <div>
                <p className="text-sm font-medium text-slate-800">Connected</p>
                <p className="text-xs text-slate-400">
                  Since {new Date(liAccount.connected_at).toLocaleDateString()}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => disconnect.mutate()}
              disabled={disconnect.isPending}
              className="text-xs text-slate-400 hover:text-red-500 transition-colors font-medium"
            >
              {disconnect.isPending ? "Disconnecting…" : "Disconnect"}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={initiateLinkedInOAuth}
            disabled={!LINKEDIN_CLIENT_ID}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#0A66C2] hover:bg-[#004182] disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-colors"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
            </svg>
            Connect LinkedIn
          </button>
        )}

        {!LINKEDIN_CLIENT_ID && (
          <p className="text-xs text-amber-600">
            Add <code className="font-mono bg-amber-50 px-1 rounded">VITE_LINKEDIN_CLIENT_ID</code> to your <code className="font-mono bg-amber-50 px-1 rounded">.env</code> to enable this.
          </p>
        )}
      </div>
    </div>
  );
}
