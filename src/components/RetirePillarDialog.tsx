import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useRetirePillar, usePillars, useCampaigns, type ContentPillar } from "../lib/api-hooks";

interface Props {
  pillar: ContentPillar;
  onDone: () => void;
  onCancel: () => void;
}

export default function RetirePillarDialog({ pillar, onDone, onCancel }: Props) {
  const [reassignTo, setReassignTo] = useState<string>("");
  const [done, setDone] = useState(false);
  const { data: allPillars = [] } = usePillars();
  const { data: campaigns = [] } = useCampaigns();
  const retire = useRetirePillar();
  const navigate = useNavigate();

  const activePillars = allPillars.filter((p) => p.id !== pillar.id && p.status === "active");
  const activeCampaigns = campaigns.filter((c) => c.status === "active" || c.status === "ready_for_review");
  const hasPosts = pillar.post_count > 0;

  async function handleRetire() {
    await retire.mutateAsync({
      id: pillar.id,
      reassign_to_pillar_id: reassignTo || null,
    });
    if (hasPosts && activeCampaigns.length > 0) {
      setDone(true);
    } else {
      onDone();
    }
  }

  if (done) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">"{pillar.name}" retired</p>
              <p className="text-xs text-slate-500 mt-0.5">Posts are preserved in your history.</p>
            </div>
          </div>
          <div className="rounded-xl bg-indigo-50 border border-indigo-100 p-4 space-y-2">
            <p className="text-xs font-semibold text-indigo-700">Those posts might fit an active campaign</p>
            <p className="text-xs text-indigo-600 leading-relaxed">
              You have {activeCampaigns.length} active campaign{activeCampaigns.length > 1 ? "s" : ""}. Open Campaigns to link any of these posts to a running arc.
            </p>
            <button
              onClick={() => { onDone(); navigate("/campaigns"); }}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
            >
              Go to Campaigns →
            </button>
          </div>
          <div className="flex justify-end">
            <button
              onClick={onDone}
              className="text-sm text-slate-500 hover:text-slate-700 px-4 py-2 rounded-xl hover:bg-slate-100 transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-slate-100">
          <h2 className="text-base font-bold text-slate-900">Retire "{pillar.name}"</h2>
          <p className="text-sm text-slate-500 mt-1">
            This pillar will be archived. Posts tagged to it stay in your history — your brand evolution is part of the story.
          </p>
        </div>

        {/* Reassign option */}
        <div className="px-6 py-5 space-y-4">
          {pillar.post_count > 0 && (
            <div className="rounded-xl bg-amber-50 border border-amber-100 px-4 py-3 text-sm text-amber-800">
              <span className="font-semibold">{pillar.post_count} post{pillar.post_count !== 1 ? "s" : ""}</span> are tagged to this pillar.
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">What should happen to those posts?</label>

            <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors has-[:checked]:border-indigo-300 has-[:checked]:bg-indigo-50">
              <input
                type="radio"
                name="reassign"
                value=""
                checked={reassignTo === ""}
                onChange={() => setReassignTo("")}
                className="mt-0.5 accent-indigo-600"
              />
              <div>
                <p className="text-sm font-medium text-slate-800">Keep them tagged here</p>
                <p className="text-xs text-slate-500 mt-0.5">Posts stay in your history under this retired pillar. Shows how your brand evolved.</p>
              </div>
            </label>

            {activePillars.length > 0 && (
              <div className="space-y-1.5">
                <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors has-[:checked]:border-indigo-300 has-[:checked]:bg-indigo-50">
                  <input
                    type="radio"
                    name="reassign"
                    value="choose"
                    checked={reassignTo !== "" && reassignTo !== null}
                    onChange={() => setReassignTo(activePillars[0]?.id ?? "")}
                    className="mt-0.5 accent-indigo-600"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-800">Move them to another pillar</p>
                    <p className="text-xs text-slate-500 mt-0.5">Reassign all posts to an active pillar.</p>
                    {reassignTo !== "" && (
                      <select
                        value={reassignTo}
                        onChange={(e) => setReassignTo(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        className="mt-2 w-full text-sm bg-white border border-slate-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-400/40"
                      >
                        {activePillars.map((p) => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    )}
                  </div>
                </label>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 pb-5 flex items-center justify-end gap-3">
          <button
            onClick={onCancel}
            className="text-sm text-slate-500 hover:text-slate-700 px-4 py-2 rounded-xl hover:bg-slate-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleRetire}
            disabled={retire.isPending}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white text-sm font-semibold rounded-xl transition-colors"
          >
            {retire.isPending ? "Retiring…" : "Retire pillar"}
          </button>
        </div>
      </div>
    </div>
  );
}
