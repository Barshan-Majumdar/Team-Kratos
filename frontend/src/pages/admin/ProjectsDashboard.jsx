import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { Briefcase, Plus, Clock, FileText, X } from 'lucide-react';
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

  // GSAP Choreographed Intro Sequence
  useGSAP(() => {
    if (loading) return;

    const tl = gsap.timeline({ defaults: { ease: "power4.out" } });

    tl.from('.intro-header', {
      y: -30,
      opacity: 0,
      duration: 0.8,
    })
    .from('.intro-project-card', {
      scale: 0.85,
      opacity: 0,
      duration: 0.6,
      stagger: 0.1,
      clearProps: "all" // Allows CSS hover physics to take back over
    }, "-=0.5");

  }, { dependencies: [loading], scope: containerRef });

  const fetchProjects = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_BASE}/api/projects`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProjects(res.data);
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
    if (status === 'Active') return 'bg-[#ECFDF5] text-[#065F46] border-[#A7F3D0]';
    return 'bg-[#F4F1EA] text-[#6B655C] border-[#EAE7E0]';
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
        <div className="intro-header flex flex-col md:flex-row md:items-center justify-between gap-5 mb-10">
          <div>
            <h1 className="text-[28px] font-bold text-[#1D1B16] tracking-tight">Projects (PSA)</h1>
            <p className="text-[#6B655C] text-[13.5px] mt-1 font-medium">Manage billable projects and track logged hours.</p>
          </div>
          <div className="flex items-center gap-3">
            <Link 
              to="/dashboard/timesheets" 
              className="flex items-center gap-2 bg-white border border-[#EAE7E0] text-[#1D1B16] px-5 py-3 rounded-xl font-bold hover:bg-[#F4F1EA] hover:border-[#CBD5E1] transition-all shadow-sm active:scale-95 whitespace-nowrap"
            >
              <Clock size={18} className="text-[#6B655C]" /> 
              <span>View All Timesheets</span>
            </Link>
            <button
              onClick={() => setShowAddModal(true)}
              className="relative overflow-hidden group flex items-center gap-2 bg-[#1F2B4D] border border-[#141C33] text-white px-6 py-3 rounded-xl font-bold shadow-md transition-all duration-300 active:scale-95 whitespace-nowrap"
            >
              <span className="absolute inset-0 bg-[#0F172A] translate-y-[100%] group-hover:translate-y-0 transition-transform duration-500 cubic-bezier(0.34, 1.56, 0.64, 1) z-0" />
              <Plus size={18} className="relative z-10 text-white" />
              <span className="relative z-10 text-white">New Project</span>
            </button>
          </div>
        </div>

        {/* Projects Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
             <div className="col-span-full py-12 text-center text-[#6B655C] font-medium">Loading Projects...</div>
          ) : projects.length === 0 ? (
            <div className="col-span-full py-20 text-center">
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center gap-4"
              >
                <div className="w-16 h-16 rounded-full bg-[#F4F1EA] border border-[#EAE7E0] shadow-sm flex items-center justify-center">
                  <FileText size={28} className="text-[#9A948A]" />
                </div>
                <div>
                  <span className="text-[19px] font-bold text-[#1D1B16] block tracking-tight">No Projects Found</span>
                  <span className="text-[13px] text-[#6B655C] font-medium mt-1 block">Start creating projects to track billable hours.</span>
                </div>
              </motion.div>
            </div>
          ) : (
            projects.map(project => (
              <div key={project.id} className="intro-project-card double-bezel-outer bg-[#F4F1EA] p-1.5 hover:-translate-y-[2px] transition-transform duration-500 cubic-bezier(0.34, 1.56, 0.64, 1)">
                <div className="double-bezel-inner bg-white h-full p-6 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-5">
                      <div className="bg-[#FAF9F6] border border-[#EAE7E0] p-3 rounded-2xl shadow-sm">
                        <Briefcase size={20} className="text-[#1F2B4D]" />
                      </div>
                      <span className={`inline-flex px-2.5 py-1 rounded-[6px] text-[10px] font-bold uppercase tracking-wider border shadow-xs ${getStatusBadge(project.status)}`}>
                        {project.status}
                      </span>
                    </div>
                    
                    <h3 className="font-bold text-[#1D1B16] text-[18px] tracking-tight truncate">{project.name}</h3>
                    <p className="text-[13px] text-[#6B655C] font-medium mt-2 line-clamp-2 min-h-[40px] leading-relaxed">
                      {project.description || <span className="italic text-[#9A948A]">No description provided.</span>}
                    </p>
                  </div>
                  
                  <div className="mt-6 pt-5 border-t border-[#F4F1EA] flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-bold text-[#9A948A] uppercase tracking-wider mb-0.5">Timesheets Logged</p>
                      <p className="font-extrabold text-[#1D1B16] text-[15px]">{project._count?.timesheets || 0} <span className="font-semibold text-[#6B655C] text-[12px]">entries</span></p>
                    </div>
                    {project.budget && (
                      <div className="text-right">
                        <p className="text-[10px] font-bold text-[#9A948A] uppercase tracking-wider mb-0.5">Budget</p>
                        <p className="font-extrabold text-[#1D1B16] text-[15px]">${project.budget.toLocaleString()}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Modal via AnimatePresence */}
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
                  <h2 className="text-xl font-bold text-[#1D1B16] tracking-tight">Create New Project</h2>
                  <button onClick={() => setShowAddModal(false)} className="p-1.5 text-[#9A948A] hover:text-[#1D1B16] hover:bg-[#EAE7E0] rounded-full transition-colors">
                    <X size={20} />
                  </button>
                </div>
                <form onSubmit={handleAddProject} className="p-6 space-y-5 bg-white">
                  <div>
                    <label className="block text-[11px] font-bold text-[#6B655C] uppercase tracking-wider mb-2">Project Name</label>
                    <input 
                      type="text" required 
                      value={name} onChange={(e) => setName(e.target.value)} 
                      className="w-full p-4 bg-[#FAF9F6] border border-[#EAE7E0] rounded-xl focus:ring-2 focus:ring-[#1F2B4D] outline-none text-[#1D1B16] font-bold transition-all placeholder:text-[#9A948A] placeholder:font-medium" 
                      placeholder="e.g. Acme Website Redesign" 
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-[#6B655C] uppercase tracking-wider mb-2">Description</label>
                    <textarea 
                      rows="3" 
                      value={description} onChange={(e) => setDescription(e.target.value)} 
                      className="w-full p-4 bg-[#FAF9F6] border border-[#EAE7E0] rounded-xl focus:ring-2 focus:ring-[#1F2B4D] outline-none text-[#1D1B16] font-medium transition-all placeholder:text-[#9A948A] resize-none leading-relaxed" 
                      placeholder="Brief details about the project..."
                    ></textarea>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-[#6B655C] uppercase tracking-wider mb-2">Budget ($)</label>
                    <input 
                      type="number" step="0.01" 
                      value={budget} onChange={(e) => setBudget(e.target.value)} 
                      className="w-full p-4 bg-[#FAF9F6] border border-[#EAE7E0] rounded-xl focus:ring-2 focus:ring-[#1F2B4D] outline-none text-[#1D1B16] font-bold transition-all placeholder:text-[#9A948A] placeholder:font-medium" 
                      placeholder="Optional" 
                    />
                  </div>
                  <div className="pt-6 flex justify-end gap-3 border-t border-[#F4F1EA]">
                    <button type="button" onClick={() => setShowAddModal(false)} className="px-6 py-3 border border-[#EAE7E0] bg-white text-[#1D1B16] font-bold rounded-xl hover:bg-[#FAF9F6] transition-colors active:scale-95">Cancel</button>
                    <button type="submit" className="relative overflow-hidden group flex items-center justify-center gap-2 bg-[#1F2B4D] border border-[#141C33] text-white px-8 py-3 rounded-xl font-bold shadow-md transition-all duration-300 active:scale-95 whitespace-nowrap">
                      <span className="absolute inset-0 bg-[#0F172A] translate-y-[100%] group-hover:translate-y-0 transition-transform duration-500 cubic-bezier(0.34, 1.56, 0.64, 1) z-0" />
                      <span className="relative z-10 text-white">Create Project</span>
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

export default ProjectsDashboard;
