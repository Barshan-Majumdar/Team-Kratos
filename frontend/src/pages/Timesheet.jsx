import React, { useState, useEffect } from 'react';
import { hasPermission } from '../lib/permissions';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { Clock, Plus, Check, X, Calendar } from 'lucide-react';
import { TableSkeleton } from '../components/ui/Skeleton';

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

  if (loading) return (
    <div className="p-4 md:p-8 lg:p-12 max-w-7xl mx-auto space-y-8">
      <div className="animate-pulse space-y-2">
        <div className="h-8 w-40 bg-slate-200 rounded-lg" />
        <div className="h-4 w-80 bg-slate-100 rounded" />
      </div>
      <TableSkeleton rows={5} cols={5} />
    </div>
  );

  return (
    <div className="p-4 md:p-8 lg:p-12 max-w-7xl mx-auto space-y-8 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Timesheets</h1>
          <p className="text-slate-500 mt-1 text-lg">Log your hours against projects and track billability.</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-indigo-700 transition-all shadow-sm active:scale-95 whitespace-nowrap"
        >
          <Clock size={18} /> Log Time
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="p-4 text-xs font-extrabold text-slate-500 uppercase tracking-wider">Date</th>
                {isAdmin && <th className="p-4 text-xs font-extrabold text-slate-500 uppercase tracking-wider">Employee</th>}
                <th className="p-4 text-xs font-extrabold text-slate-500 uppercase tracking-wider">Project</th>
                <th className="p-4 text-xs font-extrabold text-slate-500 uppercase tracking-wider">Hours</th>
                <th className="p-4 text-xs font-extrabold text-slate-500 uppercase tracking-wider">Type</th>
                <th className="p-4 text-xs font-extrabold text-slate-500 uppercase tracking-wider">Status</th>
                {isAdmin && <th className="p-4 text-xs font-extrabold text-slate-500 uppercase tracking-wider text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {timesheets.map(entry => (
                <tr key={entry.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-4 text-sm font-medium text-slate-800">
                    <div className="flex items-center gap-2">
                      <Calendar size={14} className="text-slate-400" />
                      {new Date(entry.date).toLocaleDateString()}
                    </div>
                  </td>
                  {isAdmin && <td className="p-4 text-sm font-semibold text-slate-800">{entry.user.displayName}</td>}
                  <td className="p-4 text-sm text-slate-700 font-medium">
                    {entry.project.name}
                    {entry.description && <p className="text-xs text-slate-500 mt-1 font-normal max-w-xs truncate">{entry.description}</p>}
                  </td>
                  <td className="p-4 text-sm font-bold text-slate-800">{entry.hours}h</td>
                  <td className="p-4">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide ${
                      entry.isBillable ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {entry.isBillable ? 'Billable' : 'Non-Billable'}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide ${
                      entry.status === 'Approved' ? 'bg-indigo-100 text-indigo-700' :
                      entry.status === 'Rejected' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {entry.status}
                    </span>
                  </td>
                  {isAdmin && (
                    <td className="p-4 text-right">
                      {entry.status === 'Submitted' && (
                        <button onClick={() => handleApprove(entry.id)} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="Approve">
                          <Check size={18} />
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
              {timesheets.length === 0 && (
                <tr>
                  <td colSpan={isAdmin ? 7 : 5} className="p-8 text-center text-slate-500 italic">
                    No timesheets logged yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-scale-in">
            <div className="p-6 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-800">Log Time</h2>
            </div>
            <form onSubmit={handleLogHours} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Project</label>
                <select required value={projectId} onChange={(e) => setProjectId(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 transition-all">
                  <option value="">-- Select Project --</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Date</label>
                  <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Hours</label>
                  <input type="number" step="0.5" required value={hours} onChange={(e) => setHours(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 transition-all" placeholder="e.g. 8" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Description</label>
                <textarea rows="2" value={description} onChange={(e) => setDescription(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 transition-all" placeholder="What did you work on?"></textarea>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="billable" checked={isBillable} onChange={(e) => setIsBillable(e.target.checked)} className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500" />
                <label htmlFor="billable" className="text-sm font-semibold text-slate-700">Billable Hours</label>
              </div>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 font-semibold rounded-xl hover:bg-slate-50 transition-colors">Cancel</button>
                <button type="submit" className="flex-1 px-4 py-2.5 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-colors">Save Timesheet</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Timesheet;
