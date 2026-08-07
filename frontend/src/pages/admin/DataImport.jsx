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
      case 'completed': return <span className="px-2.5 py-1 bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0] text-[12px] rounded-md flex items-center gap-1 font-bold w-fit"><CheckCircle size={14} strokeWidth={2.5} /> Completed</span>;
      case 'failed': return <span className="px-2.5 py-1 bg-rose-50 text-rose-700 border border-rose-200 text-[12px] rounded-md flex items-center gap-1 font-bold w-fit"><XCircle size={14} strokeWidth={2.5} /> Failed</span>;
      case 'importing': return <span className="px-2.5 py-1 bg-[#F0F3F9] text-[#1F2B4D] border border-[#E2E8F0] text-[12px] rounded-md flex items-center gap-1 font-bold animate-pulse w-fit"><RefreshCw size={14} className="animate-spin" strokeWidth={2.5} /> Importing</span>;
      default: return <span className="px-2.5 py-1 bg-[#FAF9F6] text-[#6B655C] border border-[#EAE7E0] text-[12px] rounded-md font-bold w-fit">{status}</span>;
    }
  };

  const doppelrandOuter = "bg-[#F4F1EA] rounded-[32px] p-2 shadow-[0_4px_24px_rgba(29,27,22,0.04)]";
  const doppelrandInner = "bg-white rounded-[24px] border border-[#EAE7E0] w-full h-full p-6 md:p-10 flex flex-col relative overflow-hidden";

  return (
    <div ref={containerRef} className="p-4 md:p-8 lg:p-12 max-w-6xl mx-auto space-y-10 min-h-screen font-sans bg-[#FAF9F6]">
      <div className="gsap-stagger opacity-0 flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-2">
        <div>
          <h1 className="text-[36px] md:text-[40px] font-bold text-[#1D1B16] tracking-tighter leading-none mb-3">Bulk Data Import</h1>
          <p className="text-[#6B655C] text-[15px] font-medium tracking-tight">Onboard hundreds of employees at once using CSV</p>
        </div>
      </div>

      {message && (
        <div className={`gsap-stagger opacity-0 p-5 rounded-2xl font-semibold text-[14px] flex items-center gap-3 ${message.type === 'error' ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0]'}`}>
          {message.type === 'error' ? <XCircle size={20} strokeWidth={2.5} /> : <CheckCircle size={20} strokeWidth={2.5} />}
          {message.text}
        </div>
      )}

      {/* Upload Section */}
      <div className={`ambient-float gsap-stagger opacity-0 w-full ${doppelrandOuter}`}>
        <div className={doppelrandInner}>
          <h2 className="text-[20px] font-bold text-[#1D1B16] tracking-tight mb-8">Upload CSV File</h2>
          
          <div className="bg-[#FAF9F6] p-6 rounded-2xl border border-[#EAE7E0] mb-8">
            <h3 className="font-bold text-[#1D1B16] text-[14px] mb-2">CSV Format Requirements</h3>
            <p className="text-[14px] text-[#6B655C] font-medium leading-relaxed mb-4">Ensure your CSV file contains the following columns exactly as named (case insensitive):</p>
            <div className="flex flex-wrap gap-2.5">
              {['Name', 'Email', 'Department', 'Position', 'Phone', 'Location', 'DateOfJoining'].map(col => (
                <span key={col} className="px-3.5 py-1.5 bg-white border border-[#EAE7E0] text-[#1D1B16] rounded-xl text-[12px] font-bold font-mono shadow-sm">{col}</span>
              ))}
            </div>
            <p className="text-[13px] font-bold text-[#8C5722] mt-5">* Email and Name are strictly required.</p>
          </div>

          <form onSubmit={handleUpload} className="space-y-6">
            <div className="group relative border-2 border-dashed border-[#EAE7E0] rounded-[24px] p-12 flex flex-col items-center justify-center text-center bg-white transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:bg-[#F0F3F9] hover:border-[#1F2B4D] hover:scale-[1.01] hover:shadow-[0_12px_32px_-6px_rgba(31,43,77,0.1)] cursor-pointer">
              <input 
                type="file" 
                accept=".csv" 
                onChange={(e) => setFile(e.target.files[0])}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <div className="w-20 h-20 bg-[#F0F3F9] text-[#1F2B4D] rounded-[18px] flex items-center justify-center mb-5 transition-transform duration-500 ease-out group-hover:scale-110 group-hover:rotate-3 shadow-sm border border-transparent group-hover:border-[#E2E8F0]">
                {file ? <FileText size={36} strokeWidth={2} /> : <UploadCloud size={36} strokeWidth={2} />}
              </div>
              <h3 className="text-[18px] font-bold text-[#1D1B16]">
                {file ? file.name : "Drag and drop your CSV here"}
              </h3>
              <p className="text-[#6B655C] text-[14px] font-medium mt-2">or click to browse from your computer</p>
            </div>

            <button 
              type="submit" 
              disabled={!file || uploading}
              className="group w-full py-4.5 bg-[#1F2B4D] text-white text-[15px] font-bold rounded-2xl shadow-[0_4px_16px_rgba(31,43,77,0.2)] transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:scale-[1.01] hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(31,43,77,0.3)] hover:bg-[#141C33] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:translate-y-0 flex justify-center items-center gap-3"
            >
              {uploading ? (
                <><RefreshCw className="animate-spin" size={18} strokeWidth={2.5} /> Processing Upload...</>
              ) : (
                <>Import Data <UploadCloud size={18} strokeWidth={2.5} className="transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:-translate-y-1 group-hover:scale-110" /></>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Jobs Table Section */}
      <div className={`ambient-float gsap-stagger opacity-0 w-full ${doppelrandOuter}`}>
        <div className={`${doppelrandInner} !p-0`}>
          <div className="p-6 md:p-8 border-b border-[#EAE7E0]">
            <h2 className="text-[20px] font-bold text-[#1D1B16] tracking-tight">Recent Import Jobs</h2>
          </div>
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left text-[14px]">
              <thead>
                <tr className="bg-[#FAF9F6] border-b border-[#EAE7E0]">
                  <th className="py-4 px-6 md:px-8 text-[13px] font-semibold text-[#6B655C]">Date</th>
                  <th className="py-4 px-6 md:px-8 text-[13px] font-semibold text-[#6B655C]">Source File</th>
                  <th className="py-4 px-6 md:px-8 text-[13px] font-semibold text-[#6B655C]">Status</th>
                  <th className="py-4 px-6 md:px-8 text-[13px] font-semibold text-[#6B655C]">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAE7E0]/60">
                {jobs.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="py-16 text-center text-[#6B655C] font-medium text-[15px]">No import jobs found</td>
                  </tr>
                ) : jobs.map(job => {
                  const log = job.errorLog || {};
                  return (
                    <tr key={job.id} className="group hover:bg-[#FAF9F6] transition-colors duration-300">
                      <td className="py-5 px-6 md:px-8 font-bold text-[#1D1B16]">
                        {new Date(job.createdAt).toLocaleString()}
                      </td>
                      <td className="py-5 px-6 md:px-8 text-[#1F2B4D] font-mono font-bold text-[13px]">
                        <a href={job.sourceFile} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 hover:underline hover:text-[#141C33]">
                          <FileText size={16} strokeWidth={2.5} /> View CSV
                        </a>
                      </td>
                      <td className="py-5 px-6 md:px-8">
                        {getStatusBadge(job.status)}
                      </td>
                      <td className="py-5 px-6 md:px-8 text-[13px] font-semibold">
                        {job.status === 'completed' && log.successCount !== undefined && (
                          <span className="text-[#065F46]">{log.successCount} imported</span>
                        )}
                        {job.status === 'failed' && (
                          <span className="text-rose-600">Failed with {log.errors?.length || 'unknown'} errors</span>
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
    </div>
  );
};

export default DataImport;
