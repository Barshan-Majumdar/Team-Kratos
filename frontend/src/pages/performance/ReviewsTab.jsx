import React, { useState, useEffect, useMemo } from 'react';
import { Star, Plus, X, Award, CheckCircle2, Clock, RotateCcw, User, Sparkles, ShieldAlert } from 'lucide-react';
import toast from 'react-hot-toast';

const ReviewsTab = ({ user, searchQuery = '', statusFilter = 'all' }) => {
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

  const userLevel = user?.roleDefinition?.level ?? 3;
  const isManager = userLevel <= 2;

  useEffect(() => {
    fetchReviews();
    if (isManager) fetchEmployees();
  }, [isManager]);

  const fetchReviews = async () => {
    try {
      const token = localStorage.getItem('token');
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
      const scope = userLevel <= 1 ? 'all' : 'team';
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/users/directory?scope=${scope}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
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
        if (formData.publish) {
          toast.success('Appraisal published! Milestone recorded.', { icon: '🎉' });
        } else {
          toast.success('Draft appraisal saved.');
        }
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
        toast.success('Appraisal acknowledged successfully.');
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

  const filteredReviews = useMemo(() => {
    return reviews.filter((review) => {
      if (userLevel > 2 && review.revieweeId !== user?.id) {
        return false;
      }

      const query = searchQuery.toLowerCase();
      const matchesQuery = 
        !query ||
        review.cycleName?.toLowerCase().includes(query) ||
        review.reviewer?.displayName?.toLowerCase().includes(query) ||
        review.comments?.toLowerCase().includes(query);

      if (!matchesQuery) return false;

      const isPending = review.status !== 'Published' && review.status !== 'Acknowledged';
      if (statusFilter === 'attention') return isPending;
      if (statusFilter === 'on-track') return !isPending;
      return true;
    });
  }, [reviews, searchQuery, statusFilter, userLevel, user?.id]);

  return (
    <div className="space-y-6 font-['Manrope',sans-serif]">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-[#0F172A] flex items-center gap-2">
            <Star className="text-[#1F2B4D]" size={20} strokeWidth={1.75} />
            Appraisals & Performance Reviews
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {isManager 
              ? 'Formal evaluation cycles and manager-employee assessment milestones.' 
              : 'Your personal appraisal milestones and manager evaluations.'}
          </p>
        </div>
        {isManager && (
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#1F2B4D] text-white rounded-xl text-sm font-semibold hover:bg-[#151D33] active:scale-[0.98] transition-all shadow-xs"
          >
            <Plus size={16} strokeWidth={1.75} /> New Appraisal
          </button>
        )}
      </div>

      {/* Scope Protection Banner for Standard Level 3 Employees */}
      {!isManager && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-100/90 border border-slate-200/80 rounded-xl text-xs font-semibold text-slate-700 shadow-2xs">
          <ShieldAlert size={16} className="text-[#1F2B4D] shrink-0" />
          <span>Personal Scope Active: You are viewing your individual appraisal history. Team reviews are strictly restricted to Founders and Managers.</span>
        </div>
      )}

      {/* Main Content Area with Soft Ambient Shadows */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-6 bg-white border border-slate-200/80 rounded-[16px] animate-pulse space-y-3 shadow-xs">
              <div className="h-4 bg-slate-100 rounded w-1/4"></div>
              <div className="h-5 bg-slate-200 rounded w-1/2"></div>
              <div className="h-12 bg-slate-50 rounded w-full"></div>
            </div>
          ))}
        </div>
      ) : filteredReviews.length === 0 ? (
        <div className="text-center py-16 px-4 bg-white border border-slate-200/80 rounded-[16px] shadow-[0_6px_24px_-4px_rgba(0,0,0,0.05)]">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-[#1F2B4D] flex items-center justify-center mx-auto mb-3">
            <Award size={24} strokeWidth={1.75} />
          </div>
          <h3 className="text-base font-bold text-[#0F172A]">No Appraisal Cycles Found</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 leading-relaxed">
            {isManager 
              ? 'Completed performance appraisals and manager review history will appear here once an appraisal cycle is initiated.' 
              : 'Your published appraisals and manager reviews will appear here once an evaluation cycle is completed.'}
          </p>
          {isManager && (
            <button
              onClick={() => setShowModal(true)}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-[#1F2B4D] text-white rounded-xl text-xs font-semibold hover:bg-[#151D33] transition-all"
            >
              <Plus size={14} strokeWidth={1.75} /> Initiate First Appraisal
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredReviews.map((review) => {
            const isAcknowledged = review.status === 'Acknowledged';
            const isPublished = review.status === 'Published';
            return (
              <div
                key={review.id}
                className="bg-white border border-slate-200/80 rounded-[16px] p-6 shadow-[0_6px_24px_-4px_rgba(0,0,0,0.06)] hover:shadow-[0_12px_32px_-6px_rgba(0,0,0,0.09)] hover:-translate-y-0.5 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] space-y-4"
              >
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  {/* Left: Metadata */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-lg font-bold text-[#0F172A]">{review.cycleName}</h3>
                      <span
                        className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${
                          isAcknowledged || isPublished
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : 'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}
                      >
                        {review.status}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      {review.reviewer && (
                        <span className="flex items-center gap-1">
                          <User size={12} strokeWidth={1.75} /> Reviewer: <strong className="text-[#0F172A]">{review.reviewer.displayName}</strong>
                        </span>
                      )}
                      {review.reviewee && (
                        <span className="flex items-center gap-1">
                          Reviewee: <strong className="text-[#0F172A]">{review.reviewee.displayName}</strong>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right: Rating Metric & Actions */}
                  <div className="flex items-center gap-3 justify-between md:justify-end">
                    {typeof review.overallScore === 'number' && (
                      <div className="text-right">
                        <span className="text-xs text-slate-500 block">Overall Rating</span>
                        <span className="text-xl font-extrabold text-[#1F2B4D] font-['Manrope'] [font-variant-numeric:tabular-nums] tracking-tight">
                          {review.overallScore.toFixed(1)} <span className="text-xs text-slate-400 font-normal">/ 5.0</span>
                        </span>
                      </div>
                    )}

                    {isPublished && review.revieweeId === user?.id && (
                      <button
                        onClick={() => handleAcknowledge(review.id)}
                        className="px-3.5 py-2 bg-[#1F2B4D] text-white rounded-xl text-xs font-semibold hover:bg-[#151D33] active:scale-[0.98] transition-all focus:outline-none focus:ring-2 focus:ring-[#1F2B4D]"
                      >
                        Acknowledge Review
                      </button>
                    )}

                    {isPublished && isManager && (
                      <button
                        onClick={() => handleReopen(review.id)}
                        className="p-2 border border-slate-200 text-slate-500 hover:text-[#0F172A] rounded-xl text-xs font-medium transition-all"
                        title="Reopen as Draft"
                      >
                        <RotateCcw size={14} strokeWidth={1.75} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Rating Gauges */}
                {review.ratings && typeof review.ratings === 'object' && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-3 border-t border-slate-100">
                    {Object.entries(review.ratings).map(([key, val]) => (
                      <div key={key} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-500 font-medium">{key}</span>
                          <span className="font-bold text-[#0F172A] [font-variant-numeric:tabular-nums]">{val} / 5</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#1F2B4D] rounded-full"
                            style={{ width: `${(val / 5) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Comments */}
                {review.comments && (
                  <div className="pt-3 border-t border-slate-100 text-xs text-[#0F172A] leading-relaxed italic">
                    "{review.comments}"
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Write Appraisal Modal */}
      {showModal && isManager && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white border border-slate-200/80 rounded-[20px] shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-200 bg-slate-50/50">
              <h3 className="text-base font-bold text-[#0F172A]">Write Performance Appraisal</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-[#0F172A]">
                <X size={18} strokeWidth={1.75} />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1">Employee / Reviewee</label>
                <select
                  required
                  value={formData.revieweeId}
                  onChange={(e) => setFormData({ ...formData, revieweeId: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#1F2B4D]"
                >
                  <option value="" disabled>Select team member...</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>{emp.displayName} ({emp.email})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1">Cycle Title</label>
                <input
                  required
                  value={formData.cycleName}
                  onChange={(e) => setFormData({ ...formData, cycleName: e.target.value })}
                  placeholder="e.g. H1 2026 Annual Appraisal"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#1F2B4D]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-2">Competency Ratings (1 - 5)</label>
                <div className="grid grid-cols-2 gap-3">
                  {Object.keys(formData.ratings).map((comp) => (
                    <div key={comp} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-semibold text-slate-500">{comp}</span>
                        <span className="text-[#1F2B4D] font-bold [font-variant-numeric:tabular-nums]">{formData.ratings[comp]} / 5</span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="5"
                        step="1"
                        value={formData.ratings[comp]}
                        onChange={(e) => setFormData({
                          ...formData,
                          ratings: { ...formData.ratings, [comp]: Number(e.target.value) }
                        })}
                        className="w-full accent-[#1F2B4D]"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1">Evaluative Comments & Notes</label>
                <textarea
                  rows="3"
                  value={formData.comments}
                  onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
                  placeholder="Provide qualitative feedback, achievements, and growth areas..."
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#1F2B4D]"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="publish"
                  checked={formData.publish}
                  onChange={(e) => setFormData({ ...formData, publish: e.target.checked })}
                  className="w-4 h-4 text-[#1F2B4D] border-slate-300 rounded focus:ring-[#1F2B4D]"
                />
                <label htmlFor="publish" className="text-xs text-slate-500 font-medium">
                  Publish immediately (notifies employee & records milestone)
                </label>
              </div>

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
                  Save Appraisal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReviewsTab;
