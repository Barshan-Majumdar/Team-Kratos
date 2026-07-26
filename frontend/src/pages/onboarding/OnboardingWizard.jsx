import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, ChevronRight, UploadCloud, AlertCircle } from 'lucide-react';

const OnboardingWizard = () => {
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user') || '{}'));
  const [currentStep, setCurrentStep] = useState('personal_details');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // Form states
  const [personalDetails, setPersonalDetails] = useState({
    dateOfBirth: user.dateOfBirth ? user.dateOfBirth.split('T')[0] : '',
    gender: user.gender || '',
    maritalStatus: user.maritalStatus || '',
    residingAddress: user.residingAddress || '',
    phone: user.phone || ''
  });

  const [emergencyContact, setEmergencyContact] = useState({
    emergencyContactName: '',
    emergencyContactRelation: '',
    emergencyContactPhone: ''
  });

  const [financialDetails, setFinancialDetails] = useState({
    bankName: user.bankName || '',
    bankBranch: user.bankBranch || '',
    accountNumber: '', // masked or empty for security by default unless viewing
    ifscCode: user.ifscCode || ''
  });

  const [statutoryDetails, setStatutoryDetails] = useState({
    panNo: user.panNo || '',
    aadharLast4: user.aadharLast4 || ''
  });

  const [documents, setDocuments] = useState({
    panDoc: null,
    aadharDoc: null
  });

  const stepOrder = ['personal_details', 'emergency_contact', 'financial_details', 'statutory_details', 'completed'];
  
  useEffect(() => {
    // If user's DB state is ahead of our local state, sync it
    if (user.onboardingCompleted) {
      navigate('/dashboard');
    } else if (user.onboardingStep) {
      setCurrentStep(user.onboardingStep);
    }
  }, [user, navigate]);

  const apiBase = import.meta.env.VITE_API_URL || "http://localhost:5000";
  const token = localStorage.getItem('token');

  const handleNext = async (stepName, payload) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${apiBase}/api/onboarding/wizard-step`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ step: stepName, data: payload })
      });
      
      const data = await res.json();
      if (!res.ok) {
        let errMsg = data.error;
        if (Array.isArray(errMsg)) {
          errMsg = errMsg.map(e => e.message).join(', ');
        } else if (typeof errMsg === 'object' && errMsg !== null) {
          errMsg = JSON.stringify(errMsg);
        }
        throw new Error(errMsg || 'Failed to save step');
      }
      
      // Update local storage
      localStorage.setItem('user', JSON.stringify(data));
      setUser(data);
      if (data.onboardingCompleted) {
        navigate('/dashboard');
      } else {
        setCurrentStep(data.onboardingStep);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (type, file) => {
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);

    try {
      const res = await fetch(`${apiBase}/api/onboarding/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      return data.document;
    } catch (err) {
      setError(`Failed to upload ${type}: ${err.message}`);
      throw err;
    }
  };

  const submitStatutory = async () => {
    setLoading(true);
    setError(null);

    // Local validation to prevent long uploads on invalid data
    if (statutoryDetails.panNo && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/i.test(statutoryDetails.panNo)) {
      setError("Invalid PAN format (expected format: ABCDE1234F)");
      setLoading(false);
      return;
    }
    if (statutoryDetails.aadharLast4 && !/^[0-9]{4}$/.test(statutoryDetails.aadharLast4)) {
      setError("Aadhaar must be exactly 4 digits");
      setLoading(false);
      return;
    }

    try {
      if (documents.panDoc) await handleFileUpload('PAN', documents.panDoc);
      if (documents.aadharDoc) await handleFileUpload('AADHAAR', documents.aadharDoc);
      
      await handleNext('statutory_details', statutoryDetails);
    } catch (err) {
      setLoading(false);
    }
  };

  const currentIdx = stepOrder.indexOf(currentStep);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl w-full space-y-8">
        <div>
          <h2 className="text-center text-3xl font-extrabold text-slate-900">
            Welcome to the team!
          </h2>
          <p className="mt-2 text-center text-sm text-slate-600">
            Let's get your profile set up so you can access your dashboard.
          </p>
        </div>

        {/* Progress Bar */}
        <div className="flex items-center justify-between mb-8 relative">
          <div className="absolute left-0 top-1/2 w-full h-1 bg-slate-200 -z-10 -translate-y-1/2"></div>
          {['Personal', 'Emergency', 'Financial', 'Statutory'].map((label, i) => {
            const isActive = i === currentIdx;
            const isDone = i < currentIdx;
            return (
              <div key={label} className="flex flex-col items-center gap-2 bg-slate-50 px-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm border-2 ${
                  isDone ? 'bg-indigo-600 border-indigo-600 text-white' : 
                  isActive ? 'bg-white border-indigo-600 text-indigo-600' : 'bg-white border-slate-300 text-slate-400'
                }`}>
                  {isDone ? <CheckCircle2 size={16} /> : i + 1}
                </div>
                <span className={`text-xs font-medium ${isActive || isDone ? 'text-slate-800' : 'text-slate-400'}`}>{label}</span>
              </div>
            );
          })}
        </div>

        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
          {error && (
            <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-xl flex items-center gap-3">
              <AlertCircle size={20} />
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}

          {currentStep === 'personal_details' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
              <h3 className="text-xl font-bold text-slate-800 border-b pb-4">Personal Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Date of Birth</label>
                  <input type="date" className="w-full px-4 py-2 border rounded-xl" 
                    value={personalDetails.dateOfBirth} onChange={e => setPersonalDetails({...personalDetails, dateOfBirth: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Gender</label>
                  <select className="w-full px-4 py-2 border rounded-xl"
                    value={personalDetails.gender} onChange={e => setPersonalDetails({...personalDetails, gender: e.target.value})}>
                    <option value="">Select...</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Marital Status</label>
                  <select className="w-full px-4 py-2 border rounded-xl"
                    value={personalDetails.maritalStatus} onChange={e => setPersonalDetails({...personalDetails, maritalStatus: e.target.value})}>
                    <option value="">Select...</option>
                    <option value="Single">Single</option>
                    <option value="Married">Married</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number</label>
                  <input type="tel" className="w-full px-4 py-2 border rounded-xl" placeholder="+1234567890"
                    value={personalDetails.phone} onChange={e => setPersonalDetails({...personalDetails, phone: e.target.value})} />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Residing Address</label>
                  <textarea className="w-full px-4 py-2 border rounded-xl" rows={3}
                    value={personalDetails.residingAddress} onChange={e => setPersonalDetails({...personalDetails, residingAddress: e.target.value})} />
                </div>
              </div>
              <button disabled={loading} onClick={() => handleNext('personal_details', personalDetails)}
                className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition flex items-center justify-center gap-2">
                {loading ? 'Saving...' : 'Next Step'} <ChevronRight size={18} />
              </button>
            </div>
          )}

          {currentStep === 'emergency_contact' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
              <h3 className="text-xl font-bold text-slate-800 border-b pb-4">Emergency Contact</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Contact Name</label>
                  <input type="text" className="w-full px-4 py-2 border rounded-xl"
                    value={emergencyContact.emergencyContactName} onChange={e => setEmergencyContact({...emergencyContact, emergencyContactName: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Relation</label>
                  <input type="text" className="w-full px-4 py-2 border rounded-xl" placeholder="e.g. Spouse, Parent"
                    value={emergencyContact.emergencyContactRelation} onChange={e => setEmergencyContact({...emergencyContact, emergencyContactRelation: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number</label>
                  <input type="tel" className="w-full px-4 py-2 border rounded-xl"
                    value={emergencyContact.emergencyContactPhone} onChange={e => setEmergencyContact({...emergencyContact, emergencyContactPhone: e.target.value})} />
                </div>
              </div>
              <button disabled={loading} onClick={() => handleNext('emergency_contact', emergencyContact)}
                className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition flex items-center justify-center gap-2">
                {loading ? 'Saving...' : 'Next Step'} <ChevronRight size={18} />
              </button>
            </div>
          )}

          {currentStep === 'financial_details' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
              <h3 className="text-xl font-bold text-slate-800 border-b pb-4">Financial Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Bank Name</label>
                  <input type="text" className="w-full px-4 py-2 border rounded-xl"
                    value={financialDetails.bankName} onChange={e => setFinancialDetails({...financialDetails, bankName: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Bank Branch</label>
                  <input type="text" className="w-full px-4 py-2 border rounded-xl"
                    value={financialDetails.bankBranch} onChange={e => setFinancialDetails({...financialDetails, bankBranch: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Account Number</label>
                  <input type="password" placeholder="••••••••" className="w-full px-4 py-2 border rounded-xl"
                    value={financialDetails.accountNumber} onChange={e => setFinancialDetails({...financialDetails, accountNumber: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">IFSC Code</label>
                  <input type="text" className="w-full px-4 py-2 border rounded-xl uppercase"
                    value={financialDetails.ifscCode} onChange={e => setFinancialDetails({...financialDetails, ifscCode: e.target.value.toUpperCase()})} />
                </div>
              </div>
              <button disabled={loading} onClick={() => handleNext('financial_details', financialDetails)}
                className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition flex items-center justify-center gap-2">
                {loading ? 'Saving...' : 'Next Step'} <ChevronRight size={18} />
              </button>
            </div>
          )}

          {currentStep === 'statutory_details' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
              <h3 className="text-xl font-bold text-slate-800 border-b pb-4">Statutory Uploads</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">PAN Number</label>
                    <input type="text" className="w-full px-4 py-2 border rounded-xl uppercase" placeholder="ABCDE1234F"
                      value={statutoryDetails.panNo} onChange={e => setStatutoryDetails({...statutoryDetails, panNo: e.target.value.toUpperCase()})} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Upload PAN Card Image</label>
                    <div className="border-2 border-dashed border-slate-300 rounded-xl p-4 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-slate-50 transition">
                      <input type="file" className="hidden" id="panUpload" accept="image/*" onChange={e => setDocuments({...documents, panDoc: e.target.files[0]})} />
                      <label htmlFor="panUpload" className="cursor-pointer flex flex-col items-center w-full">
                        <UploadCloud size={24} className="text-slate-400 mb-2" />
                        <span className="text-sm text-slate-600 font-medium">{documents.panDoc ? documents.panDoc.name : 'Click to select file'}</span>
                        <span className="text-xs text-slate-400 mt-1">Image files up to 5MB</span>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Aadhaar (Last 4 digits only)</label>
                    <input type="text" maxLength={4} className="w-full px-4 py-2 border rounded-xl" placeholder="1234"
                      value={statutoryDetails.aadharLast4} onChange={e => setStatutoryDetails({...statutoryDetails, aadharLast4: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Upload Aadhaar Card Image</label>
                    <div className="border-2 border-dashed border-slate-300 rounded-xl p-4 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-slate-50 transition">
                      <input type="file" className="hidden" id="aadharUpload" accept="image/*" onChange={e => setDocuments({...documents, aadharDoc: e.target.files[0]})} />
                      <label htmlFor="aadharUpload" className="cursor-pointer flex flex-col items-center w-full">
                        <UploadCloud size={24} className="text-slate-400 mb-2" />
                        <span className="text-sm text-slate-600 font-medium">{documents.aadharDoc ? documents.aadharDoc.name : 'Click to select file'}</span>
                        <span className="text-xs text-slate-400 mt-1">Image files up to 5MB</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-xl text-sm flex gap-3">
                <AlertCircle size={20} className="shrink-0" />
                <p>Documents uploaded are strictly encrypted and stored privately. They are only accessible by authorized HR personnel.</p>
              </div>

              <button disabled={loading} onClick={submitStatutory}
                className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition flex items-center justify-center gap-2">
                {loading ? 'Submitting...' : 'Complete Setup'} <CheckCircle2 size={18} />
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default OnboardingWizard;
