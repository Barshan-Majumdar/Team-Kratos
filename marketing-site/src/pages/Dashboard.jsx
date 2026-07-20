import React from 'react';
import { useNavigate } from 'react-router-dom';
import { clearSession, getSession } from '@crew/auth-client';

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = getSession();

  const handleLogout = () => {
    clearSession();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <aside className="w-64 bg-slate-900 text-white p-6">
        <h1 className="text-xl font-bold mb-8">Crew Console</h1>
        <nav className="space-y-4">
          <a href="#" className="block text-indigo-400 font-medium">Dashboard</a>
          <a href="#" className="block text-slate-400 hover:text-white transition-colors">Company Profile</a>
          <a href="#" className="block text-slate-400 hover:text-white transition-colors">Role Hierarchy</a>
          <a href="#" className="block text-slate-400 hover:text-white transition-colors">Payroll Config</a>
        </nav>
      </aside>
      <main className="flex-1 p-8">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-bold text-slate-800">Welcome, {user?.displayName || 'Admin'}</h2>
          <button 
            onClick={handleLogout}
            className="px-4 py-2 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
          >
            Logout
          </button>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-semibold mb-4">Console Overview</h3>
          <p className="text-slate-600">
            This dashboard is restricted to Owners (Level 0) and HR Admins (Level 1).
            Your current level: {user?.roleDefinition?.level}
          </p>
        </div>
      </main>
    </div>
  );
}
