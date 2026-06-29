import { useState } from "react";
import { useAddons, useApplyAddons, type AddonInfo, type ApplyAddonsPayload } from "../../lib/api-hooks";

const ADDON_ORDER = ["tokens", "media_storage"] as const;
type AddonType = (typeof ADDON_ORDER)[number];

function formatAddonUnits(addonType: string, units: number): string {
  if (addonType === "tokens") {
    return `+${(units / 1_000_000).toFixed(0)}M tokens`;
  }
  if (addonType === "media_storage") {
    return `+${(units / 1024).toFixed(0)} GB`;
  }
  return `+${units}`;
}

function SliderRow({
  info,
  value,
  onChange,
}: {
  info: AddonInfo;
  value: number;
  onChange: (v: number) => void;
}) {
  const extraCost = value * info.price_per_block;
  const extraUnits = value * info.block_size;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-800">{info.label}</p>
          <p className="text-xs text-slate-400">{info.block_display} per block · $5/block/mo</p>
        </div>
        <div className="text-right">
          {value > 0 ? (
            <>
              <p className="text-sm font-semibold text-indigo-600">{formatAddonUnits(info.addon_type, extraUnits)}</p>
              <p className="text-xs text-slate-500">${extraCost}/mo</p>
            </>
          ) : (
            <p className="text-xs text-slate-400">Not added</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <input
          type="range"
          min={0}
          max={20}
          step={1}
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value))}
          disabled={!info.available}
          className="flex-1 h-1.5 accent-indigo-600 disabled:opacity-40"
        />
        <span className="text-xs font-medium text-slate-600 w-6 text-right">{value}</span>
      </div>
      {!info.available && (
        <p className="text-xs text-amber-600">Not available yet — contact support</p>
      )}
    </div>
  );
}

export default function AddonsSection() {
  const { data: addons = [], isLoading } = useAddons();
  const applyAddons = useApplyAddons();

  const [modalOpen, setModalOpen] = useState(false);
  const [blocks, setBlocks] = useState<Record<AddonType, number>>({ tokens: 0, media_storage: 0 });
  const [error, setError] = useState("");

  function openModal() {
    const current: Record<string, number> = {};
    for (const a of addons) current[a.addon_type] = a.current_blocks;
    setBlocks({
      tokens: current.tokens ?? 0,
      media_storage: current.media_storage ?? 0,
    });
    setError("");
    setModalOpen(true);
  }

  async function handleSave() {
    setError("");
    const payload: ApplyAddonsPayload = {
      tokens: blocks.tokens,
      media_storage: blocks.media_storage,
    };
    try {
      await applyAddons.mutateAsync(payload);
      setModalOpen(false);
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(msg ?? "Failed to update add-ons. Please try again.");
    }
  }

  const totalMonthly = addons.reduce((s, a) => s + a.monthly_cost, 0);
  const activeAddons = addons.filter((a) => a.current_blocks > 0);
  const previewTotal = (blocks.tokens + blocks.media_storage) * 5;

  return (
    <>
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Add-ons</h2>
            <p className="text-sm text-slate-500 mt-0.5">
              Extra capacity on top of your plan · $5/block/mo each
            </p>
          </div>
          <button
            type="button"
            onClick={openModal}
            className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
          >
            {activeAddons.length > 0 ? "Manage →" : "Add capacity →"}
          </button>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {[1, 2].map((i) => (
              <div key={i} className="h-8 skeleton rounded-xl" />
            ))}
          </div>
        ) : activeAddons.length === 0 ? (
          <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-dashed border-slate-200">
            <svg className="w-5 h-5 text-slate-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-slate-500">No active add-ons. Running low on tokens or storage? Add more capacity without changing your plan.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {activeAddons.map((addon) => (
              <div key={addon.addon_type} className="flex items-center justify-between text-sm py-1.5 border-b border-slate-50 last:border-0">
                <span className="text-slate-700">{addon.label}</span>
                <div className="flex items-center gap-4">
                  <span className="text-indigo-600 font-medium">{formatAddonUnits(addon.addon_type, addon.extra_units)}</span>
                  <span className="text-slate-400">${addon.monthly_cost}/mo</span>
                </div>
              </div>
            ))}
            <div className="flex items-center justify-between pt-1 text-sm font-semibold text-slate-700">
              <span>Total add-ons</span>
              <span>${totalMonthly.toFixed(2)}/mo</span>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900">Manage add-ons</h2>
              <p className="text-sm text-slate-500 mt-0.5">
                Each block costs $5/mo. Changes are prorated immediately.
              </p>
            </div>

            <div className="px-6 py-5 space-y-5 max-h-[60vh] overflow-y-auto">
              {addons.map((info) => (
                <SliderRow
                  key={info.addon_type}
                  info={info}
                  value={blocks[info.addon_type as AddonType] ?? 0}
                  onChange={(v) => setBlocks((prev) => ({ ...prev, [info.addon_type]: v }))}
                />
              ))}
            </div>

            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Add-ons total</span>
                <span className="font-bold text-slate-900">${previewTotal}/mo</span>
              </div>
              {error && <p className="text-xs text-red-500">{error}</p>}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={applyAddons.isPending}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors"
                >
                  {applyAddons.isPending ? "Saving…" : "Save changes"}
                </button>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2.5 border border-slate-200 text-slate-600 text-sm font-medium rounded-xl hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
