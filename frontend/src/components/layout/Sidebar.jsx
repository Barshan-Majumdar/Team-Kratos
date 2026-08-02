import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Users, CalendarDays, Wallet, UserPlus, UserCheck, Clock, ShieldCheck, 
  Mail, Bell, Settings, LogOut, User, LayoutDashboard, FileText, 
  UploadCloud, Terminal, Network, LifeBuoy, CreditCard, Target, 
  Megaphone, HeartHandshake, BarChart3, Briefcase, Laptop, 
  FolderKanban, Activity, TrendingUp, IndianRupee, ChevronLeft, ChevronRight 
} from 'lucide-react';
import { Avatar } from '../ui/Avatar';
import axios from 'axios';
import { hasPermission } from '../../lib/permissions';

const Sidebar = ({ user, onCloseMobile }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const roleLevel  = user?.roleDefinition?.level ?? 99;
  const isOwner    = roleLevel === 0;
  
  // Fine-grained permission flags — all driven purely by hasPermission()
  const canViewReports    = hasPermission(user, 'view_reports');
  const canApproveLeaves  = hasPermission(user, 'approve_leaves');
  const canManageOrg      = hasPermission(user, 'manage_organization');
  const canEditEmployees  = hasPermission(user, 'edit_all_employees');
  const canViewEmployees  = hasPermission(user, 'view_all_employees');
  const canRecruit        = hasPermission(user, 'manage_recruitment');
  const canPayroll        = hasPermission(user, 'generate_payroll');
  const canManageShifts   = hasPermission(user, 'manage_shifts');
  const canManageExpenses = hasPermission(user, 'manage_expenses');
  const canManagePerf     = hasPermission(user, 'manage_performance');
  const canManageBenefits = hasPermission(user, 'manage_benefits');
  const canManageHelpdesk = hasPermission(user, 'manage_helpdesk');
  const canApproveAdv     = hasPermission(user, 'approve_advances');


  const nameParts = (user?.displayName || 'User').trim().split(/\s+/);
  const initials = nameParts.length >= 2 
    ? `${nameParts[0][0].toUpperCase()}.${nameParts[nameParts.length - 1][0].toUpperCase()}`
    : nameParts[0].substring(0, 2).toUpperCase();

  const [inboxCount, setInboxCount] = useState(0);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const fetchInboxCount = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/inbox`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setInboxCount(res.data.length);
    } catch (err) {
      console.error('Failed to fetch inbox count', err);
    }
  };

  useEffect(() => {
    fetchInboxCount();
    
    const handleUpdate = (e) => {
      if (['inbox:updated', 'leave:requested'].includes(e.detail?.eventName)) {
        fetchInboxCount();
      }
    };
    window.addEventListener('app-realtime-update', handleUpdate);
    return () => window.removeEventListener('app-realtime-update', handleUpdate);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
  };

  const handleLinkClick = () => {
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  const getLinkClass = (path) => {
    const isActive = location.pathname === path;
    if (isCollapsed) {
      return `flex items-center justify-center w-11 h-11 rounded-full my-1 mx-auto transition-all text-sm font-semibold relative ${
        isActive
          ? 'bg-white/[0.16] border border-white/25 shadow-sm scale-105 [&_svg]:text-[#38BDF8]'
          : 'text-slate-300/70 bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 hover:text-white hover:scale-105 [&_svg]:text-slate-300/70 hover:[&_svg]:text-white'
      }`;
    }
    return `flex items-center gap-3 px-3.5 py-2.5 mb-1 rounded-full transition-all text-[15.5px] font-bold relative ${
      isActive
        ? 'bg-white/[0.14] text-white border border-white/15 shadow-sm scale-[1.01] [&_svg]:text-[#38BDF8]'
        : 'text-slate-300/80 hover:bg-white/10 hover:text-white [&_svg]:text-slate-300/80 hover:[&_svg]:text-white'
    }`;
  };

  return (
    <div className={`sidebar-ember ${isCollapsed ? 'collapsed p-1.5 py-4' : 'p-2'} flex flex-col h-full relative transition-all duration-300 ${
      isCollapsed ? 'w-full md:w-[64px]' : 'w-full md:w-[245px]'
    }`}>
      {/* Minimize / Expand Toggle Button Notch */}
      <button 
        onClick={() => setIsCollapsed(!isCollapsed)}
        className={`hidden md:flex absolute ${isCollapsed ? '-right-3 top-6' : '-right-3.5 top-10'} w-7 h-7 rounded-full bg-sb-pill-bg text-sb-pill-text items-center justify-center shadow-[0_0_12px_rgba(56,189,248,0.35)] hover:scale-110 transition-transform z-30 cursor-pointer border border-sky-300/50`}
        title={isCollapsed ? "Expand sidebar" : "Minimize sidebar"}
      >
        {isCollapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
      </button>

      {/* Company Logo area */}
      <div className={`flex items-center justify-center ${isCollapsed ? 'pt-2 pb-3 px-0' : 'pt-0 pb-4 px-4'} mb-0 w-full overflow-hidden`}>
        <img 
          src="/Crew.png" 
          alt="Crew HR Logo" 
          className={`h-auto object-contain brightness-0 invert opacity-90 transition-all ${
            isCollapsed ? 'w-7 h-7 object-cover object-left' : 'w-full'
          }`} 
        />
      </div>
      
      <nav className="flex flex-col gap-1 flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar px-1">
        <Link to="/dashboard" onClick={handleLinkClick} className={getLinkClass('/dashboard')} title={canViewEmployees ? "Employees" : "Dashboard"}>
          {canViewEmployees ? <Users size={18} className="shrink-0" /> : <LayoutDashboard size={18} className="shrink-0" />}
          {!isCollapsed && <span className="whitespace-nowrap">{canViewEmployees ? "Employees" : "Dashboard"}</span>}
        </Link>

        {canViewEmployees && (
          <Link to="/dashboard/inbox" onClick={handleLinkClick} className={getLinkClass('/dashboard/inbox')} title="Unified Inbox">
            <Bell size={18} className="shrink-0" />
            {!isCollapsed ? (
              <div className="flex items-center justify-between flex-1">
                <span className="whitespace-nowrap">Inbox</span>
                {inboxCount > 0 && (
                  <span className="bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {inboxCount}
                  </span>
                )}
              </div>
            ) : (
              inboxCount > 0 && (
                <span className="bg-red-600 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center absolute top-1 right-1">
                  {inboxCount}
                </span>
              )
            )}
          </Link>
        )}

        <Link to="/dashboard/attendance" onClick={handleLinkClick} className={getLinkClass('/dashboard/attendance')} title="Attendance">
          <Clock size={18} className="shrink-0" />
          {!isCollapsed && <span className="whitespace-nowrap">Attendance</span>}
        </Link>
        
        <Link to="/dashboard/org-chart" onClick={handleLinkClick} className={getLinkClass('/dashboard/org-chart')} title="Org Chart">
          <Network size={18} className="shrink-0" />
          {!isCollapsed && <span className="whitespace-nowrap truncate">Org Chart</span>}
        </Link>

        <Link to="/dashboard/time-off" onClick={handleLinkClick} className={getLinkClass('/dashboard/time-off')} title="Time Off">
          <CalendarDays size={18} className="shrink-0" />
          {!isCollapsed && <span className="whitespace-nowrap">Time Off</span>}
        </Link>

        <Link to="/dashboard/performance" onClick={handleLinkClick} className={getLinkClass('/dashboard/performance')} title="Performance">
          <Target size={18} className="shrink-0" />
          {!isCollapsed && <span className="whitespace-nowrap">Performance</span>}
        </Link>

        <Link to="/dashboard/engagement" onClick={handleLinkClick} className={getLinkClass('/dashboard/engagement')} title="Engagement">
          <Megaphone size={18} className="shrink-0" />
          {!isCollapsed && <span className="whitespace-nowrap">Engagement</span>}
        </Link>

        <Link to="/dashboard/shift-scheduling" onClick={handleLinkClick} className={getLinkClass('/dashboard/shift-scheduling')} title="Shift Rostering">
          <CalendarDays size={18} className="shrink-0" />
          {!isCollapsed && <span className="whitespace-nowrap">Shift Rostering</span>}
        </Link>

        <Link to="/dashboard/expenses" onClick={handleLinkClick} className={getLinkClass('/dashboard/expenses')} title="Expenses">
          <Wallet size={18} className="shrink-0" />
          {!isCollapsed && <span className="whitespace-nowrap">Expenses</span>}
        </Link>
        
        <Link to="/dashboard/salary-advance" onClick={handleLinkClick} className={getLinkClass('/dashboard/salary-advance')} title="Salary Advance">
          <IndianRupee size={18} className="shrink-0 text-emerald-400" />
          {!isCollapsed && <span className="whitespace-nowrap">Salary Advance</span>}
        </Link>
        
        <Link to="/dashboard/documents" onClick={handleLinkClick} className={getLinkClass('/dashboard/documents')} title="Documents">
          <FileText size={18} className="shrink-0" />
          {!isCollapsed && <span className="whitespace-nowrap">Documents</span>}
        </Link>
        
        <Link to="/dashboard/benefits" onClick={handleLinkClick} className={getLinkClass('/dashboard/benefits')} title="Benefits">
          <HeartHandshake size={18} className="shrink-0" />
          {!isCollapsed && <span className="whitespace-nowrap">Benefits</span>}
        </Link>
        
        {canViewReports && (
          <Link to="/dashboard/analytics" onClick={handleLinkClick} className={getLinkClass('/dashboard/analytics')} title="Analytics">
            <BarChart3 size={18} className="shrink-0" />
            {!isCollapsed && <span className="whitespace-nowrap">Analytics & Reports</span>}
          </Link>
        )}
        <Link to="/dashboard/timesheets" onClick={handleLinkClick} className={getLinkClass('/dashboard/timesheets')} title="Timesheets">
          <Clock size={18} className="shrink-0" />
          {!isCollapsed && <span className="whitespace-nowrap">Timesheets</span>}
        </Link>
        <Link to="/dashboard/1on1s" onClick={handleLinkClick} className={getLinkClass('/dashboard/1on1s')} title="1:1 Meetings">
          <Users size={18} className="shrink-0" />
          {!isCollapsed && <span className="whitespace-nowrap">1:1 Meetings</span>}
        </Link>
        <Link to="/dashboard/pulse" onClick={handleLinkClick} className={getLinkClass('/dashboard/pulse')} title="Pulse Surveys">
          <Activity size={18} className="shrink-0" />
          {!isCollapsed && <span className="whitespace-nowrap">Pulse Surveys</span>}
        </Link>
        
        <Link to="/dashboard/helpdesk" onClick={handleLinkClick} className={getLinkClass('/dashboard/helpdesk')} title="Helpdesk">
          <LifeBuoy size={18} className="shrink-0" />
          {!isCollapsed && <span className="whitespace-nowrap truncate">Helpdesk</span>}
        </Link>
        
        {canApproveLeaves && (
          <Link to="/dashboard/leave-approvals" onClick={handleLinkClick} className={getLinkClass('/dashboard/leave-approvals')} title="Leave Approvals">
            <CalendarDays size={18} className="shrink-0" />
            {!isCollapsed && <span className="whitespace-nowrap truncate">Leave Approvals</span>}
          </Link>
        )}

        {/* Fraud Alerts — needs to see employees */}
        {canViewEmployees && (
          <Link to="/dashboard/proxy-alerts" onClick={handleLinkClick} className={getLinkClass('/dashboard/proxy-alerts')} title="Fraud Alerts">
            <ShieldCheck size={18} className="shrink-0 text-red-400" />
            {!isCollapsed && <span className="whitespace-nowrap truncate">Fraud Alerts</span>}
          </Link>
        )}

        {canApproveLeaves && (
          <Link to="/dashboard/leave-settings" onClick={handleLinkClick} className={getLinkClass('/dashboard/leave-settings')} title="Leave Settings">
            <CalendarDays size={18} className="shrink-0" />
            {!isCollapsed && <span className="whitespace-nowrap truncate">Leave Settings</span>}
          </Link>
        )}

        {(canEditEmployees || canManageOrg || canRecruit) && (
          <>
            {!isCollapsed ? (
              <div className="mt-4 mb-2 px-2 whitespace-nowrap">
                <span className="text-[11.5px] font-bold text-[rgba(224,231,255,0.45)] uppercase tracking-wider">
                  Management
                </span>
              </div>
            ) : (
              <div className="my-2 border-t border-[rgba(224,231,255,0.1)] w-8 mx-auto" />
            )}
            {canEditEmployees && (
              <Link to="/dashboard/add-employee" onClick={handleLinkClick} className={getLinkClass('/dashboard/add-employee')} title="Add Employee">
                 <UserPlus size={18} className="shrink-0" />
                 {!isCollapsed && <span className="whitespace-nowrap truncate">Add Employee</span>}
              </Link>
            )}
            {canManageOrg && (
              <Link to="/dashboard/assets" onClick={handleLinkClick} className={getLinkClass('/dashboard/assets')} title="Asset Directory">
                 <Laptop size={18} className="shrink-0" />
                 {!isCollapsed && <span className="whitespace-nowrap truncate">Asset Directory</span>}
              </Link>
            )}
            {canManageOrg && (
              <Link to="/dashboard/projects" onClick={handleLinkClick} className={getLinkClass('/dashboard/projects')} title="Projects">
                 <FolderKanban size={18} className="shrink-0" />
                 {!isCollapsed && <span className="whitespace-nowrap truncate">Projects</span>}
              </Link>
            )}
            {canRecruit && (
              <Link to="/dashboard/recruitment" onClick={handleLinkClick} className={getLinkClass('/dashboard/recruitment')} title="Recruitment (ATS)">
                 <Briefcase size={18} className="shrink-0" />
                 {!isCollapsed && <span className="whitespace-nowrap truncate">Recruitment (ATS)</span>}
              </Link>
            )}
            {canEditEmployees && (
              <Link to="/dashboard/invite-employee" onClick={handleLinkClick} className={getLinkClass('/dashboard/invite-employee')} title="Invite Employees">
                 <Mail size={18} className="shrink-0" />
                 {!isCollapsed && <span className="whitespace-nowrap truncate">Invite Employees</span>}
              </Link>
            )}
            {canEditEmployees && (
              <Link to="/dashboard/onboarding-pipeline" onClick={handleLinkClick} className={getLinkClass('/dashboard/onboarding-pipeline')} title="Onboarding Pipeline">
                 <UserCheck size={18} className="shrink-0" />
                 {!isCollapsed && <span className="whitespace-nowrap truncate">Onboarding</span>}
              </Link>
            )}
          </>
        )}

        {/* Admin tools — gated by respective permissions */}
        {(canViewReports || canPayroll || canManageOrg || isOwner) && (
          <>
            {canViewReports && (
              <Link to="/dashboard/org-pulse" onClick={handleLinkClick} className={getLinkClass('/dashboard/org-pulse')} title="Org Pulse">
                <Activity size={18} className="shrink-0 text-sky-400" />
                {!isCollapsed && <span className="whitespace-nowrap truncate">Org Pulse</span>}
              </Link>
            )}
            {canPayroll && (
              <>
                <Link to="/dashboard/payroll" onClick={handleLinkClick} className={getLinkClass('/dashboard/payroll')} title="Payroll">
                  <Wallet size={18} className="shrink-0" />
                  {!isCollapsed && <span className="whitespace-nowrap truncate">Payroll</span>}
                </Link>
                <Link to="/dashboard/payroll-forecast" onClick={handleLinkClick} className={getLinkClass('/dashboard/payroll-forecast')} title="Payroll Forecast">
                  <TrendingUp size={18} className="shrink-0" />
                  {!isCollapsed && <span className="whitespace-nowrap truncate">Payroll Forecast</span>}
                </Link>
              </>
            )}
            {isOwner && (
              <Link to="/dashboard/manage-admins" onClick={handleLinkClick} className={getLinkClass('/dashboard/manage-admins')} title="Manage Admins">
                <ShieldCheck size={18} className="shrink-0" />
                {!isCollapsed && <span className="whitespace-nowrap truncate">Manage Admins</span>}
              </Link>
            )}
            {canManageOrg && (
              <Link to="/dashboard/data-import" onClick={handleLinkClick} className={getLinkClass('/dashboard/data-import')} title="Data Import">
                <UploadCloud size={18} className="shrink-0" />
                {!isCollapsed && <span className="whitespace-nowrap truncate">Bulk Import</span>}
              </Link>
            )}
            {canManageOrg && (
              <Link to="/dashboard/tenant-settings" onClick={handleLinkClick} className={getLinkClass('/dashboard/tenant-settings')} title="Org Settings">
                <Settings size={18} className="shrink-0" />
                {!isCollapsed && <span className="whitespace-nowrap truncate">Org Settings</span>}
              </Link>
            )}
            {isOwner && (
              <Link to="/dashboard/billing" onClick={handleLinkClick} className={getLinkClass('/dashboard/billing')} title="Billing & Subscription">
                <CreditCard size={18} className="shrink-0" />
                {!isCollapsed && <span className="whitespace-nowrap truncate">Billing</span>}
              </Link>
            )}
            {isOwner && (
              <Link to="/dashboard/developer" onClick={handleLinkClick} className={getLinkClass('/dashboard/developer')} title="Developer API">
                <Terminal size={18} className="shrink-0" />
                {!isCollapsed && <span className="whitespace-nowrap truncate">Developer API</span>}
              </Link>
            )}
            {canManageOrg && (
              <Link to="/dashboard/audit-logs" onClick={handleLinkClick} className={getLinkClass('/dashboard/audit-logs')} title="Audit Logs">
                <FileText size={18} className="shrink-0" />
                {!isCollapsed && <span className="whitespace-nowrap truncate">Audit Logs</span>}
              </Link>
            )}
          </>
        )}
      </nav>

      {/* Bottom Profile Info */}
      <div className={`mt-auto pt-3 pb-1 ${isCollapsed ? 'px-0 flex-col items-center gap-2' : 'px-4 -mx-2 flex items-center justify-between gap-2'} overflow-hidden`}>
        <Link 
          to="/dashboard/my-profile" 
          onClick={handleLinkClick}
          className={isCollapsed ? "flex items-center justify-center my-1" : "flex items-center gap-3 hover:bg-sb-hover-bg p-2 rounded-xl transition-colors min-w-0 flex-1"}
          title={user?.displayName || 'My Profile'}
        >
          <Avatar size={isCollapsed ? "md" : "lg"} src={user?.avatar} initials={initials} className="bg-sb-pill-bg text-sb-pill-text font-bold shrink-0 shadow-sm" />
          {!isCollapsed && (
            <div className="flex flex-col min-w-0">
              <span className="text-[17px] font-bold text-sky-100 truncate">{initials}</span>
              <span className="text-[14.5px] text-[rgba(224,231,255,0.6)] truncate font-medium">{user?.jobPosition || user?.roleDefinition?.name || user?.role || 'Employee'}</span>
            </div>
          )}
        </Link>
        
        <button 
          onClick={handleLogout}
          className={isCollapsed 
            ? "w-11 h-11 rounded-full bg-red-500/10 text-red-400 border border-red-500/30 flex items-center justify-center hover:bg-red-600 hover:text-white transition-all shadow-sm my-1"
            : "text-[rgba(245,235,220,0.5)] hover:text-red-400 hover:bg-red-500/10 p-2 rounded-lg transition-colors shrink-0"
          }
          title="Log Out"
        >
          <LogOut size={isCollapsed ? 18 : 24} />
        </button>
      </div>
    </div>
  );
};

export default Sidebar;

