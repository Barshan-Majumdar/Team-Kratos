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
    <div ref={containerRef} className="w-full min-h-full flex flex-col gap-3.5 sm:gap-4 p-3 sm:p-5 md:p-6 bg-[#FAF9F6] font-sans text-[#1D1B16]">
      
      {/* Header Area */}
      <div className="gsap-audit-item opacity-0 flex flex-col min-[500px]:flex-row justify-between items-start min-[500px]:items-center gap-2.5 pb-2 border-b border-[#EAE7E0] w-full">
        <div>
          <h1 className="font-serif font-bold text-lg sm:text-2xl md:text-3xl text-[#1F2B4D] tracking-tight leading-tight flex items-center gap-2">
            <Fingerprint className="text-[#1F2B4D] w-5 h-5 sm:w-6 sm:h-6" />
            <span>System Audit Logs</span>
          </h1>
          <p className="text-[#6B655C] text-xs sm:text-sm font-medium mt-0.5">
            Track administrative actions, security events, and cryptographic verification.
          </p>
        </div>

        <button 
          onClick={verifyChain} 
          disabled={verifying}
          className="w-full min-[500px]:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-[#1F2B4D] hover:bg-[#141C33] text-white text-xs font-display font-bold uppercase tracking-wider rounded-xl transition-all shadow-2xs shrink-0 disabled:opacity-50"
        >
          {verifying ? (
            <RefreshCw size={14} className="animate-spin shrink-0" />
          ) : (
            <ShieldCheck size={14} className="shrink-0" />
          )}
          <span>{verifying ? 'Verifying...' : 'Verify Chain Integrity'}</span>
        </button>
      </div>

      {/* Verification Result Banner */}
      {verifyResult && (
        <div className={`gsap-audit-item opacity-0 p-3.5 sm:p-4 rounded-xl border flex items-start gap-3 w-full ${verifyResult.type === 'success' ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'}`}>
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${verifyResult.type === 'success' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
            {verifyResult.type === 'success' ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
          </div>
          <div>
            <h3 className={`text-xs sm:text-sm font-bold ${verifyResult.type === 'success' ? 'text-emerald-900' : 'text-rose-800'}`}>
              {String(verifyResult.message || '')}
            </h3>
            {verifyResult.type === 'success' ? (
              <p className="text-emerald-800 text-xs font-medium mt-0.5">
                {verifyResult.verified} records verified cryptographically. {verifyResult.skipped} legacy records skipped.
              </p>
            ) : (
              verifyResult.recordId && (
                <p className="text-rose-700 text-xs font-medium mt-0.5">
                  Tampering Detected — Record ID: <span className="font-mono bg-rose-200/50 px-1.5 py-0.5 rounded text-[11px]">{String(verifyResult.recordId)}</span>
                </p>
              )
            )}
          </div>
        </div>
      )}
      
      {error && (
        <div className="gsap-audit-item opacity-0 p-3.5 sm:p-4 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2.5 bg-rose-50 text-rose-700 border border-rose-200">
          <AlertTriangle size={16} className="shrink-0" />
          <span>{String(error)}</span>
        </div>
      )}

      {/* Main Event Log Container */}
      <div className="gsap-audit-item opacity-0 p-4 sm:p-5 md:p-6 bg-white rounded-2xl border border-[#EAE7E0] shadow-2xs w-full flex flex-col gap-3.5">
        <div className="flex justify-between items-center pb-2 border-b border-[#EAE7E0]">
          <h2 className="font-serif font-bold text-base sm:text-lg text-[#1F2B4D] flex items-center gap-2">
            <Terminal size={16} className="text-[#1F2B4D]" />
            <span>Event Log</span>
          </h2>
          <div className="flex items-center gap-1.5 text-[#6B655C] text-xs font-bold bg-[#FAF8F5] px-2.5 py-1 rounded-lg border border-[#EAE7E0]">
            <Activity size={12} className="text-emerald-600 animate-pulse" />
            <span>Live Monitor</span>
          </div>
        </div>

        {/* Mobile View: Zero Sliding Cards Layout (< 650px) */}
        <div className="min-[650px]:hidden flex flex-col gap-2.5 w-full">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="p-3 bg-[#FAF8F5] rounded-xl border border-[#EAE7E0] animate-pulse space-y-2">
                <div className="h-3 w-28 bg-[#F0F3F9] rounded"></div>
                <div className="h-5 w-20 bg-[#F0F3F9] rounded"></div>
              </div>
            ))
          ) : logs.length === 0 ? (
            <div className="py-6 text-center text-[#6B655C] font-bold text-xs bg-[#FAF8F5] rounded-xl border border-[#EAE7E0]">
              No security events found.
            </div>
          ) : (
            logs.map(log => (
              <div key={log.id} className="p-3 bg-[#FAF8F5] rounded-xl border border-[#EAE7E0] flex flex-col gap-2 w-full">
                <div className="flex justify-between items-center gap-2 pb-1.5 border-b border-[#EAE7E0]">
                  <div className="flex items-center gap-1.5 text-[10.5px] font-bold text-[#6B655C]">
                    <Clock size={12} className="text-[#6B655C] shrink-0" />
                    {log.createdAt ? new Date(log.createdAt).toLocaleString('en-IN') : 'N/A'}
                  </div>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-md font-mono text-[9.5px] font-bold uppercase border ${getActionBadgeStyle(log.action)}`}>
                    {typeof log.action === 'string' ? log.action : 'EVENT'}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <div className="flex items-center gap-1 text-[11px] font-bold text-[#1F2B4D]">
                    <UserIcon size={12} className="shrink-0" />
                    <span className="font-mono">{formatId(log.actorId, 'System')}</span>
                  </div>
                  {log.targetId && (
                    <span className="font-mono text-[10px] bg-white border border-[#EAE7E0] px-1.5 py-0.5 rounded text-[#6B655C]">
                      Target: {formatId(log.targetId, '-')}
                    </span>
                  )}
                </div>
                <div className="text-[11px] font-medium text-[#6B655C] pt-1 border-t border-[#EAE7E0] break-words">
                  {formatDetails(log.details)}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop View: Table Layout (>= 650px) */}
        <div className="hidden min-[650px]:block overflow-x-auto [&::-webkit-scrollbar]:hidden w-full">
          <table className="w-full text-left text-xs sm:text-sm border-collapse min-w-[600px]">
            <thead>
              <tr className="bg-[#FAF8F5] border-b border-[#EAE7E0]">
                <th className="py-2.5 px-3 sm:px-4 text-[10px] font-display font-bold uppercase tracking-wider text-[#6B655C]">Timestamp</th>
                <th className="py-2.5 px-3 sm:px-4 text-[10px] font-display font-bold uppercase tracking-wider text-[#6B655C]">Actor ID</th>
                <th className="py-2.5 px-3 sm:px-4 text-[10px] font-display font-bold uppercase tracking-wider text-[#6B655C]">Action Type</th>
                <th className="py-2.5 px-3 sm:px-4 text-[10px] font-display font-bold uppercase tracking-wider text-[#6B655C]">Target ID</th>
                <th className="py-2.5 px-3 sm:px-4 text-[10px] font-display font-bold uppercase tracking-wider text-[#6B655C]">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F4F1EA]">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="py-3 px-3 sm:px-4"><div className="h-4 w-32 bg-[#F0F3F9] rounded"></div></td>
                    <td className="py-3 px-3 sm:px-4"><div className="h-4 w-24 bg-[#F0F3F9] rounded"></div></td>
                    <td className="py-3 px-3 sm:px-4"><div className="h-6 w-20 bg-[#F0F3F9] rounded-md"></div></td>
                    <td className="py-3 px-3 sm:px-4"><div className="h-4 w-20 bg-[#F0F3F9] rounded"></div></td>
                    <td className="py-3 px-3 sm:px-4"><div className="h-4 w-48 bg-[#F0F3F9] rounded"></div></td>
                  </tr>
                ))
              ) : logs.length === 0 ? (
                <tr><td colSpan="5" className="py-8 text-center text-[#6B655C] font-bold text-xs">No security events found.</td></tr>
              ) : (
                logs.map(log => (
                  <tr key={log.id} className="hover:bg-[#FAF8F5] transition-colors">
                    <td className="py-3 px-3 sm:px-4">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-[#6B655C]">
                        <Clock size={14} className="text-[#6B655C] shrink-0" />
                        {log.createdAt ? new Date(log.createdAt).toLocaleString('en-IN') : 'N/A'}
                      </div>
                    </td>
                    <td className="py-3 px-3 sm:px-4">
                      <div className="flex items-center gap-1.5">
                        <UserIcon size={14} className="text-[#1F2B4D] shrink-0" />
                        <span className="font-mono text-xs font-bold text-[#1F2B4D] truncate w-24" title={typeof log.actorId === 'string' ? log.actorId : 'System'}>
                          {formatId(log.actorId, 'System')}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-3 sm:px-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md font-mono text-[10px] font-bold uppercase border ${getActionBadgeStyle(log.action)}`}>
                        {typeof log.action === 'string' ? log.action : 'EVENT'}
                      </span>
                    </td>
                    <td className="py-3 px-3 sm:px-4">
                      {log.targetId ? (
                        <span className="font-mono text-[11px] font-bold bg-[#FAF8F5] text-[#6B655C] border border-[#EAE7E0] px-2 py-0.5 rounded inline-block max-w-[120px] truncate" title={typeof log.targetId === 'string' ? log.targetId : '-'}>
                          {formatId(log.targetId, '-')}
                        </span>
                      ) : (
                        <span className="text-[#6B655C] font-medium">-</span>
                      )}
                    </td>
                    <td className="py-3 px-3 sm:px-4 text-xs font-medium text-[#1F2B4D] max-w-md truncate" title={formatDetails(log.details)}>
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
  );
};

export default AuditLogs;
