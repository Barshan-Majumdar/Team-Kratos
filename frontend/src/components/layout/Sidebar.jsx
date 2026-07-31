import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Users, CalendarDays, Wallet, UserPlus, UserCheck, Clock, ShieldCheck, 
  Mail, Bell, Settings, LogOut, User, LayoutDashboard, FileText, 
  UploadCloud, Terminal, Network, LifeBuoy, CreditCard, Target, 
  Megaphone, HeartHandshake, BarChart3, Briefcase, Laptop, 
  FolderKanban, Activity, TrendingUp, IndianRupee 
} from 'lucide-react';
import { Avatar } from '../ui/Avatar';
import axios from 'axios';

const Sidebar = ({ user, onCloseMobile }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const roleLevel  = user?.roleDefinition?.level ?? 99;
  const isOwner    = roleLevel === 0;      // Chairman / Level 0 — full access
  const isAdmin    = roleLevel <= 1;       // L0 + L1 (HR Admin) — console access
  const canManage  = roleLevel <= 2;       // L0, L1, L2 (Manager) — management actions

  const nameParts = (user?.displayName || 'User').trim().split(/\s+/);
  const initials = nameParts.length >= 2 
    ? `${nameParts[0][0].toUpperCase()}.${nameParts[nameParts.length - 1][0].toUpperCase()}`
    : nameParts[0].substring(0, 2).toUpperCase();

  const [inboxCount, setInboxCount] = useState(0);

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
    return `flex items-center gap-3 px-3 py-2.5 mb-1 rounded-xl transition-all text-sm font-semibold ${
      isActive
        ? 'bg-white text-accent-primary shadow-sm scale-[1.02]'
        : 'text-text-secondary hover:bg-white/50 hover:text-text-primary'
    }`;
  };

  return (
    <div className="flex flex-col h-full bg-transparent p-2 w-full md:w-[220px] relative">
      {/* Company Logo area */}
      <div className="flex items-center justify-center pt-0 pb-4 px-4 mb-0 w-full">
        <img src="/Crew.png" alt="Crew HR Logo" className="w-full h-auto object-contain drop-shadow-sm" />
      </div>
      
      <nav className="flex flex-col gap-1 flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar px-1">
        <Link to="/dashboard" onClick={handleLinkClick} className={getLinkClass('/dashboard')} title={isAdmin ? "Employees" : "Dashboard"}>
          {isAdmin ? <Users size={18} className="shrink-0" /> : <LayoutDashboard size={18} className="shrink-0" />}
          <span className="whitespace-nowrap">{isAdmin ? "Employees" : "Dashboard"}</span>
        </Link>

        {isAdmin && (
          <Link to="/dashboard/inbox" onClick={handleLinkClick} className={getLinkClass('/dashboard/inbox')} title="Unified Inbox">
            <Bell size={18} className="shrink-0" />
            <div className="flex items-center justify-between flex-1">
              <span className="whitespace-nowrap">Inbox</span>
              {inboxCount > 0 && (
                <span className="bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {inboxCount}
                </span>
              )}
            </div>
          </Link>
        )}

        <Link to="/dashboard/attendance" onClick={handleLinkClick} className={getLinkClass('/dashboard/attendance')} title="Attendance">
          <Clock size={18} className="shrink-0" />
          <span className="whitespace-nowrap">Attendance</span>
        </Link>
        
        <Link to="/dashboard/org-chart" onClick={handleLinkClick} className={getLinkClass('/dashboard/org-chart')} title="Org Chart">
          <Network size={18} className="shrink-0" />
          <span className="whitespace-nowrap truncate">Org Chart</span>
        </Link>

        <Link to="/dashboard/time-off" onClick={handleLinkClick} className={getLinkClass('/dashboard/time-off')} title="Time Off">
          <CalendarDays size={18} className="shrink-0" />
          <span className="whitespace-nowrap">Time Off</span>
        </Link>

        <Link to="/dashboard/performance" onClick={handleLinkClick} className={getLinkClass('/dashboard/performance')} title="Performance">
          <Target size={18} className="shrink-0" />
          <span className="whitespace-nowrap">Performance</span>
        </Link>

        <Link to="/dashboard/engagement" onClick={handleLinkClick} className={getLinkClass('/dashboard/engagement')} title="Engagement">
          <Megaphone size={18} className="shrink-0" />
          <span className="whitespace-nowrap">Engagement</span>
        </Link>

        <Link to="/dashboard/shift-scheduling" onClick={handleLinkClick} className={getLinkClass('/dashboard/shift-scheduling')} title="Shift Rostering">
          <CalendarDays size={18} className="shrink-0" />
          <span className="whitespace-nowrap">Shift Rostering</span>
        </Link>

        <Link to="/dashboard/expenses" onClick={handleLinkClick} className={getLinkClass('/dashboard/expenses')} title="Expenses">
          <Wallet size={18} className="shrink-0" />
          <span className="whitespace-nowrap">Expenses</span>
        </Link>
        
        <Link to="/dashboard/salary-advance" onClick={handleLinkClick} className={getLinkClass('/dashboard/salary-advance')} title="Salary Advance">
          <IndianRupee size={18} className="shrink-0 text-emerald-500" />
          <span className="whitespace-nowrap">Salary Advance</span>
        </Link>
        
        <Link to="/dashboard/documents" onClick={handleLinkClick} className={getLinkClass('/dashboard/documents')} title="Documents">
          <FileText size={18} className="shrink-0" />
          <span className="whitespace-nowrap">Documents</span>
        </Link>
        
        <Link to="/dashboard/benefits" onClick={handleLinkClick} className={getLinkClass('/dashboard/benefits')} title="Benefits">
          <HeartHandshake size={18} className="shrink-0" />
          <span className="whitespace-nowrap">Benefits</span>
        </Link>
        
        {(isAdmin || user?.roleDefinition?.level <= 2 || user?.role === 'Manager') && (
          <Link to="/dashboard/analytics" onClick={handleLinkClick} className={getLinkClass('/dashboard/analytics')} title="Analytics">
            <BarChart3 size={18} className="shrink-0" />
            <span className="whitespace-nowrap">Analytics & Reports</span>
          </Link>
        )}
        <Link to="/dashboard/timesheets" onClick={handleLinkClick} className={getLinkClass('/dashboard/timesheets')} title="Timesheets">
          <Clock size={18} className="shrink-0" />
          <span className="whitespace-nowrap">Timesheets</span>
        </Link>
        <Link to="/dashboard/1on1s" onClick={handleLinkClick} className={getLinkClass('/dashboard/1on1s')} title="1:1 Meetings">
          <Users size={18} className="shrink-0" />
          <span className="whitespace-nowrap">1:1 Meetings</span>
        </Link>
        <Link to="/dashboard/pulse" onClick={handleLinkClick} className={getLinkClass('/dashboard/pulse')} title="Pulse Surveys">
          <Activity size={18} className="shrink-0" />
          <span className="whitespace-nowrap">Pulse Surveys</span>
        </Link>
        
        <Link to="/dashboard/helpdesk" onClick={handleLinkClick} className={getLinkClass('/dashboard/helpdesk')} title="Helpdesk">
          <LifeBuoy size={18} className="shrink-0" />
          <span className="whitespace-nowrap truncate">Helpdesk</span>
        </Link>
        
        {(canManage || user?.role === 'Manager') && (
          <>
            <Link to="/dashboard/leave-approvals" onClick={handleLinkClick} className={getLinkClass('/dashboard/leave-approvals')} title="Leave Approvals">
              <CalendarDays size={18} className="shrink-0" />
              <span className="whitespace-nowrap truncate">Leave Approvals</span>
            </Link>
            <Link to="/dashboard/proxy-alerts" onClick={handleLinkClick} className={getLinkClass('/dashboard/proxy-alerts')} title="Fraud Alerts">
              <ShieldCheck size={18} className="shrink-0 text-red-500" />
              <span className="whitespace-nowrap truncate">Fraud Alerts</span>
            </Link>
          </>
        )}

        {isAdmin && (
          <Link to="/dashboard/leave-settings" onClick={handleLinkClick} className={getLinkClass('/dashboard/leave-settings')} title="Leave Settings">
            <CalendarDays size={18} className="shrink-0" />
            <span className="whitespace-nowrap truncate">Leave Settings</span>
          </Link>
        )}

        {canManage && (
          <>
            <div className="mt-4 mb-2 px-2 whitespace-nowrap">
              <span className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider">
                Management
              </span>
            </div>
            <Link to="/dashboard/add-employee" onClick={handleLinkClick} className={getLinkClass('/dashboard/add-employee')} title="Add Employee">
               <UserPlus size={18} className="shrink-0" />
               <span className="whitespace-nowrap truncate">Add Employee</span>
            </Link>
            <Link to="/dashboard/assets" onClick={handleLinkClick} className={getLinkClass('/dashboard/assets')} title="Asset Directory">
               <Laptop size={18} className="shrink-0" />
               <span className="whitespace-nowrap truncate">Asset Directory</span>
            </Link>
            <Link to="/dashboard/projects" onClick={handleLinkClick} className={getLinkClass('/dashboard/projects')} title="Projects">
               <FolderKanban size={18} className="shrink-0" />
               <span className="whitespace-nowrap truncate">Projects</span>
            </Link>
            <Link to="/dashboard/recruitment" onClick={handleLinkClick} className={getLinkClass('/dashboard/recruitment')} title="Recruitment (ATS)">
               <Briefcase size={18} className="shrink-0" />
               <span className="whitespace-nowrap truncate">Recruitment (ATS)</span>
            </Link>
            <Link to="/dashboard/invite-employee" onClick={handleLinkClick} className={getLinkClass('/dashboard/invite-employee')} title="Invite Employees">
               <Mail size={18} className="shrink-0" />
               <span className="whitespace-nowrap truncate">Invite Employees</span>
            </Link>
            <Link to="/dashboard/onboarding-pipeline" onClick={handleLinkClick} className={getLinkClass('/dashboard/onboarding-pipeline')} title="Onboarding Pipeline">
               <UserCheck size={18} className="shrink-0" />
               <span className="whitespace-nowrap truncate">Onboarding</span>
            </Link>
          </>
        )}

        {isAdmin && (
          <>
            <Link to="/dashboard/org-pulse" onClick={handleLinkClick} className={getLinkClass('/dashboard/org-pulse')} title="Org Pulse">
               <Activity size={18} className="shrink-0 text-indigo-500" />
               <span className="whitespace-nowrap truncate text-slate-800">Org Pulse</span>
            </Link>
            <Link to="/dashboard/payroll" onClick={handleLinkClick} className={getLinkClass('/dashboard/payroll')} title="Payroll">
               <Wallet size={18} className="shrink-0" />
               <span className="whitespace-nowrap truncate">Payroll</span>
            </Link>
            <Link to="/dashboard/payroll-forecast" onClick={handleLinkClick} className={getLinkClass('/dashboard/payroll-forecast')} title="Payroll Forecast">
               <TrendingUp size={18} className="shrink-0" />
               <span className="whitespace-nowrap truncate">Payroll Forecast</span>
            </Link>
            {isOwner && (
              <Link to="/dashboard/manage-admins" onClick={handleLinkClick} className={getLinkClass('/dashboard/manage-admins')} title="Manage Admins">
                 <ShieldCheck size={18} className="shrink-0" />
                 <span className="whitespace-nowrap truncate">Manage Admins</span>
              </Link>
            )}
            <Link to="/dashboard/data-import" onClick={handleLinkClick} className={getLinkClass('/dashboard/data-import')} title="Data Import">
               <UploadCloud size={18} className="shrink-0" />
               <span className="whitespace-nowrap truncate">Bulk Import</span>
            </Link>
            <Link to="/dashboard/tenant-settings" onClick={handleLinkClick} className={getLinkClass('/dashboard/tenant-settings')} title="Org Settings">
               <Settings size={18} className="shrink-0" />
               <span className="whitespace-nowrap truncate">Org Settings</span>
            </Link>
            {isOwner && (
              <Link to="/dashboard/billing" onClick={handleLinkClick} className={getLinkClass('/dashboard/billing')} title="Billing & Subscription">
                 <CreditCard size={18} className="shrink-0" />
                 <span className="whitespace-nowrap truncate">Billing</span>
              </Link>
            )}
            {isOwner && (
              <Link to="/dashboard/developer" onClick={handleLinkClick} className={getLinkClass('/dashboard/developer')} title="Developer API">
                 <Terminal size={18} className="shrink-0" />
                 <span className="whitespace-nowrap truncate">Developer API</span>
              </Link>
            )}
            <Link to="/dashboard/audit-logs" onClick={handleLinkClick} className={getLinkClass('/dashboard/audit-logs')} title="Audit Logs">
               <FileText size={18} className="shrink-0" />
               <span className="whitespace-nowrap truncate">Audit Logs</span>
            </Link>
          </>
        )}
      </nav>

      {/* Bottom Profile Info */}
      <div className="mt-auto pt-4 pb-2 px-4 -mx-2 border-t border-slate-400 flex items-center justify-between gap-2 overflow-hidden">
        <Link 
          to="/dashboard/my-profile" 
          onClick={handleLinkClick}
          className="flex items-center gap-3 hover:bg-slate-50 p-2 rounded-xl transition-colors min-w-0 flex-1"
        >
          <Avatar size="lg" src={user?.avatar} initials={initials} className="bg-indigo-100 text-indigo-700 font-bold shrink-0" />
          <div className="flex flex-col min-w-0">
            <span className="text-base font-bold text-slate-800 truncate">{initials}</span>
            <span className="text-sm text-slate-500 truncate font-medium">{user?.jobPosition || user?.roleDefinition?.name || user?.role || 'Employee'}</span>
          </div>
        </Link>
        
        <button 
          onClick={handleLogout}
          className="text-slate-500 hover:text-danger hover:bg-danger/10 p-2 rounded-lg transition-colors shrink-0"
          title="Log Out"
        >
          <LogOut size={24} />
        </button>
      </div>
    </div>
  );
};

export default Sidebar;

