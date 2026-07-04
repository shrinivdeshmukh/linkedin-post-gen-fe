import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { auth } from "../lib/firebase";
import { GoogleAuthProvider, signInWithPopup, onAuthStateChanged } from "firebase/auth";
import api from "../lib/api";

type State = "loading" | "needs-login" | "connecting" | "success" | "error" | "no-ext-id";

export default function ExtensionAuthPage() {
  const [searchParams] = useSearchParams();
  const extId = searchParams.get("extId");
  const [state, setState] = useState<State>("loading");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!extId) {
      setState("no-ext-id");
      return;
    }
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        connectExtension();
      } else {
        setState("needs-login");
      }
    });
    return () => unsub();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [extId]);

  async function connectExtension() {
    if (!extId) return;
    setState("connecting");
    try {
      const { data } = await api.post<{ api_key: string; user_email: string | null }>(
        "/api-keys/extension-token"
      );
      const apiBaseUrl = api.defaults.baseURL as string;
      const appUrl = window.location.origin;

      // Send credentials to the extension
      // chrome.runtime.sendMessage is injected by Chrome for domains in externally_connectable
      const cr = (window as unknown as { chrome?: { runtime?: { sendMessage: Function } } }).chrome;
      if (!cr?.runtime?.sendMessage) {
        throw new Error("Chrome extension API not available. Make sure the extension is installed.");
      }
      await new Promise<void>((resolve, reject) => {
        cr.runtime!.sendMessage(
          extId,
          { type: "auth-complete", apiKey: data.api_key, apiBaseUrl, appUrl, userEmail: data.user_email },
          (response: unknown) => {
            if ((window as unknown as { chrome?: { runtime?: { lastError?: { message: string } } } }).chrome?.runtime?.lastError) {
              reject(new Error((window as unknown as { chrome?: { runtime?: { lastError?: { message: string } } } }).chrome!.runtime!.lastError!.message));
            } else {
              resolve();
            }
          }
        );
      });
      setState("success");
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Unknown error");
      setState("error");
    }
  }

  async function handleLogin() {
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
      // onAuthStateChanged will call connectExtension
    } catch {
      setErrorMsg("Login failed. Please try again.");
      setState("error");
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-white flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg border border-slate-100 w-full max-w-sm p-8 text-center">
        {/* Logo */}
        <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center mx-auto mb-4">
          <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
          </svg>
        </div>

        <h1 className="text-lg font-semibold text-slate-800 mb-1">Connect Postcards Extension</h1>
        <p className="text-sm text-slate-500 mb-6">Sign in to link your Postcards account with the Chrome extension.</p>

        {state === "loading" && (
          <div className="text-sm text-slate-400">Checking login status…</div>
        )}

        {state === "no-ext-id" && (
          <div className="text-sm text-red-500">
            Open this page from the Postcards extension — the extension ID is missing.
          </div>
        )}

        {state === "needs-login" && (
          <button
            onClick={handleLogin}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Sign in with Google
          </button>
        )}

        {state === "connecting" && (
          <div className="text-sm text-slate-500 flex items-center justify-center gap-2">
            <svg className="w-4 h-4 animate-spin text-indigo-600" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            Connecting to extension…
          </div>
        )}

        {state === "success" && (
          <div className="space-y-3">
            <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
            <p className="text-sm font-medium text-slate-800">Extension connected!</p>
            <p className="text-xs text-slate-400">You can close this tab and start recording.</p>
          </div>
        )}

        {state === "error" && (
          <div className="space-y-3">
            <p className="text-sm text-red-600">{errorMsg || "Something went wrong."}</p>
            <button
              onClick={() => setState("needs-login")}
              className="text-sm text-indigo-600 hover:underline"
            >
              Try again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
