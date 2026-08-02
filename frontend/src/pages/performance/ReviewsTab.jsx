import React, { useState, useEffect } from 'react';
import { Star, Plus, X } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import toast from 'react-hot-toast';

const ReviewsTab = ({ user }) => {
  const [reviews, setReviews] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const defaultRatings = { Performance: 3, Leadership: 3, Communication: 3, Teamwork: 3 };
  const [formData, setFormData] = useState({
    revieweeId: '',
    cycleName: '',
    comments: '',
    ratings: { ...defaultRatings },
    publish: false
  });

  const isManager = (user?.roleDefinition?.level <= 2);

  useEffect(() => {
    fetchReviews();
    if (isManager) fetchEmployees();
  }, [isManager]);

  const fetchReviews = async () => {
    try {
      const token = localStorage.getItem('token');
      // For a manager, we might want to see both ones they received and ones they gave.
      // But for simplicity, we just fetch what the API returns based on role.
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/performance/reviews`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setReviews(Array.isArray(data) ? data : []);
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
      const userLevel = user?.roleDefinition?.level ?? 3;
      const scope = userLevel <= 1 ? 'all' : 'team';
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/users/directory?scope=${scope}`, {
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
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/performance/reviews`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });
      
      if (res.ok) {
        toast.success(formData.publish ? 'Review published successfully' : 'Draft saved successfully');
        setShowModal(false);
        setFormData({ revieweeId: '', cycleName: '', comments: '', ratings: { ...defaultRatings }, publish: false });
        fetchReviews();
      } else {
        const err = await res.json();
        const errMsg = Array.isArray(err.error) ? err.error[0].message : err.error;
        toast.error(errMsg || 'Failed to save review');
      }
    } catch (err) {
      toast.error('Server error');
    }
  };

  const handleAcknowledge = async (id) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/performance/reviews/${id}/acknowledge`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        toast.success('Review acknowledged');
        fetchReviews();
      } else {
        toast.error('Failed to acknowledge review');
      }
    } catch (err) {
      toast.error('Server error');
    }
  };

  const handleReopen = async (id) => {
    if (!window.confirm('Are you sure you want to reopen this review? It will revert to Draft.')) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/performance/reviews/${id}/reopen`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        toast.success('Review reopened as Draft');
        fetchReviews();
      } else {
        toast.error('Failed to reopen review');
      }
    } catch (err) {
      toast.error('Server error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-slate-800 flex items-center">
          <Star className="mr-2 text-indigo-500" size={20} />
          Appraisals & Reviews
        </h2>
        {isManager && (
          <Button variant="primary" className="rounded-full" onClick={() => setShowModal(true)}>
            <Plus size={16} className="mr-1" /> New Review
          </Button>
        )}
      </div>

      <Card className="p-6">
        {loading ? (
          <div className="space-y-4 animate-pulse">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex justify-between items-start p-4 border border-slate-100 rounded-xl bg-slate-50/50">
                <div className="space-y-3 w-full">
                  <div className="h-5 bg-slate-200 rounded w-1/4"></div>
                  <div className="h-4 bg-slate-200 rounded w-1/6"></div>
                  <div className="h-16 bg-slate-100 rounded w-full mt-4"></div>
                </div>
              </div>
            ))}
          </div>
        ) : reviews.length === 0 ? (
          <div className="text-center py-16 bg-slate-50/50 rounded-2xl border border-slate-100 border-dashed">
            <Star className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-slate-700">No appraisals yet</h3>
            <p className="text-slate-500 max-w-sm mx-auto mt-1">When an appraisal cycle is completed, the reviews will appear here.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {reviews.map(review => (
              <div key={review.id} className="p-4 border border-slate-200 rounded-xl hover:border-indigo-200 transition-colors">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-slate-800">{review.cycleName}</h3>
                    <p className="text-sm text-slate-500 mt-1">Reviewer: {review.reviewer?.displayName || 'Unknown'}</p>
                    {typeof review.overallScore === 'number' && (
                      <div className="mt-2 text-sm font-semibold text-indigo-700 bg-indigo-50 px-2 py-1 rounded inline-block">
                        Overall Score: {review.overallScore.toFixed(1)} / 5.0
                      </div>
                    )}
                    {review.comments && (
                      <p className="text-sm text-slate-600 mt-3 p-3 bg-slate-50 rounded-lg">"{review.comments}"</p>
                    )}
                  </div>
                  <div className="text-right flex flex-col items-end gap-2">
                    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${
                      review.status === 'Published' ? 'bg-emerald-100 text-emerald-700' : 
                      review.status === 'Acknowledged' ? 'bg-blue-100 text-blue-700' :
                      'bg-slate-100 text-slate-700'
                    }`}>
                      {review.status}
                    </span>
                    {review.status === 'Published' && review.revieweeId === user?.id && (
                      <Button variant="outline" size="sm" className="text-xs py-1 px-2" onClick={() => handleAcknowledge(review.id)}>
                        Acknowledge
                      </Button>
                    )}
                    {review.status === 'Published' && isManager && (
                      <Button variant="ghost" size="sm" className="text-xs py-1 px-2 text-red-500 hover:text-red-700" onClick={() => handleReopen(review.id)}>
                        Reopen (Draft)
                      </Button>
                    )}
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
              <h3 className="text-lg font-bold text-slate-800">Write Appraisal</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Employee</label>
                <select 
                  required
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  value={formData.revieweeId}
                  onChange={e => setFormData({...formData, revieweeId: e.target.value})}
                >
                  <option value="" disabled>Select employee...</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.displayName} ({emp.email})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Cycle Name</label>
                <Input required value={formData.cycleName} onChange={e => setFormData({...formData, cycleName: e.target.value})} placeholder="e.g. H1 2026 Performance Review" />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-3">Competencies (1-5)</label>
                <div className="grid grid-cols-2 gap-4">
                  {Object.keys(formData.ratings).map(comp => (
                    <div key={comp} className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-medium text-slate-700">{comp}</span>
                        <span className="text-indigo-600 font-bold">{formData.ratings[comp]}</span>
                      </div>
                      <input 
                        type="range" 
                        min="1" max="5" step="1"
                        value={formData.ratings[comp]}
                        onChange={e => setFormData({
                          ...formData, 
                          ratings: { ...formData.ratings, [comp]: Number(e.target.value) }
                        })}
                        className="w-full accent-indigo-500"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Comments</label>
                <textarea 
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  rows="4"
                  value={formData.comments}
                  onChange={e => setFormData({...formData, comments: e.target.value})}
                  placeholder="Provide detailed feedback..."
                ></textarea>
              </div>
              <div className="flex items-center gap-2 pt-2">
                <input 
                  type="checkbox" 
                  id="publish"
                  checked={formData.publish}
                  onChange={e => setFormData({...formData, publish: e.target.checked})}
                  className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                />
                <label htmlFor="publish" className="text-sm text-slate-700">Publish immediately (immutable)</label>
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <Button type="button" variant="ghost" onClick={() => setShowModal(false)}>Cancel</Button>
                <Button type="submit" variant="primary">Save Review</Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
};

export default ReviewsTab;
