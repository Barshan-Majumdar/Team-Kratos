import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { getSession } from '@crew/auth-client';
import { DollarSign, Building, Percent, Save, Sparkles, Receipt, Calculator } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function PayrollConfig() {
  const [config, setConfig] = useState({
    companyName: '',
    pfEmployeePercent: 12,
    pfEmployerPercent: 12,
    professionalTax: 200,
    standardAllowance: 4167,
    basicPercentOfWage: 50,
    hraPercentOfBasic: 50,
    bonusPercentOfBasic: 8.33,
    ltaPercentOfBasic: 8.33
  });
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { token } = getSession();

  useEffect(() => {
    fetch(`${API_BASE}/api/console/payroll-config`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => { if(Object.keys(data).length > 0) setConfig(data); setLoading(false); })
      .catch(err => { toast.error('Failed to load payroll config'); setLoading(false); });
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/console/payroll-config`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(config)
      });
      if (res.ok) toast.success('Payroll configuration updated');
      else toast.error('Failed to update');
    } catch (err) { toast.error('Error saving config'); }
    finally { setIsSubmitting(false); }
  };

  if (loading) return (
    <div className="rounded-[32px] bg-[#F4F1EA] p-4 border border-[#EAE7E0]">
      <div className="rounded-[22px] bg-white p-12 border border-[#E2E8F0] text-center flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-3 border-[#1F2B4D]/20 border-t-[#1F2B4D] rounded-full animate-spin" />
        <p className="text-xs font-bold tracking-wider text-[#6B655C] uppercase">Loading Payroll Configuration...</p>
      </div>
    </div>
  );

  const handleChange = (e) => {
    const val = e.target.type === 'number' ? parseFloat(e.target.value) : e.target.value;
    setConfig({...config, [e.target.name]: val});
  };

  return (
    <div className="rounded-[32px] bg-[#F4F1EA] p-4 sm:p-6 border border-[#EAE7E0] shadow-sm">
      <div className="rounded-[22px] bg-white p-6 sm:p-8 border border-[#E2E8F0] shadow-xs space-y-8">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#EAE7E0]">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#F4F1EA] text-[#1F2B4D] border border-[#EAE7E0] text-[11px] font-bold tracking-wider uppercase mb-2">
              <Sparkles size={12} /> COMPENSATION ENGINE
            </div>
            <h3 className="text-2xl font-extrabold text-[#1D1B16] tracking-tight">Payroll & Statutory Configuration</h3>
            <p className="text-[#6B655C] text-xs sm:text-sm mt-1">Configure default statutory Provident Fund percentages, allowances, and tax rules.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            <div className="md:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#6B655C] mb-2">
                Company Legal Name (Rendered on Payslips)
              </label>
              <div className="relative">
                <Building className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9A948A]" size={18} />
                <input 
                  type="text" 
                  name="companyName" 
                  className="w-full pl-10 pr-4 py-3 bg-[#FAF9F6] border border-[#EAE7E0] rounded-xl text-sm font-medium text-[#1D1B16] outline-none focus:border-[#1F2B4D] focus:bg-white focus:ring-2 focus:ring-[#1F2B4D]/15 transition-all" 
                  value={config.companyName || ''} 
                  onChange={handleChange} 
                  required 
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#6B655C] mb-2">
                Standard Allowance (Monthly Fixed)
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9A948A]" size={18} />
                <input 
                  type="number" 
                  name="standardAllowance" 
                  className="w-full pl-10 pr-4 py-3 bg-[#FAF9F6] border border-[#EAE7E0] rounded-xl text-sm font-medium text-[#1D1B16] outline-none focus:border-[#1F2B4D] focus:bg-white focus:ring-2 focus:ring-[#1F2B4D]/15 transition-all" 
                  value={config.standardAllowance || ''} 
                  onChange={handleChange} 
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#6B655C] mb-2">
                Professional Tax Deduction (Fixed)
              </label>
              <div className="relative">
                <Receipt className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9A948A]" size={18} />
                <input 
                  type="number" 
                  name="professionalTax" 
                  className="w-full pl-10 pr-4 py-3 bg-[#FAF9F6] border border-[#EAE7E0] rounded-xl text-sm font-medium text-[#1D1B16] outline-none focus:border-[#1F2B4D] focus:bg-white focus:ring-2 focus:ring-[#1F2B4D]/15 transition-all" 
                  value={config.professionalTax || ''} 
                  onChange={handleChange} 
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#6B655C] mb-2">
                Basic Pay % of Gross Wage
              </label>
              <div className="relative">
                <Percent className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9A948A]" size={18} />
                <input 
                  type="number" 
                  name="basicPercentOfWage" 
                  step="0.01"
                  className="w-full pl-10 pr-4 py-3 bg-[#FAF9F6] border border-[#EAE7E0] rounded-xl text-sm font-medium text-[#1D1B16] outline-none focus:border-[#1F2B4D] focus:bg-white focus:ring-2 focus:ring-[#1F2B4D]/15 transition-all" 
                  value={config.basicPercentOfWage || ''} 
                  onChange={handleChange} 
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#6B655C] mb-2">
                HRA % of Basic Pay
              </label>
              <div className="relative">
                <Calculator className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9A948A]" size={18} />
                <input 
                  type="number" 
                  name="hraPercentOfBasic" 
                  step="0.01"
                  className="w-full pl-10 pr-4 py-3 bg-[#FAF9F6] border border-[#EAE7E0] rounded-xl text-sm font-medium text-[#1D1B16] outline-none focus:border-[#1F2B4D] focus:bg-white focus:ring-2 focus:ring-[#1F2B4D]/15 transition-all" 
                  value={config.hraPercentOfBasic || ''} 
                  onChange={handleChange} 
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#6B655C] mb-2">
                Employee PF Contribution %
              </label>
              <div className="relative">
                <Percent className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9A948A]" size={18} />
                <input 
                  type="number" 
                  name="pfEmployeePercent" 
                  step="0.01"
                  className="w-full pl-10 pr-4 py-3 bg-[#FAF9F6] border border-[#EAE7E0] rounded-xl text-sm font-medium text-[#1D1B16] outline-none focus:border-[#1F2B4D] focus:bg-white focus:ring-2 focus:ring-[#1F2B4D]/15 transition-all" 
                  value={config.pfEmployeePercent || ''} 
                  onChange={handleChange} 
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#6B655C] mb-2">
                Employer PF Match %
              </label>
              <div className="relative">
                <Percent className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9A948A]" size={18} />
                <input 
                  type="number" 
                  name="pfEmployerPercent" 
                  step="0.01"
                  className="w-full pl-10 pr-4 py-3 bg-[#FAF9F6] border border-[#EAE7E0] rounded-xl text-sm font-medium text-[#1D1B16] outline-none focus:border-[#1F2B4D] focus:bg-white focus:ring-2 focus:ring-[#1F2B4D]/15 transition-all" 
                  value={config.pfEmployerPercent || ''} 
                  onChange={handleChange} 
                />
              </div>
            </div>

          </div>

          <div className="pt-4">
            <button 
              type="submit" 
              disabled={isSubmitting} 
              className="px-6 py-3.5 rounded-xl bg-[#1F2B4D] hover:bg-[#141C33] active:scale-[0.99] text-white text-xs font-bold tracking-wide uppercase transition-all duration-200 shadow-sm flex items-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Save size={15} />
                  <span>Save Payroll Settings</span>
                </>
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
