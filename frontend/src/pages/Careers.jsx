import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { Briefcase, MapPin, Building, ChevronRight, UploadCloud } from 'lucide-react';

const Careers = () => {
  const { tenantId } = useParams();
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState(null);
  const [applyForm, setApplyForm] = useState({ firstName: '', lastName: '', email: '', phone: '', resumeText: '', resumeFile: null });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!tenantId) return;
    const fetchPublicJobs = async () => {
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/ats/public/jobs/${tenantId}`);
        setJobs(res.data);
      } catch (error) {
        toast.error('Failed to load open positions.');
      } finally {
        setLoading(false);
      }
    };
    fetchPublicJobs();
  }, [tenantId]);

  const handleApply = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('tenantId', tenantId);
      formData.append('jobRequisitionId', selectedJob.id);
      formData.append('firstName', applyForm.firstName);
      formData.append('lastName', applyForm.lastName);
      formData.append('email', applyForm.email);
      formData.append('phone', applyForm.phone);
      if (applyForm.resumeFile) {
        formData.append('resumeFile', applyForm.resumeFile);
      } else {
        formData.append('resumeText', applyForm.resumeText);
      }

      await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/ats/public/apply`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success("Application submitted successfully!");
      setSelectedJob(null);
      setApplyForm({ firstName: '', lastName: '', email: '', phone: '', resumeText: '', resumeFile: null });
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to submit application");
    } finally {
      setSubmitting(false);
    }
  };

  if (!tenantId) {
    return <div className="p-12 text-center text-slate-500 font-medium">Invalid Company Link. Tenant ID is required.</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 py-6">
        <div className="max-w-5xl mx-auto px-6 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Briefcase size={28} className="text-indigo-600" />
            <h1 className="text-2xl font-bold text-slate-800">Careers</h1>
          </div>
          <p className="text-sm font-medium text-slate-500">Join our team!</p>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-12">
        {loading ? (
          <div className="text-center py-12 text-slate-500 animate-pulse">Loading open positions...</div>
        ) : jobs.length === 0 ? (
          <div className="text-center py-24 bg-white rounded-2xl shadow-sm border border-slate-200">
            <h2 className="text-xl font-bold text-slate-700 mb-2">No Open Positions</h2>
            <p className="text-slate-500">Check back later for new opportunities.</p>
          </div>
        ) : !selectedJob ? (
          <div>
            <h2 className="text-3xl font-extrabold text-slate-900 mb-8">Open Positions</h2>
            <div className="grid gap-4">
              {jobs.map(job => (
                <div 
                  key={job.id} 
                  onClick={() => setSelectedJob(job)}
                  className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm hover:shadow-md hover:border-indigo-300 transition-all cursor-pointer group flex justify-between items-center"
                >
                  <div>
                    <h3 className="text-xl font-bold text-slate-800 group-hover:text-indigo-700 transition-colors">{job.title}</h3>
                    <div className="flex items-center gap-4 mt-3 text-sm font-medium text-slate-500">
                      {job.department && (
                        <div className="flex items-center gap-1.5"><Building size={16} /> {job.department}</div>
                      )}
                      {job.location && (
                        <div className="flex items-center gap-1.5"><MapPin size={16} /> {job.location}</div>
                      )}
                      <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider">{job.employmentType}</span>
                    </div>
                  </div>
                  <div className="h-10 w-10 bg-slate-50 rounded-full flex items-center justify-center group-hover:bg-indigo-50 transition-colors">
                    <ChevronRight size={20} className="text-slate-400 group-hover:text-indigo-600" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-3xl shadow-lg overflow-hidden flex flex-col md:flex-row">
            {/* Left side: Job Details */}
            <div className="md:w-1/2 p-8 lg:p-12 border-b md:border-b-0 md:border-r border-slate-200 bg-slate-50/50">
              <button 
                onClick={() => setSelectedJob(null)}
                className="text-sm font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 mb-8"
              >
                &larr; Back to all jobs
              </button>
              
              <h2 className="text-3xl font-extrabold text-slate-900 mb-4">{selectedJob.title}</h2>
              <div className="flex flex-wrap items-center gap-3 mb-8 text-sm font-medium text-slate-600">
                {selectedJob.department && <span className="flex items-center gap-1 bg-slate-100 px-3 py-1 rounded-full"><Building size={14} /> {selectedJob.department}</span>}
                {selectedJob.location && <span className="flex items-center gap-1 bg-slate-100 px-3 py-1 rounded-full"><MapPin size={14} /> {selectedJob.location}</span>}
              </div>

              <div className="prose prose-slate max-w-none prose-p:leading-relaxed prose-a:text-indigo-600">
                <h4 className="text-lg font-bold text-slate-800 mb-2">Job Description</h4>
                <p className="whitespace-pre-line text-slate-600">{selectedJob.description || "No description provided."}</p>
                
                {selectedJob.requirements && (
                  <>
                    <h4 className="text-lg font-bold text-slate-800 mt-8 mb-2">Requirements</h4>
                    <p className="whitespace-pre-line text-slate-600">{selectedJob.requirements}</p>
                  </>
                )}
              </div>
            </div>

            {/* Right side: Application Form */}
            <div className="md:w-1/2 p-8 lg:p-12 bg-white">
              <h3 className="text-2xl font-bold text-slate-800 mb-6">Apply for this role</h3>
              <form onSubmit={handleApply} className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">First Name *</label>
                    <input required className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl p-3 outline-none transition-all" value={applyForm.firstName} onChange={e => setApplyForm({...applyForm, firstName: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Last Name *</label>
                    <input required className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl p-3 outline-none transition-all" value={applyForm.lastName} onChange={e => setApplyForm({...applyForm, lastName: e.target.value})} />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Email Address *</label>
                  <input required type="email" className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl p-3 outline-none transition-all" value={applyForm.email} onChange={e => setApplyForm({...applyForm, email: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Phone Number</label>
                  <input className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl p-3 outline-none transition-all" value={applyForm.phone} onChange={e => setApplyForm({...applyForm, phone: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Resume Document (PDF/Docx)</label>
                  <input 
                    type="file" 
                    accept=".pdf,.doc,.docx"
                    className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl p-2 outline-none transition-all"
                    onChange={e => setApplyForm({...applyForm, resumeFile: e.target.files[0]})}
                  />
                  <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
                    <UploadCloud size={14} /> Upload your resume.
                  </p>
                </div>
                <button 
                  type="submit" 
                  disabled={submitting}
                  className="w-full mt-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 px-6 rounded-xl transition-all shadow-sm hover:shadow-md disabled:opacity-70 flex justify-center items-center"
                >
                  {submitting ? 'Submitting Application...' : 'Submit Application'}
                </button>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Careers;
