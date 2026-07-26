import React, { useState, useEffect } from 'react';
import { Target, Plus, X } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import toast from 'react-hot-toast';

const GoalsTab = ({ user }) => {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState(null);
  const [progressValue, setProgressValue] = useState(0);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'Individual',
    metricType: 'Percentage',
    targetValue: 100,
    parentGoalId: '',
    userId: user?.id || ''
  });

  const [employees, setEmployees] = useState([]);
  const canCreateGoal = user?.roleDefinition?.level <= 2 || user?.customRole === 'Owner' || user?.role === 'Admin' || user?.role === 'SuperAdmin';

  useEffect(() => {
    fetchGoals();
    if (canCreateGoal) {
      fetchEmployees();
    }
  }, [canCreateGoal]);

  const fetchEmployees = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/users/org-chart`, {
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

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/performance/goals`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          targetValue: Number(formData.targetValue),
          parentGoalId: formData.parentGoalId || undefined
        })
      });
      
      if (res.ok) {
        toast.success('Goal created successfully');
        setShowModal(false);
        setFormData({ title: '', description: '', category: 'Individual', metricType: 'Percentage', targetValue: 100, parentGoalId: '', userId: user?.id || '' });
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

  const handleUpdateProgress = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/performance/goals/${selectedGoal.id}/progress`, {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ currentValue: Number(progressValue) })
      });
      
      if (res.ok) {
        toast.success('Progress updated successfully');
        setShowProgressModal(false);
        setSelectedGoal(null);
        fetchGoals();
      } else {
        const err = await res.json();
        const errMsg = Array.isArray(err.error) ? err.error[0].message : err.error;
        toast.error(errMsg || 'Failed to update progress');
      }
    } catch (err) {
      toast.error('Server error');
    }
  };

  const openProgressModal = (goal) => {
    setSelectedGoal(goal);
    setProgressValue(goal.currentValue);
    setShowProgressModal(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-slate-800 flex items-center">
          <Target className="mr-2 text-indigo-500" size={20} />
          OKRs & Goals
        </h2>
        {canCreateGoal && (
          <Button variant="primary" className="rounded-full" onClick={() => setShowModal(true)}>
            <Plus size={16} className="mr-1" /> New Goal
          </Button>
        )}
      </div>

      <Card className="p-6">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <Card key={`skel-${i}`} className="p-6 border border-slate-100 animate-pulse bg-white">
                <div className="h-5 bg-slate-200 rounded w-1/3 mb-4"></div>
                <div className="h-4 bg-slate-100 rounded w-full mb-2"></div>
                <div className="h-4 bg-slate-100 rounded w-5/6 mb-6"></div>
                <div className="h-2 bg-slate-200 rounded-full w-full mb-2"></div>
                <div className="h-3 bg-slate-100 rounded w-1/4"></div>
              </Card>
            ))}
          </div>
        ) : goals.length === 0 ? (
          <div className="text-center py-16 bg-slate-50/50 rounded-2xl border border-slate-100 border-dashed">
            <Target className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-slate-700">No OKRs or Goals</h3>
            <p className="text-slate-500 max-w-sm mx-auto mt-1">Start tracking your performance by creating your first objective.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {goals.map(goal => (
              <div key={goal.id} className="p-4 border border-slate-200 rounded-xl hover:border-indigo-200 transition-colors">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-slate-800">{goal.title}</h3>
                    <p className="text-sm text-slate-500 mt-1">
                      {goal.category} • {goal.status} 
                      {goal.user && ` • Assigned to: ${goal.user.displayName || 'Unknown'}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-3 justify-end mb-1">
                      <span className="text-sm font-bold text-indigo-600">{goal.progress}%</span>
                      {goal.status !== 'Achieved' && (
                        <button 
                          onClick={() => openProgressModal(goal)}
                          className="text-xs text-indigo-500 hover:text-indigo-700 underline"
                        >
                          Update
                        </button>
                      )}
                    </div>
                    <div className="w-32 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-500 rounded-full transition-all duration-500" style={{ width: `${goal.progress}%` }}></div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <Card className="w-full max-w-lg shadow-2xl">
            <div className="flex justify-between items-center p-6 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-800">Create New Goal</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Title</label>
                <Input required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="e.g. Launch Q3 Marketing Campaign" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Assign To</label>
                <select 
                  required
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  value={formData.userId}
                  onChange={e => setFormData({...formData, userId: e.target.value})}
                >
                  <option value="" disabled>Select employee...</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.displayName} ({emp.email})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Description</label>
                <textarea 
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  rows="3"
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                ></textarea>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Category</label>
                  <select 
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    value={formData.category}
                    onChange={e => setFormData({...formData, category: e.target.value})}
                  >
                    <option value="Individual">Individual</option>
                    <option value="Team">Team</option>
                    <option value="Company">Company</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Metric Type</label>
                  <select 
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    value={formData.metricType}
                    onChange={e => setFormData({...formData, metricType: e.target.value})}
                  >
                    <option value="Percentage">Percentage</option>
                    <option value="Boolean">Boolean (Done/Not Done)</option>
                    <option value="Number">Numeric Value</option>
                    <option value="Currency">Currency</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Target Value</label>
                <Input type="number" required value={formData.targetValue} onChange={e => setFormData({...formData, targetValue: e.target.value})} min="1" />
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <Button type="button" variant="ghost" onClick={() => setShowModal(false)}>Cancel</Button>
                <Button type="submit" variant="primary">Create Goal</Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Update Progress Modal */}
      {showProgressModal && selectedGoal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <Card className="w-full max-w-sm shadow-2xl">
            <div className="flex justify-between items-center p-6 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-800">Update Progress</h3>
              <button onClick={() => setShowProgressModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleUpdateProgress} className="p-6 space-y-4">
              <div>
                <p className="text-sm text-slate-600 mb-4">
                  Goal: <span className="font-semibold text-slate-800">{selectedGoal.title}</span><br/>
                  Target: <span className="font-semibold">{selectedGoal.targetValue}</span>
                </p>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Current Value</label>
                <Input 
                  type="number" 
                  required 
                  value={progressValue} 
                  onChange={e => setProgressValue(e.target.value)} 
                  min="0" 
                  max={selectedGoal.metricType === 'Percentage' ? "100" : undefined}
                />
              </div>
              <div className="pt-2 flex justify-end gap-3">
                <Button type="button" variant="ghost" onClick={() => setShowProgressModal(false)}>Cancel</Button>
                <Button type="submit" variant="primary">Save Progress</Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
};

export default GoalsTab;
