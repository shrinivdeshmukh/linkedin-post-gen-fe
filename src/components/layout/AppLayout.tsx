import { useState, useEffect } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { logout } from "../../lib/firebase";
import { useMe, usePlanStatus } from "../../lib/api-hooks";
import { Button } from "../ui/Button";
import FloatingChat from "../chat/FloatingChat";

type NavItem = { to: string; label: string; spark?: true; icon: React.ReactNode };
type NavGroup = { label?: string; items: NavItem[] };

const navGroups: NavGroup[] = [
  {
    items: [
      {
        to: "/dashboard",
        label: "Today",
        icon: (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
        ),
      },
      {
        to: "/spark",
        label: "Pulse AI",
        spark: true,
        icon: (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 12h2M7 8v8M11 5v14M15 8v8M19 12h2" />
          </svg>
        ),
      },
    ],
  },
  {
    label: "Content",
    items: [
      {
        to: "/studio",
        label: "Posts",
        icon: (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        ),
      },
      {
        to: "/campaigns",
        label: "Campaigns",
        icon: (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        ),
      },
      {
        to: "/approvals",
        label: "Approvals",
        icon: (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
      },
      {
        to: "/calendar",
        label: "Calendar",
        icon: (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        ),
      },
      {
        to: "/media",
        label: "Media",
        icon: (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        ),
      },
      {
        to: "/decks",
        label: "Decks",
        icon: (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        ),
      },
    ],
  },
  {
    label: "Brand",
    items: [
      {
        to: "/brand",
        label: "Brand",
        icon: (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a2 2 0 012-2z" />
          </svg>
        ),
      },
    ],
  },
  // Insights group intentionally hidden until LinkedIn analytics integration is live
  {
    items: [
      {
        to: "/settings",
        label: "Settings",
        icon: (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        ),
      },
    ],
  },
];

export default function AppLayout() {
  const { data: me } = useMe();
  const { data: plan } = usePlanStatus();
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Safety net: if the user somehow lands in the app without completing onboarding, redirect them
  useEffect(() => {
    if (me && me.needs_onboarding) {
      navigate("/onboarding", { replace: true });
    }
  }, [me, navigate]);

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  const initials = me?.display_name
    ? me.display_name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : me?.email?.[0]?.toUpperCase() ?? "?";

  const sidebarNav = (onNavigate?: () => void) => (
    <>
      {/* New post CTA */}
      <div className="px-3 pt-3 pb-1">
        <Button
          fullWidth
          size="sm"
          onClick={() => { navigate("/studio"); onNavigate?.(); }}
          className="justify-center"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          New post
        </Button>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-4 overflow-y-auto">
        {navGroups.map((group, gi) => (
          <div key={gi} className="space-y-0.5">
            {group.label && (
              <p className="px-3 pt-1 pb-0.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                {group.label}
              </p>
            )}
            {group.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onNavigate}
                className={({ isActive }) => {
                  if (item.spark && isActive) return "flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-semibold bg-gradient-to-r from-violet-600 to-indigo-600 text-white transition-all duration-150";
                  if (item.spark) return "flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-semibold text-violet-700 hover:bg-violet-50 transition-all duration-150";
                  return `flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-150 ${isActive ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"}`;
                }}
              >
                {item.icon}
                {item.label}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* User footer */}
      <div className="p-3 border-t border-slate-100">
        <div className="flex items-center gap-2.5 px-2 py-2 rounded-xl hover:bg-slate-50 transition-colors group">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-800 truncate">
              {me?.display_name ?? me?.email ?? "Account"}
            </p>
            <p className="text-xs text-slate-400 capitalize">{me?.role ?? "member"}</p>
          </div>
          <button
            onClick={handleLogout}
            title="Sign out"
            className="text-slate-300 hover:text-slate-600 transition-colors opacity-0 group-hover:opacity-100"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>
    </>
  );

  return (
    <div className="flex flex-col md:flex-row h-screen bg-slate-50">

      {/* Mobile top bar */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-slate-100 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center shadow-sm">
            <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <span className="font-semibold text-slate-900 text-sm tracking-tight">
            postcards<span className="text-indigo-600">.studio</span>
          </span>
        </div>
        <button
          onClick={() => setDrawerOpen(true)}
          className="p-2 text-slate-500 hover:text-slate-700 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {/* Mobile drawer */}
      {drawerOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-40 md:hidden"
            onClick={() => setDrawerOpen(false)}
          />
          <aside className="fixed inset-y-0 left-0 w-64 bg-white z-50 flex flex-col shadow-xl md:hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center shadow-sm">
                  <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <span className="font-semibold text-slate-900 text-sm tracking-tight">
                  postcards<span className="text-indigo-600">.studio</span>
                </span>
              </div>
              <button onClick={() => setDrawerOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {sidebarNav(() => setDrawerOpen(false))}
          </aside>
        </>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-56 bg-white border-r border-slate-100 flex-col flex-shrink-0">
        {/* Logo */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2.5">
          <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center shadow-sm">
            <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <span className="font-semibold text-slate-900 text-sm tracking-tight">
            postcards<span className="text-indigo-600">.studio</span>
          </span>
        </div>
        {sidebarNav()}
      </aside>

      {/* Main content */}

      <main className="flex-1 overflow-hidden min-w-0 flex flex-col">
        {/* Trial expiring soon */}
        {plan?.trial_active && plan.days_remaining !== null && plan.days_remaining <= 2 && !plan.read_only && (
          <div className="flex items-center justify-between px-6 py-2.5 bg-amber-50 border-b border-amber-200 text-sm flex-shrink-0">
            <p className="text-amber-800 font-medium">
              {plan.days_remaining === 0
                ? "Your trial expires today."
                : `Your trial expires in ${plan.days_remaining} day${plan.days_remaining === 1 ? "" : "s"}.`}
            </p>
            <Button size="sm" onClick={() => navigate("/settings")}>Upgrade now</Button>
          </div>
        )}

        {/* Trial ended or plan expired */}
        {plan?.read_only && (
          <div className="flex items-center justify-between px-6 py-2.5 bg-orange-50 border-b border-orange-200 text-sm flex-shrink-0">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-orange-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
              <p className="text-orange-800 font-medium">
                {plan.plan === "trial"
                  ? "Your free trial has ended — upgrade to keep generating content."
                  : "Your plan has expired — upgrade to keep generating content."}
              </p>
            </div>
            <Button size="sm" onClick={() => navigate("/settings")}>Upgrade now</Button>
          </div>
        )}

        {/* Quota exhausted (plan still active) */}
        {!plan?.read_only && plan?.tokens_limit !== null && plan?.tokens_limit !== undefined && plan.tokens_used >= plan.tokens_limit && (
          <div className="flex items-center justify-between px-6 py-2.5 bg-orange-50 border-b border-orange-200 text-sm flex-shrink-0">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-orange-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
              <p className="text-orange-800 font-medium">
                You've used your monthly AI token budget — upgrade your plan or add more tokens.
              </p>
            </div>
            <Button size="sm" onClick={() => navigate("/settings")}>Upgrade now</Button>
          </div>
        )}
        {!plan?.read_only && plan?.tokens_limit !== null && plan?.tokens_limit !== undefined && plan.token_pct !== null && plan.token_pct !== undefined && plan.token_pct >= 80 && plan.tokens_used < plan.tokens_limit && (
          <div className="flex items-center justify-between px-6 py-2.5 bg-amber-50 border-b border-amber-200 text-sm flex-shrink-0">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-amber-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-amber-800 font-medium">
                {plan.token_pct}% of your monthly AI tokens used — consider upgrading before you run out.
              </p>
            </div>
            <Button size="sm" onClick={() => navigate("/settings")}>Upgrade</Button>
          </div>
        )}

        <Outlet />
      </main>
      <FloatingChat />
    </div>
  );
}
