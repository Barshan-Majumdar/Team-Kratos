import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { getSession } from '@crew/auth-client';
import { MapPin, Building2, Plus, Sparkles, Navigation } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function OfficeEntityManagement() {
  const [offices, setOffices] = useState([]);
  const [entities, setEntities] = useState([]);
  const [loading, setLoading] = useState(true);
  const { token } = getSession();

  const [newOffice, setNewOffice] = useState({ name: '', lat: '', lng: '', address: '' });
  const [newEntity, setNewEntity] = useState({ name: '', registeredAddress: '', pan: '' });
  const [isSubmittingOffice, setIsSubmittingOffice] = useState(false);
  const [isSubmittingEntity, setIsSubmittingEntity] = useState(false);

  const fetchData = async () => {
    try {
      const [officesRes, entitiesRes] = await Promise.all([
        fetch(`${API_BASE}/api/console/offices`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE}/api/console/entities`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      if (officesRes.ok) setOffices(await officesRes.json());
      if (entitiesRes.ok) setEntities(await entitiesRes.json());
      setLoading(false);
    } catch (err) {
      toast.error('Failed to load data');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  const handleCreateOffice = async (e) => {
    e.preventDefault();
    setIsSubmittingOffice(true);
    try {
      const res = await fetch(`${API_BASE}/api/console/offices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(newOffice)
      });
      if (res.ok) {
        toast.success('Office created');
        setNewOffice({ name: '', lat: '', lng: '', address: '' });
        fetchData();
      } else toast.error('Failed to create office');
    } catch (err) { toast.error('Error creating office'); }
    finally { setIsSubmittingOffice(false); }
  };

  const handleCreateEntity = async (e) => {
    e.preventDefault();
    setIsSubmittingEntity(true);
    try {
      const res = await fetch(`${API_BASE}/api/console/entities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(newEntity)
      });
      if (res.ok) {
        toast.success('Entity created');
        setNewEntity({ name: '', registeredAddress: '', pan: '' });
        fetchData();
      } else toast.error('Failed to create entity');
    } catch (err) { toast.error('Error creating entity'); }
    finally { setIsSubmittingEntity(false); }
  };

  if (loading) return (
    <div className="rounded-[32px] bg-[#F4F1EA] p-4 border border-[#EAE7E0]">
      <div className="rounded-[22px] bg-white p-12 border border-[#E2E8F0] text-center flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-3 border-[#1F2B4D]/20 border-t-[#1F2B4D] rounded-full animate-spin" />
        <p className="text-xs font-bold tracking-wider text-[#6B655C] uppercase">Loading Offices & Entities...</p>
      </div>
    </div>
  );

  return (
    <div className="w-full space-y-6 sm:space-y-8 font-sans">
      {/* Offices Doppelrand Card */}
      <div className="rounded-[28px] sm:rounded-[32px] bg-[#F4F1EA] p-3.5 sm:p-5 md:p-6 border border-[#EAE7E0] shadow-2xs w-full">
        <div className="rounded-[20px] sm:rounded-[22px] bg-white p-4 sm:p-6 md:p-8 border border-[#E2E8F0] shadow-2xs space-y-5 sm:space-y-6 w-full">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-[#EAE7E0] w-full">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FAF8F5] text-[#1F2B4D] border border-[#EAE7E0] text-[10px] sm:text-[11px] font-display font-bold tracking-wider uppercase mb-2">
                <Sparkles size={12} /> SPATIAL GEOFENCING
              </div>
              <h3 className="text-xl sm:text-2xl font-serif font-bold text-[#1F2B4D] tracking-tight">Geofence Office Locations</h3>
              <p className="text-[#6B655C] text-xs sm:text-sm font-medium mt-0.5">Configure physical work locations and GPS coordinates for biometric attendance enforcement.</p>
            </div>
          </div>
          
          <form onSubmit={handleCreateOffice} className="grid grid-cols-1 sm:grid-cols-2 min-[1100px]:grid-cols-5 gap-3.5 sm:gap-4 items-end bg-[#FAF8F5] p-4 sm:p-5 rounded-2xl border border-[#EAE7E0] w-full">
            <div className="col-span-1">
              <label className="block text-[10px] sm:text-xs font-display font-bold uppercase tracking-wider text-[#6B655C] mb-1.5">Office Name</label>
              <input type="text" required className="w-full px-3.5 py-2.5 bg-white border border-[#EAE7E0] rounded-xl text-xs sm:text-sm font-medium text-[#1F2B4D] outline-none focus:border-[#1F2B4D] focus:ring-2 focus:ring-[#1F2B4D]/15 transition-all" value={newOffice.name} onChange={e => setNewOffice({...newOffice, name: e.target.value})} placeholder="e.g. HQ Tech Park" />
            </div>
            <div className="col-span-1">
              <label className="block text-[10px] sm:text-xs font-display font-bold uppercase tracking-wider text-[#6B655C] mb-1.5">Latitude</label>
              <input type="text" required className="w-full px-3.5 py-2.5 bg-white border border-[#EAE7E0] rounded-xl text-xs sm:text-sm font-medium text-[#1F2B4D] outline-none focus:border-[#1F2B4D] focus:ring-2 focus:ring-[#1F2B4D]/15 transition-all" value={newOffice.lat} onChange={e => setNewOffice({...newOffice, lat: e.target.value})} placeholder="12.9716" />
            </div>
            <div className="col-span-1">
              <label className="block text-[10px] sm:text-xs font-display font-bold uppercase tracking-wider text-[#6B655C] mb-1.5">Longitude</label>
              <input type="text" required className="w-full px-3.5 py-2.5 bg-white border border-[#EAE7E0] rounded-xl text-xs sm:text-sm font-medium text-[#1F2B4D] outline-none focus:border-[#1F2B4D] focus:ring-2 focus:ring-[#1F2B4D]/15 transition-all" value={newOffice.lng} onChange={e => setNewOffice({...newOffice, lng: e.target.value})} placeholder="77.5946" />
            </div>
            <div className="col-span-1">
              <label className="block text-[10px] sm:text-xs font-display font-bold uppercase tracking-wider text-[#6B655C] mb-1.5">Address</label>
              <input type="text" required className="w-full px-3.5 py-2.5 bg-white border border-[#EAE7E0] rounded-xl text-xs sm:text-sm font-medium text-[#1F2B4D] outline-none focus:border-[#1F2B4D] focus:ring-2 focus:ring-[#1F2B4D]/15 transition-all" value={newOffice.address} onChange={e => setNewOffice({...newOffice, address: e.target.value})} placeholder="Bengaluru, KA" />
            </div>
            <button type="submit" disabled={isSubmittingOffice} className="w-full bg-[#1F2B4D] hover:bg-[#141C33] text-white px-4 py-2.5 rounded-xl text-xs font-display font-bold uppercase tracking-wider transition-all shadow-2xs h-[42px] flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer shrink-0">
              {isSubmittingOffice ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Plus size={15} /><span>Add Office</span></>}
            </button>
          </form>

          <div className="overflow-x-auto [&::-webkit-scrollbar]:hidden w-full border border-[#EAE7E0] rounded-2xl">
            <table className="w-full text-left border-collapse min-w-[500px]">
              <thead>
                <tr className="bg-[#FAF8F5] text-[#6B655C] text-[10px] sm:text-xs font-display font-bold uppercase tracking-wider border-b border-[#EAE7E0]">
                  <th className="px-4 sm:px-6 py-3">Office Name</th>
                  <th className="px-4 sm:px-6 py-3">Address</th>
                  <th className="px-4 sm:px-6 py-3">GPS Coordinates</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAE7E0] text-xs sm:text-sm">
                {offices.length === 0 ? (
                  <tr>
                    <td colSpan="3" className="px-4 py-8 text-center text-[#6B655C] font-medium">No offices configured yet.</td>
                  </tr>
                ) : (
                  offices.map(off => (
                    <tr key={off.id} className="hover:bg-[#FAF8F5] transition-colors">
                      <td className="px-4 sm:px-6 py-3.5 font-bold text-[#1F2B4D] flex items-center gap-2">
                        <MapPin size={15} className="text-[#1F2B4D] shrink-0" />
                        <span>{off.name}</span>
                      </td>
                      <td className="px-4 sm:px-6 py-3.5 text-[#6B655C]">{off.address}</td>
                      <td className="px-4 sm:px-6 py-3.5 text-[#1F2B4D] font-mono text-xs font-bold">
                        {off.lat}, {off.lng}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

        </div>
      </div>

      {/* Entities Doppelrand Card */}
      <div className="rounded-[28px] sm:rounded-[32px] bg-[#F4F1EA] p-3.5 sm:p-5 md:p-6 border border-[#EAE7E0] shadow-2xs w-full">
        <div className="rounded-[20px] sm:rounded-[22px] bg-white p-4 sm:p-6 md:p-8 border border-[#E2E8F0] shadow-2xs space-y-5 sm:space-y-6 w-full">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-[#EAE7E0] w-full">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FAF8F5] text-[#1F2B4D] border border-[#EAE7E0] text-[10px] sm:text-[11px] font-display font-bold tracking-wider uppercase mb-2">
                <Sparkles size={12} /> CORPORATE STRUCTURE
              </div>
              <h3 className="text-xl sm:text-2xl font-serif font-bold text-[#1F2B4D] tracking-tight">Legal Entities & Subsidiaries</h3>
              <p className="text-[#6B655C] text-xs sm:text-sm font-medium mt-0.5">Register legal corporate entities and corporate PAN numbers.</p>
            </div>
          </div>
          
          <form onSubmit={handleCreateEntity} className="grid grid-cols-1 sm:grid-cols-2 min-[1100px]:grid-cols-4 gap-3.5 sm:gap-4 items-end bg-[#FAF8F5] p-4 sm:p-5 rounded-2xl border border-[#EAE7E0] w-full">
            <div className="col-span-1">
              <label className="block text-[10px] sm:text-xs font-display font-bold uppercase tracking-wider text-[#6B655C] mb-1.5">Legal Entity Name</label>
              <input type="text" required className="w-full px-3.5 py-2.5 bg-white border border-[#EAE7E0] rounded-xl text-xs sm:text-sm font-medium text-[#1F2B4D] outline-none focus:border-[#1F2B4D] focus:ring-2 focus:ring-[#1F2B4D]/15 transition-all" value={newEntity.name} onChange={e => setNewEntity({...newEntity, name: e.target.value})} placeholder="Acme Private Limited" />
            </div>
            <div className="col-span-1">
              <label className="block text-[10px] sm:text-xs font-display font-bold uppercase tracking-wider text-[#6B655C] mb-1.5">PAN Number</label>
              <input type="text" required className="w-full px-3.5 py-2.5 bg-white border border-[#EAE7E0] rounded-xl text-xs sm:text-sm font-medium text-[#1F2B4D] outline-none focus:border-[#1F2B4D] focus:ring-2 focus:ring-[#1F2B4D]/15 transition-all uppercase" value={newEntity.pan} onChange={e => setNewEntity({...newEntity, pan: e.target.value})} placeholder="ABCDE1234F" />
            </div>
            <div className="col-span-1">
              <label className="block text-[10px] sm:text-xs font-display font-bold uppercase tracking-wider text-[#6B655C] mb-1.5">Registered Address</label>
              <input type="text" required className="w-full px-3.5 py-2.5 bg-white border border-[#EAE7E0] rounded-xl text-xs sm:text-sm font-medium text-[#1F2B4D] outline-none focus:border-[#1F2B4D] focus:ring-2 focus:ring-[#1F2B4D]/15 transition-all" value={newEntity.registeredAddress} onChange={e => setNewEntity({...newEntity, registeredAddress: e.target.value})} placeholder="Full Street Address" />
            </div>
            <button type="submit" disabled={isSubmittingEntity} className="w-full bg-[#1F2B4D] hover:bg-[#141C33] text-white px-4 py-2.5 rounded-xl text-xs font-display font-bold uppercase tracking-wider transition-all shadow-2xs h-[42px] flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer shrink-0">
              {isSubmittingEntity ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Plus size={15} /><span>Add Entity</span></>}
            </button>
          </form>

          <div className="overflow-x-auto [&::-webkit-scrollbar]:hidden w-full border border-[#EAE7E0] rounded-2xl">
            <table className="w-full text-left border-collapse min-w-[500px]">
              <thead>
                <tr className="bg-[#FAF8F5] text-[#6B655C] text-[10px] sm:text-xs font-display font-bold uppercase tracking-wider border-b border-[#EAE7E0]">
                  <th className="px-4 sm:px-6 py-3">Company Name</th>
                  <th className="px-4 sm:px-6 py-3">PAN Number</th>
                  <th className="px-4 sm:px-6 py-3">Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAE7E0] text-xs sm:text-sm">
                {entities.length === 0 ? (
                  <tr>
                    <td colSpan="3" className="px-4 py-8 text-center text-[#6B655C] font-medium">No legal entities configured yet.</td>
                  </tr>
                ) : (
                  entities.map(ent => (
                    <tr key={ent.id} className="hover:bg-[#FAF8F5] transition-colors">
                      <td className="px-4 sm:px-6 py-3.5 font-bold text-[#1F2B4D] flex items-center gap-2">
                        <Building2 size={15} className="text-[#1F2B4D] shrink-0" />
                        <span>{ent.name}</span>
                      </td>
                      <td className="px-4 sm:px-6 py-3.5 text-[#1F2B4D] font-mono text-xs font-bold">{ent.pan}</td>
                      <td className="px-4 sm:px-6 py-3.5 text-[#6B655C]">{ent.registeredAddress}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

        </div>
      </div>
    </div>
  );
}
