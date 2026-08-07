import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { getSession } from '@crew/auth-client';
import { Building2, Globe, MapPin, Clock, Save, Sparkles } from 'lucide-react';

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

  if (loading) return (
    <div className="rounded-[32px] bg-[#F4F1EA] p-4 border border-[#EAE7E0]">
      <div className="rounded-[22px] bg-white p-12 border border-[#E2E8F0] text-center flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-3 border-[#1F2B4D]/20 border-t-[#1F2B4D] rounded-full animate-spin" />
        <p className="text-xs font-bold tracking-wider text-[#6B655C] uppercase">Loading Company Profile...</p>
      </div>
    </div>
  );

  return (
    <div className="rounded-[32px] bg-[#F4F1EA] p-4 sm:p-6 border border-[#EAE7E0] shadow-sm">
      <div className="rounded-[22px] bg-white p-6 sm:p-8 border border-[#E2E8F0] shadow-xs">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#EAE7E0] mb-8">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#F4F1EA] text-[#1F2B4D] border border-[#EAE7E0] text-[11px] font-bold tracking-wider uppercase mb-2">
              <Sparkles size={12} /> SYSTEM OF RECORD
            </div>
            <h3 className="text-2xl font-extrabold text-[#1D1B16] tracking-tight">Company Profile</h3>
            <p className="text-[#6B655C] text-xs sm:text-sm mt-1">Manage core enterprise credentials, legal location, and operational timezone.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 w-full">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#6B655C] mb-2">
                Company Legal Name
              </label>
              <div className="relative">
                <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9A948A]" size={18} />
                <input 
                  type="text" 
                  className="w-full pl-10 pr-4 py-3 bg-[#FAF9F6] border border-[#EAE7E0] rounded-xl text-sm font-medium text-[#1D1B16] outline-none focus:border-[#1F2B4D] focus:bg-white focus:ring-2 focus:ring-[#1F2B4D]/15 transition-all" 
                  value={profile.name || ''} 
                  onChange={e => setProfile({...profile, name: e.target.value})} 
                  placeholder="Acme Technologies Inc."
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#6B655C] mb-2">
                Official Web Domain
              </label>
              <div className="relative">
                <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9A948A]" size={18} />
                <input 
                  type="text" 
                  className="w-full pl-10 pr-4 py-3 bg-[#FAF9F6] border border-[#EAE7E0] rounded-xl text-sm font-medium text-[#1D1B16] outline-none focus:border-[#1F2B4D] focus:bg-white focus:ring-2 focus:ring-[#1F2B4D]/15 transition-all" 
                  value={profile.domain || ''} 
                  onChange={e => setProfile({...profile, domain: e.target.value})} 
                  placeholder="acme.com"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#6B655C] mb-2">
              Registered Headquarter Address
            </label>
            <div className="relative">
              <MapPin className="absolute left-3.5 top-3 text-[#9A948A]" size={18} />
              <textarea 
                rows={3}
                className="w-full pl-10 pr-4 py-3 bg-[#FAF9F6] border border-[#EAE7E0] rounded-xl text-sm font-medium text-[#1D1B16] outline-none focus:border-[#1F2B4D] focus:bg-white focus:ring-2 focus:ring-[#1F2B4D]/15 transition-all resize-none" 
                value={profile.address || ''} 
                onChange={e => setProfile({...profile, address: e.target.value})} 
                placeholder="100 Enterprise Way, Suite 400..."
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#6B655C] mb-2">
              Primary System Timezone
            </label>
            <div className="relative">
              <Clock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9A948A]" size={18} />
              <input 
                type="text" 
                className="w-full pl-10 pr-4 py-3 bg-[#FAF9F6] border border-[#EAE7E0] rounded-xl text-sm font-medium text-[#1D1B16] outline-none focus:border-[#1F2B4D] focus:bg-white focus:ring-2 focus:ring-[#1F2B4D]/15 transition-all" 
                value={profile.timezone || ''} 
                onChange={e => setProfile({...profile, timezone: e.target.value})} 
                placeholder="Asia/Kolkata (IST)"
              />
            </div>
          </div>

          <div className="pt-4">
            <button 
              type="submit" 
              disabled={isSubmitting} 
              className="px-6 py-3.5 rounded-xl bg-[#1F2B4D] hover:bg-[#141C33] active:scale-[0.99] text-white text-xs font-bold tracking-wide uppercase transition-all duration-200 shadow-sm flex items-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Save size={15} />
                  <span>Save Profile Parameters</span>
                </>
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
