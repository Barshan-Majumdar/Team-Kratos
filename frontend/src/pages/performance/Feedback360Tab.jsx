import React, { useState, useEffect, useMemo, useRef } from 'react';
import { MessageSquare, EyeOff, Plus, X, Award, Sparkles, Filter, CheckCircle2, ChevronRight, BarChart2, Shield, User, Crown, Lock, ShieldAlert, ChevronDown, Activity, Check } from 'lucide-react';
import RadarChartWidget from './RadarChartWidget';
import toast from 'react-hot-toast';

const ICON_PATHS = {
  Leadership: <><path d="M2 20h20"/><path d="M5 20 3 8l5.5 5L12 6l3.5 7L21 8l-2 12"/></>,
  Teamwork: <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>,
  Communication: <><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></>,
  'Problem Solving': <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
};

const Feedback360Tab = ({ user, searchQuery = '', statusFilter = 'all' }) => {
  const [feedbacks, setFeedbacks] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Custom Dropdown State for Founder Access Selector
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // User Role Levels: Level 1 = Admin/Founder, Level 2 = Manager, Level 3 = Standard Employee
  const userLevel = user?.roleDefinition?.level ?? 3;
  const isFounderOrAdmin = userLevel <= 2;
  const isAdmin = userLevel <= 1;

  // Person Selector & View Toggle State
  const [selectedPersonId, setSelectedPersonId] = useState(user?.id || '');
  const [activeView, setActiveView] = useState('matrix'); // 'matrix' | 'radar'
  const [selectedCompetencyFilter, setSelectedCompetencyFilter] = useState(null);

  // If level 3 employee, force selectedPersonId to user.id
  useEffect(() => {
    if (!isFounderOrAdmin && user?.id) {
      setSelectedPersonId(user.id);
    }
  }, [isFounderOrAdmin, user?.id]);

  // Outside click listener for custom dropdown menu
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const defaultCompetencies = { Leadership: 4, Teamwork: 4, Communication: 4, 'Problem Solving': 4 };
  const [formData, setFormData] = useState({
    receiverId: '',
    content: '',
    isAnonymous: false,
    competencies: { ...defaultCompetencies }
  });

  useEffect(() => {
    fetchFeedback();
    fetchEmployees();
  }, []);

  const fetchFeedback = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/performance/feedback`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : [];
        setFeedbacks(list);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/users/directory?scope=all`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setEmployees(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/performance/feedback`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });
      
      if (res.ok) {
        toast.success('360 Feedback submitted successfully', { icon: '🤝' });
        setShowModal(false);
        setFormData({ receiverId: '', content: '', isAnonymous: false, competencies: { ...defaultCompetencies } });
        fetchFeedback();
      } else {
        const err = await res.json();
        const errMsg = Array.isArray(err.error) ? err.error[0].message : err.error;
        toast.error(errMsg || 'Failed to submit feedback');
      }
    } catch (err) {
      toast.error('Server error');
    }
  };

  const handleHide = async (id, e) => {
    e.stopPropagation();
    if (!await window.confirmDialog()) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/performance/feedback/${id}/status`, {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: 'Hidden' })
      });
      
      if (res.ok) {
        toast.success('Feedback hidden');
        fetchFeedback();
      } else {
        toast.error('Failed to hide feedback');
      }
    } catch (err) {
      toast.error('Server error');
    }
  };

  // Compute Aggregated Competency Scores across ALL feedback items
  const aggregatedCompetencyData = useMemo(() => {
    if (!feedbacks.length) return [];

    const totals = { Leadership: 0, Teamwork: 0, Communication: 0, 'Problem Solving': 0 };
    const counts = { Leadership: 0, Teamwork: 0, Communication: 0, 'Problem Solving': 0 };

    feedbacks.forEach(fb => {
      if (fb.competencies) {
        Object.entries(fb.competencies).forEach(([key, val]) => {
          if (totals[key] !== undefined && typeof val === 'number') {
            totals[key] += val;
            counts[key] += 1;
          }
        });
      }
    });

    return Object.keys(totals).map(key => {
      const avg = counts[key] > 0 ? (totals[key] / counts[key]).toFixed(1) : 1.0;
      return {
        subject: key,
        score: Number(avg),
        count: counts[key],
        fullMark: 5
      };
    });
  }, [feedbacks]);

  // Compute Person-Specific Competency Scores for the Selected Employee
  const personCompetencyRadarData = useMemo(() => {
    const targetId = isFounderOrAdmin ? selectedPersonId : user?.id;
    if (!targetId) return null;

    const personFeedbacks = feedbacks.filter(fb => fb.receiverId === targetId || fb.receiver?.id === targetId);
    if (!personFeedbacks.length) return null;

    const totals = { Leadership: 0, Teamwork: 0, Communication: 0, 'Problem Solving': 0 };
    const counts = { Leadership: 0, Teamwork: 0, Communication: 0, 'Problem Solving': 0 };

    personFeedbacks.forEach(fb => {
      if (fb.competencies) {
        Object.entries(fb.competencies).forEach(([key, val]) => {
          if (totals[key] !== undefined && typeof val === 'number') {
            totals[key] += val;
            counts[key] += 1;
          }
        });
      }
    });

    return Object.keys(totals).map(key => {
      const avg = counts[key] > 0 ? (totals[key] / counts[key]).toFixed(1) : 0;
      return {
        subject: key,
        score: Number(avg)
      };
    });
  }, [feedbacks, selectedPersonId, isFounderOrAdmin, user?.id]);

  // Active Person Name display
  const selectedPersonName = useMemo(() => {
    const targetId = isFounderOrAdmin ? selectedPersonId : user?.id;
    if (!targetId || targetId === user?.id) return user?.displayName || 'My Profile';
    const found = employees.find(e => e.id === targetId);
    return found ? found.displayName : 'Colleague';
  }, [selectedPersonId, employees, user, isFounderOrAdmin]);

  // Overall Average Score calculation for selected person or overall
  const overallAvgScore = useMemo(() => {
    if (personCompetencyRadarData && personCompetencyRadarData.length > 0) {
      const sum = personCompetencyRadarData.reduce((acc, c) => acc + c.score, 0);
      return (sum / personCompetencyRadarData.length).toFixed(1);
    }
    if (!aggregatedCompetencyData.length) return 1.0;
    const sum = aggregatedCompetencyData.reduce((acc, c) => acc + c.score, 0);
    return (sum / aggregatedCompetencyData.length).toFixed(1);
  }, [personCompetencyRadarData, aggregatedCompetencyData]);

  // STRICT Role-Based Feedback Filtering
  const filteredFeedbacks = useMemo(() => {
    return feedbacks.filter((fb) => {
      if (!isFounderOrAdmin) {
        const isRecipient = fb.receiverId === user?.id || fb.receiver?.id === user?.id;
        const isProvider = fb.providerId === user?.id || fb.provider?.id === user?.id;
        if (!isRecipient && !isProvider) return false;
      }

      const query = searchQuery.toLowerCase();
      const matchesQuery = 
        !query ||
        fb.content?.toLowerCase().includes(query) ||
        fb.provider?.displayName?.toLowerCase().includes(query) ||
        fb.receiver?.displayName?.toLowerCase().includes(query);

      if (!matchesQuery) return false;

      if (statusFilter === 'attention' && !fb.isAnonymous) return false;
      if (statusFilter === 'on-track' && fb.isAnonymous) return false;

      if (selectedCompetencyFilter) {
        if (!fb.competencies || !fb.competencies[selectedCompetencyFilter]) return false;
      }

      return true;
    });
  }, [feedbacks, searchQuery, statusFilter, selectedCompetencyFilter, isFounderOrAdmin, user?.id]);

  // Utility to compute initials for avatar fallback
  const getInitials = (name) => {
    if (!name) return 'SM';
    return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
  };

  return (
    <div className="space-y-6 font-['Manrope',-apple-system,sans-serif] text-[#1D1B16] transition-all">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#1D1B16] flex items-center gap-2">
            <MessageSquare className="text-[#1F2B4D]" size={20} strokeWidth={1.75} />
            360 Continuous Peer Feedback
          </h2>
          <p className="text-xs text-[#6B655C] mt-0.5">Multi-source competency evaluations and constructive peer appreciation.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#1F2B4D] text-white rounded-xl text-xs font-bold hover:bg-[#151D33] active:scale-[0.97] transition-all duration-300 shadow-[0_1px_2px_rgba(29,27,22,.04),0_8px_20px_rgba(29,27,22,.06)] self-start sm:self-auto"
        >
          <Plus size={14} strokeWidth={2} /> Give Feedback
        </button>
      </div>

      {/* Scope Protection Banner for Standard Level 3 Employees */}
      {!isFounderOrAdmin && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-[#F6F4EF] border border-[#EAE7E0] rounded-[10px] text-xs font-semibold text-[#6B655C] shadow-2xs">
          <ShieldAlert size={16} className="text-[#1F2B4D] shrink-0" />
          <span>Personal Scope Active: Viewing feedback for your profile. Inspecting other team members' competency graphs is restricted to Founders and Managers.</span>
        </div>
      )}

      {/* Main Asymmetric Responsive Layout: 1 Column Mobile, 12 Columns Desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT PANEL (7 Columns): Editorial Peer Feedback Stream */}
        <div className="lg:col-span-7 space-y-3.5 order-2 lg:order-1">
          {/* Active Competency Filter Banner */}
          {selectedCompetencyFilter && (
            <div className="flex items-center justify-between bg-[#F6F4EF] border border-[#EAE7E0] px-3.5 py-2 rounded-[10px] text-xs font-bold text-[#1D1B16] animate-fadeIn">
              <span className="flex items-center gap-1.5">
                <Filter size={14} className="text-[#1F2B4D]" />
                Filtering by skill: <strong>{selectedCompetencyFilter}</strong>
              </span>
              <button 
                onClick={() => setSelectedCompetencyFilter(null)}
                className="hover:underline flex items-center gap-1 text-[#8C5722] font-bold"
              >
                <X size={14} strokeWidth={2} /> Clear Filter
              </button>
            </div>
          )}

          {loading ? (
            <div className="space-y-3.5">
              {[1, 2].map((i) => (
                <div key={`skel-${i}`} className="p-4 bg-white border border-[#EAE7E0] rounded-[10px] animate-pulse space-y-3 shadow-[0_1px_2px_rgba(29,27,22,.04),0_8px_20px_rgba(29,27,22,.06)]">
                  <div className="h-4 bg-slate-100 rounded w-1/3"></div>
                  <div className="h-10 bg-slate-100 rounded w-full"></div>
                </div>
              ))}
            </div>
          ) : filteredFeedbacks.length === 0 ? (
            <div className="text-center py-14 px-4 bg-white border border-[#EAE7E0] rounded-[10px] shadow-[0_1px_2px_rgba(29,27,22,.04),0_8px_20px_rgba(29,27,22,.06)]">
              <div className="w-10 h-10 rounded-full bg-[#1F2B4D]/5 text-[#1F2B4D] flex items-center justify-center mx-auto mb-2.5">
                <MessageSquare size={20} strokeWidth={1.75} />
              </div>
              <h3 className="text-sm font-bold text-[#1D1B16]">No Peer Feedback Recorded</h3>
              <p className="text-xs text-[#6B655C] max-w-md mx-auto mt-1 leading-relaxed">
                Provide continuous feedback to your peers, or request feedback to foster personal professional growth.
              </p>
              <button
                onClick={() => setShowModal(true)}
                className="mt-3.5 inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#1F2B4D] text-white rounded-xl text-xs font-bold hover:bg-[#151D33] active:scale-[0.97] transition-all duration-300"
              >
                <Plus size={13} strokeWidth={2} /> Submit First 360 Feedback
              </button>
            </div>
          ) : (
            filteredFeedbacks.map((fb, idx) => {
              const providerName = fb.isAnonymous ? 'Anonymous Colleague' : (fb.provider?.displayName || 'Colleague');
              const targetRecipientId = fb.receiverId || fb.receiver?.id;
              const isSelected = isFounderOrAdmin && selectedPersonId === targetRecipientId;

              return (
                <div
                  key={fb.id}
                  onClick={() => {
                    if (isFounderOrAdmin && targetRecipientId) {
                      setSelectedPersonId(targetRecipientId);
                    }
                  }}
                  className={`bg-white border rounded-[10px] p-3.5 sm:p-4 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] space-y-3 shadow-[0_1px_2px_rgba(29,27,22,.04),0_8px_20px_rgba(29,27,22,.06)] ${
                    isFounderOrAdmin ? 'cursor-pointer active:scale-[0.995]' : ''
                  } ${
                    isSelected
                      ? 'border-[#1F2B4D] ring-2 ring-[#1F2B4D]/15 -translate-y-0.5 shadow-[0_8px_24px_rgba(31,43,77,.12)]'
                      : 'border-[#EAE7E0] hover:border-[#9A948A] hover:-translate-y-0.5'
                  }`}
                  style={{ animationDelay: `${idx * 80}ms` }}
                >
                  {/* Top Row: Provider Avatar + Metadata */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {/* Circle Initials Avatar */}
                      <div className="w-9 h-9 rounded-full bg-[#1F2B4D] text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
                        {fb.isAnonymous ? <EyeOff size={15} strokeWidth={2} /> : getInitials(providerName)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-xs font-extrabold text-[#1D1B16]">{providerName}</h3>
                          {fb.isAnonymous ? (
                            <span className="text-[10px] font-bold bg-[#F6F4EF] text-[#8C5722] border border-[#EAE7E0] px-2 py-0.2 rounded-full">
                              Anonymous
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold bg-[#F6F4EF] text-[#6B655C] border border-[#EAE7E0] px-2 py-0.2 rounded-full">
                              Peer Note
                            </span>
                          )}
                          {isSelected && (
                            <span className="text-[10px] bg-[#B5793A]/10 text-[#8C5722] font-bold px-2 py-0.2 rounded-full">
                              Active in Chart
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-[#6B655C] mt-0.5">
                          Recipient: <strong className="text-[#1D1B16] font-bold">{fb.receiver?.displayName || 'Me'}</strong>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10.5px] font-semibold text-[#9A948A]">
                        {new Date(fb.createdAt).toLocaleDateString('en-IN')}
                      </span>
                      {isAdmin && (
                        <button
                          onClick={(e) => handleHide(fb.id, e)}
                          className="text-[10.5px] font-bold text-[#8C5722] hover:bg-[#F6F4EF] px-2 py-0.5 rounded-md border border-[#EAE7E0] transition-all"
                          title="Hide Feedback"
                        >
                          Hide
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Rating Chips */}
                  {fb.competencies && Object.keys(fb.competencies).length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      {Object.entries(fb.competencies).map(([comp, score]) => (
                        <div
                          key={comp}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#F6F4EF] border border-[#EAE7E0] text-[10.5px] font-bold text-[#6B655C] hover:border-[#B5793A]/40 transition-colors"
                        >
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                            {ICON_PATHS[comp] || ICON_PATHS['Leadership']}
                          </svg>
                          {comp}: <strong className="text-[#8C5722] [font-variant-numeric:tabular-nums]">{score}/5</strong>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Qualitative Feedback Quote */}
                  <div className="pt-2.5 border-t border-[#F2F0EA] text-xs text-[#1D1B16] leading-relaxed italic font-normal">
                    "{fb.content}"
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* RIGHT PANEL (5 Columns - Sticky): Benchmark Standalone Card */}
        <div className="lg:col-span-5 lg:sticky lg:top-6 space-y-4 order-1 lg:order-2">
          <div className="bg-white border border-[#EAE7E0] rounded-[10px] p-3.5 sm:p-4 shadow-[0_1px_2px_rgba(29,27,22,.04),0_8px_20px_rgba(29,27,22,.06)] space-y-3.5">
            
            {/* Header: Single compact line */}
            <div className="flex items-center justify-between">
              <div className="inline-flex items-center gap-1.5 text-[10.5px] font-bold tracking-[.03em] uppercase text-[#8C5722]">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#B5793A] shrink-0">
                  <path d="M2 20h20"/><path d="M5 20 3 8l5.5 5L12 6l3.5 7L21 8l-2 12"/>
                </svg>
                {isFounderOrAdmin ? 'Founder Access' : 'Personal Scope'}
              </div>
              <div className="text-[11px] text-[#9A948A] font-semibold">
                Overall <strong className="font-['Fraunces',Georgia,serif] font-bold text-[14.5px] text-[#1D1B16] tracking-tight">{overallAvgScore}</strong> / 5.0
              </div>
            </div>

            {/* Custom Executive Dropdown Selector for Founder / Manager Users */}
            {isFounderOrAdmin ? (
              <div className="relative z-30" ref={dropdownRef}>
                {/* Trigger Button */}
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="w-full flex items-center justify-between gap-2 border border-[#EAE7E0] rounded-[8px] px-2.5 py-1.5 bg-white hover:border-[#1F2B4D]/40 transition-all text-left shadow-2xs focus:outline-none focus:ring-2 focus:ring-[#1F2B4D]/20"
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="text-[10px] font-bold tracking-[.05em] uppercase text-[#9A948A] shrink-0">Viewing</span>
                    <span className="text-[13px] font-bold text-[#1D1B16] truncate">{selectedPersonName}</span>
                  </div>
                  <ChevronDown 
                    size={14} 
                    className={`text-[#9A948A] shrink-0 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180 text-[#1F2B4D]' : ''}`} 
                    strokeWidth={2} 
                  />
                </button>

                {/* Floating Options Menu Overlay */}
                {isDropdownOpen && (
                  <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-[#EAE7E0] rounded-[10px] shadow-[0_12px_32px_rgba(0,0,0,0.12)] py-1 max-h-60 overflow-y-auto z-50 animate-fadeIn">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedPersonId(user?.id);
                        setIsDropdownOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 text-xs text-left font-semibold transition-colors ${
                        selectedPersonId === user?.id ? 'bg-[#F6F4EF] text-[#1F2B4D] font-bold' : 'text-[#1D1B16] hover:bg-slate-50'
                      }`}
                    >
                      <span>My Individual Profile ({user?.displayName || 'Me'})</span>
                      {selectedPersonId === user?.id && <Check size={14} className="text-[#1F2B4D]" />}
                    </button>
                    <div className="h-px bg-[#F2F0EA] my-1" />
                    {employees.map((emp) => (
                      <button
                        key={emp.id}
                        type="button"
                        onClick={() => {
                          setSelectedPersonId(emp.id);
                          setIsDropdownOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 text-xs text-left transition-colors ${
                          selectedPersonId === emp.id ? 'bg-[#F6F4EF] text-[#1F2B4D] font-bold' : 'text-[#1D1B16] hover:bg-slate-50'
                        }`}
                      >
                        <span className="truncate">{emp.displayName}</span>
                        {selectedPersonId === emp.id && <Check size={14} className="text-[#1F2B4D]" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 border border-[#EAE7E0] rounded-[8px] px-2.5 py-1.5 bg-[#F6F4EF]">
                <span className="text-[10px] font-bold tracking-[.05em] uppercase text-[#9A948A]">Viewing</span>
                <span className="text-[13px] font-bold text-[#1D1B16]">{user?.displayName || 'My Profile'}</span>
              </div>
            )}

            {/* Section Header + View Toggle */}
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-1.5 text-[11px] font-bold tracking-[.05em] uppercase text-[#6B655C]">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="text-[#1F2B4D]">
                  <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
                </svg>
                Competency
              </div>
              <div className="inline-flex bg-[#F3F1EC] rounded-full p-0.5 gap-0.5">
                <button
                  onClick={() => setActiveView('matrix')}
                  className={`border-none font-sans text-[10.5px] font-bold tracking-[.01em] px-2.5 py-1 rounded-full cursor-pointer transition-all duration-300 ${
                    activeView === 'matrix' ? 'bg-[#1F2B4D] text-white shadow-2xs' : 'text-[#6B655C] hover:text-[#1D1B16]'
                  }`}
                >
                  Grid
                </button>
                <button
                  onClick={() => setActiveView('radar')}
                  className={`border-none font-sans text-[10.5px] font-bold tracking-[.01em] px-2.5 py-1 rounded-full cursor-pointer transition-all duration-300 ${
                    activeView === 'radar' ? 'bg-[#1F2B4D] text-white shadow-2xs' : 'text-[#6B655C] hover:text-[#1D1B16]'
                  }`}
                >
                  Radar
                </button>
              </div>
            </div>

            {/* Mini Legend (Clean Individual Target Person Legend) */}
            <div className="flex items-center gap-3.5 text-[10px] font-semibold text-[#9A948A]">
              <span className="inline-flex items-center gap-1">
                <i className="w-1.75 h-1.75 bg-[#B5793A] rounded-full inline-block"></i>
                {selectedPersonName} Score Profile
              </span>
            </div>

            {/* View Panels (Clean Matrix Grid or Radar Chart Widget) */}
            <div className="pt-0.5 min-h-[210px] relative z-10">
              <RadarChartWidget 
                data={aggregatedCompetencyData} 
                selectedData={personCompetencyRadarData}
                personName={selectedPersonName}
                activeView={activeView}
              />
            </div>

            {/* Footnote */}
            <div className="text-center text-[10px] text-[#9A948A] pt-2 border-t border-[#F2F0EA]">
              Select any team member above to inspect their radar.
            </div>
          </div>
        </div>
      </div>

      {/* Submit 360 Feedback Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white border border-[#EAE7E0] rounded-[14px] shadow-2xl w-full max-w-lg my-8 overflow-hidden animate-scaleIn">
            <div className="flex justify-between items-center px-6 py-4 border-b border-[#EAE7E0] bg-[#FAF9F6]">
              <h3 className="text-sm font-bold text-[#1D1B16]">Submit 360 Peer Feedback</h3>
              <button onClick={() => setShowModal(false)} className="text-[#9A948A] hover:text-[#1D1B16]">
                <X size={18} strokeWidth={2} />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#1D1B16] mb-1">Recipient Colleague</label>
                <select
                  required
                  value={formData.receiverId}
                  onChange={(e) => setFormData({ ...formData, receiverId: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-white border border-[#EAE7E0] rounded-xl text-sm text-[#1D1B16] focus:outline-none focus:ring-2 focus:ring-[#1F2B4D]"
                >
                  <option value="" disabled>Select colleague...</option>
                  {employees.filter(e => e.id !== user?.id).map((emp) => (
                    <option key={emp.id} value={emp.id}>{emp.displayName} ({emp.department || emp.customRole || emp.jobPosition || 'Employee'})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1D1B16] mb-1">Qualitative Feedback</label>
                <textarea
                  required
                  rows="3"
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="What is this colleague doing exceptionally well? What growth opportunities exist?"
                  className="w-full px-3.5 py-2.5 bg-white border border-[#EAE7E0] rounded-xl text-sm text-[#1D1B16] focus:outline-none focus:ring-2 focus:ring-[#1F2B4D]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1D1B16] mb-2">Competency Scores (1 - 5)</label>
                <div className="grid grid-cols-2 gap-3">
                  {Object.keys(formData.competencies).map((comp) => (
                    <div key={comp} className="space-y-1 bg-[#F6F4EF] p-2.5 rounded-xl border border-[#EAE7E0]">
                      <div className="flex justify-between text-xs">
                        <span className="font-semibold text-[#6B655C]">{comp}</span>
                        <span className="text-[#8C5722] font-bold [font-variant-numeric:tabular-nums]">{formData.competencies[comp]} / 5</span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="5"
                        step="1"
                        value={formData.competencies[comp]}
                        onChange={(e) => setFormData({
                          ...formData,
                          competencies: { ...formData.competencies, [comp]: Number(e.target.value) }
                        })}
                        className="w-full accent-[#B5793A]"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2 p-3 bg-[#F6F4EF] border border-[#EAE7E0] rounded-xl">
                <input
                  type="checkbox"
                  id="anonymous"
                  checked={formData.isAnonymous}
                  onChange={(e) => setFormData({ ...formData, isAnonymous: e.target.checked })}
                  className="w-4 h-4 text-[#1F2B4D] border-slate-300 rounded focus:ring-[#1F2B4D]"
                />
                <label htmlFor="anonymous" className="text-xs text-[#1D1B16] font-semibold flex items-center gap-1">
                  <EyeOff size={14} strokeWidth={2} className="text-[#6B655C]" /> Submit Anonymously (Provider identity will be hidden)
                </label>
              </div>

              <div className="pt-3 flex justify-end gap-2.5 border-t border-[#EAE7E0]">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-[#EAE7E0] text-[#6B655C] rounded-xl text-xs font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#1F2B4D] text-white rounded-xl text-xs font-semibold hover:bg-[#151D33] active:scale-[0.97] inline-flex items-center gap-1.5 transition-all"
                >
                  <Sparkles size={14} strokeWidth={2} />
                  Submit Feedback
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Feedback360Tab;
