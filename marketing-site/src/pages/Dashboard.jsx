import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { clearSession, getSession } from '@crew/auth-client';
import { 
  Building2, GitFork, ShieldCheck, DollarSign, MapPin, Users, 
  LogOut, Crown, Sparkles, ChevronRight, Layers, LayoutDashboard,
  PanelLeftClose, PanelLeftOpen
} from 'lucide-react';
import CompanyProfile from '../components/CompanyProfile';
import RoleHierarchy from '../components/RoleHierarchy';
import PayrollConfig from '../components/PayrollConfig';
import AccessPermissions from '../components/AccessPermissions';
import OfficeEntityManagement from '../components/OfficeEntityManagement';
import EmployeeRoster from '../components/EmployeeRoster';

export default function Dashboard() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(true);
  const { user } = getSession();
  
  const activeTab = searchParams.get('tab') || 'profile';

  const setActiveTab = (tab) => {
    setSearchParams({ tab });
  };

  const handleLogout = () => {
    clearSession();
    navigate('/');
  };

  const navItems = [
    { id: 'profile', label: 'Company Profile', icon: Building2, desc: 'Legal identity & statutory data' },
    { id: 'hierarchy', label: 'Role Hierarchy', icon: GitFork, desc: 'L0-L3 tier definitions' },
    { id: 'permissions', label: 'Access Permissions', icon: ShieldCheck, desc: 'Feature access matrix' },
    { id: 'payroll', label: 'Payroll Config', icon: DollarSign, desc: 'Statutory allowances & PF' },
    { id: 'offices', label: 'Offices & Entities', icon: MapPin, desc: 'Geofence & subsidiaries' },
    { id: 'roster', label: 'Employee Roster', icon: Users, desc: 'Personnel directory' }
  ];

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#1D1B16] font-sans antialiased flex selection:bg-[#1F2B4D] selection:text-white">
      
      {/* Executive Dark Slate Sidebar (Obsidian Ember Architecture - Mini Rail Collapsible & Fixed Viewport Pin) */}
      <aside className={`sticky top-0 h-screen bg-[#10121A] text-white shadow-2xl z-30 flex flex-col justify-between border-r border-[#181B26] shrink-0 overflow-y-auto transition-all duration-300 ease-in-out ${
        isSidebarOpen ? 'w-72 p-6' : 'w-20 py-6 px-3'
      }`}>
        <div>
          {/* Brand Header & Toggle Control */}
          {isSidebarOpen ? (
            <div className="flex items-center justify-between gap-3.5 mb-8 pb-6 border-b border-[#1E2333]">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-[#1F2B4D] border border-white/10 flex items-center justify-center text-white font-extrabold text-xl shadow-md shrink-0">
                  C
                </div>
                <div className="truncate">
                  <div className="text-base font-extrabold tracking-tight text-white flex items-center gap-2 truncate">
                    Crew HRMS
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                  </div>
                  <div className="text-[10px] font-bold tracking-widest text-[#94A3B8] uppercase truncate">EXECUTIVE CONSOLE</div>
                </div>
              </div>

              <button 
                onClick={() => setIsSidebarOpen(false)}
                title="Collapse Sidebar to Mini Rail"
                className="p-1.5 rounded-lg bg-[#181B26] hover:bg-[#262C3F] text-[#94A3B8] hover:text-white transition-colors cursor-pointer border border-white/5 shrink-0"
              >
                <PanelLeftClose size={16} />
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 mb-8 pb-6 border-b border-[#1E2333]">
              <div className="w-10 h-10 rounded-xl bg-[#1F2B4D] border border-white/10 flex items-center justify-center text-white font-extrabold text-xl shadow-md shrink-0">
                C
              </div>
              <button 
                onClick={() => setIsSidebarOpen(true)}
                title="Expand Sidebar"
                className="p-2 rounded-xl bg-[#1F2B4D] hover:bg-[#2A3B66] text-white transition-all cursor-pointer border border-white/10 shadow-sm active:scale-95"
              >
                <PanelLeftOpen size={16} />
              </button>
            </div>
          )}

          {/* Active Tenant / User Badge */}
          {isSidebarOpen ? (
            <div className="mb-6 p-3.5 rounded-2xl bg-[#181B26] border border-[#262C3F] flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#1F2B4D] flex items-center justify-center text-amber-400 font-bold shrink-0">
                <Crown size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-white truncate">{user?.displayName || 'Administrator'}</div>
                <div className="text-[11px] font-medium text-[#94A3B8] flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  Level {user?.roleDefinition?.level ?? 0} ({user?.roleDefinition?.name || 'Owner'})
                </div>
              </div>
            </div>
          ) : (
            <div className="mb-6 flex justify-center" title={`${user?.displayName || 'Administrator'} (Level ${user?.roleDefinition?.level ?? 0})`}>
              <div className="w-10 h-10 rounded-2xl bg-[#181B26] border border-[#262C3F] flex items-center justify-center text-amber-400 font-bold shadow-xs">
                <Crown size={18} />
              </div>
            </div>
          )}

          {/* Navigation Items */}
          {isSidebarOpen && (
            <div className="text-[11px] font-bold tracking-wider uppercase text-[#64748B] mb-3 px-2">
              CONSOLE MANAGEMENT
            </div>
          )}

          <nav className="space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              
              if (!isSidebarOpen) {
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    title={item.label}
                    className={`w-full flex items-center justify-center p-3 rounded-xl cursor-pointer transition-all duration-200 ${
                      isActive
                        ? 'bg-[#1F2B4D] text-white font-bold shadow-md border-l-4 border-[#3B82F6]'
                        : 'text-[#94A3B8] hover:text-white hover:bg-[#181B26]'
                    }`}
                  >
                    <Icon size={20} className={isActive ? 'text-white' : 'text-[#64748B] transition-colors'} />
                  </button>
                );
              }

              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all duration-200 group text-left ${
                    isActive
                      ? 'bg-[#1F2B4D] text-white font-bold shadow-md border-l-4 border-[#3B82F6]'
                      : 'text-[#94A3B8] hover:text-white hover:bg-[#181B26]'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Icon size={18} className={isActive ? 'text-white' : 'text-[#64748B] group-hover:text-white transition-colors'} />
                    <div className="truncate">
                      <div className="text-xs tracking-tight font-semibold">{item.label}</div>
                      <div className={`text-[10px] truncate ${isActive ? 'text-white/70' : 'text-[#64748B]'}`}>
                        {item.desc}
                      </div>
                    </div>
                  </div>
                  <ChevronRight size={14} className={`shrink-0 transition-transform ${isActive ? 'translate-x-0.5 text-white' : 'opacity-0 group-hover:opacity-100 text-[#64748B]'}`} />
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="pt-6 border-t border-[#1E2333]">
          {isSidebarOpen ? (
            <button 
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 text-xs font-bold transition-all duration-200 cursor-pointer"
            >
              <LogOut size={15} />
              <span>Terminate Session</span>
            </button>
          ) : (
            <button 
              onClick={handleLogout}
              title="Terminate Session"
              className="w-full flex items-center justify-center p-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 transition-all duration-200 cursor-pointer"
            >
              <LogOut size={18} />
            </button>
          )}
        </div>
      </aside>

      {/* Main Content Viewport */}
      <main className="flex-1 overflow-y-auto bg-[#FAF9F6] relative flex flex-col">
        
        {/* Top Floating Header (Solid Header Wrapper prevents content bleed above top) */}
        <div className="sticky top-0 z-40 bg-[#FAF9F6] pt-4 pb-2 px-8 w-full">
          <header className="px-6 py-4 rounded-2xl bg-white border border-[#EAE7E0] shadow-[0_1px_2px_rgba(29,27,22,0.04)] flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              title={isSidebarOpen ? "Hide Sidebar" : "Show Sidebar"}
              className="p-2.5 rounded-xl bg-[#F4F1EA] hover:bg-[#EAE7E0] text-[#1F2B4D] border border-[#EAE7E0] transition-all cursor-pointer flex items-center gap-2 text-xs font-bold shadow-xs active:scale-95"
            >
              {isSidebarOpen ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
              <span className="hidden sm:inline">{isSidebarOpen ? 'Compact Rail' : 'Expand Sidebar'}</span>
            </button>

            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#F4F1EA] text-[#1F2B4D] border border-[#EAE7E0] text-[11px] font-bold tracking-wider uppercase mb-1">
                <Sparkles size={12} /> ENTERPRISE CONTROL PLANE
              </div>
              <h1 className="text-2xl font-extrabold text-[#1D1B16] tracking-tight">
                Welcome back, {user?.displayName || 'Administrator'}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden md:inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#0F172A] text-white text-xs font-bold shadow-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              {user?.companyName || 'Crew HRMS Workspace'}
            </span>
            <button 
              onClick={handleLogout}
              className="px-4 py-2 bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold rounded-xl transition-all duration-200 shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              <LogOut size={14} /> Logout
            </button>
          </div>
        </header>
      </div>

        {/* Dynamic Tab Body (Doppelrand Canvas Wrapper) */}
        <div className="p-8 pb-20 max-w-7xl mx-auto w-full flex-1">
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
