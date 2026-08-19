import React, { useState, useEffect } from 'react';
import { Shield, TrendingUp, AlertTriangle, IndianRupee, Info, Bot } from 'lucide-react';
import toast from 'react-hot-toast';

const WorkforceCostIntelligence = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [department, setDepartment] = useState('Engineering');
  const [period, setPeriod] = useState('2026-08');

  useEffect(() => {
    fetchData();
  }, [department, period]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const res = await fetch(`${API_BASE}/api/cost-intelligence/summary?department=${department}&period=${period}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      } else {
        toast.error(json.message || 'Failed to load cost intelligence');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error fetching cost intelligence');
    }
    setLoading(false);
  };

  const handleInvestigate = (anomaly) => {
    // Determine the original metric name since anomaly type is METRIC_ANOMALY
    const metricName = anomaly.type.replace('_ANOMALY', '');
    window.dispatchEvent(
      new CustomEvent('toggle-chatbot', {
        detail: {
          prompt: `Investigate the ${metricName} anomaly in the ${department} department for ${period}. Why is it ${anomaly.deltaPercent}% above baseline?`,
          context: { department, period, baselinePeriod: period === '2026-08' ? '2026-07' : '', anomaly }
        }
      })
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!data) return null;

  const insights = data.insights || [];
  const anomalies = insights.flatMap(i => i.anomalies || []);

  const totalDirectCost = insights
    .filter(i => ['PAYROLL_COST', 'OVERTIME_COST', 'BENEFITS_COST', 'BONUS_COST'].includes(i.metric))
    .reduce((sum, i) => sum + (i.currentValue || 0), 0);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <IndianRupee className="w-6 h-6 text-indigo-600" />
            Workforce Cost Intelligence
          </h1>
          <p className="text-gray-500 text-sm mt-1">Deterministic cost analysis & anomalies</p>
        </div>
        
        <div className="flex items-center gap-4">
          <select 
            value={department}
            onChange={e => setDepartment(e.target.value)}
            className="border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          >
            <option value="Engineering">Engineering</option>
            <option value="Sales">Sales</option>
            <option value="Marketing">Marketing</option>
            <option value="Operations">Operations</option>
          </select>
          <select 
            value={period}
            onChange={e => setPeriod(e.target.value)}
            className="border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          >
            <option value="2026-08">August 2026</option>
            <option value="2026-07">July 2026</option>
          </select>
        </div>
      </div>

      {anomalies.length > 0 && (
        <div className="bg-orange-50 border-l-4 border-orange-500 p-4 rounded-md">
          <div className="flex items-start">
            <AlertTriangle className="w-5 h-5 text-orange-500 mt-0.5 mr-3" />
            <div>
              <h3 className="text-sm font-medium text-orange-800">Attention Required</h3>
              <ul className="mt-1 text-sm text-orange-700 list-disc list-inside">
                {anomalies.map((a, idx) => (
                  <li key={idx} className="flex justify-between items-center py-1">
                    <span>
                      <span className="font-semibold">{a.severity}:</span> {a.message}
                    </span>
                    <button 
                      onClick={() => handleInvestigate(a)}
                      className="ml-4 inline-flex items-center gap-1 px-3 py-1 bg-white border border-orange-300 text-orange-700 hover:bg-orange-50 rounded shadow-sm text-xs font-medium"
                    >
                      <Bot className="w-3 h-3" />
                      Investigate
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex justify-between items-start">
            <h3 className="text-gray-500 text-sm font-medium">Total Direct Cost</h3>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
              <Shield className="w-3 h-3" /> FACT
            </span>
          </div>
          <p className="mt-2 text-3xl font-bold text-gray-900">₹{totalDirectCost.toLocaleString()}</p>
        </div>

        {insights.map((insight, idx) => (
          <div key={idx} className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm relative overflow-hidden">
            <div className="flex justify-between items-start">
              <h3 className="text-gray-500 text-sm font-medium capitalize">{insight.metric.replace(/_/g, ' ').toLowerCase()}</h3>
              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${insight.classification === 'FACT' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-blue-50 text-blue-700 border border-blue-200'}`}>
                {insight.classification === 'FACT' ? <Shield className="w-3 h-3" /> : <Info className="w-3 h-3" />} 
                {insight.classification}
              </span>
            </div>
            
            <p className="mt-2 text-3xl font-bold text-gray-900">
              ₹{(insight.currentValue || 0).toLocaleString()}
            </p>

            {insight.deltaPercent !== null && (
              <div className="mt-4 flex items-center text-sm">
                <TrendingUp className={`w-4 h-4 mr-1 ${insight.delta > 0 ? 'text-red-500' : 'text-green-500'}`} />
                <span className={`font-medium ${insight.delta > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {insight.delta > 0 ? '+' : ''}{insight.deltaPercent}%
                </span>
                <span className="text-gray-500 ml-2">vs {insight.baselinePeriod}</span>
              </div>
            )}
            
            {insight.classification === 'ESTIMATE' && (
              <div className="mt-4 pt-3 border-t border-gray-100">
                <p className="text-xs text-gray-500 font-medium">Assumption:</p>
                <p className="mt-1 text-xs text-gray-400 leading-relaxed">
                  {insight.assumptionExplanation || 'Estimate calculated from recorded absence days and configured productivity assumptions.'}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default WorkforceCostIntelligence;
