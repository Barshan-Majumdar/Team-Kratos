import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { getSession } from '@crew/auth-client';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function CompanyProfile() {
  const [profile, setProfile] = useState({ name: '', domain: '', address: '', timezone: '' });
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { token } = getSession();

  useEffect(() => {
    fetch(`${API_BASE}/api/console/company`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => { setProfile(data || {}); setLoading(false); })
      .catch(err => { toast.error('Failed to load profile'); setLoading(false); });
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/console/company`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(profile)
      });
      if (res.ok) toast.success('Company profile updated');
      else toast.error('Failed to update');
    } catch (err) { toast.error('Error saving profile'); }
    finally { setIsSubmitting(false); }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
      <h3 className="text-xl font-bold mb-6 text-slate-800">Company Profile</h3>
      <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Company Name</label>
          <input type="text" className="w-full border p-2 rounded-lg focus:ring focus:ring-indigo-200 focus:outline-none" value={profile.name || ''} onChange={e => setProfile({...profile, name: e.target.value})} />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Website</label>
          <input type="text" className="w-full border p-2 rounded-lg focus:ring focus:ring-indigo-200 focus:outline-none" value={profile.domain || ''} onChange={e => setProfile({...profile, domain: e.target.value})} />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Registered Address</label>
          <textarea className="w-full border p-2 rounded-lg focus:ring focus:ring-indigo-200 focus:outline-none" value={profile.address || ''} onChange={e => setProfile({...profile, address: e.target.value})}></textarea>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Timezone</label>
          <input type="text" className="w-full border p-2 rounded-lg focus:ring focus:ring-indigo-200 focus:outline-none" value={profile.timezone || ''} onChange={e => setProfile({...profile, timezone: e.target.value})} />
        </div>
        <button type="submit" disabled={isSubmitting} className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition-colors shadow disabled:opacity-50 disabled:cursor-not-allowed">
          {isSubmitting ? 'Saving...' : 'Save Changes'}
        </button>
      </form>
    </div>
  );
}
