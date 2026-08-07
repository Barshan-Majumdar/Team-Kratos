import React, { useState, useEffect, useRef } from 'react';
import { Clock, User as UserIcon, ShieldCheck, CheckCircle, AlertTriangle, Fingerprint, RefreshCw, Activity, Terminal } from 'lucide-react';
import { API_BASE } from '../../lib/api';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

const AuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [verifyResult, setVerifyResult] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const containerRef = useRef(null);

  const verifyChain = async () => {
    setVerifying(true);
    setVerifyResult(null);
    try {
      const res = await fetch(`${API_BASE}/api/audit/verify`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      if (!res.ok) {
        const rawErr = data.message || data.error || 'Verification failed';
        const msg = typeof rawErr === 'object' ? (rawErr.error || rawErr.message || JSON.stringify(rawErr)) : String(rawErr);
        const recId = data.recordId ? (typeof data.recordId === 'object' ? JSON.stringify(data.recordId) : String(data.recordId)) : null;
        setVerifyResult({ type: 'error', message: msg, recordId: recId });
      } else {
        const rawMsg = data.message || 'Chain verification complete';
        const msg = typeof rawMsg === 'object' ? (rawMsg.message || JSON.stringify(rawMsg)) : String(rawMsg);
        setVerifyResult({ 
          type: 'success', 
          message: msg, 
          verified: typeof data.verifiedCount === 'number' ? data.verifiedCount : (data.verified || 0), 
          skipped: typeof data.skippedCount === 'number' ? data.skippedCount : (data.skipped || 0) 
        });
      }
    } catch (err) {
      setVerifyResult({ type: 'error', message: String(err.message || err || 'Network error') });
    } finally {
      setVerifying(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/payroll/audit-log`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      if (!res.ok) {
        const rawErr = data.error || data.message || 'Failed to fetch audit logs';
        throw new Error(typeof rawErr === 'object' ? (rawErr.error || JSON.stringify(rawErr)) : String(rawErr));
      }
      setLogs(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(String(err.message || err));
    } finally {
      setLoading(false);
    }
  };

  const formatId = (id, fallback = 'System') => {
    if (!id || typeof id !== 'string') return fallback;
    return id.length > 8 ? `${id.substring(0, 8)}...` : id;
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

  const getActionBadgeStyle = (actionStr) => {
    const action = String(actionStr).toUpperCase();
    if (action.includes('CREATE') || action.includes('ADD')) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (action.includes('DELETE') || action.includes('REMOVE')) return 'bg-rose-50 text-rose-700 border-rose-200';
    if (action.includes('UPDATE') || action.includes('EDIT')) return 'bg-amber-50 text-amber-700 border-amber-200';
    if (action.includes('LOGIN') || action.includes('AUTH')) return 'bg-indigo-50 text-indigo-700 border-indigo-200';
    return 'bg-slate-50 text-slate-700 border-slate-200';
  };

  useGSAP(() => {
    if (containerRef.current) {
      gsap.fromTo('.gsap-audit-item', 
        { opacity: 0, y: 15 }, 
        { opacity: 1, y: 0, duration: 0.6, stagger: 0.04, ease: 'power3.out' }
      );
    }
  }, [logs, loading, verifyResult]);

  const doppelrandOuter = "bg-[#F4F1EA] rounded-[32px] p-2 shadow-[0_4px_24px_rgba(29,27,22,0.04)]";
  const doppelrandInner = "bg-white rounded-[24px] border border-[#EAE7E0] w-full h-full overflow-hidden relative";

  return (
    <div ref={containerRef} className="p-4 md:p-8 lg:p-12 max-w-7xl mx-auto min-h-screen font-sans bg-[#FAF9F6] space-y-10">
      
      {/* Header Area */}
      <div className="gsap-audit-item opacity-0 flex flex-col md:flex-row md:items-start justify-between gap-6">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-[#F0F3F9] rounded-[14px] flex items-center justify-center text-[#1F2B4D]">
              <Fingerprint size={24} strokeWidth={2.5} />
            </div>
            <h1 className="text-[36px] md:text-[40px] font-bold text-[#1D1B16] tracking-tighter leading-none">
              System Audit Logs
            </h1>
          </div>
          <p className="text-[#6B655C] text-[15px] font-medium tracking-tight max-w-xl">
            Track administrative actions, security events, and cryptographic verification for compliance.
          </p>
        </div>

        <button 
          onClick={verifyChain} 
          disabled={verifying}
          className={`group flex items-center gap-3 px-6 py-4 rounded-[16px] text-[15px] font-bold transition-all shadow-sm
            ${verifying 
              ? 'bg-[#E2E8F4] text-[#1F2B4D] cursor-not-allowed' 
              : 'bg-[#1F2B4D] text-white hover:bg-[#141C33] hover:shadow-md hover:-translate-y-0.5 active:translate-y-0'
            }`}
        >
          {verifying ? (
            <RefreshCw size={20} className="animate-spin text-[#4B4DD9]" strokeWidth={2.5} />
          ) : (
            <ShieldCheck size={20} strokeWidth={2.5} className="group-hover:scale-110 transition-transform duration-300" />
          )}
          {verifying ? 'Verifying Integrity...' : 'Verify Chain Integrity'}
        </button>
      </div>

      {/* Verification Result Banner */}
      {verifyResult && (
        <div className={`gsap-audit-item opacity-0 p-6 rounded-2xl border flex items-start gap-4 ${verifyResult.type === 'success' ? 'bg-[#ECFDF5] border-[#A7F3D0]' : 'bg-rose-50 border-rose-200'}`}>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${verifyResult.type === 'success' ? 'bg-[#D1FAE5] text-[#059669]' : 'bg-rose-100 text-rose-600'}`}>
            {verifyResult.type === 'success' ? <CheckCircle size={24} strokeWidth={2.5} /> : <AlertTriangle size={24} strokeWidth={2.5} />}
          </div>
          <div>
            <h3 className={`text-[16px] font-bold ${verifyResult.type === 'success' ? 'text-[#065F46]' : 'text-rose-800'}`}>
              {String(verifyResult.message || '')}
            </h3>
            {verifyResult.type === 'success' ? (
              <p className="text-[#047857] text-[14px] font-medium mt-1">
                {verifyResult.verified} records verified cryptographically. {verifyResult.skipped} legacy records skipped.
              </p>
            ) : (
              verifyResult.recordId && (
                <p className="text-rose-600 text-[14px] font-medium mt-1">
                  Tampering Detected — Record ID: <span className="font-mono bg-rose-200/50 px-2 py-0.5 rounded text-[13px]">{String(verifyResult.recordId)}</span>
                </p>
              )
            )}
          </div>
        </div>
      )}
      
      {error && (
        <div className="gsap-audit-item opacity-0 p-5 rounded-2xl font-semibold text-[14px] flex items-center gap-3 bg-rose-50 text-rose-700 border border-rose-200">
          <AlertTriangle size={20} strokeWidth={2.5} />
          {String(error)}
        </div>
      )}

      {/* Main Table Area */}
      <div className={`gsap-audit-item opacity-0 ${doppelrandOuter}`}>
        <div className={doppelrandInner}>
          
          <div className="p-6 border-b border-[#EAE7E0] flex justify-between items-center bg-[#FAF9F6]">
            <h2 className="text-[18px] font-bold text-[#1D1B16] flex items-center gap-2">
              <Terminal size={20} className="text-[#1F2B4D]" strokeWidth={2.5} /> Event Log
            </h2>
            <div className="flex items-center gap-2 text-[#6B655C] text-[13px] font-bold">
              <Activity size={16} strokeWidth={2.5} /> Live Monitor
            </div>
          </div>

          <div className="overflow-x-auto custom-scrollbar bg-white">
            <table className="w-full text-left min-w-[900px]">
              <thead className="bg-[#FAF9F6] border-b border-[#EAE7E0]">
                <tr>
                  <th className="p-5 text-[12px] font-bold text-[#6B655C] uppercase tracking-wider">Timestamp</th>
                  <th className="p-5 text-[12px] font-bold text-[#6B655C] uppercase tracking-wider">Actor ID</th>
                  <th className="p-5 text-[12px] font-bold text-[#6B655C] uppercase tracking-wider">Action Type</th>
                  <th className="p-5 text-[12px] font-bold text-[#6B655C] uppercase tracking-wider">Target ID</th>
                  <th className="p-5 text-[12px] font-bold text-[#6B655C] uppercase tracking-wider">Cryptographic Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAE7E0]">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="p-5"><div className="h-4 w-32 bg-[#F0F3F9] rounded"></div></td>
                      <td className="p-5"><div className="h-4 w-24 bg-[#F0F3F9] rounded"></div></td>
                      <td className="p-5"><div className="h-6 w-20 bg-[#F0F3F9] rounded-md"></div></td>
                      <td className="p-5"><div className="h-4 w-20 bg-[#F0F3F9] rounded"></div></td>
                      <td className="p-5"><div className="h-4 w-48 bg-[#F0F3F9] rounded"></div></td>
                    </tr>
                  ))
                ) : logs.length === 0 ? (
                  <tr><td colSpan="5" className="p-16 text-center text-[#6B655C] font-bold">No security events found.</td></tr>
                ) : (
                  logs.map(log => (
                    <tr key={log.id} className="gsap-audit-item opacity-0 group hover:bg-[#F0F3F9]/50 transition-colors duration-300">
                      <td className="p-5">
                        <div className="flex items-center gap-2 text-[13px] font-bold text-[#6B655C]">
                          <Clock size={16} className="text-[#9A948A] shrink-0" strokeWidth={2.5} />
                          {log.createdAt ? new Date(log.createdAt).toLocaleString() : 'N/A'}
                        </div>
                      </td>
                      <td className="p-5">
                        <div className="flex items-center gap-2">
                          <UserIcon size={16} className="text-[#1F2B4D] shrink-0" strokeWidth={2.5} />
                          <span className="font-mono text-[13px] font-bold text-[#1D1B16] truncate w-24" title={typeof log.actorId === 'string' ? log.actorId : 'System'}>
                            {formatId(log.actorId, 'System')}
                          </span>
                        </div>
                      </td>
                      <td className="p-5">
                        <span className={`inline-flex items-center px-3 py-1.5 rounded-lg font-mono text-[11px] font-bold uppercase tracking-wider border shadow-sm ${getActionBadgeStyle(log.action)}`}>
                          {typeof log.action === 'string' ? log.action : 'EVENT'}
                        </span>
                      </td>
                      <td className="p-5">
                        {log.targetId ? (
                          <span className="font-mono text-[12px] font-bold bg-[#FAF9F6] text-[#6B655C] border border-[#EAE7E0] px-2.5 py-1 rounded block w-max max-w-[120px] truncate" title={typeof log.targetId === 'string' ? log.targetId : '-'}>
                            {formatId(log.targetId, '-')}
                          </span>
                        ) : (
                          <span className="text-[#9A948A] font-medium">-</span>
                        )}
                      </td>
                      <td className="p-5 text-[13px] font-medium text-[#1D1B16] max-w-md truncate" title={formatDetails(log.details)}>
                        {formatDetails(log.details)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

    </div>
  );
};

export default AuditLogs;
