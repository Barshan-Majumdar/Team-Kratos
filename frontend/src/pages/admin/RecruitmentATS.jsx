import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { Plus, UploadCloud, FileText, ExternalLink, X, ArrowUpRight, MoreHorizontal } from 'lucide-react';
import { API_BASE } from '../../lib/api';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { motion, AnimatePresence } from 'framer-motion';

const STAGES = ['Applied', 'Screening', 'Interview', 'Offer', 'Hired', 'Rejected'];

const RecruitmentATS = () => {
  const [jobs, setJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [applications, setApplications] = useState([]);
  const [offices, setOffices] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [showJobModal, setShowJobModal] = useState(false);
  const [showCandidateModal, setShowCandidateModal] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [currentTime, setCurrentTime] = useState(Date.now());

  // Form states
  const [jobForm, setJobForm] = useState({ title: '', department: '', employmentType: 'Full-time', description: '', location: '' });
  const [candidateForm, setCandidateForm] = useState({ firstName: '', lastName: '', email: '', resumeText: '' });

  const containerRef = useRef(null);

  // GSAP 3x2 Matrix Staggered Reveal
  useGSAP(() => {
    if (loading) return;

    const tl = gsap.timeline({ defaults: { ease: "back.out(1.2)" } });

    // Header & Controls
    tl.fromTo('.cinematic-header', 
      { opacity: 0, y: -15 },
      { opacity: 1, y: 0, duration: 0.6 }
    )
    .fromTo('.cinematic-selector', 
      { opacity: 0, y: -10 },
      { opacity: 1, y: 0, duration: 0.5 }, 
      "-=0.4"
    )
    // 3x2 Grid Boxes Reveal
    .fromTo('.cinematic-grid-box', 
      { scale: 0.94, opacity: 0, y: 20 },
      { scale: 1, opacity: 1, y: 0, duration: 0.7, stagger: 0.08 }, 
      "-=0.3"
    )
    // Candidate Cards inside boxes pop in
    .fromTo('.cinematic-card', 
      { scale: 0.9, opacity: 0 },
      { scale: 1, opacity: 1, duration: 0.4, stagger: 0.02, clearProps: "all" }, 
      "-=0.4"
    );

  }, { dependencies: [loading, selectedJob], scope: containerRef });

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 10000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchJobs(), fetchApplications(), fetchOffices()]).finally(() => setLoading(false));
  }, []);

  const fetchJobs = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/ats/jobs`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setJobs(res.data);
      if (res.data.length > 0 && !selectedJob) {
        setSelectedJob(res.data[0].id);
      }
    } catch (error) {
      toast.error('Failed to fetch job requisitions');
    }
  };

  const fetchApplications = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/ats/applications`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setApplications(res.data);
      setLoading(false);
    } catch (error) {
      toast.error('Failed to fetch applications');
      setLoading(false);
    }
  };

  const fetchOffices = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/console/offices`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setOffices(res.data || []);
    } catch (error) {
      console.error('Failed to fetch offices', error);
    }
  };

  const handleCreateJob = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_BASE}/api/ats/jobs`, jobForm, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      toast.success('Job created successfully');
      setShowJobModal(false);
      setJobForm({ title: '', department: '', employmentType: 'Full-time', description: '', location: '' });
      fetchJobs();
    } catch (error) {
      toast.error('Failed to create job');
    }
  };

  const handleAddCandidate = async (e) => {
    e.preventDefault();
    try {
      let parsedData = null;
      if (candidateForm.resumeText) {
        const parseRes = await axios.post(`${API_BASE}/api/ats/candidates/parse-resume`, { resumeText: candidateForm.resumeText }, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        parsedData = parseRes.data;
      }

      const candRes = await axios.post(`${API_BASE}/api/ats/candidates`, {
        firstName: candidateForm.firstName || parsedData?.firstName || 'Unknown',
        lastName: candidateForm.lastName || parsedData?.lastName || 'Unknown',
        email: candidateForm.email || parsedData?.email,
        parsedData: parsedData
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      await axios.post(`${API_BASE}/api/ats/applications`, {
        candidateId: candRes.data.id,
        jobRequisitionId: selectedJob,
        stage: 'Applied'
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      toast.success('Candidate added to job');
      setShowCandidateModal(false);
      setCandidateForm({ firstName: '', lastName: '', email: '', resumeText: '' });
      fetchApplications();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to add candidate');
    }
  };

  const handleCloseJob = async () => {
    if (!selectedJob) return;
    if (!await window.confirmDialog()) return;
    try {
      await axios.patch(`${API_BASE}/api/ats/jobs/${selectedJob}`, { status: 'Closed' }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      toast.success('Job closed successfully');
      fetchJobs();
    } catch (error) {
      toast.error('Failed to close job');
    }
  };

  // Drag and Drop handlers
  const handleDragStart = (e, appId) => {
    e.dataTransfer.setData('appId', appId);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = async (e, targetStage) => {
    e.preventDefault();
    const appId = e.dataTransfer.getData('appId');
    if (!appId) return;
    
    // Optimistic update
    setApplications(prev => prev.map(app => app.id === appId ? { ...app, stage: targetStage } : app));

    try {
      await axios.patch(`${API_BASE}/api/ats/applications/${appId}/stage`, { stage: targetStage }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (targetStage === 'Hired') {
        toast.success("Candidate Hired! Welcome aboard.", { icon: '🎉' });
      }
    } catch (error) {
      toast.error('Failed to update stage');
      fetchApplications(); // revert
    }
  };

  const visibleJobs = React.useMemo(() => jobs.filter(j => j.status !== 'Closed' || (currentTime - new Date(j.updatedAt).getTime() < 60000)), [jobs, currentTime]);

  useEffect(() => {
    if (visibleJobs.length > 0 && (!selectedJob || !visibleJobs.find(j => j.id === selectedJob))) {
      setSelectedJob(visibleJobs[0].id);
    } else if (visibleJobs.length === 0 && selectedJob) {
      setSelectedJob(null);
    }
  }, [visibleJobs, selectedJob]);

  // High-Density Modal Physics
  const modalVariants = {
    hidden: { opacity: 0, scale: 0.95, filter: "blur(4px)" },
    visible: { 
      opacity: 1, 
      scale: 1, 
      filter: "blur(0px)",
      transition: { type: 'spring', stiffness: 300, damping: 28 }
    },
    exit: { 
      opacity: 0, 
      scale: 0.98, 
      filter: "blur(2px)",
      transition: { duration: 0.2 }
    }
  };

  const currentJobApplications = applications.filter(a => a.jobRequisitionId === selectedJob);

  if (loading) return (
    <div className="min-h-[100dvh] bg-transparent flex items-center justify-center">
      <span className="text-[11px] font-bold text-[#9A948A] tracking-[0.15em] uppercase">Loading...</span>
    </div>
  );

  return (
    <div ref={containerRef} className="py-6 md:py-8 px-4 md:px-6 lg:px-8 min-h-[100dvh] bg-transparent font-sans">
      <div className="mx-auto w-full max-w-[1400px]">
        
        {/* Compact Dashboard Header */}
        <div className="cinematic-header flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-[26px] font-extrabold text-[#1D1B16] tracking-tight leading-none mb-1">Recruitment</h1>
            <p className="text-[#6B655C] text-[13px] font-medium tracking-tight">
              Manage pipelines and applicant velocity.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <a 
              href={`/careers/${JSON.parse(localStorage.getItem('user'))?.tenantId}`} 
              target="_blank" rel="noreferrer" 
              className="group flex items-center bg-white border border-[#EAE7E0] text-[#1D1B16] pl-3 pr-1 py-1 rounded-full text-[12px] font-bold shadow-sm hover:shadow-md hover:-translate-y-0.5 active:scale-[0.97] active:translate-y-0 transition-all duration-300"
            >
              <span className="mr-2">Careers</span>
              <div className="w-6 h-6 rounded-full bg-[#FAF9F6] border border-[#EAE7E0] flex items-center justify-center group-hover:bg-[#1D1B16] group-hover:text-white transition-colors duration-300">
                <ExternalLink size={12} strokeWidth={2.5} className="group-hover:-translate-y-[1px] group-hover:translate-x-[1px] transition-transform duration-300" />
              </div>
            </a>

            {/* Premium Button-in-Button CTAs */}
            <button 
              onClick={() => setShowJobModal(true)} 
              className="group flex items-center bg-white border border-[#EAE7E0] text-[#1D1B16] pl-3 pr-1 py-1 rounded-full text-[12px] font-bold shadow-sm hover:shadow-md hover:-translate-y-0.5 active:scale-[0.97] active:translate-y-0 transition-all duration-300"
            >
              <span className="mr-2">New Job</span>
              <div className="w-6 h-6 rounded-full bg-[#FAF9F6] border border-[#EAE7E0] flex items-center justify-center group-hover:bg-[#1D1B16] group-hover:text-white transition-colors duration-300">
                <Plus size={14} strokeWidth={2.5} className="group-hover:rotate-90 transition-transform duration-300" />
              </div>
            </button>
            
            <button 
              onClick={() => { if(selectedJob) setShowCandidateModal(true); else toast.error('Select a job first'); }} 
              className="group flex items-center bg-[#1D1B16] text-white pl-3 pr-1 py-1 rounded-full text-[12px] font-bold shadow-sm hover:shadow-lg hover:shadow-[#1D1B16]/20 hover:-translate-y-0.5 active:scale-[0.97] active:translate-y-0 transition-all duration-300"
            >
              <span className="mr-2">Add Candidate</span>
              <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-white group-hover:text-[#1D1B16] transition-colors duration-300">
                <UploadCloud size={14} strokeWidth={2.5} className="group-hover:-translate-y-[1px] transition-transform duration-300" />
              </div>
            </button>
          </div>
        </div>

        {/* Compact Job Selector */}
        <div className="cinematic-selector mb-8 flex items-center gap-3">
          <div className="relative group min-w-[260px]">
            <select 
              className="appearance-none w-full bg-white border border-[#EAE7E0] text-[#1D1B16] text-[13px] font-bold tracking-tight rounded-lg px-3 py-2 pr-8 focus:ring-2 focus:ring-[#1D1B16] focus:outline-none transition-shadow shadow-sm hover:shadow-md cursor-pointer"
              value={selectedJob || ''}
              onChange={(e) => setSelectedJob(e.target.value)}
            >
              {visibleJobs.length === 0 && <option value="">No roles available</option>}
              {visibleJobs.map(j => (
                <option key={j.id} value={j.id}>{j.title} ({j.department}) {j.status === 'Closed' ? '[CLOSED]' : ''}</option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-[#1D1B16]">
              <svg className="fill-current h-3 w-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
            </div>
          </div>
          
          {selectedJob && jobs.find(j => j.id === selectedJob)?.status === 'Open' && (
            <button 
              onClick={handleCloseJob}
              className="px-4 py-2 bg-white border border-[#EAE7E0] text-[#B91C1C] rounded-full text-[12px] font-bold hover:bg-[#FEF2F2] hover:border-[#FECACA] hover:-translate-y-0.5 active:scale-[0.97] active:translate-y-0 transition-all duration-300 shadow-sm hover:shadow-md"
            >
              Close Role
            </button>
          )}
        </div>

        {/* EXECUTIVE 3x2 GRID MATRIX */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {STAGES.map((stage) => {
            const appsInStage = currentJobApplications.filter(a => a.stage === stage);
            
            return (
              <div 
                key={stage}
                className="cinematic-grid-box flex flex-col bg-white ring-1 ring-black/5 rounded-[24px] overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] hover:-translate-y-1 transition-all duration-500"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, stage)}
              >
                {/* Premium Dashboard Grid Header */}
                <div className="flex justify-between items-center px-5 py-4 border-b border-[#F4F1EA] bg-[#FAF9F6]">
                  <h3 className="font-extrabold text-[#1D1B16] text-[15px] tracking-tight">{stage}</h3>
                  <div className="h-6 min-w-6 px-2 rounded-full bg-white border border-[#EAE7E0] shadow-xs flex items-center justify-center">
                    <span className="text-[11px] font-bold text-[#6B655C]">{appsInStage.length}</span>
                  </div>
                </div>
                
                {/* Dashboard Grid Body */}
                <div className="flex-1 p-4 flex flex-col gap-3 min-h-[220px] bg-white">
                  {appsInStage.map((app) => (
                    <div 
                      key={app.id} 
                      draggable
                      onDragStart={(e) => handleDragStart(e, app.id)}
                      onClick={() => setSelectedApplication(app)}
                      className="cinematic-card group cursor-grab active:cursor-grabbing p-3 bg-white border border-[#EAE7E0] rounded-[16px] shadow-sm hover:border-[#D5D2CC] hover:-translate-y-1 hover:scale-[1.02] hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] transition-all duration-300 relative z-10 hover:z-20"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1 overflow-hidden">
                          <h4 className="font-bold text-[14px] text-[#1D1B16] tracking-tight truncate leading-tight">
                            {app.candidate.firstName} {app.candidate.lastName}
                          </h4>
                          <p className="text-[12px] font-medium text-[#9A948A] mt-1 truncate leading-tight">
                            {app.candidate.email}
                          </p>
                        </div>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <MoreHorizontal size={16} strokeWidth={2.5} className="text-[#9A948A]" />
                        </div>
                      </div>
                      
                      {app.candidate.resumeUrl && (
                        <div className="mt-4 flex items-center justify-between">
                          <span className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[0.1em] text-[#6B655C] bg-white border border-[#EAE7E0] px-2.5 py-1 rounded-md shadow-xs">
                            <FileText size={12} strokeWidth={2.5} /> Resume
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {/* Empty State Drop Zone */}
                  {appsInStage.length === 0 && (
                    <div className="flex-1 border-2 border-dashed border-[#F4F1EA] rounded-[16px] flex flex-col items-center justify-center gap-2 text-[#9A948A] transition-colors hover:border-[#D5D2CC]">
                      <UploadCloud size={20} strokeWidth={2} className="text-[#D5D2CC]" />
                      <span className="text-[10px] font-bold uppercase tracking-[0.1em]">Drop Candidate Here</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Compact Modals with AnimatePresence */}
        <AnimatePresence>
          {showJobModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
                className="absolute inset-0 bg-black/20 backdrop-blur-md"
                onClick={() => setShowJobModal(false)}
              />
              <motion.div 
                variants={modalVariants} initial="hidden" animate="visible" exit="exit"
                className="relative w-full max-w-md bg-white ring-1 ring-black/5 shadow-[0_24px_48px_rgba(0,0,0,0.12)] rounded-[24px] overflow-hidden flex flex-col"
              >
                <div className="px-6 py-5 border-b border-[#F4F1EA] flex justify-between items-center bg-[#FAF9F6]">
                  <h2 className="text-[18px] font-extrabold text-[#1D1B16] tracking-tight">Create Job Requisition</h2>
                  <button onClick={() => setShowJobModal(false)} className="w-8 h-8 flex items-center justify-center text-[#9A948A] hover:text-[#1D1B16] hover:bg-[#EAE7E0] rounded-full transition-colors">
                    <X size={18} strokeWidth={2.5} />
                  </button>
                </div>
                <form onSubmit={handleCreateJob} className="p-6 space-y-4">
                  <div>
                    <label className="block text-[11px] font-bold text-[#6B655C] uppercase tracking-[0.1em] mb-1.5 ml-1">Job Title</label>
                    <input required className="w-full px-4 py-3 bg-[#FAF9F6] border border-[#EAE7E0] rounded-xl focus:ring-2 focus:ring-[#1D1B16] outline-none text-[#1D1B16] font-bold text-[14px] tracking-tight transition-shadow placeholder:text-[#9A948A]" value={jobForm.title} onChange={e => setJobForm({...jobForm, title: e.target.value})} placeholder="Senior Frontend Engineer" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-[#6B655C] uppercase tracking-[0.1em] mb-1.5 ml-1">Department</label>
                    <input className="w-full px-4 py-3 bg-[#FAF9F6] border border-[#EAE7E0] rounded-xl focus:ring-2 focus:ring-[#1D1B16] outline-none text-[#1D1B16] font-bold text-[14px] tracking-tight transition-shadow placeholder:text-[#9A948A]" value={jobForm.department} onChange={e => setJobForm({...jobForm, department: e.target.value})} placeholder="Engineering" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-[#6B655C] uppercase tracking-[0.1em] mb-1.5 ml-1">Office / Location</label>
                    <select required className="w-full px-4 py-3 bg-[#FAF9F6] border border-[#EAE7E0] rounded-xl focus:ring-2 focus:ring-[#1D1B16] outline-none text-[#1D1B16] font-bold text-[14px] tracking-tight transition-shadow appearance-none cursor-pointer" value={jobForm.location || ''} onChange={e => setJobForm({...jobForm, location: e.target.value})}>
                      <option value="" disabled>Select Office</option>
                      {offices.map(office => (
                        <option key={office.id} value={office.name}>{office.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-[#6B655C] uppercase tracking-[0.1em] mb-1.5 ml-1">Job Description</label>
                    <textarea rows={4} className="w-full px-4 py-3 bg-[#FAF9F6] border border-[#EAE7E0] rounded-xl focus:ring-2 focus:ring-[#1D1B16] outline-none text-[#1D1B16] font-medium text-[14px] transition-shadow placeholder:text-[#9A948A] resize-none" value={jobForm.description} onChange={e => setJobForm({...jobForm, description: e.target.value})} placeholder="Responsibilities..." />
                  </div>
                  <div className="pt-3 flex justify-end gap-3">
                    <button type="button" onClick={() => setShowJobModal(false)} className="px-5 py-2.5 border border-[#EAE7E0] bg-[#FAF9F6] text-[#1D1B16] text-[13px] font-bold rounded-full hover:bg-white hover:-translate-y-0.5 hover:shadow-sm active:scale-[0.97] active:translate-y-0 transition-all duration-300">Cancel</button>
                    <button type="submit" className="px-6 py-2.5 bg-[#1D1B16] text-white text-[13px] font-bold rounded-full shadow-sm hover:shadow-md hover:shadow-[#1D1B16]/20 hover:-translate-y-0.5 active:scale-[0.97] active:translate-y-0 transition-all duration-300">Create</button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showCandidateModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
                className="absolute inset-0 bg-black/20 backdrop-blur-md"
                onClick={() => setShowCandidateModal(false)}
              />
              <motion.div 
                variants={modalVariants} initial="hidden" animate="visible" exit="exit"
                className="relative w-full max-w-md bg-white ring-1 ring-black/5 shadow-[0_24px_48px_rgba(0,0,0,0.12)] rounded-[24px] overflow-hidden flex flex-col"
              >
                <div className="px-6 py-5 border-b border-[#F4F1EA] flex justify-between items-center bg-[#FAF9F6]">
                  <h2 className="text-[18px] font-extrabold text-[#1D1B16] tracking-tight">Add Candidate</h2>
                  <button onClick={() => setShowCandidateModal(false)} className="w-8 h-8 flex items-center justify-center text-[#9A948A] hover:text-[#1D1B16] hover:bg-[#EAE7E0] rounded-full transition-colors">
                    <X size={18} strokeWidth={2.5} />
                  </button>
                </div>
                <form onSubmit={handleAddCandidate} className="p-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-[#6B655C] uppercase tracking-[0.1em] mb-1.5 ml-1">First Name</label>
                      <input className="w-full px-4 py-3 bg-[#FAF9F6] border border-[#EAE7E0] rounded-xl focus:ring-2 focus:ring-[#1D1B16] outline-none text-[#1D1B16] font-bold text-[14px] tracking-tight transition-shadow" value={candidateForm.firstName} onChange={e => setCandidateForm({...candidateForm, firstName: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-[#6B655C] uppercase tracking-[0.1em] mb-1.5 ml-1">Last Name</label>
                      <input className="w-full px-4 py-3 bg-[#FAF9F6] border border-[#EAE7E0] rounded-xl focus:ring-2 focus:ring-[#1D1B16] outline-none text-[#1D1B16] font-bold text-[14px] tracking-tight transition-shadow" value={candidateForm.lastName} onChange={e => setCandidateForm({...candidateForm, lastName: e.target.value})} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-[#6B655C] uppercase tracking-[0.1em] mb-1.5 ml-1">Email</label>
                    <input type="email" required className="w-full px-4 py-3 bg-[#FAF9F6] border border-[#EAE7E0] rounded-xl focus:ring-2 focus:ring-[#1D1B16] outline-none text-[#1D1B16] font-bold text-[14px] tracking-tight transition-shadow" value={candidateForm.email} onChange={e => setCandidateForm({...candidateForm, email: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-[#6B655C] uppercase tracking-[0.1em] mb-1.5 ml-1">Resume Text (Parse)</label>
                    <textarea 
                      rows={3} 
                      className="w-full px-4 py-3 bg-[#FAF9F6] border border-[#EAE7E0] rounded-xl focus:ring-2 focus:ring-[#1D1B16] outline-none text-[#1D1B16] font-medium text-[13px] transition-shadow resize-none placeholder:text-[#9A948A]" 
                      value={candidateForm.resumeText} 
                      onChange={e => setCandidateForm({...candidateForm, resumeText: e.target.value})} 
                      placeholder="Paste raw text..."
                    />
                  </div>
                  <div className="pt-3 flex justify-end gap-3">
                    <button type="button" onClick={() => setShowCandidateModal(false)} className="px-5 py-2.5 border border-[#EAE7E0] bg-[#FAF9F6] text-[#1D1B16] text-[13px] font-bold rounded-full hover:bg-white hover:-translate-y-0.5 hover:shadow-sm active:scale-[0.97] active:translate-y-0 transition-all duration-300">Cancel</button>
                    <button type="submit" className="px-6 py-2.5 bg-[#1D1B16] text-white text-[13px] font-bold rounded-full shadow-sm hover:shadow-md hover:shadow-[#1D1B16]/20 hover:-translate-y-0.5 active:scale-[0.97] active:translate-y-0 transition-all duration-300">Add</button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {selectedApplication && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
                className="absolute inset-0 bg-black/20 backdrop-blur-md"
                onClick={() => setSelectedApplication(null)}
              />
              <motion.div 
                variants={modalVariants} initial="hidden" animate="visible" exit="exit"
                className="relative w-full max-w-2xl bg-white ring-1 ring-black/5 shadow-[0_24px_48px_rgba(0,0,0,0.12)] rounded-[24px] flex flex-col max-h-[90vh] overflow-hidden"
              >
                <div className="px-7 py-6 border-b border-[#F4F1EA] bg-[#FAF9F6] flex justify-between items-start shrink-0">
                  <div>
                    <h2 className="text-[22px] font-extrabold text-[#1D1B16] tracking-tight leading-none mb-2">
                      {selectedApplication.candidate.firstName} {selectedApplication.candidate.lastName}
                    </h2>
                    <p className="text-[#6B655C] font-bold text-[14px]">{selectedApplication.candidate.email}</p>
                  </div>
                  <button onClick={() => setSelectedApplication(null)} className="w-9 h-9 flex items-center justify-center text-[#9A948A] hover:text-[#1D1B16] hover:bg-[#EAE7E0] rounded-full transition-colors">
                    <X size={20} strokeWidth={2.5} />
                  </button>
                </div>
                
                <div className="p-7 overflow-y-auto flex-1 bg-white custom-scrollbar">
                  <h3 className="font-extrabold text-[#1D1B16] text-[15px] mb-4">Resume</h3>
                  {selectedApplication.candidate.resumeUrl ? (
                    <div className="border border-[#EAE7E0] rounded-2xl h-[400px] overflow-hidden shadow-sm">
                      <iframe src={selectedApplication.candidate.resumeUrl} className="w-full h-full" title="Resume" />
                    </div>
                  ) : (
                    <div className="py-12 bg-[#FAF9F6] rounded-2xl border border-dashed border-[#D5D2CC] flex flex-col items-center justify-center gap-3">
                      <FileText size={28} strokeWidth={1.5} className="text-[#9A948A]" />
                      <p className="text-[#6B655C] text-[13px] font-bold">No resume payload.</p>
                    </div>
                  )}

                  {selectedApplication.candidate.parsedData && (
                    <div className="mt-8">
                      <h3 className="font-extrabold text-[#1D1B16] text-[15px] mb-4">Extracted Details</h3>
                      <div className="bg-[#FAF9F6] border border-[#EAE7E0] p-5 rounded-2xl overflow-hidden shadow-sm">
                        <pre className="text-[12px] whitespace-pre-wrap font-mono text-[#6B655C] overflow-x-auto custom-scrollbar">
                          {JSON.stringify(selectedApplication.candidate.parsedData, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
};

export default RecruitmentATS;
