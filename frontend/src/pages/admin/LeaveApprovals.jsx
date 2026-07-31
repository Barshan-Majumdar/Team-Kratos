import React, { useState, useEffect } from 'react';
import { Card } from '../../components/ui/Card';
import { format } from 'date-fns';
import { Skeleton } from '../../components/ui/Skeleton';

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

  return (
    <div className="p-4 md:p-8 lg:p-12 h-full flex flex-col">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-slate-800 tracking-tight">Leave Approvals</h1>
        <p className="text-slate-500 mt-2">Manage and review time off requests from your team.</p>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6">
        {filterTabs.map(tab => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              filter === tab
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {tab}
            {tab === 'Pending' && (
              <span className="ml-1.5 px-1.5 py-0.5 bg-white/20 rounded-full text-xs">
                {leaves.filter(l => l.status === 'Pending').length}
              </span>
            )}
          </button>
        ))}
      </div>

      <Card className="p-6 shadow-sm border-slate-100 flex-1 overflow-hidden flex flex-col">
        <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-indigo-900 shrink-0">
          {filter} Applications ({filteredLeaves.length})
        </h3>
        <div className="hidden md:block overflow-x-auto flex-1 custom-scrollbar">
          <table className="w-full text-left min-w-[800px]">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="pb-3 text-sm font-bold text-slate-400">Employee</th>
                <th className="pb-3 text-sm font-bold text-slate-400">Type</th>
                <th className="pb-3 text-sm font-bold text-slate-400">Duration</th>
                <th className="pb-3 text-sm font-bold text-slate-400">Dates</th>
                <th className="pb-3 text-sm font-bold text-slate-400">Balance</th>
                <th className="pb-3 text-sm font-bold text-slate-400">Reason</th>
                <th className="pb-3 text-sm font-bold text-slate-400">Doc</th>
                <th className="pb-3 text-sm font-bold text-slate-400 text-center">Status</th>
                {filter === 'Pending' && <th className="pb-3 text-sm font-bold text-slate-400 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="border-b border-slate-100 animate-pulse">
                    <td className="py-4"><Skeleton className="h-4 w-32" /><Skeleton className="h-3 w-20 mt-1" /></td>
                    <td className="py-4"><Skeleton className="h-4 w-24" /></td>
                    <td className="py-4"><Skeleton className="h-4 w-16" /></td>
                    <td className="py-4"><Skeleton className="h-4 w-28" /></td>
                    <td className="py-4"><Skeleton className="h-4 w-16" /></td>
                    <td className="py-4"><Skeleton className="h-4 w-36" /></td>
                    <td className="py-4"><Skeleton className="h-4 w-12" /></td>
                    <td className="py-4 text-center"><Skeleton className="h-6 w-16 mx-auto rounded-full" /></td>
                    {filter === 'Pending' && <td className="py-4 text-right"><Skeleton className="h-8 w-24 ml-auto rounded-lg" /></td>}
                  </tr>
                ))
              ) : filteredLeaves.length === 0 ? (
                <tr><td colSpan="9" className="py-8 text-center text-slate-500">No {filter.toLowerCase()} leave requests! 🎉</td></tr>
              ) : (
                filteredLeaves.map(leave => {
                  const bal = getBalanceForLeave(leave);
                  return (
                    <tr key={leave.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors">
                      <td className="py-4 font-semibold text-slate-800">
                        {leave.user?.displayName || 'Unknown'} <br/>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{leave.user?.department}</span>
                      </td>
                      <td className="py-4 text-sm font-medium text-slate-600">
                        {leave.leavePolicy?.name || '—'}
                      </td>
                      <td className="py-4">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                          leave.durationType === 'HalfDay' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {leave.durationType === 'HalfDay' ? 'Half Day' : 'Full Day'}
                        </span>
                      </td>
                      <td className="py-4 text-sm font-medium text-slate-600">
                        {format(new Date(leave.startDate), 'MMM d, yyyy')} <br/>to<br/> {format(new Date(leave.endDate), 'MMM d, yyyy')}
                      </td>
                      <td className="py-4 text-sm">
                        {bal ? (
                          <span className={`font-bold ${bal.available <= 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                            {bal.available} <span className="text-slate-400 font-normal">/ {bal.annualQuota}</span>
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs">—</span>
                        )}
                      </td>
                      <td className="py-4 text-sm text-slate-600 max-w-[150px]">
                        <div className="truncate" title={leave.reason}>{leave.reason}</div>
                        {leave.adminRemarks && (
                          <div className="text-xs text-rose-500 mt-0.5 italic truncate" title={leave.adminRemarks}>
                            Remarks: {leave.adminRemarks}
                          </div>
                        )}
                      </td>
                      <td className="py-4">
                        {leave.attachment ? (
                          <a href={leave.attachment.startsWith('http') ? leave.attachment : `${import.meta.env.VITE_API_URL || "http://localhost:5000"}${leave.attachment}`} target="_blank" rel="noreferrer" className="text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:underline bg-indigo-50 px-2.5 py-1 rounded-md transition-colors whitespace-nowrap">
                            View Proof
                          </a>
                        ) : (
                          <span className="text-xs text-slate-400 italic">None</span>
                        )}
                      </td>
                      <td className="py-4 text-center">
                        <span className={`font-bold px-2.5 py-1 rounded-md text-[10px] uppercase tracking-wider ${
                          leave.status === 'Approved' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' :
                          leave.status === 'Rejected' ? 'bg-red-50 text-red-600 border border-red-200' :
                          'bg-amber-50 text-amber-600 border border-amber-200'
                        }`}>
                          {leave.status}
                        </span>
                      </td>
                      {filter === 'Pending' && (
                        <td className="py-4 text-right space-y-2">
                          <div className="flex justify-end gap-2">
                            <button 
                              onClick={() => handleStatusChange(leave.id, 'Approved')}
                              className="text-xs font-bold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 px-3 py-1.5 rounded-lg transition-colors border border-emerald-200 shadow-sm"
                            >
                              Approve
                            </button>
                            <button 
                              onClick={() => handleStatusChange(leave.id, 'Rejected')}
                              className="text-xs font-bold text-red-700 bg-red-100 hover:bg-red-200 px-3 py-1.5 rounded-lg transition-colors border border-red-200 shadow-sm"
                            >
                              Reject
                            </button>
                          </div>
                          <input
                            type="text"
                            placeholder="Admin remarks (optional)"
                            value={remarksMap[leave.id] || ''}
                            onChange={e => setRemarksMap(prev => ({...prev, [leave.id]: e.target.value}))}
                            className="w-full text-xs p-1.5 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 outline-none"
                          />
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile View */}
        <div className="md:hidden flex flex-col gap-4 flex-1 overflow-y-auto pb-4 custom-scrollbar">
          {loading ? (
             <div className="py-8 text-center text-slate-500">Loading...</div>
          ) : filteredLeaves.length === 0 ? (
             <div className="py-8 text-center text-slate-500">No {filter.toLowerCase()} leave requests! 🎉</div>
          ) : (
             filteredLeaves.map(leave => {
               const bal = getBalanceForLeave(leave);
               return (
                <div key={leave.id} className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col gap-4 relative overflow-hidden">
                  <div className={`absolute top-0 left-0 w-1 h-full ${
                    leave.status === 'Approved' ? 'bg-emerald-400' : leave.status === 'Rejected' ? 'bg-red-400' : 'bg-amber-400'
                  }`}></div>
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <p className="font-bold text-slate-800 text-lg">{leave.user?.displayName || 'Unknown'}</p>
                      <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider bg-indigo-50 px-2 py-0.5 rounded-full inline-block mt-1">{leave.user?.department || 'GENERAL'}</span>
                    </div>
                    <span className={`font-bold px-2.5 py-1 rounded-md text-[10px] uppercase tracking-wider shrink-0 shadow-sm ${
                      leave.status === 'Approved' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' :
                      leave.status === 'Rejected' ? 'bg-red-50 text-red-600 border border-red-200' :
                      'bg-amber-50 text-amber-600 border border-amber-200'
                    }`}>
                      {leave.status}
                    </span>
                  </div>
                  
                  <div className="bg-slate-50 rounded-xl p-3 flex flex-col gap-2 border border-slate-100">
                     <div className="flex justify-between items-center text-sm">
                       <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Type</span>
                       <span className="font-semibold text-slate-700">{leave.leavePolicy?.name || '—'}</span>
                     </div>
                     <div className="h-px w-full bg-slate-200/60"></div>
                     <div className="flex justify-between items-center text-sm">
                       <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Duration</span>
                       <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                         leave.durationType === 'HalfDay' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-600'
                       }`}>{leave.durationType === 'HalfDay' ? 'Half Day' : 'Full Day'}</span>
                     </div>
                     <div className="h-px w-full bg-slate-200/60"></div>
                     <div className="flex justify-between items-center text-sm">
                       <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Dates</span>
                       <span className="font-semibold text-slate-700 text-right">{format(new Date(leave.startDate), 'MMM d, yyyy')} <br className="sm:hidden" /><span className="hidden sm:inline"> - </span>{format(new Date(leave.endDate), 'MMM d, yyyy')}</span>
                     </div>
                     {bal && (
                       <>
                         <div className="h-px w-full bg-slate-200/60"></div>
                         <div className="flex justify-between items-center text-sm">
                           <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Balance</span>
                           <span className={`font-bold ${bal.available <= 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                             {bal.available} / {bal.annualQuota}
                           </span>
                         </div>
                       </>
                     )}
                     <div className="h-px w-full bg-slate-200/60"></div>
                     <div className="flex flex-col gap-1 text-sm">
                       <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Reason</span>
                       <span className="text-slate-700">{leave.reason}</span>
                     </div>
                  </div>

                  {leave.attachment && (
                    <a href={leave.attachment} target="_blank" rel="noreferrer" className="w-full text-center text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 py-2.5 rounded-lg transition-colors border border-indigo-100 flex items-center justify-center gap-1">
                      View Document Proof ↗
                    </a>
                  )}

                  {leave.status === 'Pending' && (
                    <>
                      <input
                        type="text"
                        placeholder="Admin remarks (optional)"
                        value={remarksMap[leave.id] || ''}
                        onChange={e => setRemarksMap(prev => ({...prev, [leave.id]: e.target.value}))}
                        className="w-full text-sm p-2.5 border border-slate-200 rounded-xl focus:ring-1 focus:ring-indigo-500 outline-none"
                      />
                      <div className="flex gap-2 w-full">
                        <button 
                          onClick={() => handleStatusChange(leave.id, 'Approved')}
                          className="flex-1 text-sm font-bold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 py-2.5 rounded-xl transition-colors border border-emerald-200 shadow-sm"
                        >
                          Approve
                        </button>
                        <button 
                          onClick={() => handleStatusChange(leave.id, 'Rejected')}
                          className="flex-1 text-sm font-bold text-red-700 bg-red-100 hover:bg-red-200 py-2.5 rounded-xl transition-colors border border-red-200 shadow-sm"
                        >
                          Reject
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })
          )}
        </div>
      </Card>
    </div>
  );
};

export default LeaveApprovals;
