import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { BrainCircuit, CheckCircle, ShieldAlert, ArrowLeft, Loader2, Sparkles } from 'lucide-react';

const IrisAction = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchTask();
  }, [id]);

  const fetchTask = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/iris/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setTask(res.data);
    } catch (error) {
      toast.error('Failed to load Iris recommendation');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    setSubmitting(true);
    try {
      const res = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/iris/approve`,
        { 
          taskId: id, 
          proposalFingerprint: task.recommendation.dataFingerprint 
        },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      toast.success(res.data.message || 'Action approved and executed successfully.');
      navigate('/dashboard/inbox');
    } catch (error) {
      if (error.response?.status === 409) {
        toast.error('Data has changed. Plan is stale. Please assign manually or run the Auto-Assign engine.');
      } else {
        toast.error(`${error.response?.data?.error || 'Execution failed'}. Try manual assignment or Auto-Assign.`);
      }
      fetchTask();
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-[#1F2B4D]" />
      </div>
    );
  }

  if (!task) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <ShieldAlert className="w-12 h-12 text-red-500 mb-4" />
        <h2 className="text-xl font-bold text-[#1F2B4D]">Task Not Found</h2>
        <button onClick={() => navigate('/dashboard/inbox')} className="mt-4 text-indigo-600 hover:underline">
          Return to Inbox
        </button>
      </div>
    );
  }

  const { recommendation, status } = task;

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto min-h-full flex flex-col gap-6">
      <button 
        onClick={() => navigate('/dashboard/inbox')}
        className="flex items-center gap-2 text-[#6B655C] hover:text-[#1F2B4D] w-fit text-sm font-medium transition-colors"
      >
        <ArrowLeft size={16} /> Back to Inbox
      </button>

      <div className="bg-white rounded-[24px] border border-[#EAE7E0] shadow-sm overflow-hidden">
        
        {/* Header section with gradient */}
        <div className="bg-gradient-to-r from-[#1F2B4D] to-[#2D3F6E] p-6 md:p-8 text-white relative overflow-hidden">
          {/* Background decoration */}
          <div className="absolute top-0 right-0 opacity-10 pointer-events-none transform translate-x-1/4 -translate-y-1/4">
            <BrainCircuit size={200} />
          </div>
          
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-white/10 rounded-xl backdrop-blur-sm border border-white/20">
                <BrainCircuit className="text-[#E0E7FF] w-6 h-6" />
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-bold tracking-wider bg-indigo-500/30 border border-indigo-400/30 text-indigo-100 uppercase">
                Proactive Intelligence
              </span>
              <span className={`px-3 py-1 rounded-full text-xs font-bold tracking-wider border uppercase ${
                status === 'AWAITING_APPROVAL' ? 'bg-amber-500/20 border-amber-400/30 text-amber-200' :
                status === 'EXECUTED' ? 'bg-emerald-500/20 border-emerald-400/30 text-emerald-200' :
                'bg-slate-500/20 border-slate-400/30 text-slate-200'
              }`}>
                {status.replace('_', ' ')}
              </span>
            </div>
            
            <h1 className="text-2xl md:text-3xl font-serif font-bold leading-tight">
              Action Proposed: {recommendation?.type?.replace('_', ' ')}
            </h1>
            <p className="text-indigo-100 mt-2 text-sm max-w-2xl">
              Iris has detected an anomaly, gathered the context, and simulated an optimal resolution via the deterministic engine. Human approval is required to execute.
            </p>
          </div>
        </div>

        {/* Content Section */}
        <div className="p-6 md:p-8 flex flex-col gap-8">
          
          <div className="bg-[#FAF8F5] border border-[#EAE7E0] rounded-2xl p-5 md:p-6 relative flex flex-col gap-4">
            <div className="absolute -top-3 -left-3 bg-indigo-100 text-indigo-700 p-1.5 rounded-lg border border-indigo-200">
              <Sparkles size={16} />
            </div>
            <h3 className="font-bold text-[#1F2B4D] flex items-center gap-2">
              Iris's Analysis
            </h3>
            
            {/* Render Visual Metrics prominently at the top of the analysis */}
            {recommendation?.evidence?.metrics && typeof recommendation?.evidence?.metrics === 'object' && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-2">
                {Object.entries(recommendation.evidence.metrics).map(([key, value]) => (
                  <div key={key} className="bg-white border border-[#EAE7E0] p-4 rounded-xl flex flex-col items-center justify-center text-center shadow-xs">
                    <span className="text-3xl font-bold text-[#1F2B4D] mb-1">{value}</span>
                    <span className="text-xs font-bold text-[#9A948A] uppercase tracking-wider">
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <p className="text-[#6B655C] leading-relaxed whitespace-pre-wrap text-sm md:text-base">
              {recommendation?.recommendedAction}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white border border-[#EAE7E0] rounded-2xl p-5 shadow-xs flex flex-col justify-between">
              <h4 className="text-xs font-bold text-[#9A948A] uppercase tracking-wider mb-4">Evidence Gathered</h4>
              <div className="text-[#1F2B4D] flex-1 flex flex-col justify-between">
                {recommendation?.evidence ? (
                  <div className="flex flex-col gap-4">
                    <div className="flex items-start gap-3 bg-indigo-50/50 p-4 rounded-xl border border-indigo-100/50">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                        <span className="text-indigo-600 font-bold text-sm">✓</span>
                      </div>
                      <div>
                        <div className="font-bold text-sm text-indigo-900 mb-1">System Audit Complete</div>
                        <div className="text-sm text-indigo-700/80 leading-snug">
                          {typeof recommendation.evidence === 'string' 
                            ? recommendation.evidence 
                            : recommendation.evidence.summary || JSON.stringify(recommendation.evidence)}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <span className="italic text-slate-400 text-sm">No evidence attached.</span>
                )}
              </div>
            </div>

            <div className="bg-white border border-[#EAE7E0] rounded-2xl p-5 shadow-xs">
              <h4 className="text-xs font-bold text-[#9A948A] uppercase tracking-wider mb-3">Execution Parameters</h4>
              <div className="text-sm text-[#1F2B4D]">
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-500">Action Target</span>
                    <span className="font-mono font-medium">{recommendation?.actionType}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-500">Execution Plan ID</span>
                    <span className="font-mono text-xs">{recommendation?.actionParameters?.planId || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-slate-500">Data Fingerprint</span>
                    <span className="font-mono text-xs text-indigo-600 truncate max-w-[150px]" title={recommendation?.dataFingerprint}>
                      {recommendation?.dataFingerprint?.substring(0, 16)}...
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Footer */}
          {status === 'AWAITING_APPROVAL' && (
            <div className="mt-4 pt-6 border-t border-[#EAE7E0] flex flex-col sm:flex-row gap-3 sm:items-center justify-end">
              <button
                onClick={() => navigate('/dashboard/inbox')}
                className="px-6 py-2.5 rounded-xl border border-[#CBD5E1] text-[#1F2B4D] hover:bg-slate-50 font-medium transition-colors text-sm"
              >
                Decide Later
              </button>
              
              <button
                onClick={handleApprove}
                disabled={submitting}
                className="px-6 py-2.5 rounded-xl bg-[#1F2B4D] hover:bg-[#141C33] text-white font-bold transition-all shadow-md active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
              >
                {submitting ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />}
                Approve & Execute Resolution
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default IrisAction;
