import React, { useState, useEffect } from 'react';
import { Plus, Settings2, Trash2 } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';

const LeaveSettings = () => {
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [currentPolicy, setCurrentPolicy] = useState(null);

  const emptyPolicy = {
    name: '',
    annualQuota: 0,
    carryForward: false,
    maxCarryForward: 0,
    isPaid: true,
    allowNegativeBalance: false,
    requiresAttachment: false,
    leaveYearStartMonth: 1,
    leaveYearStartDay: 1
  };

  const [form, setForm] = useState(emptyPolicy);

  const fetchPolicies = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/leave/policies`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPolicies(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPolicies();
  }, []);

  const handleEdit = (policy) => {
    setCurrentPolicy(policy);
    setForm({
      name: policy.name,
      annualQuota: parseFloat(policy.annualQuota),
      carryForward: policy.carryForward,
      maxCarryForward: parseFloat(policy.maxCarryForward || 0),
      isPaid: policy.isPaid,
      allowNegativeBalance: policy.allowNegativeBalance,
      requiresAttachment: policy.requiresAttachment || false,
      leaveYearStartMonth: policy.leaveYearStartMonth || 1,
      leaveYearStartDay: policy.leaveYearStartDay || 1
    });
    setIsEditing(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to archive this policy?")) return;
    try {
      await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/leave/policies/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      fetchPolicies();
    } catch (e) {
      console.error(e);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const method = currentPolicy ? 'PUT' : 'POST';
      const url = currentPolicy 
        ? `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/leave/policies/${currentPolicy.id}`
        : `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/leave/policies`;

      const res = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}` 
        },
        body: JSON.stringify({
          ...form,
          annualQuota: Number(form.annualQuota),
          maxCarryForward: Number(form.maxCarryForward)
        })
      });

      if (!res.ok) {
        const data = await res.json().catch(()=>({}));
        alert(data.error || "Failed to save policy");
        return;
      }
      setIsEditing(false);
      fetchPolicies();
    } catch (e) {
      console.error(e);
      alert("An error occurred");
    }
  };

  return (
    <div className="p-4 md:p-8 lg:p-12 max-w-5xl mx-auto h-full flex flex-col">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-4xl font-bold text-slate-800 tracking-tight">Leave Settings</h1>
          <p className="text-slate-500 mt-2">Manage time off policies, accruals, and rules.</p>
        </div>
        <Button 
          onClick={() => { setCurrentPolicy(null); setForm(emptyPolicy); setIsEditing(true); }}
          className="rounded-full gap-2 justify-center shadow-lg shadow-indigo-600/20 px-6 font-bold bg-indigo-600 hover:bg-indigo-700 text-white"
        >
          <Plus size={18} /> New Policy
        </Button>
      </div>

      {isEditing ? (
        <Card className="p-6 shadow-sm border-slate-200">
          <h2 className="text-xl font-bold mb-6 text-slate-800">{currentPolicy ? 'Edit Policy' : 'Create New Policy'}</h2>
          <form onSubmit={handleSave} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Policy Name</label>
                <input 
                  type="text" required
                  value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                  className="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="e.g. Paid Time Off"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Annual Quota (Days)</label>
                <input 
                  type="number" required min="0" step="0.5"
                  value={form.annualQuota} onChange={e => setForm({...form, annualQuota: e.target.value})}
                  className="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div className="flex items-center gap-3 mt-4 md:mt-8">
                <input 
                  type="checkbox" 
                  checked={form.isPaid} onChange={e => setForm({...form, isPaid: e.target.checked})}
                  className="w-5 h-5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                />
                <label className="text-sm font-semibold text-slate-700">Is Paid Leave?</label>
              </div>
              <div className="flex items-center gap-3 mt-4 md:mt-8">
                <input 
                  type="checkbox" 
                  checked={form.allowNegativeBalance} onChange={e => setForm({...form, allowNegativeBalance: e.target.checked})}
                  className="w-5 h-5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                />
                <label className="text-sm font-semibold text-slate-700">Allow Negative Balance?</label>
              </div>
              <div className="flex items-center gap-3 mt-4 md:mt-8">
                <input 
                  type="checkbox" 
                  checked={form.requiresAttachment} onChange={e => setForm({...form, requiresAttachment: e.target.checked})}
                  className="w-5 h-5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                />
                <label className="text-sm font-semibold text-slate-700">Require Supporting Document?</label>
              </div>
              
              <div className="col-span-1 md:col-span-2 border-t border-slate-100 pt-6 mt-2">
                <h3 className="text-sm font-bold text-slate-800 mb-4 uppercase tracking-wider">Carry Forward Rules</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex items-center gap-3">
                    <input 
                      type="checkbox" 
                      checked={form.carryForward} onChange={e => setForm({...form, carryForward: e.target.checked})}
                      className="w-5 h-5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                    />
                    <label className="text-sm font-semibold text-slate-700">Enable Carry Forward at Year End</label>
                  </div>
                  {form.carryForward && (
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Max Carry Forward (Days)</label>
                      <input 
                        type="number" min="0" step="0.5"
                        value={form.maxCarryForward} onChange={e => setForm({...form, maxCarryForward: e.target.value})}
                        className="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
              <Button type="button" variant="ghost" onClick={() => setIsEditing(false)}>Cancel</Button>
              <Button type="submit" variant="primary">Save Policy</Button>
            </div>
          </form>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
             <p className="text-slate-500">Loading...</p>
          ) : policies.length === 0 ? (
             <div className="col-span-full p-8 text-center border-2 border-dashed border-slate-200 rounded-2xl">
               <p className="text-slate-500">No active policies found.</p>
             </div>
          ) : (
             policies.map(p => (
               <Card key={p.id} className="p-6 flex flex-col justify-between border-slate-200 shadow-sm hover:shadow-md transition-shadow group">
                 <div>
                   <div className="flex justify-between items-start mb-4">
                     <h3 className="text-lg font-bold text-slate-800">{p.name}</h3>
                     <span className={`px-2.5 py-1 rounded-md text-[10px] uppercase font-bold tracking-wider ${p.isPaid ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'}`}>
                       {p.isPaid ? 'Paid' : 'Unpaid'}
                     </span>
                   </div>
                   <div className="space-y-3">
                     <div className="flex justify-between text-sm">
                       <span className="text-slate-500 font-semibold">Annual Quota</span>
                       <span className="font-bold text-slate-700">{p.annualQuota} Days</span>
                     </div>
                     <div className="flex justify-between text-sm">
                       <span className="text-slate-500 font-semibold">Carry Forward</span>
                       <span className="font-bold text-slate-700">{p.carryForward ? `${p.maxCarryForward} Days` : 'Disabled'}</span>
                     </div>
                     <div className="flex justify-between text-sm">
                       <span className="text-slate-500 font-semibold">Negative Bal.</span>
                       <span className="font-bold text-slate-700">{p.allowNegativeBalance ? 'Allowed' : 'Not Allowed'}</span>
                     </div>
                   </div>
                 </div>
                 <div className="mt-6 flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                   <button 
                     onClick={() => handleEdit(p)}
                     className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                   >
                     <Settings2 size={18} />
                   </button>
                   <button 
                     onClick={() => handleDelete(p.id)}
                     className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                   >
                     <Trash2 size={18} />
                   </button>
                 </div>
               </Card>
             ))
          )}
        </div>
      )}
    </div>
  );
};

export default LeaveSettings;
