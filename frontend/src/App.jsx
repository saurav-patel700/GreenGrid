import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Context Providers
import { AuthProvider } from './context/AuthContext';
import { WebSocketProvider } from './context/WebSocketContext';

// Layouts & Guard Wrappers
import PublicLayout from './components/layout/PublicLayout';
import AppLayout from './components/layout/AppLayout';
import ProtectedRoute from './components/common/ProtectedRoute';
import PublicOnlyRoute from './components/common/PublicOnlyRoute';

// Public Pages
import Home from './pages/public/Home';
import Platform from './pages/public/Platform';
import Solutions from './pages/public/Solutions';
import Integrations from './pages/public/Integrations';
import Resources from './pages/public/Resources';
import About from './pages/public/About';
import Contact from './pages/public/Contact';
import Privacy from './pages/public/Privacy';
import Terms from './pages/public/Terms';

// Auth Pages
import Login from './pages/public/Login';
import Register from './pages/public/Register';
import ForgotPassword from './pages/public/ForgotPassword';
import ResetPassword from './pages/public/ResetPassword';
import AcceptInvite from './pages/public/AcceptInvite';

// Authenticated App Shell Pages
import Onboarding from './pages/app/Onboarding';
import Overview from './pages/app/Overview';
import Facilities from './pages/app/Facilities';
import FacilityDetail from './pages/app/FacilityDetail';
import Meters from './pages/app/Meters';
import MeterDetail from './pages/app/MeterDetail';
import Energy from './pages/app/Energy';
import CostsBilling from './pages/app/CostsBilling';
import Renewables from './pages/app/Renewables';
import ForecastingPage from './pages/app/ForecastingPage';
import DemandResponsePage from './pages/app/DemandResponsePage';
import OptimizationPage from './pages/app/OptimizationPage';
import DeviceManagementPage from './pages/app/DeviceManagementPage';
import ScenarioSimulatorPage from './pages/app/ScenarioSimulatorPage';
import Alerts from './pages/app/Alerts';
import Reports from './pages/app/Reports';
import ProfileSettings from './pages/app/ProfileSettings';
import UserManagement from './pages/app/UserManagement';
import OrganizationSettings from './pages/app/OrganizationSettings';
import AuditLogPage from './pages/app/AuditLogPage';
import AccessRestricted from './pages/app/AccessRestricted';

// Phase 6 Pages
import OperationsCenterPage from './pages/app/OperationsCenterPage';
import CarbonIntelligencePage from './pages/app/CarbonIntelligencePage';
import SystemHealthPage from './pages/app/SystemHealthPage';
import EnterpriseReportsPage from './pages/app/EnterpriseReportsPage';
import ModelPerformancePage from './pages/app/ModelPerformancePage';
import AutomationPage from './pages/app/AutomationPage';


export default function App() {
  return (
    <AuthProvider>
      <WebSocketProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Website Routes */}
            <Route path="/" element={<PublicLayout />}>
              <Route index element={<Home />} />
              <Route path="platform" element={<Platform />} />
              <Route path="solutions" element={<Solutions />} />
              <Route path="integrations" element={<Integrations />} />
              <Route path="resources" element={<Resources />} />
              <Route path="about" element={<About />} />
              <Route path="contact" element={<Contact />} />
              <Route path="privacy" element={<Privacy />} />
              <Route path="terms" element={<Terms />} />

              {/* Public Auth Routes */}
              <Route path="login" element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />
              <Route path="register" element={<PublicOnlyRoute><Register /></PublicOnlyRoute>} />
              <Route path="forgot-password" element={<PublicOnlyRoute><ForgotPassword /></PublicOnlyRoute>} />
              <Route path="reset-password" element={<ResetPassword />} />
              <Route path="invite/:token" element={<AcceptInvite />} />
            </Route>

            {/* Post-Registration Onboarding */}
            <Route path="/onboarding" element={
              <ProtectedRoute>
                <Onboarding />
              </ProtectedRoute>
            } />

            {/* Authenticated Application Shell Routes */}
            <Route path="/app" element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }>
              <Route index element={<Overview />} />
              <Route path="facilities" element={<Facilities />} />
              <Route path="facilities/:facilityId" element={<FacilityDetail />} />
              <Route path="meters" element={<Meters />} />
              <Route path="meters/:meterId" element={<MeterDetail />} />
              <Route path="energy" element={<Energy />} />
              <Route path="billing" element={<CostsBilling />} />
              <Route path="renewables" element={<Renewables />} />
              <Route path="forecasting" element={<ForecastingPage />} />
              <Route path="demand-response" element={<DemandResponsePage />} />
              <Route path="optimization" element={<OptimizationPage />} />
              <Route path="devices" element={<DeviceManagementPage />} />
              <Route path="scenarios" element={<ScenarioSimulatorPage />} />
              <Route path="alerts" element={<Alerts />} />
              <Route path="reports" element={<EnterpriseReportsPage />} />
              <Route path="operations" element={<OperationsCenterPage />} />
              <Route path="carbon" element={<CarbonIntelligencePage />} />
              <Route path="system-health" element={<SystemHealthPage />} />
              <Route path="model-performance" element={<ModelPerformancePage />} />
              <Route path="automation" element={<AutomationPage />} />

              
              <Route path="integrations" element={<Navigate to="/app" replace />} />

              <Route path="settings" element={<Navigate to="/app/settings/profile" replace />} />
              <Route path="settings/profile" element={<ProfileSettings />} />

              <Route path="settings/users" element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <UserManagement />
                </ProtectedRoute>
              } />

              <Route path="settings/organization" element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <OrganizationSettings />
                </ProtectedRoute>
              } />

              <Route path="settings/audit-log" element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AuditLogPage />
                </ProtectedRoute>
              } />

              <Route path="access-restricted" element={<AccessRestricted />} />
            </Route>

            {/* Catch-all redirect */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </WebSocketProvider>
    </AuthProvider>
  );
}
