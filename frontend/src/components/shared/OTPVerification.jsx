import React, { useState } from 'react';
import axios from 'axios';
import { Mail, ArrowRight, Loader2, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

const OTPVerification = ({ user, onVerified }) => {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const handleChange = (element, index) => {
    if (isNaN(element.value)) return false;

    setOtp([...otp.map((d, idx) => (idx === index ? element.value : d))]);

    // Focus next input
    if (element.nextSibling && element.value) {
      element.nextSibling.focus();
    }
  };

  const handleKeyDown = (e, index) => {
    if (e.key === 'Backspace' && !otp[index] && e.target.previousSibling) {
      e.target.previousSibling.focus();
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    const otpCode = otp.join('');
    if (otpCode.length !== 6) {
      toast.error('Please enter a 6-digit OTP');
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
      onVerified();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
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
    <div className="fixed inset-0 z-[100] bg-slate-900/50 backdrop-blur-md flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white rounded-3xl p-8 md:p-12 shadow-2xl max-w-lg w-full relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 rounded-full blur-3xl -mr-32 -mt-32 opacity-50" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-50 rounded-full blur-3xl -ml-32 -mb-32 opacity-50" />
        
        <div className="relative z-10 flex flex-col items-center">
          <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mb-6 shadow-inner">
            <Mail size={32} />
          </div>
          
          <h2 className="text-3xl font-bold text-slate-800 mb-2">Verify Your Email</h2>
          <p className="text-slate-500 text-center mb-8">
            We've sent a 6-digit verification code to <span className="font-semibold text-slate-700">{user.email}</span>. Please enter it below.
          </p>

          <form onSubmit={handleVerify} className="w-full">
            <div className="flex justify-between gap-2 mb-8">
              {otp.map((data, index) => (
                <input
                  key={index}
                  type="text"
                  maxLength="1"
                  value={data}
                  onChange={(e) => handleChange(e.target, index)}
                  onKeyDown={(e) => handleKeyDown(e, index)}
                  className="w-12 h-14 md:w-14 md:h-16 border-2 border-slate-200 rounded-xl text-center text-2xl font-bold text-slate-800 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 outline-none transition-all"
                />
              ))}
            </div>

            <button
              type="submit"
              disabled={loading || otp.join('').length !== 6}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white rounded-xl py-4 font-semibold text-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-slate-900/20"
            >
              {loading ? <Loader2 className="animate-spin" size={24} /> : 'Verify Account'}
              {!loading && <ArrowRight size={20} />}
            </button>
          </form>

          <div className="mt-8 flex items-center gap-2 text-slate-600">
            <span>Didn't receive the code?</span>
            <button 
              onClick={handleResend}
              disabled={resending}
              className="text-indigo-600 font-semibold hover:text-indigo-700 flex items-center gap-1 disabled:opacity-50"
            >
              {resending ? <Loader2 className="animate-spin" size={16} /> : <RefreshCw size={16} />}
              Resend OTP
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default OTPVerification;
