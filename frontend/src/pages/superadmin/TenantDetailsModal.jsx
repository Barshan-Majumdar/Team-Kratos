import React, { useState } from 'react';
import { X, Mail, Shield, Building, Edit2, Loader2, Save, MapPin, FileText } from 'lucide-react';
import { API_BASE } from '../../lib/api';
import toast from 'react-hot-toast';

const InputField = ({ label, name, type = 'text', options = null, editMode, formData, handleChange, tenantDetails }) => (
  <div>
    <label className="block text-[10px] font-display font-bold text-[#6B655C] uppercase tracking-wider mb-1">{label}</label>
    {editMode ? (
      options ? (
        <select 
          name={name}
          value={formData[name]} 
          onChange={handleChange}
          className="w-full bg-[#FAF9F6] border border-[#EAE7E0] rounded-xl px-4 py-2.5 text-[#1F2B4D] font-medium text-sm outline-none focus:border-[#1F2B4D] focus:ring-4 focus:ring-[#1F2B4D]/10 transition-all"
        >
          {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
      ) : (
        <input 
          type={type} 
          name={name}
          value={formData[name]} 
          onChange={handleChange}
          className="w-full bg-[#FAF9F6] border border-[#EAE7E0] rounded-xl px-4 py-2.5 text-[#1F2B4D] font-medium text-sm outline-none focus:border-[#1F2B4D] focus:ring-4 focus:ring-[#1F2B4D]/10 transition-all"
        />
      )
    ) : (
      <div className="px-4 py-2.5 bg-[#FAF9F6] border border-[#EAE7E0] rounded-xl text-[#1F2B4D] font-bold text-sm">
        {tenantDetails[name] || <span className="text-[#9A948A] italic font-medium">Not specified</span>}
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#1F2B4D]/40 backdrop-blur-md">
      <div className={`bg-white border border-[#EAE7E0] rounded-[24px] shadow-2xl w-full ${step === 'DETAILS' ? 'max-w-6xl' : 'max-w-lg'} max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 relative transition-all`}>
        {step !== 'DETAILS' && (
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-[#6B655C] hover:text-[#1F2B4D] transition-colors z-50 bg-[#F4F1EA] hover:bg-[#EAE7E0] p-1.5 rounded-full"
          >
            <X size={20} />
          </button>
        )}

        {/* STEP 1: PROMPT */}
        {step === 'PROMPT' && (
          <div className="p-10 text-center flex flex-col items-center overflow-y-auto custom-scrollbar">
            <div className="w-16 h-16 bg-[#F0F3F9] text-[#1F2B4D] rounded-full flex items-center justify-center mb-6 border border-[#EAE7E0]">
              <Shield size={32} />
            </div>
            <h2 className="text-2xl font-serif font-bold text-[#1F2B4D] mb-3">Request Access</h2>
            <p className="text-[#6B655C] mb-8 text-sm font-medium">
              To view or edit sensitive company details, an OTP will be sent to the organization's CEO for authorization. Do you wish to proceed?
            </p>
            <div className="flex w-full gap-4">
              <button 
                onClick={onClose}
                className="flex-1 py-3 bg-[#FAF8F5] border border-[#EAE7E0] hover:bg-[#F4F1EA] text-[#6B655C] hover:text-[#1F2B4D] font-bold rounded-xl transition-all text-sm"
              >
                No, Cancel
              </button>
              <button 
                onClick={handleRequestAccess}
                disabled={loading}
                className="flex-1 py-3 bg-[#1F2B4D] hover:bg-[#141C33] text-white font-bold rounded-xl transition-all shadow-md flex justify-center items-center gap-2 disabled:opacity-70 text-sm"
              >
                {loading ? <Loader2 className="animate-spin" size={20} /> : 'Yes, Request OTP'}
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: OTP */}
        {step === 'OTP' && (
          <div className="p-10 text-center flex flex-col items-center overflow-y-auto custom-scrollbar">
            <div className="w-16 h-16 bg-[#F0F3F9] text-[#1F2B4D] rounded-full flex items-center justify-center mb-6 border border-[#EAE7E0]">
              <Mail size={32} />
            </div>
            <h2 className="text-2xl font-serif font-bold text-[#1F2B4D] mb-3">Enter OTP</h2>
            <p className="text-[#6B655C] mb-8 text-sm font-medium">
              We've sent a 6-digit code to <span className="text-[#1F2B4D] font-bold">{adminEmail}</span>.
            </p>

            <form onSubmit={handleVerifyOTP} className="w-full">
              <div className="flex justify-between gap-2 mb-10">
                {otp.map((data, index) => (
                  <input
                    key={index}
                    type="text"
                    maxLength="1"
                    value={data}
                    onChange={(e) => handleOtpChange(e.target, index)}
                    onKeyDown={(e) => handleOtpKeyDown(e, index)}
                    className="w-14 h-16 bg-[#FAF9F6] border-2 border-[#EAE7E0] rounded-xl text-center text-2xl font-bold text-[#1F2B4D] focus:border-[#1F2B4D] focus:bg-white focus:ring-4 focus:ring-[#1F2B4D]/10 outline-none transition-all"
                  />
                ))}
              </div>
              <button
                type="submit"
                disabled={loading || otp.join('').length !== 6}
                className="w-full bg-[#1F2B4D] hover:bg-[#141C33] text-white rounded-xl py-4 font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-md disabled:opacity-50"
              >
                {loading ? <Loader2 className="animate-spin" size={20} /> : 'Verify & Access'}
              </button>
            </form>
          </div>
        )}

        {/* STEP 3: DETAILS */}
        {step === 'DETAILS' && tenantDetails && (
          <div className="flex flex-col h-full overflow-hidden bg-[#FAF9F6]">
            <div className="px-8 py-6 border-b border-[#EAE7E0] flex items-center justify-between shrink-0 bg-white z-10 sticky top-0">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-[#F0F3F9] text-[#1F2B4D] rounded-xl flex items-center justify-center border border-[#EAE7E0]">
                  <Building size={24} />
                </div>
                <div>
                  <h2 className="text-2xl font-serif font-bold text-[#1F2B4D] leading-tight">{tenantDetails.name}</h2>
                  <p className="text-xs text-[#6B655C] font-bold flex items-center gap-2 mt-1">
                    <span className="w-2 h-2 rounded-full bg-[#10B981] inline-block shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span> Active Organization
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setEditMode(!editMode)}
                  className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-2 ${editMode ? 'bg-[#1F2B4D] text-white shadow-md' : 'bg-[#FAF8F5] border border-[#EAE7E0] text-[#1F2B4D] hover:bg-[#F4F1EA]'}`}
                >
                  {editMode ? 'Editing Mode' : 'Edit Details'} <Edit2 size={16} />
                </button>
                <button 
                  onClick={onClose}
                  className="p-2.5 text-[#6B655C] hover:text-[#B5793A] bg-[#FAF8F5] border border-[#EAE7E0] hover:bg-[#FDF8F3] rounded-xl transition-colors flex items-center justify-center"
                  title="Close Window"
                >
                  <X size={18} strokeWidth={2.5} />
                </button>
              </div>
            </div>

            <div className="p-8 overflow-y-auto custom-scrollbar flex-1 bg-[#FAF9F6]">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                
                {/* Column 1: General Info */}
                <div className="space-y-6">
                  <div className="flex items-center gap-2 text-[#1F2B4D] font-bold text-sm border-b border-[#EAE7E0] pb-2 mb-4 uppercase tracking-widest">
                    <Building size={16} /> General Information
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
                  <div className="flex items-center gap-2 text-[#1F2B4D] font-bold text-sm border-b border-[#EAE7E0] pb-2 mb-4 uppercase tracking-widest">
                    <FileText size={16} /> Statutory Details
                  </div>
                  <InputField label="PAN Number" name="pan" {...fieldProps} />
                  <InputField label="GSTIN" name="gstin" {...fieldProps} />
                  <InputField label="CIN" name="cin" {...fieldProps} />
                  <InputField label="Onboarding Reminder (Days)" name="onboardingReminderDays" type="number" {...fieldProps} />
                </div>

                {/* Column 3: Location & Admins */}
                <div className="space-y-6">
                  <div className="flex items-center gap-2 text-[#1F2B4D] font-bold text-sm border-b border-[#EAE7E0] pb-2 mb-4 uppercase tracking-widest">
                    <MapPin size={16} /> Location
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
                    <div className="flex items-center gap-2 text-[#1F2B4D] font-bold text-sm border-b border-[#EAE7E0] pb-2 mb-4 uppercase tracking-widest">
                      <Shield size={16} /> Admin Contacts
                    </div>
                    <div className="space-y-3">
                      {tenantDetails.users?.map(u => (
                        <div key={u.id} className="flex justify-between items-center bg-white p-4 rounded-[16px] border border-[#EAE7E0] shadow-sm gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-[#1F2B4D] font-bold text-sm truncate">{u.displayName}</p>
                            <p className="text-[#6B655C] text-xs font-medium truncate mt-0.5" title={u.email}>{u.email}</p>
                          </div>
                          <span className="px-2.5 py-1 bg-[#F0F3F9] text-[#1F2B4D] border border-[#EAE7E0] text-[10px] font-bold rounded-md uppercase tracking-widest shrink-0">{u.customRole || 'Admin'}</span>
                        </div>
                      ))}
                      {(!tenantDetails.users || tenantDetails.users.length === 0) && (
                        <p className="text-xs text-[#9A948A] font-medium italic">No admins found.</p>
                      )}
                    </div>
                  </div>
                </div>

              </div>
            </div>
            
            {/* Save Footer */}
            {editMode && (
              <div className="p-5 bg-white border-t border-[#EAE7E0] shrink-0 flex justify-end gap-3 z-10 sticky bottom-0">
                <button 
                  onClick={() => setEditMode(false)}
                  className="px-6 py-2.5 bg-[#FAF8F5] border border-[#EAE7E0] hover:bg-[#F4F1EA] text-[#6B655C] hover:text-[#1F2B4D] font-bold text-xs rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSave}
                  disabled={saving}
                  className="px-8 py-2.5 bg-[#1F2B4D] hover:bg-[#141C33] text-white font-bold text-xs rounded-xl transition-all flex justify-center items-center gap-2 shadow-md disabled:opacity-50"
                >
                  {saving ? <Loader2 className="animate-spin" size={16} /> : <><Save size={16} /> Save Changes</>}
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
