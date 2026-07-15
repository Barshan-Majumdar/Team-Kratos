import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Landing from './pages/Landing';
import UniversalAuth from './pages/UniversalAuth';
import ChangePassword from './pages/ChangePassword';
import Dashboard from './pages/Dashboard';
import AuthReceiver from './pages/AuthReceiver';
import ProtectedRoute from './components/ProtectedRoute';
import SuperAdminDashboard from './pages/superadmin/SuperAdminDashboard';

function App() {
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
          <Route path="/change-password" element={<ChangePassword />} />
          <Route path="/auth-receiver" element={<AuthReceiver />} />

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

