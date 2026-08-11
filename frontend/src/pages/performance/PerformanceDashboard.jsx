import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { Target, Star, MessageSquare, TrendingUp, AlertCircle, CheckCircle2, ArrowUpRight, Search } from 'lucide-react';

import GoalsTab from './GoalsTab';
import ReviewsTab from './ReviewsTab';
import Feedback360Tab from './Feedback360Tab';

const PerformanceDashboard = ({ user }) => {
  const location = useLocation();
  const currentTab = location.pathname.split('/').pop() || 'goals';
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Dynamic API metrics state
  const [metrics, setMetrics] = useState({
    totalGoals: 0,
    onTrackGoals: 0,
    attentionGoals: 0,
    avgProgress: 0,
    totalReviews: 0,
    pendingReviews: 0,
    totalFeedback: 0,
    loading: true
  });

  useEffect(() => {
    fetchDashboardMetrics();
  }, []);

  const fetchDashboardMetrics = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { 'Authorization': `Bearer ${token}` };
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';

      const [goalsRes, reviewsRes, feedbackRes] = await Promise.all([
        fetch(`${baseUrl}/api/performance/goals`, { headers }).catch(() => null),
        fetch(`${baseUrl}/api/performance/reviews`, { headers }).catch(() => null),
        fetch(`${baseUrl}/api/performance/feedback`, { headers }).catch(() => null)
      ]);

      const goalsData = goalsRes && goalsRes.ok ? await goalsRes.json() : [];
      const reviewsData = reviewsRes && reviewsRes.ok ? await reviewsRes.json() : [];
      const feedbackData = feedbackRes && feedbackRes.ok ? await feedbackRes.json() : [];

      const goalsList = Array.isArray(goalsData) ? goalsData : [];
      const reviewsList = Array.isArray(reviewsData) ? reviewsData : [];
      const feedbackList = Array.isArray(feedbackData) ? feedbackData : [];

      const totalGoals = goalsList.length;
      const attentionGoals = goalsList.filter(g => (g.progress < 50 && g.status !== 'Achieved') || g.status === 'At Risk').length;
      const onTrackGoals = totalGoals - attentionGoals;
      const avgProgress = totalGoals ? Math.round(goalsList.reduce((acc, g) => acc + (g.progress || 0), 0) / totalGoals) : 0;
      const pendingReviews = reviewsList.filter(r => r.status !== 'Published' && r.status !== 'Acknowledged').length;

      setMetrics({
        totalGoals,
        onTrackGoals,
        attentionGoals,
        avgProgress,
        totalReviews: reviewsList.length,
        pendingReviews,
        totalFeedback: feedbackList.length,
        loading: false
      });
    } catch (err) {
      console.error(err);
      setMetrics(m => ({ ...m, loading: false }));
    }
  };

  return (
    <div className="min-h-full bg-transparent text-[#0F172A] font-['Manrope',-apple-system,sans-serif] p-3 md:p-6 lg:p-7 max-w-[1600px] mx-auto space-y-6">
      {/* Sleek Compact Hero Header & Global Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-200/80 pb-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#1F2B4D]/5 text-[#1F2B4D] mb-1.5">
            <TrendingUp size={12} strokeWidth={2} />
            Performance & Growth Engine
          </div>
          <h1 className="text-2xl md:text-3xl lg:text-4xl 2xl:text-5xl font-bold font-['Fraunces',Georgia,serif] tracking-tight text-[#0F172A]">
            Performance Trajectory
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm lg:text-base mt-1 max-w-xl 2xl:max-w-2xl">
            Track strategic OKRs, conduct objective appraisals, and cultivate peer feedback in a human-centered environment.
          </p>
        </div>

        {/* Global Search Bar */}
        <div className="flex items-center gap-3">
          <div className="relative w-full md:w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} strokeWidth={2} />
            <input
              type="text"
              placeholder="Search goals, reviews..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-3 md:py-1.5 bg-white border border-slate-200/80 rounded-xl text-sm md:text-xs text-[#0F172A] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1F2B4D] focus:ring-offset-1 transition-all shadow-xs min-h-[44px] md:min-h-0"
            />
          </div>
        </div>
      </div>

      {/* Signature Asymmetric Header Band: Soft Ambient Shadow Floating Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4 md:gap-5 xl:gap-6">
        {/* Left: Dynamic Growth Trajectory Compact Hero Card */}
        <div className="md:col-span-2 lg:col-span-7 xl:col-span-8 bg-white border border-slate-200/80 rounded-[14px] p-4 sm:p-5 shadow-[0_6px_24px_-4px_rgba(0,0,0,0.06)] hover:shadow-[0_12px_36px_-6px_rgba(0,0,0,0.09)] hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <span className="text-[11px] uppercase tracking-wider font-bold text-slate-400 block">Live OKR Completion Rate</span>
              <div className="flex items-baseline gap-2.5 mt-0.5">
                <span className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#0F172A] font-['Manrope'] [font-variant-numeric:tabular-nums] tracking-tight">
                  {metrics.loading ? '...' : `${metrics.avgProgress}%`}
                </span>
                <span className="inline-flex items-center text-[11px] font-semibold text-[#10B981] bg-[#10B981]/10 px-2 py-0.5 rounded-full">
                  <ArrowUpRight size={12} className="mr-0.5" strokeWidth={2} />
                  Active Trajectory
                </span>
              </div>
            </div>

            <div className="text-left sm:text-right">
              <span className="text-[11px] text-slate-400 block">Objectives Tracked</span>
              <span className="text-base font-bold text-[#0F172A] [font-variant-numeric:tabular-nums]">
                {metrics.loading ? '...' : `${metrics.totalGoals} Total`}
              </span>
            </div>
          </div>

          {/* Animated Clean Progress Line */}
          <div className="mt-4 space-y-1.5">
            <div className="flex justify-between text-[11px] text-slate-500 font-medium">
              <span>Overall Team Velocity</span>
              <span className="font-bold text-[#0F172A] [font-variant-numeric:tabular-nums]">{metrics.avgProgress}% Met</span>
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
              <div 
                className="bg-gradient-to-r from-[#1F2B4D] via-[#3B82F6] to-[#10B981] h-full rounded-full transition-all duration-500 ease-out"
                style={{ width: `${Math.max(metrics.avgProgress, 5)}%` }}
              />
            </div>
          </div>

          <div className="mt-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0 text-[11px] text-slate-500 pt-2.5 border-t border-slate-100">
            <span>Primary Focus: Strategic Execution & Employee Appraisals</span>
            <span className="font-semibold text-[#0F172A]">
              {metrics.attentionGoals > 0 ? `${metrics.attentionGoals} OKRs Need Attention` : 'All OKRs On Track'}
            </span>
          </div>
        </div>

        {/* Right: Premium Compact Floating Stat Stack with Soft Ambient Shadows */}
        <div className="md:col-span-2 lg:col-span-5 xl:col-span-4 grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 gap-2.5 md:gap-4 lg:gap-3">
          {/* Stat 1: OKRs */}
          <div className="bg-white border border-slate-200/80 rounded-[14px] p-3.5 shadow-[0_6px_24px_-4px_rgba(0,0,0,0.05)] hover:shadow-[0_10px_30px_-4px_rgba(0,0,0,0.08)] hover:-translate-y-0.5 transition-all duration-300 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[#1F2B4D]/5 text-[#1F2B4D]">
                <Target size={18} strokeWidth={2} />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-400 block">Active OKRs</span>
                <span className="text-lg sm:text-xl lg:text-2xl font-bold text-[#0F172A] [font-variant-numeric:tabular-nums]">
                  {metrics.loading ? '...' : `${metrics.totalGoals} Goals`}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] px-2.5 py-0.5 rounded-full font-medium bg-[#10B981]/10 text-[#10B981] flex items-center gap-1">
                <CheckCircle2 size={11} strokeWidth={2} /> {metrics.onTrackGoals} On-Track
              </span>
              {metrics.attentionGoals > 0 && (
                <span className="text-[11px] px-2.5 py-0.5 rounded-full font-semibold bg-[rgba(181,121,58,0.12)] text-[#8C5722] flex items-center gap-1">
                  <AlertCircle size={11} strokeWidth={2} /> {metrics.attentionGoals} Action
                </span>
              )}
            </div>
          </div>

          {/* Stat 2: Appraisals */}
          <div className="bg-white border border-slate-200/80 rounded-[14px] p-3.5 shadow-[0_6px_24px_-4px_rgba(0,0,0,0.05)] hover:shadow-[0_10px_30px_-4px_rgba(0,0,0,0.08)] hover:-translate-y-0.5 transition-all duration-300 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[rgba(181,121,58,0.12)] text-[#8C5722]">
                <Star size={18} strokeWidth={2} />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-400 block">Appraisals & Reviews</span>
                <span className="text-lg sm:text-xl lg:text-2xl font-bold text-[#0F172A] [font-variant-numeric:tabular-nums]">
                  {metrics.loading ? '...' : `${metrics.totalReviews} Total`}
                </span>
              </div>
            </div>
            <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-semibold ${
              metrics.pendingReviews > 0 ? 'bg-[rgba(181,121,58,0.12)] text-[#8C5722]' : 'bg-[#10B981]/10 text-[#10B981]'
            }`}>
              {metrics.pendingReviews > 0 ? `${metrics.pendingReviews} Action Pending` : 'All Up To Date'}
            </span>
          </div>

          {/* Stat 3: 360 Feedback */}
          <div className="bg-white border border-slate-200/80 rounded-[14px] p-3.5 shadow-[0_6px_24px_-4px_rgba(0,0,0,0.05)] hover:shadow-[0_10px_30px_-4px_rgba(0,0,0,0.08)] hover:-translate-y-0.5 transition-all duration-300 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[#10B981]/10 text-[#10B981]">
                <MessageSquare size={18} strokeWidth={2} />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-400 block">360 Peer Feedback</span>
                <span className="text-lg sm:text-xl lg:text-2xl font-bold text-[#0F172A] [font-variant-numeric:tabular-nums]">
                  {metrics.loading ? '...' : `${metrics.totalFeedback} Submissions`}
                </span>
              </div>
            </div>
            <span className="text-[11px] text-slate-500 font-semibold">
              Continuous Peer Feed
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Pill Tab Switcher & Filter Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3 border-b border-slate-200/80 pb-3">
        {/* Capsule Pill Tab Container */}
        <div role="tablist" aria-label="Performance Navigation" className="flex w-full sm:w-auto bg-slate-100/80 p-1 rounded-full border border-slate-200/80 shadow-2xs">
          <Link
            to="/dashboard/performance/goals"
            role="tab"
            aria-selected={currentTab === 'goals' || currentTab === 'performance'}
            className={`flex-1 flex justify-center items-center gap-1 sm:gap-1.5 px-1 sm:px-3.5 py-1.5 sm:py-2 rounded-full text-[10px] sm:text-xs font-semibold whitespace-nowrap transition-all duration-200 ${
              currentTab === 'goals' || currentTab === 'performance'
                ? 'bg-[#1F2B4D] text-white shadow-xs'
                : 'text-slate-600 hover:text-[#0F172A] hover:bg-white/60'
            } focus:outline-none focus:ring-2 focus:ring-[#1F2B4D] focus:ring-offset-1`}
          >
            <Target className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0 hidden sm:inline-block" strokeWidth={2} />
            <span>OKRs & Goals</span>
          </Link>

          <Link
            to="/dashboard/performance/reviews"
            role="tab"
            aria-selected={currentTab === 'reviews'}
            className={`flex-1 flex justify-center items-center gap-1 sm:gap-1.5 px-1 sm:px-3.5 py-1.5 sm:py-2 rounded-full text-[10px] sm:text-xs font-semibold whitespace-nowrap transition-all duration-200 ${
              currentTab === 'reviews'
                ? 'bg-[#1F2B4D] text-white shadow-xs'
                : 'text-slate-600 hover:text-[#0F172A] hover:bg-white/60'
            } focus:outline-none focus:ring-2 focus:ring-[#1F2B4D] focus:ring-offset-1`}
          >
            <Star className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0 hidden sm:inline-block" strokeWidth={2} />
            <span>Appraisals</span>
          </Link>

          <Link
            to="/dashboard/performance/feedback"
            role="tab"
            aria-selected={currentTab === 'feedback'}
            className={`flex-1 flex justify-center items-center gap-1 sm:gap-1.5 px-1 sm:px-3.5 py-1.5 sm:py-2 rounded-full text-[10px] sm:text-xs font-semibold whitespace-nowrap transition-all duration-200 ${
              currentTab === 'feedback'
                ? 'bg-[#1F2B4D] text-white shadow-xs'
                : 'text-slate-600 hover:text-[#0F172A] hover:bg-white/60'
            } focus:outline-none focus:ring-2 focus:ring-[#1F2B4D] focus:ring-offset-1`}
          >
            <MessageSquare className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0 hidden sm:inline-block" strokeWidth={2} />
            <span>360 Feedback</span>
          </Link>
        </div>

        {/* Priority Status Filter Chips */}
        <div className="flex w-full sm:w-auto items-center justify-between sm:justify-start gap-1 sm:gap-1.5">
          <span className="text-[11px] font-semibold text-slate-400 mr-1 hidden sm:inline shrink-0">Filter:</span>
          {['all', 'attention', 'on-track'].map((filter) => (
            <button
              key={filter}
              onClick={() => setStatusFilter(filter)}
              className={`flex-1 sm:flex-initial text-center justify-center px-2 py-1.5 sm:px-3 sm:py-1 rounded-full text-[10px] sm:text-xs font-semibold capitalize transition-all duration-200 whitespace-nowrap ${
                statusFilter === filter
                  ? 'bg-[#0F172A] text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {filter === 'attention' ? 'Needs Attention' : filter}
            </button>
          ))}
        </div>
      </div>

      {/* Sub-Route Content View Area */}
      <div className="pt-1">
        <Routes>
          <Route path="/" element={<Navigate to="goals" replace />} />
          <Route path="goals" element={<GoalsTab user={user} searchQuery={searchQuery} statusFilter={statusFilter} />} />
          <Route path="reviews" element={<ReviewsTab user={user} searchQuery={searchQuery} statusFilter={statusFilter} />} />
          <Route path="feedback" element={<Feedback360Tab user={user} searchQuery={searchQuery} statusFilter={statusFilter} />} />
        </Routes>
      </div>
    </div>
  );
};

export default PerformanceDashboard;
