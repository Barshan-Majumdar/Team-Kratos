import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { Laptop, Monitor, Smartphone, Plus, Trash2, UserPlus, UserMinus, ShieldCheck, X } from 'lucide-react';
import { API_BASE } from '../../lib/api';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { motion, AnimatePresence } from 'framer-motion';

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

  const containerRef = useRef(null);

  // GSAP Choreographed Intro Sequence
  useGSAP(() => {
    if (loading) return;

    const tl = gsap.timeline({ defaults: { ease: "power4.out" } });

    tl.from('.intro-header', {
      y: -30,
      opacity: 0,
      duration: 0.8,
    })
    .from('.intro-asset-card', {
      scale: 0.85,
      opacity: 0,
      duration: 0.6,
      stagger: 0.08,
      clearProps: "all" // Allows CSS hover physics to take back over
    }, "-=0.5");

  }, { dependencies: [loading], scope: containerRef });

  const fetchAssets = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_BASE}/api/assets`, {
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
      const res = await axios.get(`${API_BASE}/api/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEmployees(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchAssets(), fetchEmployees()]).finally(() => setLoading(false));
  }, []);

  const handleAddAsset = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_BASE}/api/assets`, {
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
      await axios.post(`${API_BASE}/api/assets/${showAssignModal}/assign`, {
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
      await axios.post(`${API_BASE}/api/assets/${id}/unassign`, {
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
      await axios.delete(`${API_BASE}/api/assets/${id}`, {
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
      case 'Laptop': return <Laptop size={22} className="text-[#1F2B4D]" />;
      case 'Monitor': return <Monitor size={22} className="text-[#1F2B4D]" />;
      case 'Phone': return <Smartphone size={22} className="text-[#1F2B4D]" />;
      default: return <ShieldCheck size={22} className="text-[#1F2B4D]" />;
    }
  };

  const getStatusBadge = (status) => {
    if (status === 'Available') return 'bg-[#ECFDF5] text-[#065F46] border-[#A7F3D0]';
    if (status === 'Assigned') return 'bg-[#F0F3F9] text-[#1F2B4D] border-[#CBD5E1]';
    return 'bg-[#FEF2F2] text-[#B91C1C] border-[#FECACA]';
  };

  const modalVariants = {
    hidden: { opacity: 0, scale: 0.95, y: 20 },
    visible: { 
      opacity: 1, 
      scale: 1, 
      y: 0,
      transition: { type: 'spring', stiffness: 260, damping: 25 }
    },
    exit: { 
      opacity: 0, 
      scale: 0.95, 
      y: 10,
      transition: { duration: 0.2, ease: "easeInOut" }
    }
  };

  return (
    <div ref={containerRef} className="p-4 md:p-8 lg:p-12 min-h-screen bg-[#FAF9F6]">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="intro-header flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-[28px] font-bold text-[#1D1B16] tracking-tight">Asset Directory</h1>
            <p className="text-[#6B655C] text-[13.5px] mt-1 font-medium">Manage company equipment and track employee assignments.</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="relative overflow-hidden group flex items-center gap-2 bg-[#1F2B4D] border border-[#141C33] text-white px-6 py-3 rounded-xl font-bold shadow-md transition-all duration-300 active:scale-95 whitespace-nowrap"
          >
            <span className="absolute inset-0 bg-[#0F172A] translate-y-[100%] group-hover:translate-y-0 transition-transform duration-500 cubic-bezier(0.34, 1.56, 0.64, 1) z-0" />
            <Plus size={18} className="relative z-10 text-white" />
            <span className="relative z-10 text-white">Add New Asset</span>
          </button>
        </div>

        {/* Assets Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {loading ? (
             <div className="col-span-full py-12 text-center text-[#6B655C] font-medium">Loading Assets...</div>
          ) : assets.length === 0 ? (
            <div className="col-span-full py-20 text-center">
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center gap-4"
              >
                <div className="w-16 h-16 rounded-full bg-[#F4F1EA] border border-[#EAE7E0] shadow-sm flex items-center justify-center">
                  <Laptop size={28} className="text-[#9A948A]" />
                </div>
                <div>
                  <span className="text-[19px] font-bold text-[#1D1B16] block tracking-tight">No Assets Found</span>
                  <span className="text-[13px] text-[#6B655C] font-medium mt-1 block">Start adding company equipment to track them here.</span>
                </div>
              </motion.div>
            </div>
          ) : (
            assets.map(asset => (
              <div key={asset.id} className="intro-asset-card double-bezel-outer bg-[#F4F1EA] p-1.5 group hover:-translate-y-[2px] transition-all duration-500 cubic-bezier(0.34, 1.56, 0.64, 1)">
                <div className="double-bezel-inner bg-white h-full p-6 flex flex-col">
                  
                  <div className="flex justify-between items-start mb-5 relative">
                    <div className="bg-[#FAF9F6] border border-[#EAE7E0] p-3 rounded-2xl shadow-sm">
                      {getCategoryIcon(asset.category)}
                    </div>
                    {/* Floating Delete Button on Hover */}
                    <button 
                      onClick={() => handleDeleteAsset(asset.id)} 
                      className="absolute top-0 right-0 p-2 text-[#B91C1C] bg-[#FEF2F2] border border-[#FECACA] rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-[#FEE2E2] active:scale-95 shadow-sm"
                      title="Delete Asset"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  
                  <h3 className="font-bold text-[#1D1B16] text-[16px] truncate tracking-tight">{asset.name}</h3>
                  <p className="text-[11px] text-[#9A948A] font-bold uppercase tracking-wider mt-1 mb-5 truncate">SN: {asset.serialNumber || 'N/A'}</p>
                  
                  <div className="mt-auto pt-5 border-t border-[#F4F1EA] flex items-end justify-between">
                    <div>
                      <span className={`inline-flex px-2.5 py-1 rounded-[6px] text-[10px] font-bold uppercase tracking-wider border shadow-xs ${getStatusBadge(asset.status)}`}>
                        {asset.status}
                      </span>
                      {asset.assignedTo && (
                        <p className="text-[12px] font-bold text-[#1D1B16] mt-2 truncate max-w-[140px]" title={asset.assignedTo.displayName}>
                          {asset.assignedTo.displayName}
                        </p>
                      )}
                    </div>
                    
                    {asset.status === 'Available' ? (
                      <button 
                        onClick={() => setShowAssignModal(asset.id)} 
                        className="p-2.5 text-[#1F2B4D] bg-[#F0F3F9] hover:bg-[#E2E8F0] border border-[#CBD5E1] rounded-xl transition-colors shadow-sm active:scale-95" 
                        title="Assign Asset"
                      >
                        <UserPlus size={16} />
                      </button>
                    ) : asset.status === 'Assigned' ? (
                      <button 
                        onClick={() => handleUnassignAsset(asset.id)} 
                        className="p-2.5 text-[#B91C1C] bg-[#FEF2F2] hover:bg-[#FEE2E2] border border-[#FECACA] rounded-xl transition-colors shadow-sm active:scale-95" 
                        title="Unassign Asset"
                      >
                        <UserMinus size={16} />
                      </button>
                    ) : null}
                  </div>

                </div>
              </div>
            ))
          )}
        </div>

        {/* Modals via AnimatePresence */}
        <AnimatePresence>
          {showAddModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 bg-[#0F172A]/40 backdrop-blur-md"
                onClick={() => setShowAddModal(false)}
              />
              <motion.div 
                variants={modalVariants} initial="hidden" animate="visible" exit="exit"
                className="relative w-full max-w-lg bg-white rounded-[24px] shadow-2xl border border-[#EAE7E0] overflow-hidden"
              >
                <div className="flex items-center justify-between p-6 border-b border-[#F4F1EA] bg-[#FAF9F6]">
                  <h2 className="text-xl font-bold text-[#1D1B16] tracking-tight">Add New Asset</h2>
                  <button onClick={() => setShowAddModal(false)} className="p-1.5 text-[#9A948A] hover:text-[#1D1B16] hover:bg-[#EAE7E0] rounded-full transition-colors">
                    <X size={20} />
                  </button>
                </div>
                <form onSubmit={handleAddAsset} className="p-6 space-y-5 bg-white">
                  <div>
                    <label className="block text-[11px] font-bold text-[#6B655C] uppercase tracking-wider mb-2">Asset Name</label>
                    <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className="w-full p-4 bg-[#FAF9F6] border border-[#EAE7E0] rounded-xl focus:ring-2 focus:ring-[#1F2B4D] outline-none text-[#1D1B16] font-bold transition-all placeholder:text-[#9A948A] placeholder:font-medium" placeholder="e.g. MacBook Pro M3" />
                  </div>
                  <div className="grid grid-cols-2 gap-5">
                    <div>
                      <label className="block text-[11px] font-bold text-[#6B655C] uppercase tracking-wider mb-2">Category</label>
                      <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full p-4 bg-[#FAF9F6] border border-[#EAE7E0] rounded-xl focus:ring-2 focus:ring-[#1F2B4D] outline-none text-[#1D1B16] font-bold transition-all appearance-none pr-10 bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2224%22%20height%3D%2224%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20stroke%3D%22%236B655C%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-[length:16px_16px] bg-[right_16px_center] bg-no-repeat">
                        <option>Laptop</option>
                        <option>Monitor</option>
                        <option>Phone</option>
                        <option>Accessory</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-[#6B655C] uppercase tracking-wider mb-2">Condition</label>
                      <select value={condition} onChange={(e) => setCondition(e.target.value)} className="w-full p-4 bg-[#FAF9F6] border border-[#EAE7E0] rounded-xl focus:ring-2 focus:ring-[#1F2B4D] outline-none text-[#1D1B16] font-bold transition-all appearance-none pr-10 bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2224%22%20height%3D%2224%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20stroke%3D%22%236B655C%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-[length:16px_16px] bg-[right_16px_center] bg-no-repeat">
                        <option>New</option>
                        <option>Good</option>
                        <option>Fair</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-[#6B655C] uppercase tracking-wider mb-2">Serial Number</label>
                    <input type="text" value={serialNumber} onChange={(e) => setSerialNumber(e.target.value)} className="w-full p-4 bg-[#FAF9F6] border border-[#EAE7E0] rounded-xl focus:ring-2 focus:ring-[#1F2B4D] outline-none text-[#1D1B16] font-bold transition-all placeholder:text-[#9A948A] placeholder:font-medium" placeholder="Optional" />
                  </div>
                  <div className="pt-6 flex justify-end gap-3 border-t border-[#F4F1EA]">
                    <button type="button" onClick={() => setShowAddModal(false)} className="px-6 py-3 border border-[#EAE7E0] bg-white text-[#1D1B16] font-bold rounded-xl hover:bg-[#FAF9F6] transition-colors active:scale-95">Cancel</button>
                    <button type="submit" className="relative overflow-hidden group flex items-center justify-center gap-2 bg-[#1F2B4D] border border-[#141C33] text-white px-8 py-3 rounded-xl font-bold shadow-md transition-all duration-300 active:scale-95 whitespace-nowrap">
                      <span className="absolute inset-0 bg-[#0F172A] translate-y-[100%] group-hover:translate-y-0 transition-transform duration-500 cubic-bezier(0.34, 1.56, 0.64, 1) z-0" />
                      <span className="relative z-10 text-white">Add Asset</span>
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showAssignModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 bg-[#0F172A]/40 backdrop-blur-md"
                onClick={() => setShowAssignModal(null)}
              />
              <motion.div 
                variants={modalVariants} initial="hidden" animate="visible" exit="exit"
                className="relative w-full max-w-lg bg-white rounded-[24px] shadow-2xl border border-[#EAE7E0] overflow-hidden"
              >
                <div className="flex items-center justify-between p-6 border-b border-[#F4F1EA] bg-[#FAF9F6]">
                  <h2 className="text-xl font-bold text-[#1D1B16] tracking-tight">Assign Asset</h2>
                  <button onClick={() => setShowAssignModal(null)} className="p-1.5 text-[#9A948A] hover:text-[#1D1B16] hover:bg-[#EAE7E0] rounded-full transition-colors">
                    <X size={20} />
                  </button>
                </div>
                <form onSubmit={handleAssignAsset} className="p-6 space-y-5 bg-white">
                  <div>
                    <label className="block text-[11px] font-bold text-[#6B655C] uppercase tracking-wider mb-2">Select Employee</label>
                    <select required value={assignUserId} onChange={(e) => setAssignUserId(e.target.value)} className="w-full p-4 bg-[#FAF9F6] border border-[#EAE7E0] rounded-xl focus:ring-2 focus:ring-[#1F2B4D] outline-none text-[#1D1B16] font-bold transition-all appearance-none pr-10 bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2224%22%20height%3D%2224%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20stroke%3D%22%236B655C%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-[length:16px_16px] bg-[right_16px_center] bg-no-repeat">
                      <option value="" disabled>-- Choose Employee --</option>
                      {employees.map(emp => (
                        <option key={emp.id} value={emp.id}>{emp.displayName} ({emp.email})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-[#6B655C] uppercase tracking-wider mb-2">Current Condition</label>
                    <select value={assignCondition} onChange={(e) => setAssignCondition(e.target.value)} className="w-full p-4 bg-[#FAF9F6] border border-[#EAE7E0] rounded-xl focus:ring-2 focus:ring-[#1F2B4D] outline-none text-[#1D1B16] font-bold transition-all appearance-none pr-10 bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2224%22%20height%3D%2224%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20stroke%3D%22%236B655C%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-[length:16px_16px] bg-[right_16px_center] bg-no-repeat">
                      <option>New</option>
                      <option>Good</option>
                      <option>Fair</option>
                    </select>
                  </div>
                  <div className="pt-6 flex justify-end gap-3 border-t border-[#F4F1EA]">
                    <button type="button" onClick={() => setShowAssignModal(null)} className="px-6 py-3 border border-[#EAE7E0] bg-white text-[#1D1B16] font-bold rounded-xl hover:bg-[#FAF9F6] transition-colors active:scale-95">Cancel</button>
                    <button type="submit" className="relative overflow-hidden group flex items-center justify-center gap-2 bg-[#1F2B4D] border border-[#141C33] text-white px-8 py-3 rounded-xl font-bold shadow-md transition-all duration-300 active:scale-95 whitespace-nowrap">
                      <span className="absolute inset-0 bg-[#0F172A] translate-y-[100%] group-hover:translate-y-0 transition-transform duration-500 cubic-bezier(0.34, 1.56, 0.64, 1) z-0" />
                      <span className="relative z-10 text-white">Assign</span>
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
};

export default AssetDirectory;
