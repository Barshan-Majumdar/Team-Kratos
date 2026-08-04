import React, { useEffect, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { io } from 'socket.io-client';

// ── Lazy-loaded top-level pages ───────
const Landing = lazy(() => import('./pages/Landing'));
const UniversalAuth = lazy(() => import('./pages/UniversalAuth'));
const ChangePassword = lazy(() => import('./pages/ChangePassword'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const FaceRegistration = lazy(() => import('./pages/FaceRegistration'));
const AuthReceiver = lazy(() => import('./pages/AuthReceiver'));
const OnboardingWizard = lazy(() => import('./pages/onboarding/OnboardingWizard'));
const Careers = lazy(() => import('./pages/Careers'));
const SetPasswordFromInvite = lazy(() => import('./pages/SetPasswordFromInvite'));
const SuperAdminDashboard = lazy(() => import('./pages/superadmin/SuperAdminDashboard'));

import ProtectedRoute from './components/ProtectedRoute';

// ── App Loading Fallback ───────
const AppLoader = () => (
  <div className="flex items-center justify-center min-h-screen bg-bg-base">
    <div className="flex flex-col items-center gap-3">
      <div className="w-10 h-10 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
      <p className="text-sm text-slate-400 font-medium">Loading Crew...</p>
    </div>
  </div>
);


function App() {
  useEffect(() => {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    if (token && userStr) {
      const user = JSON.parse(userStr);
      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const socket = io(API_BASE, { 
        transports: ['websocket', 'polling'],
        auth: { token }
      });
      
      socket.emit('join', { tenantId: user.tenantId, userId: user.id, roleLevel: user.roleDefinition?.level ?? 3 });

      const handleRealtimeUpdate = (eventName, data) => {
        console.log(`[Phase 6 Real-Time Event] ${eventName}:`, data);
        // We dispatch a custom window event so any mounted component can re-fetch
        window.dispatchEvent(new CustomEvent('app-realtime-update', { detail: { eventName, data } }));
      };

      socket.on('role:permissions_updated', (data) => {
        handleRealtimeUpdate('role:permissions_updated', data);
        if (user.roleDefinitionId === data.role?.id) {
          localStorage.setItem('user', JSON.stringify({ ...user, roleDefinition: data.role }));
          window.location.reload();
        }
      });
      socket.on('tenant:plan_changed', (data) => handleRealtimeUpdate('tenant:plan_changed', data));
      socket.on('office:created', (data) => handleRealtimeUpdate('office:created', data));
      socket.on('entity:created', (data) => handleRealtimeUpdate('entity:created', data));
      socket.on('user:role_updated', (data) => {
        handleRealtimeUpdate('user:role_updated', data);
        // If my own role was updated, update local storage and reload
        if (data.user && data.user.id === user.id) {
          localStorage.setItem('user', JSON.stringify({ ...user, roleDefinition: data.user.roleDefinition, roleDefinitionId: data.user.roleDefinitionId }));
          window.location.reload();
        }
      });
      socket.on('inbox:updated', (data) => handleRealtimeUpdate('inbox:updated', data));

      return () => {
        socket.disconnect();
      };
    }
  }, []);
  return (
    <Router>
      <Toaster
        position="bottom-center"
        gutter={12}
        containerStyle={{ bottom: 32 }}
        toastOptions={{
          duration: 4000,
          style: {
            background: '#ffffff',
            color: '#1e293b',
            border: '1px solid #e2e8f0',
            borderRadius: '14px',
            padding: '14px 20px',
            fontSize: '14px',
            fontWeight: '500',
            boxShadow: '0 4px 24px rgba(0, 0, 0, 0.08), 0 1px 4px rgba(0,0,0,0.06)',
            maxWidth: '420px',
            lineHeight: '1.5',
          },
          success: {
            duration: 3500,
            iconTheme: {
              primary: '#16a34a',
              secondary: '#f0fdf4',
            },
            style: {
              background: '#f0fdf4',
              color: '#166534',
              border: '1px solid #bbf7d0',
              borderRadius: '14px',
              padding: '14px 20px',
              fontSize: '14px',
              fontWeight: '500',
              boxShadow: '0 4px 24px rgba(0, 0, 0, 0.06)',
              maxWidth: '420px',
            },
          },
          error: {
            duration: 5000,
            iconTheme: {
              primary: '#e11d48',
              secondary: '#fff1f2',
            },
            style: {
              background: '#fff1f2',
              color: '#9f1239',
              border: '1px solid #fecdd3',
              borderRadius: '14px',
              padding: '14px 20px',
              fontSize: '14px',
              fontWeight: '500',
              boxShadow: '0 4px 24px rgba(0, 0, 0, 0.06)',
              maxWidth: '420px',
            },
          },
        }}
      />
      <div className="min-h-screen bg-bg-base text-text-primary font-sans mesh-bg">
        <Suspense fallback={<AppLoader />}>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<Landing />} />
          <Route path="/careers/:tenantId" element={<Careers />} />
          <Route path="/signup" element={<UniversalAuth defaultIsSignUp={true} />} />
          <Route path="/login" element={<UniversalAuth defaultIsSignUp={false} />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/set-password" element={<SetPasswordFromInvite />} />
          <Route path="/change-password" element={<ChangePassword />} />
          <Route path="/auth-receiver" element={<AuthReceiver />} />

          {/* Onboarding wizard — protected but exempt from onboarding redirect */}
          <Route
            path="/onboarding"
            element={
              <ProtectedRoute>
                <OnboardingWizard />
              </ProtectedRoute>
            }
          />

          {/* Protected routes */}
          <Route
            path="/superadmin/*"
            element={
              <ProtectedRoute allowedRoles={['SuperAdmin']}>
                <SuperAdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/face-registration"
            element={
              <ProtectedRoute>
                <FaceRegistration />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/*"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </Suspense>
      </div>
    </Router>
  );
}

export default App;

