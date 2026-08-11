import React, { useState, useEffect, useRef } from 'react';
import { Mail, Plus, Trash2, Send, ArrowRight } from 'lucide-react';
import { toast } from 'react-hot-toast';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { motion, AnimatePresence } from 'framer-motion';

const InviteEmployee = () => {
  const [emails, setEmails] = useState([]);
  const [newEmail, setNewEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const containerRef = useRef(null);

  // GSAP Intro Choreography (Safely Guarded)
  useGSAP(() => {
    const container = containerRef.current;
    if (!container) return;

    const cinematicHeader = container.querySelector('.cinematic-header');
    const cinematicInput = container.querySelector('.cinematic-input');
    const cinematicListHeader = container.querySelector('.cinematic-list-header');
    const floatingBoxes = container.querySelectorAll('.floating-box');

    const tl = gsap.timeline({ defaults: { ease: "power4.out" } });

    if (cinematicHeader) {
      tl.fromTo(cinematicHeader, 
        { scale: 0.95, opacity: 0, filter: "blur(8px)", y: 20 },
        { scale: 1, opacity: 1, filter: "blur(0px)", y: 0, duration: 0.8 }
      );
    }
    if (cinematicInput) {
      tl.fromTo(cinematicInput, 
        { scale: 0.98, opacity: 0, y: 15 },
        { scale: 1, opacity: 1, y: 0, duration: 0.7 },
        "-=0.6"
      );
    }
    if (cinematicListHeader) {
      tl.fromTo(cinematicListHeader,
        { opacity: 0 },
        { opacity: 1, duration: 0.5 },
        "-=0.4"
      );
    }

    if (floatingBoxes.length > 0) {
      gsap.to(floatingBoxes, {
        y: "-=3",
        duration: 4,
        ease: "sine.inOut",
        yoyo: true,
        repeat: -1,
        delay: 1.5,
        stagger: 0.5
      });
    }

  }, { scope: containerRef });

  const fetchEmails = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/users/invited-emails`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setEmails(data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmails();
  }, []);

  const handleInvite = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!newEmail || !newEmail.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/users/invited-emails`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ email: newEmail })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      toast.success('Invitation sent successfully!');
      setNewEmail('');
      fetchEmails();
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    }
  };

  const handleRemove = async (emailToRemove) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/users/invited-emails/${emailToRemove}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      toast.success('Invitation revoked');
      fetchEmails();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const listVariants = {
    hidden: { opacity: 0, scale: 0.95, y: 10 },
    visible: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 25 } },
    exit: { opacity: 0, scale: 0.9, transition: { duration: 0.2 } }
  };

  return (
    <div ref={containerRef} className="w-full min-h-full flex flex-col p-3 sm:p-5 md:p-6 bg-[#FAF9F6] font-sans">
      
      <div className="w-full max-w-3xl mx-auto flex flex-col flex-1">
        
        {/* Header Section */}
        <div className="cinematic-header mb-6 sm:mb-8 text-center flex flex-col items-center max-w-xl mx-auto">
          <div className="floating-box w-12 sm:w-16 h-12 sm:h-16 bg-white ring-1 ring-black/5 shadow-2xs rounded-2xl sm:rounded-[20px] flex items-center justify-center text-[#1D1B16] mb-4 sm:mb-6 shrink-0">
            <Mail className="w-6 h-6 sm:w-7 sm:h-7" strokeWidth={2} />
          </div>
          <h2 className="text-xl sm:text-3xl md:text-4xl font-extrabold text-[#1D1B16] tracking-tight leading-tight mb-2 sm:mb-3">
            Invite Access
          </h2>
          <p className="text-xs sm:text-sm md:text-[15px] text-[#6B655C] font-medium max-w-lg mx-auto leading-relaxed px-2">
            Provision access to the workspace. Invited users will be required to configure their own profiles during secure sign-up.
          </p>
        </div>

        {/* Premium Input Console */}
        <div className="cinematic-input floating-box bg-white ring-1 ring-black/5 shadow-2xs rounded-2xl sm:rounded-[24px] p-3.5 sm:p-5 md:p-6 mb-6 sm:mb-10 w-full">
          <form onSubmit={handleInvite} className="flex flex-col min-[520px]:flex-row gap-3 min-[520px]:gap-4 items-stretch min-[520px]:items-center">
            <div className="flex-1 w-full relative">
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="employee@company.com"
                className="w-full h-11 sm:h-14 bg-[#FAF9F6] border border-[#EAE7E0] rounded-xl sm:rounded-[16px] px-3.5 sm:px-5 text-xs sm:text-[15px] font-semibold text-[#1D1B16] tracking-tight focus:ring-2 focus:ring-[#1D1B16] focus:border-transparent outline-none transition-all placeholder:text-[#9A948A] placeholder:font-medium"
              />
              {error && (
                <motion.p 
                  initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}
                  className="absolute -bottom-5 sm:-bottom-6 left-2 text-[#B91C1C] text-[10px] sm:text-[12px] font-bold"
                >
                  {error}
                </motion.p>
              )}
            </div>
            
            {/* Button-in-Button CTA */}
            <button
              type="submit"
              className="group inline-flex items-center justify-center bg-[#1D1B16] text-white pl-4 sm:pl-5 pr-1.5 sm:pr-2 h-11 sm:h-14 rounded-xl sm:rounded-[16px] text-xs sm:text-[14px] font-bold shadow-md hover:shadow-lg hover:shadow-[#1D1B16]/20 active:scale-[0.97] transition-all duration-300 w-full min-[520px]:w-auto shrink-0 whitespace-nowrap"
            >
              <span className="mr-2 sm:mr-3">Send Invite</span>
              <div className="w-8 sm:w-10 h-8 sm:h-10 rounded-lg sm:rounded-[12px] bg-white/10 flex items-center justify-center group-hover:bg-white group-hover:text-[#1D1B16] transition-colors duration-300 shrink-0">
                <ArrowRight className="w-4 h-4 sm:w-4.5 sm:h-4.5 group-hover:translate-x-[2px] transition-transform duration-300" strokeWidth={2.5} />
              </div>
            </button>
          </form>
        </div>

        {/* Pending Invitations Floating Grid */}
        <div className="cinematic-list-header mb-3 sm:mb-4 flex items-center justify-between px-1 sm:px-2 w-full">
          <h3 className="font-extrabold text-[#1D1B16] text-sm sm:text-[18px] tracking-tight">Pending Invitations</h3>
          <span className="text-[10px] sm:text-[12px] font-bold text-[#9A948A] bg-white ring-1 ring-black/5 px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full shadow-2xs">
            {emails.length} Pending
          </span>
        </div>

        {loading ? (
          <div className="py-12 flex justify-center">
            <span className="text-[10px] sm:text-[11px] font-bold text-[#9A948A] tracking-[0.15em] uppercase">Loading...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 min-[540px]:grid-cols-2 gap-3 sm:gap-4 w-full">
            <AnimatePresence mode="popLayout">
              {emails.length === 0 ? (
                <motion.div 
                  key="empty"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="floating-box col-span-full py-12 sm:py-16 bg-white ring-1 ring-black/5 border border-dashed border-[#D5D2CC] rounded-2xl sm:rounded-[24px] flex flex-col items-center justify-center text-center p-4"
                >
                  <Mail size={28} strokeWidth={1.5} className="text-[#D5D2CC] mb-3 sm:mb-4" />
                  <p className="text-[#1D1B16] font-bold text-xs sm:text-[15px] mb-1">No pending invitations</p>
                  <p className="text-[#9A948A] text-[11px] sm:text-[13px] font-medium max-w-sm leading-relaxed">
                    When invited employees complete their sign-up process, they will automatically be removed from this list.
                  </p>
                </motion.div>
              ) : (
                emails.map((item) => (
                  <motion.div
                    key={item.id || item.email}
                    layout
                    variants={listVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="group flex items-center justify-between p-3 sm:p-4 bg-white ring-1 ring-black/5 rounded-xl sm:rounded-[20px] shadow-2xs hover:shadow-md transition-all duration-300"
                  >
                    <div className="flex items-center gap-2.5 sm:gap-3 overflow-hidden min-w-0 flex-1 pr-2">
                      <div className="w-8 sm:w-10 h-8 sm:h-10 rounded-full bg-[#FAF9F6] border border-[#EAE7E0] flex items-center justify-center shrink-0">
                        <Mail className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#9A948A]" strokeWidth={2.5} />
                      </div>
                      <span className="text-xs sm:text-[14px] font-bold text-[#1D1B16] tracking-tight truncate" title={item.email}>
                        {item.email}
                      </span>
                    </div>
                    
                    <button
                      type="button"
                      onClick={() => handleRemove(item.email)}
                      className="opacity-100 min-[540px]:opacity-0 min-[540px]:group-hover:opacity-100 flex items-center justify-center w-8 sm:w-9 h-8 sm:h-9 rounded-full bg-[#FEF2F2] text-[#B91C1C] hover:bg-[#FEE2E2] active:scale-[0.95] transition-all duration-200 shrink-0"
                      title="Revoke Invite"
                    >
                      <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" strokeWidth={2.5} />
                    </button>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>
        )}

      </div>
    </div>
  );
};

export default InviteEmployee;
