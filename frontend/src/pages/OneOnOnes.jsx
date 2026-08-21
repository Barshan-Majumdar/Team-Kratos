import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { Calendar, Plus, MessageSquare, CheckSquare, Clock, X, Check } from 'lucide-react';
import { CardSkeleton } from '../components/ui/Skeleton';
import { motion, AnimatePresence } from 'framer-motion';

const OneOnOnes = ({ user }) => {
  const [meetings, setMeetings] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Form State
  const [employeeId, setEmployeeId] = useState('');
  const [date, setDate] = useState('');
  const [notes, setNotes] = useState('');

  const isManager = user?.roleDefinition?.level <= 2;

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      
      const requests = [
        axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/one-on-ones`, { headers: { Authorization: `Bearer ${token}` } })
      ];

      if (isManager) {
        requests.push(axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/users`, { headers: { Authorization: `Bearer ${token}` } }));
      }

      const results = await Promise.all(requests);
      setMeetings(results[0].data);
      if (isManager && results[1]) {
        setEmployees(results[1].data.filter(emp => emp.id !== (user?._id || user?.id)));
      }
    } catch (error) {
      toast.error('Failed to load meetings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/one-on-ones`, {
        employeeId, date, notes, topic, agenda, meetingLink, talkingPoints: [], actionItems: []
      }, { headers: { Authorization: `Bearer ${token}` } });
      
      setMeetings(prev => [response.data, ...prev].sort((a, b) => new Date(b.date) - new Date(a.date)));
      toast.success('1:1 Meeting scheduled');
      setShowModal(false);
      setEmployeeId('');
      setDate('');
      setNotes('');
      setTopic('');
      setAgenda('');
      setMeetingLink('');
    } catch (err) {
      toast.error('Failed to schedule meeting');
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
    <div className="p-4 md:p-8 lg:p-12 max-w-7xl mx-auto space-y-8 bg-[#FAF9F6] min-h-screen">
      <div className="animate-pulse space-y-2">
        <div className="h-8 w-48 bg-[#EAE7E0] rounded-lg" />
        <div className="h-4 w-72 bg-[#F4F1EA] rounded" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="double-bezel-outer bg-[#F4F1EA] p-1.5"><div className="double-bezel-inner bg-white p-6"><CardSkeleton /></div></div>
        <div className="double-bezel-outer bg-[#F4F1EA] p-1.5"><div className="double-bezel-inner bg-white p-6"><CardSkeleton /></div></div>
      </div>
    </div>
  );

  return (
    <div className="p-4 md:p-8 lg:p-12 max-w-7xl mx-auto space-y-8 bg-[#FAF9F6] min-h-screen">
      
      {/* Header Section */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-[28px] font-bold text-[#1D1B16] tracking-tight">1:1 Meetings</h1>
          <p className="text-[#6B655C] mt-1 text-sm font-medium">Continuous syncs, feedback, and career growth.</p>
        </div>
        
        {/* Sweep Animation Button */}
        {isManager && (
          <button
            onClick={() => setShowModal(true)}
            className="relative overflow-hidden group flex items-center gap-2 bg-white border border-[#EAE7E0] text-[#1D1B16] px-5 py-2.5 rounded-xl font-bold shadow-xs transition-all duration-300 hover:border-[#1F2B4D] active:scale-95 whitespace-nowrap"
          >
            {/* Sweep Background */}
            <span className="absolute inset-0 bg-[#1F2B4D] translate-y-[100%] group-hover:translate-y-0 transition-transform duration-500 cubic-bezier(0.34, 1.56, 0.64, 1) z-0" />
            
            <Plus size={18} className="relative z-10 text-[#1F2B4D] group-hover:text-white transition-colors duration-300" />
            <span className="relative z-10 group-hover:text-white transition-colors duration-300">Schedule 1:1</span>
          </button>
        )}
      </motion.div>

      {/* Grid Container (Staggered Animation) */}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 lg:grid-cols-2 gap-6"
      >
        {meetings.map((meeting) => {
          const targetUser = isManager ? meeting.employee : meeting.manager;
          return (
          <motion.div 
            key={meeting.id} 
            variants={itemVariants}
            className="double-bezel-outer bg-[#F4F1EA] p-1.5 group hover:shadow-[0_6px_24px_-4px_rgba(29,27,22,0.08),_0_12px_32px_-6px_rgba(29,27,22,0.10)] hover:-translate-y-[2px] transition-all duration-500 cubic-bezier(0.34, 1.56, 0.64, 1)"
          >
            <div className="double-bezel-inner bg-white h-full p-6 flex flex-col">
              <div className="flex justify-between items-start mb-5">
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-full bg-[#1F2B4D] text-white flex items-center justify-center font-bold text-lg shadow-sm border border-[#141C33]/20">
                    {targetUser?.displayName?.charAt(0) || '?'}
                  </div>
                  <div>
                    <h3 className="font-bold text-[#1D1B16] text-[17px] tracking-tight group-hover:text-[#1F2B4D] transition-colors">{meeting.topic || `1:1 with ${targetUser?.displayName || 'Unknown'}`}</h3>
                    <p className="text-[13px] text-[#6B655C] font-medium flex items-center gap-1.5 mt-0.5">
                      <Calendar size={14} className="text-[#9A948A]" /> {new Date(meeting.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} at {new Date(meeting.date).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    {meeting.meetingLink && (
                      <a href={meeting.meetingLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 mt-1.5 text-[12px] font-bold text-blue-600 hover:text-blue-800 transition-colors">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                        Join Meeting
                      </a>
                    )}
                  </div>
                </div>
                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider rounded-full shadow-xs ${
                  meeting.status === 'Completed' ? 'bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0]' : 'bg-[#FDF8F3] text-[#8C5722] border border-[#EEDCCE]'
                }`}>
                  {meeting.status === 'Completed' && <div className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />}
                  {meeting.status === 'Scheduled' && <div className="w-1.5 h-1.5 rounded-full bg-[#B5793A]" />}
                  {meeting.status}
                </span>
              </div>

              {meeting.notes && (
                <div className="mb-5 p-4 bg-[#FAF9F6] rounded-[14px] border border-[#EAE7E0] relative overflow-hidden">
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#1F2B4D]/10 rounded-l-[14px]" />
                  <p className="text-[11px] font-bold text-[#9A948A] uppercase tracking-wider mb-2">Notes</p>
                  <p className="text-[13.5px] text-[#1D1B16] leading-relaxed italic">"{meeting.notes}"</p>
                </div>
              )}

              {meeting.agenda && (
                <div className="mb-5 p-4 bg-white rounded-[14px] border border-[#EAE7E0] shadow-2xs relative overflow-hidden">
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500/20 rounded-l-[14px]" />
                  <p className="text-[11px] font-bold text-[#9A948A] uppercase tracking-wider mb-2">Agenda</p>
                  <p className="text-[13.5px] text-[#1D1B16] leading-relaxed whitespace-pre-line">{meeting.agenda}</p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-auto pt-5 border-t border-[#EAE7E0]">
                <div>
                  <p className="text-[11px] font-bold text-[#9A948A] uppercase tracking-wider flex items-center gap-1.5 mb-3">
                    <MessageSquare size={14} className="text-[#6B655C]" /> Talking Points
                  </p>
                  {meeting.talkingPoints && meeting.talkingPoints.length > 0 ? (
                    <ul className="space-y-2">
                      {meeting.talkingPoints.map((pt, i) => (
                        <li key={i} className="flex items-start gap-2 text-[13.5px] text-[#6B655C] font-medium leading-tight">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#1F2B4D]/30 mt-1.5 shrink-0" />
                          {pt.text || pt}
                        </li>
                      ))}
                    </ul>
                  ) : <p className="text-[13px] text-[#9A948A] italic">None logged</p>}
                </div>
                <div>
                  <p className="text-[11px] font-bold text-[#9A948A] uppercase tracking-wider flex items-center gap-1.5 mb-3">
                    <CheckSquare size={14} className="text-[#6B655C]" /> Action Items
                  </p>
                  {meeting.actionItems && meeting.actionItems.length > 0 ? (
                    <ul className="space-y-2">
                      {meeting.actionItems.map((pt, i) => (
                        <li key={i} className="flex items-start gap-2 text-[13.5px] text-[#6B655C] font-medium leading-tight">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#B5793A]/50 mt-1.5 shrink-0" />
                          {pt.text || pt}
                        </li>
                      ))}
                    </ul>
                  ) : <p className="text-[13px] text-[#9A948A] italic">None logged</p>}
                </div>
              </div>
            </div>
          </motion.div>
        )})}

        {meetings.length === 0 && (
          <motion.div 
            variants={itemVariants}
            className="col-span-full py-20 flex flex-col items-center justify-center text-center bg-white rounded-[24px] border border-dashed border-[#EAE7E0] shadow-sm"
          >
            <div className="w-16 h-16 rounded-full bg-[#FAF9F6] border border-[#EAE7E0] flex items-center justify-center text-[#9A948A] mb-5">
              <Clock size={28} />
            </div>
            <h3 className="text-[19px] font-bold text-[#1D1B16] tracking-tight">No 1:1 meetings scheduled</h3>
            <p className="text-[#6B655C] mt-1.5 font-medium max-w-sm">Regular syncs will appear here once scheduled. Build a strong foundation with your team.</p>
          </motion.div>
        )}
      </motion.div>

      {/* Premium Schedule Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-[#0F172A]/40 backdrop-blur-md"
              onClick={() => setShowModal(false)}
            />
            
            {/* Modal Surface */}
            <motion.div 
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="relative w-full max-w-3xl bg-white rounded-[24px] shadow-2xl border border-[#EAE7E0] overflow-hidden"
            >
              <div className="flex items-center justify-between p-6 border-b border-[#F4F1EA] bg-[#FAF9F6]">
                <h2 className="text-xl font-bold text-[#1D1B16] tracking-tight">Schedule 1:1</h2>
                <button 
                  onClick={() => setShowModal(false)}
                  className="p-1.5 text-[#9A948A] hover:text-[#1D1B16] hover:bg-[#EAE7E0] rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleCreate} className="p-6 space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-[13px] font-bold text-[#6B655C] mb-1.5 uppercase tracking-wide">Employee</label>
                    <select 
                      required 
                      value={employeeId} 
                      onChange={(e) => setEmployeeId(e.target.value)} 
                      className="w-full px-4 py-3 bg-[#FAF9F6] border border-[#EAE7E0] text-[#1D1B16] font-semibold rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1F2B4D] focus:border-transparent transition-all appearance-none"
                    >
                      <option value="">-- Select Employee --</option>
                      {employees.map(emp => (
                        <option key={emp.id} value={emp.id}>{emp.displayName}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-[13px] font-bold text-[#6B655C] mb-1.5 uppercase tracking-wide">Date & Time</label>
                    <input 
                      type="datetime-local" 
                      required 
                      value={date} 
                      onChange={(e) => setDate(e.target.value)} 
                      className="w-full px-4 py-3 bg-[#FAF9F6] border border-[#EAE7E0] text-[#1D1B16] font-semibold rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1F2B4D] focus:border-transparent transition-all" 
                    />
                  </div>
                  
                  <div>
                    <label className="block text-[13px] font-bold text-[#6B655C] mb-1.5 uppercase tracking-wide">Topic</label>
                    <input 
                      type="text" 
                      required 
                      value={topic} 
                      onChange={(e) => setTopic(e.target.value)} 
                      className="w-full px-4 py-3 bg-[#FAF9F6] border border-[#EAE7E0] text-[#1D1B16] font-semibold rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1F2B4D] focus:border-transparent transition-all" 
                      placeholder="E.g. Q3 Performance Review"
                    />
                  </div>

                  <div>
                    <label className="block text-[13px] font-bold text-[#6B655C] mb-1.5 uppercase tracking-wide">Meeting Link (Google Meet / Zoom)</label>
                    <input 
                      type="url" 
                      required 
                      value={meetingLink} 
                      onChange={(e) => setMeetingLink(e.target.value)} 
                      className="w-full px-4 py-3 bg-[#FAF9F6] border border-[#EAE7E0] text-[#1D1B16] font-semibold rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1F2B4D] focus:border-transparent transition-all" 
                      placeholder="https://meet.google.com/..."
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-[13px] font-bold text-[#6B655C] mb-1.5 uppercase tracking-wide">Agenda</label>
                    <textarea 
                      rows="3" 
                      required 
                      value={agenda} 
                      onChange={(e) => setAgenda(e.target.value)} 
                      className="w-full h-[88px] px-4 py-3 bg-[#FAF9F6] border border-[#EAE7E0] text-[#1D1B16] font-medium rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1F2B4D] focus:border-transparent transition-all resize-none" 
                      placeholder="1. Review goals&#10;2. Discuss blockers"
                    />
                  </div>

                  <div>
                    <label className="block text-[13px] font-bold text-[#6B655C] mb-1.5 uppercase tracking-wide">Context / Notes (Optional)</label>
                    <textarea 
                      rows="3" 
                      value={notes} 
                      onChange={(e) => setNotes(e.target.value)} 
                      className="w-full h-[88px] px-4 py-3 bg-[#FAF9F6] border border-[#EAE7E0] text-[#1D1B16] font-medium rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1F2B4D] focus:border-transparent transition-all resize-none" 
                      placeholder="E.g. Monthly performance sync..."
                    />
                  </div>
                </div>
                
                <div className="pt-2 flex justify-end gap-3 border-t border-[#F4F1EA] mt-6">
                  <button 
                    type="button" 
                    onClick={() => setShowModal(false)} 
                    className="px-6 py-2.5 border border-[#EAE7E0] bg-white text-[#1D1B16] font-bold rounded-xl hover:bg-[#FAF9F6] transition-colors active:scale-95"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="px-6 py-2.5 bg-[#1F2B4D] text-white font-bold rounded-xl shadow-md hover:bg-[#141C33] hover:shadow-lg transition-all active:scale-95"
                  >
                    Schedule Meeting
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

export default OneOnOnes;
