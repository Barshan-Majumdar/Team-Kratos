import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Building2, User, Mail, Lock, ArrowRight, Loader2, CheckCircle, Globe } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const MAIN_APP_URL = import.meta.env.VITE_APP_URL || 'http://localhost:5173';

function App() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    companyName: '',
    domain: '',
    ceoName: '',
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successData, setSuccessData] = useState(null);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${API_BASE}/api/auth/register-company`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      setSuccessData(data);
      setStep(3); // Success step

      // Automatically handoff to the main dashboard after 2 seconds
      setTimeout(() => {
        window.location.href = `${MAIN_APP_URL}/auth-receiver?token=${data.token}`;
      }, 2000);

    } catch (err) {
      setError(err.message);
      setStep(1);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen mesh-bg flex flex-col items-center justify-center p-4 md:p-8">
      
      {/* Brand Header */}
      <div className="absolute top-8 left-8 flex items-center gap-2">
        <img src="/Crew.png" alt="Crew HR Logo" className="h-10 w-auto object-contain drop-shadow-sm" />
      </div>

      <div className="w-full max-w-5xl grid md:grid-cols-2 gap-12 items-center">
        
        {/* Left Side: Marketing Copy */}
        <div className="hidden md:block space-y-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <span className="px-3 py-1 bg-indigo-100 text-indigo-700 font-bold text-xs rounded-full uppercase tracking-widest mb-4 inline-block">For Growing Teams</span>
            <h1 className="text-5xl font-black text-slate-800 leading-[1.1] tracking-tight">
              Manage your <br/>entire company<br/>
              <span className="text-primary italic font-serif">in one place.</span>
            </h1>
            <p className="text-lg text-slate-600 mt-6 leading-relaxed max-w-md">
              Create your workspace in seconds. Instantly unlock modern payroll, smart attendance, and effortless onboarding for your entire organization.
            </p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }} className="pt-8 flex items-center gap-8 border-t border-slate-200/60">
            <div>
              <p className="text-3xl font-black text-slate-800">10k+</p>
              <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Teams joined</p>
            </div>
            <div>
              <p className="text-3xl font-black text-slate-800">99.9%</p>
              <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Uptime SLA</p>
            </div>
          </motion.div>
        </div>

        {/* Right Side: Registration Form */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }} 
          animate={{ opacity: 1, scale: 1 }} 
          transition={{ duration: 0.4 }}
          className="glass rounded-[2rem] p-8 md:p-10 shadow-2xl shadow-indigo-100/50 relative overflow-hidden"
        >
          {/* Decorative blur blob */}
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-purple-300/30 rounded-full blur-3xl pointer-events-none"></div>

          {step === 1 && (
            <form onSubmit={() => setStep(2)} className="relative z-10">
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-slate-800 mb-2">Create Workspace</h2>
                <p className="text-slate-500">Let's set up your organization.</p>
              </div>

              {error && (
                <div className="mb-6 p-4 bg-red-50 text-red-700 text-sm font-semibold rounded-xl border border-red-100 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
                  {error}
                </div>
              )}

              <div className="space-y-5">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Company Name</label>
                  <div className="relative">
                    <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input required name="companyName" value={formData.companyName} onChange={handleChange} type="text" placeholder="Acme Corp" className="w-full bg-white/50 border border-slate-200 rounded-xl py-3.5 pl-12 pr-4 outline-none focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all font-medium text-slate-800" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Company Domain (Optional)</label>
                  <div className="relative">
                    <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input name="domain" value={formData.domain} onChange={handleChange} type="text" placeholder="acmecorp.com" className="w-full bg-white/50 border border-slate-200 rounded-xl py-3.5 pl-12 pr-4 outline-none focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all font-medium text-slate-800" />
                  </div>
                </div>

                <button type="submit" className="w-full mt-4 py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold transition-colors flex items-center justify-center gap-2 group shadow-lg shadow-slate-900/20">
                  Continue <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handleSubmit} className="relative z-10">
              <button type="button" onClick={() => setStep(1)} className="text-sm font-semibold text-slate-500 hover:text-slate-800 mb-6 flex items-center gap-1 transition-colors">
                &larr; Back
              </button>
              
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-slate-800 mb-2">Admin Profile</h2>
                <p className="text-slate-500">Create the first CEO account for <span className="font-bold text-slate-700">{formData.companyName}</span>.</p>
              </div>

              <div className="space-y-5">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input required name="ceoName" value={formData.ceoName} onChange={handleChange} type="text" placeholder="John Doe" className="w-full bg-white/50 border border-slate-200 rounded-xl py-3.5 pl-12 pr-4 outline-none focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all font-medium text-slate-800" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Work Email</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input required name="email" value={formData.email} onChange={handleChange} type="email" placeholder="john@acmecorp.com" className="w-full bg-white/50 border border-slate-200 rounded-xl py-3.5 pl-12 pr-4 outline-none focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all font-medium text-slate-800" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input required name="password" value={formData.password} onChange={handleChange} type="password" placeholder="••••••••" className="w-full bg-white/50 border border-slate-200 rounded-xl py-3.5 pl-12 pr-4 outline-none focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all font-medium text-slate-800" />
                  </div>
                </div>

                <button type="submit" disabled={loading} className="w-full mt-4 py-4 bg-primary hover:bg-[#3B3DB9] disabled:bg-primary/70 disabled:cursor-wait text-white rounded-xl font-bold transition-colors flex items-center justify-center gap-2 shadow-lg shadow-primary/30">
                  {loading ? <><Loader2 size={18} className="animate-spin" /> Registering...</> : 'Complete Registration'}
                </button>
              </div>
            </form>
          )}

          {step === 3 && (
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center py-8 relative z-10">
              <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle size={40} />
              </div>
              <h2 className="text-3xl font-black text-slate-800 mb-2 tracking-tight">Workspace Ready!</h2>
              <p className="text-slate-600 font-medium mb-8">
                Welcome to Crew HR, {formData.ceoName}. We've set up the foundational HR policies for <span className="font-bold text-slate-800">{formData.companyName}</span>.
              </p>
              
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-center gap-3">
                <Loader2 size={16} className="animate-spin text-slate-500" />
                <span className="text-sm font-semibold text-slate-600">Redirecting to your dashboard...</span>
              </div>
            </motion.div>
          )}

          {/* Login Link */}
          {step !== 3 && (
            <div className="mt-8 text-center pt-6 border-t border-slate-200/60 relative z-10">
              <p className="text-sm text-slate-500 font-medium">
                Already have an account? <a href={`${MAIN_APP_URL}/login`} className="text-primary font-bold hover:underline">Sign In here</a>
              </p>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}

export default App;
