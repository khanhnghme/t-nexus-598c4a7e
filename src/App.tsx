import { useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { DashboardLayoutProvider, useDashboardLayoutContext } from "@/contexts/DashboardLayoutContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { NavigationProvider } from "@/contexts/NavigationContext";
import { FilePreviewProvider } from "@/contexts/FilePreviewContext";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AnimationProvider } from "@/contexts/AnimationContext";

import { ForceLightMode } from "@/components/ForceLightMode";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { WorkspaceProvider } from "@/contexts/WorkspaceContext";
import ErrorBoundary from "@/components/ErrorBoundary";

import { supabase } from "@/integrations/supabase/client";
import PageTransition from "@/components/PageTransition";
import LoadingScreen from "@/components/LoadingScreen";
import DashboardLayout from "@/components/layout/DashboardLayout";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Groups from "./pages/Groups";
import GroupDetail from "./pages/GroupDetail";
import MemberManagement from "./pages/MemberManagement";
import Feedback from "./pages/Feedback";
import NotFound from "./pages/NotFound";
import AdminActivity from "./pages/AdminActivity";
import AdminBackup from "./pages/AdminBackup";
import AdminSystem from "./pages/AdminSystem";
import Communication from "./pages/Communication";
import PublicProjectView from "./pages/PublicProjectView";
import FilePreview from "./pages/FilePreview";
import PersonalInfo from "./pages/PersonalInfo";
import AccountSettings from "./pages/AccountSettings";
import ResetPassword from "./pages/ResetPassword";
import Utilities from "./pages/Utilities";
import PublicProfile from "./pages/PublicProfile";
import PublicTaskPreview from "./pages/PublicTaskPreview";
import CalendarPage from "./pages/Calendar";
import Tips from "./pages/Tips";
import DownloadPage from "./pages/Download";
import Pricing from "./pages/Pricing";
import Terms from "./pages/Terms";
import WorkspaceSettings from "./pages/WorkspaceSettings";
import WorkspaceMembers from "./pages/WorkspaceMembers";
import CreateWorkspace from "./pages/CreateWorkspace";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading, isApproved, profile } = useAuth();
  if (isLoading) return <LoadingScreen />;
  if (!user) return <Navigate to="/auth" replace />;
  if (profile && !profile.is_approved) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}

function ProtectedLayoutInner() {
  const { projectInfo } = useDashboardLayoutContext();
  return (
    <DashboardLayout 
      useOutlet 
      projectId={projectInfo.projectId} 
      projectName={projectInfo.projectName} 
      zaloLink={projectInfo.zaloLink} 
    />
  );
}

function ProtectedLayout() {
  const { user, isLoading, profile } = useAuth();

  if (isLoading) return <LoadingScreen />;
  if (!user) return <Navigate to="/auth" replace />;
  if (profile && !profile.is_approved) return <Navigate to="/auth" replace />;

  return (
    <DashboardLayoutProvider>
      <ProtectedLayoutInner />
    </DashboardLayoutProvider>
  );
}

function AppRoutes() {
  const recoveryHash = typeof window !== "undefined" ? window.location.hash : "";
  
  // Handle recovery links → redirect to reset password
  const shouldRedirectRecovery =
    typeof window !== "undefined" &&
    window.location.pathname === "/" &&
    recoveryHash.includes("type=recovery");

  if (shouldRedirectRecovery) {
    window.location.replace(`/reset-password${recoveryHash}`);
    return null;
  }

  // Legacy: handle signup confirmation links (no longer used, but handle gracefully)
  const shouldRedirectSignup =
    typeof window !== "undefined" &&
    window.location.pathname === "/" &&
    recoveryHash.includes("type=signup");

  if (shouldRedirectSignup) {
    supabase.auth.signOut({ scope: 'local' }).then(() => {
      window.location.replace(`/auth`);
    });
    return null;
  }

  return (
    <LanguageProvider>
    <PageTransition>
      <Routes>
        {/* ═══ Localized public routes — EN (root) ═══ */}
        <Route path="/" element={<ForceLightMode><Landing /></ForceLightMode>} />
        <Route path="/auth" element={<ForceLightMode><Auth /></ForceLightMode>} />
        <Route path="/pricing" element={<ForceLightMode><Pricing /></ForceLightMode>} />
        <Route path="/download" element={<ForceLightMode><DownloadPage /></ForceLightMode>} />
        <Route path="/terms" element={<ForceLightMode><Terms /></ForceLightMode>} />

        {/* ═══ Localized public routes — Vietnamese (/vi) ═══ */}
        <Route path="/vi">
          <Route index element={<ForceLightMode><Landing /></ForceLightMode>} />
          <Route path="auth" element={<ForceLightMode><Auth /></ForceLightMode>} />
          <Route path="pricing" element={<ForceLightMode><Pricing /></ForceLightMode>} />
          <Route path="download" element={<ForceLightMode><DownloadPage /></ForceLightMode>} />
          <Route path="terms" element={<ForceLightMode><Terms /></ForceLightMode>} />
        </Route>

        {/* ═══ Non-localized public routes ═══ */}
        <Route path="/project/:projectSlug/task/:taskSlug" element={<ForceLightMode><PublicTaskPreview /></ForceLightMode>} />
        <Route path="/project/:projectSlug" element={<ForceLightMode><PublicProjectView /></ForceLightMode>} />
        <Route path="/s/:shareToken" element={<ForceLightMode><PublicProjectView /></ForceLightMode>} />
        <Route path="/s/:shareToken/t/:taskSlug/f/:fileIndex" element={<ForceLightMode><FilePreview /></ForceLightMode>} />
        <Route path="/public/project/:shareToken" element={<ForceLightMode><PublicProjectView /></ForceLightMode>} />
        <Route path="/reset-password" element={<ForceLightMode><ResetPassword /></ForceLightMode>} />
        <Route path="/auth/member" element={<Navigate to="/auth" replace />} />
        <Route path="/auth/admin" element={<Navigate to="/auth" replace />} />
        <Route path="/u/:username" element={<ForceLightMode><PublicProfile /></ForceLightMode>} />
        <Route path="/file-preview" element={<ForceLightMode><FilePreview /></ForceLightMode>} />

        {/* ═══ Protected routes with persistent DashboardLayout ═══ */}
        <Route element={<ProtectedLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/groups" element={<Groups />} />
          <Route path="/p/:projectSlug" element={<GroupDetail />} />
          <Route path="/p/:projectSlug/t/:taskSlug" element={<GroupDetail />} />
          <Route path="/p/:projectSlug/t/:taskSlug/f/:fileIndex" element={<ProtectedRoute><FilePreview /></ProtectedRoute>} />
          <Route path="/groups/:groupId" element={<GroupDetail />} />
          <Route path="/groups/:groupId/tasks/:taskId" element={<GroupDetail />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/communication" element={<Communication />} />
          <Route path="/feedback" element={<Feedback />} />
          <Route path="/personal-info" element={<PersonalInfo />} />
          <Route path="/account-settings" element={<AccountSettings />} />
          <Route path="/tips" element={<Tips />} />
          <Route path="/members" element={<MemberManagement />} />
          <Route path="/admin/activity" element={<AdminActivity />} />
          <Route path="/admin/backup" element={<AdminBackup />} />
          <Route path="/admin/system" element={<AdminSystem />} />
          <Route path="/utilities" element={<Utilities />} />
          {/* ═══ Workspace routes ═══ */}
          <Route path="/workspace/new" element={<CreateWorkspace />} />
          <Route path="/workspace/settings" element={<WorkspaceSettings />} />
          <Route path="/workspace/members" element={<WorkspaceMembers />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </PageTransition>
    </LanguageProvider>
  );
}

const App = () => {
  return (
    <ErrorBoundary>
    <ThemeProvider>
      
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <AuthProvider>
                <WorkspaceProvider>
                    <AnimationProvider>
                      <NavigationProvider>
                        <FilePreviewProvider>
                          <AppRoutes />
                        </FilePreviewProvider>
                      </NavigationProvider>
                    </AnimationProvider>
                </WorkspaceProvider>
              </AuthProvider>
            </BrowserRouter>
          </TooltipProvider>
        </QueryClientProvider>
      
    </ThemeProvider>
    </ErrorBoundary>
  );
};

export default App;
