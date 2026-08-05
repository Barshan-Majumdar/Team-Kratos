import React, { useState, useEffect, useMemo } from 'react';
import { Target, Plus, X, AlertCircle, CheckCircle2, User, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';

const GoalsTab = ({ user, searchQuery = '', statusFilter = 'all' }) => {
  const [goals, setGoals] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'Engineering',
    targetValue: 100,
    metricType: 'Percentage',
    userId: ''
  });

  const userLevel = user?.roleDefinition?.level ?? 3;
  const canCreateGoal = userLevel <= 2;

  useEffect(() => {
    fetchGoals();
    if (canCreateGoal) fetchEmployees();
  }, [canCreateGoal]);

  const fetchGoals = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/performance/goals`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setGoals(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const token = localStorage.getItem('token');
      const scope = userLevel <= 1 ? 'all' : 'team';
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/users/directory?scope=${scope}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setEmployees(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const payload = {
        ...formData,
        userId: formData.userId || user?.id,
        targetValue: Number(formData.targetValue)
      };

      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/performance/goals`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        toast.success('Objective created successfully');
        setShowModal(false);
        setFormData({ title: '', description: '', category: 'Engineering', targetValue: 100, metricType: 'Percentage', userId: '' });
        fetchGoals();
      } else {
        const err = await res.json();
        const errMsg = Array.isArray(err.error) ? err.error[0].message : err.error;
        toast.error(errMsg || 'Failed to create goal');
      }
    } catch (err) {
      toast.error('Server error');
    }
  };

  const handleUpdateProgress = async (id, currentValue) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/performance/goals/${id}/progress`, {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ currentValue: Number(currentValue) })
      });

      if (res.ok) {
        toast.success('Progress updated');
        fetchGoals();
      } else {
        toast.error('Failed to update progress');
      }
    } catch (err) {
      toast.error('Server error');
    }
  };

  const filteredGoals = useMemo(() => {
    return goals
      .filter((goal) => {
        if (userLevel > 2 && goal.userId !== user?.id) {
          return false;
        }

        const query = searchQuery.toLowerCase();
        const matchesQuery = 
          !query ||
          goal.title?.toLowerCase().includes(query) ||
          goal.description?.toLowerCase().includes(query) ||
          goal.category?.toLowerCase().includes(query) ||
          goal.user?.displayName?.toLowerCase().includes(query);

        if (!matchesQuery) return false;

        const isAttentionNeeded = (goal.progress < 50 && goal.status !== 'Achieved') || goal.status === 'At Risk';
        if (statusFilter === 'attention') return isAttentionNeeded;
        if (statusFilter === 'on-track') return !isAttentionNeeded;
        return true;
      })
      .sort((a, b) => {
        const aNeedsAttention = (a.progress < 50 && a.status !== 'Achieved') || a.status === 'At Risk';
        const bNeedsAttention = (b.progress < 50 && b.status !== 'Achieved') || b.status === 'At Risk';
        if (aNeedsAttention && !bNeedsAttention) return -1;
        if (!aNeedsAttention && bNeedsAttention) return 1;
        return 0;
      });
  }, [goals, searchQuery, statusFilter, userLevel, user?.id]);

  return (
    <div className="space-y-6 font-['Manrope',sans-serif]">
      {/* Header Bar */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-[#0F172A] flex items-center gap-2">
            <Target className="text-[#1F2B4D]" size={20} strokeWidth={1.75} />
            OKRs & Objectives
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">Priority-ranked strategic key results and personal development targets.</p>
        </div>
        {canCreateGoal && (
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#1F2B4D] text-white rounded-xl text-sm font-semibold hover:bg-[#151D33] active:scale-[0.98] transition-all shadow-xs"
          >
            <Plus size={16} strokeWidth={1.75} /> New Objective
          </button>
        )}
      </div>

      {/* Main Content List Area */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-6 bg-white border border-slate-200/80 rounded-[16px] animate-pulse space-y-3 shadow-xs">
              <div className="h-4 bg-slate-100 rounded w-1/4"></div>
              <div className="h-6 bg-slate-200 rounded w-3/4"></div>
              <div className="h-3 bg-slate-100 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      ) : filteredGoals.length === 0 ? (
        <div className="text-center py-16 px-4 bg-white border border-slate-200/80 rounded-[16px] shadow-[0_6px_24px_-4px_rgba(0,0,0,0.05)]">
          <div className="w-12 h-12 rounded-full bg-[#1F2B4D]/5 text-[#1F2B4D] flex items-center justify-center mx-auto mb-3">
            <Target size={24} strokeWidth={1.75} />
          </div>
          <h3 className="text-base font-bold text-[#0F172A]">No Objectives Configured</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 leading-relaxed">
            Welcome to Team-Kratos Performance. Your Growth Trajectory chart will activate upon completing your first goal check-in.
          </p>
          {canCreateGoal && (
            <button
              onClick={() => setShowModal(true)}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-[#1F2B4D] text-white rounded-xl text-xs font-semibold hover:bg-[#151D33] transition-all"
            >
              <Plus size={14} strokeWidth={1.75} /> Create First Goal
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredGoals.map((goal) => {
            const isAttentionNeeded = (goal.progress < 50 && goal.status !== 'Achieved') || goal.status === 'At Risk';
            return (
              <div
                key={goal.id}
                className={`bg-white border rounded-[16px] p-6 shadow-[0_6px_24px_-4px_rgba(0,0,0,0.06)] hover:shadow-[0_12px_32px_-6px_rgba(0,0,0,0.09)] hover:-translate-y-0.5 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
                  isAttentionNeeded
                    ? 'border-slate-200/80 border-l-4 border-l-[#8C5722]'
                    : 'border-slate-200/80 hover:border-[#1F2B4D]/30'
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  {/* Left: Info & Badges */}
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-slate-100 text-[#0F172A] border border-slate-200">
                        {goal.category}
                      </span>

                      {isAttentionNeeded ? (
                        <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-[rgba(181,121,58,0.12)] text-[#8C5722] flex items-center gap-1">
                          <AlertCircle size={12} strokeWidth={1.75} /> Needs Attention
                        </span>
                      ) : (
                        <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-[#10B981]/10 text-[#10B981] flex items-center gap-1">
                          <CheckCircle2 size={12} strokeWidth={1.75} /> On Track
                        </span>
                      )}
                    </div>

                    <h3 className="text-base font-bold text-[#0F172A]">{goal.title}</h3>
                    {goal.description && (
                      <p className="text-xs text-slate-500 leading-relaxed max-w-2xl">{goal.description}</p>
                    )}

                    {goal.user && (
                      <div className="flex items-center gap-1.5 text-xs text-slate-400 pt-1">
                        <User size={12} strokeWidth={1.75} />
                        Assignee: <strong className="text-slate-700">{goal.user.displayName}</strong>
                      </div>
                    )}
                  </div>

                  {/* Right: Progress Meter & Check-in Controls */}
                  <div className="w-full md:w-64 space-y-2.5 border-t md:border-t-0 md:border-l border-slate-100 pt-3 md:pt-0 md:pl-6">
                    <div className="flex justify-between items-baseline text-xs">
                      <span className="text-slate-500 font-semibold">Progress</span>
                      <span className="text-sm font-extrabold text-[#0F172A] font-['Manrope'] [font-variant-numeric:tabular-nums]">
                        {goal.currentValue} / {goal.targetValue} ({goal.progress}%)
                      </span>
                    </div>

                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-[#1F2B4D] to-[#3B82F6] rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(goal.progress, 100)}%` }}
                      />
                    </div>

                    {/* Progress Slider */}
                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="range"
                        min="0"
                        max={goal.targetValue || 100}
                        value={goal.currentValue || 0}
                        onChange={(e) => handleUpdateProgress(goal.id, e.target.value)}
                        className="w-full accent-[#1F2B4D]"
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Goal Modal */}
      {showModal && canCreateGoal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white border border-slate-200/80 rounded-[20px] shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-200 bg-slate-50/50">
              <h3 className="text-base font-bold text-[#0F172A]">Create Strategic OKR Objective</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-[#0F172A]">
                <X size={18} strokeWidth={1.75} />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1">Objective Title</label>
                <input
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Scale engineering throughput by 40%"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#1F2B4D]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1">Description & Context</label>
                <textarea
                  rows="2"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Key result criteria and strategic alignment..."
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#1F2B4D]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#1F2B4D]"
                  >
                    <option value="Engineering">Engineering</option>
                    <option value="Product">Product</option>
                    <option value="Leadership">Leadership</option>
                    <option value="Sales">Sales</option>
                    <option value="Personal Growth">Personal Growth</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1">Target Metric Value</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.targetValue}
                    onChange={(e) => setFormData({ ...formData, targetValue: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#1F2B4D]"
                  />
                </div>
              </div>

              {userLevel <= 2 && employees.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1">Assignee</label>
                  <select
                    value={formData.userId}
                    onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#1F2B4D]"
                  >
                    <option value={user?.id}>Self ({user?.displayName || 'Me'})</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>{emp.displayName} ({emp.email})</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="pt-3 flex justify-end gap-2.5 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#1F2B4D] text-white rounded-xl text-xs font-semibold hover:bg-[#151D33] inline-flex items-center gap-1.5"
                >
                  <Sparkles size={14} strokeWidth={1.75} />
                  Save Objective
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default GoalsTab;
