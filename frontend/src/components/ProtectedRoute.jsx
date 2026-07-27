import React from 'react';
import { Navigate } from 'react-router-dom';

/**
 * ProtectedRoute wrapper.
 *
 * Role Level System (matches backend RoleDefinition.level):
 *   Level 0  = Owner / Chairman (full access — auto-assigned on company registration)
 *   Level 1  = HR Admin (console access)
 *   Level 2  = Manager
 *   Level 3+ = Employee
 *
 * Props:
 *   allowedRoles  {string[]}  — Match on roleDefinition.name (used for SuperAdmin only)
 *   maxLevel      {number}    — Allow users whose level <= maxLevel (e.g. maxLevel=1 → L0+L1)
 *
 * Behaviour:
 *   - No token / no user in localStorage        → /login
 *   - user.mustChangePassword                   → /change-password
 *   - allowedRoles provided and name not in list → /dashboard
 *   - maxLevel provided and user level > maxLevel → /dashboard
 *   - Otherwise render children
 */
const ProtectedRoute = ({ children, allowedRoles = [], maxLevel }) => {
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

  const level = user.roleDefinition?.level ?? 99;
  const roleName = user.roleDefinition?.name;

  // Role-name gate — used for the platform SuperAdmin who has no tenant
  if (allowedRoles.length > 0 && !allowedRoles.includes(roleName)) {
    return <Navigate to="/dashboard" replace />;
  }

  // Level-based gate — maxLevel=1 allows L0 and L1 only
  if (maxLevel !== undefined && level > maxLevel) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export default ProtectedRoute;
