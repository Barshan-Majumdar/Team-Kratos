import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { Calendar, Plus, MessageSquare, CheckSquare, Clock } from 'lucide-react';
import { CardSkeleton } from '../components/ui/Skeleton';

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
      await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/one-on-ones`, {
        employeeId, date, notes, talkingPoints: [], actionItems: []
      }, { headers: { Authorization: `Bearer ${token}` } });
      
      toast.success('1:1 Meeting scheduled');
      setShowModal(false);
      setEmployeeId('');
      setDate('');
      setNotes('');
      fetchData();
    } catch (err) {
      toast.error('Failed to schedule meeting');
    }
  };

  if (loading) return (
    <div className="p-4 md:p-8 lg:p-12 max-w-7xl mx-auto space-y-8">
      <div className="animate-pulse space-y-2">
        <div className="h-8 w-48 bg-slate-200 rounded-lg" />
        <div className="h-4 w-72 bg-slate-100 rounded" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <CardSkeleton />
        <CardSkeleton />
      </div>
    </div>
  );

  return (
    <div className="p-4 md:p-8 lg:p-12 max-w-7xl mx-auto space-y-8 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">1:1 Meetings</h1>
          <p className="text-slate-500 mt-1 text-lg">Continuous syncs, feedback, and career growth.</p>
        </div>
        {isManager && (
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-indigo-700 transition-all shadow-sm active:scale-95 whitespace-nowrap"
          >
            <Plus size={18} /> Schedule 1:1
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {meetings.map(meeting => (
          <div key={meeting.id} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-all">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                  {meeting.employee.displayName.charAt(0)}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-lg">1:1 with {meeting.employee.displayName}</h3>
                  <p className="text-sm text-slate-500 flex items-center gap-1">
                    <Calendar size={14} /> {new Date(meeting.date).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <span className={`px-2.5 py-1 text-xs font-bold uppercase tracking-wider rounded-full ${
                meeting.status === 'Completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
              }`}>
                {meeting.status}
              </span>
            </div>

            {meeting.notes && (
              <div className="mb-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-sm text-slate-700 italic">"{meeting.notes}"</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-slate-100">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1 mb-2">
                  <MessageSquare size={14} /> Talking Points
                </p>
                {meeting.talkingPoints && meeting.talkingPoints.length > 0 ? (
                  <ul className="text-sm text-slate-700 space-y-1 pl-4 list-disc">
                    {meeting.talkingPoints.map((pt, i) => <li key={i}>{pt.text || pt}</li>)}
                  </ul>
                ) : <p className="text-sm text-slate-400 italic">None logged</p>}
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1 mb-2">
                  <CheckSquare size={14} /> Action Items
                </p>
                {meeting.actionItems && meeting.actionItems.length > 0 ? (
                  <ul className="text-sm text-slate-700 space-y-1 pl-4 list-disc">
                    {meeting.actionItems.map((pt, i) => <li key={i}>{pt.text || pt}</li>)}
                  </ul>
                ) : <p className="text-sm text-slate-400 italic">None logged</p>}
              </div>
            </div>
          </div>
        ))}
        {meetings.length === 0 && (
          <div className="col-span-full py-16 text-center bg-slate-50 rounded-3xl border border-dashed border-slate-200">
            <Clock size={48} className="mx-auto text-slate-300 mb-4" />
            <h3 className="text-lg font-bold text-slate-700">No 1:1 meetings</h3>
            <p className="text-slate-500 mt-1">Regular syncs will appear here once scheduled.</p>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-scale-in">
            <div className="p-6 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-800">Schedule 1:1</h2>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Employee</label>
                <select required value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 transition-all">
                  <option value="">-- Select Employee --</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.displayName}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Date</label>
                <input type="datetime-local" required value={date} onChange={(e) => setDate(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 transition-all" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Context / Description</label>
                <textarea rows="3" value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 transition-all" placeholder="E.g. Monthly performance sync..."></textarea>
              </div>
              
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 font-semibold rounded-xl hover:bg-slate-50 transition-colors">Cancel</button>
                <button type="submit" className="flex-1 px-4 py-2.5 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-colors">Schedule Meeting</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default OneOnOnes;
