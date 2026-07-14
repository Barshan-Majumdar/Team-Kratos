import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Users, CalendarDays, Wallet, UserPlus, Clock, ShieldCheck, Mail, Bell, Settings, LogOut, User, LayoutDashboard, FileText } from 'lucide-react';
import { Avatar } from '../ui/Avatar';

const Sidebar = ({ user, onCloseMobile }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'Admin';

  const nameParts = (user?.displayName || 'User').trim().split(/\s+/);
  const initials = nameParts.length >= 2 
    ? `${nameParts[0][0].toUpperCase()}.${nameParts[nameParts.length - 1][0].toUpperCase()}`
    : nameParts[0].substring(0, 2).toUpperCase();



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

        <Link to="/dashboard/attendance" onClick={handleLinkClick} className={getLinkClass('/dashboard/attendance')} title="Attendance">
          <Clock size={18} className="shrink-0" />
          <span className="whitespace-nowrap">Attendance</span>
        </Link>

        <Link to="/dashboard/time-off" onClick={handleLinkClick} className={getLinkClass('/dashboard/time-off')} title="Time Off">
          <CalendarDays size={18} className="shrink-0" />
          <span className="whitespace-nowrap">Time Off</span>
        </Link>

        {isAdmin && (
          <>
            <div className="mt-4 mb-2 px-2 whitespace-nowrap">
              <span className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider">
                Admin
              </span>
            </div>
            
            <Link to="/dashboard/add-employee" onClick={handleLinkClick} className={getLinkClass('/dashboard/add-employee')} title="Add Employee">
               <UserPlus size={18} className="shrink-0" />
               <span className="whitespace-nowrap truncate">Add Employee</span>
            </Link>
            <Link to="/dashboard/payroll" onClick={handleLinkClick} className={getLinkClass('/dashboard/payroll')} title="Payroll">
               <Wallet size={18} className="shrink-0" />
               <span className="whitespace-nowrap truncate">Payroll</span>
            </Link>
            <Link to="/dashboard/leave-approvals" onClick={handleLinkClick} className={getLinkClass('/dashboard/leave-approvals')} title="Leave Approvals">
               <CalendarDays size={18} className="shrink-0" />
               <span className="whitespace-nowrap truncate">Leave Approvals</span>
            </Link>
            <Link to="/dashboard/invite-employee" onClick={handleLinkClick} className={getLinkClass('/dashboard/invite-employee')} title="Invite Employees">
               <Mail size={18} className="shrink-0" />
               <span className="whitespace-nowrap truncate">Invite Employees</span>
            </Link>
            <Link to="/dashboard/manage-admins" onClick={handleLinkClick} className={getLinkClass('/dashboard/manage-admins')} title="Manage Admins">
               <ShieldCheck size={18} className="shrink-0" />
               <span className="whitespace-nowrap truncate">Manage Admins</span>
            </Link>
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
            <span className="text-sm text-slate-500 truncate font-medium">{user?.jobPosition || user?.role || 'Employee'}</span>
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

