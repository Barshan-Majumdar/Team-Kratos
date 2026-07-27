import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { Laptop, Monitor, Smartphone, Plus, Trash2, Edit2, UserPlus, UserMinus, ShieldCheck } from 'lucide-react';

const AssetDirectory = () => {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(null); // Asset ID

  // Form states
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Laptop');
  const [serialNumber, setSerialNumber] = useState('');
  const [condition, setCondition] = useState('New');

  const [assignUserId, setAssignUserId] = useState('');
  const [assignCondition, setAssignCondition] = useState('Good');

  const fetchAssets = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/assets`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAssets(res.data);
    } catch (err) {
      toast.error('Failed to load assets');
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEmployees(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchAssets();
    fetchEmployees();
  }, []);

  const handleAddAsset = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/assets`, {
        name, category, serialNumber, condition
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Asset added successfully');
      setShowAddModal(false);
      setName('');
      setSerialNumber('');
      fetchAssets();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to add asset');
    }
  };

  const handleAssignAsset = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/assets/${showAssignModal}/assign`, {
        userId: assignUserId, condition: assignCondition
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Asset assigned successfully');
      setShowAssignModal(null);
      fetchAssets();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to assign asset');
    }
  };

  const handleUnassignAsset = async (id) => {
    if (!window.confirm('Are you sure you want to unassign this asset?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/assets/${id}/unassign`, {
        condition: 'Good' // Default condition when returning
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Asset returned to inventory');
      fetchAssets();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to unassign asset');
    }
  };

  const handleDeleteAsset = async (id) => {
    if (!window.confirm('Delete this asset entirely?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/assets/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Asset deleted');
      fetchAssets();
    } catch (err) {
      toast.error('Failed to delete asset');
    }
  };

  const getCategoryIcon = (cat) => {
    switch(cat) {
      case 'Laptop': return <Laptop size={20} className="text-indigo-500" />;
      case 'Monitor': return <Monitor size={20} className="text-blue-500" />;
      case 'Phone': return <Smartphone size={20} className="text-emerald-500" />;
      default: return <ShieldCheck size={20} className="text-slate-500" />;
    }
  };

  if (loading) return <div className="p-8 text-center text-text-secondary font-medium">Loading asset inventory...</div>;

  return (
    <div className="p-4 md:p-8 lg:p-12 max-w-7xl mx-auto space-y-8 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-text-primary tracking-tight">Asset Directory</h1>
          <p className="text-text-secondary mt-1 text-lg">Manage company equipment and track assignments.</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-accent-primary text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-accent-hover transition-all shadow-sm active:scale-95 whitespace-nowrap"
        >
          <Plus size={18} /> Add New Asset
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {assets.map(asset => (
          <div key={asset.id} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100/60 hover:shadow-md transition-all flex flex-col group">
            <div className="flex justify-between items-start mb-4">
              <div className="bg-slate-50 p-3 rounded-xl">
                {getCategoryIcon(asset.category)}
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => handleDeleteAsset(asset.id)} className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            
            <h3 className="font-bold text-text-primary text-lg truncate">{asset.name}</h3>
            <p className="text-sm text-text-secondary mt-0.5 mb-4 truncate">SN: {asset.serialNumber || 'N/A'}</p>
            
            <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between">
              <div>
                <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${
                  asset.status === 'Available' ? 'bg-emerald-100 text-emerald-700' :
                  asset.status === 'Assigned' ? 'bg-indigo-100 text-indigo-700' :
                  'bg-rose-100 text-rose-700'
                }`}>
                  {asset.status}
                </span>
                {asset.assignedTo && (
                  <p className="text-xs font-medium text-text-primary mt-1 truncate max-w-[120px]">
                    {asset.assignedTo.displayName}
                  </p>
                )}
              </div>
              
              {asset.status === 'Available' ? (
                <button onClick={() => setShowAssignModal(asset.id)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors" title="Assign Asset">
                  <UserPlus size={18} />
                </button>
              ) : asset.status === 'Assigned' ? (
                <button onClick={() => handleUnassignAsset(asset.id)} className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl transition-colors" title="Unassign Asset">
                  <UserMinus size={18} />
                </button>
              ) : null}
            </div>
          </div>
        ))}

        {assets.length === 0 && (
          <div className="col-span-full py-16 text-center bg-slate-50/50 rounded-3xl border border-dashed border-slate-200">
            <Laptop size={48} className="mx-auto text-slate-300 mb-4" />
            <h3 className="text-lg font-bold text-slate-700">No assets found</h3>
            <p className="text-slate-500 mt-1">Start adding company equipment to track them here.</p>
          </div>
        )}
      </div>

      {/* Add Asset Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-scale-in">
            <div className="p-6 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-800">Add New Asset</h2>
            </div>
            <form onSubmit={handleAddAsset} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Asset Name</label>
                <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all" placeholder="e.g. MacBook Pro M3" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Category</label>
                  <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 transition-all">
                    <option>Laptop</option>
                    <option>Monitor</option>
                    <option>Phone</option>
                    <option>Accessory</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Condition</label>
                  <select value={condition} onChange={(e) => setCondition(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 transition-all">
                    <option>New</option>
                    <option>Good</option>
                    <option>Fair</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Serial Number</label>
                <input type="text" value={serialNumber} onChange={(e) => setSerialNumber(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all" placeholder="Optional" />
              </div>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 font-semibold rounded-xl hover:bg-slate-50 transition-colors">Cancel</button>
                <button type="submit" className="flex-1 px-4 py-2.5 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-colors">Add Asset</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-scale-in">
            <div className="p-6 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-800">Assign Asset</h2>
            </div>
            <form onSubmit={handleAssignAsset} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Select Employee</label>
                <select required value={assignUserId} onChange={(e) => setAssignUserId(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 transition-all">
                  <option value="">-- Choose Employee --</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.displayName} ({emp.email})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Current Condition</label>
                <select value={assignCondition} onChange={(e) => setAssignCondition(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 transition-all">
                  <option>New</option>
                  <option>Good</option>
                  <option>Fair</option>
                </select>
              </div>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setShowAssignModal(null)} className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 font-semibold rounded-xl hover:bg-slate-50 transition-colors">Cancel</button>
                <button type="submit" className="flex-1 px-4 py-2.5 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-colors">Assign</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssetDirectory;
