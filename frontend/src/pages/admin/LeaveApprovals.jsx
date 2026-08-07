import React, { useState, useEffect } from 'react';
import { Card } from '../../components/ui/Card';
import { format } from 'date-fns';
import { Skeleton } from '../../components/ui/Skeleton';
import { motion } from 'framer-motion';

const LeaveApprovals = () => {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('Pending');
  const [remarksMap, setRemarksMap] = useState({});
  const [balancesMap, setBalancesMap] = useState({});

  const fetchAllLeaves = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/leave/all`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      const leavesArr = Array.isArray(data) ? data : [];
      setLeaves(leavesArr);

      // Fetch balances for each unique employee in pending leaves in parallel
      const uniqueUserIds = [...new Set(leavesArr.filter(l => l.status === 'Pending').map(l => l.userId))];
      const balMap = {};
      
      await Promise.all(
        uniqueUserIds.map(async (uid) => {
          try {
            const bRes = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/leave/balances/${uid}`, {
              headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            if (bRes.ok) balMap[uid] = await bRes.json();
          } catch (e) { /* skip */ }
        })
      );
      setBalancesMap(balMap);
    } catch (e) {
      console.error('Failed to fetch leaves:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllLeaves();
  }, []);

  const handleStatusChange = async (id, status) => {
    const remarks = remarksMap[id] || '';
    setLeaves(prev => prev.map(l => l.id === id ? { ...l, status } : l));
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/leave/${id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ status, adminRemarks: remarks })
      });
      if (!res.ok) {
        const data = await res.json().catch(()=>({}));
        alert(data.error || 'Failed to update status');
        fetchAllLeaves();
      }
    } catch (err) {
      console.error(err);
      fetchAllLeaves();
    }
  };

  const filteredLeaves = filter === 'All' ? leaves : leaves.filter(l => l.status === filter);
  const filterTabs = ['Pending', 'Approved', 'Rejected', 'All'];

  const getBalanceForLeave = (leave) => {
    const userBals = balancesMap[leave.userId];
    if (!userBals) return null;
    return userBals.find(b => b.policyGroupId === leave.leavePolicy?.policyGroupId);
  };

  // Animation Variants
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const rowVariants = {
    hidden: { opacity: 0, y: 10 },
    show: { 
      opacity: 1, 
      y: 0,
      transition: { type: 'spring', stiffness: 260, damping: 20 }
    }
  };

  return (
    <div className="p-4 md:p-8 lg:p-12 min-h-screen flex flex-col bg-[#FAF9F6]">
      <motion.div 
        initial={{ opacity: 0, y: -10 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
        className="mb-8"
      >
        <h1 className="text-[28px] font-bold text-[#1D1B16] tracking-tight">Leave Approvals</h1>
        <p className="text-[#6B655C] mt-1 text-sm font-medium">Manage and review time off requests from your team.</p>
      </motion.div>

      {/* Premium Segmented Control for Filters */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ delay: 0.1, type: 'spring', stiffness: 260, damping: 20 }}
        className="flex gap-2 mb-6 bg-[#EAE7E0] p-1 rounded-xl w-fit"
      >
        {filterTabs.map(tab => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`flex items-center gap-2 px-4 py-2 rounded-[10px] text-[13px] font-bold transition-all ${
              filter === tab
                ? 'bg-[#1F2B4D] text-white shadow-md'
                : 'bg-transparent text-[#6B655C] hover:bg-[#F4F1EA] hover:text-[#1D1B16]'
            }`}
          >
            {tab}
            {tab === 'Pending' && (
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                filter === 'Pending' ? 'bg-white/20 text-white' : 'bg-[#1F2B4D]/10 text-[#1F2B4D]'
              }`}>
                {leaves.filter(l => l.status === 'Pending').length}
              </span>
            )}
          </button>
        ))}
      </motion.div>

      {/* Main Container - Doppelrand Architecture */}
      <div className="double-bezel-outer bg-[#F4F1EA] p-1.5 flex-1 flex flex-col">
        <div className="double-bezel-inner bg-white flex-1 p-6 flex flex-col overflow-hidden">
          
          <h3 className="text-lg font-bold mb-5 flex items-center gap-2 text-[#1D1B16] shrink-0">
            {filter} Applications <span className="text-[#9A948A] text-sm">({filteredLeaves.length})</span>
          </h3>
          
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto flex-1 custom-scrollbar">
            <table className="w-full text-left min-w-[900px]">
              <thead>
                <tr className="border-b border-[#EAE7E0]">
                  <th className="pb-3 text-[11px] font-bold text-[#9A948A] uppercase tracking-wider pl-4">Employee</th>
                  <th className="pb-3 text-[11px] font-bold text-[#9A948A] uppercase tracking-wider">Type</th>
                  <th className="pb-3 text-[11px] font-bold text-[#9A948A] uppercase tracking-wider">Duration</th>
                  <th className="pb-3 text-[11px] font-bold text-[#9A948A] uppercase tracking-wider">Dates</th>
                  <th className="pb-3 text-[11px] font-bold text-[#9A948A] uppercase tracking-wider">Balance</th>
                  <th className="pb-3 text-[11px] font-bold text-[#9A948A] uppercase tracking-wider">Reason</th>
                  <th className="pb-3 text-[11px] font-bold text-[#9A948A] uppercase tracking-wider">Doc</th>
                  <th className="pb-3 text-[11px] font-bold text-[#9A948A] uppercase tracking-wider text-center">Status</th>
                  {filter === 'Pending' && <th className="pb-3 text-[11px] font-bold text-[#9A948A] uppercase tracking-wider text-right pr-4">Actions</th>}
                </tr>
              </thead>
              <motion.tbody 
                variants={containerVariants}
                initial="hidden"
                animate="show"
                className="divide-y divide-[#F4F1EA]"
              >
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="py-4 pl-4"><Skeleton className="h-4 w-32 bg-[#EAE7E0]" /><Skeleton className="h-3 w-20 mt-1 bg-[#F4F1EA]" /></td>
                      <td className="py-4"><Skeleton className="h-4 w-24 bg-[#EAE7E0]" /></td>
                      <td className="py-4"><Skeleton className="h-4 w-16 bg-[#EAE7E0]" /></td>
                      <td className="py-4"><Skeleton className="h-4 w-28 bg-[#EAE7E0]" /></td>
                      <td className="py-4"><Skeleton className="h-4 w-16 bg-[#EAE7E0]" /></td>
                      <td className="py-4"><Skeleton className="h-4 w-36 bg-[#EAE7E0]" /></td>
                      <td className="py-4"><Skeleton className="h-4 w-12 bg-[#EAE7E0]" /></td>
                      <td className="py-4 text-center"><Skeleton className="h-6 w-16 mx-auto rounded-full bg-[#EAE7E0]" /></td>
                      {filter === 'Pending' && <td className="py-4 text-right pr-4"><Skeleton className="h-8 w-24 ml-auto rounded-lg bg-[#EAE7E0]" /></td>}
                    </tr>
                  ))
                ) : filteredLeaves.length === 0 ? (
                  <tr><td colSpan="9" className="py-12 text-center text-[#6B655C] font-medium">No {filter.toLowerCase()} leave requests! 🎉</td></tr>
                ) : (
                  filteredLeaves.map(leave => {
                    const bal = getBalanceForLeave(leave);
                    return (
                      <motion.tr key={leave.id} variants={rowVariants} className="hover:bg-[#FAF9F6] transition-colors group">
                        <td className="py-4 pl-4">
                          <p className="font-bold text-[#1D1B16] text-[14px]">{leave.user?.displayName || 'Unknown'}</p>
                          <span className="text-[10px] font-bold text-[#6B655C] uppercase tracking-wider inline-flex items-center gap-1.5 mt-0.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#EAE7E0]" /> {leave.user?.department || 'General'}
                          </span>
                        </td>
                        <td className="py-4 text-[13.5px] font-medium text-[#1D1B16]">
                          {leave.leavePolicy?.name || '—'}
                        </td>
                        <td className="py-4">
                          <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider inline-block ${
                            leave.durationType === 'HalfDay' ? 'bg-[#F0F3F9] text-[#1F2B4D] border border-[#CBD5E1]' : 'bg-[#FAF9F6] text-[#6B655C] border border-[#EAE7E0]'
                          }`}>
                            {leave.durationType === 'HalfDay' ? 'Half Day' : 'Full Day'}
                          </span>
                        </td>
                        <td className="py-4 text-[13.5px] font-medium text-[#6B655C]">
                          {format(new Date(leave.startDate), 'MMM d, yyyy')} <br/>to<br/> {format(new Date(leave.endDate), 'MMM d, yyyy')}
                        </td>
                        <td className="py-4 text-[13.5px]">
                          {bal ? (
                            <span className={`font-bold ${bal.available <= 0 ? 'text-[#B91C1C]' : 'text-[#065F46]'}`}>
                              {bal.available} <span className="text-[#9A948A] font-medium text-xs">/ {bal.annualQuota}</span>
                            </span>
                          ) : (
                            <span className="text-[#9A948A] text-xs font-medium">—</span>
                          )}
                        </td>
                        <td className="py-4 text-[13px] text-[#6B655C] font-medium max-w-[160px]">
                          <div className="truncate" title={leave.reason}>{leave.reason}</div>
                          {leave.adminRemarks && (
                            <div className="text-[11px] text-[#B91C1C] mt-1 italic truncate" title={leave.adminRemarks}>
                              Remarks: {leave.adminRemarks}
                            </div>
                          )}
                        </td>
                        <td className="py-4">
                          {leave.attachment ? (
                            <a href={leave.attachment.startsWith('http') ? leave.attachment : `${import.meta.env.VITE_API_URL || "http://localhost:5000"}${leave.attachment}`} target="_blank" rel="noreferrer" className="text-[11px] font-bold text-[#1F2B4D] hover:text-white bg-[#F0F3F9] hover:bg-[#1F2B4D] px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap inline-flex items-center gap-1 border border-[#CBD5E1]">
                              View Proof ↗
                            </a>
                          ) : (
                            <span className="text-xs text-[#9A948A] italic">None</span>
                          )}
                        </td>
                        <td className="py-4 text-center">
                          <span className={`font-bold px-3 py-1 rounded-full text-[10px] uppercase tracking-wider inline-flex items-center gap-1.5 shadow-xs ${
                            leave.status === 'Approved' ? 'bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0]' :
                            leave.status === 'Rejected' ? 'bg-[#FEF2F2] text-[#B91C1C] border border-[#FECACA]' :
                            'bg-[#FDF8F3] text-[#8C5722] border border-[#EEDCCE]'
                          }`}>
                            {leave.status === 'Approved' && <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />}
                            {leave.status === 'Rejected' && <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444]" />}
                            {leave.status === 'Pending' && <span className="w-1.5 h-1.5 rounded-full bg-[#B5793A]" />}
                            {leave.status}
                          </span>
                        </td>
                        {filter === 'Pending' && (
                          <td className="py-4 pr-4">
                            <div className="flex flex-col gap-2 min-w-[140px]">
                              <div className="flex justify-end gap-2">
                                <button 
                                  onClick={() => handleStatusChange(leave.id, 'Approved')}
                                  className="flex-1 text-[11px] font-bold text-[#065F46] bg-[#ECFDF5] hover:bg-[#D1FAE5] px-3 py-1.5 rounded-lg transition-all border border-[#A7F3D0] shadow-sm active:scale-95 uppercase tracking-wider"
                                >
                                  Approve
                                </button>
                                <button 
                                  onClick={() => handleStatusChange(leave.id, 'Rejected')}
                                  className="flex-1 text-[11px] font-bold text-[#B91C1C] bg-[#FEF2F2] hover:bg-[#FEE2E2] px-3 py-1.5 rounded-lg transition-all border border-[#FECACA] shadow-sm active:scale-95 uppercase tracking-wider"
                                >
                                  Reject
                                </button>
                              </div>
                              <input
                                type="text"
                                placeholder="Admin remarks (optional)"
                                value={remarksMap[leave.id] || ''}
                                onChange={e => setRemarksMap(prev => ({...prev, [leave.id]: e.target.value}))}
                                className="w-full text-[11px] font-medium p-2 bg-[#FAF9F6] border border-[#EAE7E0] rounded-lg focus:ring-2 focus:ring-[#1F2B4D] outline-none transition-all placeholder:text-[#9A948A]"
                              />
                            </div>
                          </td>
                        )}
                      </motion.tr>
                    );
                  })
                )}
              </motion.tbody>
            </table>
          </div>

          {/* Mobile View */}
          <div className="md:hidden flex flex-col gap-4 flex-1 overflow-y-auto pb-4 custom-scrollbar">
            {loading ? (
               <div className="py-12 text-center text-[#6B655C] font-medium">Loading...</div>
            ) : filteredLeaves.length === 0 ? (
               <div className="py-12 text-center text-[#6B655C] font-medium">No {filter.toLowerCase()} leave requests! 🎉</div>
            ) : (
               filteredLeaves.map(leave => {
                 const bal = getBalanceForLeave(leave);
                 return (
                  <motion.div key={leave.id} variants={rowVariants} initial="hidden" animate="show" className="bg-[#FAF9F6] p-1.5 rounded-[24px] border border-[#EAE7E0] shadow-sm hover:shadow-md hover:-translate-y-[2px] transition-all duration-300">
                    <div className="bg-white rounded-[20px] p-5 h-full relative overflow-hidden">
                      <div className={`absolute top-0 left-0 w-1.5 h-full ${
                        leave.status === 'Approved' ? 'bg-[#10B981]' : leave.status === 'Rejected' ? 'bg-[#EF4444]' : 'bg-[#B5793A]'
                      }`}></div>
                      
                      <div className="flex justify-between items-start gap-2 mb-4">
                        <div className="pl-2">
                          <p className="font-bold text-[#1D1B16] text-lg">{leave.user?.displayName || 'Unknown'}</p>
                          <span className="text-[10px] font-bold text-[#6B655C] uppercase tracking-wider inline-flex items-center gap-1.5 mt-0.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#EAE7E0]" /> {leave.user?.department || 'GENERAL'}
                          </span>
                        </div>
                        <span className={`font-bold px-3 py-1 rounded-full text-[10px] uppercase tracking-wider shrink-0 shadow-xs flex items-center gap-1.5 ${
                          leave.status === 'Approved' ? 'bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0]' :
                          leave.status === 'Rejected' ? 'bg-[#FEF2F2] text-[#B91C1C] border border-[#FECACA]' :
                          'bg-[#FDF8F3] text-[#8C5722] border border-[#EEDCCE]'
                        }`}>
                          {leave.status === 'Approved' && <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />}
                          {leave.status === 'Rejected' && <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444]" />}
                          {leave.status === 'Pending' && <span className="w-1.5 h-1.5 rounded-full bg-[#B5793A]" />}
                          {leave.status}
                        </span>
                      </div>
                      
                      <div className="bg-[#FAF9F6] rounded-xl p-4 border border-[#EAE7E0] ml-2">
                        <div className="flex flex-col gap-3">
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-[#9A948A] text-[11px] font-bold uppercase tracking-wider">Type</span>
                            <span className="font-bold text-[#1D1B16]">{leave.leavePolicy?.name || '—'}</span>
                          </div>
                          <div className="h-px w-full bg-[#EAE7E0]"></div>
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-[#9A948A] text-[11px] font-bold uppercase tracking-wider">Duration</span>
                            <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${
                              leave.durationType === 'HalfDay' ? 'bg-[#F0F3F9] text-[#1F2B4D] border-[#CBD5E1]' : 'bg-white text-[#6B655C] border-[#EAE7E0]'
                            }`}>{leave.durationType === 'HalfDay' ? 'Half Day' : 'Full Day'}</span>
                          </div>
                          <div className="h-px w-full bg-[#EAE7E0]"></div>
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-[#9A948A] text-[11px] font-bold uppercase tracking-wider">Dates</span>
                            <span className="font-medium text-[#6B655C] text-right text-[13px]">{format(new Date(leave.startDate), 'MMM d, yyyy')} <br className="sm:hidden" /><span className="hidden sm:inline"> - </span>{format(new Date(leave.endDate), 'MMM d, yyyy')}</span>
                          </div>
                          {bal && (
                            <>
                              <div className="h-px w-full bg-[#EAE7E0]"></div>
                              <div className="flex justify-between items-center text-sm">
                                <span className="text-[#9A948A] text-[11px] font-bold uppercase tracking-wider">Balance</span>
                                <span className={`font-bold ${bal.available <= 0 ? 'text-[#B91C1C]' : 'text-[#065F46]'}`}>
                                  {bal.available} <span className="text-[#9A948A] font-medium text-xs">/ {bal.annualQuota}</span>
                                </span>
                              </div>
                            </>
                          )}
                          <div className="h-px w-full bg-[#EAE7E0]"></div>
                          <div className="flex flex-col gap-1 text-sm">
                            <span className="text-[#9A948A] text-[11px] font-bold uppercase tracking-wider">Reason</span>
                            <span className="text-[#1D1B16] font-medium text-[13.5px]">{leave.reason}</span>
                          </div>
                        </div>
                      </div>

                      {leave.attachment && (
                        <a href={leave.attachment} target="_blank" rel="noreferrer" className="mt-4 w-full text-center text-[11px] font-bold text-[#1F2B4D] bg-[#F0F3F9] hover:bg-[#E2E8F0] hover:text-[#1D1B16] py-3 rounded-xl transition-colors border border-[#CBD5E1] flex items-center justify-center gap-1.5 uppercase tracking-wider shadow-sm ml-2">
                          View Document Proof ↗
                        </a>
                      )}

                      {leave.status === 'Pending' && (
                        <div className="mt-4 flex flex-col gap-3 ml-2">
                          <input
                            type="text"
                            placeholder="Admin remarks (optional)"
                            value={remarksMap[leave.id] || ''}
                            onChange={e => setRemarksMap(prev => ({...prev, [leave.id]: e.target.value}))}
                            className="w-full text-[13px] font-medium p-3 bg-[#FAF9F6] border border-[#EAE7E0] rounded-xl focus:ring-2 focus:ring-[#1F2B4D] outline-none transition-all placeholder:text-[#9A948A]"
                          />
                          <div className="flex gap-2 w-full">
                            <button 
                              onClick={() => handleStatusChange(leave.id, 'Approved')}
                              className="flex-1 text-[11px] font-bold text-[#065F46] bg-[#ECFDF5] hover:bg-[#D1FAE5] py-3 rounded-xl transition-all border border-[#A7F3D0] shadow-sm active:scale-95 uppercase tracking-wider"
                            >
                              Approve
                            </button>
                            <button 
                              onClick={() => handleStatusChange(leave.id, 'Rejected')}
                              className="flex-1 text-[11px] font-bold text-[#B91C1C] bg-[#FEF2F2] hover:bg-[#FEE2E2] py-3 rounded-xl transition-all border border-[#FECACA] shadow-sm active:scale-95 uppercase tracking-wider"
                            >
                              Reject
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                 );
               })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeaveApprovals;
