import { useState } from "react";
import { StepIndicator } from "../../components/onboarding/StepIndicator";
import { WorkspaceStep, type WorkspaceFormData } from "./steps/WorkspaceStep";
import { VoiceToneStep, type VoiceToneData } from "./steps/VoiceToneStep";
import { VoiceDetailsStep, type VoiceDetailsData } from "./steps/VoiceDetailsStep";
import { CompleteStep } from "./steps/CompleteStep";
import { useOnboard, useUpsertVoiceProfile } from "../../lib/api-hooks";

const STEPS = [
  { label: "Workspace" },
  { label: "Your voice" },
  { label: "Fine-tune" },
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
