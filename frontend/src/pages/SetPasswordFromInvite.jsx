import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ShieldCheck, AlertCircle, ArrowRight, Loader2, KeyRound } from 'lucide-react';

// Common UI Wrapper - Soft Structuralism & Doppelrand Architecture
const LayoutWrapper = ({ children }) => (
  <div className="min-h-[100dvh] flex items-center justify-center p-4 md:p-8 bg-[#FAF9F6] font-['Plus_Jakarta_Sans',_sans-serif]">
    {/* Outer Shell (Doppelrand) */}
    <div className="w-full max-w-md bg-[#F4F1EA] p-2 rounded-[32px] border border-[#EAE7E0] shadow-[0_8px_40px_-12px_rgba(29,27,22,0.1)]">
      {/* Inner Core */}
      <div className="bg-white rounded-[24px] p-8 md:p-10 border border-[#E2E8F0] shadow-[inset_0_1px_1px_rgba(255,255,255,0.8)] relative overflow-hidden">
        {children}
      </div>
    </div>
  </div>
);

export default function SetPasswordFromInvite() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();

  const [verifying, setVerifying] = useState(true);
  const [invitedUser, setInvitedUser] = useState(null);
  const [verifyError, setVerifyError] = useState('');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function verifyToken() {
      if (!token) {
        setVerifyError('Missing invitation token in URL. Please check your welcome email link.');
        setVerifying(false);
        return;
      }

      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/users/verify-invite-token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Invalid or expired invitation token');

        setInvitedUser(data.user);
      } catch (err) {
        setVerifyError(err.message);
      } finally {
        setVerifying(false);
      }
    }

    verifyToken();
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');

    if (newPassword.length < 8) {
      return setSubmitError('Password must be at least 8 characters long.');
    }
    if (newPassword !== confirmPassword) {
      return setSubmitError('Passwords do not match.');
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/users/set-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to set password');

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      setSuccess(true);
      setTimeout(() => {
        navigate('/face-registration');
      }, 1500);
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (verifying) {
    return (
      <LayoutWrapper>
        <div className="flex flex-col items-center justify-center text-center py-10">
          <Loader2 className="animate-spin text-[#1F2B4D] mb-6" size={40} strokeWidth={1.5} />
          <h2 className="text-xl font-bold text-[#1D1B16] tracking-tight mb-2">Verifying Setup Link</h2>
          <p className="text-sm text-[#6B655C]">Connecting to secure executive environment...</p>
        </div>
      </LayoutWrapper>
    );
  }

  if (verifyError) {
    return (
      <LayoutWrapper>
        <div className="flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-full bg-[#FDF8F3] border border-[#EEDCCE] flex items-center justify-center text-[#B5793A] mb-6">
            <AlertCircle size={28} strokeWidth={2} />
          </div>
          <h2 className="text-xl font-bold text-[#1D1B16] tracking-tight mb-3">Invitation Expired or Invalid</h2>
          <p className="text-sm text-[#6B655C] leading-relaxed mb-8">{verifyError}</p>
          <button 
            onClick={() => navigate('/login')}
            className="w-full bg-[#1F2B4D] hover:bg-[#141C33] text-white font-medium py-3.5 px-6 rounded-full transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] active:scale-[0.98]"
          >
            Return to Login
          </button>
        </div>
      </LayoutWrapper>
    );
  }

  return (
    <LayoutWrapper>
      <div className="text-center mb-10">
        <div className="w-16 h-16 bg-[#F0F3F9] rounded-2xl flex items-center justify-center mx-auto mb-6 border border-[#1F2B4D]/10 text-[#1F2B4D] shadow-sm transform -rotate-3 hover:rotate-0 transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]">
          <ShieldCheck size={32} strokeWidth={1.5} />
        </div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-[#1D1B16] tracking-tight mb-2">
          Welcome, {invitedUser?.displayName?.split(' ')[0] || 'User'}!
        </h1>
        <p className="text-sm text-[#6B655C] mt-2">
          Setting up account as <strong className="font-semibold text-[#1F2B4D]">{invitedUser?.customRole || 'Team Member'}</strong>
        </p>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F4F1EA] text-[#1D1B16] border border-[#EAE7E0] text-[11px] font-medium mt-4">
          <span className="w-1.5 h-1.5 rounded-full bg-[#6B655C]" />
          {invitedUser?.email}
        </div>
      </div>

      {submitError && (
        <div className="mb-6 p-4 bg-[#FDF8F3] text-[#8C5722] text-sm rounded-2xl border border-[#EEDCCE] font-medium flex items-start gap-3">
          <AlertCircle size={18} className="mt-0.5 shrink-0 text-[#B5793A]" />
          <p>{submitError}</p>
        </div>
      )}

      {success ? (
        <div className="text-center p-8 bg-[#ECFDF5] rounded-3xl border border-[#A7F3D0] text-[#065F46] animate-in fade-in slide-in-from-bottom-4 duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)]">
          <div className="w-12 h-12 bg-white rounded-full shadow-sm flex items-center justify-center mx-auto mb-4 text-[#10B981]">
            <KeyRound size={24} strokeWidth={2} />
          </div>
          <h3 className="font-bold text-lg mb-2">Password Set!</h3>
          <p className="text-sm text-[#065F46]/80 font-medium">Preparing mandatory Face Registration...</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-[#1D1B16] uppercase tracking-wider pl-1">New Password</label>
            <input
              type="password"
              placeholder="At least 8 characters"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              className="w-full bg-[#FAF9F6] border border-[#EAE7E0] text-[#1D1B16] rounded-2xl px-4 py-3.5 text-sm placeholder:text-[#9A948A] focus:outline-none focus:ring-2 focus:ring-[#1F2B4D]/20 focus:border-[#1F2B4D] transition-all duration-300"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-[#1D1B16] uppercase tracking-wider pl-1">Confirm Password</label>
            <input
              type="password"
              placeholder="Re-enter new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="w-full bg-[#FAF9F6] border border-[#EAE7E0] text-[#1D1B16] rounded-2xl px-4 py-3.5 text-sm placeholder:text-[#9A948A] focus:outline-none focus:ring-2 focus:ring-[#1F2B4D]/20 focus:border-[#1F2B4D] transition-all duration-300"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="group w-full mt-4 bg-[#1F2B4D] hover:bg-[#141C33] text-white font-semibold rounded-full pl-6 pr-2 py-2 flex items-center justify-between transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] active:scale-[0.98] disabled:opacity-70 disabled:active:scale-100"
          >
            <span className="text-sm tracking-wide">
              {submitting ? 'Encrypting & Saving...' : 'Set Password & Continue'}
            </span>
            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:translate-x-1 group-hover:-translate-y-[1px] group-hover:bg-white/20">
              {submitting ? (
                <Loader2 className="animate-spin text-white" size={18} strokeWidth={2} />
              ) : (
                <ArrowRight className="text-white" size={18} strokeWidth={2} />
              )}
            </div>
          </button>
        </form>
      )}
    </LayoutWrapper>
  );
}
