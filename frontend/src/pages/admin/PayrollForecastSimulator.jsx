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
    <div ref={containerRef} className="w-full min-h-full flex flex-col gap-3.5 sm:gap-4 p-3 sm:p-5 md:p-6 bg-[#FAF9F6] font-sans text-[#1D1B16]">
      
      {/* ─── Page Header ─── */}
      <div className="cinematic-header flex flex-col min-[500px]:flex-row justify-between items-start min-[500px]:items-center gap-2.5 pb-2 border-b border-[#EAE7E0] w-full">
        <div>
          <h1 className="font-serif font-bold text-lg sm:text-2xl md:text-3xl text-[#1F2B4D] tracking-tight leading-tight flex items-center gap-2">
            <TrendingUp className="text-[#1F2B4D] w-5 h-5 sm:w-6 sm:h-6" />
            <span>Payroll Forecast Engine</span>
          </h1>
          <p className="text-[#6B655C] text-xs sm:text-sm font-medium mt-0.5">
            Executive dashboard for employer cost projections & scenario planning.
          </p>
        </div>
        <button 
          onClick={handleExportCSV} 
          className="w-full min-[500px]:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-[#1F2B4D] hover:bg-[#141C33] text-white text-xs font-display font-bold uppercase tracking-wider rounded-xl transition-all shadow-2xs shrink-0"
        >
          <Download size={14} className="shrink-0" /> 
          <span>Export Forecast</span>
        </button>
      </div>

      {/* ─── KPI Metrics (2x2 MOBILE / 4x1 DESKTOP) ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5 w-full">
        {[
          { label: 'Final Monthly Outlay', value: formatCompactINR(finalOutlay), sub: `${variance > 0 ? '+' : ''}${variance.toFixed(1)}% vs base`, highlight: variance > 0 ? 'text-amber-800 bg-amber-50 border-amber-200' : 'text-emerald-800 bg-emerald-50 border-emerald-200', icon: TrendingUp },
          { label: 'Total Horizon Outlay', value: formatCompactINR(totalSumOutlay), sub: `Sum of ${horizonMonths}m`, highlight: 'text-[#6B655C] bg-[#FAF8F5] border-[#EAE7E0]', icon: Banknote },
          { label: 'Avg Cost / Employee', value: formatCompactINR(avgCostPerEmployee), sub: 'At final month', highlight: 'text-[#6B655C] bg-[#FAF8F5] border-[#EAE7E0]', icon: Users },
          { label: 'Headcount Trajectory', value: finalHeadcount, sub: `Δ ${finalHeadcount - baselineData.totalHeadcount} vs base`, highlight: 'text-[#1F2B4D] bg-[#F0F3F9] border-[#CBD5E1]', icon: Users }
        ].map((kpi, idx) => (
          <div key={idx} className="cinematic-kpi p-3.5 sm:p-4 bg-white rounded-2xl border border-[#EAE7E0] shadow-2xs flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start mb-1.5">
                <span className="text-[9.5px] sm:text-[10.5px] font-display font-bold text-[#6B655C] uppercase tracking-wider block">{kpi.label}</span>
                <div className="p-1 bg-[#FAF8F5] rounded-lg border border-[#EAE7E0] text-[#1F2B4D]">
                  <kpi.icon size={14} />
                </div>
              </div>
              <span className="text-xl sm:text-2xl md:text-3xl font-bold text-[#1F2B4D] tracking-tight block">{kpi.value}</span>
            </div>
            <div className="mt-2.5">
              <span className={`inline-block px-2 py-0.5 rounded-md border text-[9.5px] sm:text-[10.5px] font-bold font-sans ${kpi.highlight}`}>
                {kpi.sub}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* ─── Main Interactive Canvas ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 sm:gap-4 w-full items-stretch">
        
        {/* ─── Controls Sidebar ─── */}
        <div className="lg:col-span-4 xl:col-span-3 w-full">
          <div className="cinematic-controls h-full p-4 sm:p-5 bg-white rounded-2xl border border-[#EAE7E0] shadow-2xs flex flex-col justify-between">
            <div>
              <h3 className="font-serif font-bold text-sm sm:text-base text-[#1F2B4D] tracking-tight flex items-center gap-2 mb-3.5 pb-2 border-b border-[#EAE7E0]">
                <SlidersHorizontal size={16} className="text-[#1F2B4D]" />
                <span>Simulation Parameters</span>
              </h3>

              <div className="space-y-3">
                {[
                  { label: 'Merit Increase', value: meritIncreasePercent, set: setMeritIncreasePercent, min: 0, max: 30, step: 0.5, format: v => `${v}%` },
                  { label: 'Headcount Growth', value: headcountGrowthPercent, set: setHeadcountGrowthPercent, min: -20, max: 100, step: 1, format: v => `${v > 0 ? '+' : ''}${v}%` },
                  { label: 'Avg New Hire Salary', value: avgNewHireSalary, set: setAvgNewHireSalary, min: 15000, max: Math.max(250000, avgNewHireSalary * 2), step: 5000, format: v => formatCompactINR(v) },
                  { label: 'Bonus Pool', value: bonusPoolPercent, set: setBonusPoolPercent, min: 0, max: 25, step: 0.5, format: v => `${v}%` },
                  { label: 'Employer PF Rate', value: employerPfPercent, set: setEmployerPfPercent, min: 0, max: 20, step: 0.5, format: v => `${v}%` },
                  { label: 'Fringe Benefits / Emp', value: fringeBenefitPerEmployee, set: setFringeBenefitPerEmployee, min: 0, max: Math.max(75000, fringeBenefitPerEmployee * 2), step: 1000, format: v => formatCompactINR(v) }
                ].map((ctrl, i) => (
                  <div key={i} className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-[#6B655C] flex justify-between items-center">
                      <span>{ctrl.label}</span>
                      <span className="text-[#1F2B4D] text-xs font-mono font-bold">{ctrl.format(ctrl.value)}</span>
                    </label>
                    <input 
                      type="range" min={ctrl.min} max={ctrl.max} step={ctrl.step} value={ctrl.value} onChange={(e) => ctrl.set(parseFloat(e.target.value))} 
                      className="w-full h-1.5 bg-[#FAF8F5] rounded-full appearance-none cursor-pointer outline-none accent-[#1F2B4D]" 
                    />
                  </div>
                ))}

                <div className="pt-3 border-t border-[#EAE7E0]">
                  <label className="text-xs font-semibold text-[#6B655C] block mb-1">Forecast Horizon</label>
                  <select 
                    value={horizonMonths} onChange={e => setHorizonMonths(parseInt(e.target.value))}
                    className="w-full bg-[#FAF8F5] border border-[#EAE7E0] text-[#1F2B4D] text-xs font-bold rounded-xl py-2 px-3 outline-none focus:ring-2 focus:ring-[#1F2B4D] cursor-pointer"
                  >
                    {[1,3,6,12,24].map(m => <option key={m} value={m}>{m} Months</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* Preset Scenarios */}
            <div className="mt-4 pt-3 border-t border-[#EAE7E0]">
              <h4 className="text-[10px] font-display font-bold text-[#6B655C] uppercase tracking-wider mb-2">Preset Scenarios</h4>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { name: 'Conservative', args: [0, 0, 0, 0] },
                  { name: 'Expansion', args: [8, 15, 5, 2000] },
                  { name: 'Aggressive', args: [12, 40, 10, 5000] },
                  { name: 'Compression', args: [0, -10, 0, 0] }
                ].map(preset => (
                  <button 
                    key={preset.name}
                    onClick={() => applyPreset(...preset.args)}
                    className="text-[10px] font-display font-bold text-[#1F2B4D] bg-[#FAF8F5] border border-[#EAE7E0] py-1.5 px-2 rounded-lg transition-all hover:bg-white hover:border-[#1F2B4D] text-center"
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ─── Main Visualizations ─── */}
        <div className="lg:col-span-8 xl:col-span-9 flex flex-col gap-3.5 sm:gap-4 w-full justify-between">
          
          {/* Chart Section */}
          <div className="cinematic-chart p-4 sm:p-5 bg-white rounded-2xl border border-[#EAE7E0] shadow-2xs w-full">
            <h3 className="font-serif font-bold text-sm sm:text-base text-[#1F2B4D] tracking-tight flex items-center gap-2 mb-3">
              <TrendingUp size={16} className="text-[#1F2B4D]" />
              <span>Projected Cost Trajectory</span>
            </h3>
            <div className="h-[260px] sm:h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorSim" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#1F2B4D" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#1F2B4D" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EAE7E0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#6B655C', fontSize: 10, fontWeight: 600}} dy={10} />
                  <YAxis 
                    axisLine={false} tickLine={false} 
                    width={60}
                    tick={{fill: '#6B655C', fontSize: 10, fontWeight: 600}} 
                    tickFormatter={(val) => formatCompactINR(val)} 
                  />
                  <RechartsTooltip content={<CustomAreaTooltip />} wrapperStyle={{ zIndex: 100, outline: 'none' }} />
                  <Legend verticalAlign="top" height={30} iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 600, color: '#6B655C' }} />
                  <Area type="monotone" dataKey="Simulated" stroke="#1F2B4D" strokeWidth={3} fillOpacity={1} fill="url(#colorSim)" activeDot={{r: 5, fill: '#1F2B4D', stroke: '#FFF', strokeWidth: 2}} />
                  <Area type="step" dataKey="Baseline" stroke="#9A948A" strokeWidth= {2} strokeDasharray="5 5" fill="none" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Bottom Breakdown Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4 w-full items-stretch">
            
            {/* Cost Breakdown Card */}
            <div className="cinematic-breakdown p-4 sm:p-5 bg-white rounded-2xl border border-[#EAE7E0] shadow-2xs flex flex-col w-full">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-serif font-bold text-sm sm:text-base text-[#1F2B4D] tracking-tight flex items-center gap-2">
                  <PieChartIcon size={16} className="text-[#1F2B4D]" />
                  <span>Cost Component Breakdown</span>
                </h3>
                {hoveredSlice && (
                  <span className="text-[10px] font-bold font-mono text-[#1F2B4D] bg-[#F0F3F9] px-2 py-0.5 rounded-full border border-[#CBD5E1]">
                    {formatINR(hoveredSlice.value)}
                  </span>
                )}
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 min-h-[220px] w-full">
                {/* Left: Donut Chart with Center Hole Text */}
                <div className="w-full sm:w-[180px] h-[180px] sm:h-[220px] relative shrink-0 flex items-center justify-center mx-auto">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%" 
                        cy="50%"
                        innerRadius={48} 
                        outerRadius={72}
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
                    <span className="text-[9px] font-display font-bold uppercase tracking-wider text-[#6B655C] truncate max-w-[80px]">
                      {hoveredSlice ? hoveredSlice.name : 'Total Outlay'}
                    </span>
                    <span className="text-xs sm:text-sm font-bold text-[#1F2B4D]">
                      {formatCompactINR(hoveredSlice ? hoveredSlice.value : finalOutlay)}
                    </span>
                  </div>
                </div>

                {/* Right: Custom Rich Legend List */}
                <div className="flex-1 w-full overflow-y-auto [&::-webkit-scrollbar]:hidden flex flex-col justify-center space-y-1 sm:pl-3 sm:border-l border-[#EAE7E0]">
                  {pieData.map((item, idx) => {
                    const pct = finalOutlay > 0 ? ((item.value / finalOutlay) * 100).toFixed(1) : 0;
                    const isHovered = hoveredSlice?.name === item.name;
                    return (
                      <div 
                        key={idx}
                        onMouseEnter={() => setHoveredSlice(item)}
                        onMouseLeave={() => setHoveredSlice(null)}
                        className={`flex items-center justify-between p-1 rounded-lg transition-colors cursor-pointer ${isHovered ? 'bg-[#F0F3F9]' : 'hover:bg-[#FAF8F5]'}`}
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                          <span className="text-xs font-medium text-[#1F2B4D] truncate">
                            {item.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0 ml-1">
                          <span className="text-[9px] font-bold text-[#6B655C] font-mono bg-[#FAF8F5] px-1 py-0.5 rounded border border-[#EAE7E0]">{pct}%</span>
                          <span className="text-xs font-mono font-bold text-[#1F2B4D]">{formatCompactINR(item.value)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Department Allocation Card */}
            <div className="cinematic-table p-4 sm:p-5 bg-white rounded-2xl border border-[#EAE7E0] shadow-2xs flex flex-col w-full">
              <h3 className="font-serif font-bold text-sm sm:text-base text-[#1F2B4D] tracking-tight flex items-center justify-between gap-2 mb-3">
                <span className="flex items-center gap-2">
                  <Users size={16} className="text-[#1F2B4D]" />
                  <span>Department Allocation</span>
                </span>
                <span className="text-[9px] font-display font-bold text-[#6B655C] uppercase tracking-wider bg-[#FAF8F5] px-2 py-0.5 rounded-full border border-[#EAE7E0]">Final Month</span>
              </h3>
              <div className="h-[220px] overflow-y-auto [&::-webkit-scrollbar]:hidden w-full">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="sticky top-0 bg-white border-b border-[#EAE7E0]">
                    <tr className="text-[9.5px] font-display font-bold uppercase tracking-wider text-[#6B655C]">
                      <th className="pb-2">Department</th>
                      <th className="pb-2 text-right">Headcount</th>
                      <th className="pb-2 text-right">Final Cost</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F4F1EA]">
                    {finalMonthResult.departmentBreakdown.map((dept, i) => (
                      <tr key={i} className="hover:bg-[#FAF8F5] transition-colors">
                        <td className="py-2 font-semibold text-[#1F2B4D]">{dept.name}</td>
                        <td className="py-2 text-right">
                          <span className="inline-flex px-2 py-0.5 text-[10px] font-mono font-bold rounded-full bg-[#F0F3F9] text-[#1F2B4D]">
                            {dept.headcount}
                          </span>
                        </td>
                        <td className="py-2 text-right font-mono font-bold text-[#1F2B4D]">{formatCompactINR(dept.cost)}</td>
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
  );
}

