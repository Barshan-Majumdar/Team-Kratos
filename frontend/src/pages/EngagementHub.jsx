import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Avatar } from '../components/ui/Avatar';
import { 
  Megaphone, 
  Sparkles, 
  Heart, 
  Plus, 
  Bell, 
  ShieldCheck, 
  Calendar, 
  AlertTriangle, 
  CheckCircle, 
  Info, 
  X, 
  Gift, 
  Smile, 
  Sliders 
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { io } from 'socket.io-client';

const CATEGORY_STYLES = {
  Urgent: { bg: 'bg-red-500/10 text-red-600 border-red-200', icon: AlertTriangle },
  Birthday: { bg: 'bg-amber-500/10 text-amber-600 border-amber-200', icon: Gift },
  Policy: { bg: 'bg-blue-500/10 text-blue-600 border-blue-200', icon: ShieldCheck },
  Event: { bg: 'bg-purple-500/10 text-purple-600 border-purple-200', icon: Calendar },
  General: { bg: 'bg-slate-500/10 text-slate-600 border-slate-200', icon: Info }
};

const EngagementHub = ({ user }) => {
  const [announcements, setAnnouncements] = useState([]);
  const [preference, setPreference] = useState({ announceBirthday: true });
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [wishingId, setWishingId] = useState(null);
  const [toast, setToast] = useState(null);

  const [formData, setFormData] = useState({
    title: '',
    category: 'General',
    message: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const isAdmin = user?.roleDefinition?.level <= 1 || user?.role === 'Admin' || user?.role === 'SuperAdmin';

  const fetchAnnouncements = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/announcements`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAnnouncements(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Error fetching announcements:', err);
    }
  };

  const fetchUserPreference = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/users/preferences`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPreference(data);
      }
    } catch (err) {
      console.error('Error fetching user preferences:', err);
    }
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([fetchAnnouncements(), fetchUserPreference()]);
      setLoading(false);
    };
    load();

    // Socket.io Real-time connection
    const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:5000', {
      auth: { token: localStorage.getItem('token') }
    });

    socket.on('announcement:new', (newAnn) => {
      setAnnouncements(prev => [newAnn, ...prev]);
      showToast(`📢 New Announcement: ${newAnn.title}`);
    });

    socket.on('announcement:birthday', (bdayAnn) => {
      setAnnouncements(prev => [bdayAnn, ...prev]);
      showToast(`🎂 Birthday Celebration! ${bdayAnn.title}`);
    });

    socket.on('birthday:wish', ({ announcementId, wisherName }) => {
      setAnnouncements(prev => prev.map(ann => {
        if (ann.id === announcementId) {
          const existingWishes = ann.wishes || [];
          return {
            ...ann,
            wishes: [...existingWishes, { id: Date.now().toString(), wisher: { displayName: wisherName } }]
          };
        }
        return ann;
      }));
      showToast(`🎉 ${wisherName} wished a Happy Birthday!`);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  const handleTogglePreference = async () => {
    const updatedValue = !preference.announceBirthday;
    setPreference(prev => ({ ...prev, announceBirthday: updatedValue }));
    try {
      const token = localStorage.getItem('token');
      await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/users/preferences`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ announceBirthday: updatedValue })
      });
      showToast(updatedValue ? '🎉 Birthday announcements enabled' : '🔒 Birthday announcements disabled');
    } catch (err) {
      console.error('Error updating preference:', err);
    }
  };

  const handleWish = async (announcementId) => {
    setWishingId(announcementId);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/announcements/${announcementId}/wish`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const wish = await res.json();
        setAnnouncements(prev => prev.map(ann => {
          if (ann.id === announcementId) {
            return {
              ...ann,
              wishes: [...(ann.wishes || []), { ...wish, wisherId: user?.id, wisher: { id: user?.id, displayName: user?.displayName } }]
            };
          }
          return ann;
        }));
        showToast('❤️ Your birthday wish was sent!');
      } else {
        const errData = await res.json();
        showToast(`⚠️ ${errData.error || 'Could not send wish'}`);
      }
    } catch (err) {
      console.error('Wish error:', err);
    } finally {
      setWishingId(null);
    }
  };

  const handleCreateAnnouncement = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.message) {
      setError('Title and message are required.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/announcements`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to post announcement');
      }

      setIsModalOpen(false);
      setFormData({ title: '', category: 'General', message: '' });
      fetchAnnouncements();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleManualTrigger = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/announcements/trigger-birthday-check`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const result = await res.json();
        showToast(`🎂 Birthday check completed (${result.count || 0} celebrated)`);
        fetchAnnouncements();
      }
    } catch (err) {
      console.error('Manual trigger error:', err);
    }
  };

  if (loading) {
    return (
      <div className="p-8 md:p-12 h-full flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
          <p className="text-slate-500">Loading Engagement Hub...</p>
        </div>
      </div>
    );
  }

  const birthdayAnnouncements = announcements.filter(a => a.category === 'Birthday');

  return (
    <div className="p-4 md:p-8 max-w-[1400px] mx-auto min-h-full flex flex-col gap-6">
      
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-5 duration-300 border border-slate-700">
          <Sparkles size={18} className="text-amber-400 shrink-0" />
          <span className="text-sm font-semibold">{toast}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-2.5">
            <Megaphone size={28} className="text-indigo-600" />
            Engagement Hub
          </h1>
          <p className="text-slate-500 mt-1 text-sm">Company announcements, birthday celebrations, and team feed.</p>
        </div>

        <div className="flex items-center gap-3">
          {isAdmin && (
            <>
              <Button 
                onClick={handleManualTrigger}
                variant="outline"
                className="gap-2 font-semibold text-slate-700 hover:bg-slate-100 border-slate-200 text-sm"
              >
                <Gift size={16} className="text-amber-500" /> Run Birthday Check
              </Button>
              <Button 
                onClick={() => setIsModalOpen(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-600/20 gap-2 font-bold px-4 py-2 rounded-xl transition-all flex items-center text-sm"
              >
                <Plus size={18} strokeWidth={2.5} /> New Announcement
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Privacy Preference Banner */}
      <Card className="p-4 bg-gradient-to-r from-indigo-50/80 via-purple-50/50 to-pink-50/80 border-indigo-100/60 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-indigo-600/20">
            <Gift size={20} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">Birthday Broadcast Setting</h3>
            <p className="text-xs text-slate-500">Allow Crew HR to announce your birthday on the company feed when it arrives.</p>
          </div>
        </div>
        <button
          onClick={handleTogglePreference}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
            preference.announceBirthday 
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' 
              : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
          }`}
        >
          {preference.announceBirthday ? (
            <> <CheckCircle size={14} /> Announced </>
          ) : (
            <> <X size={14} /> Opted Out </>
          )}
        </button>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Main Announcements Feed (2 Columns) */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Sparkles size={18} className="text-amber-500" />
            Company Feed
          </h2>

          {announcements.length === 0 ? (
            <Card className="p-8 border-dashed border-2 border-slate-200 text-center">
              <Megaphone size={40} className="mx-auto text-slate-300 mb-2" />
              <p className="text-slate-500 font-medium text-sm">No announcements posted yet.</p>
            </Card>
          ) : (
            announcements.map((ann) => {
              const CategoryIcon = CATEGORY_STYLES[ann.category]?.icon || Info;
              const categoryStyle = CATEGORY_STYLES[ann.category]?.bg || CATEGORY_STYLES.General.bg;
              const isBirthday = ann.category === 'Birthday';
              const wishes = ann.wishes || [];
              const hasWished = wishes.some(w => w.wisherId === user?.id || w.wisher?.id === user?.id);

              return (
                <Card key={ann.id} className="p-6 border-slate-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
                  
                  {/* Category Badge & Timestamp */}
                  <div className="flex items-center justify-between mb-4">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${categoryStyle}`}>
                      <CategoryIcon size={14} />
                      {ann.category}
                    </span>
                    <span className="text-xs text-slate-400 font-medium">
                      {formatDistanceToNow(new Date(ann.createdAt), { addSuffix: true })}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="text-xl font-bold text-slate-800 mb-2 leading-snug">{ann.title}</h3>

                  {/* Body Message */}
                  <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap mb-5">{ann.message}</p>

                  {/* Author / Identity & Wish Interaction */}
                  <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                    <div className="flex items-center gap-3">
                      {ann.admin ? (
                        <>
                          <Avatar src={ann.admin.avatar} name={ann.admin.displayName} className="w-8 h-8 rounded-full" />
                          <span className="text-xs font-bold text-slate-700">{ann.admin.displayName}</span>
                        </>
                      ) : (
                        <>
                          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center font-bold text-xs shadow-md">
                            HR
                          </div>
                          <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                            Crew System <Badge className="bg-indigo-50 text-indigo-600 text-[10px]">Official</Badge>
                          </span>
                        </>
                      )}
                    </div>

                    {/* Birthday Wish Interaction */}
                    {isBirthday && (
                      <div className="flex items-center gap-3">
                        {wishes.length > 0 && (
                          <span className="text-xs font-semibold text-slate-500">
                            {hasWished ? `You and ${wishes.length - 1} others wished them well! ❤️` : `${wishes.length} wishes`}
                          </span>
                        )}
                        <Button
                          size="sm"
                          disabled={hasWished || wishingId === ann.id}
                          onClick={() => handleWish(ann.id)}
                          className={`gap-1.5 font-bold text-xs rounded-xl transition-all ${
                            hasWished 
                              ? 'bg-pink-50 text-pink-600 border border-pink-200 cursor-not-allowed'
                              : 'bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white shadow-md shadow-pink-500/20'
                          }`}
                        >
                          <Heart size={14} className={hasWished ? 'fill-pink-600' : ''} />
                          {hasWished ? 'Wished ❤️' : 'Wish Happy Birthday'}
                        </Button>
                      </div>
                    )}
                  </div>
                </Card>
              );
            })
          )}
        </div>

        {/* Right Rail: Birthday Spotlight */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Gift size={18} className="text-amber-500" />
            Birthday Spotlight
          </h2>

          <Card className="p-6 bg-gradient-to-br from-amber-400 via-orange-400 to-pink-500 text-white shadow-lg shadow-orange-500/20 relative overflow-hidden">
            <div className="absolute -top-6 -right-6 p-8 opacity-15">
              <Gift size={120} />
            </div>
            <div className="relative z-10">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-white/20 backdrop-blur-md mb-3">
                <Sparkles size={14} /> TODAY'S CELEBRATION
              </div>
              <h3 className="text-2xl font-black mb-1">Spread The Joy!</h3>
              <p className="text-white/90 text-xs leading-relaxed mb-4">
                {birthdayAnnouncements.length > 0
                  ? 'Check out today’s birthday post on the feed and send your best wishes!'
                  : 'No team birthdays scheduled for today. Keep an eye out for upcoming celebrations!'}
              </p>
            </div>
          </Card>
        </div>
      </div>

      {/* Admin New Announcement Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/80">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <Megaphone size={20} className="text-indigo-600" />
                Compose Announcement
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateAnnouncement} className="p-6 space-y-4 overflow-y-auto">
              {error && (
                <div className="p-3 bg-red-50 text-red-600 text-xs rounded-xl border border-red-200 flex items-center gap-2">
                  <Info size={14} className="shrink-0" /> {error}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Title</label>
                <Input 
                  value={formData.title} 
                  onChange={e => setFormData({ ...formData, title: e.target.value })} 
                  placeholder="e.g. Q3 Townhall Meeting Scheduled"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Category</label>
                <select
                  value={formData.category}
                  onChange={e => setFormData({ ...formData, category: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm text-slate-700 font-medium bg-white"
                >
                  <option value="General">General</option>
                  <option value="Policy">Policy</option>
                  <option value="Event">Event</option>
                  <option value="Urgent">Urgent</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Message</label>
                <textarea
                  rows={4}
                  value={formData.message}
                  onChange={e => setFormData({ ...formData, message: e.target.value })}
                  placeholder="Write your announcement details here..."
                  className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm text-slate-700 font-medium"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)} className="text-slate-600 font-semibold">
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 shadow-md shadow-indigo-600/20">
                  {submitting ? 'Broadcasting...' : 'Broadcast Announcement'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EngagementHub;
