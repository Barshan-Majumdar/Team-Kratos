import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { login, setSession, verifyOtp } from '@crew/auth-client';
import { Loader2 } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showOtp, setShowOtp] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [tempAuthData, setTempAuthData] = useState(null);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const data = await login(API_BASE, email, password, window.location.origin, 'console');
      
      // The backend now securely enforces Console access and will throw a 403 if unauthorized.

      if (data.requireOtp) {
        setTempAuthData(data);
        setShowOtp(true);
      } else {
        setSession(data.token, data.user);
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const data = await verifyOtp(API_BASE, tempAuthData.token, otpCode);
      
      setSession(data.token, data.user);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (showOtp) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
          <h2 className="text-2xl font-bold text-slate-800 mb-2 text-center">Verify Login</h2>
          <p className="text-center text-slate-500 mb-6 text-sm">Enter the OTP sent to your email.</p>
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-6 text-sm text-center">
              {error}
            </div>
          )}
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">OTP Code</label>
              <input 
                type="text" 
                required 
                className="w-full p-2 border rounded-lg text-center tracking-widest text-lg"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                maxLength={6}
              />
            </div>
            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-indigo-600 text-white p-2 rounded-lg font-medium hover:bg-indigo-700 flex justify-center items-center transition-colors"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Verify & Sign In'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 relative">
      {/* Brand Header */}
      <div className="absolute top-8 left-8 flex items-center gap-2">
        <Link to="/" replace>
          <img src="/Crew.png" alt="Crew HR Logo" className="h-10 w-auto object-contain drop-shadow-sm cursor-pointer" />
        </Link>
      </div>

      <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
        <h2 className="text-2xl font-bold text-slate-800 mb-6 text-center">Console Login</h2>
        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-6 text-sm text-center">
            {error}
          </div>
        )}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input 
              type="email" 
              required 
              className="w-full p-2 border rounded-lg"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
            <input 
              type="password" 
              required 
              className="w-full p-2 border rounded-lg"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className="flex justify-end w-full mt-2">
            <button type="button" onClick={() => navigate('/forgot-password')} className="text-sm font-medium text-indigo-600 hover:text-indigo-800">
              Forgot Password?
            </button>
          </div>
          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-indigo-600 text-white p-2 rounded-lg font-medium hover:bg-indigo-700 flex justify-center items-center transition-colors"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
