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
        <div className="double-bezel-outer bg-[#F4F1EA] p-1.5"><div className="double-bezel-inner bg-white p-6"><CardSkeleton /></div></div>
        <div className="double-bezel-outer bg-[#F4F1EA] p-1.5"><div className="double-bezel-inner bg-white p-6"><CardSkeleton /></div></div>
        <div className="double-bezel-outer bg-[#F4F1EA] p-1.5"><div className="double-bezel-inner bg-white p-6"><CardSkeleton /></div></div>
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
          <h1 className="text-[28px] font-bold text-[#1D1B16] tracking-tight flex items-center gap-3">
            <Activity className="text-[#1F2B4D]" /> Pulse Surveys
          </h1>
          <p className="text-[#6B655C] mt-1 text-sm font-medium">Continuous, strictly anonymous team feedback.</p>
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
        className="bg-[#1F2B4D] text-white rounded-[20px] p-5 flex items-start sm:items-center gap-4 shadow-md border border-[#141C33]/20 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none" />
        <ShieldCheck size={28} className="shrink-0 text-[#38BDF8] relative z-10" />
        <div className="relative z-10">
          <p className="text-[13.5px] leading-relaxed font-medium text-indigo-50/90">
            <strong className="text-white font-bold tracking-wide">Privacy Guarantee:</strong> All responses are cryptographically hashed using SHA-256. Managers can see aggregated responses but can <strong className="text-white">never</strong> identify which employee submitted them.
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
            className="double-bezel-outer bg-[#F4F1EA] p-1.5 group hover:shadow-[0_6px_24px_-4px_rgba(29,27,22,0.08),_0_12px_32px_-6px_rgba(29,27,22,0.10)] hover:-translate-y-[2px] transition-all duration-500 cubic-bezier(0.34, 1.56, 0.64, 1) flex flex-col"
          >
            <div className="double-bezel-inner bg-white h-full p-6 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-5">
                  <h3 className="font-bold text-[#1D1B16] text-[17px] tracking-tight">{survey.title}</h3>
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider rounded-full shadow-xs shrink-0 ml-3 ${
                    survey.isActive ? 'bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0]' : 'bg-[#FAF9F6] text-[#6B655C] border border-[#EAE7E0]'
                  }`}>
                    {survey.isActive && <div className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />}
                    {survey.isActive ? 'Active' : 'Closed'}
                  </span>
                </div>
                
                {isManager ? (
                  <div className="mt-5">
                    <p className="text-[11px] font-bold text-[#9A948A] uppercase tracking-wider flex items-center gap-1.5 mb-3">
                      <BarChart2 size={14} className="text-[#6B655C]" /> Results Overview
                    </p>
                    <div className="bg-[#FAF9F6] rounded-[14px] p-5 border border-[#EAE7E0]">
                      <div className="flex items-end gap-3 mb-2">
                        <p className="text-4xl font-extrabold text-[#1F2B4D] tracking-tighter">{survey.responses?.length || 0}</p>
                        <p className="text-[11px] text-[#6B655C] uppercase tracking-wide font-bold pb-1.5">Total Submissions</p>
                      </div>
                      
                      {survey.questions && survey.questions.length > 0 && (
                        <div className="mt-5 space-y-4">
                          {survey.questions.map((q, idx) => (
                            <div key={idx} className="relative pl-4 border-l-2 border-[#1F2B4D]/10 text-sm">
                              <span className="font-semibold text-[#1D1B16] leading-snug block">{q}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
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
                      <div key={idx} className="bg-[#FAF9F6] rounded-[14px] p-5 border border-[#EAE7E0]">
                        <p className="font-bold text-[#1D1B16] mb-4 text-[13.5px] leading-snug">{q}</p>
                        
                        {/* Premium Segmented Control for Rating */}
                        <div className="flex items-center justify-between gap-1 sm:gap-3 mb-4">
                          <span className="text-[11px] text-[#6B655C] font-bold uppercase tracking-wider hidden sm:block w-12 text-center">Poor</span>
                          <div className="flex flex-1 justify-between gap-2 sm:px-2">
                            {[1, 2, 3, 4, 5].map(rating => (
                              <label key={rating} className="cursor-pointer group relative">
                                <input required type="radio" name={`q_${idx}_rating`} value={rating} className="sr-only peer" />
                                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center bg-white border border-[#EAE7E0] peer-checked:bg-[#1F2B4D] peer-checked:text-white peer-checked:border-[#1F2B4D] peer-checked:shadow-md transition-all font-bold text-sm text-[#6B655C] group-hover:border-[#1F2B4D]/30 group-active:scale-90 shadow-sm relative z-10">
                                  {rating}
                                </div>
                              </label>
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
                      className="w-full py-3 bg-[#1F2B4D] text-white rounded-xl font-bold hover:bg-[#141C33] transition-all shadow-md active:scale-[0.98] flex items-center justify-center gap-2"
                    >
                      <CheckCircle2 size={18} /> Submit Anonymously
                    </button>
                  </form>
                )}
              </div>
              <p className="text-[11px] font-bold text-[#9A948A] mt-5 pt-4 border-t border-[#EAE7E0] text-right uppercase tracking-wider">
                Dispatched {new Date(survey.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
              </p>
            </div>
          </motion.div>
        ))}

        {surveys.length === 0 && (
          <motion.div 
            variants={itemVariants}
            className="col-span-full py-20 flex flex-col items-center justify-center text-center bg-white rounded-[24px] border border-dashed border-[#EAE7E0] shadow-sm"
          >
            <div className="w-16 h-16 rounded-full bg-[#FAF9F6] border border-[#EAE7E0] flex items-center justify-center text-[#9A948A] mb-5">
              <Activity size={28} />
            </div>
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
