import React, { useState, useEffect, Suspense, lazy } from 'react';
import { hasPermission } from '../lib/permissions';
import { Routes, Route, Link, useNavigate, Navigate } from 'react-router-dom';
import { Users, Plus, Cpu, FileText, FlaskConical } from 'lucide-react';

// ── Lazy-loaded page imports (code-splitting) ───────
const CreateEmployee = lazy(() => import('./admin/CreateEmployee'));
const ManageAdmins = lazy(() => import('./admin/ManageAdmins'));
const LeaveApprovals = lazy(() => import('./admin/LeaveApprovals'));
const LeaveSettings = lazy(() => import('./admin/LeaveSettings'));
const AuditLogs = lazy(() => import('./admin/AuditLogs'));
const OnboardingPipeline = lazy(() => import('./admin/OnboardingPipeline'));
const ProxyAlerts = lazy(() => import('./admin/ProxyAlerts'));
const TenantSettings = lazy(() => import('./admin/TenantSettings'));
const DeveloperSettings = lazy(() => import('./admin/DeveloperSettings'));
const DataImport = lazy(() => import('./admin/DataImport'));
const PerformanceDashboard = lazy(() => import('./performance/PerformanceDashboard'));
const EngagementHub = lazy(() => import('./EngagementHub'));
const ShiftScheduling = lazy(() => import('./admin/ShiftRostering'));
const ExpenseManagement = lazy(() => import('./ExpenseManagement'));
const DocumentGenerator = lazy(() => import('./DocumentGenerator'));
const BenefitsAdministration = lazy(() => import('./BenefitsAdministration'));
const WorkforceAnalytics = lazy(() => import('./WorkforceAnalytics'));
const OrgChart = lazy(() => import('./OrgChart'));
const Helpdesk = lazy(() => import('./Helpdesk'));
const MyProfile = lazy(() => import('./MyProfile').then(m => ({ default: m.MyProfile })));
const Inbox = lazy(() => import('./admin/Inbox'));
const InviteEmployee = lazy(() => import('./admin/InviteEmployee'));
const OrgPulseDashboard = lazy(() => import('./admin/OrgPulseDashboard'));
const PayrollForecastSimulator = lazy(() => import('./admin/PayrollForecastSimulator'));
const EmployeeDetails = lazy(() => import('./admin/EmployeeDetails'));
const Attendance = lazy(() => import('./Attendance'));
const TimeOff = lazy(() => import('./TimeOff'));
const Payroll = lazy(() => import('./Payroll'));
const SalaryAdvance = lazy(() => import('./SalaryAdvance'));
const EmployeeDashboard = lazy(() => import('./EmployeeDashboard'));
const Billing = lazy(() => import('./admin/Billing'));
const RecruitmentATS = lazy(() => import('./admin/RecruitmentATS'));
const AssetDirectory = lazy(() => import('./admin/AssetDirectory'));
const ProjectsDashboard = lazy(() => import('./admin/ProjectsDashboard'));
const EmployeeDirectory = lazy(() => import('./admin/EmployeeDirectory'));
const Timesheet = lazy(() => import('./Timesheet'));
const OneOnOnes = lazy(() => import('./OneOnOnes'));
const PulseSurveys = lazy(() => import('./PulseSurveys'));
const AIChatbot = lazy(() => import('./AIChatbot'));

import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { SegmentedControl } from '../components/ui/SegmentedControl';
import ShellLayout from '../components/layout/ShellLayout';

// ── Page Loading Fallback ───────
const PageLoader = () => (
  <div className="flex items-center justify-center h-full min-h-[50vh]">
    <div className="flex flex-col items-center gap-3">
      <div className="w-8 h-8 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
      <p className="text-sm text-slate-400 font-medium">Loading...</p>
    </div>
  </div>
);
// ── Employee Directory (Extracted to ./admin/EmployeeDirectory) ───────

// PermissionRoute: receives live `user` state from Dashboard so it's never stale
const PermissionRoute = ({ children, permission, user }) => {
  if (!permission) return children;
  if (!hasPermission(user, permission)) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
};

// ── Internal Route Guard ──────────────────────────────────────────────────────
// Reads roleDefinition.level from localStorage and redirects to /dashboard
// if the user's level exceeds maxLevel. Frontend defence-in-depth \u2014 the backend
// API is still the primary gate for all sensitive operations.
const InternalRoute = ({ children, maxLevel = 1 }) => {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const level = user?.roleDefinition?.level ?? 99;
  if (level > maxLevel) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
};

const Dashboard = () => {
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user') || '{}'));

  useEffect(() => {
    const fetchMe = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        const res = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/auth/me`, {
          headers: { 'Authorization': `Bearer ${token}` },
          cache: 'no-store'
        });
        if (res.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.location.href = '/login';
          return;
        }
        if (res.ok) {
          const fetchedUser = await res.json();
          localStorage.setItem('user', JSON.stringify(fetchedUser));
          setUser(fetchedUser);
          // Notify other components (e.g. anything listening for permission changes)
          window.dispatchEvent(new CustomEvent('user-permissions-updated', { detail: fetchedUser }));
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchMe();

    // Re-fetch when the backend emits a permissions_updated event via WebSocket
    const handlePermUpdate = () => fetchMe();
    window.addEventListener('app-realtime-update', handlePermUpdate);
    return () => window.removeEventListener('app-realtime-update', handlePermUpdate);
  }, []);

  return (
    <ShellLayout user={user}>
      <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/" element={<EmployeeDirectory user={user} />} />
        <Route path="/employee/:id" element={<EmployeeDetails user={user} />} />
        <Route path="/attendance" element={<Attendance user={user} />} />
        <Route path="/time-off" element={<TimeOff user={user} />} />
        <Route path="/payroll" element={<Payroll user={user} />} />
        <Route path="/salary-advance" element={<SalaryAdvance user={user} />} />

        {/* Permission-guarded routes */}
        <Route path="/add-employee" element={<PermissionRoute user={user} permission="edit_all_employees"><div className="p-4 md:p-8 lg:p-12"><CreateEmployee /></div></PermissionRoute>} />
        <Route path="/invite-employee" element={<PermissionRoute user={user} permission="edit_all_employees"><div className="p-4 md:p-8 lg:p-12"><InviteEmployee /></div></PermissionRoute>} />
        <Route path="/leave-approvals" element={<PermissionRoute user={user} permission="approve_leaves"><LeaveApprovals /></PermissionRoute>} />
        <Route path="/leave-settings" element={<PermissionRoute user={user} permission="approve_leaves"><LeaveSettings /></PermissionRoute>} />
        <Route path="/assets" element={<PermissionRoute user={user} permission="manage_helpdesk"><AssetDirectory /></PermissionRoute>} />
        <Route path="/projects" element={<PermissionRoute user={user} permission="manage_organization"><ProjectsDashboard /></PermissionRoute>} />
        <Route path="/recruitment" element={<PermissionRoute user={user} permission="manage_recruitment"><RecruitmentATS /></PermissionRoute>} />
        <Route path="/audit-logs" element={<PermissionRoute user={user} permission="manage_organization"><AuditLogs /></PermissionRoute>} />
        <Route path="/tenant-settings" element={<PermissionRoute user={user} permission="manage_organization"><TenantSettings /></PermissionRoute>} />
        <Route path="/data-import" element={<PermissionRoute user={user} permission="manage_organization"><DataImport /></PermissionRoute>} />
        <Route path="/onboarding-pipeline" element={<PermissionRoute user={user} permission="manage_organization"><OnboardingPipeline /></PermissionRoute>} />
        <Route path="/manage-admins" element={<InternalRoute maxLevel={1}><ManageAdmins /></InternalRoute>} />
        <Route path="/billing" element={<InternalRoute maxLevel={1}><Billing /></InternalRoute>} />
        {/* Open to all authenticated users */}
        <Route path="/inbox" element={<Inbox />} />
        <Route path="/org-chart" element={<OrgChart />} />
        <Route path="/helpdesk" element={<Helpdesk user={user} />} />
        <Route path="/performance/*" element={<PerformanceDashboard user={user} />} />
        <Route path="/engagement/*" element={<EngagementHub user={user} />} />
        <Route path="/shift-scheduling" element={<ShiftScheduling user={user} />} />
        <Route path="/expenses/*" element={<ExpenseManagement user={user} />} />
        <Route path="/documents/*" element={<DocumentGenerator user={user} />} />
        <Route path="/documents" element={<DocumentGenerator user={user} />} />
        <Route path="/benefits/*" element={<BenefitsAdministration user={user} />} />
        <Route path="/benefits" element={<BenefitsAdministration user={user} />} />
        <Route path="/proxy-alerts" element={<ProxyAlerts user={user} />} />
        <Route path="/my-profile" element={<MyProfile />} />
        <Route path="/timesheets" element={<Timesheet user={user} />} />
        <Route path="/1on1s" element={<OneOnOnes user={user} />} />
        <Route path="/pulse" element={<PulseSurveys user={user} />} />
        <Route path="/org-pulse" element={
          user?.roleDefinition?.level <= 1
            ? <OrgPulseDashboard user={user} />
            : <Navigate to="/dashboard" />
        } />
        <Route path="/payroll-forecast" element={
          user?.roleDefinition?.level <= 1
            ? <PayrollForecastSimulator user={user} />
            : <Navigate to="/dashboard" />
        } />
        <Route path="/ai-chatbot" element={
          user?.roleDefinition?.level <= 1
            ? <AIChatbot user={user} />
            : <Navigate to="/dashboard" />
        } />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
      </Suspense>
    </ShellLayout>
  );
};

export default Dashboard;

