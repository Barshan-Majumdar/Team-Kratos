import React, { useState, useEffect } from 'react';
import SessionSidebar from './SessionSidebar';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import { API_BASE } from '../../lib/api';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';

export default function ChatbotDrawer({ isOpen, onClose }) {
  const [sessions, setSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isLoadingSession, setIsLoadingSession] = useState(false);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    let newSocket;
    if (isOpen) {
      loadSessions();
      if (!socket) {
        newSocket = io(API_BASE, {
          auth: { token: localStorage.getItem('token') }
        });
        setSocket(newSocket);
      }
    }
    
    // Clean up socket when component unmounts
    return () => {
      if (newSocket) {
        newSocket.disconnect();
      }
    };
  }, [isOpen]);

  useEffect(() => {
    if (!socket) return;

    socket.on('chatbot:chunk', (data) => {
      setMessages(prev => {
        const lastMsg = prev[prev.length - 1];
        if (lastMsg && lastMsg.id === 'streaming') {
          return [
            ...prev.slice(0, -1),
            { ...lastMsg, content: lastMsg.content + data.text }
          ];
        } else {
          const filtered = prev.filter(m => m.id !== 'thinking');
          return [...filtered, { role: 'model', content: data.text, id: 'streaming' }];
        }
      });
    });

    socket.on('chatbot:done', (data) => {
      setMessages(prev => {
        const lastMsg = prev[prev.length - 1];
        if (lastMsg && lastMsg.id === 'streaming') {
          return [
            ...prev.slice(0, -1),
            { ...lastMsg, id: Date.now() } // finalize ID
          ];
        } else {
          // If no chunks were sent, use text from done event
          const filtered = prev.filter(m => m.id !== 'thinking');
          return [...filtered, { role: 'model', content: data.text, id: Date.now() }];
        }
      });
      setIsStreaming(false);
    });

    socket.on('chatbot:error', (data) => {
      toast.error(data.error);
      setMessages(prev => prev.filter(m => m.id !== 'thinking' && m.id !== 'streaming'));
      setIsStreaming(false);
    });

    socket.on('chatbot:session', (data) => {
      setCurrentSessionId(data.sessionId);
      loadSessions();
    });

    return () => {
      socket.off('chatbot:chunk');
      socket.off('chatbot:done');
      socket.off('chatbot:error');
      socket.off('chatbot:session');
    };
  }, [socket]);

  const handleSelectSession = (id) => {
    setCurrentSessionId(id);
    if (id) {
      loadSessionMessages(id);
    } else {
      setMessages([]);
    }
  };

  const loadSessions = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/chatbot/sessions`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSessions(data);
      }
    } catch (err) {
      console.error("Failed to load sessions", err);
    }
  };

  const loadSessionMessages = async (id) => {
    setIsLoadingSession(true);
    try {
      const res = await fetch(`${API_BASE}/api/chatbot/sessions/${id}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages);
      }
    } catch (err) {
      console.error("Failed to load messages", err);
    } finally {
      setIsLoadingSession(false);
    }
  };

  const handleDeleteSession = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/api/chatbot/sessions/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        if (currentSessionId === id) {
          setCurrentSessionId(null);
        }
        loadSessions();
      }
    } catch (err) {
      console.error("Failed to delete session", err);
    }
  };

  const handleSendMessage = async (prompt) => {
    if (!socket) return;
    
    // Add user message to UI immediately
    setMessages(prev => [...prev, { role: 'user', content: prompt, id: Date.now() }]);
    setMessages(prev => [...prev, { role: 'model', content: '', id: 'thinking' }]); // Thinking placeholder
    setIsStreaming(true);

    socket.emit('chatbot:query', { prompt, sessionId: currentSessionId });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed top-0 right-0 h-full w-full sm:w-[500px] lg:w-[600px] bg-white shadow-2xl z-40 flex overflow-hidden translate-x-0 transition-transform">
      {isSidebarOpen && (
        <SessionSidebar 
          sessions={sessions} 
          currentSessionId={currentSessionId}
          onSelectSession={handleSelectSession}
          onDeleteSession={handleDeleteSession}
          onNewChat={() => handleSelectSession(null)}
          onClose={() => setIsSidebarOpen(false)}
        />
      )}
      <div className="flex-1 flex flex-col h-full relative border-l border-gray-200">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="text-gray-500 hover:text-gray-700">
             <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
          </button>
          <h2 className="font-semibold text-gray-700">Crew AI Copilot</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
             <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
        
        <MessageList messages={messages} isLoading={isLoadingSession} />
        <MessageInput onSend={handleSendMessage} isStreaming={isStreaming} />
      </div>
    </div>
  );
}
