import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { clearSession, getSession } from '@crew/auth-client';
import CompanyProfile from '../components/CompanyProfile';
import RoleHierarchy from '../components/RoleHierarchy';
import PayrollConfig from '../components/PayrollConfig';
import AccessPermissions from '../components/AccessPermissions';
import OfficeEntityManagement from '../components/OfficeEntityManagement';
import EmployeeRoster from '../components/EmployeeRoster';

export default function Dashboard() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = getSession();
  
  const activeTab = searchParams.get('tab') || 'profile';

  const setActiveTab = (tab) => {
    setSearchParams({ tab });
  };

  const handleLogout = () => {
    clearSession();
    navigate('/');
  };

  const navClass = (tab) => 
    `block px-4 py-2 rounded-lg cursor-pointer transition-colors ${
      activeTab === tab 
        ? 'bg-indigo-600 text-white font-semibold shadow-md' 
        : 'text-slate-400 hover:text-white hover:bg-slate-800'
    }`;

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <aside className="w-64 bg-slate-900 text-white p-6 shadow-xl z-10 flex flex-col">
        <h1 className="text-2xl font-bold mb-10 text-indigo-400 flex items-center gap-2">
          Crew Console
        </h1>
        <nav className="space-y-2 flex-1">
          <div onClick={() => setActiveTab('profile')} className={navClass('profile')}>Company Profile</div>
          <div onClick={() => setActiveTab('hierarchy')} className={navClass('hierarchy')}>Role Hierarchy</div>
          <div onClick={() => setActiveTab('permissions')} className={navClass('permissions')}>Access Permissions</div>
          <div onClick={() => setActiveTab('payroll')} className={navClass('payroll')}>Payroll Config</div>
          <div onClick={() => setActiveTab('offices')} className={navClass('offices')}>Offices & Entities</div>
          <div onClick={() => setActiveTab('roster')} className={navClass('roster')}>Employee Roster</div>
        </nav>
      </aside>
      <main className="flex-1 overflow-y-auto bg-slate-50 relative">
        <div className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-slate-200 p-6 flex justify-between items-center z-10 shadow-sm">
          <h2 className="text-2xl font-bold text-slate-800">
            Welcome, {user?.displayName || 'Admin'}
          </h2>
          <div className="flex items-center gap-4">
            <div className="text-sm text-slate-500 font-medium">Level {user?.roleDefinition?.level} Access</div>
            <button 
              onClick={handleLogout}
              className="px-5 py-2.5 bg-red-50 text-red-600 font-semibold rounded-xl hover:bg-red-100 transition-colors shadow-sm"
            >
              Logout
            </button>
          </div>
        </div>
        <div className="p-8 pb-20">
          {activeTab === 'profile' && <CompanyProfile user={user} />}
          {activeTab === 'hierarchy' && <RoleHierarchy user={user} />}
          {activeTab === 'permissions' && <AccessPermissions user={user} />}
          {activeTab === 'payroll' && <PayrollConfig user={user} />}
          {activeTab === 'offices' && <OfficeEntityManagement user={user} />}
          {activeTab === 'roster' && <EmployeeRoster />}
        </div>
      </main>
    </div>
  );
}
