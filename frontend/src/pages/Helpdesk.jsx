import React, { useState, useEffect } from 'react';
import { hasPermission } from '../lib/permissions';
import { LifeBuoy, Plus, MessageSquare, AlertCircle, Clock, CheckCircle, X } from 'lucide-react';
import { API_BASE } from '../lib/api';
import Alert from '../components/ui/Alert';
import { ListSkeleton } from '../components/ui/Skeleton';
import { motion, AnimatePresence } from 'framer-motion';

const Helpdesk = ({ user }) => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  
  // New Ticket Form State
  const [showNewForm, setShowNewForm] = useState(false);
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('HR');

  const isAdmin = hasPermission(user, 'manage_helpdesk');

  const fetchTickets = async () => {
    try {
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
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/tickets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ subject, description, category })
      });
      
      if (!res.ok) throw new Error('Failed to create ticket');
      
      setSuccessMsg('Ticket submitted successfully!');
      setShowNewForm(false);
      setSubject('');
      setDescription('');
      fetchTickets();
      
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
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

  // Animation Variants
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { 
      opacity: 1, 
      y: 0,
      transition: { type: 'spring', stiffness: 260, damping: 20 }
    }
  };

  const modalVariants = {
    hidden: { opacity: 0, scale: 0.95, y: 20 },
    visible: { 
      opacity: 1, 
      scale: 1, 
      y: 0,
      transition: { type: 'spring', stiffness: 260, damping: 25 }
    },
    exit: { 
      opacity: 0, 
      scale: 0.95, 
      y: 10,
      transition: { duration: 0.2, ease: "easeInOut" }
    }
  };

  if (loading) return (
    <div className="p-4 md:p-8 lg:p-12 max-w-5xl mx-auto space-y-8 bg-[#FAF9F6] min-h-screen">
      <div className="animate-pulse space-y-2">
        <div className="h-8 w-48 bg-[#EAE7E0] rounded-lg" />
        <div className="h-4 w-72 bg-[#F4F1EA] rounded" />
      </div>
      <div className="space-y-4 mt-8">
        <div className="double-bezel-outer bg-[#F4F1EA] p-1.5"><div className="double-bezel-inner bg-white p-6"><ListSkeleton /></div></div>
        <div className="double-bezel-outer bg-[#F4F1EA] p-1.5"><div className="double-bezel-inner bg-white p-6"><ListSkeleton /></div></div>
      </div>
    </div>
  );

  return (
    <div className="p-4 md:p-8 lg:p-12 max-w-5xl mx-auto space-y-8 bg-[#FAF9F6] min-h-screen">
      
      {/* Header Section */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-[28px] font-bold text-[#1D1B16] tracking-tight flex items-center gap-3">
            <LifeBuoy className="text-[#1F2B4D]" size={28} /> HR Helpdesk
          </h1>
          <p className="text-[#6B655C] mt-1 text-sm font-medium">Submit and track your internal requests and issues.</p>
        </div>
        
        {/* Sweep Animation Button */}
        {!isAdmin && (
          <button
            onClick={() => setShowNewForm(true)}
            className="relative overflow-hidden group flex items-center gap-2 bg-white border border-[#EAE7E0] text-[#1D1B16] px-5 py-2.5 rounded-xl font-bold shadow-xs transition-all duration-300 hover:border-[#1F2B4D] active:scale-95 whitespace-nowrap"
          >
            {/* Sweep Background */}
            <span className="absolute inset-0 bg-[#1F2B4D] translate-y-[100%] group-hover:translate-y-0 transition-transform duration-500 cubic-bezier(0.34, 1.56, 0.64, 1) z-0" />
            
            <Plus size={18} className="relative z-10 text-[#1F2B4D] group-hover:text-white transition-colors duration-300" />
            <span className="relative z-10 group-hover:text-white transition-colors duration-300">New Request</span>
          </button>
        )}
      </motion.div>

      {errorMsg && <Alert type="error" message={errorMsg} />}
      {successMsg && <Alert type="success" message={successMsg} />}

      {/* Grid Container (Staggered Animation) */}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="space-y-4"
      >
        {tickets.map((ticket) => (
          <motion.div 
            key={ticket.id} 
            variants={itemVariants}
            className="double-bezel-outer bg-[#F4F1EA] p-1.5 group hover:shadow-[0_6px_24px_-4px_rgba(29,27,22,0.08),_0_12px_32px_-6px_rgba(29,27,22,0.10)] hover:-translate-y-[2px] transition-all duration-500 cubic-bezier(0.34, 1.56, 0.64, 1)"
          >
            <div className="double-bezel-inner bg-white h-full p-5 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
              
              <div className="flex gap-4 items-start w-full">
                {/* Status Icon */}
                <div className="mt-1 shrink-0">
                  {ticket.status === 'Open' ? (
                    <div className="w-10 h-10 rounded-full bg-[#FDF8F3] text-[#8C5722] flex items-center justify-center ring-1 ring-[#EEDCCE]">
                      <AlertCircle size={20} />
                    </div>
                  ) : ticket.status === 'InProgress' ? (
                    <div className="w-10 h-10 rounded-full bg-[#F0F3F9] text-[#1F2B4D] flex items-center justify-center ring-1 ring-[#EAE7E0]">
                      <Clock size={20} />
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-[#ECFDF5] text-[#065F46] flex items-center justify-center ring-1 ring-[#A7F3D0]">
                      <CheckCircle size={20} />
                    </div>
                  )}
                </div>
                
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2.5 mb-1.5">
                    <h3 className="font-bold text-[#1D1B16] text-[17px] tracking-tight group-hover:text-[#1F2B4D] transition-colors">{ticket.subject}</h3>
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-[#EAE7E0] bg-[#FAF9F6] text-[#6B655C] uppercase tracking-wider">{ticket.category}</span>
                  </div>
                  
                  <p className="text-[#6B655C] text-[13.5px] mb-3 line-clamp-2 font-medium">{ticket.description}</p>
                  
                  <div className="flex items-center gap-4 text-[11px] font-bold text-[#9A948A] uppercase tracking-wider">
                    {isAdmin && ticket.user && (
                      <span className="text-[#6B655C] flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#1F2B4D]/30" />
                        By: {ticket.user.displayName}
                      </span>
                    )}
                    <span className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#EAE7E0]" />
                      {new Date(ticket.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Admin Actions */}
              {isAdmin && ticket.status !== 'Resolved' && (
                <div className="flex flex-row md:flex-col gap-2 shrink-0 self-end md:self-auto w-full md:w-auto mt-4 md:mt-0 pt-4 md:pt-0 border-t border-[#EAE7E0] md:border-0">
                   {ticket.status === 'Open' && (
                     <button 
                       onClick={() => updateTicketStatus(ticket.id, 'InProgress')} 
                       className="flex-1 md:flex-none text-[11px] font-bold text-[#1F2B4D] bg-[#F0F3F9] hover:bg-[#E2E8F0] px-3.5 py-2 rounded-[10px] transition-colors text-center border border-[#EAE7E0] uppercase tracking-wider active:scale-95"
                     >
                       Mark In Progress
                     </button>
                   )}
                   <button 
                     onClick={() => updateTicketStatus(ticket.id, 'Resolved')} 
                     className="flex-1 md:flex-none text-[11px] font-bold text-[#065F46] bg-[#ECFDF5] hover:bg-[#D1FAE5] px-3.5 py-2 rounded-[10px] transition-colors text-center border border-[#A7F3D0] uppercase tracking-wider active:scale-95"
                   >
                     Resolve
                   </button>
                </div>
              )}
            </div>
          </motion.div>
        ))}

        {tickets.length === 0 && (
          <motion.div 
            variants={itemVariants}
            className="col-span-full py-20 flex flex-col items-center justify-center text-center bg-white rounded-[24px] border border-dashed border-[#EAE7E0] shadow-sm"
          >
            <div className="w-16 h-16 rounded-full bg-[#FAF9F6] border border-[#EAE7E0] flex items-center justify-center text-[#9A948A] mb-5">
              <MessageSquare size={28} />
            </div>
            <h3 className="text-[19px] font-bold text-[#1D1B16] tracking-tight">No Tickets Found</h3>
            <p className="text-[#6B655C] mt-1.5 font-medium max-w-sm">You have no open requests right now. Create a new request if you need assistance.</p>
          </motion.div>
        )}
      </motion.div>

      {/* Premium Modal */}
      <AnimatePresence>
        {showNewForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-[#0F172A]/40 backdrop-blur-md"
              onClick={() => setShowNewForm(false)}
            />
            
            {/* Modal Surface */}
            <motion.div 
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="relative w-full max-w-lg bg-white rounded-[24px] shadow-2xl border border-[#EAE7E0] overflow-hidden"
            >
              <div className="flex items-center justify-between p-6 border-b border-[#F4F1EA] bg-[#FAF9F6]">
                <h2 className="text-xl font-bold text-[#1D1B16] tracking-tight">Submit a Request</h2>
                <button 
                  onClick={() => setShowNewForm(false)}
                  className="p-1.5 text-[#9A948A] hover:text-[#1D1B16] hover:bg-[#EAE7E0] rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleCreateTicket} className="p-6 space-y-5 bg-white">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-[13px] font-bold text-[#6B655C] mb-1.5 uppercase tracking-wide">Subject</label>
                    <input 
                      required 
                      type="text" 
                      value={subject} 
                      onChange={e => setSubject(e.target.value)} 
                      placeholder="e.g. Needs updated ID card" 
                      className="w-full px-4 py-3 bg-[#FAF9F6] border border-[#EAE7E0] text-[#1D1B16] font-semibold rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1F2B4D] focus:border-transparent transition-all placeholder:text-[#9A948A] placeholder:font-medium" 
                    />
                  </div>
                  <div>
                    <label className="block text-[13px] font-bold text-[#6B655C] mb-1.5 uppercase tracking-wide">Category</label>
                    <select 
                      value={category} 
                      onChange={e => setCategory(e.target.value)} 
                      className="w-full px-4 py-3 bg-[#FAF9F6] border border-[#EAE7E0] text-[#1D1B16] font-semibold rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1F2B4D] focus:border-transparent transition-all appearance-none"
                    >
                      <option value="HR">HR / General</option>
                      <option value="Payroll">Payroll & Benefits</option>
                      <option value="IT">IT Support</option>
                    </select>
                  </div>
                </div>
                
                <div>
                  <label className="block text-[13px] font-bold text-[#6B655C] mb-1.5 uppercase tracking-wide">Description</label>
                  <textarea 
                    required 
                    value={description} 
                    onChange={e => setDescription(e.target.value)} 
                    rows={4} 
                    className="w-full px-4 py-3 bg-[#FAF9F6] border border-[#EAE7E0] text-[#1D1B16] font-medium rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1F2B4D] focus:border-transparent transition-all resize-none placeholder:text-[#9A948A]" 
                    placeholder="Provide details about your request..."
                  />
                </div>
                
                <div className="pt-2 flex gap-3">
                  <button 
                    type="button" 
                    onClick={() => setShowNewForm(false)} 
                    className="flex-1 px-4 py-3 border border-[#EAE7E0] bg-white text-[#1D1B16] font-bold rounded-xl hover:bg-[#FAF9F6] transition-colors active:scale-95"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    disabled={loading}
                    className="flex-1 px-4 py-3 bg-[#1F2B4D] text-white font-bold rounded-xl shadow-md hover:bg-[#141C33] hover:shadow-lg transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Submit Ticket
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
