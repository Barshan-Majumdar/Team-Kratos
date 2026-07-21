import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { getSession } from '@crew/auth-client';

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

  if (loading) return <div>Loading...</div>;

  const handleChange = (e) => {
    const val = e.target.type === 'number' ? parseFloat(e.target.value) : e.target.value;
    setConfig({...config, [e.target.name]: val});
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
      <h3 className="text-xl font-bold mb-6 text-slate-800">Payroll Configuration</h3>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Company Name (For Payslips)</label>
            <input type="text" name="companyName" className="w-full border p-2 rounded-lg" value={config.companyName || ''} onChange={handleChange} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Standard Allowance (Fixed)</label>
            <input type="number" name="standardAllowance" className="w-full border p-2 rounded-lg" value={config.standardAllowance || ''} onChange={handleChange} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Basic % of Gross Wage</label>
            <input type="number" name="basicPercentOfWage" className="w-full border p-2 rounded-lg" value={config.basicPercentOfWage || ''} onChange={handleChange} step="0.01" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">HRA % of Basic</label>
            <input type="number" name="hraPercentOfBasic" className="w-full border p-2 rounded-lg" value={config.hraPercentOfBasic || ''} onChange={handleChange} step="0.01" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Employee PF %</label>
            <input type="number" name="pfEmployeePercent" className="w-full border p-2 rounded-lg" value={config.pfEmployeePercent || ''} onChange={handleChange} step="0.01" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Employer PF %</label>
            <input type="number" name="pfEmployerPercent" className="w-full border p-2 rounded-lg" value={config.pfEmployerPercent || ''} onChange={handleChange} step="0.01" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Bonus % of Basic</label>
            <input type="number" name="bonusPercentOfBasic" className="w-full border p-2 rounded-lg" value={config.bonusPercentOfBasic || ''} onChange={handleChange} step="0.01" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Professional Tax (Fixed)</label>
            <input type="number" name="professionalTax" className="w-full border p-2 rounded-lg" value={config.professionalTax || ''} onChange={handleChange} />
          </div>
        </div>
        <button type="submit" disabled={isSubmitting} className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition-colors shadow disabled:opacity-50 disabled:cursor-not-allowed">
          {isSubmitting ? 'Saving...' : 'Save Payroll Settings'}
        </button>
      </form>
    </div>
  );
}
