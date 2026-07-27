import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

/**
 * ProtectedRoute wrapper.
 * - If no token in localStorage → redirect to /login
 * - If user.mustChangePassword → redirect to /change-password
 * - If !user.onboardingCompleted (and not on /onboarding) → redirect to /onboarding
 * - If user.onboardingCompleted and on /onboarding → redirect to /dashboard
 * - If adminOnly and user.role !== 'Admin' → redirect to /dashboard
 * - Otherwise render children
 */
const ProtectedRoute = ({ children, adminOnly = false, allowedRoles = [] }) => {
  const token = localStorage.getItem('token');
  const userStr = localStorage.getItem('user');
  const location = useLocation();

  if (!token || !userStr) {
    return <Navigate to="/login" replace />;
  }

  let user;
  try {
    user = JSON.parse(userStr);
  } catch {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    return <Navigate to="/login" replace />;
  }

  if (user.mustChangePassword) {
    return <Navigate to="/change-password" replace />;
  }

  // Onboarding gate — incomplete employees must complete wizard before accessing any other protected route.
  // Path exemption prevents infinite redirect loop when already on /onboarding.
  if (user.onboardingCompleted === false && user.roleDefinition?.name !== 'SuperAdmin' && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }
  // Completed users shouldn't revisit the wizard
  if (user.onboardingCompleted && location.pathname === '/onboarding') {
    return <Navigate to="/dashboard" replace />;
  }

  if (adminOnly && user.role !== 'Admin' && user.role !== 'SuperAdmin') {
    return <Navigate to="/dashboard" replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export default ProtectedRoute;

