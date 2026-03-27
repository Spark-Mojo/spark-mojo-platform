import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import AuthGate from '@/components/Auth';
import Layout from './Layout';
import OnboardingMojo from './OnboardingMojo';
import WorkboardMojo from '@/components/mojos/WorkboardMojo';
import BillingPlaceholder from './BillingPlaceholder';
import SyncPlaceholder from './SyncPlaceholder';
import SettingsPlaceholder from './SettingsPlaceholder';

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
