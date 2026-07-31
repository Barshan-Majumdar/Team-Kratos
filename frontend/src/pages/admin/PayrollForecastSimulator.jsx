import React, { useState, useEffect, useMemo } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { TrendingUp, Users, Banknote, Download, Loader2 } from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
  BarChart, Bar
} from 'recharts';

function calculateFullCTC(monthWage, { basicPercent, hraPercent, employerPfPercent }, bonusPoolPercent, fringeBenefit) {
  // According to F2 formula reconciliation:
  // Gross Salary = Month Wage.
  // Basic is a % of Month Wage.
  // HRA, Bonus, etc. are carved out of Month Wage (reducing fixed allowance).
  const basic = monthWage * (basicPercent / 100);
  const employerPf = basic * (employerPfPercent / 100);
  const ctc = monthWage + employerPf + fringeBenefit;
  return { ctc, basic };
}

function computeSimulatedPayroll({
  baselineDepartments,
  payrollConfig,
  meritIncreasePercent,
  headcountGrowthPercent,
  avgNewHireSalary,
  bonusPoolPercent,
  fringeBenefitPerEmployee,
  horizonMonths,
}) {
  const results = [];
  
  for (let month = 0; month <= horizonMonths; month++) {
    const growthRamp = headcountGrowthPercent * (month / horizonMonths); // linear ramp
    let monthTotalCTC = 0;
    const departmentBreakdown = [];
    
    // Total baseline headcount across all departments
    const totalBaselineHeadcount = baselineDepartments.reduce((s, d) => s + d.headcount, 0);

    let monthBasicCost = 0;
    let monthEmployerPfCost = 0;
    let monthFringeCost = 0;
    let monthBonusCost = 0;
    let monthGrossCost = 0;

    for (const dept of baselineDepartments) {
      const existingHeadcount = dept.headcount;
      const avgExistingSalary = existingHeadcount > 0 ? dept.totalBaseSalary / existingHeadcount : 0;

      // Immediate step-change applies to existing employees only
      const proratedExisting = month === 0 ? avgExistingSalary : avgExistingSalary * (1 + meritIncreasePercent / 100);

      // Dept share of total headcount determines its share of the growth
      const deptShare = totalBaselineHeadcount > 0 ? dept.headcount / totalBaselineHeadcount : 1 / baselineDepartments.length;
      const deltaHeadcountForDept = Math.round((growthRamp / 100) * dept.headcount);
      const simulatedHeadcount = Math.max(0, existingHeadcount + deltaHeadcountForDept);

      const newHireCount = Math.max(0, deltaHeadcountForDept);
      const existingRetained = existingHeadcount - Math.max(0, -deltaHeadcountForDept);

      const existingMetrics = calculateFullCTC(proratedExisting, payrollConfig, bonusPoolPercent, fringeBenefitPerEmployee);
      const newHireMetrics = calculateFullCTC(avgNewHireSalary, payrollConfig, bonusPoolPercent, fringeBenefitPerEmployee);

      const existingCost = existingMetrics.ctc * Math.max(0, existingRetained);
      const newHireCost = newHireMetrics.ctc * newHireCount;

      const deptCost = existingCost + newHireCost;
      monthTotalCTC += deptCost;
      departmentBreakdown.push({ name: dept.name, headcount: simulatedHeadcount, cost: deptCost });

      // Aggregate breakdown components for the Donut Chart (Month Wage = Gross)
      const totalBasic = (existingMetrics.basic * existingRetained) + (newHireMetrics.basic * newHireCount);
      const totalPf = ((existingMetrics.basic * (payrollConfig.employerPfPercent / 100)) * existingRetained) + ((newHireMetrics.basic * (payrollConfig.employerPfPercent / 100)) * newHireCount);
      const totalBonus = ((existingMetrics.basic * (bonusPoolPercent / 100)) * existingRetained) + ((newHireMetrics.basic * (bonusPoolPercent / 100)) * newHireCount);
      
      monthBasicCost += totalBasic;
      monthEmployerPfCost += totalPf;
      monthFringeCost += fringeBenefitPerEmployee * simulatedHeadcount;
      monthBonusCost += totalBonus;
      monthGrossCost += (proratedExisting * existingRetained) + (avgNewHireSalary * newHireCount);
    }

    // Reconcile other allowances (HRA, Standard, Fixed) within Gross
    const hra = monthBasicCost * (payrollConfig.hraPercent / 100);
    const otherAllowances = Math.max(0, monthGrossCost - (monthBasicCost + hra + monthBonusCost));

    results.push({ 
      month, 
      totalCost: monthTotalCTC, 
      departmentBreakdown,
      breakdown: {
        basic: monthBasicCost,
        hra,
        bonus: monthBonusCost,
        otherAllowances,
        employerPf: monthEmployerPfCost,
        fringeBenefits: monthFringeCost
      }
    });
  }

  return results;
}

const formatINR = (value) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(value);
};

export default function PayrollForecastSimulator() {
  const [loading, setLoading] = useState(true);
  const [baselineData, setBaselineData] = useState(null);

  // Sliders State
  const [meritIncreasePercent, setMeritIncreasePercent] = useState(0);
  const [headcountGrowthPercent, setHeadcountGrowthPercent] = useState(0);
  const [avgNewHireSalary, setAvgNewHireSalary] = useState(50000);
  const [bonusPoolPercent, setBonusPoolPercent] = useState(0);
  const [employerPfPercent, setEmployerPfPercent] = useState(12);
  const [fringeBenefitPerEmployee, setFringeBenefitPerEmployee] = useState(0);
  const [horizonMonths, setHorizonMonths] = useState(12);

  useEffect(() => {
    const fetchBaseline = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/payroll/forecast-baseline`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setBaselineData(data);
          setEmployerPfPercent(data.payrollConfig?.employerPfPercent || 12);
          
          if (data.totalHeadcount > 0 && data.totalBaseSalary > 0) {
             const avg = data.totalBaseSalary / data.totalHeadcount;
             // Round to nearest 5000
             setAvgNewHireSalary(Math.round(avg / 5000) * 5000);
          }
        }
      } catch (err) {
        console.error('Failed to fetch baseline:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchBaseline();
  }, []);

  const simulatedResults = useMemo(() => {
    if (!baselineData) return [];
    return computeSimulatedPayroll({
      baselineDepartments: baselineData.departments,
      payrollConfig: baselineData.payrollConfig,
      meritIncreasePercent,
      headcountGrowthPercent,
      avgNewHireSalary,
      bonusPoolPercent,
      fringeBenefitPerEmployee,
      horizonMonths
    });
  }, [baselineData, meritIncreasePercent, headcountGrowthPercent, avgNewHireSalary, bonusPoolPercent, employerPfPercent, fringeBenefitPerEmployee, horizonMonths]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="animate-spin text-indigo-500 w-8 h-8" />
      </div>
    );
  }

  if (!baselineData) return null;

  const currentOutlay = simulatedResults[0]?.totalCost || 0;
  const finalMonthResult = simulatedResults[horizonMonths] || simulatedResults[0];
  const finalOutlay = finalMonthResult.totalCost;
  const totalProjectedOutlay = simulatedResults.slice(1).reduce((sum, r) => sum + r.totalCost, 0); // Excluding month 0 (current) from sum? Or including all? Spec says "across the horizon (sum of all months)". 
  const totalSumOutlay = simulatedResults.reduce((sum, r) => sum + r.totalCost, 0);
  
  const finalHeadcount = finalMonthResult.departmentBreakdown.reduce((s, d) => s + d.headcount, 0);
  const avgCostPerEmployee = finalHeadcount > 0 ? finalOutlay / finalHeadcount : 0;
  const variance = currentOutlay > 0 ? ((finalOutlay - currentOutlay) / currentOutlay) * 100 : 0;

  const chartData = simulatedResults.map(r => ({
    name: `Month ${r.month}`,
    Baseline: currentOutlay,
    Simulated: r.totalCost
  }));

  const pieData = finalMonthResult ? [
    { name: 'Basic', value: finalMonthResult.breakdown.basic, color: '#4F46E5' },
    { name: 'HRA', value: finalMonthResult.breakdown.hra, color: '#818CF8' },
    { name: 'Performance Bonus', value: finalMonthResult.breakdown.bonus, color: '#10B981' },
    { name: 'Other Allowances', value: finalMonthResult.breakdown.otherAllowances, color: '#FBBF24' },
    { name: 'Employer PF', value: finalMonthResult.breakdown.employerPf, color: '#EC4899' },
    { name: 'Fringe Benefits', value: finalMonthResult.breakdown.fringeBenefits, color: '#8B5CF6' }
  ].filter(d => d.value > 0) : [];

  const handleExportCSV = () => {
    const headers = ['Department', 'Current Headcount', 'Simulated Headcount', 'Simulated Cost (INR)'];
    const rows = finalMonthResult.departmentBreakdown.map(d => {
      const baseDept = baselineData.departments.find(bd => bd.name === d.name);
      return `"${d.name}",${baseDept ? baseDept.headcount : 0},${d.headcount},${d.cost}`;
    });
    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `payroll_forecast_horizon_${horizonMonths}m.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const applyPreset = (merit, growth, bonus, fringe) => {
    setMeritIncreasePercent(merit);
    setHeadcountGrowthPercent(growth);
    setBonusPoolPercent(bonus);
    setFringeBenefitPerEmployee(fringe);
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 overflow-y-auto h-full">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight flex items-center gap-3">
            <TrendingUp className="text-indigo-600" size={32} />
            Payroll Cost Simulator
          </h1>
          <p className="text-slate-500 mt-1">Forecast employer costs with real-time aggregates.</p>
        </div>
        <Button variant="outline" onClick={handleExportCSV} className="gap-2">
          <Download size={16} /> Export CSV
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-5 border-l-4 border-l-indigo-500 shadow-sm">
          <p className="text-sm font-semibold text-slate-500 uppercase">Final Monthly Outlay</p>
          <h2 className="text-2xl font-bold text-slate-800 mt-1">{formatINR(finalOutlay)}</h2>
          <div className={`text-sm mt-2 font-medium ${variance > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
            {variance > 0 ? '+' : ''}{variance.toFixed(1)}% variance vs baseline
          </div>
        </Card>
        <Card className="p-5 shadow-sm">
          <p className="text-sm font-semibold text-slate-500 uppercase">Total Horizon Outlay</p>
          <h2 className="text-2xl font-bold text-slate-800 mt-1">{formatINR(totalSumOutlay)}</h2>
          <p className="text-xs text-slate-400 mt-2">Sum of {horizonMonths} months + current</p>
        </Card>
        <Card className="p-5 shadow-sm">
          <p className="text-sm font-semibold text-slate-500 uppercase">Avg Cost Per Employee</p>
          <h2 className="text-2xl font-bold text-slate-800 mt-1">{formatINR(avgCostPerEmployee)}</h2>
          <p className="text-xs text-slate-400 mt-2">At final month</p>
        </Card>
        <Card className="p-5 shadow-sm">
          <p className="text-sm font-semibold text-slate-500 uppercase">Total Headcount</p>
          <h2 className="text-2xl font-bold text-slate-800 mt-1">{finalHeadcount}</h2>
          <p className="text-xs text-slate-400 mt-2">Δ {finalHeadcount - baselineData.totalHeadcount} from baseline</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Controls Sidebar */}
        <div className="lg:col-span-3 space-y-4">
          <Card className="p-5 bg-white shadow-sm space-y-5">
            <h3 className="font-bold text-slate-800 border-b pb-2">Simulation Parameters</h3>
            
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-600 uppercase flex justify-between">
                <span>Merit Increase</span>
                <span className="text-indigo-600">{meritIncreasePercent}%</span>
              </label>
              <input type="range" min="0" max="30" step="0.5" value={meritIncreasePercent} onChange={(e) => setMeritIncreasePercent(parseFloat(e.target.value))} className="w-full accent-indigo-600" />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-600 uppercase flex justify-between">
                <span>Headcount Growth</span>
                <span className={headcountGrowthPercent < 0 ? 'text-red-500' : 'text-indigo-600'}>{headcountGrowthPercent > 0 ? '+' : ''}{headcountGrowthPercent}%</span>
              </label>
              <input type="range" min="-20" max="100" step="1" value={headcountGrowthPercent} onChange={(e) => setHeadcountGrowthPercent(parseFloat(e.target.value))} className="w-full accent-indigo-600" />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-600 uppercase flex justify-between">
                <span>Avg New Hire Salary</span>
                <span className="text-indigo-600">{formatINR(avgNewHireSalary)}</span>
              </label>
              <input type="range" min="15000" max="250000" step="5000" value={avgNewHireSalary} onChange={(e) => setAvgNewHireSalary(parseFloat(e.target.value))} className="w-full accent-indigo-600" />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-600 uppercase flex justify-between">
                <span>Bonus Pool</span>
                <span className="text-indigo-600">{bonusPoolPercent}%</span>
              </label>
              <input type="range" min="0" max="25" step="0.5" value={bonusPoolPercent} onChange={(e) => setBonusPoolPercent(parseFloat(e.target.value))} className="w-full accent-indigo-600" />
            </div>
            
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-600 uppercase flex justify-between">
                <span>Employer PF Rate</span>
                <span className="text-indigo-600">{employerPfPercent}%</span>
              </label>
              <input type="range" min="0" max="20" step="0.5" value={employerPfPercent} onChange={(e) => setEmployerPfPercent(parseFloat(e.target.value))} className="w-full accent-indigo-600" />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-600 uppercase flex justify-between">
                <span>Fringe Benefits (Per Emp)</span>
                <span className="text-indigo-600">{formatINR(fringeBenefitPerEmployee)}</span>
              </label>
              <input type="range" min="0" max="75000" step="1000" value={fringeBenefitPerEmployee} onChange={(e) => setFringeBenefitPerEmployee(parseFloat(e.target.value))} className="w-full accent-indigo-600" />
            </div>

            <div className="space-y-2 pt-2 border-t">
              <label className="text-xs font-semibold text-slate-600 uppercase">Forecast Horizon</label>
              <select className="w-full rounded-lg border-slate-300 text-sm py-2 px-3" value={horizonMonths} onChange={e => setHorizonMonths(parseInt(e.target.value))}>
                <option value={1}>1 Month</option>
                <option value={3}>3 Months</option>
                <option value={6}>6 Months</option>
                <option value={12}>12 Months</option>
                <option value={24}>24 Months</option>
              </select>
            </div>
          </Card>

          <Card className="p-4 bg-slate-50 space-y-3 shadow-sm border border-slate-100">
            <h3 className="font-bold text-slate-700 text-sm">Preset Scenarios</h3>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" size="sm" className="text-[11px] py-1 px-1 h-auto" onClick={() => applyPreset(0, 0, 0, 0)}>Conservative</Button>
              <Button variant="outline" size="sm" className="text-[11px] py-1 px-1 h-auto" onClick={() => applyPreset(8, 15, 5, 2000)}>Mod. Expansion</Button>
              <Button variant="outline" size="sm" className="text-[11px] py-1 px-1 h-auto" onClick={() => applyPreset(12, 40, 10, 5000)}>Aggressive</Button>
              <Button variant="outline" size="sm" className="text-[11px] py-1 px-1 h-auto" onClick={() => applyPreset(0, -10, 0, 0)}>Compression</Button>
            </div>
          </Card>
        </div>

        {/* Charts & Tables */}
        <div className="lg:col-span-9 space-y-6">
          <Card className="p-6 shadow-sm">
            <h3 className="font-bold text-slate-800 mb-6">Projected Cost Trajectory</h3>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 5, right: 20, left: 20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorSim" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#4F46E5" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#6B7280', fontSize: 12}} dy={10} />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: '#6B7280', fontSize: 12}} 
                    tickFormatter={(val) => `₹${(val/100000).toFixed(1)}L`} 
                    dx={-10}
                  />
                  <RechartsTooltip 
                    formatter={(value) => formatINR(value)}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend verticalAlign="top" height={36} />
                  <Area type="monotone" dataKey="Simulated" stroke="#4F46E5" strokeWidth={3} fillOpacity={1} fill="url(#colorSim)" />
                  <Area type="step" dataKey="Baseline" stroke="#9CA3AF" strokeWidth={2} strokeDasharray="5 5" fill="none" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="p-6 shadow-sm">
              <h3 className="font-bold text-slate-800 mb-4">Cost Component Breakdown</h3>
              <div className="h-[250px] w-full relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip formatter={(val) => formatINR(val)} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card className="p-6 shadow-sm flex flex-col max-h-[350px]">
              <h3 className="font-bold text-slate-800 mb-4 shrink-0">Department Allocation (Final Month)</h3>
              <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="text-slate-500 border-b">
                      <th className="pb-2 font-semibold">Department</th>
                      <th className="pb-2 font-semibold text-right">Headcount</th>
                      <th className="pb-2 font-semibold text-right">Cost</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {finalMonthResult.departmentBreakdown.map((dept, i) => (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="py-3 font-medium text-slate-700">{dept.name}</td>
                        <td className="py-3 text-right">{dept.headcount}</td>
                        <td className="py-3 text-right text-indigo-700 font-medium">{formatINR(dept.cost)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
