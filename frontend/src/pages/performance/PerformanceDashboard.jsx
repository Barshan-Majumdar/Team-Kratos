import React from 'react';
import { Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { Target, Star, MessageSquare } from 'lucide-react';

import GoalsTab from './GoalsTab';
import ReviewsTab from './ReviewsTab';
import Feedback360Tab from './Feedback360Tab';

const PerformanceDashboard = ({ user }) => {
  const location = useLocation();
  const currentTab = location.pathname.split('/').pop();

  return (
    <div className="p-4 md:p-8 lg:p-12 relative h-full flex flex-col max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-slate-800 tracking-tight">Performance</h1>
        <p className="text-slate-500 mt-2">Manage goals, reviews, and continuous feedback.</p>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 border-b border-slate-200 mb-6">
        <Link
          to="/dashboard/performance/goals"
          className={`flex items-center px-4 py-3 border-b-2 font-medium text-sm transition-colors ${
            currentTab === 'goals' || currentTab === 'performance'
              ? 'border-indigo-500 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
          }`}
        >
          <Target size={16} className="mr-2" />
          OKRs & Goals
        </Link>
        <Link
          to="/dashboard/performance/reviews"
          className={`flex items-center px-4 py-3 border-b-2 font-medium text-sm transition-colors ${
            currentTab === 'reviews'
              ? 'border-indigo-500 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
          }`}
        >
          <Star size={16} className="mr-2" />
          Appraisals
        </Link>
        <Link
          to="/dashboard/performance/feedback"
          className={`flex items-center px-4 py-3 border-b-2 font-medium text-sm transition-colors ${
            currentTab === 'feedback'
              ? 'border-indigo-500 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
          }`}
        >
          <MessageSquare size={16} className="mr-2" />
          360 Feedback
        </Link>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <Routes>
          <Route path="/" element={<Navigate to="goals" replace />} />
          <Route path="goals" element={<GoalsTab user={user} />} />
          <Route path="reviews" element={<ReviewsTab user={user} />} />
          <Route path="feedback" element={<Feedback360Tab user={user} />} />
        </Routes>
      </div>
    </div>
  );
};

export default PerformanceDashboard;
