import { useRef, useState } from "react";
import { StepIndicator } from "../../components/onboarding/StepIndicator";
import { WorkspaceStep, type WorkspaceFormData } from "./steps/WorkspaceStep";
import { VoiceToneStep, type VoiceToneData } from "./steps/VoiceToneStep";
import { VoiceDetailsStep, type VoiceDetailsData } from "./steps/VoiceDetailsStep";
import { CompleteStep } from "./steps/CompleteStep";
import { useOnboard, useUpsertVoiceProfile, useUpdateCompanyContext, useUploadLogo } from "../../lib/api-hooks";

const STEPS = [
  { label: "Workspace" },
  { label: "Your voice" },
  { label: "Fine-tune" },
  { label: "Company" },
  { label: "Done!" },
];

const DEFAULT_TONE: VoiceToneData = {
  tone: { formal: 50, analytical: 50, bold: 50 },
  topics: [],
  audience: [],
};

const DEFAULT_DETAILS: VoiceDetailsData = {
  avoid: [],
  sample_posts: [],
  free_form: "",
};

export default function OnboardingPage() {
  const [step, setStep] = useState(0);
  const [workspaceData, setWorkspaceData] = useState<WorkspaceFormData | null>(null);
  const [toneData, setToneData] = useState<VoiceToneData>(DEFAULT_TONE);
  const [detailsData, setDetailsData] = useState<VoiceDetailsData>(DEFAULT_DETAILS);

  const onboard = useOnboard();
  const upsertVoice = useUpsertVoiceProfile();
  const updateContext = useUpdateCompanyContext();
  const uploadLogo = useUploadLogo();
  const [companyDescription, setCompanyDescription] = useState("");
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  // Step 1 submit: create org + user in DB
  async function handleWorkspaceSubmit(data: WorkspaceFormData) {
    await onboard.mutateAsync({
      org_name: data.org_name,
      org_slug: data.org_slug,
      display_name: data.display_name,
    });
    setWorkspaceData(data);
    setStep(1);
  }

  // Step 3 submit: save voice profile
  async function handleDetailsSubmit() {
    await upsertVoice.mutateAsync({
      tone: {
        formal: toneData.tone.formal / 100,
        analytical: toneData.tone.analytical / 100,
        bold: toneData.tone.bold / 100,
      },
      topics: toneData.topics,
      audience: toneData.audience.join(", "),
      avoid: detailsData.avoid,
      sample_posts: detailsData.sample_posts,
      free_form: detailsData.free_form || undefined,
    });
    setStep(3);
  }

  // Step 4 submit: save company context (optional)
  async function handleCompanySubmit() {
    if (companyDescription.trim()) {
      await updateContext.mutateAsync({ company_description: companyDescription });
    }
    setStep(4);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 flex flex-col">
      {/* Top bar */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white/80 backdrop-blur-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center">
            <svg
              className="w-3.5 h-3.5 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>
          <span className="font-semibold text-slate-900 text-sm">
            postcards<span className="text-indigo-600">.studio</span>
          </span>
        </div>
        <span className="text-xs text-slate-400">
          Step {step + 1} of {STEPS.length}
        </span>
      </header>

      {/* Main content */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg space-y-10">
          {/* Step indicator */}
          <div className="flex justify-center">
            <StepIndicator steps={STEPS} current={step} />
          </div>

          {/* Step card */}
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8 sm:p-10">
            {step === 0 && (
              <WorkspaceStep
                defaultValues={workspaceData ?? undefined}
                onNext={handleWorkspaceSubmit}
                loading={onboard.isPending}
                error={
                  onboard.isError
                    ? "Couldn't create workspace. The slug may already be taken."
                    : null
                }
              />
            )}

            {step === 1 && (
              <VoiceToneStep
                data={toneData}
                onChange={setToneData}
                onNext={() => setStep(2)}
                onBack={() => setStep(0)}
              />
            )}

            {step === 2 && (
              <VoiceDetailsStep
                data={detailsData}
                onChange={setDetailsData}
                onNext={handleDetailsSubmit}
                onBack={() => setStep(1)}
                loading={upsertVoice.isPending}
              />
            )}

            {step === 3 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Tell us about your company</h2>
                  <p className="text-sm text-slate-500 mt-1">
                    This helps us write accurate, on-brand content. You can skip this and add it later in Settings.
                  </p>
                </div>

                {/* Logo upload */}
                <div className="space-y-2">
                  <p className="text-sm font-medium text-slate-700">Company logo <span className="text-slate-400 font-normal">(optional)</span></p>
                  <div className="flex items-center gap-4">
                    {logoPreview ? (
                      <img src={logoPreview} alt="Logo preview" className="w-14 h-14 rounded-xl object-contain border border-slate-200 bg-slate-50" />
                    ) : (
                      <div className="w-14 h-14 rounded-xl border-2 border-dashed border-slate-200 flex items-center justify-center bg-slate-50">
                        <svg className="w-5 h-5 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3 3h18M3 21h18" />
                        </svg>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => logoInputRef.current?.click()}
                      disabled={uploadLogo.isPending}
                      className="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-50 transition-colors"
                    >
                      {uploadLogo.isPending ? "Uploading…" : "Upload logo"}
                    </button>
                  </div>
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setLogoPreview(URL.createObjectURL(file));
                        uploadLogo.mutate(file);
                      }
                      e.target.value = "";
                    }}
                  />
                </div>

                {/* Description textarea */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">
                    Company description <span className="text-slate-400 font-normal">(optional)</span>
                  </label>
                  <textarea
                    value={companyDescription}
                    onChange={(e) => setCompanyDescription(e.target.value)}
                    rows={4}
                    placeholder="What does your company do? Who do you serve? What makes you different?"
                    className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-colors placeholder:text-slate-300"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleCompanySubmit}
                    disabled={updateContext.isPending}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-colors"
                  >
                    {updateContext.isPending && (
                      <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    )}
                    {updateContext.isPending ? "Saving…" : "Save & continue"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep(4)}
                    className="px-4 py-2.5 text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors"
                  >
                    Skip for now
                  </button>
                </div>
              </div>
            )}

            {step === 4 && (
              <CompleteStep name={workspaceData?.display_name ?? "there"} />
            )}
          </div>

          {/* Skip voice profile (only on steps 1 and 2) */}
          {(step === 1 || step === 2) && (
            <p className="text-center text-xs text-slate-400">
              Want to do this later?{" "}
              <button
                onClick={() => setStep(3)}
                className="text-indigo-500 hover:text-indigo-700 font-medium transition-colors"
              >
                Skip voice setup
              </button>
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
