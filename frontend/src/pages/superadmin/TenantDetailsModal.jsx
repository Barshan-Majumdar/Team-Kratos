import React, { useState } from 'react';
import { X, Mail, Shield, Building, Edit2, Loader2, Save } from 'lucide-react';
import { API_BASE } from '../../lib/api';
import toast from 'react-hot-toast';

const TenantDetailsModal = ({ tenantId, onClose }) => {
  const [step, setStep] = useState('PROMPT'); // 'PROMPT', 'OTP', 'DETAILS'
  const [loading, setLoading] = useState(false);
  
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [adminEmail, setAdminEmail] = useState('');
  
  const [tenantDetails, setTenantDetails] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({ name: '', domain: '', planTier: '' });
  const [saving, setSaving] = useState(false);

  // 1. Request Access (Send OTP)
  const handleRequestAccess = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/superadmin/tenants/${tenantId}/request-access`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      setAdminEmail(data.email);
      setStep('OTP');
      toast.success('OTP sent to the organization administrator.');
    } catch (err) {
      toast.error(err.message || 'Failed to request access.');
      onClose();
    } finally {
      setLoading(false);
    }
  };

  // 2. Verify OTP
  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    const otpCode = otp.join('');
    if (otpCode.length !== 6) {
      toast.error('Please enter a 6-digit OTP');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/superadmin/tenants/${tenantId}/verify-access`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ otp: otpCode })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      toast.success('Access granted.');
      fetchTenantDetails();
    } catch (err) {
      toast.error(err.message || 'Invalid OTP');
      setLoading(false);
    }
  };

  // 3. Fetch Tenant Details
  const fetchTenantDetails = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/superadmin/tenants/${tenantId}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      setTenantDetails(data);
      setFormData({ name: data.name, domain: data.domain || '', planTier: data.planTier });
      setStep('DETAILS');
    } catch (err) {
      toast.error(err.message || 'Failed to load details.');
      onClose();
    } finally {
      setLoading(false);
    }
  };

  // 4. Save Updates
  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/superadmin/tenants/${tenantId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      toast.success('Organization updated successfully.');
      setTenantDetails({ ...tenantDetails, ...data });
      setEditMode(false);
    } catch (err) {
      toast.error(err.message || 'Failed to update organization.');
    } finally {
      setSaving(false);
    }
  };

  const handleOtpChange = (element, index) => {
    if (isNaN(element.value)) return false;
    setOtp([...otp.map((d, idx) => (idx === index ? element.value : d))]);
    if (element.nextSibling && element.value) {
      element.nextSibling.focus();
    }
  };

  const handleOtpKeyDown = (e, index) => {
    if (e.key === 'Backspace' && !otp[index] && e.target.previousSibling) {
      e.target.previousSibling.focus();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
      <div className="bg-bg-elevated border border-white/10 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 relative">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors"
        >
          <X size={24} />
        </button>

        {/* STEP 1: PROMPT */}
        {step === 'PROMPT' && (
          <div className="p-8 text-center flex flex-col items-center">
            <div className="w-16 h-16 bg-primary-50 text-primary-600 rounded-full flex items-center justify-center mb-6 border border-primary-200">
              <Shield size={32} />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Request Access</h2>
            <p className="text-slate-500 mb-8 text-sm">
              To view or edit sensitive company details, an OTP will be sent to the organization's CEO for authorization. Do you wish to proceed?
            </p>
            <div className="flex w-full gap-4">
              <button 
                onClick={onClose}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-all"
              >
                No, Cancel
              </button>
              <button 
                onClick={handleRequestAccess}
                disabled={loading}
                className="flex-1 py-3 bg-primary-600 hover:bg-primary-500 text-white font-semibold rounded-xl transition-all shadow-md flex justify-center items-center gap-2 disabled:opacity-70"
              >
                {loading ? <Loader2 className="animate-spin" size={20} /> : 'Yes, Request OTP'}
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: OTP */}
        {step === 'OTP' && (
          <div className="p-8 text-center flex flex-col items-center">
            <div className="w-16 h-16 bg-primary-50 text-primary-600 rounded-full flex items-center justify-center mb-6 border border-primary-200">
              <Mail size={32} />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Enter OTP</h2>
            <p className="text-slate-500 mb-8 text-sm">
              We've sent a 6-digit code to <span className="text-slate-800 font-semibold">{adminEmail}</span>.
            </p>

            <form onSubmit={handleVerifyOTP} className="w-full">
              <div className="flex justify-between gap-2 mb-8">
                {otp.map((data, index) => (
                  <input
                    key={index}
                    type="text"
                    maxLength="1"
                    value={data}
                    onChange={(e) => handleOtpChange(e.target, index)}
                    onKeyDown={(e) => handleOtpKeyDown(e, index)}
                    className="w-12 h-14 bg-slate-50 border-2 border-slate-200 rounded-xl text-center text-2xl font-bold text-slate-800 focus:border-primary-500 focus:bg-white outline-none transition-all"
                  />
                ))}
              </div>
              <button
                type="submit"
                disabled={loading || otp.join('').length !== 6}
                className="w-full bg-primary-600 hover:bg-primary-500 text-white rounded-xl py-4 font-semibold text-lg flex items-center justify-center gap-2 transition-all shadow-md disabled:opacity-50"
              >
                {loading ? <Loader2 className="animate-spin" size={20} /> : 'Verify & Access'}
              </button>
            </form>
          </div>
        )}

        {/* STEP 3: DETAILS */}
        {step === 'DETAILS' && tenantDetails && (
          <div className="p-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3 text-primary-600">
                <Building size={28} />
                <h2 className="text-2xl font-bold text-slate-800">Company Details</h2>
              </div>
              <button 
                onClick={() => setEditMode(!editMode)}
                className="p-2 text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                <Edit2 size={18} />
              </button>
            </div>

            <div className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Organization Name</label>
                {editMode ? (
                  <input 
                    type="text" 
                    value={formData.name} 
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2.5 text-slate-800 outline-none focus:border-primary-500"
                  />
                ) : (
                  <div className="px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-lg text-slate-800 font-medium">{tenantDetails.name}</div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Domain</label>
                {editMode ? (
                  <input 
                    type="text" 
                    value={formData.domain} 
                    onChange={e => setFormData({...formData, domain: e.target.value})}
                    className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2.5 text-slate-800 outline-none focus:border-primary-500"
                  />
                ) : (
                  <div className="px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-lg text-slate-800 font-medium">{tenantDetails.domain || 'Not set'}</div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Plan Tier</label>
                {editMode ? (
                  <select 
                    value={formData.planTier} 
                    onChange={e => setFormData({...formData, planTier: e.target.value})}
                    className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2.5 text-slate-800 outline-none focus:border-primary-500"
                  >
                    <option value="Free">Free</option>
                    <option value="Pro">Pro</option>
                    <option value="Enterprise">Enterprise</option>
                  </select>
                ) : (
                  <div className="px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-lg text-primary-700 font-bold">{tenantDetails.planTier}</div>
                )}
              </div>
              
              <div className="pt-4 border-t border-slate-200">
                <h3 className="text-sm font-semibold text-slate-800 mb-3">Admin Contacts</h3>
                <div className="space-y-2">
                  {tenantDetails.users?.map(u => (
                    <div key={u.id} className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-100">
                      <div>
                        <p className="text-slate-800 font-medium text-sm">{u.displayName}</p>
                        <p className="text-slate-500 text-xs">{u.email}</p>
                      </div>
                      <span className="px-2 py-1 bg-slate-200 text-slate-700 text-xs rounded uppercase tracking-wider">{u.role}</span>
                    </div>
                  ))}
                  {(!tenantDetails.users || tenantDetails.users.length === 0) && (
                    <p className="text-sm text-slate-500">No admins found.</p>
                  )}
                </div>
              </div>

              {editMode && (
                <button 
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full mt-6 py-3 bg-green-600 hover:bg-green-500 text-white font-semibold rounded-xl transition-all flex justify-center items-center gap-2 shadow-md"
                >
                  {saving ? <Loader2 className="animate-spin" size={20} /> : <><Save size={20} /> Save Changes</>}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TenantDetailsModal;
