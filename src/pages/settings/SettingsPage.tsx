import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import AddonsSection from "./AddonsSection";
import {
  useLinkedInStatus,
  useLinkedInDisconnect,
  usePlanStatus,
  useCreateCheckout,
  useCreatePortal,
  useOrgProfile,
  useUpdateCompanyContext,
  useUpdateOrgSettings,
  useUploadCompanyDoc,
  useUploadLogo,
  useVoiceProfile,
  useUpsertVoiceProfile,
  useVideos,
  useMe,
  useOrgMembers,
  useOrgInvites,
  useInviteMember,
  useRevokeInvite,
  useRemoveMember,
  useUpdateMemberRole,
  useApiKeys,
  useCreateApiKey,
  useRevokeApiKey,
  type ApiKey,
  type ApiKeyCreated,
  type BillingPeriod,
} from "../../lib/api-hooks";

const PLAN_LABELS: Record<string, string> = {
  trial: "Free trial",
  solo: "Solo — $49/mo",
  team: "Team — $149/mo",
  agency: "Agency — $399/mo",
};

function fmtTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return `${n}`;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function UsageMeter({ label, used, limit, display }: { label: string; used: number; limit: number | null; display?: string }) {
  const pct = limit === null ? 0 : Math.min(100, Math.round((used / limit) * 100));
  const warn = limit !== null && pct >= 80;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-slate-700">{label}</span>
        <span className={warn ? "text-amber-600 font-semibold" : "text-slate-500"}>
          {display ?? `${used} / ${limit === null ? "∞" : limit}`}
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

// ── Spark Settings ─────────────────────────────────────────────────────────────

function SparkSettingsSection({
  orgProfile,
  onSave,
}: {
  orgProfile: { competitors?: string[] | null; timezone?: string; country?: string | null };
  onSave: (payload: { competitors?: string[]; timezone?: string; country?: string }) => void;
}) {
  const [timezone, setTimezone] = useState(orgProfile.timezone ?? "UTC");
  const [country, setCountry] = useState(orgProfile.country ?? "");
  const [dirty, setDirty] = useState(false);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
      <div>
        <h2 className="text-base font-semibold text-slate-900">Spark settings</h2>
        <p className="text-sm text-slate-500 mt-0.5">Configure how Spark researches your world.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-700">Timezone</label>
          <input
            type="text"
            value={timezone}
            onChange={(e) => { setTimezone(e.target.value); setDirty(true); }}
            placeholder="e.g. Asia/Kolkata"
            className="w-full text-sm border border-slate-300 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <p className="text-xs text-slate-400">IANA timezone for daily 2 AM auto-refresh</p>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-700">Country</label>
          <input
            type="text"
            value={country}
            onChange={(e) => { setCountry(e.target.value); setDirty(true); }}
            placeholder="e.g. India"
            className="w-full text-sm border border-slate-300 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <p className="text-xs text-slate-400">Used to surface locally relevant news</p>
        </div>
      </div>
      {dirty && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => { onSave({ timezone, country }); setDirty(false); }}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-colors"
          >
            Save
          </button>
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
    monthly: "$49/mo",
    annual: "$470/yr ($39/mo)",
    description: "For founders and execs building their personal brand.",
    features: [
      "5M AI tokens / mo (~200 posts or 8 decks)",
      "100 image generations / mo",
      "2 GB media storage",
      "LinkedIn + Blog mediums",
      "Campaigns, Decks & Podcasts",
      "Voice profile & company context",
      "Direct LinkedIn publishing",
    ],
  },
  {
    key: "team" as const,
    label: "Team",
    monthly: "$149/mo",
    annual: "$1,430/yr ($119/mo)",
    description: "For marketing teams managing executive content.",
    features: [
      "25M AI tokens / mo (~1,000 posts or 40 decks)",
      "300 image generations / mo",
      "10 GB media storage",
      "Up to 5 seats",
      "Approval workflows",
      "Everything in Solo",
    ],
  },
  {
    key: "agency" as const,
    label: "Agency",
    monthly: "$399/mo",
    annual: "$3,830/yr ($319/mo)",
    description: "For agencies running content for multiple clients.",
    features: [
      "Unlimited AI tokens",
      "Unlimited image generations",
      "50 GB media storage",
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
  const { data: videoLibrary } = useVideos();
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>("monthly");
  const checkout = useCreateCheckout();
  const portal = useCreatePortal();

  const { data: orgProfile } = useOrgProfile();
  const updateContext = useUpdateCompanyContext();
  const updateSettings = useUpdateOrgSettings();
  const uploadDoc = useUploadCompanyDoc();
  const uploadLogo = useUploadLogo();
  const [description, setDescription] = useState("");
  const logoInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);

  const { data: me } = useMe();
  const { data: members } = useOrgMembers();
  const { data: invites } = useOrgInvites();
  const inviteMember = useInviteMember();
  const revokeInvite = useRevokeInvite();
  const removeMember = useRemoveMember();
  const updateRole = useUpdateMemberRole();
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("editor");
  const [inviteMsg, setInviteMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

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
    <div className="h-full overflow-y-auto px-4 py-5 md:px-8 md:py-7 space-y-8">
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
              label="AI tokens"
              used={plan.tokens_used}
              limit={plan.tokens_limit}
              display={
                plan.tokens_limit === null
                  ? `${fmtTokens(plan.tokens_used)} / ∞`
                  : `${fmtTokens(plan.tokens_used)} / ${fmtTokens(plan.tokens_limit)} tokens${plan.token_pct !== null ? ` · ${plan.token_pct}% used` : ""}`
              }
            />
            <UsageMeter
              label="Image generations"
              used={plan.images_used}
              limit={plan.images_limit}
              display={
                plan.images_limit === null
                  ? `${plan.images_used} images / ∞`
                  : `${plan.images_used} / ${plan.images_limit} images`
              }
            />
            <UsageMeter
              label="Media storage"
              used={videoLibrary?.total_storage_bytes ?? 0}
              limit={videoLibrary?.storage_limit_bytes ?? null}
              display={
                !videoLibrary
                  ? "Loading…"
                  : videoLibrary.storage_limit_bytes === null
                  ? "Not included on this plan"
                  : `${formatBytes(videoLibrary.total_storage_bytes)} / ${formatBytes(videoLibrary.storage_limit_bytes)}`
              }
            />
            <UsageMeter
              label="Transcription minutes"
              used={plan.transcription_minutes_used}
              limit={plan.transcription_minutes_limit}
              display={
                plan.transcription_minutes_limit === null
                  ? `${plan.transcription_minutes_used.toFixed(1)} min / ∞`
                  : `${plan.transcription_minutes_used.toFixed(1)} / ${plan.transcription_minutes_limit} min`
              }
            />
          </div>

          <p className="text-xs text-slate-400">Token and image counters reset monthly. Storage is cumulative.</p>
        </div>
      )}

      {/* Add-ons */}
      {plan && !["trial", "locked"].includes(plan.plan) && <AddonsSection />}

      {/* Video settings */}
      {orgProfile && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
          <h2 className="text-base font-semibold text-slate-900">Video settings</h2>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-slate-800">Auto-transcribe on upload</p>
              <p className="text-xs text-slate-400 mt-0.5">
                Automatically transcribe every video when uploaded. Turn off to transcribe manually and conserve your monthly quota.
              </p>
            </div>
            <button
              type="button"
              onClick={() => updateSettings.mutate({ auto_transcribe: !orgProfile.auto_transcribe })}
              disabled={updateSettings.isPending}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none disabled:opacity-50 ${
                orgProfile.auto_transcribe ? "bg-indigo-600" : "bg-slate-200"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  orgProfile.auto_transcribe ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        </div>
      )}

      {/* Spark settings */}
      {orgProfile && (
        <SparkSettingsSection orgProfile={orgProfile} onSave={(payload) => updateSettings.mutate(payload)} />
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

      {/* Team card — visible to all but invite/remove only for owners */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Team</h2>
          <p className="text-sm text-slate-500 mt-0.5">Manage members and pending invites.</p>
        </div>

        {/* Members list */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Members</p>
          {(members ?? []).map((m) => (
            <div key={m.id} className="flex items-center justify-between py-2.5 px-3 bg-slate-50 rounded-xl border border-slate-100">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                  {(m.display_name ?? m.email).charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{m.display_name ?? m.email}</p>
                  <p className="text-xs text-slate-400 truncate">{m.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {me?.role === "owner" && m.id !== me?.id ? (
                  <select
                    value={m.role}
                    onChange={(e) => updateRole.mutate({ memberId: m.id, role: e.target.value })}
                    className="text-xs border border-slate-200 rounded-lg px-2 py-1 bg-white text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  >
                    <option value="owner">Owner</option>
                    <option value="editor">Editor</option>
                    <option value="viewer">Viewer</option>
                  </select>
                ) : (
                  <span className="text-xs text-slate-400 capitalize">{m.role}</span>
                )}
                {me?.role === "owner" && m.id !== me?.id && (
                  <button
                    type="button"
                    onClick={() => { if (confirm(`Remove ${m.display_name ?? m.email} from the team?`)) removeMember.mutate(m.id); }}
                    className="text-slate-300 hover:text-red-400 transition-colors"
                    title="Remove member"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Pending invites */}
        {(invites ?? []).length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Pending invites</p>
            {(invites ?? []).map((inv) => (
              <div key={inv.id} className="flex items-center justify-between py-2.5 px-3 bg-amber-50 rounded-xl border border-amber-100">
                <div>
                  <p className="text-sm font-medium text-slate-700">{inv.email}</p>
                  <p className="text-xs text-slate-400 capitalize">{inv.role} · expires {new Date(inv.expires_at).toLocaleDateString()}</p>
                </div>
                {me?.role === "owner" && (
                  <button
                    type="button"
                    onClick={() => revokeInvite.mutate(inv.id)}
                    className="text-xs text-slate-400 hover:text-red-500 transition-colors font-medium"
                  >
                    Revoke
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Invite form — owners only */}
        {me?.role === "owner" && (
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <p className="text-sm font-medium text-slate-700">Invite someone</p>
            <div className="flex gap-2">
              <input
                type="email"
                placeholder="colleague@company.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent placeholder:text-slate-300"
              />
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                className="text-sm border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              >
                <option value="editor">Editor</option>
                <option value="viewer">Viewer</option>
                <option value="owner">Owner</option>
              </select>
              <button
                type="button"
                disabled={inviteMember.isPending || !inviteEmail.trim()}
                onClick={async () => {
                  try {
                    await inviteMember.mutateAsync({ email: inviteEmail.trim(), role: inviteRole });
                    setInviteEmail("");
                    setInviteMsg({ type: "ok", text: `Invite sent to ${inviteEmail.trim()}` });
                    setTimeout(() => setInviteMsg(null), 4000);
                  } catch (e: unknown) {
                    const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? "Failed to send invite";
                    setInviteMsg({ type: "err", text: msg });
                    setTimeout(() => setInviteMsg(null), 6000);
                  }
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-colors whitespace-nowrap"
              >
                {inviteMember.isPending ? "Sending…" : "Send invite"}
              </button>
            </div>
            {inviteMsg && (
              <p className={`text-xs font-medium ${inviteMsg.type === "ok" ? "text-emerald-600" : "text-red-500"}`}>
                {inviteMsg.text}
              </p>
            )}
          </div>
        )}
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
          <div className="h-10 skeleton rounded-xl" />
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

      <ApiKeysSection />
    </div>
  );
}

// ── API Keys section ──────────────────────────────────────────────────────────

function ApiKeysSection() {
  const { data: keys = [], isLoading } = useApiKeys();
  const createKey = useCreateApiKey();
  const revokeKey = useRevokeApiKey();

  const [name, setName] = useState("");
  const [createdKey, setCreatedKey] = useState<ApiKeyCreated | null>(null);
  const [copiedMcp, setCopiedMcp] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    const result = await createKey.mutateAsync({ name: name.trim() });
    setCreatedKey(result);
    setName("");
  }

  async function handleRevoke(id: string) {
    setRevoking(id);
    try {
      await revokeKey.mutateAsync(id);
      if (createdKey?.id === id) setCreatedKey(null);
    } finally {
      setRevoking(null);
    }
  }

  const mcpBase = (import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api/v1").replace(/\/api\/v1\/?$/, "");
  const mcpUrl = `${mcpBase}/mcp`;

  function copyMcp() { navigator.clipboard.writeText(mcpUrl); setCopiedMcp(true); setTimeout(() => setCopiedMcp(false), 2000); }
  function copyKey(text: string) { navigator.clipboard.writeText(text); setCopiedKey(true); setTimeout(() => setCopiedKey(false), 2000); }

  return (
    <div className="space-y-5 p-6 bg-white rounded-2xl border border-slate-100 shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-violet-50 flex items-center justify-center">
          <svg className="w-4.5 h-4.5 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 3v1.5M4.5 8.25H3m18 0h-1.5M4.5 12H3m18 0h-1.5m-15 3.75H3m18 0h-1.5M8.25 19.5V21M12 3v1.5m0 15V21m3.75-18v1.5m0 15V21m-9-1.5h10.5a2.25 2.25 0 002.25-2.25V6.75a2.25 2.25 0 00-2.25-2.25H6.75A2.25 2.25 0 004.5 6.75v10.5a2.25 2.25 0 002.25 2.25zm.75-12h9v9h-9v-9z" />
          </svg>
        </div>
        <div>
          <h2 className="text-base font-semibold text-slate-900">MCP / API Access</h2>
          <p className="text-sm text-slate-500">Connect Claude Desktop and other AI tools directly to your workspace.</p>
        </div>
      </div>

      {/* Claude Desktop — OAuth, just paste the URL */}
      <div className="p-4 bg-violet-50 border border-violet-100 rounded-xl space-y-3">
        <div>
          <p className="text-xs font-semibold text-violet-800">Connect Claude Desktop</p>
          <p className="text-xs text-violet-600 mt-0.5">
            Copy the URL below → Claude Desktop → Settings → Connectors → Add custom connector → paste &amp; connect.
            Claude will open a browser window for you to authorise — no manual key needed.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <code className="text-xs font-mono text-violet-900 bg-violet-100 px-2 py-1.5 rounded-lg flex-1 break-all">
            {mcpUrl}
          </code>
          <button type="button" onClick={copyMcp} className="shrink-0 px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold rounded-lg transition-colors">
            {copiedMcp ? "Copied!" : "Copy"}
          </button>
        </div>
      </div>

      {/* Plain key just created (for API / programmatic use) */}
      {createdKey && (
        <div className="space-y-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-amber-800">API key — copy now, won't be shown again</p>
            <button type="button" onClick={() => setCreatedKey(null)} className="text-amber-400 hover:text-amber-600">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          <div className="flex items-center gap-2">
            <code className="text-xs font-mono text-amber-900 bg-amber-100 px-2 py-1.5 rounded-lg flex-1 break-all">
              {createdKey.key}
            </code>
            <button type="button" onClick={() => copyKey(createdKey.key)} className="shrink-0 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg transition-colors">
              {copiedKey ? "Copied!" : "Copy"}
            </button>
          </div>
          <p className="text-xs text-amber-700">Use as <code className="font-mono">Authorization: Bearer {createdKey.key}</code></p>
        </div>
      )}

      {/* Existing keys */}
      {isLoading ? (
        <div className="h-10 skeleton rounded-xl" />
      ) : keys.length > 0 ? (
        <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden">
          {keys.map((k: ApiKey) => (
            <div key={k.id} className="flex items-center justify-between px-4 py-3 bg-white hover:bg-slate-50 transition-colors">
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">{k.name}</p>
                <p className="text-xs text-slate-400 font-mono">{k.key_preview}</p>
              </div>
              <div className="flex items-center gap-4 shrink-0 ml-4">
                <div className="text-right hidden sm:block">
                  <p className="text-xs text-slate-400">Created {new Date(k.created_at).toLocaleDateString()}</p>
                  {k.last_used_at && (
                    <p className="text-xs text-slate-400">Used {new Date(k.last_used_at).toLocaleDateString()}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => handleRevoke(k.id)}
                  disabled={revoking === k.id}
                  className="text-xs text-slate-400 hover:text-red-500 font-medium transition-colors disabled:opacity-40"
                >
                  {revoking === k.id ? "Revoking…" : "Revoke"}
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-slate-400 text-center py-2">No API keys yet. Claude Desktop keys are created automatically on first connect.</p>
      )}

      {/* Create key for API / programmatic use */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-slate-500">Create a key for direct API access</p>
        <form onSubmit={handleCreate} className="flex gap-2">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Key name (e.g. CI pipeline)"
            className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
          />
          <button
            type="submit"
            disabled={!name.trim() || createKey.isPending}
            className="px-4 py-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors"
          >
            {createKey.isPending ? "Creating…" : "Generate"}
          </button>
        </form>
      </div>
    </div>
  );
}
