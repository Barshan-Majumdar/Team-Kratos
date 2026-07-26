import React, { useState, useEffect } from 'react';
import { MessageSquare, EyeOff, Plus, X } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import RadarChartWidget from './RadarChartWidget';
import toast from 'react-hot-toast';

const Feedback360Tab = ({ user }) => {
  const [feedbacks, setFeedbacks] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  
  const defaultCompetencies = { Leadership: 3, Teamwork: 3, Communication: 3, 'Problem Solving': 3 };
  const [formData, setFormData] = useState({
    receiverId: '',
    content: '',
    isAnonymous: false,
    competencies: { ...defaultCompetencies }
  });

  const isAdmin = (user?.roleDefinition?.level <= 1) || (user?.role === 'Admin') || (user?.role === 'SuperAdmin') || (user?.customRole === 'Owner');

  useEffect(() => {
    fetchFeedback();
    fetchEmployees();
  }, []);

  const fetchFeedback = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/performance/feedback`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setFeedbacks(Array.isArray(data) ? data : []);
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
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/users/org-chart`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        // Filter out self
        setEmployees(Array.isArray(data) ? data.filter(u => u.id !== user?.id) : []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/performance/feedback`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });
      
      if (res.ok) {
        toast.success('Feedback submitted successfully');
        setShowModal(false);
        setFormData({ receiverId: '', content: '', isAnonymous: false, competencies: { ...defaultCompetencies } });
        fetchFeedback();
      } else {
        const err = await res.json();
        const errMsg = Array.isArray(err.error) ? err.error[0].message : err.error;
        toast.error(errMsg || 'Failed to submit feedback');
      }
    } catch (err) {
      toast.error('Server error');
    }
  };

  const handleHide = async (id) => {
    if (!window.confirm('Are you sure you want to hide this feedback? It will be invisible to everyone.')) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/performance/feedback/${id}/status`, {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: 'Hidden' })
      });
      
      if (res.ok) {
        toast.success('Feedback hidden');
        fetchFeedback();
      } else {
        toast.error('Failed to hide feedback');
      }
    } catch (err) {
      toast.error('Server error');
    }
  };

  const getRadarData = (competencies) => {
    if (!competencies) return [];
    return Object.keys(competencies).map(key => ({
      subject: key,
      score: competencies[key],
      fullMark: 5
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-slate-800 flex items-center">
          <MessageSquare className="mr-2 text-indigo-500" size={20} />
          360 Feedback
        </h2>
        <Button variant="primary" className="rounded-full" onClick={() => setShowModal(true)}>
          <Plus size={16} className="mr-1" /> Give Feedback
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {loading ? (
          <>
            {[1, 2].map(i => (
              <Card key={`skel-${i}`} className="p-6 flex flex-col h-64 border border-slate-100 animate-pulse bg-white">
                <div className="flex justify-between items-start mb-4">
                  <div className="space-y-2 w-1/2">
                    <div className="h-4 bg-slate-200 rounded w-full"></div>
                    <div className="h-3 bg-slate-100 rounded w-2/3"></div>
                  </div>
                  <div className="h-5 bg-slate-100 rounded w-16"></div>
                </div>
                <div className="flex-1 bg-slate-50 rounded-xl w-full h-full mt-2"></div>
              </Card>
            ))}
          </>
        ) : feedbacks.length === 0 ? (
          <div className="col-span-full text-center py-16 bg-slate-50/50 rounded-2xl border border-slate-100 border-dashed">
            <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-slate-700">No feedback found</h3>
            <p className="text-slate-500 max-w-sm mx-auto mt-1">Provide continuous feedback to your peers, or request feedback to grow.</p>
          </div>
        ) : (
          feedbacks.map(fb => (
            <Card key={fb.id} className="p-6 flex flex-col hover:shadow-lg transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                    {fb.isAnonymous ? (
                      <><EyeOff size={16} className="text-slate-400" /> Anonymous</>
                    ) : (
                      fb.provider?.displayName || 'Unknown Colleague'
                    )}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">To: {fb.receiver?.displayName || 'Me'}</p>
                </div>
                <div className="flex gap-2 items-center">
                  <span className="text-xs font-medium text-slate-400 bg-slate-100 px-2 py-1 rounded">
                    {new Date(fb.createdAt).toLocaleDateString()}
                  </span>
                  {isAdmin && (
                    <Button variant="ghost" size="sm" className="text-xs py-1 px-2 text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => handleHide(fb.id)}>
                      Hide
                    </Button>
                  )}
                </div>
              </div>
              
              <div className="text-sm text-slate-600 mb-6 flex-1 bg-slate-50 p-4 rounded-xl border border-slate-100">
                "{fb.content}"
              </div>

              {fb.competencies && Object.keys(fb.competencies).length > 0 && (
                <div className="h-48 w-full border-t border-slate-100 pt-4">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 text-center">Competency Radar</h4>
                  <RadarChartWidget data={getRadarData(fb.competencies)} />
                </div>
              )}
            </Card>
          ))
        )}
      </div>

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto">
          <Card className="w-full max-w-lg shadow-2xl my-8">
            <div className="flex justify-between items-center p-6 border-b border-slate-100 sticky top-0 bg-white z-10 rounded-t-2xl">
              <h3 className="text-lg font-bold text-slate-800">Submit 360 Feedback</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Colleague</label>
                <select 
                  required
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  value={formData.receiverId}
                  onChange={e => setFormData({...formData, receiverId: e.target.value})}
                >
                  <option value="" disabled>Select colleague...</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.displayName} ({emp.email})</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Feedback Message</label>
                <textarea 
                  required
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  rows="3"
                  value={formData.content}
                  onChange={e => setFormData({...formData, content: e.target.value})}
                  placeholder="What is doing well? What could be improved?"
                ></textarea>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-3">Competencies (1-5)</label>
                <div className="grid grid-cols-2 gap-4">
                  {Object.keys(formData.competencies).map(comp => (
                    <div key={comp} className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-medium text-slate-700">{comp}</span>
                        <span className="text-indigo-600 font-bold">{formData.competencies[comp]}</span>
                      </div>
                      <input 
                        type="range" 
                        min="1" max="5" step="1"
                        value={formData.competencies[comp]}
                        onChange={e => setFormData({
                          ...formData, 
                          competencies: { ...formData.competencies, [comp]: Number(e.target.value) }
                        })}
                        className="w-full accent-indigo-500"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2 pb-2 bg-yellow-50 p-3 rounded-lg border border-yellow-100">
                <input 
                  type="checkbox" 
                  id="anonymous"
                  checked={formData.isAnonymous}
                  onChange={e => setFormData({...formData, isAnonymous: e.target.checked})}
                  className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                />
                <label htmlFor="anonymous" className="text-sm text-yellow-800 font-medium">Submit Anonymously (Identity will be hidden)</label>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                <Button type="button" variant="ghost" onClick={() => setShowModal(false)}>Cancel</Button>
                <Button type="submit" variant="primary">Submit Feedback</Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Feedback360Tab;
