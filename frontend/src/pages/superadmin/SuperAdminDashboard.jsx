import React, { useState, useEffect } from 'react';
import { Plus, Activity, Building, Users, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { API_BASE } from '../../lib/api';
import ProvisionTenantModal from './ProvisionTenantModal';
import TenantDetailsModal from './TenantDetailsModal';
import Alert from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { Avatar } from '../../components/ui/Avatar';
import { Skeleton } from '../../components/ui/Skeleton';

const SuperAdminDashboard = () => {
  const [tenants, setTenants] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTenantId, setSelectedTenantId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  
  const navigate = useNavigate();

  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
  };

  const fetchTenants = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/superadmin/tenants`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (!res.ok) {
        throw new Error('Failed to fetch tenants');
      }
      const data = await res.json();
      setTenants(data);
    } catch (error) {
      console.error('Error fetching tenants:', error);
      setErrorMsg(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTenants();
  }, []);

  const filteredTenants = tenants.filter(t => 
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (t.domain && t.domain.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-800">
      
      {/* Super Admin Top Navigation */}
      <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 z-40 sticky top-0 shadow-sm">
        <div className="flex items-center gap-3">
          <img src="/Crew.png" alt="Crew HR" className="h-8 object-contain" />
          <div className="h-4 w-px bg-slate-200 mx-1"></div>
          <span className="font-semibold text-slate-800 tracking-tight">Platform Admin</span>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 mr-2">
            <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 font-bold text-sm shadow-inner shrink-0">
              {user?.displayName ? (user.displayName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()) : 'SA'}
            </div>
            <div className="flex flex-col text-sm min-w-0">
              <span className="font-semibold text-slate-800 leading-tight break-words whitespace-normal">{user?.displayName || 'Super Admin'}</span>
              <span className="text-xs text-slate-500 leading-tight break-words whitespace-normal">{user?.email || 'admin@crew.com'}</span>
            </div>
          </div>
          
          <button 
            onClick={handleLogout}
            className="text-slate-400 hover:text-red-600 hover:bg-red-50 p-2.5 rounded-xl transition-all"
            title="Log Out"
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="p-4 md:p-8 lg:p-12 relative flex-1 flex flex-col max-w-7xl mx-auto w-full">
        
        {/* Header Row */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div>
            <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">Organizations</h1>
            <p className="text-slate-500 mt-2 font-medium">Manage all companies, their CEOs, and platform health.</p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full sm:w-auto">
            <div className="w-full sm:w-72 relative">
              <Input
                type="text"
                placeholder="Search organizations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="rounded-xl bg-white border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 shadow-sm w-full pl-4"
              />
            </div>
            <Button variant="primary" onClick={() => setIsModalOpen(true)} className="rounded-xl gap-2 justify-center w-full sm:w-auto shadow-[0_4px_14px_0_rgb(79,70,229,0.39)] hover:shadow-[0_6px_20px_rgba(79,70,229,0.23)] hover:-translate-y-0.5 transition-all">
              <Plus size={18} strokeWidth={2.5} /> Provision Tenant
            </Button>
          </div>
        </div>

        {errorMsg && <Alert type="error" message={errorMsg} className="mb-6 rounded-xl border-red-200" />}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 shrink-0">
          <div className="bg-white p-6 rounded-2xl border border-slate-200/75 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="flex items-center gap-4 text-indigo-600 mb-2">
              <div className="p-2.5 bg-indigo-50 rounded-xl">
                <Building size={22} strokeWidth={2.5} />
              </div>
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Total Companies</h3>
            </div>
            {loading ? <Skeleton className="h-10 w-20 mt-3 rounded-lg" /> : <p className="text-4xl font-extrabold text-slate-900 mt-3">{tenants.length}</p>}
          </div>
          
          <div className="bg-white p-6 rounded-2xl border border-slate-200/75 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="flex items-center gap-4 text-emerald-600 mb-2">
              <div className="p-2.5 bg-emerald-50 rounded-xl">
                <Users size={22} strokeWidth={2.5} />
              </div>
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Total Users</h3>
            </div>
            {loading ? <Skeleton className="h-10 w-24 mt-3 rounded-lg" /> : <p className="text-4xl font-extrabold text-slate-900 mt-3">
              {tenants.reduce((acc, t) => acc + (t._count?.users || 0), 0)}
            </p>}
          </div>
          
          <div className="bg-white p-6 rounded-2xl border border-slate-200/75 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 to-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="flex items-center gap-4 text-cyan-600 mb-2">
              <div className="p-2.5 bg-cyan-50 rounded-xl">
                <Activity size={22} strokeWidth={2.5} />
              </div>
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">System Health</h3>
            </div>
            {loading ? <Skeleton className="h-8 w-36 mt-4 rounded-lg" /> : <p className="text-2xl font-bold text-emerald-500 mt-4 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse ring-4 ring-emerald-500/20"></span>
              Operational
            </p>}
          </div>
        </div>

        {/* Table Area (glass-panel container for the list) */}
        <div className="flex-1 bg-white rounded-2xl flex flex-col min-h-0 overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-200/75 relative">
          <div className="flex-1 overflow-auto custom-scrollbar">
            <table className="w-full text-left" style={{ borderCollapse: 'separate', borderSpacing: 0, border: 'none' }}>
              <thead className="sticky top-0 bg-slate-50/95 backdrop-blur-md z-10 border-b border-slate-200 shadow-sm">
                <tr className="text-slate-500 text-xs font-bold uppercase tracking-wider">
                  <th className="py-4 px-6 border-b border-slate-200/80">Company Name</th>
                  <th className="py-4 px-6 border-b border-slate-200/80 hidden md:table-cell">Domain</th>
                  <th className="py-4 px-6 border-b border-slate-200/80">CEO / Owner</th>
                  <th className="py-4 px-6 border-b border-slate-200/80">Plan Tier</th>
                  <th className="py-4 px-6 border-b border-slate-200/80 hidden md:table-cell text-right">Active Users</th>
                  <th className="py-4 px-6 border-b border-slate-200/80 hidden lg:table-cell text-right">Joined Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={`skeleton-${i}`}>
                      <td className="py-5 px-6"><Skeleton className="h-5 w-32 rounded" /></td>
                      <td className="py-5 px-6 hidden md:table-cell"><Skeleton className="h-5 w-40 rounded" /></td>
                      <td className="py-5 px-6">
                         <div className="flex items-center gap-3">
                            <Skeleton className="h-9 w-9 rounded-full" />
                            <Skeleton className="h-5 w-28 rounded" />
                         </div>
                      </td>
                      <td className="py-5 px-6"><Skeleton className="h-6 w-16 rounded-full" /></td>
                      <td className="py-5 px-6 hidden md:table-cell text-right"><Skeleton className="h-5 w-8 ml-auto rounded" /></td>
                      <td className="py-5 px-6 hidden lg:table-cell text-right"><Skeleton className="h-5 w-20 ml-auto rounded" /></td>
                    </tr>
                  ))
                ) : filteredTenants.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-24 text-center">
                      <div className="flex flex-col items-center justify-center text-slate-400">
                        <Building size={48} className="mb-4 opacity-20" />
                        <p className="text-lg font-medium">No organizations found.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredTenants.map((tenant) => {
                    const ceoName = tenant.users && tenant.users.length > 0 ? tenant.users[0].displayName : 'No CEO assigned';
                    return (
                      <tr 
                        key={tenant.id} 
                        className="hover:bg-slate-50 transition-colors cursor-pointer group"
                        onClick={() => setSelectedTenantId(tenant.id)}
                      >
                        <td className="py-4 px-6">
                          <div className="font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">{tenant.name}</div>
                        </td>
                        <td className="py-4 px-6 text-sm font-medium text-slate-500 hidden md:table-cell">{tenant.domain || 'N/A'}</td>
                        <td className="py-4 px-6">
                           <div className="flex items-center gap-3">
                              <Avatar size="sm" initials={ceoName.substring(0,2).toUpperCase()} className="bg-indigo-100 text-indigo-700 font-bold" />
                              <span className="text-sm font-semibold text-slate-700">{ceoName}</span>
                           </div>
                        </td>
                        <td className="py-4 px-6">
                          <Badge variant={tenant.planTier === 'Enterprise' ? 'purple' : 'blue'}>
                            <span className="font-bold tracking-wide">{tenant.planTier || 'Free'}</span>
                          </Badge>
                        </td>
                        <td className="py-4 px-6 font-bold text-slate-700 hidden md:table-cell text-right">
                           {tenant._count?.users || 0}
                        </td>
                        <td className="py-4 px-6 text-sm font-medium text-slate-500 hidden lg:table-cell text-right">
                          {new Date(tenant.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {isModalOpen && (
          <ProvisionTenantModal 
            onClose={() => setIsModalOpen(false)} 
            onSuccess={() => {
              setIsModalOpen(false);
              fetchTenants();
            }}
          />
        )}

        {selectedTenantId && (
          <TenantDetailsModal 
            tenantId={selectedTenantId} 
            onClose={() => {
              setSelectedTenantId(null);
              fetchTenants();
            }} 
          />
        )}
      </div>
    </div>
  );
};

export default SuperAdminDashboard;
