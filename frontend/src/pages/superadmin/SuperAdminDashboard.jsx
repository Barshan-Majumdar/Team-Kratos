import React, { useState, useEffect } from 'react';
import { PlusCircle, Activity, Building, Users } from 'lucide-react';
import { API_BASE } from '../../lib/api';
import ProvisionTenantModal from './ProvisionTenantModal';
import TenantDetailsModal from './TenantDetailsModal';
import Alert from '../../components/ui/Alert';

const SuperAdminDashboard = () => {
  const [tenants, setTenants] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTenantId, setSelectedTenantId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

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

  if (loading && tenants.length === 0) {
    return <div className="p-8 text-center text-text-muted">Loading platform data...</div>;
  }

  return (
    <div className="min-h-screen bg-bg-base p-8 text-text-primary">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary-400 to-primary-200">
              Platform Overview
            </h1>
            <p className="text-text-muted mt-2">Manage organizations, billing, and system health.</p>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-lg transition-colors shadow-premium-glow whitespace-nowrap"
          >
            <PlusCircle size={20} />
            Provision Tenant
          </button>
        </div>
        
        {errorMsg && <Alert type="error" message={errorMsg} className="mb-6" />}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="glass-panel p-6 rounded-xl hover-float">
            <div className="flex items-center gap-4 text-primary-400 mb-2">
              <Building size={24} />
              <h3 className="text-lg font-semibold text-text-primary">Total Organizations</h3>
            </div>
            <p className="text-3xl font-bold">{tenants.length}</p>
          </div>
          <div className="glass-panel p-6 rounded-xl hover-float">
            <div className="flex items-center gap-4 text-green-400 mb-2">
              <Users size={24} />
              <h3 className="text-lg font-semibold text-text-primary">Total Platform Users</h3>
            </div>
            <p className="text-3xl font-bold">
              {tenants.reduce((acc, t) => acc + (t._count?.users || 0), 0)}
            </p>
          </div>
          <div className="glass-panel p-6 rounded-xl hover-float">
            <div className="flex items-center gap-4 text-blue-400 mb-2">
              <Activity size={24} />
              <h3 className="text-lg font-semibold text-text-primary">System Health</h3>
            </div>
            <p className="text-3xl font-bold text-green-400">All Systems Operational</p>
          </div>
        </div>

        <div className="glass-panel rounded-xl overflow-hidden">
          <div className="p-6 border-b border-white/5">
            <h2 className="text-xl font-bold">Organizations</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-bg-elevated/50 text-text-muted border-b border-white/5">
                <tr>
                  <th className="p-4 font-semibold">Tenant Name</th>
                  <th className="p-4 font-semibold">Domain</th>
                  <th className="p-4 font-semibold">CEO</th>
                  <th className="p-4 font-semibold">Tier</th>
                  <th className="p-4 font-semibold">Active Users</th>
                  <th className="p-4 font-semibold">Joined Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {tenants.map((tenant) => (
                  <tr 
                    key={tenant.id} 
                    className="hover:bg-white/5 transition-colors cursor-pointer"
                    onClick={() => setSelectedTenantId(tenant.id)}
                  >
                    <td className="p-4 font-medium">{tenant.name}</td>
                    <td className="p-4 text-text-muted">{tenant.domain || 'N/A'}</td>
                    <td className="p-4 text-text-muted">{tenant.users && tenant.users[0] ? tenant.users[0].displayName : 'N/A'}</td>
                    <td className="p-4">
                      <span className="px-3 py-1 bg-primary-900/30 text-primary-400 rounded-full text-sm border border-primary-900/50">
                        {tenant.planTier}
                      </span>
                    </td>
                    <td className="p-4">{tenant._count?.users || 0}</td>
                    <td className="p-4 text-text-muted">
                      {new Date(tenant.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
                {tenants.length === 0 && (
                  <tr>
                    <td colSpan="6" className="p-8 text-center text-text-muted">
                      No organizations provisioned yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
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
  );
};

export default SuperAdminDashboard;
