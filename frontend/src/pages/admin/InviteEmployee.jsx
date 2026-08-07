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

  // Elite GSAP Intro Choreography
  useGSAP(() => {
    const tl = gsap.timeline({ defaults: { ease: "power4.out" } });

    tl.fromTo('.cinematic-header', 
      { scale: 0.95, opacity: 0, filter: "blur(8px)", y: 20 },
      { scale: 1, opacity: 1, filter: "blur(0px)", y: 0, duration: 0.8 }
    )
    .fromTo('.cinematic-input', 
      { scale: 0.98, opacity: 0, y: 15 },
      { scale: 1, opacity: 1, y: 0, duration: 0.7 },
      "-=0.6"
    )
    .fromTo('.cinematic-list-header',
      { opacity: 0 },
      { opacity: 1, duration: 0.5 },
      "-=0.4"
    );

    // Continuous subtle floating animations (super subtle swaying)
    gsap.to('.floating-box', {
      y: "-=3",
      duration: 4,
      ease: "sine.inOut",
      yoyo: true,
      repeat: -1,
      delay: 1.5,
      stagger: 0.5
    });

  }, { scope: containerRef });

  const fetchEmails = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/users/invited-emails`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setEmails(data);
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

  // Framer Motion Variants for List
  const listVariants = {
    hidden: { opacity: 0, scale: 0.95, y: 10 },
    visible: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 25 } },
    exit: { opacity: 0, scale: 0.9, transition: { duration: 0.2 } }
  };

  return (
    <div ref={containerRef} className="max-w-4xl mx-auto py-8 font-sans">
      
      {/* Structural Outer Canvas */}
      <div className="bg-transparent rounded-[32px] overflow-hidden">
        
        {/* Header Section */}
        <div className="cinematic-header mb-10 text-center flex flex-col items-center">
          <div className="floating-box w-16 h-16 bg-white ring-1 ring-black/5 shadow-[0_2px_10px_rgb(0,0,0,0.02)] rounded-[20px] flex items-center justify-center text-[#1D1B16] mb-6">
            <Mail size={28} strokeWidth={2} />
          </div>
          <h2 className="text-[36px] font-extrabold text-[#1D1B16] tracking-tight leading-none mb-3">Invite Access</h2>
          <p className="text-[15px] text-[#6B655C] font-medium max-w-lg mx-auto">
            Provision access to the workspace. Invited users will be required to configure their own profiles during secure sign-up.
          </p>
        </div>

        {/* Premium Input Console */}
        <div className="cinematic-input floating-box bg-white ring-1 ring-black/5 shadow-[0_4px_24px_rgba(0,0,0,0.03)] rounded-[24px] p-6 mb-12">
          <form onSubmit={handleInvite} className="flex flex-col md:flex-row gap-4 items-start md:items-center">
            <div className="flex-1 w-full relative">
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="employee@company.com"
                className="w-full h-14 bg-[#FAF9F6] border border-[#EAE7E0] rounded-[16px] px-5 text-[15px] font-semibold text-[#1D1B16] tracking-tight focus:ring-2 focus:ring-[#1D1B16] focus:border-transparent outline-none transition-all placeholder:text-[#9A948A] placeholder:font-medium"
              />
              {error && (
                <motion.p 
                  initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}
                  className="absolute -bottom-6 left-2 text-[#B91C1C] text-[12px] font-bold"
                >
                  {error}
                </motion.p>
              )}
            </div>
            
            {/* Button-in-Button CTA */}
            <button
              type="submit"
              className="group flex items-center bg-[#1D1B16] text-white pl-5 pr-2 h-14 rounded-[16px] text-[14px] font-bold shadow-md hover:shadow-lg hover:shadow-[#1D1B16]/20 hover:-translate-y-0.5 active:scale-[0.97] active:translate-y-0 transition-all duration-300 w-full md:w-auto shrink-0"
            >
              <span className="mr-3">Send Invite</span>
              <div className="w-10 h-10 rounded-[12px] bg-white/10 flex items-center justify-center group-hover:bg-white group-hover:text-[#1D1B16] transition-colors duration-300">
                <ArrowRight size={18} strokeWidth={2.5} className="group-hover:translate-x-[2px] transition-transform duration-300" />
              </div>
            </button>
          </form>
        </div>

        {/* Pending Invitations Floating Grid */}
        <div className="cinematic-list-header mb-4 flex items-center justify-between px-2">
          <h3 className="font-extrabold text-[#1D1B16] text-[18px] tracking-tight">Pending Invitations</h3>
          <span className="text-[12px] font-bold text-[#9A948A] bg-white ring-1 ring-black/5 px-3 py-1 rounded-full shadow-sm">
            {emails.length} Pending
          </span>
        </div>

        {loading ? (
          <div className="py-12 flex justify-center">
            <span className="text-[11px] font-bold text-[#9A948A] tracking-[0.15em] uppercase">Loading...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AnimatePresence mode="popLayout">
              {emails.length === 0 ? (
                  <motion.div 
                    key="empty"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="floating-box col-span-full py-16 bg-white ring-1 ring-black/5 border border-dashed border-[#D5D2CC] shadow-[0_4px_24px_rgba(0,0,0,0.02)] rounded-[24px] flex flex-col items-center justify-center text-center"
                  >
                  <Mail size={32} strokeWidth={1.5} className="text-[#D5D2CC] mb-4" />
                  <p className="text-[#1D1B16] font-bold text-[15px] mb-1">No pending invitations</p>
                  <p className="text-[#9A948A] text-[13px] font-medium max-w-sm">When invited employees complete their sign-up process, they will automatically be removed from this list.</p>
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
                    className="group flex items-center justify-between p-4 bg-white ring-1 ring-black/5 rounded-[20px] shadow-[0_8px_20px_rgb(0,0,0,0.03)] hover:shadow-[0_16px_32px_rgb(0,0,0,0.06)] hover:-translate-y-1 hover:scale-[1.01] transition-all duration-300"
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="w-10 h-10 rounded-full bg-[#FAF9F6] border border-[#EAE7E0] flex items-center justify-center shrink-0">
                        <Mail size={16} strokeWidth={2.5} className="text-[#9A948A]" />
                      </div>
                      <span className="text-[14px] font-bold text-[#1D1B16] tracking-tight truncate">
                        {item.email}
                      </span>
                    </div>
                    
                    <button
                      onClick={() => handleRemove(item.email)}
                      className="opacity-0 group-hover:opacity-100 flex items-center justify-center w-9 h-9 rounded-full bg-[#FEF2F2] text-[#B91C1C] hover:bg-[#FEE2E2] active:scale-[0.95] transition-all duration-200 shrink-0"
                      title="Revoke Invite"
                    >
                      <Trash2 size={16} strokeWidth={2.5} />
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
