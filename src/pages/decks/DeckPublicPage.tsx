import { useParams } from "react-router-dom";
import { useState } from "react";
import api from "../../lib/api";
import { usePublicDeck, useDeckGateSubmit } from "../../lib/api-hooks";

export default function DeckPublicPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: meta, isLoading: metaLoading, isError: metaError } = usePublicDeck(slug ?? null);
  const gateSubmit = useDeckGateSubmit(slug ?? "");

  const [gateToken, setGateToken] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [fields, setFields] = useState<Record<string, string>>({});
  const [gateError, setGateError] = useState<string | null>(null);

  const gateRequired = meta && (meta.password_required || meta.lead_capture_enabled);
  const passed = !gateRequired || gateToken !== null;

  async function handleGateSubmit(e: React.FormEvent) {
    e.preventDefault();
    setGateError(null);
    try {
      const result = await gateSubmit.mutateAsync({
        password: meta?.password_required ? password : undefined,
        fields: meta?.lead_capture_enabled ? fields : undefined,
      });
      setGateToken(result.gate_token);
    } catch {
      setGateError("Incorrect password or submission failed. Please try again.");
    }
  }

  if (metaLoading) return (
    <div className="flex h-screen items-center justify-center">
      <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (metaError) return (
    <div className="flex h-screen items-center justify-center text-slate-500 text-sm">
      Deck not found.
    </div>
  );

  // Show gate form if required and not yet passed
  if (!passed) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-slate-800 rounded-2xl border border-slate-700 shadow-xl overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-700">
            <p className="text-lg font-bold text-white">{meta?.title}</p>
            {meta?.company_name && (
              <p className="text-sm text-slate-400 mt-0.5">{meta.company_name}</p>
            )}
          </div>
          <form onSubmit={handleGateSubmit} className="px-6 py-5 space-y-4">
            {meta?.password_required && (
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-sm bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                  placeholder="Enter password"
                />
              </div>
            )}
            {meta?.lead_capture_enabled && meta.lead_capture_fields?.map((f) => (
              <div key={f.name}>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  {f.label}{f.required && <span className="text-red-400 ml-0.5">*</span>}
                </label>
                <input
                  type={f.type === "email" ? "email" : "text"}
                  value={fields[f.name] ?? ""}
                  onChange={(e) => setFields((prev) => ({ ...prev, [f.name]: e.target.value }))}
                  required={f.required}
                  className="w-full px-3 py-2 text-sm bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                  placeholder={f.label}
                />
              </div>
            ))}
            {gateError && (
              <p className="text-xs text-red-400">{gateError}</p>
            )}
            <button
              type="submit"
              disabled={gateSubmit.isPending}
              className="w-full py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl transition-colors"
            >
              {gateSubmit.isPending ? "Verifying…" : "View deck"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const iframeSrc = `${api.defaults.baseURL}/decks/public/${slug}/html${gateToken ? `?gate_token=${encodeURIComponent(gateToken)}` : ""}`;

  return (
    <iframe
      src={iframeSrc}
      className="w-screen h-screen border-0"
      title={meta?.title ?? "Deck"}
      sandbox="allow-scripts allow-same-origin allow-popups"
    />
  );
}
