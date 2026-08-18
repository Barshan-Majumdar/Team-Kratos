import React, { useEffect, useState } from 'react';
import { API_BASE } from '../../lib/api';
import { Bot, FileText, Trash2 } from 'lucide-react';
import DocumentUploadModal from './DocumentUploadModal';

export default function KnowledgeBaseSettings() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/chatbot/documents`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        setDocuments(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  return (
    <div className="bg-white rounded-[24px] border border-[#EAE7E0] p-6 md:p-8 flex flex-col h-full">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-[18px] font-bold text-[#1D1B16] flex items-center gap-2">
          <Bot size={20} className="text-indigo-600" /> AI Knowledge Base
        </h2>
        <button 
          onClick={() => setShowUpload(true)}
          className="px-4 py-2 bg-indigo-600 text-white text-[13px] font-bold rounded-xl hover:bg-indigo-700 transition shadow-sm"
        >
          + Upload Document
        </button>
      </div>

      <div className="flex-1">
        {loading ? (
          <div className="text-center text-gray-500 py-10">Loading knowledge base...</div>
        ) : documents.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-gray-300 rounded-2xl flex flex-col items-center">
            <Bot size={40} className="text-gray-400 mb-3" />
            <p className="text-gray-900 font-bold">Your AI's brain is empty</p>
            <p className="text-sm text-gray-500 mt-1">Upload company policies to make the HR Copilot smarter.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {documents.map(doc => (
              <div key={doc.id} className="flex justify-between items-center p-4 border border-gray-200 rounded-2xl hover:shadow-sm transition">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
                    <FileText size={18} />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">{doc.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs font-semibold bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md uppercase">{doc.type}</span>
                      <span className="text-xs font-semibold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md">Access: {doc.accessLevel}</span>
                    </div>
                  </div>
                </div>
                <div className="text-xs text-gray-500 font-medium">
                  {new Date(doc.createdAt).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showUpload && (
        <DocumentUploadModal 
          onClose={() => setShowUpload(false)} 
          onUploadComplete={() => {
            setShowUpload(false);
            fetchDocuments();
          }} 
        />
      )}
    </div>
  );
}
