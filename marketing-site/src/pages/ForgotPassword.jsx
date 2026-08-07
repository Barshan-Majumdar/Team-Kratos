import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function ForgotPassword() {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSendOtp = async (e) => {
    e.preventDefault();
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
      
      setMessage(data.message || 'If the email exists, an OTP has been sent.');
      setStep(2);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtpAndReset = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    if (step === 2) {
      if (!otp || otp.length !== 6) {
        setError("Please enter the 6-digit OTP");
        setLoading(false);
        return;
      }
      
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/auth/verify-reset-otp`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, otp })
        });
        const data = await res.json();
        
        if (!res.ok) throw new Error(data.error || 'Invalid OTP');
        
        setStep(3);
        setMessage("OTP Verified. Please enter your new password.");
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
      return;
    }

    // Step 3 logic
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp, newPassword })
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || 'Failed to reset password');
      
      setMessage('Password successfully reset! Redirecting to login...');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
        <h2 className="text-2xl font-bold text-slate-800 mb-2 text-center">Forgot Password</h2>
        
        {step === 1 && <p className="text-slate-500 mb-6 text-sm text-center">Enter your email to receive a password reset OTP.</p>}
        {step === 2 && <p className="text-slate-500 mb-6 text-sm text-center">Enter the OTP sent to {email}</p>}
        {step === 3 && <p className="text-slate-500 mb-6 text-sm text-center">Create a new password.</p>}
        
        {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-6 text-sm text-center">{error}</div>}
        {message && <div className="bg-green-50 text-green-700 p-3 rounded-lg mb-6 text-sm text-center">{message}</div>}

        {step === 1 && (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-2 border rounded-lg outline-none focus:border-indigo-600"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 text-white p-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Sending...' : 'Send OTP'}
            </button>
          </form>
        )}

        {step > 1 && (
          <form onSubmit={handleVerifyOtpAndReset} className="space-y-4">
            {step === 2 && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Enter 6-Digit OTP</label>
                <input
                  required
                  type="text"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className="w-full p-2 border rounded-lg text-center tracking-[0.5em] text-lg outline-none focus:border-indigo-600"
                  placeholder="------"
                />
              </div>
            )}
            
            {step === 3 && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">New Password</label>
                <input
                  required
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full p-2 border rounded-lg outline-none focus:border-indigo-600"
                />
              </div>
            )}
            
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 text-white p-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Processing...' : step === 2 ? 'Verify OTP' : 'Reset Password'}
            </button>
          </form>
        )}

        {step === 1 && (
          <div className="mt-6 text-center">
            <button onClick={() => navigate('/login')} className="text-sm font-medium text-indigo-600 hover:text-indigo-800">
              Back to Login
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
