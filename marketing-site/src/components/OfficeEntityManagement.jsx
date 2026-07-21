import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { getSession } from '@crew/auth-client';

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

  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-8">
      {/* Offices */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <h3 className="text-xl font-bold mb-6 text-slate-800">Offices (Geofences)</h3>
        
        <form onSubmit={handleCreateOffice} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end mb-8 bg-slate-50 p-4 rounded-xl border">
          <div className="col-span-1">
            <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
            <input type="text" required className="w-full border p-2 rounded-lg" value={newOffice.name} onChange={e => setNewOffice({...newOffice, name: e.target.value})} placeholder="e.g. HQ" />
          </div>
          <div className="col-span-1">
            <label className="block text-sm font-medium text-slate-700 mb-1">Latitude</label>
            <input type="text" required className="w-full border p-2 rounded-lg" value={newOffice.lat} onChange={e => setNewOffice({...newOffice, lat: e.target.value})} placeholder="12.9716" />
          </div>
          <div className="col-span-1">
            <label className="block text-sm font-medium text-slate-700 mb-1">Longitude</label>
            <input type="text" required className="w-full border p-2 rounded-lg" value={newOffice.lng} onChange={e => setNewOffice({...newOffice, lng: e.target.value})} placeholder="77.5946" />
          </div>
          <div className="col-span-1">
            <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
            <input type="text" required className="w-full border p-2 rounded-lg" value={newOffice.address} onChange={e => setNewOffice({...newOffice, address: e.target.value})} placeholder="Bangalore" />
          </div>
          <button type="submit" disabled={isSubmittingOffice} className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 shadow h-[42px] disabled:opacity-50 disabled:cursor-not-allowed">
            {isSubmittingOffice ? 'Adding...' : 'Add Office'}
          </button>
        </form>

        <table className="w-full text-left">
          <thead>
            <tr className="border-b text-slate-500">
              <th className="pb-3 font-medium">Office Name</th>
              <th className="pb-3 font-medium">Location</th>
              <th className="pb-3 font-medium">Coordinates</th>
            </tr>
          </thead>
          <tbody>
            {offices.map(off => (
              <tr key={off.id} className="border-b last:border-0 hover:bg-slate-50">
                <td className="py-3 font-medium text-slate-800">{off.name}</td>
                <td className="py-3 text-slate-600">{off.address}</td>
                <td className="py-3 text-slate-600 font-mono text-sm">{off.lat}, {off.lng}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Entities */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <h3 className="text-xl font-bold mb-6 text-slate-800">Legal Entities</h3>
        
        <form onSubmit={handleCreateEntity} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end mb-8 bg-slate-50 p-4 rounded-xl border">
          <div className="col-span-1">
            <label className="block text-sm font-medium text-slate-700 mb-1">Legal Name</label>
            <input type="text" required className="w-full border p-2 rounded-lg" value={newEntity.name} onChange={e => setNewEntity({...newEntity, name: e.target.value})} placeholder="Acme Corp Pvt Ltd" />
          </div>
          <div className="col-span-1">
            <label className="block text-sm font-medium text-slate-700 mb-1">PAN Number</label>
            <input type="text" required className="w-full border p-2 rounded-lg" value={newEntity.pan} onChange={e => setNewEntity({...newEntity, pan: e.target.value})} />
          </div>
          <div className="col-span-1">
            <label className="block text-sm font-medium text-slate-700 mb-1">Registered Address</label>
            <input type="text" required className="w-full border p-2 rounded-lg" value={newEntity.registeredAddress} onChange={e => setNewEntity({...newEntity, registeredAddress: e.target.value})} />
          </div>
          <button type="submit" disabled={isSubmittingEntity} className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 shadow h-[42px] disabled:opacity-50 disabled:cursor-not-allowed">
            {isSubmittingEntity ? 'Adding...' : 'Add Entity'}
          </button>
        </form>

        <table className="w-full text-left">
          <thead>
            <tr className="border-b text-slate-500">
              <th className="pb-3 font-medium">Entity Name</th>
              <th className="pb-3 font-medium">PAN Number</th>
              <th className="pb-3 font-medium">Address</th>
            </tr>
          </thead>
          <tbody>
            {entities.map(ent => (
              <tr key={ent.id} className="border-b last:border-0 hover:bg-slate-50">
                <td className="py-3 font-medium text-slate-800">{ent.name}</td>
                <td className="py-3 text-slate-600 font-mono text-sm">{ent.pan}</td>
                <td className="py-3 text-slate-600">{ent.registeredAddress}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
