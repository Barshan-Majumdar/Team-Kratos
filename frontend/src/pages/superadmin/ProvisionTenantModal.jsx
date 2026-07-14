import React, { useState } from 'react';
import { X } from 'lucide-react';
import { API_BASE } from '../../lib/api';
import Alert from '../../components/ui/Alert';

const ProvisionTenantModal = ({ onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    domain: '',
    adminEmail: '',
    adminName: '',
    adminPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch(`${API_BASE}/api/superadmin/tenants`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(formData)
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to provision tenant');
      }
      
      onSuccess();
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="glass-panel w-full max-w-lg rounded-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="flex justify-between items-center p-6 border-b border-white/5 bg-bg-elevated/50">
          <h2 className="text-xl font-bold text-text-primary">Provision New Organization</h2>
          <button 
            onClick={onClose}
            className="text-text-muted hover:text-text-primary transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMsg && <Alert type="error" message={errorMsg} />}
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-text-muted mb-1">Organization Name</label>
              <input 
                type="text" 
                name="name"
                required 
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g. Acme Corp"
                className="w-full p-2.5 bg-bg-base border border-white/10 rounded-lg text-text-primary focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition-all" 
              />
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-text-muted mb-1">Company Domain (Optional)</label>
              <input 
                type="text" 
                name="domain"
                value={formData.domain}
                onChange={handleChange}
                placeholder="e.g. acme.com"
                className="w-full p-2.5 bg-bg-base border border-white/10 rounded-lg text-text-primary focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition-all" 
              />
            </div>

            <div className="pt-4 border-t border-white/5">
              <h3 className="text-sm font-bold text-text-primary mb-3">Admin Account Details</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-text-muted mb-1">Admin Full Name</label>
                  <input 
                    type="text" 
                    name="adminName"
                    required 
                    value={formData.adminName}
                    onChange={handleChange}
                    placeholder="Jane Doe"
                    className="w-full p-2.5 bg-bg-base border border-white/10 rounded-lg text-text-primary focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition-all" 
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-text-muted mb-1">Admin Email</label>
                  <input 
                    type="email" 
                    name="adminEmail"
                    required 
                    value={formData.adminEmail}
                    onChange={handleChange}
                    placeholder="jane@acme.com"
                    className="w-full p-2.5 bg-bg-base border border-white/10 rounded-lg text-text-primary focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition-all" 
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-text-muted mb-1">Temporary Password</label>
                  <input 
                    type="password" 
                    name="adminPassword"
                    required 
                    value={formData.adminPassword}
                    onChange={handleChange}
                    placeholder="••••••••"
                    className="w-full p-2.5 bg-bg-base border border-white/10 rounded-lg text-text-primary focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition-all" 
                  />
                  <p className="text-xs text-text-muted mt-1">Admin will be forced to change this upon first login.</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="pt-4 flex justify-end gap-3 border-t border-white/5 mt-6">
            <button 
              type="button" 
              onClick={onClose}
              className="px-4 py-2 bg-transparent text-text-muted hover:text-text-primary transition-colors font-semibold"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={loading}
              className="px-6 py-2 bg-primary-600 hover:bg-primary-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-semibold shadow-premium-glow"
            >
              {loading ? 'Provisioning...' : 'Provision Tenant'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProvisionTenantModal;
