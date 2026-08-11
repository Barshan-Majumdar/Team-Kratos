import { useState, useEffect, useRef } from 'react';
import { UploadCloud, FileText, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { io } from 'socket.io-client';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const DataImport = () => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [jobs, setJobs] = useState([]);
  const [message, setMessage] = useState(null);
  const containerRef = useRef(null);

  const fetchJobs = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/import/jobs`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setJobs(data);
      }
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchJobs();
    
    // Connect to WebSocket for real-time import updates (zero polling)
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (!user.tenantId) return;

    const socket = io(API_BASE, { 
      transports: ['websocket', 'polling'],
      auth: { token: localStorage.getItem('token') }
    });
    
    socket.on(`import-update-${user.tenantId}`, (updatedJob) => {
      // Replace the job in the state instantly
      setJobs(prevJobs => prevJobs.map(job => 
        job.id === updatedJob.id ? updatedJob : job
      ));
    });

    return () => {
      socket.off(`import-update-${user.tenantId}`);
      socket.disconnect();
    };
  }, []);

  useGSAP(() => {
    gsap.fromTo('.gsap-stagger', 
      { opacity: 0, y: 30 }, 
      { opacity: 1, y: 0, duration: 0.8, stagger: 0.1, ease: 'power3.out' }
    );
  }, []);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return;

    setUploading(true);
    setMessage(null);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/import/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: data.message });
        setFile(null);
        fetchJobs(); // Refresh job list
      } else {
        setMessage({ type: 'error', text: data.error || 'Upload failed' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Network error uploading file' });
    } finally {
      setUploading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch(status) {
      case 'completed': return <span className="px-2 py-0.5 bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0] text-[10px] sm:text-xs rounded-md flex items-center gap-1 font-bold w-fit whitespace-nowrap"><CheckCircle size={12} strokeWidth={2.5} /> Completed</span>;
      case 'failed': return <span className="px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 text-[10px] sm:text-xs rounded-md flex items-center gap-1 font-bold w-fit whitespace-nowrap"><XCircle size={12} strokeWidth={2.5} /> Failed</span>;
      case 'importing': return <span className="px-2 py-0.5 bg-[#F0F3F9] text-[#1F2B4D] border border-[#E2E8F0] text-[10px] sm:text-xs rounded-md flex items-center gap-1 font-bold animate-pulse w-fit whitespace-nowrap"><RefreshCw size={12} className="animate-spin" strokeWidth={2.5} /> Importing</span>;
      default: return <span className="px-2 py-0.5 bg-[#FAF9F6] text-[#6B655C] border border-[#EAE7E0] text-[10px] sm:text-xs rounded-md font-bold w-fit whitespace-nowrap">{status}</span>;
    }
  };

  return (
    <div ref={containerRef} className="w-full min-h-full flex flex-col gap-3.5 sm:gap-4 p-3 sm:p-5 md:p-6 bg-[#FAF9F6] font-sans text-[#1D1B16]">
      {/* Header */}
      <div className="gsap-stagger opacity-0 flex flex-col min-[500px]:flex-row justify-between items-start min-[500px]:items-center gap-2.5 pb-2 border-b border-[#EAE7E0] w-full">
        <div>
          <h1 className="font-serif font-bold text-lg sm:text-2xl md:text-3xl text-[#1F2B4D] tracking-tight leading-tight flex items-center gap-2">
            <UploadCloud className="text-[#1F2B4D] w-5 h-5 sm:w-6 sm:h-6" />
            <span>Bulk Data Import</span>
          </h1>
          <p className="text-[#6B655C] text-xs sm:text-sm font-medium mt-0.5">
            Onboard hundreds of employees at once using CSV
          </p>
        </div>
      </div>

      {message && (
        <div className={`gsap-stagger opacity-0 p-3 sm:p-4 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2.5 ${message.type === 'error' ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-emerald-50 text-emerald-800 border border-emerald-200'}`}>
          {message.type === 'error' ? <XCircle size={18} className="shrink-0" /> : <CheckCircle size={18} className="shrink-0" />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Upload Section */}
      <div className="gsap-stagger opacity-0 p-4 sm:p-5 md:p-6 bg-white rounded-2xl border border-[#EAE7E0] shadow-2xs w-full flex flex-col gap-4">
        <h2 className="font-serif font-bold text-base sm:text-lg text-[#1F2B4D]">Upload CSV File</h2>
        
        <div className="bg-[#FAF8F5] p-3.5 sm:p-4 rounded-xl border border-[#EAE7E0]">
          <h3 className="font-display font-bold text-[#1F2B4D] text-xs uppercase tracking-wider mb-1.5">CSV Format Requirements</h3>
          <p className="text-xs text-[#6B655C] font-medium leading-relaxed mb-3">Ensure your CSV file contains the following columns exactly as named (case insensitive):</p>
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            {['Name', 'Email', 'Department', 'Position', 'Phone', 'Location', 'DateOfJoining'].map(col => (
              <span key={col} className="px-2.5 py-1 bg-white border border-[#EAE7E0] text-[#1F2B4D] rounded-lg text-[11px] font-bold font-mono shadow-2xs">{col}</span>
            ))}
          </div>
          <p className="text-[11px] font-bold text-amber-800 mt-3">* Email and Name are strictly required.</p>
        </div>

        <form onSubmit={handleUpload} className="space-y-4">
          <div className="group relative border-2 border-dashed border-[#EAE7E0] rounded-2xl p-6 sm:p-10 flex flex-col items-center justify-center text-center bg-white hover:bg-[#F0F3F9] hover:border-[#1F2B4D] transition-colors cursor-pointer">
            <input 
              type="file" 
              accept=".csv" 
              onChange={(e) => setFile(e.target.files[0])}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-[#FAF8F5] text-[#1F2B4D] rounded-xl flex items-center justify-center mb-3 shadow-2xs border border-[#EAE7E0]">
              {file ? <FileText size={28} /> : <UploadCloud size={28} />}
            </div>
            <h3 className="text-sm sm:text-base font-bold text-[#1F2B4D]">
              {file ? file.name : "Drag and drop your CSV here"}
            </h3>
            <p className="text-[#6B655C] text-xs font-medium mt-1">or click to browse from your computer</p>
          </div>

          <button 
            type="submit" 
            disabled={!file || uploading}
            className="w-full py-3 sm:py-3.5 bg-[#1F2B4D] hover:bg-[#141C33] text-white text-xs sm:text-sm font-display font-bold uppercase tracking-wider rounded-xl transition-all shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
          >
            {uploading ? (
              <><RefreshCw className="animate-spin" size={16} /> Processing Upload...</>
            ) : (
              <>Import Data <UploadCloud size={16} /></>
            )}
          </button>
        </form>
      </div>

      {/* Jobs Section */}
      <div className="gsap-stagger opacity-0 p-4 sm:p-5 md:p-6 bg-white rounded-2xl border border-[#EAE7E0] shadow-2xs w-full flex flex-col gap-3">
        <h2 className="font-serif font-bold text-base sm:text-lg text-[#1F2B4D]">Recent Import Jobs</h2>
        
        {/* Mobile View: Zero Sliding Cards Layout (< 550px) */}
        <div className="min-[550px]:hidden flex flex-col gap-2.5 w-full">
          {jobs.length === 0 ? (
            <div className="py-6 text-center text-[#6B655C] font-medium text-xs bg-[#FAF8F5] rounded-xl border border-[#EAE7E0]">
              No import jobs found
            </div>
          ) : (
            jobs.map(job => {
              const log = job.errorLog || {};
              return (
                <div key={job.id} className="p-3 bg-[#FAF8F5] rounded-xl border border-[#EAE7E0] flex flex-col gap-2 w-full">
                  <div className="flex justify-between items-center gap-2 pb-2 border-b border-[#EAE7E0]">
                    <span className="text-[10.5px] font-bold text-[#1F2B4D]">
                      {new Date(job.createdAt).toLocaleString('en-IN')}
                    </span>
                    <div>{getStatusBadge(job.status)}</div>
                  </div>
                  <div className="flex justify-between items-center gap-2 pt-0.5 text-xs">
                    <a 
                      href={job.sourceFile} 
                      target="_blank" 
                      rel="noreferrer" 
                      className="inline-flex items-center gap-1 font-mono font-bold text-[#1F2B4D] hover:underline bg-white border border-[#EAE7E0] px-2 py-0.5 rounded-md text-[10.5px]"
                    >
                      <FileText size={12} /> View CSV
                    </a>
                    <div className="font-semibold text-right">
                      {job.status === 'completed' && log.successCount !== undefined && (
                        <span className="text-emerald-700 font-bold text-[10.5px]">{log.successCount} imported</span>
                      )}
                      {job.status === 'failed' && (
                        <span className="text-rose-600 font-bold text-[10.5px]">Failed ({log.errors?.length || 0} errs)</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Desktop View: Table Layout (>= 550px) */}
        <div className="hidden min-[550px]:block overflow-x-auto [&::-webkit-scrollbar]:hidden w-full">
          <table className="w-full text-left text-xs sm:text-sm border-collapse min-w-[480px]">
            <thead>
              <tr className="bg-[#FAF8F5] border-b border-[#EAE7E0]">
                <th className="py-2.5 px-3 sm:px-4 text-[10px] font-display font-bold uppercase tracking-wider text-[#6B655C]">Date</th>
                <th className="py-2.5 px-3 sm:px-4 text-[10px] font-display font-bold uppercase tracking-wider text-[#6B655C]">Source File</th>
                <th className="py-2.5 px-3 sm:px-4 text-[10px] font-display font-bold uppercase tracking-wider text-[#6B655C]">Status</th>
                <th className="py-2.5 px-3 sm:px-4 text-[10px] font-display font-bold uppercase tracking-wider text-[#6B655C]">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F4F1EA]">
              {jobs.length === 0 ? (
                <tr>
                  <td colSpan="4" className="py-8 text-center text-[#6B655C] font-medium text-xs">No import jobs found</td>
                </tr>
              ) : jobs.map(job => {
                const log = job.errorLog || {};
                return (
                  <tr key={job.id} className="hover:bg-[#FAF8F5] transition-colors">
                    <td className="py-3 px-3 sm:px-4 font-bold text-[#1F2B4D]">
                      {new Date(job.createdAt).toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-3 sm:px-4 text-[#1F2B4D] font-mono font-bold text-xs">
                      <a href={job.sourceFile} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 hover:underline">
                        <FileText size={14} /> View CSV
                      </a>
                    </td>
                    <td className="py-3 px-3 sm:px-4">
                      {getStatusBadge(job.status)}
                    </td>
                    <td className="py-3 px-3 sm:px-4 text-xs font-semibold">
                      {job.status === 'completed' && log.successCount !== undefined && (
                        <span className="text-emerald-700 font-bold">{log.successCount} imported</span>
                      )}
                      {job.status === 'failed' && (
                        <span className="text-rose-600 font-bold">Failed ({log.errors?.length || 0} errs)</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DataImport;
