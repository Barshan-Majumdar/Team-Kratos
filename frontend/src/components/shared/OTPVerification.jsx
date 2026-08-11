import React, { useState } from 'react';
import axios from 'axios';
import { Mail, ArrowRight, Loader2, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

const OTPVerification = ({ user, email, onVerified, onVerify, onResend }) => {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const handleChange = (e, index) => {
    const value = e.target.value;
    const numericVal = value.replace(/[^0-9]/g, '');

    // Handle paste or auto-fill of multiple digits into single input
    if (numericVal.length > 1) {
      const newOtp = [...otp];
      for (let i = 0; i < 6; i++) {
        if (i < numericVal.length) {
          newOtp[i] = numericVal[i];
        }
      }
      setOtp(newOtp);
      const nextFocusIndex = Math.min(numericVal.length, 5);
      const inputs = e.target.form?.querySelectorAll('input');
      if (inputs && inputs[nextFocusIndex]) {
        inputs[nextFocusIndex].focus();
      }
      return;
    }

    const singleDigit = numericVal.slice(-1);
    const newOtp = [...otp];
    newOtp[index] = singleDigit;
    setOtp(newOtp);

    // Auto focus next input
    if (singleDigit && index < 5) {
      const inputs = e.target.form?.querySelectorAll('input');
      if (inputs && inputs[index + 1]) {
        inputs[index + 1].focus();
      }
    }
  };

  const handleKeyDown = (e, index) => {
    if (e.key === 'Backspace') {
      if (!otp[index] && index > 0) {
        const inputs = e.target.form?.querySelectorAll('input');
        if (inputs && inputs[index - 1]) {
          inputs[index - 1].focus();
        }
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      const inputs = e.target.form?.querySelectorAll('input');
      if (inputs && inputs[index - 1]) {
        inputs[index - 1].focus();
      }
    } else if (e.key === 'ArrowRight' && index < 5) {
      const inputs = e.target.form?.querySelectorAll('input');
      if (inputs && inputs[index + 1]) {
        inputs[index + 1].focus();
      }
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim().replace(/[^0-9]/g, '');
    if (!pastedData) return;

    const newOtp = [...otp];
    for (let i = 0; i < 6; i++) {
      if (i < pastedData.length) {
        newOtp[i] = pastedData[i];
      }
    }
    setOtp(newOtp);

    const nextFocusIndex = Math.min(pastedData.length, 5);
    const inputs = e.target.form?.querySelectorAll('input');
    if (inputs && inputs[nextFocusIndex]) {
      inputs[nextFocusIndex].focus();
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    const otpCode = otp.join('');
    if (otpCode.length !== 6) {
      toast.error('Please enter a 6-digit OTP');
      return;
    }

    if (onVerify) {
      onVerify(otpCode);
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${import.meta.env.VITE_API_URL}/api/auth/verify-otp`,
        { otp: otpCode },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Email verified successfully!');
      if (onVerified) onVerified();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (onResend) {
      await onResend();
      return;
    }

    setResending(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${import.meta.env.VITE_API_URL}/api/auth/resend-otp`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('A new OTP has been sent to your email');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to resend OTP');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto min-h-screen">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-8 md:p-10 shadow-2xl max-w-md md:max-w-lg w-full relative overflow-hidden my-auto"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#1F2B4D]/5 rounded-full blur-3xl -mr-32 -mt-32 opacity-50 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#1F2B4D]/5 rounded-full blur-3xl -ml-32 -mb-32 opacity-50 pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center">
          <div className="w-12 h-12 sm:w-16 sm:h-16 bg-[#1F2B4D]/10 text-[#1F2B4D] rounded-xl sm:rounded-2xl flex items-center justify-center mb-4 sm:mb-6 shadow-inner shrink-0">
            <Mail className="w-6 h-6 sm:w-8 sm:h-8" />
          </div>

          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-800 mb-2 text-center">Verify Your Email</h2>
          <p className="text-xs sm:text-sm md:text-base text-slate-500 text-center mb-6 sm:mb-8 leading-relaxed w-full max-w-md px-1">
            We've sent a 6-digit verification code to{' '}
            <span 
              className="font-semibold text-slate-800 whitespace-nowrap inline-block max-w-full truncate align-bottom"
              title={email || user?.email}
            >
              {email || user?.email}
            </span>
            . Please enter it below.
          </p>

          <form onSubmit={handleVerify} className="w-full">
            <div className="grid grid-cols-6 gap-1.5 sm:gap-2.5 mb-6 sm:mb-8 w-full max-w-sm mx-auto">
              {otp.map((data, index) => (
                <input
                  key={index}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength="1"
                  value={data}
                  onChange={(e) => handleChange(e, index)}
                  onKeyDown={(e) => handleKeyDown(e, index)}
                  onPaste={handlePaste}
                  onFocus={(e) => e.target.select()}
                  className="w-full h-11 sm:h-14 md:h-16 border-2 border-[#EAE7E0] rounded-lg sm:rounded-xl text-center text-lg sm:text-2xl font-bold text-[#1D1B16] focus:border-[#1F2B4D] focus:ring-4 focus:ring-[#1F2B4D]/20 outline-none transition-all p-0 min-w-0"
                />
              ))}
            </div>

            <button
              type="submit"
              disabled={loading || otp.join('').length !== 6}
              className="w-full bg-[#1F2B4D] hover:bg-[#141C33] text-white rounded-xl py-3 sm:py-4 px-4 font-display font-bold text-base sm:text-lg flex items-center justify-center gap-2 transition-all duration-[500ms] ease-[cubic-bezier(0.32,0.72,0,1)] disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_4px_12px_rgba(31,43,77,0.15)] hover:shadow-[0_8px_24px_rgba(31,43,77,0.25)] active:scale-[0.98]"
            >
              {loading ? <Loader2 className="animate-spin" size={22} /> : 'Verify Account'}
              {!loading && <ArrowRight size={18} className="sm:w-5 sm:h-5" />}
            </button>
          </form>

          <div className="mt-6 sm:mt-8 flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-slate-600 text-center">
            <span>Didn't receive the code?</span>
            <button
              type="button"
              onClick={handleResend}
              disabled={resending}
              className="text-[#1F2B4D] font-bold hover:text-[#141C33] inline-flex items-center gap-1 disabled:opacity-50 transition-colors"
            >
              {resending ? <Loader2 className="animate-spin" size={14} /> : <RefreshCw size={14} />}
              Resend OTP
            </button>
          </div>

          {/* Spam folder hint */}
          <div className="mt-4 flex items-start gap-2 bg-amber-50/90 border border-amber-200/80 rounded-xl p-3 sm:px-4 sm:py-3 text-xs sm:text-sm text-amber-800 text-left w-full">
            <span className="text-sm sm:text-base mt-0.5 shrink-0">📬</span>
            <span className="leading-relaxed">
              <strong>Can't find it?</strong> Check your <strong>Spam</strong> or <strong>Junk</strong> folder. If it's there, mark it as "Not Spam" so future emails arrive directly in your inbox.
            </span>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default OTPVerification;

