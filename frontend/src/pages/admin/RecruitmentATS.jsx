import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { Plus, UploadCloud, FileText, ChevronDown, Trash2, ExternalLink } from 'lucide-react';

const STAGES = ['Applied', 'Screening', 'Interview', 'Offer', 'Hired', 'Rejected'];

const RecruitmentATS = () => {
  const [jobs, setJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showJobModal, setShowJobModal] = useState(false);
  const [showCandidateModal, setShowCandidateModal] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [currentTime, setCurrentTime] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 10000); // update every 10s
    return () => clearInterval(timer);
  }, []);

  // Form states
  const [jobForm, setJobForm] = useState({ title: '', department: '', employmentType: 'Full-time', description: '' });
  const [candidateForm, setCandidateForm] = useState({ firstName: '', lastName: '', email: '', resumeText: '' });

  useEffect(() => {
    fetchJobs();
    fetchApplications();
  }, []);

  const fetchJobs = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/ats/jobs`, {
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
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/ats/applications`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setApplications(res.data);
      setLoading(false);
    } catch (error) {
      toast.error('Failed to fetch applications');
      setLoading(false);
    }
  };

  const handleCreateJob = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${import.meta.env.VITE_API_URL}/api/ats/jobs`, jobForm, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      toast.success('Job created successfully');
      setShowJobModal(false);
      setJobForm({ title: '', department: '', employmentType: 'Full-time', description: '' });
      fetchJobs();
    } catch (error) {
      toast.error('Failed to create job');
    }
  };

  const handleAddCandidate = async (e) => {
    e.preventDefault();
    try {
      // 1. Create candidate (or use parse-resume if we want AI parsing)
      let parsedData = null;
      if (candidateForm.resumeText) {
        const parseRes = await axios.post(`${import.meta.env.VITE_API_URL}/api/ats/candidates/parse-resume`, { resumeText: candidateForm.resumeText }, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        parsedData = parseRes.data;
        // Optionally auto-fill from parsed data here, but we'll just save it to DB
      }

      const candRes = await axios.post(`${import.meta.env.VITE_API_URL}/api/ats/candidates`, {
        firstName: candidateForm.firstName || parsedData?.firstName || 'Unknown',
        lastName: candidateForm.lastName || parsedData?.lastName || 'Unknown',
        email: candidateForm.email || parsedData?.email,
        parsedData: parsedData
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      // 2. Create Application
      await axios.post(`${import.meta.env.VITE_API_URL}/api/ats/applications`, {
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
    if (!window.confirm('Are you sure you want to close this job requisition? It will no longer appear on the public careers page.')) return;
    try {
      await axios.patch(`${import.meta.env.VITE_API_URL}/api/ats/jobs/${selectedJob}`, { status: 'Closed' }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      toast.success('Job closed successfully');
      fetchJobs();
    } catch (error) {
      toast.error('Failed to close job');
    }
  };

  // HTML5 Drag and Drop handlers
  const handleDragStart = (e, appId) => {
    e.dataTransfer.setData('appId', appId);
  };

  const handleDragOver = (e) => {
    e.preventDefault(); // allow drop
  };

  const handleDrop = async (e, targetStage) => {
    e.preventDefault();
    const appId = e.dataTransfer.getData('appId');
    if (!appId) return;
    
    // Optimistic update
    setApplications(prev => prev.map(app => app.id === appId ? { ...app, stage: targetStage } : app));

    try {
      await axios.patch(`${import.meta.env.VITE_API_URL}/api/ats/applications/${appId}/stage`, { stage: targetStage }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (targetStage === 'Hired') {
        toast.success("Candidate Hired! Onboarding task automatically generated.", { icon: '🎉' });
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

  if (loading) return <div className="p-8 text-center text-slate-500">Loading ATS...</div>;

  const currentJobApplications = applications.filter(a => a.jobRequisitionId === selectedJob);

  return (
    <div className="p-6 max-w-7xl mx-auto h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Recruitment (ATS)</h1>
          <p className="text-sm text-slate-500">Manage job postings and track candidates.</p>
        </div>
        <div className="flex gap-3">
          <a href={`/careers/${JSON.parse(localStorage.getItem('user'))?.tenantId}`} target="_blank" rel="noreferrer" className="px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 font-medium flex items-center gap-2">
            <ExternalLink size={16} /> Public Careers Page
          </a>
          <button onClick={() => setShowJobModal(true)} className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium flex items-center gap-2">
            <Plus size={16} /> New Job
          </button>
          <button onClick={() => { if(selectedJob) setShowCandidateModal(true); else toast.error('Select a job first'); }} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium flex items-center gap-2">
            <UploadCloud size={16} /> Add Candidate
          </button>
        </div>
      </div>

      <div className="mb-6 flex items-center gap-4">
        <label className="font-semibold text-slate-700">Select Job Role:</label>
        <select 
          className="border border-slate-300 rounded-lg p-2 bg-white min-w-[250px]"
          value={selectedJob || ''}
          onChange={(e) => setSelectedJob(e.target.value)}
        >
          {visibleJobs.length === 0 && <option value="">No jobs available</option>}
          {visibleJobs.map(j => (
            <option key={j.id} value={j.id}>{j.title} ({j.department}) {j.status === 'Closed' ? '[CLOSED]' : ''}</option>
          ))}
        </select>
        {selectedJob && jobs.find(j => j.id === selectedJob)?.status === 'Open' && (
          <button 
            onClick={handleCloseJob}
            className="px-3 py-1.5 text-sm bg-red-50 text-red-600 rounded-lg font-bold border border-red-200 hover:bg-red-100 transition-colors"
          >
            Close Job
          </button>
        )}
        {selectedJob && jobs.find(j => j.id === selectedJob)?.status === 'Closed' && (
          <span className="px-3 py-1.5 text-sm bg-slate-100 text-slate-500 rounded-lg font-bold border border-slate-200">
            Closed
          </span>
        )}
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto">
        <div className="flex gap-4 min-h-[500px]">
          {STAGES.map(stage => {
            const appsInStage = currentJobApplications.filter(a => a.stage === stage);
            
            let badgeColor = 'bg-slate-100 text-slate-600';
            if (stage === 'Hired') badgeColor = 'bg-emerald-100 text-emerald-700';
            if (stage === 'Rejected') badgeColor = 'bg-red-100 text-red-700';
            if (stage === 'Offer') badgeColor = 'bg-blue-100 text-blue-700';

            return (
              <div 
                key={stage}
                className="bg-slate-50 border border-slate-200 rounded-xl min-w-[280px] flex flex-col"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, stage)}
              >
                <div className="p-3 border-b border-slate-200 flex justify-between items-center bg-slate-100/50 rounded-t-xl">
                  <h3 className="font-bold text-slate-700">{stage}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${badgeColor}`}>
                    {appsInStage.length}
                  </span>
                </div>
                
                <div className="flex-1 p-2 space-y-2 overflow-y-auto">
                  {appsInStage.map(app => (
                    <div 
                      key={app.id} 
                      draggable
                      onDragStart={(e) => handleDragStart(e, app.id)}
                      onClick={() => setSelectedApplication(app)}
                      className="bg-white p-3 rounded-lg shadow-sm border border-slate-200 cursor-grab hover:shadow-md transition-shadow active:cursor-grabbing"
                    >
                      <h4 className="font-bold text-sm text-slate-800">{app.candidate.firstName} {app.candidate.lastName}</h4>
                      <p className="text-xs text-slate-500 mt-1">{app.candidate.email}</p>
                      
                      {app.candidate.resumeUrl && (
                        <div className="mt-2 flex items-center gap-1 text-xs text-indigo-600 bg-indigo-50 px-2 py-1 rounded w-fit">
                          <FileText size={12} /> Resume Attached
                        </div>
                      )}
                    </div>
                  ))}
                  {appsInStage.length === 0 && (
                    <div className="text-center p-4 text-sm text-slate-400 italic border-2 border-dashed border-slate-200 rounded-lg">
                      Drop candidate here
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modals */}
      {showJobModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold mb-4">Create Job Requisition</h2>
            <form onSubmit={handleCreateJob} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Job Title</label>
                <input required className="w-full border border-slate-300 rounded-lg p-2" value={jobForm.title} onChange={e => setJobForm({...jobForm, title: e.target.value})} placeholder="e.g. Senior Frontend Engineer" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Department</label>
                <input className="w-full border border-slate-300 rounded-lg p-2" value={jobForm.department} onChange={e => setJobForm({...jobForm, department: e.target.value})} placeholder="e.g. Engineering" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Job Description (JD)</label>
                <textarea rows={4} className="w-full border border-slate-300 rounded-lg p-2" value={jobForm.description} onChange={e => setJobForm({...jobForm, description: e.target.value})} placeholder="Detailed job description and responsibilities..." />
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setShowJobModal(false)} className="px-4 py-2 text-slate-600 font-medium">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showCandidateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
            <h2 className="text-xl font-bold mb-4">Add Candidate manually</h2>
            <form onSubmit={handleAddCandidate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">First Name</label>
                  <input className="w-full border border-slate-300 rounded-lg p-2" value={candidateForm.firstName} onChange={e => setCandidateForm({...candidateForm, firstName: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Last Name</label>
                  <input className="w-full border border-slate-300 rounded-lg p-2" value={candidateForm.lastName} onChange={e => setCandidateForm({...candidateForm, lastName: e.target.value})} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input type="email" required className="w-full border border-slate-300 rounded-lg p-2" value={candidateForm.email} onChange={e => setCandidateForm({...candidateForm, email: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Paste Resume (Claude AI Parser)</label>
                <textarea 
                  rows={4} 
                  className="w-full border border-slate-300 rounded-lg p-2" 
                  value={candidateForm.resumeText} 
                  onChange={e => setCandidateForm({...candidateForm, resumeText: e.target.value})} 
                  placeholder="Paste candidate's resume text here. Claude will extract details..."
                />
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setShowCandidateModal(false)} className="px-4 py-2 text-slate-600 font-medium">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium">Add to Board</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {selectedApplication && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-200 flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-bold text-slate-800">{selectedApplication.candidate.firstName} {selectedApplication.candidate.lastName}</h2>
                <p className="text-slate-500">{selectedApplication.candidate.email} • {selectedApplication.candidate.phone || 'No phone'}</p>
                <div className="mt-2 text-sm">
                  Stage: <span className="font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full">{selectedApplication.stage}</span>
                </div>
              </div>
              <button onClick={() => setSelectedApplication(null)} className="text-slate-400 hover:text-slate-600 font-bold p-2 text-xl">&times;</button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              <h3 className="font-bold text-lg mb-3">Resume</h3>
              {selectedApplication.candidate.resumeUrl ? (
                <div className="border border-slate-200 rounded-lg h-[400px] overflow-hidden">
                  <iframe src={selectedApplication.candidate.resumeUrl} className="w-full h-full bg-slate-50" title="Resume" />
                </div>
              ) : (
                <p className="text-slate-500 italic p-4 bg-slate-50 rounded-lg text-sm text-center">No resume uploaded.</p>
              )}

              {selectedApplication.candidate.parsedData && (
                <div className="mt-6">
                  <h3 className="font-bold text-lg mb-3">Parsed Details</h3>
                  <pre className="bg-slate-50 p-4 rounded-lg text-sm whitespace-pre-wrap font-mono text-slate-700 overflow-x-auto border border-slate-200">
                    {JSON.stringify(selectedApplication.candidate.parsedData, null, 2)}
                  </pre>
                </div>
              )}
            </div>
            
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
              <button onClick={() => setSelectedApplication(null)} className="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg font-bold transition-colors">Close</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default RecruitmentATS;
