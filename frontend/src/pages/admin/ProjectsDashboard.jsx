import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { Briefcase, Plus, Clock, FileText, X, CheckCircle2, DollarSign, Layers } from 'lucide-react';
import { Link } from 'react-router-dom';
import { API_BASE } from '../../lib/api';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { motion, AnimatePresence } from 'framer-motion';

const ProjectsDashboard = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [budget, setBudget] = useState('');

  const containerRef = useRef(null);

  // GSAP Choreographed Intro Sequence (Safely Guarded Target Selectors)
  useGSAP(() => {
    if (loading) return;

    const container = containerRef.current;
    if (!container) return;

    const introHeader = container.querySelector('.intro-header');
    const introKpis = container.querySelectorAll('.intro-kpi');
    const introProjectCards = container.querySelectorAll('.intro-project-card');

    const tl = gsap.timeline({ defaults: { ease: "power4.out" } });

    if (introHeader) tl.from(introHeader, { y: -20, opacity: 0, duration: 0.6 });
    if (introKpis.length > 0) tl.from(introKpis, { scale: 0.9, opacity: 0, duration: 0.5, stagger: 0.08, clearProps: "all" }, "-=0.3");
    if (introProjectCards.length > 0) {
      tl.from(introProjectCards, {
        scale: 0.9,
        opacity: 0,
        duration: 0.5,
        stagger: 0.06,
        clearProps: "all"
      }, "-=0.2");
    }

  }, { dependencies: [loading], scope: containerRef });

  const fetchProjects = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_BASE}/api/projects`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProjects(res.data || []);
    } catch (err) {
      toast.error('Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleAddProject = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_BASE}/api/projects`, {
        name, description, budget
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Project created successfully');
      setShowAddModal(false);
      setName('');
      setDescription('');
      setBudget('');
      fetchProjects();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create project');
    }
  };

  const getStatusBadge = (status) => {
    if (status === 'Active') return 'bg-emerald-50 text-emerald-800 border-emerald-200';
    return 'bg-[#F4F1EA] text-[#6B655C] border-[#EAE7E0]';
  };

  // Metric Computations
  const totalProjectsCount = projects.length;
  const activeCount = projects.filter(p => p.status === 'Active' || !p.status).length;
  const totalEntriesLogged = projects.reduce((acc, p) => acc + (p._count?.timesheets || 0), 0);
  const totalBudgetSum = projects.reduce((acc, p) => acc + (Number(p.budget) || 0), 0);

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
              <Briefcase className="text-[#1F2B4D] w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <span>Projects & PSA Console</span>
          </h1>
          <p className="text-[#6B655C] mt-0.5 text-xs sm:text-sm font-medium">
            Manage billable projects, client assignments, and track logged hours.
          </p>
        </div>
        
        <div className="flex flex-col min-[380px]:flex-row items-stretch min-[380px]:items-center gap-2 w-full min-[600px]:w-auto">
          <Link 
            to="/dashboard/timesheets" 
            className="inline-flex items-center justify-center gap-1.5 bg-white border border-[#EAE7E0] text-[#1F2B4D] px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs font-display font-bold uppercase tracking-wider shadow-2xs hover:border-[#1F2B4D] transition-all whitespace-nowrap w-full min-[380px]:w-auto"
          >
            <Clock size={15} className="text-[#1F2B4D] shrink-0" /> 
            <span>View Timesheets</span>
          </Link>

          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="relative overflow-hidden group inline-flex items-center justify-center gap-1.5 bg-white border border-[#EAE7E0] text-[#1F2B4D] px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs font-display font-bold uppercase tracking-wider shadow-2xs transition-all duration-300 hover:border-[#1F2B4D] active:scale-95 whitespace-nowrap shrink-0 w-full min-[380px]:w-auto"
          >
            <span className="absolute inset-0 bg-[#1F2B4D] translate-y-[100%] group-hover:translate-y-0 transition-transform duration-500 cubic-bezier(0.34, 1.56, 0.64, 1) z-0" />
            <Plus size={15} className="relative z-10 text-[#1F2B4D] group-hover:text-white transition-colors duration-300 shrink-0" />
            <span className="relative z-10 group-hover:text-white transition-colors duration-300">New Project</span>
          </button>
        </div>
      </div>

      {/* ── STATS BOARD (2x2 MOBILE / 4x1 DESKTOP) ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5 w-full">
        <div className="intro-kpi bg-white p-3.5 sm:p-4 rounded-2xl border border-[#EAE7E0] shadow-2xs flex flex-col justify-between">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[9.5px] sm:text-[10.5px] font-display font-bold uppercase tracking-wider text-[#6B655C]">Total Projects</span>
            <div className="p-1.5 bg-[#FAF8F5] rounded-xl border border-[#EAE7E0] text-[#1F2B4D]">
              <Briefcase size={16} />
            </div>
          </div>
          <span className="text-xl sm:text-2xl font-bold text-[#1F2B4D] tracking-tight">{totalProjectsCount}</span>
        </div>

        <div className="intro-kpi bg-white p-3.5 sm:p-4 rounded-2xl border border-[#EAE7E0] shadow-2xs flex flex-col justify-between">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[9.5px] sm:text-[10.5px] font-display font-bold uppercase tracking-wider text-emerald-800">Active</span>
            <div className="p-1.5 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-800">
              <CheckCircle2 size={16} />
            </div>
          </div>
          <span className="text-xl sm:text-2xl font-bold text-emerald-800 tracking-tight">{activeCount}</span>
        </div>

        <div className="intro-kpi bg-white p-3.5 sm:p-4 rounded-2xl border border-[#EAE7E0] shadow-2xs flex flex-col justify-between">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[9.5px] sm:text-[10.5px] font-display font-bold uppercase tracking-wider text-[#1F2B4D]">Logged Entries</span>
            <div className="p-1.5 bg-[#F0F3F9] rounded-xl border border-[#CBD5E1] text-[#1F2B4D]">
              <Clock size={16} />
            </div>
          </div>
          <span className="text-xl sm:text-2xl font-bold text-[#1F2B4D] tracking-tight">{totalEntriesLogged}</span>
        </div>

        <div className="intro-kpi bg-white p-3.5 sm:p-4 rounded-2xl border border-[#EAE7E0] shadow-2xs flex flex-col justify-between">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[9.5px] sm:text-[10.5px] font-display font-bold uppercase tracking-wider text-[#6B655C]">Total Budget</span>
            <div className="p-1.5 bg-[#FAF8F5] rounded-xl border border-[#EAE7E0] text-[#1F2B4D]">
              <DollarSign size={16} />
            </div>
          </div>
          <span className="text-xl sm:text-2xl font-bold text-[#1F2B4D] tracking-tight">${totalBudgetSum.toLocaleString()}</span>
        </div>
      </div>

      {/* ── PROJECTS GRID ── */}
      <div className="grid grid-cols-1 min-[480px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 w-full flex-1">
        {loading ? (
           <div className="col-span-full py-12 text-center text-[#6B655C] font-medium text-xs">Loading Projects...</div>
        ) : projects.length === 0 ? (
          <div className="col-span-full py-16 text-center flex flex-col items-center justify-center bg-white rounded-2xl border border-dashed border-[#EAE7E0] p-6 w-full flex-1">
            <div className="w-12 h-12 rounded-2xl bg-[#FAF8F5] border border-[#EAE7E0] flex items-center justify-center text-[#1F2B4D] mb-3 shadow-2xs">
              <Briefcase size={24} />
            </div>
            <h3 className="text-base font-serif font-bold text-[#1F2B4D]">No Projects Found</h3>
            <p className="text-xs text-[#6B655C] font-medium max-w-xs mt-1 leading-relaxed">
              Start creating projects to track billable hours and employee allocations.
            </p>
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="mt-4 bg-[#1F2B4D] hover:bg-[#141C33] text-white font-display font-bold text-xs uppercase tracking-wider px-4 py-2 rounded-xl transition-all shadow-2xs inline-flex items-center gap-1.5"
            >
              <Plus size={14} className="shrink-0" />
              <span>Create First Project</span>
            </button>
          </div>
        ) : (
          projects.map(project => (
            <div key={project.id} className="intro-project-card double-bezel-outer bg-[#F4F1EA] p-1 rounded-2xl group hover:border-[#1F2B4D]/20 transition-all flex flex-col">
              <div className="double-bezel-inner bg-white rounded-xl p-3.5 sm:p-4 flex flex-col justify-between h-full w-full relative overflow-hidden">
                
                <div>
                  <div className="flex justify-between items-start mb-3 gap-2">
                    <div className="p-2 bg-[#FAF8F5] border border-[#EAE7E0] rounded-xl shadow-2xs shrink-0">
                      <Briefcase size={18} className="text-[#1F2B4D]" />
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[8.5px] font-display font-bold uppercase tracking-wider border shadow-2xs shrink-0 ${getStatusBadge(project.status || 'Active')}`}>
                      {project.status || 'Active'}
                    </span>
                  </div>

                  <h3 className="font-serif font-bold text-sm sm:text-base text-[#1F2B4D] tracking-tight leading-snug truncate" title={project.name}>
                    {project.name}
                  </h3>
                  <p className="text-xs text-[#6B655C] font-medium mt-1 line-clamp-2 min-h-[32px] leading-relaxed">
                    {project.description || <span className="italic text-[#9A948A]">No description provided.</span>}
                  </p>
                </div>

                <div className="mt-3 pt-3 border-t border-[#F4F1EA] flex items-center justify-between gap-2">
                  <div>
                    <span className="text-[9px] font-display font-bold text-[#6B655C] uppercase tracking-wider block">Timesheets</span>
                    <p className="font-bold text-[#1F2B4D] text-xs mt-0.5">
                      {project._count?.timesheets || 0} <span className="font-medium text-[#6B655C] text-[10px]">logged</span>
                    </p>
                  </div>

                  {project.budget && (
                    <div className="text-right">
                      <span className="text-[9px] font-display font-bold text-[#6B655C] uppercase tracking-wider block">Budget</span>
                      <p className="font-bold text-[#1F2B4D] text-xs mt-0.5">
                        ${Number(project.budget).toLocaleString()}
                      </p>
                    </div>
                  )}
                </div>

              </div>
            </div>
          ))
        )}
      </div>

      {/* ── CREATE PROJECT MODAL ── */}
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
                <h2 className="font-serif font-bold text-sm sm:text-base text-[#1F2B4D]">Create New Project</h2>
                <button type="button" onClick={() => setShowAddModal(false)} className="p-1 text-[#6B655C] hover:text-[#1F2B4D]">
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleAddProject} className="p-4 sm:p-5 space-y-3.5 overflow-y-auto flex-1 bg-white">
                <div>
                  <label className="block text-[10px] font-display font-bold text-[#6B655C] uppercase tracking-wider mb-1">Project Name</label>
                  <input 
                    type="text" required 
                    value={name} onChange={(e) => setName(e.target.value)} 
                    className="w-full px-3 py-2 bg-white border border-[#EAE7E0] rounded-xl text-xs font-bold text-[#1F2B4D] focus:ring-2 focus:ring-[#1F2B4D] outline-none placeholder:text-[#9A948A]" 
                    placeholder="e.g. Website Redesign" 
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-display font-bold text-[#6B655C] uppercase tracking-wider mb-1">Description</label>
                  <textarea 
                    rows="3" 
                    value={description} onChange={(e) => setDescription(e.target.value)} 
                    className="w-full px-3 py-2 bg-white border border-[#EAE7E0] rounded-xl text-xs font-medium text-[#1F2B4D] focus:ring-2 focus:ring-[#1F2B4D] outline-none placeholder:text-[#9A948A] resize-none leading-relaxed" 
                    placeholder="Brief scope & goals..."
                  ></textarea>
                </div>

                <div>
                  <label className="block text-[10px] font-display font-bold text-[#6B655C] uppercase tracking-wider mb-1">Budget ($)</label>
                  <input 
                    type="number" step="0.01" 
                    value={budget} onChange={(e) => setBudget(e.target.value)} 
                    className="w-full px-3 py-2 bg-white border border-[#EAE7E0] rounded-xl text-xs font-bold text-[#1F2B4D] focus:ring-2 focus:ring-[#1F2B4D] outline-none placeholder:text-[#9A948A]" 
                    placeholder="e.g. 5000 (Optional)" 
                  />
                </div>

                <div className="pt-3 border-t border-[#F4F1EA] flex flex-col-reverse sm:flex-row justify-end gap-2 shrink-0">
                  <button type="button" onClick={() => setShowAddModal(false)} className="w-full sm:w-auto px-4 py-1.5 border border-[#EAE7E0] bg-white text-[#1F2B4D] text-xs font-display font-bold rounded-xl hover:bg-[#FAF8F5]">Cancel</button>
                  <button type="submit" className="w-full sm:w-auto px-5 py-1.5 bg-[#1F2B4D] hover:bg-[#141C33] text-white text-xs font-display font-bold uppercase tracking-wider rounded-xl shadow-2xs text-center">
                    Create Project
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

export default ProjectsDashboard;
