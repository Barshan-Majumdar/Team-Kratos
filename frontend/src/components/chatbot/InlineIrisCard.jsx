import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { Loader2, CheckCircle, XCircle, BrainCircuit } from 'lucide-react';

export default function InlineIrisCard({ taskId }) {
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchTask();
  }, [taskId]);

  const fetchTask = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/iris/${taskId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setTask(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    setSubmitting(true);
    try {
      await axios.post(
        `${import.meta.env.VITE_API_URL}/api/iris/approve`,
        { 
          taskId, 
          proposalFingerprint: task.recommendation.dataFingerprint 
        },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      toast.success('Action approved and executed successfully.');
      fetchTask();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Execution failed');
      fetchTask();
    } finally {
      setSubmitting(false);
    }
  };

  const handleDecline = async () => {
    setSubmitting(true);
    try {
      // For MVP, we simply hit a hypothetical decline endpoint or just mark it locally.
      // We will just show a toast for now since backend decline isn't strictly defined in requirements.
      toast.error('Action Declined.');
      setTask(prev => ({ ...prev, status: 'REJECTED' }));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="mt-4 p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!task || !task.recommendation) return null;

  return (
    <div className="my-6 rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/80 via-white/90 to-indigo-50/50 backdrop-blur-xl flex flex-col shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden transition-all duration-300 hover:shadow-[0_8px_30px_rgb(79,70,229,0.08)] group">
      {/* Dynamic Background Glow */}
      <div className="absolute -top-24 -right-24 w-48 h-48 bg-indigo-400/10 rounded-full blur-3xl group-hover:bg-indigo-400/20 transition-all duration-500 pointer-events-none" />
      <div className="absolute top-0 right-0 -mr-8 -mt-8 opacity-[0.03] pointer-events-none transform group-hover:scale-110 transition-transform duration-700">
        <BrainCircuit size={140} />
      </div>
      
      {/* Header section */}
      <div className="flex items-center justify-between p-5 border-b border-indigo-100/60 bg-white/40">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-indigo-100 text-indigo-600 rounded-lg shadow-sm">
            <BrainCircuit size={16} className="animate-pulse" />
          </div>
          <span className="text-xs font-bold uppercase tracking-widest text-indigo-700">
            {task.recommendation.type.replace('_', ' ')}
          </span>
        </div>
        <span className={`text-[10px] px-2.5 py-1 rounded-md font-bold uppercase shadow-sm tracking-wider ${
          task.status === 'EXECUTED' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' :
          task.status === 'REJECTED' ? 'bg-rose-100 text-rose-700 border border-rose-200' :
          task.status === 'FAILED' ? 'bg-amber-100 text-amber-700 border border-amber-200' :
          'bg-indigo-100 text-indigo-700 border border-indigo-200 animate-pulse'
        }`}>
          {task.status.replace('_', ' ')}
        </span>
      </div>

      <div className="p-5 flex flex-col gap-4 relative z-10">
        {/* Justification Text */}
        <div className="text-sm font-medium text-slate-700 leading-relaxed bg-white p-4 rounded-xl shadow-sm border border-slate-100/80">
          <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Iris Recommendation</span>
          {task.recommendation.recommendedAction}
        </div>

        {/* Action Parameters (The actual payload) */}
        {task.recommendation.actionParameters && Object.keys(task.recommendation.actionParameters).length > 0 && (
          <div className="grid grid-cols-2 gap-3 mt-1">
            {Object.entries(task.recommendation.actionParameters).map(([key, value]) => (
              value && (
                <div key={key} className="bg-slate-50/80 p-3 rounded-lg border border-slate-100 flex flex-col justify-center">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </span>
                  <span className="text-sm font-semibold text-slate-800 truncate">
                    {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                  </span>
                </div>
              )
            ))}
          </div>
        )}

        {/* Action Buttons */}
        {task.status === 'AWAITING_APPROVAL' && (
          <div className="flex items-center gap-3 mt-3 pt-2">
            <button 
              onClick={handleApprove}
              disabled={submitting}
              className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white px-5 py-2.5 rounded-xl font-semibold text-sm shadow-md hover:shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-[0.98]"
            >
              {submitting ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
              Approve & Execute
            </button>
            <button 
              onClick={handleDecline}
              disabled={submitting}
              className="flex items-center justify-center gap-2 bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 px-5 py-2.5 rounded-xl font-semibold text-sm shadow-sm hover:shadow transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-[0.98]"
            >
              <XCircle size={16} />
              Decline
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
