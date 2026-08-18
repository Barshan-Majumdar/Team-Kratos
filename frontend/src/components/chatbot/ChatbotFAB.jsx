import React, { useState, useEffect } from 'react';
import { Bot, X } from 'lucide-react';
import ChatbotDrawer from './ChatbotDrawer';

export default function ChatbotFAB() {
  const [isOpen, setIsOpen] = useState(false);
  const [initialPrompt, setInitialPrompt] = useState('');
  const [invisibleContext, setInvisibleContext] = useState(null);

  useEffect(() => {
    const handleToggle = (e) => {
      setIsOpen(true);
      if (e.detail?.prompt) {
        setInitialPrompt(e.detail.prompt);
      }
      if (e.detail?.context) {
        setInvisibleContext(e.detail.context);
      }
    };
    window.addEventListener('toggle-chatbot', handleToggle);
    return () => window.removeEventListener('toggle-chatbot', handleToggle);
  }, []);

  return (
    <ChatbotDrawer 
      isOpen={isOpen} 
      onClose={() => setIsOpen(false)} 
      initialPrompt={initialPrompt} 
      invisibleContext={invisibleContext}
      clearInitialPrompt={() => {
        setInitialPrompt('');
        setInvisibleContext(null);
      }} 
    />
  );
}
