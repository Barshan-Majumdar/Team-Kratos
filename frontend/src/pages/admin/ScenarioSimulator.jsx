import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const ScenarioSimulator = () => {
  const [loading, setLoading] = useState(false);
  const [scenarioResult, setScenarioResult] = useState(null);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    action: 'ADD_HEADCOUNT',
    departmentId: 'engineering',
    count: 1,
    overtimeReductionAssumption: 10, // Default 10%
    inputMetricVersion: new Date().toISOString().slice(0, 7) // Current YYYY-MM
  });

  const handleRunSimulation = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setScenarioResult(null);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/intelligence/scenario`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          action: formData.action,
          parameters: {
            departmentId: formData.departmentId,
            count: parseInt(formData.count)
          },
          assumptions: {
            OVERTIME_REDUCTION: parseFloat(formData.overtimeReductionAssumption) / 100
          },
          inputMetricVersion: formData.inputMetricVersion
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Simulation failed');
      setScenarioResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (val) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Workforce Scenario Simulator</h1>
        <p className="text-slate-500 mt-2">Deterministically project organizational and financial impacts using standardized WorkforceMetrics.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Input Panel */}
        <div className="lg:col-span-1 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"></path></svg>
            Simulation Parameters
          </h2>
          <form onSubmit={handleRunSimulation} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Action</label>
              <select 
                value={formData.action}
                onChange={e => setFormData({...formData, action: e.target.value})}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="ADD_HEADCOUNT">Hire Employees</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Department</label>
              <select 
                value={formData.departmentId}
                onChange={e => setFormData({...formData, departmentId: e.target.value})}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="engineering">Engineering</option>
                <option value="sales">Sales</option>
                <option value="hr">HR</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Headcount Change</label>
              <input 
                type="number" min="1" max="100"
                value={formData.count}
                onChange={e => setFormData({...formData, count: e.target.value})}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Assumption: Overtime Reduction (%)</label>
              <input 
                type="number" min="0" max="100"
                value={formData.overtimeReductionAssumption}
                onChange={e => setFormData({...formData, overtimeReductionAssumption: e.target.value})}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              />
              <p className="text-xs text-slate-500 mt-1">Expected reduction in current overtime due to increased capacity.</p>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 rounded-lg transition-colors flex justify-center items-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                'Run Projection'
              )}
            </button>
          </form>
          {error && <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}
        </div>

        {/* Output Panel */}
        <div className="lg:col-span-2 bg-slate-50 p-6 rounded-2xl shadow-inner border border-slate-200 min-h-[500px]">
          {!scenarioResult && !loading && (
            <div className="h-full flex flex-col items-center justify-center text-slate-400">
              <svg className="w-16 h-16 mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
              <p>Configure parameters and run a projection to see the deterministic outcome.</p>
            </div>
          )}

          <AnimatePresence mode="wait">
            {scenarioResult && !loading && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <div>
                    <p className="text-sm font-medium text-slate-500">Audit ID</p>
                    <p className="font-mono text-xs text-indigo-600 font-semibold">{scenarioResult.scenarioId}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-slate-500">Net Monthly Cost Change</p>
                    <p className={`text-2xl font-bold ${scenarioResult.result.delta.netMonthlyCostChange > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {scenarioResult.result.delta.netMonthlyCostChange > 0 ? '+' : ''}{formatCurrency(scenarioResult.result.delta.netMonthlyCostChange)}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Baseline Column */}
                  <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="font-bold text-slate-800 mb-4 border-b pb-2">Current Baseline</h3>
                    <div className="space-y-4">
                      <MetricRow label="Headcount" data={scenarioResult.result.baseline.headcount} />
                      <MetricRow label="Monthly Payroll" data={scenarioResult.result.baseline.payrollCost} isCurrency />
                      <MetricRow label="Monthly Overtime" data={scenarioResult.result.baseline.overtimeCost} isCurrency />
                    </div>
                  </div>

                  {/* Projection Column */}
                  <div className="bg-indigo-50/50 p-5 rounded-xl border border-indigo-100 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 bg-indigo-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg">SCENARIO</div>
                    <h3 className="font-bold text-indigo-900 mb-4 border-b border-indigo-200 pb-2">Projected Outcome</h3>
                    <div className="space-y-4">
                      <MetricRow label="New Headcount" data={scenarioResult.result.projection.headcount} />
                      <MetricRow label="Projected Payroll" data={scenarioResult.result.projection.payrollCost} isCurrency />
                      <MetricRow label="Projected Overtime" data={scenarioResult.result.projection.overtimeCost} isCurrency />
                    </div>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <h4 className="text-sm font-bold text-slate-800 mb-2">Mathematical Assumptions</h4>
                  <ul className="text-sm text-slate-600 space-y-1 list-disc pl-5">
                    <li>Average {formData.departmentId} salary used for new headcount base calculations.</li>
                    <li>Estimated overtime reduction: <span className="font-semibold text-slate-800">{formData.overtimeReductionAssumption}%</span> <span className="ml-1 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-800">ASSUMPTION</span></li>
                    <li>No hiring ramp-up delay included in the immediate monthly projection.</li>
                  </ul>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

const MetricRow = ({ label, data, isCurrency }) => {
  const formatVal = (val) => isCurrency ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val) : val;
  
  const getBadgeStyle = (type) => {
    switch (type) {
      case 'FACT': return 'bg-slate-100 text-slate-600 border-slate-200';
      case 'PROJECTION': return 'bg-indigo-100 text-indigo-700 border-indigo-200';
      case 'ESTIMATE': return 'bg-teal-100 text-teal-700 border-teal-200';
      case 'ASSUMPTION': return 'bg-amber-100 text-amber-800 border-amber-200';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="flex justify-between items-center">
      <span className="text-sm font-medium text-slate-600">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-base font-bold text-slate-900">{formatVal(data.value)}</span>
        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${getBadgeStyle(data.type)}`}>
          {data.type}
        </span>
      </div>
    </div>
  );
};

export default ScenarioSimulator;
