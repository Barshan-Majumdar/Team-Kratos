import React, { useState, useEffect } from 'react';
import { Card } from '../../components/ui/Card';
import { Clock, User as UserIcon } from 'lucide-react';
import { API_BASE } from '../../lib/api';

const AuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/payroll/audit-log`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (!res.ok) throw new Error('Failed to fetch audit logs');
      const data = await res.json();
      setLogs(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDetails = (details) => {
    if (!details) return '-';
    if (typeof details === 'string') return details;
    if (typeof details === 'object') {
      if (details.message) return details.message;
      const parts = [];
      for (const [key, value] of Object.entries(details)) {
        const formattedKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
        const formattedValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
        parts.push(`${formattedKey}: ${formattedValue}`);
      }
      return parts.join(' | ');
    }
    return String(details);
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto h-full flex flex-col">
      <div className="mb-6 md:mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-slate-800 tracking-tight">System Audit Logs</h1>
        <p className="text-slate-500 mt-2 text-sm md:text-base">Track administrative actions and system events for security and compliance.</p>
      </div>
      
      {error && <div className="text-red-500 mb-4 bg-red-50 p-3 rounded-lg border border-red-100">{error}</div>}
      
      {/* Desktop Table View */}
      <Card className="hidden md:block p-0 overflow-hidden shadow-sm border-slate-200/60">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left min-w-[800px]">
            <thead className="bg-slate-50/50 border-b border-slate-200/60">
              <tr>
                <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Timestamp</th>
                <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Actor ID</th>
                <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Action</th>
                <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Target ID</th>
                <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan="5" className="p-8 text-center text-slate-500">Loading logs...</td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan="5" className="p-8 text-center text-slate-500">No logs found.</td></tr>
              ) : (
                logs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4 text-sm font-medium text-slate-600 flex items-center gap-2">
                      <Clock size={14} className="text-slate-400 shrink-0" />
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="p-4 text-sm font-bold text-slate-800">
                      <div className="flex items-center gap-2">
                        <UserIcon size={14} className="text-indigo-500 shrink-0" />
                        <span className="truncate w-24" title={log.actorId}>{log.actorId.substring(0, 8)}...</span>
                      </div>
                    </td>
                    <td className="p-4 text-sm">
                      <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md font-mono text-xs font-semibold shadow-sm border border-slate-200/60">{log.action}</span>
                    </td>
                    <td className="p-4 text-sm text-slate-500">
                      {log.targetId ? <span className="truncate w-24 block font-mono text-xs bg-slate-50 px-2 py-1 rounded" title={log.targetId}>{log.targetId.substring(0, 8)}...</span> : '-'}
                    </td>
                    <td className="p-4 text-sm text-slate-600 max-w-sm truncate" title={formatDetails(log.details)}>
                      {formatDetails(log.details)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Mobile View */}
      <div className="md:hidden flex flex-col gap-4">
        {loading ? (
          <div className="p-8 text-center text-sm text-slate-500">Loading logs...</div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">No logs found.</div>
        ) : (
          logs.map(log => (
            <div key={log.id} className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col gap-4 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-slate-300"></div>
              
              <div className="flex justify-between items-start gap-2">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-500 bg-slate-50 px-2.5 py-1 rounded-full border border-slate-100 shrink-0">
                  <Clock size={12} className="text-slate-400" />
                  {new Date(log.createdAt).toLocaleString()}
                </div>
              </div>
              
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Action Performed</span>
                <span className="bg-slate-100 text-slate-800 px-3 py-1.5 rounded-lg font-mono text-xs font-bold shadow-sm inline-block self-start border border-slate-200/60">
                  {log.action}
                </span>
              </div>
              
              <div className="bg-slate-50 rounded-xl p-3 flex flex-col gap-2 border border-slate-100 text-sm">
                <div className="text-slate-700 font-medium break-words leading-relaxed">
                  {formatDetails(log.details)}
                </div>
                <div className="h-px w-full bg-slate-200/60 my-1"></div>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold uppercase tracking-wider text-[10px] text-slate-500">Actor</span>
                    <div className="flex items-center gap-1.5 min-w-0 bg-white px-2 py-1 rounded border border-slate-100">
                      <UserIcon size={12} className="text-indigo-400 shrink-0" />
                      <span className="truncate font-mono text-xs font-bold text-slate-700">{log.actorId.substring(0,8)}...</span>
                    </div>
                  </div>
                  {log.targetId && (
                    <div className="flex items-center justify-between">
                      <span className="font-bold uppercase tracking-wider text-[10px] text-slate-500">Target</span>
                      <div className="flex items-center gap-1.5 min-w-0 bg-white px-2 py-1 rounded border border-slate-100">
                        <span className="truncate font-mono text-xs font-bold text-slate-700">{log.targetId.substring(0,8)}...</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AuditLogs;
