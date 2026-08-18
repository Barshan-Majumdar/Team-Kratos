import React, { useState } from 'react';

export default function MessageInput({ onSend, isStreaming }) {
  const [text, setText] = useState('');

  const handleSend = () => {
    if (text.trim() && !isStreaming) {
      onSend(text.trim());
      setText('');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="w-full">
      <div className="flex space-x-2 sm:space-x-3">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask Iris..."
          disabled={isStreaming}
          className="flex-1 border border-slate-200 shadow-sm rounded-2xl p-3 sm:p-3.5 resize-none focus:outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-400/20 min-h-[48px] sm:min-h-[54px] max-h-[120px] sm:max-h-[150px] transition-all bg-slate-50/50 focus:bg-white text-[14px] sm:text-[15px]"
          rows={1}
        />
        <button 
          onClick={handleSend}
          disabled={!text.trim() || isStreaming}
          className="bg-[#0F172A] text-white rounded-2xl px-4 sm:px-5 hover:bg-[#1E293B] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center self-end h-[48px] sm:h-[54px] shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 shrink-0"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" className="sm:w-5 sm:h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
        </button>
      </div>
    </div>
  );
}
