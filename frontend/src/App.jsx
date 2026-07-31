import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { io } from 'socket.io-client';
import Landing from './pages/Landing';
import UniversalAuth from './pages/UniversalAuth';
import ChangePassword from './pages/ChangePassword';
import ForgotPassword from './pages/ForgotPassword';
import Dashboard from './pages/Dashboard';
import FaceRegistration from './pages/FaceRegistration';
import AuthReceiver from './pages/AuthReceiver';
import OnboardingWizard from './pages/onboarding/OnboardingWizard';
import ProtectedRoute from './components/ProtectedRoute';
import SuperAdminDashboard from './pages/superadmin/SuperAdminDashboard';

import SetPasswordFromInvite from './pages/SetPasswordFromInvite';

function App() {
  useEffect(() => {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    if (token && userStr) {
      const user = JSON.parse(userStr);
      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const socket = io(API_BASE, { transports: ['websocket', 'polling'] });
      
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
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<Landing />} />
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
      </div>
    </Router>
  );
}

export default App;

