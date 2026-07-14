import React from 'react';
import { Navigate } from 'react-router-dom';

/**
 * ProtectedRoute wrapper.
 * - If no token in localStorage → redirect to /login
 * - If user.mustChangePassword → redirect to /change-password
 * - If adminOnly and user.role !== 'Admin' → redirect to /dashboard
 * - Otherwise render children
 */
const ProtectedRoute = ({ children, adminOnly = false }) => {
  const token = localStorage.getItem('token');
  const userStr = localStorage.getItem('user');

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

  if (adminOnly && user.role !== 'Admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export default ProtectedRoute;

