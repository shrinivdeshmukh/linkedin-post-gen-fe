/**
 * /mcp-connect
 *
 * OAuth 2.0 consent page for Claude Desktop MCP integration.
 *
 * Claude Desktop redirects the user's browser here (via GET /oauth/authorize
 * on the backend, which 302s to this page). We confirm the user is logged in,
 * show a simple "Allow" prompt, then:
 *   1. POST /oauth/create-code  — backend issues an auth code
 *   2. Redirect to redirect_uri?code=...&state=...  (back to Claude Desktop)
 */
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../../lib/firebase";

function getApiRoot(): string {
  const base = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api/v1";
  return base.replace(/\/api\/v1\/?$/, "");
}

type Stage = "loading" | "needs-login" | "ready" | "authorizing" | "error";

export default function McpConnectPage() {
  const navigate = useNavigate();
  const [stage, setStage] = useState<Stage>("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const called = useRef(false);

  // OAuth params from URL (set by Claude Desktop via GET /oauth/authorize)
  const params = new URLSearchParams(window.location.search);
  const codeChallenge = params.get("code_challenge") ?? "";
  const codeChallengeMethod = params.get("code_challenge_method") ?? "S256";
  const clientId = params.get("client_id") ?? "";
  const redirectUri = params.get("redirect_uri") ?? "";
  const state = params.get("state") ?? "";

  useEffect(() => {
    // If we returned from login, restore OAuth params from sessionStorage
    if (!codeChallenge && !redirectUri) {
      const saved = sessionStorage.getItem("mcp_oauth_params");
      if (saved) {
        sessionStorage.removeItem("mcp_oauth_params");
        // Replace current URL with the saved params so the page re-reads them
        const newUrl = `${window.location.pathname}?${saved}`;
        window.history.replaceState(null, "", newUrl);
        window.location.reload();
        return;
      }
    }

    const unsub = onAuthStateChanged(auth, (user) => {
      if (called.current) return;
      called.current = true;
      unsub();

      if (!user) {
        // Save OAuth params so we can restore them after login
        sessionStorage.setItem("mcp_oauth_params", window.location.search.replace(/^\?/, ""));
        navigate("/login?redirect=/mcp-connect", { replace: true });
        return;
      }

      if (!codeChallenge || !redirectUri) {
        setErrorMsg("Missing OAuth parameters. Please initiate connection from Claude Desktop.");
        setStage("error");
        return;
      }

      setStage("ready");
    });

    return unsub;
  }, []);

  async function handleAuthorize() {
    setStage("authorizing");
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("Not logged in");

      const firebaseToken = await user.getIdToken();
      const apiRoot = getApiRoot();

      const res = await fetch(`${apiRoot}/oauth/create-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firebase_token: firebaseToken,
          code_challenge: codeChallenge,
          code_challenge_method: codeChallengeMethod,
          client_id: clientId,
          redirect_uri: redirectUri,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `Server error ${res.status}`);
      }

      const { code } = await res.json();

      // Redirect back to Claude Desktop's local callback server
      const callbackUrl = new URL(redirectUri);
      callbackUrl.searchParams.set("code", code);
      if (state) callbackUrl.searchParams.set("state", state);
      window.location.href = callbackUrl.toString();
    } catch (e: any) {
      setErrorMsg(e.message || "Something went wrong");
      setStage("error");
    }
  }

  function handleDeny() {
    if (redirectUri) {
      const callbackUrl = new URL(redirectUri);
      callbackUrl.searchParams.set("error", "access_denied");
      if (state) callbackUrl.searchParams.set("state", state);
      window.location.href = callbackUrl.toString();
    } else {
      navigate("/settings", { replace: true });
    }
  }

  if (stage === "loading") {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <svg className="w-8 h-8 animate-spin text-indigo-600" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
        </svg>
      </div>
    );
  }

  if (stage === "error") {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="max-w-sm w-full mx-auto p-8 bg-white rounded-2xl shadow-sm border border-red-100 text-center space-y-4">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-slate-800">Connection failed</h2>
          <p className="text-sm text-slate-500">{errorMsg}</p>
          <button
            onClick={() => navigate("/settings")}
            className="text-sm text-indigo-600 hover:underline"
          >
            Go to Settings
          </button>
        </div>
      </div>
    );
  }

  const isAuthorizing = stage === "authorizing";

  return (
    <div className="flex h-screen items-center justify-center bg-slate-50">
      <div className="max-w-sm w-full mx-auto p-8 bg-white rounded-2xl shadow-sm border border-slate-200 space-y-6">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="flex items-center justify-center gap-3">
            {/* Postcards logo placeholder */}
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold text-lg">
              P
            </div>
            <svg className="w-5 h-5 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h8M8 12h8M8 17h4" />
            </svg>
            {/* Claude logo placeholder */}
            <div className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center text-white font-bold text-lg">
              C
            </div>
          </div>
          <h1 className="text-xl font-semibold text-slate-800">Connect Claude Desktop</h1>
          <p className="text-sm text-slate-500">
            Claude Desktop is requesting access to your Postcards workspace.
          </p>
        </div>

        {/* Permissions list */}
        <div className="bg-slate-50 rounded-xl p-4 space-y-2">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-3">Claude will be able to</p>
          {[
            "Read your organisation profile and voice settings",
            "View and create LinkedIn post drafts",
            "Access Spark research results",
            "Trigger new research sessions",
          ].map((item) => (
            <div key={item} className="flex items-start gap-2">
              <svg className="w-4 h-4 text-green-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-sm text-slate-600">{item}</span>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={handleDeny}
            disabled={isAuthorizing}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition disabled:opacity-50"
          >
            Deny
          </button>
          <button
            onClick={handleAuthorize}
            disabled={isAuthorizing}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isAuthorizing && (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
            )}
            {isAuthorizing ? "Authorizing…" : "Authorize"}
          </button>
        </div>

        <p className="text-xs text-slate-400 text-center">
          This creates a persistent API key. You can revoke it anytime in{" "}
          <a href="/settings" className="text-indigo-500 hover:underline">Settings</a>.
        </p>
      </div>
    </div>
  );
}
