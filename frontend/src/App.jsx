import React, { useEffect, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';
import { io } from 'socket.io-client';
import IrisAlert from './components/IrisAlert';

// ── Global Alert Override ───────
if (typeof window !== 'undefined') {
  window.alert = (message) => {
    const text = String(message).toLowerCase();
    if (text.includes('error') || text.includes('fail') || text.includes('invalid') || text.includes('warning')) {
      toast.error(message);
    } else {
      toast.success(message);
    }
  };

  window.confirmDialog = (message) => {
    return new Promise((resolve) => {
      window.dispatchEvent(new CustomEvent('show-confirm', { detail: { message, resolve } }));
    });
  };
}

const GlobalConfirm = () => {
  const [dialog, setDialog] = React.useState(null);
  
  useEffect(() => {
    const handler = (e) => setDialog(e.detail);
    window.addEventListener('show-confirm', handler);
    return () => window.removeEventListener('show-confirm', handler);
  }, []);

  if (!dialog) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => { dialog.resolve(false); setDialog(null); }} />
      <div className="bg-white border border-slate-200 shadow-2xl rounded-2xl p-6 max-w-sm w-full relative z-10 flex flex-col text-center">
        <div className="w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center border border-rose-100 mb-4 mx-auto">
          <svg className="w-6 h-6 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h3 className="text-lg font-bold text-slate-900 font-display mb-2">Confirm Action</h3>
        <p className="text-sm text-slate-600 mb-6">{dialog.message}</p>
        <div className="flex items-center gap-3 w-full">
          <button onClick={() => { dialog.resolve(false); setDialog(null); }} className="flex-1 px-4 py-2.5 rounded-xl border-2 border-slate-200 text-slate-700 font-bold text-sm hover:bg-slate-50 transition-colors">
            Cancel
          </button>
          <button onClick={() => { dialog.resolve(true); setDialog(null); }} className="flex-1 px-4 py-2.5 rounded-xl bg-rose-600 text-white font-bold text-sm hover:bg-rose-700 transition-colors">
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};

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
      <IrisAlert />
      <GlobalConfirm />
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
          <Route path="/careers/*" element={<Careers />} />
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

