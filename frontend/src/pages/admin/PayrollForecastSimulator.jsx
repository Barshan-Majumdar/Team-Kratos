import React, { useState, useEffect, useMemo, useRef } from 'react';
import { TrendingUp, Users, Banknote, Download, Loader2, SlidersHorizontal, PieChart as PieChartIcon } from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

function calculateFullCTC(monthWage, { basicPercent, hraPercent, employerPfPercent }, bonusPoolPercent, fringeBenefit) {
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
    const growthRamp = headcountGrowthPercent * (month / horizonMonths);
    let monthTotalCTC = 0;
    const departmentBreakdown = [];
    const totalBaselineHeadcount = baselineDepartments.reduce((s, d) => s + d.headcount, 0);

    let monthBasicCost = 0;
    let monthEmployerPfCost = 0;
    let monthFringeCost = 0;
    let monthBonusCost = 0;
    let monthGrossCost = 0;

    for (const dept of baselineDepartments) {
      const existingHeadcount = dept.headcount;
      const avgExistingSalary = existingHeadcount > 0 ? dept.totalBaseSalary / existingHeadcount : 0;
      const proratedExisting = month === 0 ? avgExistingSalary : avgExistingSalary * (1 + meritIncreasePercent / 100);

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

      const totalBasic = (existingMetrics.basic * existingRetained) + (newHireMetrics.basic * newHireCount);
      const totalPf = ((existingMetrics.basic * (payrollConfig.employerPfPercent / 100)) * existingRetained) + ((newHireMetrics.basic * (payrollConfig.employerPfPercent / 100)) * newHireCount);
      const totalBonus = ((existingMetrics.basic * (bonusPoolPercent / 100)) * existingRetained) + ((newHireMetrics.basic * (bonusPoolPercent / 100)) * newHireCount);
      
      monthBasicCost += totalBasic;
      monthEmployerPfCost += totalPf;
      monthFringeCost += fringeBenefitPerEmployee * simulatedHeadcount;
      monthBonusCost += totalBonus;
      monthGrossCost += (proratedExisting * existingRetained) + (avgNewHireSalary * newHireCount);
    }

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

const formatCompactINR = (value) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    notation: 'compact',
    maximumFractionDigits: 1
  }).format(value);
};

// Compact Non-Overlapping Custom Tooltip for Pie Chart
const CustomPieTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0];
    return (
      <div className="bg-[#1F2B4D] text-white px-3 py-1.5 rounded-xl shadow-2xl border border-white/10 text-[12px] font-sans font-medium flex items-center gap-2 z-50 pointer-events-none">
        <span className="w-2.5 h-2.5 rounded-full shrink-0 inline-block" style={{ backgroundColor: data.payload.color }} />
        <span className="text-white/80 font-medium">{data.name}:</span>
        <span className="font-bold text-white font-mono">{formatINR(data.value)}</span>
      </div>
    );
  }
  return null;
};

// Compact Custom Tooltip for Area Chart
const CustomAreaTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#1F2B4D] text-white px-4 py-3 rounded-2xl border border-white/10 shadow-2xl text-[12px] font-sans space-y-1.5 z-50 pointer-events-none">
        <p className="font-bold text-white/70 font-outfit text-[11px] uppercase tracking-wider">{label}</p>
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center justify-between gap-5 text-[12px]">
            <span className="flex items-center gap-2 font-medium text-white/80">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color || entry.stroke }} />
              {entry.name}:
            </span>
            <span className="font-bold text-white font-mono">{formatINR(entry.value)}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default function PayrollForecastSimulator() {
  const containerRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [baselineData, setBaselineData] = useState(null);
  const [hoveredSlice, setHoveredSlice] = useState(null);

  // Sliders State
  const [meritIncreasePercent, setMeritIncreasePercent] = useState(0);
  const [headcountGrowthPercent, setHeadcountGrowthPercent] = useState(0);
  const [avgNewHireSalary, setAvgNewHireSalary] = useState(50000);
  const [bonusPoolPercent, setBonusPoolPercent] = useState(0);
  const [employerPfPercent, setEmployerPfPercent] = useState(12);
  const [fringeBenefitPerEmployee, setFringeBenefitPerEmployee] = useState(0);
  const [horizonMonths, setHorizonMonths] = useState(12);

  useGSAP(() => {
    if (loading || !baselineData) return;

    const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

    tl.fromTo('.cinematic-header',
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.8, clearProps: "transform" }
    )
    .fromTo('.cinematic-kpi',
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.6, stagger: 0.08, clearProps: "transform" },
      "-=0.5"
    )
    .fromTo('.cinematic-controls',
      { opacity: 0, x: -20 },
      { opacity: 1, x: 0, duration: 0.7, clearProps: "transform" },
      "-=0.4"
    )
    .fromTo('.cinematic-chart',
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.7, clearProps: "transform" },
      "-=0.5"
    )
    .fromTo(['.cinematic-breakdown', '.cinematic-table'],
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.7, stagger: 0.1, clearProps: "transform" },
      "-=0.5"
    );
  }, { scope: containerRef, dependencies: [loading, baselineData] });

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
      <div className="flex h-full items-center justify-center min-h-[400px]">
        <Loader2 className="animate-spin text-[#1F2B4D] w-8 h-8" />
      </div>
    );
  }

  if (!baselineData) return null;

  const currentOutlay = simulatedResults[0]?.totalCost || 0;
  const finalMonthResult = simulatedResults[horizonMonths] || simulatedResults[0];
  const finalOutlay = finalMonthResult.totalCost;
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
    { name: 'Basic', value: finalMonthResult.breakdown.basic, color: '#1F2B4D' },
    { name: 'HRA', value: finalMonthResult.breakdown.hra, color: '#3B82F6' },
    { name: 'Performance Bonus', value: finalMonthResult.breakdown.bonus, color: '#10B981' },
    { name: 'Other Allowances', value: finalMonthResult.breakdown.otherAllowances, color: '#F59E0B' },
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

  // Reusable Executive Doppelrand Architecture Styles
  const doppelrandOuter = "h-full flex flex-col bg-[#F4F1EA] rounded-[20px] p-1 shadow-[0_4px_24px_rgba(29,27,22,0.04)] transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:-translate-y-1 hover:shadow-[0_12px_32px_-6px_rgba(29,27,22,0.10)]";
  const doppelrandInner = "bg-white rounded-[16px] border border-[#EAE7E0] w-full h-full relative overflow-hidden flex flex-col justify-between";

  return (
    <div ref={containerRef} className="p-4 md:p-8 lg:p-12 max-w-[1440px] mx-auto space-y-8 bg-[#FAF9F6] min-h-screen font-sans text-[#1D1B16]">
      
      {/* ─── Page Header ─── */}
      <div className="cinematic-header flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-2">
        <div>
          <h1 className="text-[32px] sm:text-[38px] md:text-[42px] font-bold text-[#1D1B16] font-outfit tracking-tight leading-tight mb-1.5">
            Payroll Forecast Engine
          </h1>
          <p className="text-[#6B655C] text-[14px] sm:text-[15px] font-medium tracking-normal font-sans">
            Executive dashboard for employer cost projections & scenario planning.
          </p>
        </div>
        <button 
          onClick={handleExportCSV} 
          className="group inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#1F2B4D] text-white text-[13px] font-semibold font-sans rounded-full shadow-[0_4px_12px_rgba(31,43,77,0.2)] transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:scale-[1.03] hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(31,43,77,0.3)] hover:bg-[#141C33] active:scale-95 cursor-pointer"
        >
          <Download size={16} strokeWidth={2.5} className="transition-transform duration-300 group-hover:-translate-y-0.5" /> 
          Export Forecast
        </button>
      </div>

      {/* ─── KPI Metrics ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Final Monthly Outlay', value: formatCompactINR(finalOutlay), sub: `${variance > 0 ? '+' : ''}${variance.toFixed(1)}% vs baseline`, highlight: variance > 0 ? 'text-[#8C5722] bg-[#FDF8F3] border-[#EEDCCE]' : 'text-[#065F46] bg-[#ECFDF5] border-[#A7F3D0]', icon: TrendingUp, color: 'text-[#1F2B4D]', bg: 'bg-[#F0F3F9]' },
          { label: 'Total Horizon Outlay', value: formatCompactINR(totalSumOutlay), sub: `Sum of ${horizonMonths} months`, highlight: 'text-[#6B655C] bg-[#F4F1EA] border-[#EAE7E0]', icon: Banknote, color: 'text-[#1F2B4D]', bg: 'bg-[#F0F3F9]' },
          { label: 'Average Cost Per Employee', value: formatCompactINR(avgCostPerEmployee), sub: 'At final month', highlight: 'text-[#6B655C] bg-[#F4F1EA] border-[#EAE7E0]', icon: Users, color: 'text-[#1F2B4D]', bg: 'bg-[#F0F3F9]' },
          { label: 'Total Headcount Trajectory', value: finalHeadcount, sub: `Δ ${finalHeadcount - baselineData.totalHeadcount} from baseline`, highlight: 'text-[#1F2B4D] bg-[#F0F3F9] border-[#E2E8F0]', icon: Users, color: 'text-[#1F2B4D]', bg: 'bg-[#F0F3F9]' }
        ].map((kpi, idx) => (
          <div key={idx} className="cinematic-kpi h-full">
            <div className={doppelrandOuter}>
              <div className={`${doppelrandInner} p-4`}>
                <div className="absolute -top-2 -right-2 p-3 opacity-5 group-hover:opacity-10 transition-opacity duration-700 pointer-events-none">
                  <kpi.icon size={72} className={kpi.color} />
                </div>
                <div className="flex flex-col justify-between h-full">
                  <div>
                    <div className={`inline-flex p-2 rounded-lg ${kpi.bg} ${kpi.color} mb-2`}>
                      <kpi.icon size={16} strokeWidth={2.5} />
                    </div>
                    <p className="text-[10px] sm:text-[11px] font-bold text-[#6B655C] font-sans uppercase tracking-[0.08em] mb-0.5">{kpi.label}</p>
                    <h2 className="text-[22px] md:text-[24px] font-black text-[#1D1B16] font-outfit tracking-tight">{kpi.value}</h2>
                  </div>
                  <div className="mt-3 flex items-center">
                    <span className={`inline-flex px-2 py-0.5 rounded-md border text-[10px] sm:text-[11px] font-bold font-sans ${kpi.highlight}`}>
                      {kpi.sub}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ─── Main Interactive Canvas ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        
        {/* ─── Controls Sidebar ─── */}
        <div className="lg:col-span-4 xl:col-span-3">
          <div className="cinematic-controls h-full">
            <div className={doppelrandOuter}>
              <div className={`${doppelrandInner} p-6`}>
                <h3 className="text-[16px] font-bold text-[#1D1B16] font-outfit tracking-tight flex items-center gap-2 mb-5 pb-3 border-b border-[#EAE7E0] shrink-0">
                  <SlidersHorizontal size={18} strokeWidth={2.5} className="text-[#1F2B4D]" />
                  Simulation Parameters
                </h3>

                <div className="space-y-4 flex-1">
                  {[
                    { label: 'Merit Increase', value: meritIncreasePercent, set: setMeritIncreasePercent, min: 0, max: 30, step: 0.5, format: v => `${v}%` },
                    { label: 'Headcount Growth', value: headcountGrowthPercent, set: setHeadcountGrowthPercent, min: -20, max: 100, step: 1, format: v => `${v > 0 ? '+' : ''}${v}%` },
                    { label: 'Avg New Hire Salary', value: avgNewHireSalary, set: setAvgNewHireSalary, min: 15000, max: Math.max(250000, avgNewHireSalary * 2), step: 5000, format: v => formatCompactINR(v) },
                    { label: 'Bonus Pool', value: bonusPoolPercent, set: setBonusPoolPercent, min: 0, max: 25, step: 0.5, format: v => `${v}%` },
                    { label: 'Employer PF Rate', value: employerPfPercent, set: setEmployerPfPercent, min: 0, max: 20, step: 0.5, format: v => `${v}%` },
                    { label: 'Fringe Benefits / Emp', value: fringeBenefitPerEmployee, set: setFringeBenefitPerEmployee, min: 0, max: Math.max(75000, fringeBenefitPerEmployee * 2), step: 1000, format: v => formatCompactINR(v) }
                  ].map((ctrl, i) => (
                    <div key={i} className="flex flex-col gap-1.5">
                      <label className="text-[12px] font-semibold text-[#6B655C] font-sans flex justify-between items-center">
                        <span>{ctrl.label}</span>
                        <span className="text-[#1F2B4D] text-[13px] font-bold font-mono">{ctrl.format(ctrl.value)}</span>
                      </label>
                      <input 
                        type="range" min={ctrl.min} max={ctrl.max} step={ctrl.step} value={ctrl.value} onChange={(e) => ctrl.set(parseFloat(e.target.value))} 
                        className="w-full h-1.5 bg-[#EAE7E0] rounded-full appearance-none cursor-pointer outline-none transition-all duration-300 accent-[#1F2B4D] hover:accent-[#141C33]" 
                      />
                    </div>
                  ))}

                  <div className="pt-4 border-t border-[#EAE7E0]">
                    <label className="text-[12px] font-semibold text-[#6B655C] font-sans block mb-2">Forecast Horizon</label>
                    <div className="relative">
                      <select 
                        value={horizonMonths} onChange={e => setHorizonMonths(parseInt(e.target.value))}
                        className="w-full bg-[#FAF9F6] border border-[#EAE7E0] text-[#1D1B16] text-[13px] font-bold font-sans rounded-xl py-2 px-3 outline-none focus:ring-2 focus:ring-[#1F2B4D] focus:border-[#1F2B4D] transition-all duration-300 cursor-pointer appearance-none"
                      >
                        {[1,3,6,12,24].map(m => <option key={m} value={m}>{m} Months</option>)}
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-[#6B655C]">
                        <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" fillRule="evenodd"></path></svg>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Preset Scenarios */}
                <div className="mt-5 pt-4 border-t border-[#EAE7E0] shrink-0">
                  <h4 className="text-[12px] font-semibold text-[#6B655C] font-sans uppercase tracking-[0.05em] mb-2.5">Preset Scenarios</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { name: 'Conservative', args: [0, 0, 0, 0] },
                      { name: 'Mod. Expansion', args: [8, 15, 5, 2000] },
                      { name: 'Aggressive', args: [12, 40, 10, 5000] },
                      { name: 'Compression', args: [0, -10, 0, 0] }
                    ].map(preset => (
                      <button 
                        key={preset.name}
                        onClick={() => applyPreset(...preset.args)}
                        className="text-[11px] font-bold font-sans text-[#1D1B16] bg-[#FAF9F6] border border-[#EAE7E0] py-2 px-2 rounded-xl transition-all duration-300 hover:scale-[1.02] hover:border-[#1F2B4D] hover:text-[#1F2B4D] hover:bg-white active:scale-95 text-center cursor-pointer"
                      >
                        {preset.name}
                      </button>
                    ))}
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>

        {/* ─── Main Visualizations ─── */}
        <div className="lg:col-span-8 xl:col-span-9 space-y-5 flex flex-col justify-between">
          
          {/* Chart Section */}
          <div className="cinematic-chart h-full">
            <div className={doppelrandOuter}>
              <div className={`${doppelrandInner} p-6`}>
                <h3 className="text-[16px] font-bold text-[#1D1B16] font-outfit tracking-tight flex items-center gap-2 mb-4 shrink-0">
                  <TrendingUp size={18} strokeWidth={2.5} className="text-[#1F2B4D]" />
                  Projected Cost Trajectory
                </h3>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                      <defs>
                        <linearGradient id="colorSim" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#1F2B4D" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="#1F2B4D" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EAE7E0" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#6B655C', fontSize: 11, fontWeight: 600, fontFamily: 'Plus Jakarta Sans'}} dy={10} />
                      <YAxis 
                        axisLine={false} tickLine={false} 
                        width={70}
                        tick={{fill: '#6B655C', fontSize: 11, fontWeight: 600, fontFamily: 'Plus Jakarta Sans'}} 
                        tickFormatter={(val) => formatCompactINR(val)} 
                        dx={-10}
                      />
                      <RechartsTooltip content={<CustomAreaTooltip />} wrapperStyle={{ zIndex: 100, outline: 'none' }} />
                      <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '13px', fontWeight: 600, color: '#6B655C', fontFamily: 'Plus Jakarta Sans' }} />
                      <Area type="monotone" dataKey="Simulated" stroke="#1F2B4D" strokeWidth={3.5} fillOpacity={1} fill="url(#colorSim)" activeDot={{r: 6, fill: '#1F2B4D', stroke: '#FFF', strokeWidth: 2}} />
                      <Area type="step" dataKey="Baseline" stroke="#9A948A" strokeWidth={2.5} strokeDasharray="6 6" fill="none" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Breakdown Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-stretch">
            
            {/* Cost Breakdown Card */}
            <div className="cinematic-breakdown h-full">
              <div className={doppelrandOuter}>
                <div className={`${doppelrandInner} p-6`}>
                  <div className="flex items-center justify-between mb-2 shrink-0">
                    <h3 className="text-[16px] font-bold text-[#1D1B16] font-outfit tracking-tight flex items-center gap-2">
                      <PieChartIcon size={18} strokeWidth={2.5} className="text-[#1F2B4D]" />
                      Cost Component Breakdown
                    </h3>
                    {hoveredSlice && (
                      <span className="text-[11px] font-bold font-mono text-[#1F2B4D] bg-[#F0F3F9] px-2.5 py-0.5 rounded-full border border-[#E2E8F0] animate-fade-in">
                        {formatINR(hoveredSlice.value)}
                      </span>
                    )}
                  </div>

                  <div className="h-[250px] w-full flex items-center justify-between gap-2">
                    {/* Left: Donut Chart with Center Hole Text */}
                    <div className="h-full w-[200px] relative shrink-0 flex items-center justify-center">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={pieData}
                            cx="50%" 
                            cy="50%"
                            innerRadius={54} 
                            outerRadius={80}
                            paddingAngle={4}
                            dataKey="value"
                            stroke="none"
                            cornerRadius={6}
                            onMouseEnter={(_, index) => setHoveredSlice(pieData[index])}
                            onMouseLeave={() => setHoveredSlice(null)}
                          >
                            {pieData.map((entry, index) => (
                              <Cell 
                                key={`cell-${index}`} 
                                fill={entry.color}
                                opacity={hoveredSlice ? (hoveredSlice.name === entry.name ? 1 : 0.45) : 1}
                                className="transition-opacity duration-300 cursor-pointer outline-none"
                              />
                            ))}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>

                      {/* Donut Hole Center Badge */}
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center p-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B655C] font-sans truncate max-w-[90px]">
                          {hoveredSlice ? hoveredSlice.name : 'Total Outlay'}
                        </span>
                        <span className="text-[15px] font-black text-[#1F2B4D] font-outfit tracking-tight">
                          {formatCompactINR(hoveredSlice ? hoveredSlice.value : finalOutlay)}
                        </span>
                      </div>
                    </div>

                    {/* Right: Custom Rich Legend List */}
                    <div className="flex-1 h-full overflow-y-auto custom-scrollbar flex flex-col justify-center space-y-1 pl-3 border-l border-[#EAE7E0]">
                      {pieData.map((item, idx) => {
                        const pct = finalOutlay > 0 ? ((item.value / finalOutlay) * 100).toFixed(1) : 0;
                        const isHovered = hoveredSlice?.name === item.name;
                        return (
                          <div 
                            key={idx}
                            onMouseEnter={() => setHoveredSlice(item)}
                            onMouseLeave={() => setHoveredSlice(null)}
                            className={`flex items-center justify-between p-1.5 rounded-xl transition-all duration-200 cursor-pointer ${isHovered ? 'bg-[#F0F3F9] translate-x-0.5' : 'hover:bg-[#FAF9F6]'}`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                              <span className={`text-[12px] font-semibold font-sans truncate ${isHovered ? 'text-[#1F2B4D]' : 'text-[#6B655C]'}`}>
                                {item.name}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0 ml-2">
                              <span className="text-[10px] font-bold text-[#9A948A] font-mono bg-[#F4F1EA] px-1.5 py-0.5 rounded">{pct}%</span>
                              <span className="text-[12px] font-bold text-[#1D1B16] font-mono">{formatCompactINR(item.value)}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Department Allocation Card */}
            <div className="cinematic-table h-full">
              <div className={doppelrandOuter}>
                <div className={`${doppelrandInner} p-6`}>
                  <h3 className="text-[16px] font-bold text-[#1D1B16] font-outfit tracking-tight flex items-center gap-2 mb-4 shrink-0 justify-between">
                    <span className="flex items-center gap-2">
                      <Users size={18} strokeWidth={2.5} className="text-[#1F2B4D]" />
                      Department Allocation
                    </span>
                    <span className="text-[11px] font-bold font-sans text-[#6B655C] bg-[#F4F1EA] px-2 py-0.5 rounded-md border border-[#EAE7E0]">Final Month</span>
                  </h3>
                  <div className="h-[250px] overflow-y-auto pr-1">
                    <table className="w-full text-left text-[13px] font-sans">
                      <thead className="sticky top-0 bg-white shadow-[0_1px_0_#EAE7E0]">
                        <tr>
                          <th className="pb-2.5 text-[11px] font-bold uppercase tracking-wider text-[#6B655C]">Department</th>
                          <th className="pb-2.5 text-[11px] font-bold uppercase tracking-wider text-[#6B655C] text-right">Headcount</th>
                          <th className="pb-2.5 text-[11px] font-bold uppercase tracking-wider text-[#6B655C] text-right">Final Cost</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#EAE7E0]/60">
                        {finalMonthResult.departmentBreakdown.map((dept, i) => (
                          <tr key={i} className="group hover:bg-[#FAF9F6] transition-colors duration-200">
                            <td className="py-3 font-semibold text-[#1D1B16] font-sans">{dept.name}</td>
                            <td className="py-3 text-right">
                              <span className="inline-flex px-2 py-0.5 text-[11px] font-bold rounded-full bg-[#F0F3F9] text-[#1F2B4D] font-mono">
                                {dept.headcount}
                              </span>
                            </td>
                            <td className="py-3 text-right font-bold text-[#1F2B4D] font-mono">{formatCompactINR(dept.cost)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
}

