import { MotionConfig } from 'motion/react';
import { WorkspaceLayout } from './components/workspace/WorkspaceLayout';
import { RouterProvider, useRouter } from './hooks/useRouter';
import { SanitizerProvider } from './hooks/useSanitizerStore';
import { AuditPage } from './pages/Audit';
import { HandoverPage } from './pages/Handover';
import { HowItWorksPage } from './pages/HowItWorks';
import { LandingPage } from './pages/Landing';
import { PrivacyGuidePage } from './pages/PrivacyGuide';
import { SanitizerPage } from './pages/Sanitizer';
import { SettingsPage } from './pages/Settings';

function AppRoutes() {
  const { route } = useRouter();

  if (route === '/') {
    return <LandingPage />;
  }

  return (
    <WorkspaceLayout>
      {route === '/app' && <SanitizerPage />}
      {route === '/app/handover' && <HandoverPage />}
      {route === '/app/audit' && <AuditPage />}
      {route === '/app/how-it-works' && <HowItWorksPage />}
      {route === '/app/privacy' && <PrivacyGuidePage />}
      {route === '/app/settings' && <SettingsPage />}
    </WorkspaceLayout>
  );
}

export function App() {
  return (
    <MotionConfig reducedMotion="user">
      <RouterProvider>
        <SanitizerProvider>
          <AppRoutes />
        </SanitizerProvider>
      </RouterProvider>
    </MotionConfig>
  );
}

export default App;
