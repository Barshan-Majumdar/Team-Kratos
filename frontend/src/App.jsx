import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Landing from './pages/Landing';
import UniversalAuth from './pages/UniversalAuth';
import ChangePassword from './pages/ChangePassword';
import Dashboard from './pages/Dashboard';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-bg-base text-text-primary font-sans mesh-bg">
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<Landing />} />
          <Route path="/signup" element={<UniversalAuth defaultIsSignUp={true} />} />
          <Route path="/login" element={<UniversalAuth defaultIsSignUp={false} />} />
          <Route path="/change-password" element={<ChangePassword />} />

          {/* Protected routes */}
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

