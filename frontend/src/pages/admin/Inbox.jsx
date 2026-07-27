import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { Bell, CalendarDays, Wallet, Briefcase, FileText, ExternalLink, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

const Inbox = () => {
  const [inboxItems, setInboxItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInbox();

    const handleUpdate = (e) => {
      if (['inbox:updated', 'leave:requested'].includes(e.detail?.eventName)) {
        fetchInbox();
      }
    };
    window.addEventListener('app-realtime-update', handleUpdate);
    return () => window.removeEventListener('app-realtime-update', handleUpdate);
  }, []);

  const fetchInbox = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/inbox`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setInboxItems(res.data);
    } catch (error) {
      toast.error('Failed to load inbox');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'Leave': return <CalendarDays className="text-amber-500" size={20} />;
      case 'SalaryAdvance': return <Wallet className="text-emerald-500" size={20} />;
      case 'ExpenseClaim': return <FileText className="text-blue-500" size={20} />;
      case 'OnboardingTask': return <Briefcase className="text-indigo-500" size={20} />;
      case 'Recruitment': return <Briefcase className="text-purple-500" size={20} />;
      default: return <Bell className="text-slate-500" size={20} />;
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto h-full flex flex-col">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Unified Action Inbox</h1>
        <p className="text-sm text-slate-500">Your single source for approvals and pending tasks.</p>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center text-slate-500">Loading inbox...</div>
      ) : inboxItems.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-white border border-slate-200 rounded-2xl shadow-sm">
          <CheckCircle className="text-emerald-500 mb-4" size={48} />
          <h2 className="text-xl font-bold text-slate-700">Inbox Zero</h2>
          <p className="text-slate-500 max-w-sm mt-2">You have no pending approvals or action items right now. Great job!</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {inboxItems.map(item => (
            <div key={item.id} className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm hover:shadow-md transition-shadow flex items-start gap-4">
              <div className="p-3 bg-slate-50 rounded-xl">
                {getIcon(item.type)}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-bold text-slate-800 truncate">{item.title}</h3>
                <p className="text-slate-600 mt-1 line-clamp-2">{item.description}</p>
                <div className="flex items-center gap-3 mt-3">
                  <span className="text-xs font-semibold text-slate-400">
                    {new Date(item.createdAt).toLocaleDateString()} at {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-700">
                    {item.status}
                  </span>
                </div>
              </div>
              <Link 
                to={item.actionUrl} 
                className="shrink-0 px-4 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-semibold rounded-lg transition-colors flex items-center gap-2"
              >
                Review <ExternalLink size={16} />
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Inbox;
