import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuthState } from "../../hooks/useAuthState";
import { useAcceptInvite } from "../../lib/api-hooks";

export default function AcceptInvitePage() {
  const { token } = useParams<{ token: string }>();
  const { user, loading } = useAuthState();
  const navigate = useNavigate();
  const accept = useAcceptInvite();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (loading || !token) return;
    if (!user) {
      // Not signed in — redirect to login, then back here
      navigate(`/login?redirect=/invite/${token}`, { replace: true });
      return;
    }

    accept.mutate(
      { token },
      {
        onSuccess: () => {
          setDone(true);
          setTimeout(() => navigate("/dashboard", { replace: true }), 2000);
        },
        onError: (e: unknown) => {
          const msg =
            (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
            "Failed to accept invite. The link may have expired.";
          setError(msg);
        },
      }
    );
  }, [loading, user, token]);

  if (loading || accept.isPending) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-slate-500">Accepting invite…</p>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
            <svg className="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-base font-semibold text-slate-800">You're in!</p>
          <p className="text-sm text-slate-400">Redirecting to dashboard…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-sm">
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto">
            <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <p className="text-base font-semibold text-slate-800">Invite error</p>
          <p className="text-sm text-slate-500">{error}</p>
          <button
            type="button"
            onClick={() => navigate("/login", { replace: true })}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-colors"
          >
            Go to login
          </button>
        </div>
      </div>
    );
  }

  return null;
}
