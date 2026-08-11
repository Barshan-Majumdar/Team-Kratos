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
    <div className="w-full min-h-full flex flex-col gap-3 sm:gap-4 p-3 sm:p-5 md:p-6">
      <div className="animate-pulse space-y-2">
        <div className="h-6 w-44 bg-[#EAE7E0] rounded-lg" />
        <div className="h-3.5 w-64 bg-[#F4F1EA] rounded" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-[#FAF8F5] rounded-2xl border border-[#EAE7E0] p-4"><CardSkeleton /></div>
        <div className="bg-[#FAF8F5] rounded-2xl border border-[#EAE7E0] p-4"><CardSkeleton /></div>
      </div>
    </div>
  );

  return (
    <div className="w-full min-h-full flex flex-col gap-3 sm:gap-4 p-3 sm:p-5 md:p-6">
      
      {/* ── TOP EXECUTIVE HEADER ── */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
        className="flex flex-col min-[600px]:flex-row min-[600px]:items-center justify-between gap-2.5 pb-3 border-b border-[#EAE7E0] w-full"
      >
        <div>
          <h1 className="font-serif font-bold text-lg sm:text-2xl md:text-3xl text-[#1F2B4D] tracking-tight leading-tight flex items-center gap-2">
            <div className="p-1.5 bg-white rounded-xl shadow-2xs border border-[#EAE7E0]">
              <Activity className="text-[#1F2B4D] w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <span>Pulse Surveys</span>
          </h1>
          <p className="text-[#6B655C] mt-0.5 text-xs sm:text-sm font-medium">
            Continuous, strictly anonymous team feedback & morale tracking.
          </p>
        </div>
        
        {/* Sweep Animation Button - Restored Premium Hover Motion */}
        {isManager && (
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="relative overflow-hidden group inline-flex items-center justify-center gap-1.5 bg-white border border-[#EAE7E0] text-[#1F2B4D] px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs font-display font-bold uppercase tracking-wider shadow-2xs transition-all duration-300 hover:border-[#1F2B4D] active:scale-95 whitespace-nowrap shrink-0 w-full min-[600px]:w-auto"
          >
            {/* Sweep Background */}
            <span className="absolute inset-0 bg-[#1F2B4D] translate-y-[100%] group-hover:translate-y-0 transition-transform duration-500 cubic-bezier(0.34, 1.56, 0.64, 1) z-0" />
            
            <Plus size={15} className="relative z-10 text-[#1F2B4D] group-hover:text-white transition-colors duration-300 shrink-0" />
            <span className="relative z-10 group-hover:text-white transition-colors duration-300">New Pulse Check</span>
          </button>
        )}
      </motion.div>

      {/* ── PRIVACY GUARANTEE BANNER (Responsive Badge Alignment) ── */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, type: 'spring', stiffness: 260, damping: 20 }}
        className="bg-gradient-to-r from-[#0F172A] via-[#1E293B] to-[#0F172A] text-white rounded-2xl p-3.5 sm:p-4.5 flex flex-col sm:flex-row items-start sm:items-center gap-2.5 sm:gap-3.5 shadow-md border border-[#334155]/40 relative overflow-hidden w-full"
      >
        <div className="flex items-center gap-2 shrink-0">
          <ShieldCheck size={24} className="shrink-0 text-[#38BDF8] drop-shadow-[0_0_12px_rgba(56,189,248,0.5)]" />
          <span className="text-[10px] sm:text-[11px] font-bold tracking-wider font-mono uppercase px-2 py-0.5 bg-white/10 rounded-md text-white whitespace-nowrap shrink-0">
            Privacy Guarantee
          </span>
        </div>
        <p className="text-xs sm:text-sm leading-relaxed font-medium text-[#CBD5E1] flex-1">
          All responses are cryptographically hashed using SHA-256. Managers can see aggregated responses but can <strong className="text-white">never</strong> identify individual respondents.
        </p>
      </motion.div>

      {/* Grid Container (Staggered Animation) */}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-5 w-full"
      >
        {surveys.map((survey) => (
          <motion.div 
            key={survey.id} 
            variants={itemVariants}
            className="bg-white rounded-2xl border border-[#EAE7E0] shadow-2xs hover:border-[#1F2B4D]/20 transition-all p-4 sm:p-6 flex flex-col justify-between h-full relative overflow-hidden"
          >
            <div className="relative z-10 flex flex-col justify-between h-full">
              <div>
                <div className="flex justify-between items-start gap-2 mb-4">
                  <h3 className="font-serif font-bold text-base sm:text-xl text-[#1F2B4D] tracking-tight leading-tight">{survey.title}</h3>
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-[9.5px] sm:text-[10.5px] font-bold uppercase tracking-wider rounded-full shadow-2xs shrink-0 ${
                    survey.isActive ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-slate-50 text-slate-600 border border-slate-200'
                  }`}>
                    {survey.isActive && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />}
                    <span>{survey.isActive ? 'Active' : 'Closed'}</span>
                  </span>
                </div>
                
                {isManager ? (
                  <div className="mt-3">
                    <p className="text-[10px] font-display font-bold text-[#6B655C] uppercase tracking-wider flex items-center gap-1.5 mb-2.5">
                      <BarChart2 size={13} className="text-[#6B655C]" /> Results Overview
                    </p>
                    <div className="bg-[#FAF8F5] rounded-xl p-3.5 sm:p-4 border border-[#EAE7E0]">
                      <div className="flex items-center gap-6 mb-4 pb-3 border-b border-[#EAE7E0]">
                        <div className="flex items-baseline gap-1.5">
                          <p className="text-2xl sm:text-3xl font-black text-[#1F2B4D] tracking-tight">{survey.responses?.length || 0}</p>
                          <p className="text-[9.5px] text-[#6B655C] uppercase font-display font-bold">Submissions</p>
                        </div>
                        <div className="flex items-baseline gap-1.5">
                          <p className="text-2xl sm:text-3xl font-black text-[#3B82F6] tracking-tight">
                            {survey.responses?.length > 0 ? (survey.responses.reduce((sum, r) => sum + (r.rating || 0), 0) / survey.responses.length).toFixed(1) : "0.0"}
                          </p>
                          <p className="text-[9.5px] text-[#6B655C] uppercase font-display font-bold">Avg Rating</p>
                        </div>
                      </div>
                      
                      {survey.questions && survey.questions.length > 0 && (
                        <div className="space-y-3">
                          <h4 className="text-[9.5px] font-display font-bold text-[#6B655C] uppercase tracking-wider">Question Breakdown</h4>
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
                              <div key={idx} className="bg-white rounded-lg p-2.5 sm:p-3 border border-[#EAE7E0] flex items-center gap-3">
                                <div className="w-9 h-9 shrink-0 rounded-full flex flex-col items-center justify-center bg-[#FAF8F5] border border-[#EAE7E0]">
                                  <span className="text-xs font-bold text-[#1F2B4D] leading-none">{avg}</span>
                                  <span className="text-[7.5px] font-bold text-[#6B655C] uppercase mt-0.5">/ 5</span>
                                </div>
                                <span className="font-medium text-[#1F2B4D] text-xs leading-snug flex-1">{q}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                ) : survey.hasResponded ? (
                  <div className="mt-3 space-y-3">
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center gap-2.5">
                      <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-800 shrink-0">
                        <CheckCircle2 size={15} />
                      </div>
                      <p className="text-xs font-bold text-emerald-900">Response Recorded Anonymously</p>
                    </div>
                    {survey.userAnswers && survey.userAnswers.map((ans, idx) => (
                      <div key={idx} className="bg-[#FAF8F5] rounded-xl p-3 sm:p-4 border border-[#EAE7E0]">
                        <p className="font-bold text-[#1F2B4D] mb-2 text-xs leading-snug">{ans.question}</p>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 shrink-0 rounded-full flex items-center justify-center bg-[#1F2B4D] text-white font-bold text-xs shadow-2xs">
                            {ans.rating}
                          </div>
                          {ans.text && (
                            <p className="text-xs text-[#6B655C] italic border-l-2 border-[#CBD5E1] pl-2.5 py-0.5 flex-1">
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
                    className="space-y-4 mt-3"
                  >
                    {survey.questions.map((q, idx) => (
                      <div key={idx} className="bg-[#FAF8F5] rounded-xl p-3.5 sm:p-4 border border-[#EAE7E0]">
                        <p className="font-bold text-[#1F2B4D] mb-3 text-xs sm:text-sm leading-snug">{q}</p>
                        
                        {/* Rating Control (Mobile Responsive Touch Targets) */}
                        <div className="flex items-center justify-between gap-1 mb-3">
                          <span className="text-[9px] text-[#6B655C] font-display font-bold uppercase hidden sm:block w-10 text-center">Poor</span>
                          <div className="flex flex-1 justify-between gap-1 sm:gap-2">
                            {[1, 2, 3, 4, 5].map(rating => (
                              <label 
                                key={rating} 
                                className="cursor-pointer group relative block flex-1 max-w-[44px]"
                              >
                                <input required type="radio" name={`q_${idx}_rating`} value={rating} className="sr-only peer" />
                                <div className="w-full h-8 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center bg-white border border-[#EAE7E0] peer-checked:bg-[#1F2B4D] peer-checked:text-white peer-checked:border-[#1F2B4D] transition-all font-bold text-xs text-[#1F2B4D] shadow-2xs">
                                  {rating}
                                </div>
                              </label>
                            ))}
                          </div>
                          <span className="text-[9px] text-[#6B655C] font-display font-bold uppercase hidden sm:block w-10 text-center">Great</span>
                        </div>
                        
                        <input 
                          type="text" 
                          name={`q_${idx}_text`} 
                          placeholder="Additional context (optional)..." 
                          className="w-full text-xs font-medium bg-white border border-[#EAE7E0] px-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1F2B4D]" 
                        />
                      </div>
                    ))}
                    <button 
                      type="submit" 
                      className="w-full py-2.5 sm:py-3 bg-[#1F2B4D] hover:bg-[#141C33] text-white rounded-xl font-display font-bold text-xs uppercase tracking-wider transition-all shadow-2xs flex items-center justify-center gap-1.5"
                    >
                      <CheckCircle2 size={15} className="text-[#38BDF8]" />
                      <span>Submit Anonymously</span>
                    </button>
                  </form>
                )}
              </div>
              <div className="mt-4 pt-3 border-t border-[#EAE7E0] flex justify-between items-center">
                <p className="text-[9.5px] font-display font-bold text-[#6B655C] uppercase tracking-wider">
                  Dispatched {new Date(survey.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
              </div>
            </div>
          </motion.div>
        ))}

        {surveys.length === 0 && (
          <motion.div 
            variants={itemVariants}
            className="col-span-full py-12 sm:py-16 flex flex-col items-center justify-center text-center bg-white rounded-2xl border border-dashed border-[#EAE7E0] shadow-2xs p-4"
          >
            <div className="w-12 h-12 rounded-xl bg-[#FAF8F5] border border-[#EAE7E0] flex items-center justify-center text-[#1F2B4D] mb-3 shadow-2xs">
              <Activity size={22} />
            </div>
            <h3 className="text-base sm:text-lg font-serif font-bold text-[#1F2B4D] tracking-tight">No active pulse surveys</h3>
            <p className="text-[#6B655C] mt-1 text-xs font-medium max-w-xs">Surveys will appear here when they are dispatched by leadership.</p>
          </motion.div>
        )}
      </motion.div>

      {/* Premium Dispatch Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 bg-[#1F2B4D]/30 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
            <motion.div 
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="bg-white rounded-[20px] max-w-md w-full p-4 sm:p-6 shadow-xl border border-[#EAE7E0] max-h-[92vh] overflow-y-auto relative"
            >
              <div className="flex items-center justify-between pb-3 border-b border-[#F4F1EA] mb-3">
                <h2 className="font-serif font-bold text-base sm:text-xl text-[#1F2B4D]">Dispatch Pulse Check</h2>
                <button 
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="p-1.5 text-[#6B655C] hover:text-[#1F2B4D] bg-[#FAF8F5] rounded-lg transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleCreate} className="space-y-3">
                <div>
                  <label className="block text-[10px] font-display font-bold text-[#6B655C] mb-1 uppercase tracking-wider">Survey Title</label>
                  <input 
                    required 
                    type="text" 
                    value={title} 
                    onChange={(e) => setTitle(e.target.value)} 
                    placeholder="E.g. Mid-Q3 Morale Check" 
                    className="w-full px-3 py-2 bg-white border border-[#EAE7E0] text-[#1F2B4D] text-xs font-bold rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1F2B4D]" 
                  />
                </div>
                
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] font-display font-bold text-[#6B655C] uppercase tracking-wider">Questions</label>
                    {questions.length < 5 && (
                      <button 
                        type="button" 
                        onClick={() => setQuestions([...questions, ''])} 
                        className="text-[9.5px] font-display font-bold text-[#1F2B4D] hover:bg-[#F0F3F9] px-2 py-0.5 rounded-md transition-colors uppercase tracking-wider"
                      >
                        + Add Question
                      </button>
                    )}
                  </div>
                  <div className="space-y-2">
                    {questions.map((q, idx) => (
                      <div className="relative flex items-center" key={idx}>
                        <div className="absolute left-2.5 w-4 h-4 rounded-full bg-[#FAF8F5] border border-[#EAE7E0] flex items-center justify-center text-[9px] font-bold text-[#6B655C]">
                          {idx + 1}
                        </div>
                        <input 
                          type="text" 
                          value={q} 
                          onChange={(e) => handleQuestionChange(idx, e.target.value)} 
                          placeholder={`Enter question ${idx + 1}...`} 
                          className="w-full pl-8 pr-3 py-2 bg-white border border-[#EAE7E0] text-[#1F2B4D] text-xs font-medium rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1F2B4D]" 
                        />
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="pt-2 flex flex-col-reverse sm:flex-row gap-2 border-t border-[#F4F1EA]">
                  <button 
                    type="button" 
                    onClick={() => setShowModal(false)} 
                    className="w-full sm:w-auto flex-1 px-4 py-2 border border-[#EAE7E0] bg-white text-[#1F2B4D] text-xs font-display font-bold rounded-xl hover:bg-[#FAF8F5] transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="w-full sm:w-auto flex-1 px-5 py-2 bg-[#1F2B4D] hover:bg-[#141C33] text-white text-xs font-display font-bold rounded-xl shadow-2xs transition-all"
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
