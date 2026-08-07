import React, { useState, useEffect } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { IndianRupee, AlertCircle } from 'lucide-react';
import { API_BASE } from '../../lib/api';

const SalaryInfoTab = ({ user, readOnly, onSave }) => {
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState(null);

  // Form State
  const [monthWage, setMonthWage] = useState(user?.baseSalary || 0);
  const [workingDaysPerWeek, setWorkingDaysPerWeek] = useState(user?.workingDaysPerWeek || 5);
  const [breakTimeHrs, setBreakTimeHrs] = useState(user?.breakTimeHrs || 1);

  // Computed state
  const [breakdown, setBreakdown] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/payroll/config`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        setConfig(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (config) {
      recompute(monthWage, config);
    }
  }, [monthWage, config]);

  const recompute = (wage, c) => {
    // Basic is percentage of month wage
    const basic = wage * (c.basicPercentOfWage / 100);
    // HRA, Bonus, LTA are percentages of Basic
    const hra = basic * (c.hraPercentOfBasic / 100);
    const bonus = basic * (c.bonusPercentOfBasic / 100);
    const lta = basic * (c.ltaPercentOfBasic / 100);
    
    // Standard allowance is fixed
    const stdAllowance = c.standardAllowance;

    // Fixed allowance = wage - (all above)
    let fixed = wage - (basic + hra + stdAllowance + bonus + lta);

    // Deductions
    const pfEmployee = basic * (c.pfEmployeePercent / 100);
    const pfEmployer = basic * (c.pfEmployerPercent / 100);
    const pt = c.professionalTax;

    const gross = basic + hra + stdAllowance + bonus + lta + (fixed > 0 ? fixed : 0);
    const net = gross - pfEmployee - pt;

    if (fixed < 0 && wage > 0) {
      setErrorMsg('Fixed Allowance is negative. The sum of Basic, HRA, Bonus, LTA, and Standard Allowance exceeds the Month Wage. Please increase the Month Wage or ask your Admin to adjust the Company Payroll Configuration.');
    } else {
      setErrorMsg('');
    }

    setBreakdown({
      basic,
      hra,
      stdAllowance,
      bonus,
      lta,
      fixed,
      pfEmployee,
      pfEmployer,
      pt,
      gross,
      net
    });
  };

  const handleSave = async () => {
    if (errorMsg || (breakdown && breakdown.fixed < 0)) return;
    setLoading(true);
    await onSave({
      baseSalary: parseFloat(monthWage),
      workingDaysPerWeek: parseInt(workingDaysPerWeek),
      breakTimeHrs: parseFloat(breakTimeHrs)
    });
    setLoading(false);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Edit Form */}
      <Card className="p-6 !bg-white border-[#EAE7E0] shadow-[0_1px_2px_rgba(29,27,22,0.04),0_8px_20px_rgba(29,27,22,0.06)]">
        <h3 className="text-lg font-bold mb-4 text-[#1D1B16] flex items-center gap-2">
          <IndianRupee size={20} className="text-[#1F2B4D]" /> Compensation Details
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-semibold text-[#1F2B4D] mb-1">Annual CTC / Base Salary (₹)</label>
            {readOnly ? (
              <p className="p-2 bg-[#FAF9F6] border border-[#EAE7E0] rounded-lg text-[#6B655C]">{monthWage.toLocaleString()}</p>
            ) : (
              <Input 
                type="number" 
                value={monthWage} 
                onChange={(e) => setMonthWage(e.target.value)} 
                className="w-full bg-[#FAF9F6] border-[#EAE7E0] text-[#1F2B4D] focus:border-[#1F2B4D] focus:ring-[#1F2B4D]/10"
              />
            )}
          </div>
          <div>
            <label className="block text-sm font-semibold text-[#1F2B4D] mb-1">Working Days/Week</label>
            {readOnly ? (
              <p className="p-2 bg-[#FAF9F6] border border-[#EAE7E0] rounded-lg text-[#6B655C]">{workingDaysPerWeek}</p>
            ) : (
              <Input 
                type="number" 
                value={workingDaysPerWeek} 
                onChange={(e) => setWorkingDaysPerWeek(e.target.value)} 
                className="w-full bg-[#FAF9F6] border-[#EAE7E0] text-[#1F2B4D] focus:border-[#1F2B4D] focus:ring-[#1F2B4D]/10"
              />
            )}
          </div>
          <div>
            <label className="block text-sm font-semibold text-[#1F2B4D] mb-1">Break Time (Hrs/Day)</label>
            {readOnly ? (
              <p className="p-2 bg-[#FAF9F6] border border-[#EAE7E0] rounded-lg text-[#6B655C]">{breakTimeHrs}</p>
            ) : (
              <Input 
                type="number" 
                step="0.5"
                value={breakTimeHrs} 
                onChange={(e) => setBreakTimeHrs(e.target.value)} 
                className="w-full bg-[#FAF9F6] border-[#EAE7E0] text-[#1F2B4D] focus:border-[#1F2B4D] focus:ring-[#1F2B4D]/10"
              />
            )}
          </div>
        </div>

        {!readOnly && (
          <div className="mt-6 flex justify-end">
            <Button 
              onClick={handleSave} 
              disabled={loading || errorMsg || breakdown?.fixed < 0}
              className="!bg-[#1F2B4D] hover:!bg-[#151D36] text-white px-6 shadow-md border-0"
            >
              {loading ? 'Saving...' : 'Save Compensation'}
            </Button>
          </div>
        )}
      </Card>

      {/* Live Preview / Breakdown */}
      {breakdown && (
        <Card className="p-6 !bg-white border-[#EAE7E0] shadow-[0_1px_2px_rgba(29,27,22,0.04),0_8px_20px_rgba(29,27,22,0.06)]">
          <h4 className="text-md font-bold mb-4 text-[#1D1B16]">Salary Component Breakdown</h4>
          
          {errorMsg && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded flex items-start gap-2">
              <AlertCircle size={16} className="mt-0.5 shrink-0" /> {errorMsg}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Earnings */}
            <div>
              <h5 className="text-sm font-bold text-[#6B655C] mb-3 uppercase tracking-wider">Earnings</h5>
              <div className="space-y-2">
                <div className="flex justify-between text-sm"><span className="text-[#6B655C]">Basic Salary</span><span className="font-medium text-[#1F2B4D]">₹{breakdown.basic.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span></div>
                <div className="flex justify-between text-sm"><span className="text-[#6B655C]">House Rent Allowance (HRA)</span><span className="font-medium text-[#1F2B4D]">₹{breakdown.hra.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span></div>
                <div className="flex justify-between text-sm"><span className="text-[#6B655C]">Standard Allowance</span><span className="font-medium text-[#1F2B4D]">₹{breakdown.stdAllowance.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span></div>
                <div className="flex justify-between text-sm"><span className="text-[#6B655C]">Performance Bonus</span><span className="font-medium text-[#1F2B4D]">₹{breakdown.bonus.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span></div>
                <div className="flex justify-between text-sm"><span className="text-[#6B655C]">Leave Travel Allowance (LTA)</span><span className="font-medium text-[#1F2B4D]">₹{breakdown.lta.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span></div>
                <div className="flex justify-between text-sm"><span className="text-[#6B655C]">Fixed Allowance</span><span className={`font-medium ${breakdown.fixed < 0 ? 'text-red-500' : 'text-[#1F2B4D]'}`}>₹{breakdown.fixed.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span></div>
                
                <div className="pt-2 mt-2 border-t border-[#EAE7E0] flex justify-between font-bold text-[#1F2B4D]">
                  <span>Gross Salary</span>
                  <span>₹{breakdown.gross.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                </div>
              </div>
            </div>

            {/* Deductions */}
            <div>
              <h5 className="text-sm font-bold text-[#6B655C] mb-3 uppercase tracking-wider">Deductions</h5>
              <div className="space-y-2">
                <div className="flex justify-between text-sm"><span className="text-[#6B655C]">PF Contribution (Employee)</span><span className="font-medium text-[#1F2B4D]">₹{breakdown.pfEmployee.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span></div>
                <div className="flex justify-between text-sm"><span className="text-[#6B655C]">Professional Tax</span><span className="font-medium text-[#1F2B4D]">₹{breakdown.pt.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span></div>
                <div className="pt-2 mt-2 border-t border-[#EAE7E0] flex justify-between font-bold text-emerald-600 text-lg">
                  <span>Net Take Home</span>
                  <span>₹{breakdown.net.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                </div>
              </div>

              <div className="mt-8 pt-4 border-t border-[#EAE7E0]">
                <h5 className="text-sm font-bold text-[#6B655C] mb-3 uppercase tracking-wider">Employer Contributions</h5>
                <div className="flex justify-between text-sm"><span className="text-[#6B655C]">PF Contribution (Employer)</span><span className="font-medium text-[#1F2B4D]">₹{breakdown.pfEmployer.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span></div>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default SalaryInfoTab;
