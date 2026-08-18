import React, { useState } from 'react';
import { API_BASE } from '../../lib/api';

export default function DocumentUploadModal({ onClose, onUploadComplete }) {
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [type, setType] = useState('policy'); // policy, handbook, announcement
  const [accessLevel, setAccessLevel] = useState('all'); // all, level0, level1
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file || !title || !type) return;

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('document', file);
    formData.append('title', title);
    formData.append('type', type);
    formData.append('accessLevel', accessLevel);

    try {
      const res = await fetch(`${API_BASE}/api/chatbot/documents/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: formData
      });
      if (res.ok) {
        onUploadComplete();
      } else {
        const err = await res.json();
        setError(err.error || 'Failed to upload document.');
        setLoading(false);
      }
    } catch (err) {
      setError('Failed to upload document. Network error.');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-gray-700">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
        
        <h2 className="text-xl font-bold text-gray-900 mb-6">Upload to Knowledge Base</h2>
        
        {error && (
          <div className="mb-4 p-3 bg-rose-50 text-rose-700 rounded-lg text-sm border border-rose-200">
            {error}
          </div>
        )}

        <form onSubmit={handleUpload} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Document Title</label>
            <input 
              type="text" 
              required
              value={title} 
              onChange={(e) => setTitle(e.target.value)} 
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              placeholder="e.g. Leave Policy 2026"
            />
          </div>
          
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Document Type</label>
            <select 
              value={type} 
              onChange={(e) => setType(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
            >
              <option value="policy">Policy</option>
              <option value="handbook">Employee Handbook</option>
              <option value="announcement">Announcement</option>
              <option value="guideline">Guideline</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Access Level (AI Guardrail)</label>
            <select 
              value={accessLevel} 
              onChange={(e) => setAccessLevel(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
            >
              <option value="all">All Employees</option>
              <option value="level1">Managers & Above (Level 1)</option>
              <option value="level0">Admins & Owners Only (Level 0)</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">Controls who can retrieve this document via the AI.</p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">File (PDF, DOCX, TXT, MD)</label>
            <input 
              type="file" 
              required
              accept=".pdf,.docx,.txt,.md"
              onChange={(e) => setFile(e.target.files[0])}
              className="w-full text-sm text-gray-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
            />
          </div>

          <div className="pt-4 flex gap-3">
            <button 
              type="button" 
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={loading || !file || !title}
              className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition disabled:opacity-50 flex justify-center items-center"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                'Upload & Ingest'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
