import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../../lib/firebase";
import { useLinkedInConnect } from "../../lib/api-hooks";

/** Resolves once Firebase has emitted its first auth state (user may or may not be signed in). */
function waitForAuth(): Promise<void> {
  return new Promise((resolve) => {
    const unsub = onAuthStateChanged(auth, () => { unsub(); resolve(); });
  });
}

export default function LinkedInCallbackPage() {
  const navigate = useNavigate();
  const connect = useLinkedInConnect();
  const called = useRef(false);

  useEffect(() => {
    if (called.current) return;
    called.current = true;

    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const state = params.get("state");
    const error = params.get("error");

    if (error || !code) {
      navigate("/settings?linkedin=error", { replace: true });
      return;
    }

    const savedState = sessionStorage.getItem("linkedin_oauth_state");
    if (state !== savedState) {
      navigate("/settings?linkedin=error", { replace: true });
      return;
    }
    sessionStorage.removeItem("linkedin_oauth_state");

    // Wait for Firebase to restore the session before calling the API
    waitForAuth().then(() => {
      connect.mutate(code, {
        onSuccess: () => navigate("/settings?linkedin=connected", { replace: true }),
        onError: () => navigate("/settings?linkedin=error", { replace: true }),
      });
    });
  }, []);

  return (
    <div className="flex h-screen items-center justify-center bg-slate-50">
      <div className="text-center space-y-3">
        <svg className="w-8 h-8 animate-spin text-indigo-600 mx-auto" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
        </svg>
        <p className="text-sm text-slate-500">Connecting your LinkedIn account…</p>
      </div>
    </div>
  );
}
