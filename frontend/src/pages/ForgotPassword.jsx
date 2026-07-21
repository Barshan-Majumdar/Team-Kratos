import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Alert from '../components/ui/Alert';
import { Eye, EyeOff } from 'lucide-react';
import OTPVerification from '../components/shared/OTPVerification';

export default function ForgotPassword() {
  const [step, setStep] = useState(1); // 1: Email, 2: OTP, 3: Reset Password
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  
  const navigate = useNavigate();

  const handleSendOtp = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || 'Failed to request reset');
      
      setMessage(data.message || 'An OTP has been sent to your email.');
      setStep(2);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = (enteredOtp) => {
    setOtp(enteredOtp);
    setStep(3);
    setMessage('');
    setError('');
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp, newPassword: password })
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || 'Failed to reset password');
      
      setMessage('Password successfully reset! You can now log in.');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4 font-['Inter',_sans-serif]">
      <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-sm border border-gray-200">
        <h2 className="text-2xl font-bold text-gray-900 mb-2 italic" style={{ fontFamily: '"Playfair Display", serif' }}>Forgot Password</h2>
        
        {step === 1 && <p className="text-gray-500 mb-6 text-sm">Enter your email address and we'll send you an OTP.</p>}
        {step === 2 && <p className="text-gray-500 mb-6 text-sm">Enter the OTP sent to {email}.</p>}
        {step === 3 && <p className="text-gray-500 mb-6 text-sm">Create a new, strong password.</p>}
        
        {error && <Alert type="error" message={error} className="mb-4" />}
        {message && <Alert type="success" message={message} className="mb-4" />}

        {step === 1 && (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <input
              required
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 outline-none focus:border-[#4B4DD9]"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-[#4B4DD9] px-4 py-3 font-semibold text-white hover:bg-[#3B3DB9] transition-all disabled:bg-[#3B3DB9] disabled:cursor-wait"
            >
              {loading ? 'Sending...' : 'Send OTP'}
            </button>
          </form>
        )}

        {step === 2 && (
          <OTPVerification 
            onVerify={handleVerifyOtp}
            onResend={handleSendOtp}
            loading={loading}
            email={email}
            requireWait={true}
          />
        )}

        {step === 3 && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="flex flex-col gap-2">
              <div className="relative w-full">
                <input required name="password" type={showPassword ? "text" : "password"} placeholder="New Password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 pr-10 outline-none focus:border-[#4B4DD9]" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#4B4DD9] transition-colors">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              
              {password && (() => {
                let score = 0;
                if (password.length >= 8) score++;
                if (/[A-Z]/.test(password)) score++;
                if (/[a-z]/.test(password)) score++;
                if (/[0-9]/.test(password)) score++;
                if (/[^A-Za-z0-9]/.test(password)) score++;
                
                let label = 'Weak';
                let colorClass = 'bg-red-500';
                if (score >= 3) { label = 'Medium'; colorClass = 'bg-yellow-500'; }
                if (score >= 5) { label = 'Strong'; colorClass = 'bg-emerald-500'; }
                
                return (
                  <div className="flex items-center gap-2 px-1">
                    <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div className={`h-full ${colorClass} transition-all duration-300`} style={{ width: `${(score/5)*100}%` }}></div>
                    </div>
                    <span className={`text-xs font-medium text-gray-500`}>{label}</span>
                  </div>
                );
              })()}

              <div className="relative w-full mt-1">
                <input required name="confirmPassword" type={showConfirmPassword ? "text" : "password"} placeholder="Confirm Password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className={`w-full rounded-xl border bg-gray-50 px-4 py-3 pr-10 outline-none focus:border-[#4B4DD9] ${confirmPassword ? (password === confirmPassword ? 'border-emerald-500 focus:border-emerald-500' : 'border-red-500 focus:border-red-500') : 'border-gray-200'}`} />
                <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#4B4DD9] transition-colors">
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              
              {confirmPassword && (
                <div className={`text-xs px-1 ${password === confirmPassword ? 'text-emerald-600' : 'text-red-500'}`}>
                  {password === confirmPassword ? 'Passwords match' : 'Passwords do not match'}
                </div>
              )}
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-[#4B4DD9] px-4 py-3 font-semibold text-white hover:bg-[#3B3DB9] transition-all disabled:bg-[#3B3DB9] disabled:cursor-wait"
            >
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
          </form>
        )}

        {step === 1 && (
          <div className="mt-6 text-center">
            <button onClick={() => navigate('/login')} className="text-sm font-medium text-[#4B4DD9] hover:text-[#3B3DB9]">
              Back to Login
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
