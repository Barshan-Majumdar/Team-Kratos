import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { Activity, Plus, BarChart2, ShieldCheck, CheckCircle2, X } from 'lucide-react';
import { CardSkeleton } from '../components/ui/Skeleton';
import { motion, AnimatePresence } from 'framer-motion';

const PulseSurveys = ({ user }) => {
  const [surveys, setSurveys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [questions, setQuestions] = useState(['How are you feeling about your workload this week?']);

  const isManager = user?.roleDefinition?.level <= 2;

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/pulse`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSurveys(res.data);
    } catch (err) {
      toast.error('Failed to load surveys');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/pulse`, {
        title, questions: questions.filter(q => q.trim() !== '')
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Survey created and dispatched!');
      setShowModal(false);
      setTitle('');
      setQuestions(['']);
      fetchData();
    } catch (err) {
      toast.error('Failed to create survey');
    }
  };

  const handleQuestionChange = (index, value) => {
    const newQ = [...questions];
    newQ[index] = value;
    setQuestions(newQ);
  };

  const submitResponse = async (surveyId, responsesArray) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/pulse/${surveyId}/responses`, {
        answers: responsesArray
      }, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('Response submitted anonymously!');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to submit response');
    }
  };

  // Animation Variants
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { 
      opacity: 1, 
      y: 0,
      transition: { type: 'spring', stiffness: 260, damping: 20 }
    }
  };

  const modalVariants = {
    hidden: { opacity: 0, scale: 0.95, y: 20 },
    visible: { 
      opacity: 1, 
      scale: 1, 
      y: 0,
      transition: { type: 'spring', stiffness: 260, damping: 25 }
    },
    exit: { 
      opacity: 0, 
      scale: 0.95, 
      y: 10,
      transition: { duration: 0.2, ease: "easeInOut" }
    }
  };

  if (loading) return (
    <div className="p-4 md:p-8 lg:p-12 max-w-7xl mx-auto space-y-8 bg-[#FAF9F6] min-h-screen">
      <div className="animate-pulse space-y-2">
        <div className="h-8 w-48 bg-[#EAE7E0] rounded-lg" />
        <div className="h-4 w-72 bg-[#F4F1EA] rounded" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-[#FAF8F5] rounded-[24px] border border-[#EAE7E0] p-6 shadow-sm"><CardSkeleton /></div>
        <div className="bg-[#FAF8F5] rounded-[24px] border border-[#EAE7E0] p-6 shadow-sm"><CardSkeleton /></div>
        <div className="bg-[#FAF8F5] rounded-[24px] border border-[#EAE7E0] p-6 shadow-sm"><CardSkeleton /></div>
      </div>
    </div>
  );

  return (
    <div className="p-4 md:p-8 lg:p-12 max-w-7xl mx-auto space-y-8 bg-[#FAF9F6] min-h-screen">
      
      {/* Header Section */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-[clamp(2.5rem,4vw,3rem)] font-bold text-[#000000] tracking-[-0.03em] font-palagio leading-none flex items-center gap-3">
            <Activity className="text-[#1F2B4D]" size={36} /> Pulse Surveys
          </h1>
          <p className="text-[#111827] text-[clamp(0.9375rem,0.9rem+0.2vw,1.125rem)] font-medium mt-3 leading-relaxed">
            Continuous, strictly anonymous team feedback.
          </p>
        </div>
        
        {/* Sweep Animation Button */}
        {isManager && (
          <button
            onClick={() => setShowModal(true)}
            className="relative overflow-hidden group flex items-center gap-2 bg-white border border-[#EAE7E0] text-[#1D1B16] px-5 py-2.5 rounded-xl font-bold shadow-xs transition-all duration-300 hover:border-[#1F2B4D] active:scale-95 whitespace-nowrap"
          >
            {/* Sweep Background */}
            <span className="absolute inset-0 bg-[#1F2B4D] translate-y-[100%] group-hover:translate-y-0 transition-transform duration-500 cubic-bezier(0.34, 1.56, 0.64, 1) z-0" />
            
            <Plus size={18} className="relative z-10 text-[#1F2B4D] group-hover:text-white transition-colors duration-300" />
            <span className="relative z-10 group-hover:text-white transition-colors duration-300">New Pulse Check</span>
          </button>
        )}
      </motion.div>

      {/* Premium Executive Navy Privacy Banner */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, type: 'spring', stiffness: 260, damping: 20 }}
        className="bg-gradient-to-r from-[#0F172A] via-[#1E293B] to-[#0F172A] text-white rounded-[20px] p-5 flex items-start sm:items-center gap-4 shadow-lg border border-[#334155]/40 relative overflow-hidden group"
      >
        <motion.div 
          animate={{ x: [0, 50, 0], y: [0, -20, 0] }}
          transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
          className="absolute top-0 right-0 w-96 h-96 bg-[#3B82F6]/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none" 
        />
        <ShieldCheck size={28} className="shrink-0 text-[#38BDF8] relative z-10 drop-shadow-[0_0_15px_rgba(56,189,248,0.5)]" />
        <div className="relative z-10">
          <p className="text-[14px] leading-relaxed font-medium text-[#CBD5E1]">
            <strong className="text-white font-bold tracking-wide font-mono uppercase text-[11px] mr-2 px-2 py-1 bg-white/10 rounded-md">Privacy Guarantee</strong> All responses are cryptographically hashed using SHA-256. Managers can see aggregated responses but can <strong className="text-white">never</strong> identify which employee submitted them.
          </p>
        </div>
      </motion.div>

      {/* Grid Container (Staggered Animation) */}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-2 gap-6"
      >
        {surveys.map((survey) => (
          <motion.div 
            key={survey.id} 
            variants={itemVariants}
            className="bg-[#FAF8F5] rounded-[24px] border border-[#EAE7E0] shadow-[0_10px_30px_-5px_rgba(0,0,0,0.06),0_4px_10px_-2px_rgba(0,0,0,0.03)] hover:shadow-[0_20px_40px_-5px_rgba(0,0,0,0.12)] hover:border-[#1F2B4D]/20 hover:-translate-y-1 transition-all duration-500 cubic-bezier(0.34, 1.56, 0.64, 1) p-7 flex flex-col justify-between group h-full relative overflow-hidden"
          >
            <div className="relative z-10 flex flex-col justify-between h-full">
              <div>
                <div className="flex justify-between items-start mb-6">
                  <h3 className="font-palagio italic font-bold text-[24px] text-black tracking-wide leading-tight">{survey.title}</h3>
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold uppercase font-mono tracking-widest rounded-full shadow-2xs shrink-0 ml-3 ${
                    survey.isActive ? 'bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0]' : 'bg-white text-[#64748B] border border-[#E2E8F0]'
                  }`}>
                    {survey.isActive && <div className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />}
                    {survey.isActive ? 'Active' : 'Closed'}
                  </span>
                </div>
                
                {isManager ? (
                  <div className="mt-5">
                    <p className="text-[11px] font-bold text-[#9A948A] uppercase tracking-wider flex items-center gap-1.5 mb-3">
                      <BarChart2 size={14} className="text-[#64748B]" /> Results Overview
                    </p>
                    <div className="bg-white rounded-[16px] p-5 border border-[#E2E8F0] shadow-sm">
                      <div className="flex flex-wrap gap-8 mb-6 pb-6 border-b border-[#E2E8F0]">
                        <div className="flex items-baseline gap-3">
                          <p className="text-5xl font-black text-black font-sans tracking-tight">{survey.responses?.length || 0}</p>
                          <p className="text-[11px] text-[#475569] uppercase font-mono tracking-widest font-extrabold pb-1.5">Submissions</p>
                        </div>
                        <div className="flex items-baseline gap-3">
                          <p className="text-5xl font-black text-[#3B82F6] font-sans tracking-tight">
                            {survey.responses?.length > 0 ? (survey.responses.reduce((sum, r) => sum + (r.rating || 0), 0) / survey.responses.length).toFixed(1) : "0.0"}
                          </p>
                          <p className="text-[11px] text-[#475569] uppercase font-mono tracking-widest font-extrabold pb-1.5">Avg Rating</p>
                        </div>
                      </div>
                      
                      {survey.questions && survey.questions.length > 0 && (
                        <div className="space-y-5">
                          <h4 className="text-[11px] font-bold text-[#9A948A] uppercase tracking-wider mb-2">Question Breakdown</h4>
                          {survey.questions.map((q, idx) => {
                            let total = 0;
                            let count = 0;
                            survey.responses?.forEach(r => {
                              if (r.answers && r.answers[idx]) {
                                total += (r.answers[idx].rating || 0);
                                count++;
                              }
                            });
                            const avg = count > 0 ? (total / count).toFixed(1) : "0.0";
                            return (
                              <div key={idx} className="bg-[#F8FAFC] rounded-[12px] p-4 border border-[#E2E8F0] flex items-center gap-4">
                                <div className="w-12 h-12 shrink-0 rounded-full flex flex-col items-center justify-center bg-white border border-[#CBD5E1] shadow-sm">
                                  <span className="text-[14px] font-bold text-[#1E293B] leading-none">{avg}</span>
                                  <span className="text-[8px] font-bold text-[#94A3B8] uppercase mt-0.5">/ 5</span>
                                </div>
                                <span className="font-semibold text-[#334155] text-[13px] leading-relaxed block flex-1">{q}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                ) : survey.hasResponded ? (
                  <div className="mt-5 space-y-4">
                    <div className="bg-[#ECFDF5] border border-[#A7F3D0] rounded-[16px] p-4 flex items-center gap-3 mb-6">
                      <div className="w-8 h-8 rounded-full bg-[#10B981]/20 flex items-center justify-center text-[#065F46]">
                        <CheckCircle2 size={18} />
                      </div>
                      <p className="text-[13px] font-bold text-[#065F46] tracking-wide">Response Recorded Anonymously</p>
                    </div>
                    {survey.userAnswers && survey.userAnswers.map((ans, idx) => (
                      <div key={idx} className="bg-white rounded-[16px] p-5 border border-[#E2E8F0] shadow-sm">
                        <p className="font-bold text-black mb-4 text-[14px] leading-relaxed">{ans.question}</p>
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 shrink-0 rounded-full flex items-center justify-center bg-[#3B82F6] text-white font-bold shadow-[0_0_15px_rgba(59,130,246,0.3)]">
                            {ans.rating}
                          </div>
                          {ans.text && (
                            <p className="text-[13px] text-[#475569] italic border-l-2 border-[#CBD5E1] pl-3 py-1 bg-[#F8FAFC] rounded-r-lg flex-1">
                              "{ans.text}"
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <form 
                    onSubmit={(e) => {
                      e.preventDefault();
                      const formData = new FormData(e.target);
                      const responsesArray = survey.questions.map((q, i) => ({
                        question: q,
                        rating: parseInt(formData.get(`q_${i}_rating`)),
                        text: formData.get(`q_${i}_text`)
                      }));
                      submitResponse(survey.id, responsesArray);
                    }}
                    className="space-y-6 mt-5"
                  >
                    {survey.questions.map((q, idx) => (
                      <div key={idx} className="bg-white rounded-[16px] p-5 border border-[#E2E8F0] shadow-sm">
                        <p className="font-bold text-black mb-5 text-[14px] leading-relaxed">{q}</p>
                        
                        {/* Premium Segmented Control for Rating */}
                        <div className="flex items-center justify-between gap-1 sm:gap-3 mb-5">
                          <span className="text-[10px] text-[#64748B] font-bold font-mono uppercase tracking-widest hidden sm:block w-12 text-center">Poor</span>
                          <div className="flex flex-1 justify-between gap-2 sm:px-2">
                            {[1, 2, 3, 4, 5].map(rating => (
                              <motion.label 
                                key={rating} 
                                className="cursor-pointer group relative block"
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9, type: 'spring', stiffness: 400, damping: 10 }}
                              >
                                <input required type="radio" name={`q_${idx}_rating`} value={rating} className="sr-only peer" />
                                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center bg-[#F8FAFC] border border-[#CBD5E1] peer-checked:bg-[#3B82F6] peer-checked:text-white peer-checked:border-[#3B82F6] peer-checked:shadow-[0_0_20px_rgba(59,130,246,0.4)] transition-all font-bold text-sm text-[#475569] group-hover:border-[#3B82F6]/50 shadow-sm relative z-10">
                                  {rating}
                                </div>
                              </motion.label>
                            ))}
                          </div>
                          <span className="text-[11px] text-[#6B655C] font-bold uppercase tracking-wider hidden sm:block w-12 text-center">Great</span>
                        </div>
                        
                        <input 
                          type="text" 
                          name={`q_${idx}_text`} 
                          placeholder="Additional context (optional)..." 
                          className="w-full text-[13px] font-medium bg-white border border-[#EAE7E0] px-4 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1F2B4D] focus:border-transparent transition-all placeholder:text-[#9A948A]" 
                        />
                      </div>
                    ))}
                    <button 
                      type="submit" 
                      className="w-full py-3.5 bg-gradient-to-b from-[#1E293B] to-[#0F172A] hover:from-black hover:to-[#0F172A] text-white rounded-[14px] font-bold transition-all shadow-[0_4px_14px_rgba(15,23,42,0.25)] hover:shadow-[0_6px_20px_rgba(15,23,42,0.35)] hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2 mt-2"
                    >
                      <CheckCircle2 size={18} className="text-[#38BDF8]" /> Submit Anonymously
                    </button>
                  </form>
                )}
              </div>
              <div className="mt-6 pt-5 border-t border-[#E2E8F0] flex justify-between items-center">
                <p className="text-[10px] font-extrabold font-mono text-[#64748B] uppercase tracking-widest">
                  Dispatched {new Date(survey.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
              </div>
            </div>
          </motion.div>
        ))}

        {surveys.length === 0 && (
          <motion.div 
            variants={itemVariants}
            className="col-span-full py-24 flex flex-col items-center justify-center text-center bg-white rounded-[24px] border border-dashed border-[#CBD5E1] shadow-sm"
          >
            <motion.div 
              animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              className="w-20 h-20 rounded-full bg-[#F0F3F9] border border-[#E2E8F0] flex items-center justify-center text-[#3B82F6] mb-6 shadow-inner"
            >
              <Activity size={32} />
            </motion.div>
            <h3 className="text-[19px] font-bold text-[#1D1B16] tracking-tight">No active pulse surveys</h3>
            <p className="text-[#6B655C] mt-1.5 font-medium max-w-sm">Surveys will appear here when they are dispatched by leadership.</p>
          </motion.div>
        )}
      </motion.div>

      {/* Premium Dispatch Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-[#0F172A]/40 backdrop-blur-md"
              onClick={() => setShowModal(false)}
            />
            
            {/* Modal Surface */}
            <motion.div 
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="relative w-full max-w-md bg-white rounded-[24px] shadow-2xl border border-[#EAE7E0] overflow-hidden"
            >
              <div className="flex items-center justify-between p-6 border-b border-[#F4F1EA] bg-[#FAF9F6]">
                <h2 className="text-xl font-bold text-[#1D1B16] tracking-tight">Dispatch Pulse Check</h2>
                <button 
                  onClick={() => setShowModal(false)}
                  className="p-1.5 text-[#9A948A] hover:text-[#1D1B16] hover:bg-[#EAE7E0] rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleCreate} className="p-6 space-y-5 bg-white">
                <div>
                  <label className="block text-[13px] font-bold text-[#6B655C] mb-1.5 uppercase tracking-wide">Survey Title</label>
                  <input 
                    required 
                    type="text" 
                    value={title} 
                    onChange={(e) => setTitle(e.target.value)} 
                    placeholder="E.g. Mid-Q3 Morale Check" 
                    className="w-full px-4 py-3 bg-[#FAF9F6] border border-[#EAE7E0] text-[#1D1B16] font-semibold rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1F2B4D] focus:border-transparent transition-all placeholder:text-[#9A948A] placeholder:font-medium" 
                  />
                </div>
                
                <div>
                  <label className="block text-[13px] font-bold text-[#6B655C] mb-3 uppercase tracking-wide flex items-center justify-between">
                    Questions
                    {questions.length < 5 && (
                      <button 
                        type="button" 
                        onClick={() => setQuestions([...questions, ''])} 
                        className="text-[10px] font-bold text-[#1F2B4D] hover:bg-[#F0F3F9] px-2 py-1 rounded-md transition-colors uppercase tracking-wider"
                      >
                        + Add
                      </button>
                    )}
                  </label>
                  <div className="space-y-3">
                    {questions.map((q, idx) => (
                      <div className="relative group" key={idx}>
                        <div className="absolute left-3 top-3 w-5 h-5 rounded-full bg-[#EAE7E0] flex items-center justify-center text-[10px] font-bold text-[#6B655C]">
                          {idx + 1}
                        </div>
                        <input 
                          type="text" 
                          value={q} 
                          onChange={(e) => handleQuestionChange(idx, e.target.value)} 
                          placeholder={`Enter question ${idx + 1}...`} 
                          className="w-full pl-10 pr-4 py-3 bg-[#FAF9F6] border border-[#EAE7E0] text-[#1D1B16] font-medium text-[13px] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1F2B4D] focus:border-transparent transition-all placeholder:text-[#9A948A]" 
                        />
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="pt-2 flex gap-3">
                  <button 
                    type="button" 
                    onClick={() => setShowModal(false)} 
                    className="flex-1 px-4 py-3 border border-[#EAE7E0] bg-white text-[#1D1B16] font-bold rounded-xl hover:bg-[#FAF9F6] transition-colors active:scale-95"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="flex-1 px-4 py-3 bg-[#1F2B4D] text-white font-bold rounded-xl shadow-md hover:bg-[#141C33] hover:shadow-lg transition-all active:scale-95"
                  >
                    Dispatch Now
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default PulseSurveys;
