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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1F2B4D]/40 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-lg rounded-[24px] overflow-hidden border border-[#EAE7E0] shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center p-6 border-b border-[#EAE7E0] bg-[#FAF8F5]">
          <h2 className="text-xl font-serif font-bold text-[#1F2B4D]">Provision New Organization</h2>
          <button 
            onClick={onClose}
            className="text-[#6B655C] hover:text-[#1F2B4D] transition-colors p-1 hover:bg-[#EAE7E0] rounded-lg"
          >
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMsg && <Alert type="error" message={errorMsg} />}
          
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-display font-bold text-[#6B655C] uppercase tracking-wider mb-1">Organization Name</label>
              <input 
                type="text" 
                name="name"
                required 
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g. Acme Corp"
                className="w-full p-2.5 bg-[#FAF9F6] border border-[#EAE7E0] rounded-xl text-[#1F2B4D] focus:border-[#1F2B4D] focus:ring-4 focus:ring-[#1F2B4D]/10 outline-none transition-all font-medium text-sm" 
              />
            </div>
            
            <div>
              <label className="block text-[10px] font-display font-bold text-[#6B655C] uppercase tracking-wider mb-1">Company Domain (Optional)</label>
              <input 
                type="text" 
                name="domain"
                value={formData.domain}
                onChange={handleChange}
                placeholder="e.g. acme.com"
                className="w-full p-2.5 bg-[#FAF9F6] border border-[#EAE7E0] rounded-xl text-[#1F2B4D] focus:border-[#1F2B4D] focus:ring-4 focus:ring-[#1F2B4D]/10 outline-none transition-all font-medium text-sm" 
              />
            </div>

            <div className="pt-4 border-t border-[#EAE7E0]">
              <h3 className="text-xs font-bold text-[#1F2B4D] mb-3">Admin Account Details</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-display font-bold text-[#6B655C] uppercase tracking-wider mb-1">Admin Full Name</label>
                  <input 
                    type="text" 
                    name="adminName"
                    required 
                    value={formData.adminName}
                    onChange={handleChange}
                    placeholder="Jane Doe"
                    className="w-full p-2.5 bg-[#FAF9F6] border border-[#EAE7E0] rounded-xl text-[#1F2B4D] focus:border-[#1F2B4D] focus:ring-4 focus:ring-[#1F2B4D]/10 outline-none transition-all font-medium text-sm" 
                  />
                </div>
                
                <div>
                  <label className="block text-[10px] font-display font-bold text-[#6B655C] uppercase tracking-wider mb-1">Admin Email</label>
                  <input 
                    type="email" 
                    name="adminEmail"
                    required 
                    value={formData.adminEmail}
                    onChange={handleChange}
                    placeholder="jane@acme.com"
                    className="w-full p-2.5 bg-[#FAF9F6] border border-[#EAE7E0] rounded-xl text-[#1F2B4D] focus:border-[#1F2B4D] focus:ring-4 focus:ring-[#1F2B4D]/10 outline-none transition-all font-medium text-sm" 
                  />
                </div>
                
                <div>
                  <label className="block text-[10px] font-display font-bold text-[#6B655C] uppercase tracking-wider mb-1">Temporary Password</label>
                  <input 
                    type="password" 
                    name="adminPassword"
                    required 
                    value={formData.adminPassword}
                    onChange={handleChange}
                    placeholder="••••••••"
                    className="w-full p-2.5 bg-[#FAF9F6] border border-[#EAE7E0] rounded-xl text-[#1F2B4D] focus:border-[#1F2B4D] focus:ring-4 focus:ring-[#1F2B4D]/10 outline-none transition-all font-medium text-sm" 
                  />
                  <p className="text-[10px] text-[#9A948A] mt-1 font-medium">Admin will be forced to change this upon first login.</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="pt-4 flex justify-end gap-3 border-t border-[#EAE7E0] mt-6">
            <button 
              type="button" 
              onClick={onClose}
              className="px-5 py-2.5 bg-[#FAF8F5] border border-[#EAE7E0] text-[#6B655C] hover:bg-[#F4F1EA] hover:text-[#1F2B4D] rounded-xl transition-colors font-bold text-xs"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={loading}
              className="px-6 py-2.5 bg-[#1F2B4D] hover:bg-[#141C33] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl transition-all font-bold text-xs shadow-md"
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
