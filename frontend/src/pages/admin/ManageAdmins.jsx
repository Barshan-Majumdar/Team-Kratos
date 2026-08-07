import React, { useState, useEffect, useRef } from 'react';
import { ShieldCheck, Plus, Trash2, ShieldAlert } from 'lucide-react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

const ManageAdmins = () => {
  const [emails, setEmails] = useState([]);
  const [newEmail, setNewEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const containerRef = useRef(null);

  const fetchEmails = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/users/admin-emails`, {
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

  useGSAP(() => {
    if (!loading) {
      gsap.fromTo('.gsap-stagger', 
        { opacity: 0, y: 30 }, 
        { opacity: 1, y: 0, duration: 0.8, stagger: 0.1, ease: 'power3.out' }
      );
    }
  }, [loading]);

  const handleAdd = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/users/admin-emails`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ email: newEmail })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setNewEmail('');
      fetchEmails();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleRemove = async (emailToRemove) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/users/admin-emails/${emailToRemove}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      fetchEmails();
    } catch (err) {
      alert(err.message);
    }
  };

  const doppelrandOuter = "bg-[#F4F1EA] rounded-[32px] p-2 sm:p-2.5 shadow-[0_4px_24px_rgba(29,27,22,0.04)]";
  const doppelrandInner = "bg-white rounded-[24px] border border-[#EAE7E0] w-full h-full p-6 md:p-10 flex flex-col";

  return (
    <div ref={containerRef} className="p-4 md:p-8 lg:p-12 max-w-4xl mx-auto min-h-[80vh] flex flex-col items-center justify-center font-sans">
      <div className={`w-full ${doppelrandOuter} gsap-stagger opacity-0`}>
        <div className={doppelrandInner}>
          
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 border-b border-[#EAE7E0] pb-8 mb-8 gsap-stagger opacity-0">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 bg-[#F0F3F9] rounded-[14px] flex items-center justify-center text-[#1F2B4D]">
                  <ShieldCheck size={24} strokeWidth={2.5} />
                </div>
                <h1 className="text-[36px] md:text-[40px] font-bold text-[#1D1B16] tracking-tighter leading-none">
                  Manage Admins
                </h1>
              </div>
              <p className="text-[#6B655C] text-[15px] font-medium tracking-tight mt-2">
                Authorize emails that will automatically get Admin access upon signup.
              </p>
            </div>
          </div>

          {/* Security Alert */}
          <div className="mb-10 p-5 bg-[#FAF9F6] rounded-2xl border border-[#EAE7E0] flex gap-4 gsap-stagger opacity-0 items-start">
            <div className="w-10 h-10 rounded-xl bg-white border border-[#EAE7E0] shadow-sm flex items-center justify-center shrink-0">
              <ShieldAlert size={20} className="text-[#8C5722]" strokeWidth={2.5} />
            </div>
            <div>
              <h3 className="font-bold text-[#1D1B16] text-[15px] mb-1">About Admin Access</h3>
              <p className="text-[#6B655C] text-[14px] font-medium leading-relaxed">
                Emails added here will automatically receive HR Admin (Level 1) access when they sign up. 
                Only the company Owner can modify this secure access list.
              </p>
            </div>
          </div>

          {/* Add Form */}
          <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-3 mb-10 gsap-stagger opacity-0">
            <div className="flex-1 relative">
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="Enter email address..."
                required
                className="w-full bg-[#FAF9F6] border border-[#EAE7E0] text-[#1D1B16] text-[15px] font-semibold rounded-2xl py-3.5 px-5 outline-none focus:ring-2 focus:ring-[#1F2B4D] focus:border-[#1F2B4D] transition-all duration-300 placeholder:text-[#9A948A] placeholder:font-medium"
              />
              {error && <p className="absolute -bottom-6 left-2 text-rose-500 text-[13px] font-bold">{error}</p>}
            </div>
            <button
              type="submit"
              className="group inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-[#1F2B4D] text-white text-[14px] font-bold rounded-2xl shadow-[0_4px_16px_rgba(31,43,77,0.2)] transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:scale-[1.03] hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(31,43,77,0.3)] hover:bg-[#141C33] active:scale-95 shrink-0"
            >
              <Plus size={18} strokeWidth={3} className="transition-transform duration-300 group-hover:rotate-90" /> 
              Add Admin
            </button>
          </form>

          {/* Authorized List */}
          <div className="flex-1 flex flex-col gsap-stagger opacity-0">
            <h3 className="text-[18px] font-bold text-[#1D1B16] tracking-tight mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#1F2B4D]"></span>
              Authorized Emails
            </h3>
            
            <div className="flex-1 bg-[#FAF9F6] border border-[#EAE7E0] rounded-[20px] overflow-hidden">
              {loading ? (
                <div className="py-12 flex items-center justify-center">
                  <div className="w-8 h-8 border-4 border-[#EAE7E0] border-t-[#1F2B4D] rounded-full animate-spin" />
                </div>
              ) : emails.length === 0 ? (
                <div className="py-12 flex flex-col items-center justify-center text-center px-4">
                  <div className="w-16 h-16 bg-white rounded-full border border-[#EAE7E0] flex items-center justify-center mb-4 shadow-sm">
                    <ShieldCheck size={28} className="text-[#9A948A]" strokeWidth={2} />
                  </div>
                  <p className="text-[15px] font-bold text-[#1D1B16]">No authorized admins</p>
                  <p className="text-[14px] text-[#6B655C] font-medium mt-1">Add an email above to grant HR admin access.</p>
                </div>
              ) : (
                <ul className="divide-y divide-[#EAE7E0]/60 max-h-[400px] overflow-y-auto custom-scrollbar p-2">
                  {emails.map((item) => (
                    <li 
                      key={item.id} 
                      className="group flex items-center justify-between p-3 md:p-4 rounded-[14px] hover:bg-white transition-all duration-300 ease-out hover:shadow-sm"
                    >
                      <div className="flex items-center gap-3 truncate">
                        <div className="w-10 h-10 rounded-full bg-[#F0F3F9] text-[#1F2B4D] flex items-center justify-center text-[13px] font-bold shrink-0">
                          {item.email.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-[15px] font-bold text-[#1D1B16] truncate pr-4">{item.email}</span>
                      </div>
                      <button
                        onClick={() => handleRemove(item.email)}
                        className="opacity-0 group-hover:opacity-100 p-2.5 text-[#6B655C] hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all duration-300 shrink-0 ease-out hover:scale-105 active:scale-95"
                        title="Remove Access"
                      >
                        <Trash2 size={18} strokeWidth={2.5} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default ManageAdmins;

