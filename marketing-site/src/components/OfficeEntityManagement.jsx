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
    <div className="space-y-8">
      {/* Offices Doppelrand Card */}
      <div className="rounded-[32px] bg-[#F4F1EA] p-4 sm:p-6 border border-[#EAE7E0] shadow-sm">
        <div className="rounded-[22px] bg-white p-6 sm:p-8 border border-[#E2E8F0] shadow-xs space-y-6">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#EAE7E0]">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#F4F1EA] text-[#1F2B4D] border border-[#EAE7E0] text-[11px] font-bold tracking-wider uppercase mb-2">
                <Sparkles size={12} /> SPATIAL GEOFENCING
              </div>
              <h3 className="text-2xl font-extrabold text-[#1D1B16] tracking-tight">Geofence Office Locations</h3>
              <p className="text-[#6B655C] text-xs sm:text-sm mt-1">Configure physical work locations and GPS coordinates for biometric attendance enforcement.</p>
            </div>
          </div>
          
          <form onSubmit={handleCreateOffice} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end bg-[#FAF9F6] p-5 rounded-2xl border border-[#EAE7E0]">
            <div className="col-span-1">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#6B655C] mb-2">Office Name</label>
              <input type="text" required className="w-full px-3.5 py-2.5 bg-white border border-[#EAE7E0] rounded-xl text-sm font-medium text-[#1D1B16] outline-none focus:border-[#1F2B4D] focus:ring-2 focus:ring-[#1F2B4D]/15 transition-all" value={newOffice.name} onChange={e => setNewOffice({...newOffice, name: e.target.value})} placeholder="e.g. HQ Tech Park" />
            </div>
            <div className="col-span-1">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#6B655C] mb-2">Latitude</label>
              <input type="text" required className="w-full px-3.5 py-2.5 bg-white border border-[#EAE7E0] rounded-xl text-sm font-medium text-[#1D1B16] outline-none focus:border-[#1F2B4D] focus:ring-2 focus:ring-[#1F2B4D]/15 transition-all" value={newOffice.lat} onChange={e => setNewOffice({...newOffice, lat: e.target.value})} placeholder="12.9716" />
            </div>
            <div className="col-span-1">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#6B655C] mb-2">Longitude</label>
              <input type="text" required className="w-full px-3.5 py-2.5 bg-white border border-[#EAE7E0] rounded-xl text-sm font-medium text-[#1D1B16] outline-none focus:border-[#1F2B4D] focus:ring-2 focus:ring-[#1F2B4D]/15 transition-all" value={newOffice.lng} onChange={e => setNewOffice({...newOffice, lng: e.target.value})} placeholder="77.5946" />
            </div>
            <div className="col-span-1">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#6B655C] mb-2">Address</label>
              <input type="text" required className="w-full px-3.5 py-2.5 bg-white border border-[#EAE7E0] rounded-xl text-sm font-medium text-[#1D1B16] outline-none focus:border-[#1F2B4D] focus:ring-2 focus:ring-[#1F2B4D]/15 transition-all" value={newOffice.address} onChange={e => setNewOffice({...newOffice, address: e.target.value})} placeholder="Bengaluru, KA" />
            </div>
            <button type="submit" disabled={isSubmittingOffice} className="bg-[#1F2B4D] hover:bg-[#141C33] text-white px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wide transition-all shadow-sm h-[42px] flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer">
              {isSubmittingOffice ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Plus size={15} /><span>Add Office</span></>}
            </button>
          </form>

          <div className="overflow-x-auto border border-[#EAE7E0] rounded-2xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#F4F1EA] text-[#6B655C] text-xs font-bold uppercase tracking-wider border-b border-[#EAE7E0]">
                  <th className="px-6 py-3.5">Office Name</th>
                  <th className="px-6 py-3.5">Address</th>
                  <th className="px-6 py-3.5">GPS Coordinates</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAE7E0] text-sm">
                {offices.map(off => (
                  <tr key={off.id} className="hover:bg-[#FAF9F6] transition-colors">
                    <td className="px-6 py-4 font-bold text-[#1D1B16] flex items-center gap-2">
                      <MapPin size={15} className="text-[#1F2B4D]" />
                      <span>{off.name}</span>
                    </td>
                    <td className="px-6 py-4 text-[#6B655C]">{off.address}</td>
                    <td className="px-6 py-4 text-[#1D1B16] font-mono text-xs">
                      {off.lat}, {off.lng}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>
      </div>

      {/* Entities Doppelrand Card */}
      <div className="rounded-[32px] bg-[#F4F1EA] p-4 sm:p-6 border border-[#EAE7E0] shadow-sm">
        <div className="rounded-[22px] bg-white p-6 sm:p-8 border border-[#E2E8F0] shadow-xs space-y-6">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#EAE7E0]">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#F4F1EA] text-[#1F2B4D] border border-[#EAE7E0] text-[11px] font-bold tracking-wider uppercase mb-2">
                <Sparkles size={12} /> CORPORATE STRUCTURE
              </div>
              <h3 className="text-2xl font-extrabold text-[#1D1B16] tracking-tight">Legal Entities & Subsidiaries</h3>
              <p className="text-[#6B655C] text-xs sm:text-sm mt-1">Register legal corporate entities and corporate PAN numbers.</p>
            </div>
          </div>
          
          <form onSubmit={handleCreateEntity} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end bg-[#FAF9F6] p-5 rounded-2xl border border-[#EAE7E0]">
            <div className="col-span-1">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#6B655C] mb-2">Legal Entity Name</label>
              <input type="text" required className="w-full px-3.5 py-2.5 bg-white border border-[#EAE7E0] rounded-xl text-sm font-medium text-[#1D1B16] outline-none focus:border-[#1F2B4D] focus:ring-2 focus:ring-[#1F2B4D]/15 transition-all" value={newEntity.name} onChange={e => setNewEntity({...newEntity, name: e.target.value})} placeholder="Acme Private Limited" />
            </div>
            <div className="col-span-1">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#6B655C] mb-2">PAN Number</label>
              <input type="text" required className="w-full px-3.5 py-2.5 bg-white border border-[#EAE7E0] rounded-xl text-sm font-medium text-[#1D1B16] outline-none focus:border-[#1F2B4D] focus:ring-2 focus:ring-[#1F2B4D]/15 transition-all uppercase" value={newEntity.pan} onChange={e => setNewEntity({...newEntity, pan: e.target.value})} placeholder="ABCDE1234F" />
            </div>
            <div className="col-span-1">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#6B655C] mb-2">Registered Address</label>
              <input type="text" required className="w-full px-3.5 py-2.5 bg-white border border-[#EAE7E0] rounded-xl text-sm font-medium text-[#1D1B16] outline-none focus:border-[#1F2B4D] focus:ring-2 focus:ring-[#1F2B4D]/15 transition-all" value={newEntity.registeredAddress} onChange={e => setNewEntity({...newEntity, registeredAddress: e.target.value})} placeholder="Full Street Address" />
            </div>
            <button type="submit" disabled={isSubmittingEntity} className="bg-[#1F2B4D] hover:bg-[#141C33] text-white px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wide transition-all shadow-sm h-[42px] flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer">
              {isSubmittingEntity ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Plus size={15} /><span>Add Entity</span></>}
            </button>
          </form>

          <div className="overflow-x-auto border border-[#EAE7E0] rounded-2xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#F4F1EA] text-[#6B655C] text-xs font-bold uppercase tracking-wider border-b border-[#EAE7E0]">
                  <th className="px-6 py-3.5">Company Name</th>
                  <th className="px-6 py-3.5">PAN Number</th>
                  <th className="px-6 py-3.5">Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAE7E0] text-sm">
                {entities.map(ent => (
                  <tr key={ent.id} className="hover:bg-[#FAF9F6] transition-colors">
                    <td className="px-6 py-4 font-bold text-[#1D1B16] flex items-center gap-2">
                      <Building2 size={15} className="text-[#1F2B4D]" />
                      <span>{ent.name}</span>
                    </td>
                    <td className="px-6 py-4 text-[#1D1B16] font-mono text-xs">{ent.pan}</td>
                    <td className="px-6 py-4 text-[#6B655C]">{ent.registeredAddress}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>
      </div>
    </div>
  );
}
