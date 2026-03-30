import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import AuthGate from '@/components/Auth';
import Layout from './Layout';
import OnboardingMojo from './OnboardingMojo';
import WorkboardMojo from '@/components/mojos/WorkboardMojo';
import BillingPlaceholder from './BillingPlaceholder';
import SyncPlaceholder from './SyncPlaceholder';
import SettingsPlaceholder from './SettingsPlaceholder';

const LibraryPage = lazy(() => import('./Library'));


function AppRoutes() {
  return (
    <AuthGate>
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/onboarding" replace />} />
          <Route path="/onboarding" element={<OnboardingMojo />} />
          <Route path="/workboard" element={<WorkboardMojo />} />
          <Route path="/billing" element={<BillingPlaceholder />} />
          <Route path="/sync" element={<SyncPlaceholder />} />
          <Route path="/settings" element={<SettingsPlaceholder />} />
          <Route
            path="/library"
            element={
              <Suspense fallback={<div className="p-8 text-gray-400">Loading library...</div>}>
                <LibraryPage />
              </Suspense>
            }
          />
          <Route path="*" element={<Navigate to="/onboarding" replace />} />
        </Routes>
      </Layout>
    </AuthGate>
  );
}

export default function Pages() {
  return (
    <Router>
      <AppRoutes />
    </Router>
  );
}
