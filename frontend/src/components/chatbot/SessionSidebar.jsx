import React from 'react';
import { Trash2 } from 'lucide-react';

export default function SessionSidebar({ sessions, currentSessionId, onSelectSession, onDeleteSession, onNewChat, onClose }) {
  return (
    <div className="w-64 bg-slate-50 flex flex-col h-full flex-shrink-0 z-10">
      <div className="p-4 border-b border-slate-100 flex justify-between items-center">
        <button 
          onClick={onNewChat}
          className="flex items-center text-[13px] font-bold text-indigo-700 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100/50 px-3 py-2.5 rounded-xl w-full justify-center transition-colors shadow-sm"
        >
          + New Chat
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-2 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-300/50 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-slate-400/50">
        {sessions.map(s => (
          <div 
            key={s.id} 
            className={`group flex items-center justify-between w-full px-3 py-2 text-sm rounded-xl mb-1 transition-colors ${
              currentSessionId === s.id ? 'bg-indigo-100/60 text-indigo-900 font-medium' : 'text-slate-600 hover:bg-slate-200/50'
            }`}
          >
            <button
              onClick={() => onSelectSession(s.id)}
              className="truncate flex-1 text-left outline-none"
            >
              {s.title || 'New Chat'}
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDeleteSession(s.id); }}
              className="ml-2 text-gray-400 hover:text-red-500 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity outline-none"
              title="Delete chat"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
        {sessions.length === 0 && (
          <p className="text-sm text-gray-500 text-center mt-4">No recent chats.</p>
        )}
      </div>
    </div>
  );
}
