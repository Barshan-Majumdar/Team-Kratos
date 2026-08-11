import React, { useState, useEffect } from 'react';
import { hasPermission } from '../lib/permissions';
import { LifeBuoy, Plus, MessageSquare, AlertCircle, Clock, CheckCircle, X, Search, Filter, HelpCircle } from 'lucide-react';
import { API_BASE } from '../lib/api';
import Alert from '../components/ui/Alert';
import { ListSkeleton } from '../components/ui/Skeleton';
import { motion, AnimatePresence } from 'framer-motion';

const Helpdesk = ({ user }) => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  
  // Filter & Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'Open' | 'InProgress' | 'Resolved'

  // New Ticket Form State
  const [showNewForm, setShowNewForm] = useState(false);
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('HR');
  const [submitting, setSubmitting] = useState(false);

  const isAdmin = hasPermission(user, 'manage_helpdesk');

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/tickets`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      setTickets(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setErrorMsg('Failed to fetch tickets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const handleCreateTicket = async (e) => {
    e.preventDefault();
    if (!subject || !description) {
      setErrorMsg('Please enter a subject and description.');
      return;
    }
    try {
      setSubmitting(true);
      const res = await fetch(`${API_BASE}/api/tickets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ subject, description, category })
      });
      
      if (!res.ok) throw new Error('Failed to create ticket');
      
      setSuccessMsg('🎉 Ticket submitted successfully!');
      setShowNewForm(false);
      setSubject('');
      setDescription('');
      fetchTickets();
      
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const updateTicketStatus = async (id, status) => {
    try {
      const res = await fetch(`${API_BASE}/api/tickets/${id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ status })
      });
      
      if (!res.ok) throw new Error('Failed to update ticket');
      fetchTickets();
      setSuccessMsg(`Ticket marked as ${status}`);
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  // Metrics math
  const totalTickets = tickets.length;
  const openCount = tickets.filter(t => t.status === 'Open').length;
  const inProgressCount = tickets.filter(t => t.status === 'InProgress').length;
  const resolvedCount = tickets.filter(t => t.status === 'Resolved').length;

  // Filtered tickets
  const filteredTickets = tickets.filter(t => {
    const matchesSearch = 
      (t.subject || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.category || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.user?.displayName || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Animation Variants
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    show: { 
      opacity: 1, 
      y: 0,
      transition: { type: 'spring', stiffness: 260, damping: 20 }
    }
  };

  const modalVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.95 }
  };

  if (loading) return (
    <div className="w-full min-h-full flex flex-col gap-3.5 sm:gap-4 p-3 sm:p-5 md:p-6">
      <div className="animate-pulse space-y-2">
        <div className="h-6 w-44 bg-[#EAE7E0] rounded-lg" />
        <div className="h-3.5 w-64 bg-[#F4F1EA] rounded" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map(i => <div key={i} className="h-20 bg-[#FAF8F5] border border-[#EAE7E0] rounded-2xl animate-pulse" />)}
      </div>
      <div className="space-y-3 flex-1">
        <div className="double-bezel-outer bg-[#F4F1EA] p-1 rounded-2xl"><div className="double-bezel-inner bg-white p-4 rounded-xl"><ListSkeleton /></div></div>
        <div className="double-bezel-outer bg-[#F4F1EA] p-1 rounded-2xl"><div className="double-bezel-inner bg-white p-4 rounded-xl"><ListSkeleton /></div></div>
      </div>
    </div>
  );

  return (
    <div className="w-full min-h-full flex flex-col gap-3.5 sm:gap-4 p-3 sm:p-5 md:p-6">
      
      {/* ── TOP EXECUTIVE HEADER ── */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
        className="flex flex-col min-[600px]:flex-row min-[600px]:items-center justify-between gap-2.5 pb-3 border-b border-[#EAE7E0] w-full"
      >
        <div>
          <h1 className="font-serif font-bold text-lg sm:text-2xl md:text-3xl text-[#1F2B4D] tracking-tight leading-tight flex items-center gap-2.5">
            <div className="p-1.5 bg-white rounded-xl shadow-2xs border border-[#EAE7E0]">
              <LifeBuoy className="text-[#1F2B4D] w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <span>HR Helpdesk & Support</span>
          </h1>
          <p className="text-[#6B655C] mt-0.5 text-xs sm:text-sm font-medium">
            Submit, track, and resolve internal requests, payroll questions, and IT issues.
          </p>
        </div>
        
        {/* Sweep Animation Button */}
        {!isAdmin && (
          <button
            type="button"
            onClick={() => setShowNewForm(true)}
            className="relative overflow-hidden group inline-flex items-center justify-center gap-1.5 bg-white border border-[#EAE7E0] text-[#1F2B4D] px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs font-display font-bold uppercase tracking-wider shadow-2xs transition-all duration-300 hover:border-[#1F2B4D] active:scale-95 whitespace-nowrap shrink-0 w-full min-[600px]:w-auto"
          >
            {/* Sweep Background */}
            <span className="absolute inset-0 bg-[#1F2B4D] translate-y-[100%] group-hover:translate-y-0 transition-transform duration-500 cubic-bezier(0.34, 1.56, 0.64, 1) z-0" />
            
            <Plus size={15} className="relative z-10 text-[#1F2B4D] group-hover:text-white transition-colors duration-300 shrink-0" />
            <span className="relative z-10 group-hover:text-white transition-colors duration-300">New Request</span>
          </button>
        )}
      </motion.div>

      {errorMsg && <Alert type="error" message={errorMsg} />}
      {successMsg && <Alert type="success" message={successMsg} />}

      {/* ── TOP 4 KPI SUMMARY CARDS (FULL VIEWPORT FULFILLMENT) ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5 w-full">
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-[#EAE7E0] shadow-2xs flex flex-col justify-between">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[9.5px] sm:text-[10.5px] font-display font-bold uppercase tracking-wider text-[#6B655C]">Total Tickets</span>
            <div className="p-1.5 bg-[#FAF8F5] rounded-xl border border-[#EAE7E0] text-[#1F2B4D]">
              <MessageSquare size={16} />
            </div>
          </div>
          <span className="text-xl sm:text-2xl font-bold text-[#1F2B4D] tracking-tight">{totalTickets}</span>
        </div>

        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-[#EAE7E0] shadow-2xs flex flex-col justify-between">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[9.5px] sm:text-[10.5px] font-display font-bold uppercase tracking-wider text-[#6B655C]">Open Issues</span>
            <div className="p-1.5 bg-amber-50 rounded-xl border border-amber-200 text-amber-600">
              <AlertCircle size={16} />
            </div>
          </div>
          <span className="text-xl sm:text-2xl font-bold text-[#1F2B4D] tracking-tight">{openCount}</span>
        </div>

        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-[#EAE7E0] shadow-2xs flex flex-col justify-between">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[9.5px] sm:text-[10.5px] font-display font-bold uppercase tracking-wider text-[#6B655C]">In Progress</span>
            <div className="p-1.5 bg-indigo-50 rounded-xl border border-indigo-200 text-indigo-600">
              <Clock size={16} />
            </div>
          </div>
          <span className="text-xl sm:text-2xl font-bold text-[#1F2B4D] tracking-tight">{inProgressCount}</span>
        </div>

        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-[#EAE7E0] shadow-2xs flex flex-col justify-between">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[9.5px] sm:text-[10.5px] font-display font-bold uppercase tracking-wider text-[#6B655C]">Resolved Today</span>
            <div className="p-1.5 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-600">
              <CheckCircle size={16} />
            </div>
          </div>
          <span className="text-xl sm:text-2xl font-bold text-[#1F2B4D] tracking-tight">{resolvedCount}</span>
        </div>
      </div>

      {/* ── SEARCH & STATUS FILTER BAR ── */}
      <div className="bg-white p-2.5 sm:p-3 rounded-2xl border border-[#EAE7E0] shadow-2xs flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-2 w-full">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#6B655C]" />
          <input 
            type="text"
            placeholder="Search tickets by subject, category, or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-[#FAF8F5] border border-[#EAE7E0] rounded-xl text-xs text-[#1F2B4D] font-medium focus:ring-2 focus:ring-[#1F2B4D]"
          />
        </div>

        <div className="grid grid-cols-4 gap-0.5 sm:gap-1 bg-[#FAF8F5] p-1 rounded-xl border border-[#EAE7E0] w-full sm:w-auto">
          {['ALL', 'Open', 'InProgress', 'Resolved'].map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setStatusFilter(status)}
              className={`px-1 sm:px-2.5 py-1 rounded-lg text-[8.5px] min-[360px]:text-[9.5px] sm:text-[10px] font-display font-bold uppercase tracking-wider transition-all text-center truncate ${
                statusFilter === status ? 'bg-white text-[#1F2B4D] shadow-2xs border border-[#EAE7E0]' : 'text-[#6B655C] hover:text-[#1F2B4D]'
              }`}
            >
              {status === 'ALL' ? 'All' : status === 'InProgress' ? 'In Progress' : status}
            </button>
          ))}
        </div>
      </div>

      {/* ── MAIN TICKET CARDS CONTAINER (FLEX-1 FULL SCREEN FULFILLMENT) ── */}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="space-y-3 flex-1 flex flex-col w-full"
      >
        {filteredTickets.map((ticket) => (
          <motion.div 
            key={ticket.id} 
            variants={itemVariants}
            className="double-bezel-outer bg-[#F4F1EA] p-1 rounded-2xl group hover:border-[#1F2B4D]/20 transition-all"
          >
            <div className="double-bezel-inner bg-white rounded-xl p-3.5 sm:p-5 flex flex-col md:flex-row gap-3.5 justify-between items-start md:items-center w-full">
              
              <div className="flex gap-3 items-start w-full min-w-0">
                {/* Status Icon */}
                <div className="shrink-0 mt-0.5">
                  {ticket.status === 'Open' ? (
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-200 shadow-2xs">
                      <AlertCircle size={18} />
                    </div>
                  ) : ticket.status === 'InProgress' ? (
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center border border-indigo-200 shadow-2xs">
                      <Clock size={18} />
                    </div>
                  ) : (
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200 shadow-2xs">
                      <CheckCircle size={18} />
                    </div>
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h3 className="font-serif font-bold text-sm sm:text-base text-[#1F2B4D] tracking-tight leading-snug">{ticket.subject}</h3>
                    <span className="text-[9px] sm:text-[10px] font-display font-bold px-2 py-0.5 rounded-full border border-[#EAE7E0] bg-[#FAF8F5] text-[#6B655C] uppercase tracking-wider shrink-0">{ticket.category}</span>
                  </div>
                  
                  <p className="text-[#6B655C] text-xs mb-2 line-clamp-2 font-medium leading-relaxed">{ticket.description}</p>
                  
                  <div className="flex flex-wrap items-center gap-3 text-[9.5px] sm:text-[10.5px] font-display font-bold text-[#6B655C] uppercase tracking-wider">
                    {isAdmin && ticket.user && (
                      <span className="text-[#1F2B4D] flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#1F2B4D]" />
                        By: {ticket.user.displayName}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#CBD5E1]" />
                      {new Date(ticket.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Admin Actions */}
              {isAdmin && ticket.status !== 'Resolved' && (
                <div className="flex flex-row md:flex-col gap-2 shrink-0 w-full md:w-auto pt-3 md:pt-0 border-t border-[#EAE7E0] md:border-0 justify-end">
                   {ticket.status === 'Open' && (
                     <button 
                       type="button"
                       onClick={() => updateTicketStatus(ticket.id, 'InProgress')} 
                       className="flex-1 md:flex-none text-[10px] sm:text-[11px] font-display font-bold text-[#1F2B4D] bg-[#F0F3F9] hover:bg-[#E2E8F0] px-3 py-1.5 rounded-xl transition-colors border border-[#CBD5E1] uppercase tracking-wider whitespace-nowrap shadow-2xs"
                     >
                       Mark In Progress
                     </button>
                   )}
                   <button 
                     type="button"
                     onClick={() => updateTicketStatus(ticket.id, 'Resolved')} 
                     className="flex-1 md:flex-none text-[10px] sm:text-[11px] font-display font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-xl transition-colors border border-emerald-200 uppercase tracking-wider whitespace-nowrap shadow-2xs"
                   >
                     Resolve Ticket
                   </button>
                </div>
              )}
            </div>
          </motion.div>
        ))}

        {filteredTickets.length === 0 && (
          <motion.div 
            variants={itemVariants}
            className="flex-1 min-h-[320px] flex flex-col items-center justify-center text-center bg-white rounded-2xl border border-dashed border-[#EAE7E0] shadow-2xs p-6 w-full"
          >
            <div className="w-14 h-14 rounded-2xl bg-[#FAF8F5] border border-[#EAE7E0] flex items-center justify-center text-[#1F2B4D] mb-3 shadow-2xs">
              <MessageSquare size={26} />
            </div>
            <h3 className="text-base sm:text-lg font-serif font-bold text-[#1F2B4D] tracking-tight">No Tickets Found</h3>
            <p className="text-[#6B655C] mt-1 text-xs font-medium max-w-xs leading-relaxed">
              You have no active helpdesk tickets. Submit a new request if you need assistance from HR or IT.
            </p>
            {!isAdmin && (
              <button
                type="button"
                onClick={() => setShowNewForm(true)}
                className="mt-4 bg-[#1F2B4D] hover:bg-[#141C33] text-white font-display font-bold text-xs uppercase tracking-wider px-4 py-2 rounded-xl transition-all shadow-2xs inline-flex items-center gap-1.5"
              >
                <Plus size={14} className="shrink-0" />
                <span>Create Request</span>
              </button>
            )}
          </motion.div>
        )}
      </motion.div>

      {/* ── RESPONSIVE SUBMIT REQUEST MODAL ── */}
      <AnimatePresence>
        {showNewForm && (
          <div className="fixed inset-0 z-50 bg-[#1F2B4D]/30 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
            <motion.div 
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="bg-white rounded-[20px] max-w-md w-full p-4 sm:p-6 shadow-xl border border-[#EAE7E0] max-h-[92vh] overflow-y-auto relative"
            >
              <div className="flex items-center justify-between pb-3 border-b border-[#F4F1EA] mb-3">
                <h2 className="font-serif font-bold text-base sm:text-xl text-[#1F2B4D]">Submit a Request</h2>
                <button 
                  type="button"
                  onClick={() => setShowNewForm(false)}
                  className="p-1.5 text-[#6B655C] hover:text-[#1F2B4D] bg-[#FAF8F5] rounded-lg transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleCreateTicket} className="space-y-3">
                <div>
                  <label className="block text-[10px] font-display font-bold text-[#6B655C] mb-1 uppercase tracking-wider">Subject</label>
                  <input 
                    required 
                    type="text" 
                    value={subject} 
                    onChange={e => setSubject(e.target.value)} 
                    placeholder="e.g. Needs updated ID card or Payroll query" 
                    className="w-full px-3 py-2 bg-white border border-[#EAE7E0] text-[#1F2B4D] text-xs font-bold rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1F2B4D]" 
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-display font-bold text-[#6B655C] mb-1 uppercase tracking-wider">Category</label>
                  <select 
                    value={category} 
                    onChange={e => setCategory(e.target.value)} 
                    className="w-full px-3 py-2 bg-white border border-[#EAE7E0] text-[#1F2B4D] text-xs font-bold rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1F2B4D]"
                  >
                    <option value="HR">HR / General</option>
                    <option value="Payroll">Payroll & Benefits</option>
                    <option value="IT">IT Support</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-[10px] font-display font-bold text-[#6B655C] mb-1 uppercase tracking-wider">Description</label>
                  <textarea 
                    required 
                    value={description} 
                    onChange={e => setDescription(e.target.value)} 
                    rows={4} 
                    className="w-full px-3 py-2 bg-white border border-[#EAE7E0] text-[#1F2B4D] text-xs font-medium rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1F2B4D] resize-none" 
                    placeholder="Provide details about your request..."
                  />
                </div>
                
                <div className="pt-2 flex flex-col-reverse sm:flex-row gap-2 border-t border-[#F4F1EA]">
                  <button 
                    type="button" 
                    onClick={() => setShowNewForm(false)} 
                    className="w-full sm:w-auto flex-1 px-4 py-2 border border-[#EAE7E0] bg-white text-[#1F2B4D] text-xs font-display font-bold rounded-xl hover:bg-[#FAF8F5] transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    disabled={submitting}
                    className="w-full sm:w-auto flex-1 px-5 py-2 bg-[#1F2B4D] hover:bg-[#141C33] text-white text-xs font-display font-bold rounded-xl shadow-2xs transition-all flex items-center justify-center gap-1.5"
                  >
                    {submitting ? <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0" /> : null}
                    <span>{submitting ? 'Submitting...' : 'Submit Ticket'}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default Helpdesk;
