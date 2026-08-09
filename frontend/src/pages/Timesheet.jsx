import React, { useState, useEffect } from 'react';
import { hasPermission } from '../lib/permissions';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { Clock, Check, Calendar, X } from 'lucide-react';
import { TableSkeleton } from '../components/ui/Skeleton';
import { motion, AnimatePresence } from 'framer-motion';

const Timesheet = ({ user }) => {
  const [timesheets, setTimesheets] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [projectId, setProjectId] = useState('');
  const [date, setDate] = useState('');
  const [hours, setHours] = useState('');
  const [description, setDescription] = useState('');
  const [isBillable, setIsBillable] = useState(true);

  const isAdmin = hasPermission(user, 'view_all_employees');

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const [tsRes, projRes] = await Promise.all([
        axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/projects/timesheets`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/projects`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      setTimesheets(tsRes.data);
      setProjects(projRes.data);
    } catch (err) {
      toast.error('Failed to load timesheet data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleLogHours = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/projects/timesheets`, {
        projectId, date, hours, description, isBillable
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Hours logged successfully');
      setShowAddModal(false);
      setHours('');
      setDescription('');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to log hours');
    }
  };

  const handleApprove = async (id) => {
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/projects/timesheets/${id}/status`, {
        status: 'Approved'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Timesheet approved');
      fetchData();
    } catch (err) {
      toast.error('Failed to approve timesheet');
    }
  };

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
        <div className="h-8 w-40 bg-[#EAE7E0] rounded-lg" />
        <div className="h-4 w-80 bg-[#F4F1EA] rounded" />
      </div>
      <div className="double-bezel-outer bg-[#F4F1EA] p-1.5">
        <div className="double-bezel-inner bg-white min-h-[400px] p-6">
          <TableSkeleton rows={5} cols={5} />
        </div>
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
          <h1 className="text-[28px] font-bold text-[#1D1B16] tracking-tight">Timesheets</h1>
          <p className="text-[#6B655C] mt-1 text-sm font-medium">Log your hours against projects and track billability.</p>
        </div>
        
        {/* Sweep Animation Button */}
        <button
          onClick={() => setShowAddModal(true)}
          className="relative overflow-hidden group flex items-center gap-2 bg-white border border-[#EAE7E0] text-[#1D1B16] px-5 py-2.5 rounded-xl font-bold shadow-xs transition-all duration-300 hover:border-[#1F2B4D] active:scale-95 whitespace-nowrap"
        >
          {/* Sweep Background */}
          <span className="absolute inset-0 bg-[#1F2B4D] translate-y-[100%] group-hover:translate-y-0 transition-transform duration-500 cubic-bezier(0.34, 1.56, 0.64, 1) z-0" />
          
          <Clock size={18} className="relative z-10 text-[#1F2B4D] group-hover:text-white transition-colors duration-300" />
          <span className="relative z-10 group-hover:text-white transition-colors duration-300">Log Time</span>
        </button>
      </motion.div>

      {/* Main Table Container (Doppelrand Architecture) */}
      <motion.div 
        initial="hidden" 
        animate="show" 
        variants={containerVariants}
        className="double-bezel-outer bg-[#F4F1EA] p-1.5"
      >
        <div className="double-bezel-inner bg-white overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#FAF9F6] border-b border-[#EAE7E0]">
                  <th className="px-5 py-4 text-[11px] font-bold text-[#9A948A] uppercase tracking-wider">Date</th>
                  {isAdmin && <th className="px-5 py-4 text-[11px] font-bold text-[#9A948A] uppercase tracking-wider">Employee</th>}
                  <th className="px-5 py-4 text-[11px] font-bold text-[#9A948A] uppercase tracking-wider">Project</th>
                  <th className="px-5 py-4 text-[11px] font-bold text-[#9A948A] uppercase tracking-wider">Hours</th>
                  <th className="px-5 py-4 text-[11px] font-bold text-[#9A948A] uppercase tracking-wider">Type</th>
                  <th className="px-5 py-4 text-[11px] font-bold text-[#9A948A] uppercase tracking-wider">Status</th>
                  {isAdmin && <th className="px-5 py-4 text-[11px] font-bold text-[#9A948A] uppercase tracking-wider text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAE7E0]">
                <AnimatePresence>
                  {timesheets.map((entry) => (
                    <motion.tr 
                      key={entry.id} 
                      variants={itemVariants}
                      className="group transition-all duration-500 hover:bg-[#FAF9F6]"
                      style={{ transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)' }}
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2 text-sm font-semibold text-[#1D1B16]">
                          <Calendar size={14} className="text-[#9A948A] group-hover:text-[#1F2B4D] transition-colors" />
                          {new Date(entry.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </div>
                      </td>
                      {isAdmin && (
                        <td className="px-5 py-4 text-sm font-bold text-[#1D1B16]">
                          {entry.user.displayName}
                        </td>
                      )}
                      <td className="px-5 py-4">
                        <div className="text-sm font-bold text-[#1D1B16]">{entry.project.name}</div>
                        {entry.description && (
                          <div className="text-xs text-[#6B655C] mt-0.5 font-medium max-w-xs truncate" title={entry.description}>
                            {entry.description}
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-4 text-sm font-extrabold text-[#1F2B4D]">
                        {entry.hours}h
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          entry.isBillable ? 'bg-[#F0F3F9] text-[#1F2B4D] border border-[#EAE7E0]' : 'bg-[#FAF9F6] text-[#6B655C] border border-[#EAE7E0]'
                        }`}>
                          {entry.isBillable ? 'Billable' : 'Non-Billable'}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          entry.status === 'Approved' ? 'bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0]' :
                          entry.status === 'Rejected' ? 'bg-[#FEF2F2] text-[#991B1B] border border-[#FECACA]' : 
                          'bg-[#FDF8F3] text-[#8C5722] border border-[#EEDCCE]'
                        }`}>
                          {entry.status === 'Approved' && <div className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />}
                          {entry.status === 'Rejected' && <div className="w-1.5 h-1.5 rounded-full bg-[#EF4444]" />}
                          {entry.status === 'Submitted' && <div className="w-1.5 h-1.5 rounded-full bg-[#B5793A]" />}
                          {entry.status}
                        </span>
                      </td>
                      {isAdmin && (
                        <td className="px-5 py-4 text-right">
                          {entry.status === 'Submitted' && (
                            <button 
                              onClick={() => handleApprove(entry.id)} 
                              className="inline-flex p-1.5 text-[#065F46] bg-[#ECFDF5] border border-[#A7F3D0] hover:bg-[#D1FAE5] rounded-lg transition-colors shadow-xs active:scale-95" 
                              title="Approve"
                            >
                              <Check size={16} strokeWidth={3} />
                            </button>
                          )}
                        </td>
                      )}
                    </motion.tr>
                  ))}
                </AnimatePresence>
                {timesheets.length === 0 && (
                  <tr>
                    <td colSpan={isAdmin ? 7 : 5} className="p-12 text-center">
                      <div className="flex flex-col items-center justify-center space-y-3">
                        <div className="w-12 h-12 rounded-full bg-[#F4F1EA] flex items-center justify-center text-[#9A948A]">
                          <Clock size={24} />
                        </div>
                        <p className="text-[#6B655C] font-medium">No timesheets logged yet.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </motion.div>

      {/* Premium Add Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-[#0F172A]/40 backdrop-blur-md"
              onClick={() => setShowAddModal(false)}
            />
            
            {/* Modal Surface */}
            <motion.div 
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="relative w-full max-w-md bg-white rounded-[24px] shadow-2xl border border-[#EAE7E0] overflow-hidden"
            >
              <div className="flex items-center justify-between p-6 border-b border-[#F4F1EA] bg-[#FAF9F6]">
                <h2 className="text-xl font-bold text-[#1D1B16]">Log Time</h2>
                <button 
                  onClick={() => setShowAddModal(false)}
                  className="p-1.5 text-[#9A948A] hover:text-[#1D1B16] hover:bg-[#EAE7E0] rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleLogHours} className="p-6 space-y-5">
                <div>
                  <label className="block text-[13px] font-bold text-[#6B655C] mb-1.5 uppercase tracking-wide">Project</label>
                  <div className="relative">
                    <select 
                      required 
                      value={projectId} 
                      onChange={(e) => setProjectId(e.target.value)} 
                      className="w-full px-4 py-3 bg-[#FAF9F6] border border-[#EAE7E0] text-[#1D1B16] font-semibold rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1F2B4D] focus:border-transparent transition-all appearance-none"
                    >
                      <option value="">-- Select Project --</option>
                      {projects.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[13px] font-bold text-[#6B655C] mb-1.5 uppercase tracking-wide">Date</label>
                    <input 
                      type="date" 
                      required 
                      value={date} 
                      onChange={(e) => setDate(e.target.value)} 
                      className="w-full px-4 py-3 bg-[#FAF9F6] border border-[#EAE7E0] text-[#1D1B16] font-semibold rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1F2B4D] focus:border-transparent transition-all" 
                    />
                  </div>
                  <div>
                    <label className="block text-[13px] font-bold text-[#6B655C] mb-1.5 uppercase tracking-wide">Hours</label>
                    <input 
                      type="number" 
                      step="0.5" 
                      required 
                      value={hours} 
                      onChange={(e) => setHours(e.target.value)} 
                      className="w-full px-4 py-3 bg-[#FAF9F6] border border-[#EAE7E0] text-[#1D1B16] font-semibold rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1F2B4D] focus:border-transparent transition-all" 
                      placeholder="e.g. 8" 
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-[13px] font-bold text-[#6B655C] mb-1.5 uppercase tracking-wide">Description</label>
                  <textarea 
                    rows="3" 
                    value={description} 
                    onChange={(e) => setDescription(e.target.value)} 
                    className="w-full px-4 py-3 bg-[#FAF9F6] border border-[#EAE7E0] text-[#1D1B16] font-medium rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1F2B4D] focus:border-transparent transition-all resize-none" 
                    placeholder="Briefly describe your work..."
                  />
                </div>
                
                <div className="flex items-center gap-3 p-4 rounded-xl bg-[#FAF9F6] border border-[#EAE7E0]">
                  <div className="relative flex items-center justify-center">
                    <input 
                      type="checkbox" 
                      id="billable" 
                      checked={isBillable} 
                      onChange={(e) => setIsBillable(e.target.checked)} 
                      className="peer appearance-none w-5 h-5 border-2 border-[#9A948A] rounded focus:outline-none focus:ring-2 focus:ring-[#1F2B4D] focus:ring-offset-1 checked:bg-[#1F2B4D] checked:border-[#1F2B4D] transition-all cursor-pointer" 
                    />
                    <Check size={14} strokeWidth={3} className="absolute text-white pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity" />
                  </div>
                  <div>
                    <label htmlFor="billable" className="text-sm font-bold text-[#1D1B16] cursor-pointer block leading-none">Billable Hours</label>
                    <span className="text-[11px] font-medium text-[#6B655C] mt-1 block">This time will be invoiced to the client.</span>
                  </div>
                </div>
                
                <div className="pt-2 flex gap-3">
                  <button 
                    type="button" 
                    onClick={() => setShowAddModal(false)} 
                    className="flex-1 px-4 py-3 border border-[#EAE7E0] bg-white text-[#1D1B16] font-bold rounded-xl hover:bg-[#FAF9F6] transition-colors active:scale-95"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="flex-1 px-4 py-3 bg-[#1F2B4D] text-white font-bold rounded-xl shadow-md hover:bg-[#141C33] hover:shadow-lg transition-all active:scale-95"
                  >
                    Save Timesheet
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

export default Timesheet;
