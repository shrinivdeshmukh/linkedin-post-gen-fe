import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuthState } from "./hooks/useAuthState";

// Pages — created as stubs, to be implemented
import LoginPage from "./pages/auth/LoginPage";
import SignupPage from "./pages/auth/SignupPage";
import OnboardingPage from "./pages/onboarding/OnboardingPage";
import DashboardPage from "./pages/dashboard/DashboardPage";
import ComposerPage from "./pages/composer/ComposerPage";
import ApprovalsPage from "./pages/approvals/ApprovalsPage";
import ContentCalendarPage from "./pages/calendar/ContentCalendarPage";
import SettingsPage from "./pages/settings/SettingsPage";
import LinkedInCallbackPage from "./pages/linkedin/LinkedInCallbackPage";
import CampaignsPage from "./pages/campaigns/CampaignsPage";
import NewCampaignPage from "./pages/campaigns/NewCampaignPage";
import CampaignDetailPage from "./pages/campaigns/CampaignDetailPage";
import BlogComposerPage from "./pages/blog/BlogComposerPage";
import MediaLibraryPage from "./pages/media/MediaLibraryPage";
import MediaCollectionDetailPage from "./pages/media/MediaCollectionDetailPage";
import PublicCollectionPage from "./pages/media/PublicCollectionPage";
import VideoPublicPage from "./pages/videos/VideoPublicPage";
import VideoDetailPage from "./pages/videos/VideoDetailPage";
import AppLayout from "./components/layout/AppLayout";
import AcceptInvitePage from "./pages/auth/AcceptInvitePage";
import AdminPage from "./pages/admin/AdminPage";
import AdminOrgDetailPage from "./pages/admin/AdminOrgDetailPage";

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
        {/* Internal admin — no Firebase auth, key-gated on client + server */}
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/admin/orgs/:orgId" element={<AdminOrgDetailPage />} />

        {/* Public */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/linkedin/callback" element={<LinkedInCallbackPage />} />
        <Route path="/v/:slug" element={<VideoPublicPage />} />
        <Route path="/shared/collections/:token" element={<PublicCollectionPage />} />
        <Route path="/invite/:token" element={<AcceptInvitePage />} />

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
          <Route path="blog/:postId" element={<BlogComposerPage />} />
          <Route path="videos" element={<MediaLibraryPage />} />
          <Route path="media" element={<MediaLibraryPage />} />
          <Route path="media/collections/:collectionId" element={<MediaCollectionDetailPage />} />
          <Route path="media/videos/:videoId" element={<VideoDetailPage />} />
          <Route path="calendar" element={<ContentCalendarPage />} />
          <Route path="schedule" element={<ContentCalendarPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
