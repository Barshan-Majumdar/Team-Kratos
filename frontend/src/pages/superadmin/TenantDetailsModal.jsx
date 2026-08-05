import React, { useState } from 'react';
import { X, Mail, Shield, Building, Edit2, Loader2, Save, MapPin, FileText } from 'lucide-react';
import { API_BASE } from '../../lib/api';
import toast from 'react-hot-toast';

const InputField = ({ label, name, type = 'text', options = null, editMode, formData, handleChange, tenantDetails }) => (
  <div>
    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">{label}</label>
    {editMode ? (
      options ? (
        <select 
          name={name}
          value={formData[name]} 
          onChange={handleChange}
          className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2.5 text-slate-800 outline-none focus:border-primary-500"
        >
          {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
      ) : (
        <input 
          type={type} 
          name={name}
          value={formData[name]} 
          onChange={handleChange}
          className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2.5 text-slate-800 outline-none focus:border-primary-500"
        />
      )
    ) : (
      <div className="px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-lg text-slate-800 font-medium">
        {tenantDetails[name] || <span className="text-slate-400 italic">Not specified</span>}
      </div>
    )}
  </div>
);

const TenantDetailsModal = ({ tenantId, onClose }) => {
  const [step, setStep] = useState('PROMPT'); // 'PROMPT', 'OTP', 'DETAILS'
  const [loading, setLoading] = useState(false);
  
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [adminEmail, setAdminEmail] = useState('');
  
  const [tenantDetails, setTenantDetails] = useState(null);
  const [editMode, setEditMode] = useState(false);
  
  const [formData, setFormData] = useState({ 
    name: '', domain: '', planTier: '',
    pan: '', gstin: '', cin: '', industry: '', size: '', founded: '',
    address: '', city: '', state: '', pincode: '', country: '',
    onboardingReminderDays: 3
  });
  
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
      setFormData({ 
        name: data.name || '', 
        domain: data.domain || '', 
        planTier: data.planTier || 'Free',
        pan: data.pan || '',
        gstin: data.gstin || '',
        cin: data.cin || '',
        industry: data.industry || '',
        size: data.size || '',
        founded: data.founded || '',
        address: data.address || '',
        city: data.city || '',
        state: data.state || '',
        pincode: data.pincode || '',
        country: data.country || '',
        onboardingReminderDays: data.onboardingReminderDays || 3
      });
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

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Props helper to reduce boilerplate in the JSX
  const fieldProps = { editMode, formData, handleChange, tenantDetails };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
      <div className={`bg-bg-elevated border border-white/10 rounded-2xl shadow-2xl w-full ${step === 'DETAILS' ? 'max-w-6xl' : 'max-w-lg'} max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 relative transition-all`}>
        {step !== 'DETAILS' && (
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors z-50 bg-slate-100 hover:bg-slate-200 p-1 rounded-full"
          >
            <X size={20} />
          </button>
        )}

        {/* STEP 1: PROMPT */}
        {step === 'PROMPT' && (
          <div className="p-8 text-center flex flex-col items-center overflow-y-auto custom-scrollbar">
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
          <div className="p-8 text-center flex flex-col items-center overflow-y-auto custom-scrollbar">
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
          <div className="flex flex-col h-full overflow-hidden">
            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white z-10 sticky top-0">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center border border-indigo-100">
                  <Building size={24} />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-800 leading-tight">{tenantDetails.name}</h2>
                  <p className="text-sm text-slate-500 flex items-center gap-2 mt-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span> Active Organization
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setEditMode(!editMode)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${editMode ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                >
                  {editMode ? 'Editing Mode' : 'Edit Details'} <Edit2 size={16} />
                </button>
                <button 
                  onClick={onClose}
                  className="p-2.5 text-slate-400 hover:text-red-500 bg-slate-100 hover:bg-red-50 rounded-lg transition-colors flex items-center justify-center"
                  title="Close Window"
                >
                  <X size={18} strokeWidth={2.5} />
                </button>
              </div>
            </div>

            <div className="p-8 overflow-y-auto custom-scrollbar flex-1 bg-slate-50/50">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                
                {/* Column 1: General Info */}
                <div className="space-y-6">
                  <div className="flex items-center gap-2 text-indigo-700 font-semibold border-b border-indigo-100 pb-2 mb-4">
                    <Building size={18} /> General Information
                  </div>
                  <InputField label="Organization Name" name="name" {...fieldProps} />
                  <InputField label="Domain" name="domain" {...fieldProps} />
                  <InputField label="Plan Tier" name="planTier" options={['Free', 'Pro', 'Enterprise']} {...fieldProps} />
                  <InputField label="Industry" name="industry" {...fieldProps} />
                  <InputField label="Company Size" name="size" options={['1-10', '11-50', '51-200', '201-500', '500+']} {...fieldProps} />
                  <InputField label="Founded Year" name="founded" type="number" {...fieldProps} />
                </div>

                {/* Column 2: Statutory Info */}
                <div className="space-y-6">
                  <div className="flex items-center gap-2 text-indigo-700 font-semibold border-b border-indigo-100 pb-2 mb-4">
                    <FileText size={18} /> Statutory Details
                  </div>
                  <InputField label="PAN Number" name="pan" {...fieldProps} />
                  <InputField label="GSTIN" name="gstin" {...fieldProps} />
                  <InputField label="CIN" name="cin" {...fieldProps} />
                  <InputField label="Onboarding Reminder (Days)" name="onboardingReminderDays" type="number" {...fieldProps} />
                </div>

                {/* Column 3: Location & Admins */}
                <div className="space-y-6">
                  <div className="flex items-center gap-2 text-indigo-700 font-semibold border-b border-indigo-100 pb-2 mb-4">
                    <MapPin size={18} /> Location
                  </div>
                  <InputField label="Street Address" name="address" {...fieldProps} />
                  <div className="grid grid-cols-2 gap-4">
                    <InputField label="City" name="city" {...fieldProps} />
                    <InputField label="State" name="state" {...fieldProps} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <InputField label="Pincode" name="pincode" {...fieldProps} />
                    <InputField label="Country" name="country" {...fieldProps} />
                  </div>
                  
                  <div className="mt-8">
                    <div className="flex items-center gap-2 text-indigo-700 font-semibold border-b border-indigo-100 pb-2 mb-4">
                      <Shield size={18} /> Admin Contacts
                    </div>
                    <div className="space-y-2">
                      {tenantDetails.users?.map(u => (
                        <div key={u.id} className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-200 shadow-sm gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-slate-800 font-medium text-sm truncate">{u.displayName}</p>
                            <p className="text-slate-500 text-xs truncate" title={u.email}>{u.email}</p>
                          </div>
                          <span className="px-2 py-1 bg-indigo-50 text-indigo-700 text-xs font-bold rounded uppercase tracking-wider shrink-0">{u.customRole || 'Admin'}</span>
                        </div>
                      ))}
                      {(!tenantDetails.users || tenantDetails.users.length === 0) && (
                        <p className="text-sm text-slate-500 italic">No admins found.</p>
                      )}
                    </div>
                  </div>
                </div>

              </div>
            </div>
            
            {/* Save Footer */}
            {editMode && (
              <div className="p-4 bg-white border-t border-slate-100 shrink-0 flex justify-end gap-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-10 sticky bottom-0">
                <button 
                  onClick={() => setEditMode(false)}
                  className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSave}
                  disabled={saving}
                  className="px-8 py-2.5 bg-primary-600 hover:bg-primary-500 text-white font-semibold rounded-xl transition-all flex justify-center items-center gap-2 shadow-md disabled:opacity-50"
                >
                  {saving ? <Loader2 className="animate-spin" size={20} /> : <><Save size={20} /> Save Changes</>}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TenantDetailsModal;
