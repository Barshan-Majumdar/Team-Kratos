import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { UploadCloud, FileText, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { io } from 'socket.io-client';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const DataImport = () => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [jobs, setJobs] = useState([]);
  const [message, setMessage] = useState(null);

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

    const socket = io(API_BASE, { transports: ['websocket', 'polling'] });
    
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
      case 'completed': return <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs rounded-md flex items-center gap-1 font-semibold"><CheckCircle size={14} /> Completed</span>;
      case 'failed': return <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-md flex items-center gap-1 font-semibold"><XCircle size={14} /> Failed</span>;
      case 'importing': return <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-md flex items-center gap-1 font-semibold animate-pulse"><RefreshCw size={14} className="animate-spin" /> Importing</span>;
      default: return <span className="px-2 py-1 bg-slate-100 text-slate-700 text-xs rounded-md font-semibold">{status}</span>;
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-black text-slate-800 tracking-tight">Bulk Data Import</h1>
        <p className="text-slate-500 mt-2 text-lg">Onboard hundreds of employees at once using CSV</p>
      </div>

      {message && (
        <div className={`p-4 rounded-xl font-medium ${message.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
          {message.text}
        </div>
      )}

      <div className="bg-white/70 backdrop-blur-xl border border-white/20 shadow-xl rounded-3xl p-8">
        <h2 className="text-xl font-bold text-slate-800 mb-6">Upload CSV File</h2>
        
        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 mb-8">
          <h3 className="font-bold text-slate-700 mb-2">CSV Format Requirements:</h3>
          <p className="text-sm text-slate-600 mb-4">Ensure your CSV file contains the following columns exactly as named (case insensitive):</p>
          <div className="flex flex-wrap gap-2">
            {['Name', 'Email', 'Department', 'Position', 'Phone', 'Location', 'DateOfJoining'].map(col => (
              <span key={col} className="px-3 py-1 bg-white border border-slate-300 text-slate-700 rounded-md text-xs font-mono">{col}</span>
            ))}
          </div>
          <p className="text-xs text-slate-400 mt-4">* Email and Name are strictly required.</p>
        </div>

        <form onSubmit={handleUpload} className="space-y-6">
          <div className="border-2 border-dashed border-slate-300 rounded-2xl p-10 flex flex-col items-center justify-center text-center hover:bg-slate-50 transition cursor-pointer relative">
            <input 
              type="file" 
              accept=".csv" 
              onChange={(e) => setFile(e.target.files[0])}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mb-4">
              <UploadCloud size={32} />
            </div>
            <h3 className="text-lg font-bold text-slate-700">
              {file ? file.name : "Drag and drop your CSV here"}
            </h3>
            <p className="text-slate-500 text-sm mt-1">or click to browse from your computer</p>
          </div>

          <button 
            type="submit" 
            disabled={!file || uploading}
            className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-bold rounded-xl shadow-md shadow-indigo-200 transition-all text-lg flex justify-center items-center gap-2"
          >
            {uploading ? <><RefreshCw className="animate-spin" /> Uploading to ImageKit...</> : 'Import Data'}
          </button>
        </form>
      </div>

      <div className="bg-white/70 backdrop-blur-xl border border-white/20 shadow-xl rounded-3xl p-8">
        <h2 className="text-xl font-bold text-slate-800 mb-6">Recent Import Jobs</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Date</th>
                <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Source File</th>
                <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Details</th>
              </tr>
            </thead>
            <tbody>
              {jobs.length === 0 ? (
                <tr>
                  <td colSpan="4" className="py-8 text-center text-slate-500 italic">No import jobs found</td>
                </tr>
              ) : jobs.map(job => {
                const log = job.errorLog || {};
                return (
                  <tr key={job.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-4 px-4 text-sm font-medium text-slate-800">
                      {new Date(job.createdAt).toLocaleString()}
                    </td>
                    <td className="py-4 px-4 text-sm text-indigo-600 font-mono">
                      <a href={job.sourceFile} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:underline">
                        <FileText size={16} /> View CSV
                      </a>
                    </td>
                    <td className="py-4 px-4">
                      {getStatusBadge(job.status)}
                    </td>
                    <td className="py-4 px-4 text-xs text-slate-600">
                      {job.status === 'completed' && log.successCount !== undefined && (
                        <span className="text-emerald-600 font-bold">{log.successCount} imported</span>
                      )}
                      {job.status === 'failed' && (
                        <span className="text-red-600">Failed with {log.errors?.length || 'unknown'} errors</span>
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
