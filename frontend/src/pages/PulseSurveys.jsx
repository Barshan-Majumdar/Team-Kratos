import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { Activity, Plus, BarChart2, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { CardSkeleton } from '../components/ui/Skeleton';

const PulseSurveys = ({ user }) => {
  const [surveys, setSurveys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [questions, setQuestions] = useState(['How are you feeling about your workload this week?']);

  const isManager = user?.roleDefinition?.level <= 2 || user?.role === 'Admin' || user?.role === 'Manager';

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

  if (loading) return (
    <div className="p-4 md:p-8 lg:p-12 max-w-7xl mx-auto space-y-8">
      <div className="animate-pulse space-y-2">
        <div className="h-8 w-48 bg-slate-200 rounded-lg" />
        <div className="h-4 w-72 bg-slate-100 rounded" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
    </div>
  );

  return (
    <div className="p-4 md:p-8 lg:p-12 max-w-7xl mx-auto space-y-8 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
            <Activity className="text-indigo-600" /> Pulse Surveys
          </h1>
          <p className="text-slate-500 mt-1 text-lg">Continuous, strictly anonymous team feedback.</p>
        </div>
        {isManager && (
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-indigo-700 transition-all shadow-sm active:scale-95 whitespace-nowrap"
          >
            <Plus size={18} /> New Pulse Check
          </button>
        )}
      </div>

      <div className="bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-2xl p-4 flex gap-3 mb-6">
        <ShieldCheck size={24} className="shrink-0 text-emerald-600" />
        <p className="text-sm">
          <strong>Privacy Guarantee:</strong> All responses are cryptographically hashed using SHA-256. Managers can see aggregated responses but can <strong>never</strong> identify which employee submitted them.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {surveys.map(survey => (
          <div key={survey.id} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start mb-4">
                <h3 className="font-bold text-slate-900 text-lg">{survey.title}</h3>
                <span className={`px-2.5 py-1 text-xs font-bold uppercase tracking-wider rounded-full ${survey.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                  {survey.isActive ? 'Active' : 'Closed'}
                </span>
              </div>
              
              {isManager ? (
                <div className="mt-4">
                  <p className="text-sm font-semibold text-slate-700 flex items-center gap-2 mb-2">
                    <BarChart2 size={16} className="text-indigo-600" /> Results Overview
                  </p>
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                    <p className="text-3xl font-bold text-slate-900">{survey.responses?.length || 0}</p>
                    <p className="text-xs text-slate-500 uppercase tracking-wide font-bold">Total Anonymous Submissions</p>
                    
                    {survey.questions && survey.questions.length > 0 && (
                      <div className="mt-4 space-y-3">
                        {survey.questions.map((q, idx) => (
                          <div key={idx} className="text-sm text-slate-700 border-l-2 border-indigo-200 pl-3">
                            <span className="font-medium text-slate-900">{q}</span>
                            {/* In a real app we'd aggregate specific ratings/answers here based on the JSON array */}
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
                  className="space-y-5 mt-4"
                >
                  {survey.questions.map((q, idx) => (
                    <div key={idx} className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                      <p className="font-medium text-slate-800 mb-3 text-sm">{q}</p>
                      <div className="flex gap-4 items-center mb-3">
                        <span className="text-xs text-slate-500 font-medium">Poor</span>
                        {[1, 2, 3, 4, 5].map(rating => (
                          <label key={rating} className="cursor-pointer">
                            <input required type="radio" name={`q_${idx}_rating`} value={rating} className="sr-only peer" />
                            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-white border border-slate-200 peer-checked:bg-indigo-600 peer-checked:text-white peer-checked:border-indigo-600 transition-all font-bold text-sm text-slate-600 shadow-sm hover:border-indigo-300">
                              {rating}
                            </div>
                          </label>
                        ))}
                        <span className="text-xs text-slate-500 font-medium">Great</span>
                      </div>
                      <input type="text" name={`q_${idx}_text`} placeholder="Additional comments (optional)..." className="w-full text-sm bg-white border border-slate-200 px-3 py-2 rounded-lg focus:outline-none focus:border-indigo-500" />
                    </div>
                  ))}
                  <button type="submit" className="w-full py-2.5 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors flex items-center justify-center gap-2">
                    <CheckCircle2 size={18} /> Submit Anonymously
                  </button>
                </form>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-4 text-right">
              {new Date(survey.createdAt).toLocaleDateString()}
            </p>
          </div>
        ))}
        {surveys.length === 0 && (
          <div className="col-span-full py-16 text-center bg-slate-50 rounded-3xl border border-dashed border-slate-200">
            <Activity size={48} className="mx-auto text-slate-300 mb-4" />
            <h3 className="text-lg font-bold text-slate-700">No active pulse surveys</h3>
            <p className="text-slate-500 mt-1">Surveys will appear here when they are dispatched.</p>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-scale-in">
            <div className="p-6 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-800">Dispatch Pulse Check</h2>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Survey Title</label>
                <input required type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="E.g. Mid-Q3 Morale Check" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 transition-all" />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Questions</label>
                <div className="space-y-3">
                  {questions.map((q, idx) => (
                    <input 
                      key={idx} 
                      type="text" 
                      value={q} 
                      onChange={(e) => handleQuestionChange(idx, e.target.value)} 
                      placeholder={`Question ${idx + 1}`} 
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500" 
                    />
                  ))}
                </div>
                {questions.length < 5 && (
                  <button type="button" onClick={() => setQuestions([...questions, ''])} className="mt-2 text-xs font-bold text-indigo-600 hover:text-indigo-800 uppercase tracking-wide">
                    + Add Question
                  </button>
                )}
              </div>
              
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 font-semibold rounded-xl hover:bg-slate-50 transition-colors">Cancel</button>
                <button type="submit" className="flex-1 px-4 py-2.5 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-colors">Dispatch Now</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PulseSurveys;
