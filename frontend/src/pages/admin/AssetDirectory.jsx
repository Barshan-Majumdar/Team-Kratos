import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { Laptop, Monitor, Smartphone, Plus, Trash2, UserPlus, UserMinus, ShieldCheck, X, Search, HardDrive, CheckCircle2, AlertTriangle, Cpu } from 'lucide-react';
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
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');

  // Form states
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Laptop');
  const [serialNumber, setSerialNumber] = useState('');
  const [condition, setCondition] = useState('New');

  const [assignUserId, setAssignUserId] = useState('');
  const [assignCondition, setAssignCondition] = useState('Good');

  const containerRef = useRef(null);

  // GSAP Choreographed Intro Sequence (Safely Guarded Target Selectors)
  useGSAP(() => {
    if (loading) return;

    const container = containerRef.current;
    if (!container) return;

    const introHeader = container.querySelector('.intro-header');
    const introKpis = container.querySelectorAll('.intro-kpi');
    const introFilters = container.querySelector('.intro-filters');
    const introAssetCards = container.querySelectorAll('.intro-asset-card');

    const tl = gsap.timeline({ defaults: { ease: "power4.out" } });

    if (introHeader) tl.from(introHeader, { y: -20, opacity: 0, duration: 0.6 });
    if (introKpis.length > 0) tl.from(introKpis, { scale: 0.9, opacity: 0, duration: 0.5, stagger: 0.08, clearProps: "all" }, "-=0.3");
    if (introFilters) tl.from(introFilters, { y: 15, opacity: 0, duration: 0.4 }, "-=0.2");
    if (introAssetCards.length > 0) {
      tl.from(introAssetCards, {
        scale: 0.9,
        opacity: 0,
        duration: 0.5,
        stagger: 0.06,
        clearProps: "all"
      }, "-=0.2");
    }

  }, { dependencies: [loading], scope: containerRef });

  const fetchAssets = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_BASE}/api/assets`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAssets(res.data || []);
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
      setEmployees(res.data || []);
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
    if (!await window.confirmDialog()) return;
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_BASE}/api/assets/${id}/unassign`, {
        condition: 'Good'
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
    if (!await window.confirmDialog()) return;
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
      case 'Laptop': return <Laptop size={18} className="text-[#1F2B4D]" />;
      case 'Monitor': return <Monitor size={18} className="text-[#1F2B4D]" />;
      case 'Phone': return <Smartphone size={18} className="text-[#1F2B4D]" />;
      default: return <Cpu size={18} className="text-[#1F2B4D]" />;
    }
  };

  const getStatusBadge = (status) => {
    if (status === 'Available') return 'bg-emerald-50 text-emerald-800 border-emerald-200';
    if (status === 'Assigned') return 'bg-[#F0F3F9] text-[#1F2B4D] border-[#CBD5E1]';
    return 'bg-rose-50 text-rose-800 border-rose-200';
  };

  // Metric Computations
  const totalAssetsCount = assets.length;
  const availableCount = assets.filter(a => a.status === 'Available').length;
  const assignedCount = assets.filter(a => a.status === 'Assigned').length;
  const uniqueCategories = new Set(assets.map(a => a.category)).size;

  // Filtered Assets
  const filteredAssets = assets.filter(asset => {
    const matchesSearch = asset.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (asset.serialNumber && asset.serialNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
                          (asset.assignedTo && asset.assignedTo.displayName.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = categoryFilter === 'All' || asset.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const categoryTabs = [
    { key: 'All', fullLabel: 'All', shortLabel: 'All' },
    { key: 'Laptop', fullLabel: 'Laptop', shortLabel: 'Lap' },
    { key: 'Monitor', fullLabel: 'Monitor', shortLabel: 'Mon' },
    { key: 'Phone', fullLabel: 'Phone', shortLabel: 'Phon' },
    { key: 'Accessory', fullLabel: 'Accessory', shortLabel: 'Acc' },
  ];

  const modalVariants = {
    hidden: { opacity: 0, scale: 0.95, y: 10 },
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
      transition: { duration: 0.15 }
    }
  };

  return (
    <div ref={containerRef} className="w-full min-h-full flex flex-col gap-3.5 sm:gap-4 p-3 sm:p-5 md:p-6 bg-[#FAF9F6]">
      
      {/* ── TOP EXECUTIVE HEADER ── */}
      <div className="intro-header flex flex-col min-[600px]:flex-row min-[600px]:items-center justify-between gap-2.5 pb-3 border-b border-[#EAE7E0] w-full">
        <div>
          <h1 className="font-serif font-bold text-lg sm:text-2xl md:text-3xl text-[#1F2B4D] tracking-tight leading-tight flex items-center gap-2.5">
            <div className="p-1.5 bg-white rounded-xl shadow-2xs border border-[#EAE7E0]">
              <HardDrive className="text-[#1F2B4D] w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <span>Asset Directory & Hardware</span>
          </h1>
          <p className="text-[#6B655C] mt-0.5 text-xs sm:text-sm font-medium">
            Track company equipment, serial numbers, and employee hardware assignments.
          </p>
        </div>
        
        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="relative overflow-hidden group inline-flex items-center justify-center gap-1.5 bg-white border border-[#EAE7E0] text-[#1F2B4D] px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs font-display font-bold uppercase tracking-wider shadow-2xs transition-all duration-300 hover:border-[#1F2B4D] active:scale-95 whitespace-nowrap shrink-0 w-full min-[600px]:w-auto"
        >
          <span className="absolute inset-0 bg-[#1F2B4D] translate-y-[100%] group-hover:translate-y-0 transition-transform duration-500 cubic-bezier(0.34, 1.56, 0.64, 1) z-0" />
          <Plus size={15} className="relative z-10 text-[#1F2B4D] group-hover:text-white transition-colors duration-300 shrink-0" />
          <span className="relative z-10 group-hover:text-white transition-colors duration-300">Add New Asset</span>
        </button>
      </div>

      {/* ── STATS BOARD (2x2 MOBILE / 4x1 DESKTOP) ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5 w-full">
        <div className="intro-kpi bg-white p-3.5 sm:p-4 rounded-2xl border border-[#EAE7E0] shadow-2xs flex flex-col justify-between">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[9.5px] sm:text-[10.5px] font-display font-bold uppercase tracking-wider text-[#6B655C]">Total Assets</span>
            <div className="p-1.5 bg-[#FAF8F5] rounded-xl border border-[#EAE7E0] text-[#1F2B4D]">
              <HardDrive size={16} />
            </div>
          </div>
          <span className="text-xl sm:text-2xl font-bold text-[#1F2B4D] tracking-tight">{totalAssetsCount}</span>
        </div>

        <div className="intro-kpi bg-white p-3.5 sm:p-4 rounded-2xl border border-[#EAE7E0] shadow-2xs flex flex-col justify-between">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[9.5px] sm:text-[10.5px] font-display font-bold uppercase tracking-wider text-emerald-800">Available</span>
            <div className="p-1.5 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-800">
              <CheckCircle2 size={16} />
            </div>
          </div>
          <span className="text-xl sm:text-2xl font-bold text-emerald-800 tracking-tight">{availableCount}</span>
        </div>

        <div className="intro-kpi bg-white p-3.5 sm:p-4 rounded-2xl border border-[#EAE7E0] shadow-2xs flex flex-col justify-between">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[9.5px] sm:text-[10.5px] font-display font-bold uppercase tracking-wider text-[#1F2B4D]">Assigned</span>
            <div className="p-1.5 bg-[#F0F3F9] rounded-xl border border-[#CBD5E1] text-[#1F2B4D]">
              <UserPlus size={16} />
            </div>
          </div>
          <span className="text-xl sm:text-2xl font-bold text-[#1F2B4D] tracking-tight">{assignedCount}</span>
        </div>

        <div className="intro-kpi bg-white p-3.5 sm:p-4 rounded-2xl border border-[#EAE7E0] shadow-2xs flex flex-col justify-between">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[9.5px] sm:text-[10.5px] font-display font-bold uppercase tracking-wider text-[#6B655C]">Categories</span>
            <div className="p-1.5 bg-[#FAF8F5] rounded-xl border border-[#EAE7E0] text-[#1F2B4D]">
              <Cpu size={16} />
            </div>
          </div>
          <span className="text-xl sm:text-2xl font-bold text-[#1F2B4D] tracking-tight">{uniqueCategories}</span>
        </div>
      </div>

      {/* ── FILTER CONTROL BAR & SEARCH (LOCKED SINGLE-LINE ZERO SLIDING) ── */}
      <div className="intro-filters bg-white p-1.5 sm:p-2 rounded-2xl border border-[#EAE7E0] shadow-2xs flex items-center gap-1.5 sm:gap-2.5 w-full overflow-hidden shrink-0">
        
        {/* Search Input */}
        <div className="relative flex-1 min-w-0">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#6B655C] shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-2 py-1 sm:py-1.5 bg-[#FAF8F5] border border-[#EAE7E0] rounded-xl text-[10px] min-[360px]:text-[11px] sm:text-xs font-bold text-[#1F2B4D] focus:ring-2 focus:ring-[#1F2B4D] outline-none placeholder:text-[#9A948A] transition-all truncate"
            placeholder="Search assets..."
          />
        </div>

        {/* Category Filter Chips (Locked Single Line) */}
        <div className="flex items-center gap-0.5 sm:gap-1 bg-[#EAE7E0] p-0.5 sm:p-1 rounded-xl overflow-hidden shrink-0 shadow-2xs">
          {categoryTabs.map(tab => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setCategoryFilter(tab.key)}
              className={`px-1 min-[360px]:px-1.5 min-[480px]:px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[8px] min-[360px]:text-[9px] min-[480px]:text-[10.5px] sm:text-xs font-display font-bold uppercase tracking-tight flex items-center justify-center transition-all whitespace-nowrap shrink-0 text-center ${
                categoryFilter === tab.key
                  ? 'bg-[#1F2B4D] text-white shadow-2xs'
                  : 'bg-transparent text-[#6B655C] hover:bg-[#F4F1EA] hover:text-[#1F2B4D]'
              }`}
            >
              <span className="truncate">
                <span className="hidden min-[480px]:inline">{tab.fullLabel}</span>
                <span className="inline min-[480px]:hidden">{tab.shortLabel}</span>
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ── ASSETS GRID ── */}
      <div className="grid grid-cols-1 min-[480px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 w-full flex-1">
        {loading ? (
           <div className="col-span-full py-12 text-center text-[#6B655C] font-medium text-xs">Loading Assets...</div>
        ) : filteredAssets.length === 0 ? (
          <div className="col-span-full py-16 text-center flex flex-col items-center justify-center bg-white rounded-2xl border border-dashed border-[#EAE7E0] p-6 w-full flex-1">
            <div className="w-12 h-12 rounded-2xl bg-[#FAF8F5] border border-[#EAE7E0] flex items-center justify-center text-[#1F2B4D] mb-3 shadow-2xs">
              <Laptop size={24} />
            </div>
            <h3 className="text-base font-serif font-bold text-[#1F2B4D]">No Assets Found</h3>
            <p className="text-xs text-[#6B655C] font-medium max-w-xs mt-1 leading-relaxed">
              {searchQuery || categoryFilter !== 'All' ? 'No assets match your search or filter criteria.' : 'Start adding company equipment to track assignments.'}
            </p>
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="mt-4 bg-[#1F2B4D] hover:bg-[#141C33] text-white font-display font-bold text-xs uppercase tracking-wider px-4 py-2 rounded-xl transition-all shadow-2xs inline-flex items-center gap-1.5"
            >
              <Plus size={14} className="shrink-0" />
              <span>Add First Asset</span>
            </button>
          </div>
        ) : (
          filteredAssets.map(asset => (
            <div key={asset.id} className="intro-asset-card double-bezel-outer bg-[#F4F1EA] p-1 rounded-2xl group hover:border-[#1F2B4D]/20 transition-all flex flex-col">
              <div className="double-bezel-inner bg-white rounded-xl p-3.5 sm:p-4 flex flex-col justify-between h-full w-full relative overflow-hidden">
                
                <div>
                  <div className="flex justify-between items-start mb-3 gap-2">
                    <div className="p-2 bg-[#FAF8F5] border border-[#EAE7E0] rounded-xl shadow-2xs shrink-0">
                      {getCategoryIcon(asset.category)}
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[8.5px] font-display font-bold uppercase tracking-wider border shadow-2xs shrink-0 ${getStatusBadge(asset.status)}`}>
                      {asset.status}
                    </span>
                  </div>

                  <h3 className="font-serif font-bold text-sm sm:text-base text-[#1F2B4D] tracking-tight leading-snug truncate" title={asset.name}>
                    {asset.name}
                  </h3>
                  <p className="text-[9.5px] font-mono text-[#6B655C] font-bold uppercase tracking-wider mt-0.5 truncate">
                    SN: {asset.serialNumber || 'N/A'}
                  </p>
                </div>

                <div className="mt-3 pt-3 border-t border-[#F4F1EA] flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <span className="text-[9px] font-display font-bold text-[#6B655C] uppercase tracking-wider block">Assigned To</span>
                    {asset.assignedTo ? (
                      <p className="text-xs font-bold text-[#1F2B4D] truncate mt-0.5" title={asset.assignedTo.displayName}>
                        {asset.assignedTo.displayName}
                      </p>
                    ) : (
                      <p className="text-xs font-medium text-[#6B655C] italic mt-0.5">Unassigned</p>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {asset.status === 'Available' ? (
                      <button 
                        type="button"
                        onClick={() => setShowAssignModal(asset.id)} 
                        className="p-1.5 text-[#1F2B4D] bg-[#F0F3F9] hover:bg-[#E2E8F0] border border-[#CBD5E1] rounded-lg transition-colors shadow-2xs" 
                        title="Assign Asset"
                      >
                        <UserPlus size={14} />
                      </button>
                    ) : asset.status === 'Assigned' ? (
                      <button 
                        type="button"
                        onClick={() => handleUnassignAsset(asset.id)} 
                        className="p-1.5 text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors shadow-2xs" 
                        title="Return Asset to Inventory"
                      >
                        <UserMinus size={14} />
                      </button>
                    ) : null}

                    <button 
                      type="button"
                      onClick={() => handleDeleteAsset(asset.id)} 
                      className="p-1.5 text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors shadow-2xs"
                      title="Delete Asset"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

              </div>
            </div>
          ))
        )}
      </div>

      {/* ── MODALS (ADD ASSET & ASSIGN ASSET) ── */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-[#0F172A]/40 backdrop-blur-xs"
              onClick={() => setShowAddModal(false)}
            />
            <motion.div 
              variants={modalVariants} initial="hidden" animate="visible" exit="exit"
              className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-[#EAE7E0] overflow-hidden z-10 max-h-[92vh] flex flex-col"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-[#EAE7E0] bg-[#FAF8F5] shrink-0">
                <h2 className="font-serif font-bold text-sm sm:text-base text-[#1F2B4D]">Add New Asset</h2>
                <button type="button" onClick={() => setShowAddModal(false)} className="p-1 text-[#6B655C] hover:text-[#1F2B4D]">
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleAddAsset} className="p-4 sm:p-5 space-y-3.5 overflow-y-auto flex-1 bg-white">
                <div>
                  <label className="block text-[10px] font-display font-bold text-[#6B655C] uppercase tracking-wider mb-1">Asset Name</label>
                  <input 
                    type="text" required value={name} onChange={(e) => setName(e.target.value)} 
                    className="w-full px-3 py-2 bg-white border border-[#EAE7E0] rounded-xl text-xs font-bold text-[#1F2B4D] focus:ring-2 focus:ring-[#1F2B4D] outline-none placeholder:text-[#9A948A]" 
                    placeholder="e.g. MacBook Pro M3 Max" 
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-display font-bold text-[#6B655C] uppercase tracking-wider mb-1">Category</label>
                    <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full px-3 py-2 bg-white border border-[#EAE7E0] rounded-xl text-xs font-bold text-[#1F2B4D] focus:ring-2 focus:ring-[#1F2B4D] outline-none">
                      <option>Laptop</option>
                      <option>Monitor</option>
                      <option>Phone</option>
                      <option>Accessory</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-display font-bold text-[#6B655C] uppercase tracking-wider mb-1">Condition</label>
                    <select value={condition} onChange={(e) => setCondition(e.target.value)} className="w-full px-3 py-2 bg-white border border-[#EAE7E0] rounded-xl text-xs font-bold text-[#1F2B4D] focus:ring-2 focus:ring-[#1F2B4D] outline-none">
                      <option>New</option>
                      <option>Good</option>
                      <option>Fair</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-display font-bold text-[#6B655C] uppercase tracking-wider mb-1">Serial Number</label>
                  <input 
                    type="text" value={serialNumber} onChange={(e) => setSerialNumber(e.target.value)} 
                    className="w-full px-3 py-2 bg-white border border-[#EAE7E0] rounded-xl text-xs font-bold text-[#1F2B4D] focus:ring-2 focus:ring-[#1F2B4D] outline-none placeholder:text-[#9A948A]" 
                    placeholder="e.g. C02G1234MD6R (Optional)" 
                  />
                </div>

                <div className="pt-3 border-t border-[#F4F1EA] flex flex-col-reverse sm:flex-row justify-end gap-2 shrink-0">
                  <button type="button" onClick={() => setShowAddModal(false)} className="w-full sm:w-auto px-4 py-1.5 border border-[#EAE7E0] bg-white text-[#1F2B4D] text-xs font-display font-bold rounded-xl hover:bg-[#FAF8F5]">Cancel</button>
                  <button type="submit" className="w-full sm:w-auto px-5 py-1.5 bg-[#1F2B4D] hover:bg-[#141C33] text-white text-xs font-display font-bold uppercase tracking-wider rounded-xl shadow-2xs text-center">
                    Add Asset
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAssignModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-[#0F172A]/40 backdrop-blur-xs"
              onClick={() => setShowAssignModal(null)}
            />
            <motion.div 
              variants={modalVariants} initial="hidden" animate="visible" exit="exit"
              className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-[#EAE7E0] overflow-hidden z-10 max-h-[92vh] flex flex-col"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-[#EAE7E0] bg-[#FAF8F5] shrink-0">
                <h2 className="font-serif font-bold text-sm sm:text-base text-[#1F2B4D]">Assign Hardware Asset</h2>
                <button type="button" onClick={() => setShowAssignModal(null)} className="p-1 text-[#6B655C] hover:text-[#1F2B4D]">
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleAssignAsset} className="p-4 sm:p-5 space-y-3.5 overflow-y-auto flex-1 bg-white">
                <div>
                  <label className="block text-[10px] font-display font-bold text-[#6B655C] uppercase tracking-wider mb-1">Select Employee</label>
                  <select required value={assignUserId} onChange={(e) => setAssignUserId(e.target.value)} className="w-full px-3 py-2 bg-white border border-[#EAE7E0] rounded-xl text-xs font-bold text-[#1F2B4D] focus:ring-2 focus:ring-[#1F2B4D] outline-none">
                    <option value="" disabled>-- Choose Employee --</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.displayName} ({emp.email})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-display font-bold text-[#6B655C] uppercase tracking-wider mb-1">Current Condition</label>
                  <select value={assignCondition} onChange={(e) => setAssignCondition(e.target.value)} className="w-full px-3 py-2 bg-white border border-[#EAE7E0] rounded-xl text-xs font-bold text-[#1F2B4D] focus:ring-2 focus:ring-[#1F2B4D] outline-none">
                    <option>New</option>
                    <option>Good</option>
                    <option>Fair</option>
                  </select>
                </div>

                <div className="pt-3 border-t border-[#F4F1EA] flex flex-col-reverse sm:flex-row justify-end gap-2 shrink-0">
                  <button type="button" onClick={() => setShowAssignModal(null)} className="w-full sm:w-auto px-4 py-1.5 border border-[#EAE7E0] bg-white text-[#1F2B4D] text-xs font-display font-bold rounded-xl hover:bg-[#FAF8F5]">Cancel</button>
                  <button type="submit" className="w-full sm:w-auto px-5 py-1.5 bg-[#1F2B4D] hover:bg-[#141C33] text-white text-xs font-display font-bold uppercase tracking-wider rounded-xl shadow-2xs text-center">
                    Assign Asset
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default AssetDirectory;
