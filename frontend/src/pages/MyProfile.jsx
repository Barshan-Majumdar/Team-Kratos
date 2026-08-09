import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Camera, Save, AlertCircle, CheckCircle2, User, Building, ShieldCheck, Wallet, ChevronRight, XCircle, Edit, ArrowRight } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { validateField } from '../utils/validators';
import { motion, AnimatePresence } from 'framer-motion';
import OTPVerification from '../components/shared/OTPVerification';
import SalaryInfoTab from '../components/salary/SalaryInfoTab';
import { ProfileSkeleton } from '../components/ui/Skeleton';

export const MyProfile = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('private'); // 'private' | 'salary'
  const [isEditing, setIsEditing] = useState(false);
  const [showSalaryEdit, setShowSalaryEdit] = useState(false);
  const [showAvatarEdit, setShowAvatarEdit] = useState(false);
  const [showVerifyOTP, setShowVerifyOTP] = useState(false);
  
  const [validations, setValidations] = useState({});
  const [fetchingBank, setFetchingBank] = useState(false);

  const handleSalarySave = async (data) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/users/${user.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          baseSalary: data.baseSalary,
          workingDaysPerWeek: data.workingDaysPerWeek,
          breakTimeHrs: data.breakTimeHrs
        })
      });
      if (res.ok) {
        await fetchProfile();
        setShowSalaryEdit(false);
        alert('Salary structure updated successfully in database!');
      } else {
        const errData = await res.json();
        alert(errData.error || 'Failed to update salary structure.');
      }
    } catch (err) {
      console.error(err);
      alert('Error updating salary structure.');
    }
  };
  
  const renderValidationIcon = (fieldName) => {
    if (validations[fieldName] === true) return <CheckCircle2 size={18} className="absolute right-3 top-3.5 text-emerald-500" />;
    if (validations[fieldName] === false) return <XCircle size={18} className="absolute right-3 top-3.5 text-rose-500" />;
    return null;
  };
  
  const [formData, setFormData] = useState({
    phone: '',
    residingAddress: '',
    personalEmail: '',
    gender: '',
    nationality: '',
    maritalStatus: '',
    bankName: '',
    bankBranch: '',
    accountNumber: '',
    ifscCode: '',
    panNo: '',
    aadharNo: '',
    voterIdNo: '',
    uanNo: '',
    dateOfBirth: '',
    avatar: ''
  });

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data);
        setFormData({
          phone: data.phone || '',
          residingAddress: data.residingAddress || '',
          personalEmail: data.personalEmail || '',
          gender: data.gender || '',
          nationality: data.nationality || '',
          maritalStatus: data.maritalStatus || '',
          bankName: data.bankName || '',
          bankBranch: data.bankBranch || '',
          accountNumber: data.accountNumber || '',
          ifscCode: data.ifscCode || '',
          panNo: data.panNo || '',
          aadharNo: data.aadharNo || '',
          voterIdNo: data.voterIdNo || '',
          uanNo: data.uanNo || '',
          dateOfBirth: data.dateOfBirth ? data.dateOfBirth.split('T')[0] : '',
          avatar: data.avatar || ''
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleChange = async (e) => {
    let { name, value } = e.target;
    
    if (['panNo', 'ifscCode', 'voterIdNo'].includes(name)) {
      value = value.toUpperCase();
    }
    
    setFormData(prev => ({ ...prev, [name]: value }));
    
    const isValid = validateField(name, value);
    setValidations(prev => ({ ...prev, [name]: isValid }));
    
    if (name === 'ifscCode' && isValid) {
      setFetchingBank(true);
      try {
        const res = await fetch(`https://ifsc.razorpay.com/${value}`);
        if (res.ok) {
          const data = await res.json();
          setFormData(prev => ({
            ...prev,
            bankName: data.BANK,
            bankBranch: data.BRANCH
          }));
        } else {
          setValidations(prev => ({ ...prev, ifscCode: false }));
          setFormData(prev => ({ ...prev, bankName: '', bankBranch: '' }));
        }
      } catch (error) {
        console.error("IFSC API Failed", error);
      } finally {
        setFetchingBank(false);
      }
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/users/me`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        await fetchProfile();
        setIsEditing(false);
        alert('Profile saved successfully!');
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to update profile');
      }
    } catch (error) {
      console.error(error);
      alert('Error updating profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !user) return <ProfileSkeleton />;

  const trackingFields = [
    'phone', 'residingAddress', 'personalEmail', 'gender', 'nationality', 'maritalStatus',
    'bankName', 'accountNumber', 'ifscCode', 'panNo', 'aadharNo', 'dateOfBirth'
  ];
  const filledFields = trackingFields.filter(field => user[field] && user[field].toString().trim() !== '');
  const completionPercentage = Math.round((filledFields.length / trackingFields.length) * 100);

  // Salary calculations (strictly fetched from DB: user.baseSalary)
  const base = user.baseSalary || 0;
  const basic = base * 0.5;
  const hra = base * 0.3;
  const special = base * 0.2;
  const pf = basic * 0.12;
  const esi = base > 21000 ? 0 : base * 0.0075;
  const tax = base > 50000 ? base * 0.1 : 0; // Simple mock tax
  const totalDeductions = pf + esi + tax;
  const netPay = base - totalDeductions;

  return (
    <div className="p-4 md:p-8 lg:p-12 max-w-5xl mx-auto pb-20">
      
      {/* Header Profile Section */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-[24px] p-5 md:p-8 mb-8 shadow-[0_1px_2px_rgba(29,27,22,0.04),0_8px_20px_rgba(29,27,22,0.06)] border border-[#EAE7E0] relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#F0F3F9] rounded-full blur-3xl -mr-20 -mt-20 opacity-60"></div>
        
        <div className="flex flex-col md:flex-row gap-6 md:gap-8 items-center md:items-center relative z-10 text-center md:text-left">
          <div className="relative group mx-auto md:mx-0">
            <div className="w-24 h-24 rounded-2xl bg-[#F0F3F9] text-[#1F2B4D] flex flex-col items-center justify-center shadow-inner overflow-hidden border-2 border-[#EAE7E0] shadow-lg">
              {user.avatar ? (
                <img src={user.avatar} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <span className="text-3xl font-bold">{user.displayName?.charAt(0).toUpperCase()}</span>
              )}
            </div>
            <button onClick={() => setShowAvatarEdit(true)} className="absolute -bottom-3 -right-3 w-10 h-10 bg-[#1F2B4D] text-white rounded-xl shadow-lg flex items-center justify-center hover:scale-110 transition-transform">
              <Camera size={18} />
            </button>
          </div>

          <div className="flex-1">
            <h1 className="text-2xl md:text-3xl font-bold text-[#1D1B16] tracking-tight">{user.displayName}</h1>
            <p className="text-[#6B655C] font-medium mt-1 flex items-center justify-center md:justify-start gap-2">
              <Building size={16} className="text-[#9A948A] shrink-0" />
              {user.jobPosition || user.role} &bull; {user.department || 'General'}
            </p>
            <div className="mt-2 flex items-center justify-center md:justify-start gap-2">
              <span className="text-[#6B655C] font-medium">{user.email}</span>
              {user.emailVerified ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
                  <CheckCircle2 size={14} /> Verified
                </span>
              ) : (
                <button 
                  onClick={() => setShowVerifyOTP(true)}
                  className="group flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-600 hover:text-white hover:border-rose-600 transition-all duration-300 shadow-sm hover:shadow-md"
                >
                  <div className="relative w-3.5 h-3.5 flex items-center justify-center">
                    <AlertCircle size={14} className="absolute inset-0 group-hover:scale-0 transition-transform duration-200" />
                    <ArrowRight size={14} className="absolute inset-0 scale-0 group-hover:scale-100 transition-transform duration-200" />
                  </div>
                  <span>Unverified &bull; Verify Now</span>
                </button>
              )}
            </div>
          </div>

          <div className="w-full md:w-64 bg-[#FAF9F6] p-4 rounded-2xl border border-[#EAE7E0]">
            <div className="flex justify-between items-end mb-2">
              <span className="font-semibold text-[#1F2B4D] text-sm tracking-wide">Completion</span>
              <span className="font-bold text-[#1F2B4D]">{completionPercentage}%</span>
            </div>
            <div className="h-2.5 w-full bg-[#EAE7E0] rounded-full overflow-hidden">
              <div 
                className="h-full bg-[#1F2B4D] transition-all duration-1000 ease-out rounded-full" 
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
          </div>
        </div>
      </motion.div>

      {/* Avatar Edit Modal (Base64 Upload) */}
      {showAvatarEdit && (
        <div className="fixed inset-0 bg-[#0F172A]/50 backdrop-blur-sm z-50 flex items-center justify-center px-4">
          <div className="bg-white p-6 rounded-[24px] w-full max-w-sm shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)] border border-[#EAE7E0]">
            <h3 className="font-bold text-[#1D1B16] mb-4">Upload Profile Picture</h3>
            <input 
              type="file" 
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onloadend = () => {
                    setFormData({...formData, avatar: reader.result});
                  };
                  reader.readAsDataURL(file);
                }
              }}
              className="w-full text-sm text-[#6B655C] file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-[#F0F3F9] file:text-[#1F2B4D] hover:file:bg-[#E2E8F0] mb-4"
            />
            {formData.avatar && formData.avatar !== user.avatar && (
               <div className="mb-4">
                 <p className="text-xs text-[#6B655C] mb-1">Preview:</p>
                 <img src={formData.avatar} className="w-20 h-20 rounded-xl object-cover border border-[#EAE7E0]" />
               </div>
            )}
            <div className="flex justify-end gap-3">
              <Button onClick={() => setShowAvatarEdit(false)} variant="secondary" className="px-4 py-2 bg-[#FAF9F6] text-[#6B655C] rounded-lg">Cancel</Button>
              <Button onClick={() => { setShowAvatarEdit(false); handleSave(new Event('submit')); }} variant="primary" className="px-4 py-2 bg-[#1F2B4D] hover:bg-[#151D36] text-white rounded-lg">Save Photo</Button>
            </div>
          </div>
        </div>
      )}

      {/* OTP Verification Modal */}
      {showVerifyOTP && (
        <OTPVerification 
          user={user} 
          onVerified={() => {
            setShowVerifyOTP(false);
            fetchProfile(); // Refresh profile to show verified badge
          }} 
        />
      )}

      {/* Tabs & Edit Toggle */}
      <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 mb-8">
        <div className="flex flex-col sm:flex-row w-full md:w-auto gap-2 sm:gap-4">
          <button 
            onClick={() => setActiveTab('private')}
            className={`px-4 sm:px-6 py-3 rounded-xl font-bold text-sm transition-all duration-300 flex items-center justify-center gap-2 ${activeTab === 'private' ? 'bg-[#1F2B4D] text-white shadow-lg shadow-[#1F2B4D]/30' : 'bg-white text-[#6B655C] hover:bg-[#FAF9F6] border border-[#EAE7E0]'}`}
          >
            <User size={18} /> Private Info
          </button>
          <button 
            onClick={() => setActiveTab('salary')}
            className={`px-4 sm:px-6 py-3 rounded-xl font-bold text-sm transition-all duration-300 flex items-center justify-center gap-2 ${activeTab === 'salary' ? 'bg-[#1F2B4D] text-white shadow-lg shadow-[#1F2B4D]/30' : 'bg-white text-[#6B655C] hover:bg-[#FAF9F6] border border-[#EAE7E0]'}`}
          >
            <Wallet size={18} /> Salary Info
          </button>
        </div>
        
        {activeTab === 'private' && (
          <Button 
            onClick={() => setIsEditing(!isEditing)} 
            variant={isEditing ? 'secondary' : 'primary'}
            className="rounded-xl px-6 w-full md:w-auto mt-2 md:mt-0 !bg-[#1F2B4D] !text-white hover:!bg-[#151D36] !border-0 shadow-lg shadow-[#1F2B4D]/30"
          >
            {isEditing ? 'Cancel Editing' : 'Edit Profile'}
          </Button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'private' && (
          <motion.form 
            key="private"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
            onSubmit={handleSave} 
            className="space-y-6"
          >
            {/* Always Editable Fields */}
            <Card className="p-5 md:p-8 rounded-3xl border-[#EAE7E0] shadow-[0_1px_2px_rgba(29,27,22,0.04),0_8px_20px_rgba(29,27,22,0.06)] relative overflow-hidden !bg-white">
              <div className="absolute top-0 left-0 w-2 h-full bg-[#1F2B4D]"></div>
              <h2 className="text-xl font-bold text-[#1D1B16] mb-6 flex flex-wrap items-center gap-2">
                Editable Details <span className="text-xs font-normal bg-[#F0F3F9] text-[#1F2B4D] border border-[#EAE7E0] px-2 py-0.5 rounded-full">Always Editable</span>
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-[#1F2B4D] mb-2">Phone / Mobile</label>
                  {isEditing ? (
                    <input type="text" name="phone" value={formData.phone} onChange={handleChange} className="w-full p-3 bg-[#FAF9F6] rounded-xl border border-[#EAE7E0] focus:border-[#1F2B4D] focus:ring-2 focus:ring-[#1F2B4D]/10 outline-none transition-all" placeholder="+91 9876543210" />
                  ) : (
                    <div className="w-full p-3 bg-[#FAF9F6]/50 rounded-xl border border-[#EAE7E0] text-[#6B655C]">{user.phone || '-'}</div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#1F2B4D] mb-2">Residing Address</label>
                  {isEditing ? (
                    <input type="text" name="residingAddress" value={formData.residingAddress} onChange={handleChange} className="w-full p-3 bg-[#FAF9F6] rounded-xl border border-[#EAE7E0] focus:border-[#1F2B4D] focus:ring-2 focus:ring-[#1F2B4D]/10 outline-none transition-all" />
                  ) : (
                    <div className="w-full p-3 bg-[#FAF9F6]/50 rounded-xl border border-[#EAE7E0] text-[#6B655C]">{user.residingAddress || '-'}</div>
                  )}
                </div>
              </div>
            </Card>

            {/* Once-submitted locked fields */}
            <Card className="p-5 md:p-8 rounded-3xl border-[#EAE7E0] shadow-[0_1px_2px_rgba(29,27,22,0.04),0_8px_20px_rgba(29,27,22,0.06)] relative overflow-hidden !bg-white">
              <div className="absolute top-0 left-0 w-2 h-full bg-amber-500"></div>
              <h2 className="text-xl font-bold text-[#1D1B16] mb-2 flex flex-wrap items-center gap-2">
                Personal & Bank Details 
                {user.role !== 'Admin' && <span className="text-xs font-normal bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full">One-Time Edit</span>}
              </h2>
              {user.role !== 'Admin' && (
                <p className="text-[#6B655C] text-sm mb-6">These fields are read-only once submitted. If you need to modify them later, contact an Admin.</p>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                <div>
                  <label className="block text-sm font-semibold text-[#1F2B4D] mb-2">Date of Birth</label>
                  {isEditing && (!user.dateOfBirth || user.role === 'Admin') ? (
                    <input type="date" name="dateOfBirth" value={formData.dateOfBirth} onChange={handleChange} className="w-full p-3 bg-[#FAF9F6] rounded-xl border border-[#EAE7E0] outline-none transition-all focus:border-[#1F2B4D] focus:ring-2 focus:ring-[#1F2B4D]/10" />
                  ) : (
                    <div className="w-full p-3 bg-[#FAF9F6] rounded-xl border border-[#EAE7E0] text-[#6B655C] flex items-center justify-between">
                       {user.dateOfBirth ? new Date(user.dateOfBirth).toLocaleDateString('en-IN') : '-'}
                       {user.dateOfBirth && <ShieldCheck size={16} className="text-emerald-500 shrink-0" />}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#1F2B4D] mb-2">Personal Email</label>
                  {isEditing && (!user.personalEmail || user.role === 'Admin') ? (
                    <input type="email" name="personalEmail" value={formData.personalEmail} onChange={handleChange} className="w-full p-3 bg-[#FAF9F6] rounded-xl border border-[#EAE7E0] outline-none transition-all focus:border-[#1F2B4D] focus:ring-2 focus:ring-[#1F2B4D]/10" />
                  ) : (
                    <div className="w-full p-3 bg-[#FAF9F6] rounded-xl border border-[#EAE7E0] text-[#6B655C] flex items-center justify-between">
                       {user.personalEmail || '-'}
                       {user.personalEmail && <ShieldCheck size={16} className="text-emerald-500 shrink-0" />}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#1F2B4D] mb-2">Nationality</label>
                  {isEditing && (!user.nationality || user.role === 'Admin') ? (
                    <input type="text" name="nationality" value={formData.nationality} onChange={handleChange} className="w-full p-3 bg-[#FAF9F6] rounded-xl border border-[#EAE7E0] outline-none transition-all focus:border-[#1F2B4D] focus:ring-2 focus:ring-[#1F2B4D]/10" />
                  ) : (
                    <div className="w-full p-3 bg-[#FAF9F6] rounded-xl border border-[#EAE7E0] text-[#6B655C] flex items-center justify-between">
                       {user.nationality || '-'}
                       {user.nationality && <ShieldCheck size={16} className="text-emerald-500 shrink-0" />}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#1F2B4D] mb-2">Gender</label>
                  {isEditing && (!user.gender || user.role === 'Admin') ? (
                    <select name="gender" value={formData.gender} onChange={handleChange} className="w-full p-3 bg-[#FAF9F6] rounded-xl border border-[#EAE7E0] outline-none transition-all focus:border-[#1F2B4D] focus:ring-2 focus:ring-[#1F2B4D]/10">
                      <option value="">Select...</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  ) : (
                    <div className="w-full p-3 bg-[#FAF9F6] rounded-xl border border-[#EAE7E0] text-[#6B655C] flex items-center justify-between">
                       {user.gender || '-'}
                       {user.gender && <ShieldCheck size={16} className="text-emerald-500 shrink-0" />}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Marital Status</label>
                  {isEditing && (!user.maritalStatus || user.role === 'Admin') ? (
                    <select name="maritalStatus" value={formData.maritalStatus} onChange={handleChange} className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100">
                      <option value="">Select...</option>
                      <option value="Single">Single</option>
                      <option value="Married">Married</option>
                    </select>
                  ) : (
                    <div className="w-full p-3 bg-slate-100 rounded-xl border border-slate-200 text-slate-500 flex items-center justify-between">
                       {user.maritalStatus || '-'}
                       {user.maritalStatus && <ShieldCheck size={16} className="text-emerald-500 shrink-0" />}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#1F2B4D] mb-2">Date of Joining</label>
                  <div className="w-full p-3 bg-[#FAF9F6] rounded-xl border border-[#EAE7E0] text-[#6B655C] flex items-center justify-between">
                     {new Date(user.dateOfJoining).toLocaleDateString('en-IN')}
                     <ShieldCheck size={16} className="text-emerald-500 shrink-0" />
                  </div>
                </div>
              </div>

              <div className="h-px w-full bg-[#EAE7E0] mb-8"></div>

              <h3 className="text-lg font-bold text-[#1D1B16] mb-6 flex items-center gap-2">Banking & KYC</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-[#1F2B4D] mb-2">Account Number</label>
                  {isEditing && (!user.accountNumber || user.role === 'Admin') ? (
                    <div className="relative">
                      <input type="text" name="accountNumber" value={formData.accountNumber} onChange={handleChange} className={`w-full p-3 pr-10 bg-[#FAF9F6] rounded-xl border ${validations.accountNumber === false ? 'border-rose-500' : 'border-[#EAE7E0]'} outline-none transition-all focus:border-[#1F2B4D] focus:ring-2 focus:ring-[#1F2B4D]/10 font-mono`} />
                      {renderValidationIcon('accountNumber')}
                    </div>
                  ) : (
                    <div className="w-full p-3 bg-[#FAF9F6] rounded-xl border border-[#EAE7E0] text-[#6B655C] flex items-center justify-between font-mono">
                       {user.accountNumber ? 'XXXX' + user.accountNumber.slice(-4) : '-'}
                       {user.accountNumber && <ShieldCheck size={16} className="text-emerald-500 shrink-0" />}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#1F2B4D] mb-2">Bank Name</label>
                  {isEditing && (!user.bankName || user.role === 'Admin') ? (
                    <input type="text" name="bankName" value={formData.bankName} onChange={handleChange} className="w-full p-3 bg-[#FAF9F6] rounded-xl border border-[#EAE7E0] outline-none transition-all focus:border-[#1F2B4D] focus:ring-2 focus:ring-[#1F2B4D]/10" />
                  ) : (
                    <div className="w-full p-3 bg-[#FAF9F6] rounded-xl border border-[#EAE7E0] text-[#6B655C] flex items-center justify-between">
                       {user.bankName || '-'}
                       {user.bankName && <ShieldCheck size={16} className="text-emerald-500 shrink-0" />}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#1F2B4D] mb-2">Bank Branch</label>
                  {isEditing && (!user.bankBranch || user.role === 'Admin') ? (
                    <input type="text" name="bankBranch" value={formData.bankBranch} onChange={handleChange} className="w-full p-3 bg-[#FAF9F6] rounded-xl border border-[#EAE7E0] outline-none transition-all focus:border-[#1F2B4D] focus:ring-2 focus:ring-[#1F2B4D]/10" />
                  ) : (
                    <div className="w-full p-3 bg-[#FAF9F6] rounded-xl border border-[#EAE7E0] text-[#6B655C] flex items-center justify-between">
                       {user.bankBranch || '-'}
                       {user.bankBranch && <ShieldCheck size={16} className="text-emerald-500 shrink-0" />}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#1F2B4D] mb-2">IFSC Code</label>
                  {isEditing && (!user.ifscCode || user.role === 'Admin') ? (
                    <div className="relative">
                      <input type="text" name="ifscCode" value={formData.ifscCode} onChange={handleChange} className={`w-full p-3 pr-10 bg-[#FAF9F6] rounded-xl border ${validations.ifscCode === false ? 'border-rose-500' : 'border-[#EAE7E0]'} outline-none transition-all focus:border-[#1F2B4D] focus:ring-2 focus:ring-[#1F2B4D]/10 font-mono uppercase`} />
                      {fetchingBank ? <span className="absolute right-3 top-3.5 text-xs text-[#9A948A]">Wait...</span> : renderValidationIcon('ifscCode')}
                    </div>
                  ) : (
                    <div className="w-full p-3 bg-[#FAF9F6] rounded-xl border border-[#EAE7E0] text-[#6B655C] flex items-center justify-between font-mono uppercase">
                       {user.ifscCode || '-'}
                       {user.ifscCode && <ShieldCheck size={16} className="text-emerald-500 shrink-0" />}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#1F2B4D] mb-2">PAN No</label>
                  {isEditing && (!user.panNo || user.role === 'Admin') ? (
                    <div className="relative">
                      <input type="text" name="panNo" value={formData.panNo} onChange={handleChange} className={`w-full p-3 pr-10 bg-[#FAF9F6] rounded-xl border ${validations.panNo === false ? 'border-rose-500' : 'border-[#EAE7E0]'} outline-none transition-all focus:border-[#1F2B4D] focus:ring-2 focus:ring-[#1F2B4D]/10 font-mono uppercase`} />
                      {renderValidationIcon('panNo')}
                    </div>
                  ) : (
                    <div className="w-full p-3 bg-[#FAF9F6] rounded-xl border border-[#EAE7E0] text-[#6B655C] flex items-center justify-between font-mono uppercase">
                       {user.panNo ? user.panNo.replace(/.(?=.{4})/g, '*') : '-'}
                       {user.panNo && <ShieldCheck size={16} className="text-emerald-500 shrink-0" />}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#1F2B4D] mb-2">Aadhar No</label>
                  {isEditing && (!user.aadharNo || user.role === 'Admin') ? (
                    <div className="relative">
                      <input type="text" name="aadharNo" value={formData.aadharNo} onChange={handleChange} className={`w-full p-3 pr-10 bg-[#FAF9F6] rounded-xl border ${validations.aadharNo === false ? 'border-rose-500' : 'border-[#EAE7E0]'} outline-none transition-all focus:border-[#1F2B4D] focus:ring-2 focus:ring-[#1F2B4D]/10 font-mono`} />
                      {renderValidationIcon('aadharNo')}
                    </div>
                  ) : (
                    <div className="w-full p-3 bg-[#FAF9F6] rounded-xl border border-[#EAE7E0] text-[#6B655C] flex items-center justify-between font-mono">
                       {user.aadharNo ? 'XXXX XXXX ' + user.aadharNo.slice(-4) : '-'}
                       {user.aadharNo && <ShieldCheck size={16} className="text-emerald-500 shrink-0" />}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#1F2B4D] mb-2">Voter ID (EPIC)</label>
                  {isEditing && (!user.voterIdNo || user.role === 'Admin') ? (
                    <div className="relative">
                      <input type="text" name="voterIdNo" value={formData.voterIdNo} onChange={handleChange} className={`w-full p-3 pr-10 bg-[#FAF9F6] rounded-xl border ${validations.voterIdNo === false ? 'border-rose-500' : 'border-[#EAE7E0]'} outline-none transition-all focus:border-[#1F2B4D] focus:ring-2 focus:ring-[#1F2B4D]/10 font-mono uppercase`} />
                      {renderValidationIcon('voterIdNo')}
                    </div>
                  ) : (
                    <div className="w-full p-3 bg-[#FAF9F6] rounded-xl border border-[#EAE7E0] text-[#6B655C] flex items-center justify-between font-mono uppercase">
                       {user.voterIdNo || '-'}
                       {user.voterIdNo && <ShieldCheck size={16} className="text-emerald-500 shrink-0" />}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#1F2B4D] mb-2">UAN No</label>
                  {isEditing && (!user.uanNo || user.role === 'Admin') ? (
                    <div className="relative">
                      <input type="text" name="uanNo" value={formData.uanNo} onChange={handleChange} className={`w-full p-3 pr-10 bg-[#FAF9F6] rounded-xl border ${validations.uanNo === false ? 'border-rose-500' : 'border-[#EAE7E0]'} outline-none transition-all focus:border-[#1F2B4D] focus:ring-2 focus:ring-[#1F2B4D]/10 font-mono`} />
                      {renderValidationIcon('uanNo')}
                    </div>
                  ) : (
                    <div className="w-full p-3 bg-[#FAF9F6] rounded-xl border border-[#EAE7E0] text-[#6B655C] flex items-center justify-between font-mono">
                       {user.uanNo || '-'}
                       {user.uanNo && <ShieldCheck size={16} className="text-emerald-500 shrink-0" />}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#1F2B4D] mb-2">Employee Code</label>
                  <div className="w-full p-3 bg-[#FAF9F6] rounded-xl border border-[#EAE7E0] text-[#6B655C] flex items-center justify-between font-mono">
                     {user.employeeId}
                     <ShieldCheck size={16} className="text-emerald-500 shrink-0" />
                  </div>
                </div>
              </div>
            </Card>

            {isEditing && (
              <div className="flex justify-center md:justify-end pt-4 sticky bottom-6 z-20">
                <Button type="submit" disabled={saving} className="w-full md:w-auto px-8 py-3 rounded-xl bg-[#1F2B4D] hover:bg-[#151D36] text-white font-bold flex items-center justify-center gap-2 shadow-lg shadow-[#1F2B4D]/30 transition-all">
                  <Save size={18} />
                  {saving ? 'Saving...' : 'Save Changes & Lock'}
                </Button>
              </div>
            )}
          </motion.form>
        )}

        {activeTab === 'salary' && (
          <motion.div 
            key="salary"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-[#1D1B16]">Salary & Compensation Breakdown</h2>
              {(user.role === 'Admin' || user.customRole === 'SuperAdmin' || (user.roleDefinition && user.roleDefinition.level <= 2)) && (
                <Button 
                  onClick={() => setShowSalaryEdit(!showSalaryEdit)} 
                  variant="outline" 
                  className="flex items-center gap-2 border-[#1F2B4D] text-[#1F2B4D] hover:bg-[#F0F3F9]"
                >
                  <Edit size={16} />
                  {showSalaryEdit ? 'View Salary Summary' : 'Configure Base Salary & Structure'}
                </Button>
              )}
            </div>

            {showSalaryEdit ? (
              <Card className="p-6 !bg-white">
                <SalaryInfoTab user={user} readOnly={false} onSave={handleSalarySave} />
              </Card>
            ) : (
              <>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  
                  {/* Summary Card */}
                  <Card className="p-5 md:p-8 rounded-3xl border-[#EAE7E0] shadow-[0_1px_2px_rgba(29,27,22,0.04),0_8px_20px_rgba(29,27,22,0.06)] bg-[#1F2B4D] text-white relative overflow-hidden">
                    <div className="absolute -top-20 -right-20 w-64 h-64 bg-white rounded-full blur-3xl opacity-5"></div>
                    <h3 className="text-[#9A948A] font-semibold mb-2 tracking-wide text-sm uppercase">Monthly Net Pay</h3>
                    <p className="text-4xl md:text-5xl font-bold mb-8">₹{netPay.toLocaleString()}</p>
                    
                    <div className="space-y-4">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-[#9A948A]">Gross Monthly Wage</span>
                        <span className="font-semibold text-white">₹{base.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-[#9A948A]">Total Deductions</span>
                        <span className="font-semibold text-rose-300">-₹{totalDeductions.toLocaleString()}</span>
                      </div>
                      <div className="h-px bg-white/10 w-full my-2"></div>
                      <div className="flex justify-between items-center text-sm font-bold">
                        <span className="text-white">Annual CTC</span>
                        <span className="text-[#EAE7E0]">₹{(base * 12).toLocaleString()}</span>
                      </div>
                    </div>
                  </Card>

                  {/* Earnings Breakdown */}
                  <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card className="p-5 md:p-8 rounded-3xl border-[#EAE7E0] shadow-[0_1px_2px_rgba(29,27,22,0.04),0_8px_20px_rgba(29,27,22,0.06)] !bg-white">
                      <h3 className="text-lg font-bold text-[#1D1B16] mb-6 flex items-center gap-2">Earnings</h3>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center p-3 rounded-xl bg-[#FAF9F6]">
                          <span className="text-[#6B655C] font-medium text-sm">Basic Salary (50%)</span>
                          <span className="font-bold text-[#1F2B4D]">₹{basic.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 rounded-xl bg-[#FAF9F6]">
                          <span className="text-[#6B655C] font-medium text-sm">HRA (30%)</span>
                          <span className="font-bold text-[#1F2B4D]">₹{hra.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 rounded-xl bg-[#FAF9F6]">
                          <span className="text-[#6B655C] font-medium text-sm">Special Allowance (20%)</span>
                          <span className="font-bold text-[#1F2B4D]">₹{special.toLocaleString()}</span>
                        </div>
                      </div>
                    </Card>

                    <Card className="p-5 md:p-8 rounded-3xl border-[#EAE7E0] shadow-[0_1px_2px_rgba(29,27,22,0.04),0_8px_20px_rgba(29,27,22,0.06)] !bg-white">
                      <h3 className="text-lg font-bold text-rose-600 mb-6 flex items-center gap-2">Deductions</h3>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center p-3 rounded-xl bg-rose-50/50">
                          <span className="text-[#6B655C] font-medium text-sm">Provident Fund (12%)</span>
                          <span className="font-bold text-rose-600">-₹{pf.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 rounded-xl bg-rose-50/50">
                          <span className="text-[#6B655C] font-medium text-sm">ESI</span>
                          <span className="font-bold text-rose-600">-₹{esi.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 rounded-xl bg-rose-50/50">
                          <span className="text-[#6B655C] font-medium text-sm">Tax (TDS)</span>
                          <span className="font-bold text-rose-600">-₹{tax.toLocaleString()}</span>
                        </div>
                      </div>
                    </Card>
                  </div>
                </div>
                
                {base === 0 ? (
                  <div className="bg-amber-50 text-amber-800 p-4 rounded-2xl flex items-start gap-3 mt-4 text-sm font-medium border border-amber-200">
                    <AlertCircle className="shrink-0 mt-0.5 text-amber-600" />
                    <div>
                      <strong>Salary Structure Unassigned:</strong> Your base salary has not been configured in the HR database yet. Click <strong>Configure Base Salary & Structure</strong> above to assign a base wage.
                    </div>
                  </div>
                ) : (
                  <div className="bg-blue-50 text-blue-700 p-4 rounded-2xl flex items-start gap-3 mt-4 text-sm font-medium border border-blue-100">
                    <ShieldCheck className="shrink-0 mt-0.5 text-blue-500" />
                    <div>
                      Your salary structure is strictly managed by HR/Admin. If you notice any discrepancies in your earnings or deductions, please reach out to the Finance department immediately.
                    </div>
                  </div>
                )}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

