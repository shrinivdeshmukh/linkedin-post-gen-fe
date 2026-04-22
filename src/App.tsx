import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuthState } from "./hooks/useAuthState";

// Pages — created as stubs, to be implemented
import LoginPage from "./pages/auth/LoginPage";
import SignupPage from "./pages/auth/SignupPage";
import OnboardingPage from "./pages/onboarding/OnboardingPage";
import DashboardPage from "./pages/dashboard/DashboardPage";
import ComposerPage from "./pages/composer/ComposerPage";
import ApprovalsPage from "./pages/approvals/ApprovalsPage";
import SchedulePage from "./pages/schedule/SchedulePage";
import SettingsPage from "./pages/settings/SettingsPage";
import LinkedInCallbackPage from "./pages/linkedin/LinkedInCallbackPage";
import CampaignsPage from "./pages/campaigns/CampaignsPage";
import NewCampaignPage from "./pages/campaigns/NewCampaignPage";
import CampaignDetailPage from "./pages/campaigns/CampaignDetailPage";
import AppLayout from "./components/layout/AppLayout";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuthState();
  if (loading)
    return (
      <div className="flex h-screen items-center justify-center text-gray-500">
        Loading...
      </div>
    );
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/linkedin/callback" element={<LinkedInCallbackPage />} />

        {/* Onboarding — authenticated but no org yet */}
        <Route
          path="/onboarding"
          element={
            <ProtectedRoute>
              <OnboardingPage />
            </ProtectedRoute>
          }
        />

        {/* App shell */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="composer" element={<ComposerPage />} />
          <Route path="composer/:postId" element={<ComposerPage />} />
          <Route path="approvals" element={<ApprovalsPage />} />
          <Route path="campaigns" element={<CampaignsPage />} />
          <Route path="campaigns/new" element={<NewCampaignPage />} />
          <Route path="campaigns/:campaignId" element={<CampaignDetailPage />} />
          <Route path="schedule" element={<SchedulePage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
