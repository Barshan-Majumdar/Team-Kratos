import React, { useState, useEffect } from 'react';
import { Bot, X } from 'lucide-react';
import ChatbotDrawer from './ChatbotDrawer';

export default function ChatbotFAB() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleToggle = () => setIsOpen(true);
    window.addEventListener('toggle-chatbot', handleToggle);
    return () => window.removeEventListener('toggle-chatbot', handleToggle);
  }, []);

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 p-4 bg-blue-900 text-white rounded-full shadow-lg hover:bg-blue-950 transition-all z-50 flex items-center justify-center"
      >
        {isOpen ? <X size={24} /> : <Bot size={24} />}
      </button>
      <ChatbotDrawer isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
