import React, { useState, useEffect } from 'react';
import { LifeBuoy, Plus, MessageSquare, AlertCircle, Clock, CheckCircle } from 'lucide-react';
import { API_BASE } from '../lib/api';
import Alert from '../components/ui/Alert';
import { Button } from '../components/ui/Button';

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

  const isAdmin = user?.roleDefinition?.level <= 1 || user?.role === 'Admin' || user?.role === 'SuperAdmin' || user?.role === 'CEO';

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

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary-400 to-primary-600 flex items-center gap-3">
            <LifeBuoy size={32} className="text-primary-500" /> HR Helpdesk
          </h1>
          <p className="text-text-muted mt-2">Submit and track your internal requests and issues.</p>
        </div>
        {!isAdmin && (
          <Button onClick={() => setShowNewForm(!showNewForm)} className="bg-primary-600 hover:bg-primary-700 text-white flex items-center gap-2">
            <Plus size={18} /> New Request
          </Button>
        )}
      </div>

      {errorMsg && <Alert type="error" message={errorMsg} />}
      {successMsg && <Alert type="success" message={successMsg} />}

      {showNewForm && (
        <div className="bg-bg-panel/40 backdrop-blur-xl border border-white/10 rounded-3xl p-6 mb-8 shadow-premium-glow animate-in fade-in slide-in-from-top-4">
          <h2 className="text-xl font-bold text-text-primary mb-4 border-b border-white/5 pb-2">Submit a Request</h2>
          <form onSubmit={handleCreateTicket} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-text-muted mb-1">Subject</label>
                <input required type="text" value={subject} onChange={e => setSubject(e.target.value)} className="w-full p-2.5 bg-black/20 border border-white/10 rounded-lg text-text-primary focus:border-primary-500 outline-none transition-colors" placeholder="e.g. Needs updated ID card" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-text-muted mb-1">Category</label>
                <select value={category} onChange={e => setCategory(e.target.value)} className="w-full p-2.5 bg-black/20 border border-white/10 rounded-lg text-text-primary focus:border-primary-500 outline-none transition-colors appearance-none">
                  <option value="HR">HR / General</option>
                  <option value="Payroll">Payroll & Benefits</option>
                  <option value="IT">IT Support</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-text-muted mb-1">Description</label>
              <textarea required value={description} onChange={e => setDescription(e.target.value)} rows={4} className="w-full p-2.5 bg-black/20 border border-white/10 rounded-lg text-text-primary focus:border-primary-500 outline-none transition-colors" placeholder="Provide details..."></textarea>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" onClick={() => setShowNewForm(false)} className="bg-white/5 hover:bg-white/10 text-white border border-white/10">Cancel</Button>
              <Button type="submit" disabled={loading} className="bg-primary-600 hover:bg-primary-700 text-white">Submit Ticket</Button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-text-muted animate-pulse">Loading tickets...</div>
      ) : tickets.length === 0 ? (
        <div className="text-center py-16 bg-bg-panel/20 rounded-3xl border border-white/5">
          <MessageSquare size={48} className="mx-auto text-white/20 mb-4" />
          <h3 className="text-xl font-bold text-text-primary">No Tickets Found</h3>
          <p className="text-text-muted">You have no open requests right now.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {tickets.map(ticket => (
            <div key={ticket.id} className="bg-bg-panel/40 backdrop-blur-xl border border-white/5 rounded-2xl p-5 shadow-lg hover:border-primary-500/30 transition-colors group flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
              <div className="flex gap-4 items-start w-full">
                <div className="mt-1">
                  {ticket.status === 'Open' ? (
                    <div className="w-10 h-10 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center ring-1 ring-amber-500/30">
                      <AlertCircle size={20} />
                    </div>
                  ) : ticket.status === 'InProgress' ? (
                    <div className="w-10 h-10 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center ring-1 ring-blue-500/30">
                      <Clock size={20} />
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center ring-1 ring-emerald-500/30">
                      <CheckCircle size={20} />
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-text-primary text-lg">{ticket.subject}</h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border border-white/10 bg-white/5 text-text-muted uppercase tracking-wider">{ticket.category}</span>
                  </div>
                  <p className="text-text-muted text-sm mb-3 line-clamp-2">{ticket.description}</p>
                  
                  <div className="flex items-center gap-4 text-xs font-semibold text-text-muted">
                    {isAdmin && ticket.user && (
                      <span className="text-primary-300">By: {ticket.user.displayName}</span>
                    )}
                    <span>{new Date(ticket.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
              
              {/* Actions */}
              {isAdmin && ticket.status !== 'Resolved' && (
                <div className="flex md:flex-col gap-2 shrink-0 self-end md:self-auto w-full md:w-auto mt-4 md:mt-0 pt-4 md:pt-0 border-t border-white/5 md:border-0">
                   {ticket.status === 'Open' && (
                     <button onClick={() => updateTicketStatus(ticket.id, 'InProgress')} className="flex-1 md:flex-none text-xs font-bold text-blue-400 bg-blue-400/10 hover:bg-blue-400/20 px-3 py-1.5 rounded-lg transition-colors text-center border border-blue-400/20">
                       Mark In Progress
                     </button>
                   )}
                   <button onClick={() => updateTicketStatus(ticket.id, 'Resolved')} className="flex-1 md:flex-none text-xs font-bold text-emerald-400 bg-emerald-400/10 hover:bg-emerald-400/20 px-3 py-1.5 rounded-lg transition-colors text-center border border-emerald-400/20">
                     Resolve
                   </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Helpdesk;
