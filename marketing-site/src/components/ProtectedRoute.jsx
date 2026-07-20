import React from 'react';
import { Navigate } from 'react-router-dom';
import { getSession } from '@crew/auth-client';

export default function ProtectedRoute({ children }) {
  const { token, user } = getSession();

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  const roleLevel = user.roleDefinition?.level ?? 99;
  if (roleLevel > 1) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
