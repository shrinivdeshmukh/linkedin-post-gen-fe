import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  useLinkedInStatus,
  useLinkedInDisconnect,
  usePlanStatus,
  useCreateCheckout,
  useCreatePortal,
  useOrgProfile,
  useUpdateCompanyContext,
  useUploadCompanyDoc,
  useUploadLogo,
  useVoiceProfile,
  useUpsertVoiceProfile,
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
    description: "For founders and execs building their personal brand.",
    features: [
      "150 post generations / mo",
      "30 image generations / mo",
      "LinkedIn + Blog mediums",
      "Campaigns (series & collections)",
      "Voice profile & company context",
      "Direct LinkedIn publishing",
    ],
  },
  {
    key: "team" as const,
    label: "Team",
    monthly: "$199/mo",
    annual: "$1,910/yr ($159/mo)",
    description: "For marketing teams managing executive content.",
    features: [
      "500 post generations / mo",
      "75 image generations / mo",
      "Up to 5 seats",
      "Approval workflows",
      "Everything in Solo",
    ],
  },
  {
    key: "agency" as const,
    label: "Agency",
    monthly: "$499/mo",
    annual: "$4,790/yr ($399/mo)",
    description: "For agencies running content for multiple clients.",
    features: [
      "Unlimited post generations",
      "200 image generations / mo",
      "Up to 15 seats",
      "Priority support",
      "Everything in Team",
    ],
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

  const { data: orgProfile } = useOrgProfile();
  const updateContext = useUpdateCompanyContext();
  const uploadDoc = useUploadCompanyDoc();
  const uploadLogo = useUploadLogo();
  const [description, setDescription] = useState("");
  const logoInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);

  const { data: voiceProfile } = useVoiceProfile();
  const upsertVoice = useUpsertVoiceProfile();
  const [samplePosts, setSamplePosts] = useState<string[]>([]);
  const [sampleInput, setSampleInput] = useState("");

  useEffect(() => {
    if (voiceProfile?.sample_posts) setSamplePosts(voiceProfile.sample_posts);
  }, [voiceProfile?.sample_posts]);

  function addSamplePost() {
    const trimmed = sampleInput.trim();
    if (trimmed && samplePosts.length < 5) {
      setSamplePosts([...samplePosts, trimmed]);
      setSampleInput("");
    }
  }

  function removeSamplePost(i: number) {
    setSamplePosts(samplePosts.filter((_, idx) => idx !== i));
  }

  async function saveSamplePosts() {
    await upsertVoice.mutateAsync({ ...voiceProfile, sample_posts: samplePosts });
  }

  useEffect(() => {
    if (orgProfile?.company_description) {
      setDescription(orgProfile.company_description);
    }
  }, [orgProfile?.company_description]);

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
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6 space-y-5">
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
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {PLAN_PRICING.map((p) => (
                <div
                  key={p.key}
                  className="flex flex-col p-5 border border-slate-200 rounded-xl hover:border-indigo-300 transition-colors space-y-4"
                >
                  <div>
                    <p className="text-base font-bold text-slate-900">{p.label}</p>
                    <p className="text-sm text-indigo-600 font-semibold mt-0.5">
                      {billingPeriod === "monthly" ? p.monthly : p.annual}
                    </p>
                    <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">{p.description}</p>
                  </div>
                  <ul className="flex-1 space-y-2">
                    {p.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-xs text-slate-600">
                        <svg className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        {f}
                      </li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    disabled={checkout.isPending}
                    onClick={() => checkout.mutate({ plan: p.key, billing_period: billingPeriod })}
                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-colors"
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

      {/* Company Profile card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Company profile</h2>
          <p className="text-sm text-slate-500 mt-0.5">Help the AI write accurate, on-brand content for your company.</p>
        </div>

        {/* Logo section */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-700">Logo</p>
          <div className="flex items-center gap-4">
            {orgProfile?.logo_url ? (
              <img
                src={orgProfile.logo_url}
                alt="Company logo"
                className="w-16 h-16 rounded-xl object-contain border border-slate-200 bg-slate-50"
              />
            ) : (
              <div className="w-16 h-16 rounded-xl border-2 border-dashed border-slate-200 flex items-center justify-center bg-slate-50">
                <svg className="w-6 h-6 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3 3h18M3 21h18" />
                </svg>
              </div>
            )}
            <div>
              <button
                type="button"
                onClick={() => logoInputRef.current?.click()}
                disabled={uploadLogo.isPending}
                className="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {uploadLogo.isPending ? "Uploading…" : orgProfile?.logo_url ? "Change logo" : "Upload logo"}
              </button>
              <p className="text-xs text-slate-400 mt-1">PNG, JPG, SVG — max 5MB</p>
            </div>
          </div>
          <input
            ref={logoInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) uploadLogo.mutate(file);
              e.target.value = "";
            }}
          />
        </div>

        {/* Description textarea */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">Company description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            placeholder="Describe your company: what you do, who you serve, your mission and differentiators…"
            className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-colors placeholder:text-slate-300"
          />
          <button
            type="button"
            onClick={() => updateContext.mutate({ company_description: description })}
            disabled={updateContext.isPending || !description.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-colors"
          >
            {updateContext.isPending && (
              <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            )}
            {updateContext.isPending ? "Generating brief…" : "Save & generate brief"}
          </button>
        </div>

        {/* PDF upload */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-700">Or upload a company document</p>
          <p className="text-xs text-slate-400">Upload a pitch deck, about-us doc, or company overview as a PDF. We'll extract a brief automatically.</p>
          <button
            type="button"
            onClick={() => docInputRef.current?.click()}
            disabled={uploadDoc.isPending}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {uploadDoc.isPending ? (
              <>
                <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Extracting & summarizing…
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
                Upload company document (PDF)
              </>
            )}
          </button>
          <input
            ref={docInputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) uploadDoc.mutate(file);
              e.target.value = "";
            }}
          />
        </div>

        {/* AI-generated brief (read-only) */}
        {orgProfile?.company_context && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">AI-generated company brief</label>
            <textarea
              readOnly
              value={orgProfile.company_context}
              rows={8}
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl resize-none bg-slate-50 text-slate-600 focus:outline-none"
            />
          </div>
        )}
      </div>

      {/* Voice samples card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Your writing samples</h2>
          <p className="text-xs text-slate-500 mt-0.5">Paste up to 5 of your best LinkedIn posts. The AI uses these to match your voice.</p>
        </div>

        <div className="space-y-3">
          {samplePosts.map((post, i) => (
            <div key={i} className="relative bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm text-slate-700 leading-relaxed">
              <p className="pr-8 line-clamp-3">{post}</p>
              <button type="button" onClick={() => removeSamplePost(i)} className="absolute top-3 right-3 text-slate-400 hover:text-red-500 transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}

          {samplePosts.length < 5 && (
            <div className="space-y-2">
              <textarea
                value={sampleInput}
                onChange={(e) => setSampleInput(e.target.value)}
                placeholder={`Paste sample post ${samplePosts.length + 1}…`}
                rows={4}
                className="w-full px-3.5 py-3 text-sm text-slate-900 bg-white border border-slate-300 rounded-xl placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
              />
              <button type="button" onClick={addSamplePost} disabled={!sampleInput.trim()} className="text-sm text-indigo-600 hover:text-indigo-700 font-medium disabled:opacity-40 transition-colors">
                + Add this post
              </button>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={saveSamplePosts}
          disabled={upsertVoice.isPending}
          className="px-4 py-2 text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl transition-colors"
        >
          {upsertVoice.isPending ? "Saving…" : "Save samples"}
        </button>
      </div>

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
