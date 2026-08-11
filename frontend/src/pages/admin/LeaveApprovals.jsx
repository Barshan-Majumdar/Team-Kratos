import React, { useState, useEffect } from 'react';
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
  const filterTabs = [
    { key: 'Pending', fullLabel: 'Pending', shortLabel: 'Pend' },
    { key: 'Approved', fullLabel: 'Approved', shortLabel: 'Appr' },
    { key: 'Rejected', fullLabel: 'Rejected', shortLabel: 'Rej' },
    { key: 'All', fullLabel: 'All', shortLabel: 'All' },
  ];

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
    <div className="p-3 sm:p-5 md:p-6 w-full min-h-full flex flex-col gap-3 sm:gap-4 bg-[#FAF9F6]">
      <motion.div 
        initial={{ opacity: 0, y: -10 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
        className="pb-2 border-b border-[#EAE7E0] w-full"
      >
        <h1 className="font-serif font-bold text-lg sm:text-2xl text-[#1F2B4D] tracking-tight">Leave Approvals</h1>
        <p className="text-[#6B655C] mt-0.5 text-xs sm:text-sm font-medium">Manage and review time off requests from your team.</p>
      </motion.div>

      {/* Segmented Control for Filters (Locked Single-Line Zero Sliding) */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ delay: 0.1, type: 'spring', stiffness: 260, damping: 20 }}
        className="flex items-center gap-0.5 sm:gap-1.5 bg-[#EAE7E0] p-0.5 sm:p-1 rounded-xl w-full min-[640px]:w-fit overflow-hidden shrink-0 shadow-2xs"
      >
        {filterTabs.map(tab => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setFilter(tab.key)}
            className={`px-1 min-[360px]:px-1.5 min-[480px]:px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[8.5px] min-[360px]:text-[9.5px] min-[480px]:text-[11px] sm:text-xs font-display font-bold uppercase tracking-tight flex items-center justify-center gap-0.5 sm:gap-1 transition-all whitespace-nowrap shrink-0 flex-1 min-[640px]:flex-initial text-center ${
              filter === tab.key
                ? 'bg-[#1F2B4D] text-white shadow-2xs'
                : 'bg-transparent text-[#6B655C] hover:bg-[#F4F1EA] hover:text-[#1F2B4D]'
            }`}
          >
            <span className="truncate">
              <span className="hidden min-[480px]:inline">{tab.fullLabel}</span>
              <span className="inline min-[480px]:hidden">{tab.shortLabel}</span>
            </span>
            {tab.key === 'Pending' && (
              <span className={`px-1 min-[360px]:px-1.5 py-0.5 rounded-full text-[8px] min-[360px]:text-[9px] font-bold shrink-0 ${
                filter === 'Pending' ? 'bg-white/20 text-white' : 'bg-[#1F2B4D]/10 text-[#1F2B4D]'
              }`}>
                {leaves.filter(l => l.status === 'Pending').length}
              </span>
            )}
          </button>
        ))}
      </motion.div>

      {/* Main Container - Doppelrand Architecture */}
      <div className="double-bezel-outer bg-[#F4F1EA] p-1 rounded-2xl flex-1 flex flex-col w-full">
        <div className="double-bezel-inner bg-white rounded-xl flex-1 p-3.5 sm:p-5 flex flex-col overflow-hidden w-full">
          
          <h3 className="font-serif font-bold text-sm sm:text-base mb-3 flex items-center gap-1.5 text-[#1F2B4D] shrink-0">
            <span>{filter} Applications</span>
            <span className="text-[#6B655C] text-xs font-sans font-medium">({filteredLeaves.length})</span>
          </h3>
          
          {/* Desktop Table View */}
          <div className="hidden lg:block overflow-hidden flex-1 w-full">
            <table className="w-full table-fixed text-left border-collapse">
              <thead>
                <tr className="border-b border-[#EAE7E0] text-[9.5px] font-display font-bold text-[#6B655C] uppercase tracking-wider">
                  <th className="pb-2.5 pl-2 w-[18%]">Employee</th>
                  <th className="pb-2.5 w-[12%]">Type</th>
                  <th className="pb-2.5 w-[10%]">Duration</th>
                  <th className="pb-2.5 w-[16%]">Dates</th>
                  <th className="pb-2.5 w-[10%]">Balance</th>
                  <th className="pb-2.5 w-[16%]">Reason</th>
                  <th className="pb-2.5 w-[8%]">Doc</th>
                  <th className="pb-2.5 text-center w-[10%]">Status</th>
                  {filter === 'Pending' && <th className="pb-2.5 text-right pr-2 w-[16%]">Actions</th>}
                </tr>
              </thead>
              <motion.tbody 
                variants={containerVariants}
                initial="hidden"
                animate="show"
                className="divide-y divide-[#F4F1EA] text-xs"
              >
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="py-3 pl-2"><Skeleton className="h-4 w-28 bg-[#EAE7E0]" /></td>
                      <td className="py-3"><Skeleton className="h-4 w-20 bg-[#EAE7E0]" /></td>
                      <td className="py-3"><Skeleton className="h-4 w-14 bg-[#EAE7E0]" /></td>
                      <td className="py-3"><Skeleton className="h-4 w-24 bg-[#EAE7E0]" /></td>
                      <td className="py-3"><Skeleton className="h-4 w-14 bg-[#EAE7E0]" /></td>
                      <td className="py-3"><Skeleton className="h-4 w-28 bg-[#EAE7E0]" /></td>
                      <td className="py-3"><Skeleton className="h-4 w-10 bg-[#EAE7E0]" /></td>
                      <td className="py-3 text-center"><Skeleton className="h-5 w-16 mx-auto rounded-full bg-[#EAE7E0]" /></td>
                      {filter === 'Pending' && <td className="py-3 text-right pr-2"><Skeleton className="h-7 w-24 ml-auto rounded-lg bg-[#EAE7E0]" /></td>}
                    </tr>
                  ))
                ) : filteredLeaves.length === 0 ? (
                  <tr><td colSpan={filter === 'Pending' ? 9 : 8} className="py-8 text-center text-[#6B655C] font-serif font-bold text-xs">No {filter.toLowerCase()} leave requests! 🎉</td></tr>
                ) : (
                  filteredLeaves.map(leave => {
                    const bal = getBalanceForLeave(leave);
                    return (
                      <motion.tr key={leave.id} variants={rowVariants} className="hover:bg-[#FAF9F6] transition-colors">
                        <td className="py-2.5 pl-2">
                          <p className="font-bold text-[#1F2B4D] text-xs truncate">{leave.user?.displayName || 'Unknown'}</p>
                          <span className="text-[9px] font-bold text-[#6B655C] uppercase tracking-wider inline-flex items-center gap-1 mt-0.5 truncate">
                            <span className="w-1 h-1 rounded-full bg-[#CBD5E1] shrink-0" /> <span className="truncate">{leave.user?.department || 'General'}</span>
                          </span>
                        </td>
                        <td className="py-2.5 text-xs font-bold text-[#1F2B4D] truncate">
                          {leave.leavePolicy?.name || '—'}
                        </td>
                        <td className="py-2.5">
                          <span className={`px-2 py-0.5 rounded-md text-[8.5px] font-display font-bold uppercase tracking-wider inline-block truncate ${
                            leave.durationType === 'HalfDay' ? 'bg-[#F0F3F9] text-[#1F2B4D] border border-[#CBD5E1]' : 'bg-[#FAF8F5] text-[#6B655C] border border-[#EAE7E0]'
                          }`}>
                            {leave.durationType === 'HalfDay' ? 'Half Day' : 'Full Day'}
                          </span>
                        </td>
                        <td className="py-2.5 text-xs font-medium text-[#6B655C]">
                          <span className="truncate block">{format(new Date(leave.startDate), 'MMM d, yyyy')}</span>
                          <span className="text-[10px] text-[#9A948A]">to {format(new Date(leave.endDate), 'MMM d, yyyy')}</span>
                        </td>
                        <td className="py-2.5 text-xs">
                          {bal ? (
                            <span className={`font-bold ${bal.available <= 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                              {bal.available} <span className="text-[#6B655C] font-medium text-[10px]">/ {bal.annualQuota}</span>
                            </span>
                          ) : (
                            <span className="text-[#6B655C] text-xs font-medium">—</span>
                          )}
                        </td>
                        <td className="py-2.5 text-xs text-[#6B655C] font-medium">
                          <div className="truncate" title={leave.reason}>{leave.reason}</div>
                          {leave.adminRemarks && (
                            <div className="text-[9.5px] text-rose-700 font-bold mt-0.5 italic truncate" title={leave.adminRemarks}>
                              Remarks: {leave.adminRemarks}
                            </div>
                          )}
                        </td>
                        <td className="py-2.5">
                          {leave.attachment ? (
                            <a href={leave.attachment.startsWith('http') ? leave.attachment : `${import.meta.env.VITE_API_URL || "http://localhost:5000"}${leave.attachment}`} target="_blank" rel="noreferrer" className="text-[9.5px] font-display font-bold text-[#1F2B4D] hover:bg-[#1F2B4D] hover:text-white bg-[#F0F3F9] px-2 py-1 rounded-lg transition-colors whitespace-nowrap inline-flex items-center gap-1 border border-[#CBD5E1]">
                              Proof ↗
                            </a>
                          ) : (
                            <span className="text-xs text-[#6B655C] italic">—</span>
                          )}
                        </td>
                        <td className="py-2.5 text-center">
                          <span className={`font-display font-bold px-2 py-0.5 rounded-full text-[8.5px] uppercase tracking-wider inline-flex items-center gap-1 shadow-2xs shrink-0 ${
                            leave.status === 'Approved' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
                            leave.status === 'Rejected' ? 'bg-rose-50 text-rose-800 border border-rose-200' :
                            'bg-amber-50 text-amber-800 border border-amber-200'
                          }`}>
                            {leave.status === 'Approved' && <span className="w-1 h-1 rounded-full bg-emerald-500 shrink-0" />}
                            {leave.status === 'Rejected' && <span className="w-1 h-1 rounded-full bg-rose-500 shrink-0" />}
                            {leave.status === 'Pending' && <span className="w-1 h-1 rounded-full bg-amber-500 shrink-0" />}
                            <span>{leave.status}</span>
                          </span>
                        </td>
                        {filter === 'Pending' && (
                          <td className="py-2.5 pr-2">
                            <div className="flex flex-col gap-1.5 w-full">
                              <div className="flex justify-end gap-1">
                                <button 
                                  type="button"
                                  onClick={() => handleStatusChange(leave.id, 'Approved')}
                                  className="flex-1 text-[9.5px] font-display font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2 py-1 rounded-lg transition-all border border-emerald-200 uppercase tracking-wider"
                                >
                                  Approve
                                </button>
                                <button 
                                  type="button"
                                  onClick={() => handleStatusChange(leave.id, 'Rejected')}
                                  className="flex-1 text-[9.5px] font-display font-bold text-rose-800 bg-rose-50 hover:bg-rose-100 px-2 py-1 rounded-lg transition-all border border-rose-200 uppercase tracking-wider"
                                >
                                  Reject
                                </button>
                              </div>
                              <input
                                type="text"
                                placeholder="Admin remarks..."
                                value={remarksMap[leave.id] || ''}
                                onChange={e => setRemarksMap(prev => ({...prev, [leave.id]: e.target.value}))}
                                className="w-full text-[9.5px] font-medium p-1 px-2 bg-[#FAF8F5] border border-[#EAE7E0] rounded-lg focus:ring-2 focus:ring-[#1F2B4D] outline-none"
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

          {/* Mobile & Tablet Card View */}
          <div className="lg:hidden flex flex-col gap-3 flex-1 overflow-y-auto pb-2 w-full">
            {loading ? (
               <div className="py-8 text-center text-[#6B655C] font-medium text-xs">Loading requests...</div>
            ) : filteredLeaves.length === 0 ? (
               <div className="py-8 text-center text-[#6B655C] font-serif font-bold text-xs">No {filter.toLowerCase()} leave requests! 🎉</div>
            ) : (
               filteredLeaves.map(leave => {
                 const bal = getBalanceForLeave(leave);
                 return (
                  <motion.div key={leave.id} variants={rowVariants} initial="hidden" animate="show" className="bg-[#FAF8F5] p-1 rounded-2xl border border-[#EAE7E0] shadow-2xs">
                    <div className="bg-white rounded-xl p-3.5 sm:p-4 h-full relative overflow-hidden">
                      <div className={`absolute top-0 left-0 w-1 h-full ${
                        leave.status === 'Approved' ? 'bg-emerald-500' : leave.status === 'Rejected' ? 'bg-rose-500' : 'bg-amber-500'
                      }`}></div>
                      
                      <div className="flex justify-between items-start gap-2 mb-3 pl-1.5">
                        <div>
                          <p className="font-serif font-bold text-[#1F2B4D] text-sm sm:text-base">{leave.user?.displayName || 'Unknown'}</p>
                          <span className="text-[9px] font-bold text-[#6B655C] uppercase tracking-wider inline-flex items-center gap-1 mt-0.5">
                            <span className="w-1 h-1 rounded-full bg-[#CBD5E1]" /> {leave.user?.department || 'GENERAL'}
                          </span>
                        </div>
                        <span className={`font-display font-bold px-2.5 py-0.5 rounded-full text-[9px] uppercase tracking-wider shrink-0 shadow-2xs flex items-center gap-1 ${
                          leave.status === 'Approved' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
                          leave.status === 'Rejected' ? 'bg-rose-50 text-rose-800 border border-rose-200' :
                          'bg-amber-50 text-amber-800 border border-amber-200'
                        }`}>
                          {leave.status === 'Approved' && <span className="w-1 h-1 rounded-full bg-emerald-500 shrink-0" />}
                          {leave.status === 'Rejected' && <span className="w-1 h-1 rounded-full bg-rose-500 shrink-0" />}
                          {leave.status === 'Pending' && <span className="w-1 h-1 rounded-full bg-amber-500 shrink-0" />}
                          <span>{leave.status}</span>
                        </span>
                      </div>
                      
                      <div className="bg-[#FAF8F5] rounded-xl p-3 border border-[#EAE7E0] ml-1.5 space-y-2 text-xs">
                        <div className="flex justify-between items-center">
                          <span className="text-[#6B655C] text-[10px] font-display font-bold uppercase tracking-wider">Type</span>
                          <span className="font-bold text-[#1F2B4D]">{leave.leavePolicy?.name || '—'}</span>
                        </div>
                        <div className="h-px w-full bg-[#EAE7E0]" />
                        <div className="flex justify-between items-center">
                          <span className="text-[#6B655C] text-[10px] font-display font-bold uppercase tracking-wider">Duration</span>
                          <span className={`px-2 py-0.5 rounded-md text-[8.5px] font-display font-bold uppercase tracking-wider border ${
                            leave.durationType === 'HalfDay' ? 'bg-[#F0F3F9] text-[#1F2B4D] border-[#CBD5E1]' : 'bg-white text-[#6B655C] border-[#EAE7E0]'
                          }`}>{leave.durationType === 'HalfDay' ? 'Half Day' : 'Full Day'}</span>
                        </div>
                        <div className="h-px w-full bg-[#EAE7E0]" />
                        <div className="flex justify-between items-center">
                          <span className="text-[#6B655C] text-[10px] font-display font-bold uppercase tracking-wider">Dates</span>
                          <span className="font-medium text-[#1F2B4D] text-right text-xs">{format(new Date(leave.startDate), 'MMM d, yyyy')} - {format(new Date(leave.endDate), 'MMM d, yyyy')}</span>
                        </div>
                        {bal && (
                          <>
                            <div className="h-px w-full bg-[#EAE7E0]" />
                            <div className="flex justify-between items-center">
                              <span className="text-[#6B655C] text-[10px] font-display font-bold uppercase tracking-wider">Balance</span>
                              <span className={`font-bold ${bal.available <= 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                                {bal.available} <span className="text-[#6B655C] font-medium text-[9.5px]">/ {bal.annualQuota}</span>
                              </span>
                            </div>
                          </>
                        )}
                        <div className="h-px w-full bg-[#EAE7E0]" />
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[#6B655C] text-[10px] font-display font-bold uppercase tracking-wider">Reason</span>
                          <span className="text-[#1F2B4D] font-medium text-xs leading-snug">{leave.reason}</span>
                        </div>
                      </div>

                      {leave.attachment && (
                        <a href={leave.attachment} target="_blank" rel="noreferrer" className="mt-3 w-full text-center text-[10px] font-display font-bold text-[#1F2B4D] bg-[#F0F3F9] hover:bg-[#1F2B4D] hover:text-white py-2 rounded-xl transition-colors border border-[#CBD5E1] flex items-center justify-center gap-1 uppercase tracking-wider shadow-2xs ml-1.5">
                          View Document Proof ↗
                        </a>
                      )}

                      {leave.status === 'Pending' && (
                        <div className="mt-3 flex flex-col gap-2 ml-1.5">
                          <input
                            type="text"
                            placeholder="Admin remarks (optional)"
                            value={remarksMap[leave.id] || ''}
                            onChange={e => setRemarksMap(prev => ({...prev, [leave.id]: e.target.value}))}
                            className="w-full text-xs font-medium p-2 bg-[#FAF8F5] border border-[#EAE7E0] rounded-xl focus:ring-2 focus:ring-[#1F2B4D] outline-none"
                          />
                          <div className="flex gap-2 w-full">
                            <button 
                              type="button"
                              onClick={() => handleStatusChange(leave.id, 'Approved')}
                              className="flex-1 text-[10px] font-display font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 py-2 rounded-xl transition-all border border-emerald-200 uppercase tracking-wider"
                            >
                              Approve
                            </button>
                            <button 
                              type="button"
                              onClick={() => handleStatusChange(leave.id, 'Rejected')}
                              className="flex-1 text-[10px] font-display font-bold text-rose-800 bg-rose-50 hover:bg-rose-100 py-2 rounded-xl transition-all border border-rose-200 uppercase tracking-wider"
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
