import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine, ReferenceArea } from 'recharts';
import { BrainCircuit, Filter, ChevronRight, Activity, AlertTriangle, CheckCircle2, ShieldAlert } from 'lucide-react';
import { toast } from 'react-hot-toast';

const IntelligenceRadar = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [investigating, setInvestigating] = useState(false);
  const [investigationResult, setInvestigationResult] = useState('');

  // Filters
  const [deptFilter, setDeptFilter] = useState('ALL');
  const [severityFilter, setSeverityFilter] = useState('ALL');

  useEffect(() => {
    fetchRadarData();
  }, []);

  const fetchRadarData = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/intelligence/radar`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setData(res.data);
    } catch (error) {
      toast.error('Failed to load Intelligence Radar');
    } finally {
      setLoading(false);
    }
  };

  const handleInvestigate = async (employeeId) => {
    setInvestigating(true);
    setInvestigationResult('');
    try {
      const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/intelligence/investigate`, { employeeId }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setInvestigationResult(res.data.investigation);
    } catch (error) {
      toast.error('Iris AI failed to investigate.');
    } finally {
      setInvestigating(false);
    }
  };

  // Filter Data
  const filteredData = data.filter(d => {
    if (deptFilter !== 'ALL' && d.department !== deptFilter) return false;
    if (severityFilter !== 'ALL' && d.highestSeverity !== severityFilter) return false;
    return true;
  });

  const getDotColor = (severity) => {
    switch(severity) {
      case 'CRITICAL': return '#ef4444'; // Red-500
      case 'HIGH': return '#f97316'; // Orange-500
      case 'MEDIUM': return '#eab308'; // Yellow-500
      default: return '#10b981'; // Emerald-500
    }
  };

  const getSeverityBadge = (severity) => {
    switch(severity) {
      case 'CRITICAL': return <span className="bg-red-100 text-red-800 px-2 py-0.5 rounded-full text-[10px] font-bold">CRITICAL</span>;
      case 'HIGH': return <span className="bg-orange-100 text-orange-800 px-2 py-0.5 rounded-full text-[10px] font-bold">HIGH</span>;
      case 'MEDIUM': return <span className="bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full text-[10px] font-bold">MEDIUM</span>;
      default: return <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded-full text-[10px] font-bold">LOW</span>;
    }
  }

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-[#EAE7E0] shadow-lg rounded-xl z-50 min-w-[200px]">
          <div className="font-serif font-bold text-[#1F2B4D] text-sm">{data.name}</div>
          <div className="text-xs text-[#6B655C] mb-2">{data.department}</div>
          
          <div className="flex justify-between text-xs mb-1">
            <span className="text-[#6B655C]">Risk Score:</span>
            <span className="font-bold text-[#1F2B4D]">{data.riskScore}</span>
          </div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-[#6B655C]">Reliability:</span>
            <span className="font-bold text-[#1F2B4D]">{data.reliability}%</span>
          </div>
          <div className="flex justify-between text-xs mb-1 border-t border-slate-100 pt-1 mt-1">
            <span className="text-[#6B655C]">Active Signals:</span>
            <span className="font-bold text-[#1F2B4D]">{data.signalCount}</span>
          </div>
          <div className="flex justify-between text-xs items-center mt-1">
            <span className="text-[#6B655C]">Max Severity:</span>
            {getSeverityBadge(data.highestSeverity)}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto min-h-full flex flex-col md:flex-row gap-6">
        
        {/* Left Side: Radar Plot */}
        <div className="flex-1 flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#EAE7E0] pb-4">
            <div>
              <h1 className="font-serif font-bold text-3xl text-[#1F2B4D] flex items-center gap-2">
                <BrainCircuit className="text-indigo-600" size={28} />
                Workforce Risk Radar
              </h1>
              <p className="text-[#6B655C] text-sm font-medium mt-1">
                Predictive behavioral intelligence mapping.
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <select 
                value={deptFilter} 
                onChange={e => setDeptFilter(e.target.value)}
                className="bg-white border border-[#EAE7E0] text-xs font-bold text-[#1F2B4D] rounded-lg px-3 py-2 shadow-xs focus:ring-1 focus:ring-[#1F2B4D] outline-none"
              >
                <option value="ALL">All Departments</option>
                <option value="Engineering">Engineering</option>
                <option value="Sales">Sales</option>
                <option value="HR">HR</option>
                <option value="Marketing">Marketing</option>
              </select>
              <select 
                value={severityFilter} 
                onChange={e => setSeverityFilter(e.target.value)}
                className="bg-white border border-[#EAE7E0] text-xs font-bold text-[#1F2B4D] rounded-lg px-3 py-2 shadow-xs focus:ring-1 focus:ring-[#1F2B4D] outline-none"
              >
                <option value="ALL">All Severities</option>
                <option value="CRITICAL">Critical Only</option>
                <option value="HIGH">High & Above</option>
              </select>
            </div>
          </div>

          <div className="bg-white border border-[#EAE7E0] rounded-[24px] shadow-sm p-4 md:p-6 h-[600px] relative flex flex-col">
            <h2 className="text-sm font-bold text-[#1F2B4D] mb-4">Organizational Scatter Plot</h2>
            
            <div className="flex-1 w-full relative">
              {loading ? (
                <div className="absolute inset-0 flex items-center justify-center text-sm font-bold text-slate-400">Loading Radar Data...</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                    
                    {/* Quadrant Backgrounds */}
                    <ReferenceArea x1={0} x2={50} y1={50} y2={100} fill="#fef2f2" fillOpacity={0.4} /> {/* Danger */}
                    <ReferenceArea x1={50} x2={100} y1={50} y2={100} fill="#fff7ed" fillOpacity={0.4} /> {/* Burnout */}
                    <ReferenceArea x1={0} x2={50} y1={0} y2={50} fill="#fefce8" fillOpacity={0.4} /> {/* Underperform */}
                    <ReferenceArea x1={50} x2={100} y1={0} y2={50} fill="#f0fdf4" fillOpacity={0.4} /> {/* Stable */}
                    
                    {/* Crosshairs */}
                    <ReferenceLine x={50} stroke="#CBD5E1" strokeDasharray="3 3" />
                    <ReferenceLine y={50} stroke="#CBD5E1" strokeDasharray="3 3" />

                    <XAxis 
                      type="number" 
                      dataKey="reliability" 
                      name="Operational Reliability" 
                      domain={[0, 100]} 
                      unit="%" 
                      tick={{fontSize: 10, fill: '#94a3b8'}}
                      label={{ value: 'Operational Reliability (%) →', position: 'bottom', fill: '#64748b', fontSize: 11, fontWeight: 'bold' }} 
                    />
                    <YAxis 
                      type="number" 
                      dataKey="riskScore" 
                      name="Risk Score" 
                      domain={[0, 100]} 
                      tick={{fontSize: 10, fill: '#94a3b8'}}
                      label={{ value: 'Workforce Risk Score (0-100) →', angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 11, fontWeight: 'bold', offset: 10 }} 
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{strokeDasharray: '3 3'}} />
                    
                    <Scatter 
                      name="Employees" 
                      data={filteredData} 
                      onClick={(e) => setSelectedEmployee(e.payload)}
                      className="cursor-pointer"
                    >
                      {filteredData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={getDotColor(entry.highestSeverity)} 
                          // Size represents signal count (min 60, +40 per signal)
                          r={Math.max(6, Math.min(18, 6 + (entry.signalCount * 2)))}
                          stroke="#fff"
                          strokeWidth={1}
                        />
                      ))}
                    </Scatter>
                  </ScatterChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Legend Map */}
            <div className="absolute top-6 right-6 bg-white/90 backdrop-blur border border-slate-200 p-2 rounded-lg shadow-xs text-[9px] font-mono font-bold text-slate-500 hidden md:block z-10">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500"></span> High Risk / Low Reliability</div>
                <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-orange-500"></span> High Risk / High Reliability</div>
                <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-yellow-500"></span> Low Risk / Low Reliability</div>
                <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> Stable Core</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Intelligence Profile Deep Dive */}
        {selectedEmployee && (
          <div className="w-full md:w-[400px] xl:w-[450px] shrink-0 flex flex-col gap-4 animate-in slide-in-from-right-8 duration-300">
            <div className="bg-[#1F2B4D] text-white p-5 rounded-t-[24px] rounded-b-lg shadow-lg relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <BrainCircuit size={100} />
              </div>
              <div className="relative z-10">
                <h2 className="font-serif font-bold text-2xl">{selectedEmployee.name}</h2>
                <p className="text-indigo-200 text-xs font-medium uppercase tracking-wider">{selectedEmployee.department}</p>
                
                <div className="flex items-center gap-4 mt-6">
                  <div className="flex-1 bg-white/10 rounded-xl p-3 backdrop-blur-sm border border-white/10">
                    <div className="text-[10px] text-indigo-200 uppercase font-bold tracking-wider mb-1">Risk Score</div>
                    <div className="text-2xl font-bold">{selectedEmployee.riskScore}<span className="text-sm font-normal text-indigo-200">/100</span></div>
                  </div>
                  <div className="flex-1 bg-white/10 rounded-xl p-3 backdrop-blur-sm border border-white/10">
                    <div className="text-[10px] text-indigo-200 uppercase font-bold tracking-wider mb-1">Reliability</div>
                    <div className="text-2xl font-bold">{selectedEmployee.reliability}%</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white border border-[#EAE7E0] p-5 rounded-[24px] shadow-sm flex-1 flex flex-col min-h-0">
              <h3 className="text-xs font-bold text-[#1F2B4D] uppercase tracking-wider mb-4 flex items-center gap-2">
                <Activity size={14} /> Active Mathematical Signals
              </h3>
              
              <div className="flex-1 overflow-y-auto pr-2 -mr-2 space-y-3 custom-scrollbar">
                {selectedEmployee.signals?.length === 0 ? (
                  <div className="text-sm text-[#6B655C] italic text-center p-4">No behavioral anomalies detected.</div>
                ) : (
                  selectedEmployee.signals?.map((signal) => (
                    <div key={signal.id} className="bg-[#FAF8F5] border border-[#EAE7E0] rounded-xl p-3 shadow-2xs">
                      <div className="flex justify-between items-start mb-2">
                        <div className="font-bold text-xs text-[#1F2B4D]">{signal.type.replace(/_/g, ' ')}</div>
                        {getSeverityBadge(signal.severity)}
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 mb-2">
                        <div className="bg-white p-2 rounded-lg border border-[#EAE7E0]">
                          <div className="text-[9px] text-[#6B655C] font-bold uppercase">Expected</div>
                          <div className="text-xs font-mono font-bold text-[#1F2B4D]">{signal.baselineValue?.toFixed(1) || 'N/A'}</div>
                        </div>
                        <div className="bg-white p-2 rounded-lg border border-[#EAE7E0]">
                          <div className="text-[9px] text-[#6B655C] font-bold uppercase">Current</div>
                          <div className="text-xs font-mono font-bold text-[#1F2B4D]">{signal.currentValue?.toFixed(1) || 'N/A'}</div>
                        </div>
                      </div>
                      
                      <div className="flex justify-between items-center bg-white p-2 rounded-lg border border-[#EAE7E0] mb-2">
                        <span className="text-[10px] font-bold text-[#6B655C]">Delta / Exposure</span>
                        <span className="text-xs font-mono font-bold text-red-600">{signal.deltaValue > 0 ? '+' : ''}{signal.deltaValue?.toFixed(2)}</span>
                      </div>

                      <div className="flex justify-between items-center mt-2 border-t border-slate-200 pt-2">
                        <span className="text-[9px] font-bold text-[#9A948A] uppercase flex items-center gap-1">
                          State: <span className="text-indigo-600">{signal.lifecycleState}</span>
                        </span>
                        <span className="text-[9px] font-bold text-[#9A948A] flex items-center gap-1">
                          Confidence: <span className="text-emerald-600">{(signal.confidence * 100).toFixed(0)}%</span>
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Data Quality Section */}
              <div className="mt-4 pt-4 border-t border-[#EAE7E0]">
                <h3 className="text-[10px] font-bold text-[#6B655C] uppercase tracking-wider mb-2">Data Quality Matrix</h3>
                <div className="w-full bg-slate-100 rounded-full h-1.5 mb-1">
                  <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: '92%' }}></div>
                </div>
                <div className="flex justify-between text-[9px] font-bold text-[#9A948A] font-mono">
                  <span>Coverage: 92%</span>
                  <span className="text-emerald-600">High Trust</span>
                </div>
              </div>

              <div className="mt-4">
                <button 
                  onClick={() => handleInvestigate(selectedEmployee.id)}
                  disabled={investigating}
                  className="w-full bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-display font-bold text-xs md:text-sm px-4 py-3 rounded-xl transition-all hover:scale-[1.02] active:scale-95 shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {investigating ? (
                    <span className="animate-pulse flex items-center gap-2"><BrainCircuit size={16} className="animate-spin" /> Iris is analyzing...</span>
                  ) : (
                    <><BrainCircuit size={16} /> Investigate with Iris AI</>
                  )}
                </button>
              </div>
            </div>
            
            {/* Iris AI Result Panel (Slides down when populated) */}
            {investigationResult && (
              <div className="bg-[#FAF8F5] border border-indigo-200 p-5 rounded-[24px] shadow-lg animate-in slide-in-from-top-4">
                <h3 className="text-xs font-bold text-indigo-800 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <ShieldAlert size={14} /> Iris Investigation Complete
                </h3>
                <div className="prose prose-sm prose-indigo text-[#1F2B4D] max-w-none text-xs custom-scrollbar overflow-y-auto max-h-[300px]" dangerouslySetInnerHTML={{ __html: investigationResult.replace(/\n/g, '<br/>') }} />
              </div>
            )}
          </div>
        )}
      </div>
  );
};

export default IntelligenceRadar;
