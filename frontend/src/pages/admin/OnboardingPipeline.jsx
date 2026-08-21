import React, { useState, useEffect } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { AlertCircle, Clock, UserCheck, X, ClipboardList, ChevronDown, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { ListSkeleton } from '../../components/ui/Skeleton';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const getToken = () => localStorage.getItem('token');

const OnboardingPipeline = () => {
  const [pipeline, setPipeline] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [selectedUser, setSelectedUser] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  // Create template inline form
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateTasks, setNewTemplateTasks] = useState([{ title: '', dueOffsetDays: 7 }]);

  useEffect(() => {
    fetchPipeline();
  }, []);

  const fetchPipeline = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/onboarding/pipeline`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPipeline(data || []);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load pipeline');
    } finally {
      setLoading(false);
    }
  };

  const fetchTemplates = async () => {
    setLoadingTemplates(true);
    try {
      const res = await fetch(`${API_BASE}/api/onboarding/checklist-templates`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTemplates(data || []);
        if (data.length > 0) setSelectedTemplateId(data[0].id);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load templates');
    } finally {
      setLoadingTemplates(false);
    }
  };

  const openAssignModal = (user) => {
    setSelectedUser(user);
    setShowCreateForm(false);
    fetchTemplates();
  };

  const closeModal = () => {
    setSelectedUser(null);
    setSelectedTemplateId('');
    setShowCreateForm(false);
    setNewTemplateName('');
    setNewTemplateTasks([{ title: '', dueOffsetDays: 7 }]);
  };

  const assignChecklist = async () => {
    if (!selectedTemplateId) {
      toast.error('Please select a template');
      return;
    }
    setAssigning(true);
    try {
      const res = await fetch(`${API_BASE}/api/onboarding/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`
        },
        body: JSON.stringify({
          userId: selectedUser.id,
          templateId: selectedTemplateId
        })
      });
      if (res.ok) {
        toast.success(`Tasks assigned to ${selectedUser.displayName}`);
        closeModal();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to assign tasks');
      }
    } catch (err) {
      toast.error('Failed to assign tasks');
    } finally {
      setAssigning(false);
    }
  };

  const createTemplate = async () => {
    const validTasks = newTemplateTasks.filter(t => t.title.trim());
    if (!newTemplateName.trim() || validTasks.length === 0) {
      toast.error('Template name and at least one task are required');
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/api/onboarding/checklist-templates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`
        },
        body: JSON.stringify({
          name: newTemplateName.trim(),
          tasks: validTasks.map(t => ({ title: t.title.trim(), dueOffsetDays: Number(t.dueOffsetDays) || 0 }))
        })
      });
      if (res.ok) {
        toast.success('Template created!');
        setShowCreateForm(false);
        setNewTemplateName('');
        setNewTemplateTasks([{ title: '', dueOffsetDays: 7 }]);
        await fetchTemplates();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to create template');
      }
    } catch (err) {
      toast.error('Failed to create template');
    }
  };

  const formatStepName = (step) => {
    if (!step) return 'Not Started';
    return step.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  if (loading) return (
    <div className="w-full min-h-full p-3 sm:p-5 md:p-6 bg-[#FAF9F6] space-y-4">
      <div className="animate-pulse space-y-2">
        <div className="h-6 sm:h-8 w-48 bg-slate-200 rounded-lg" />
        <div className="h-3.5 sm:h-4 w-72 bg-slate-100 rounded" />
      </div>
      <div className="space-y-4 mt-6">
        <ListSkeleton />
        <ListSkeleton />
        <ListSkeleton />
      </div>
    </div>
  );

  return (
    <div className="w-full min-h-full flex flex-col gap-3.5 sm:gap-4 p-3 sm:p-5 md:p-6 bg-[#FAF9F6]">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#EAE7E0] w-full">
        <div>
          <h1 className="font-serif font-bold text-lg sm:text-2xl md:text-3xl text-[#1F2B4D] tracking-tight leading-tight">
            Onboarding Pipeline
          </h1>
          <p className="text-[#6B655C] text-xs sm:text-sm font-medium mt-0.5">
            Monitor new hires progressing through the data collection wizard.
          </p>
        </div>
      </div>

      {/* Pipeline Cards Grid */}
      <div className="grid grid-cols-1 gap-3 sm:gap-4 w-full flex-1 content-start">
        {pipeline.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-[#EAE7E0] shadow-2xs p-6 flex flex-col items-center justify-center">
            <UserCheck className="h-10 sm:h-12 w-10 sm:w-12 text-[#CBD5E1] mb-3" />
            <h3 className="text-base font-serif font-bold text-[#1F2B4D]">All caught up!</h3>
            <p className="text-[#6B655C] text-xs font-medium mt-1">No employees are currently stuck in onboarding.</p>
          </div>
        ) : (
          pipeline.map(user => (
            <div key={user.id} className="bg-white border border-[#EAE7E0] rounded-2xl p-4 sm:p-5 flex flex-col min-[640px]:flex-row justify-between items-start min-[640px]:items-center gap-4 sm:gap-6 shadow-2xs hover:border-[#CBD5E1] transition-all w-full">
              <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                <div className="w-10 sm:w-12 h-10 sm:h-12 rounded-full bg-[#F0F3F9] text-[#1F2B4D] flex items-center justify-center font-bold text-sm sm:text-lg shrink-0 border border-[#E2E8F0]">
                  {user.displayName?.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-[#1F2B4D] text-sm sm:text-base leading-snug truncate" title={user.displayName}>
                    {user.displayName}
                  </h3>
                  <p className="text-xs font-medium text-[#6B655C] truncate" title={user.email}>{user.email}</p>
                </div>
              </div>
              
              <div className="flex items-center justify-between min-[640px]:justify-end gap-3 sm:gap-6 flex-wrap w-full min-[640px]:w-auto pt-3 min-[640px]:pt-0 border-t border-[#F4F1EA] min-[640px]:border-t-0">
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] font-display font-bold text-[#9A948A] uppercase tracking-wider">Current Step</span>
                  <span className="px-2.5 py-1 rounded-full text-[10.5px] sm:text-xs font-bold text-[#1F2B4D] bg-[#F0F3F9] border border-[#E2E8F0] inline-block w-fit">
                    {formatStepName(user.onboardingStep)}
                  </span>
                </div>
                
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] font-display font-bold text-[#9A948A] uppercase tracking-wider">Stalled For</span>
                  <div className="flex items-center gap-1 text-[10.5px] sm:text-xs font-bold text-rose-600 bg-rose-50 border border-rose-100 px-2.5 py-1 rounded-full w-fit">
                    <Clock size={13} />
                    {user.daysSinceJoining} {user.daysSinceJoining === 1 ? 'day' : 'days'}
                  </div>
                </div>

                <button 
                  type="button"
                  className="inline-flex items-center justify-center gap-1.5 border border-[#EAE7E0] bg-white text-[#1F2B4D] hover:bg-[#F4F1EA] hover:border-[#CBD5E1] font-display font-bold text-xs uppercase tracking-wider h-9 sm:h-10 px-3.5 sm:px-4 rounded-xl shadow-2xs transition-all w-full min-[480px]:w-auto shrink-0"
                  onClick={() => openAssignModal(user)}
                >
                  <ClipboardList size={15} className="opacity-75 shrink-0" />
                  <span>Assign Tasks</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ── Assign Tasks Modal ── */}
      {selectedUser && (
        <div className="fixed inset-0 bg-[#0F172A]/40 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-[#EAE7E0] w-full max-w-md max-h-[92vh] flex flex-col overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-[#EAE7E0] bg-[#FAF8F5] flex justify-between items-center shrink-0">
              <div>
                <h2 className="font-serif font-bold text-sm sm:text-base text-[#1F2B4D]">Assign Onboarding Tasks</h2>
                <p className="text-xs text-[#6B655C] font-medium mt-0.5">For {selectedUser.displayName}</p>
              </div>
              <button type="button" onClick={closeModal} className="p-1 text-[#6B655C] hover:text-[#1F2B4D]">
                <X size={16} />
              </button>
            </div>

            <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1 bg-white">
              {loadingTemplates ? (
                <p className="text-xs text-[#6B655C]">Loading templates...</p>
              ) : templates.length === 0 && !showCreateForm ? (
                <div className="text-center py-6">
                  <ClipboardList className="mx-auto h-8 w-8 text-[#9A948A] mb-2" />
                  <p className="text-xs font-bold text-[#1F2B4D]">No checklist templates yet</p>
                  <p className="text-xs text-[#6B655C] mt-1 mb-3">Create your first template to assign onboarding tasks.</p>
                  <button type="button" onClick={() => setShowCreateForm(true)} className="bg-[#1F2B4D] hover:bg-[#141C33] text-white text-xs font-display font-bold uppercase tracking-wider px-3.5 py-1.5 rounded-xl shadow-2xs inline-flex items-center gap-1.5">
                    <Plus size={14} className="shrink-0" /> Create Template
                  </button>
                </div>
              ) : !showCreateForm ? (
                <>
                  <div>
                    <label className="block text-[10px] font-display font-bold text-[#6B655C] uppercase tracking-wider mb-1">Select Template</label>
                    <div className="relative">
                      <select
                        value={selectedTemplateId}
                        onChange={(e) => setSelectedTemplateId(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-[#EAE7E0] rounded-xl text-xs font-bold text-[#1F2B4D] focus:ring-2 focus:ring-[#1F2B4D] outline-none"
                      >
                        {templates.map(t => (
                          <option key={t.id} value={t.id}>
                            {t.name} ({t.tasks?.length || 0} tasks)
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Show selected template tasks preview */}
                  {selectedTemplateId && (() => {
                    const tmpl = templates.find(t => t.id === selectedTemplateId);
                    if (!tmpl || !tmpl.tasks?.length) return null;
                    return (
                      <div className="bg-[#FAF8F5] border border-[#EAE7E0] rounded-xl p-3">
                        <p className="text-[9.5px] font-display font-bold text-[#6B655C] uppercase tracking-wider mb-2">Tasks to be assigned</p>
                        <ul className="space-y-1.5">
                          {tmpl.tasks.map((task, i) => (
                            <li key={i} className="flex justify-between items-center text-xs font-medium text-[#1F2B4D]">
                              <span>{task.title}</span>
                              <span className="text-[10px] text-[#6B655C]">Due in {task.dueOffsetDays}d</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })()}

                  <button
                    type="button"
                    onClick={() => setShowCreateForm(true)}
                    className="text-xs text-[#1F2B4D] font-bold hover:underline inline-flex items-center gap-1"
                  >
                    <Plus size={14} /> Create new template
                  </button>
                </>
              ) : (
                /* ── Create Template Inline Form ── */
                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-display font-bold text-[#6B655C] uppercase tracking-wider mb-1">Template Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Standard New Hire Checklist"
                      value={newTemplateName}
                      onChange={(e) => setNewTemplateName(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-[#EAE7E0] rounded-xl text-xs font-bold text-[#1F2B4D] focus:ring-2 focus:ring-[#1F2B4D] outline-none"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-[10px] font-display font-bold text-[#6B655C] uppercase tracking-wider mb-1">Tasks</label>
                    <div className="space-y-2">
                      {newTemplateTasks.map((task, i) => (
                        <div key={i} className="flex gap-1.5">
                          <input
                            type="text"
                            placeholder="Task title"
                            value={task.title}
                            onChange={(e) => {
                              const updated = [...newTemplateTasks];
                              updated[i].title = e.target.value;
                              setNewTemplateTasks(updated);
                            }}
                            className="flex-1 px-3 py-1.5 bg-white border border-[#EAE7E0] rounded-lg text-xs font-bold text-[#1F2B4D]"
                          />
                          <input
                            type="number"
                            min="0"
                            value={task.dueOffsetDays}
                            onChange={(e) => {
                              const updated = [...newTemplateTasks];
                              updated[i].dueOffsetDays = e.target.value;
                              setNewTemplateTasks(updated);
                            }}
                            className="w-16 px-2 py-1.5 bg-white border border-[#EAE7E0] rounded-lg text-xs text-center font-bold text-[#1F2B4D]"
                            title="Due in X days"
                          />
                          {newTemplateTasks.length > 1 && (
                            <button
                              type="button"
                              onClick={() => setNewTemplateTasks(newTemplateTasks.filter((_, j) => j !== i))}
                              className="text-rose-500 hover:text-rose-700 p-1"
                            >
                              <X size={14} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => setNewTemplateTasks([...newTemplateTasks, { title: '', dueOffsetDays: 7 }])}
                      className="mt-2 text-xs text-[#1F2B4D] font-bold hover:underline inline-flex items-center gap-1"
                    >
                      <Plus size={14} /> Add task
                    </button>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button type="button" onClick={createTemplate} className="bg-[#1F2B4D] hover:bg-[#141C33] text-white text-xs font-display font-bold uppercase tracking-wider px-4 py-1.5 rounded-xl shadow-2xs flex-1">
                      Create Template
                    </button>
                    <button type="button" onClick={() => setShowCreateForm(false)} className="border border-[#EAE7E0] bg-white text-[#1F2B4D] text-xs font-display font-bold px-3 py-1.5 rounded-xl">
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>

            {!showCreateForm && templates.length > 0 && (
              <div className="p-3.5 sm:p-4 border-t border-[#F4F1EA] flex justify-end gap-2 shrink-0 bg-white">
                <button type="button" onClick={closeModal} className="px-4 py-1.5 border border-[#EAE7E0] bg-white text-[#1F2B4D] text-xs font-display font-bold rounded-xl hover:bg-[#FAF8F5]">Cancel</button>
                <button 
                  type="button"
                  onClick={assignChecklist} 
                  disabled={assigning || !selectedTemplateId}
                  className="px-5 py-1.5 bg-[#1F2B4D] hover:bg-[#141C33] text-white text-xs font-display font-bold uppercase tracking-wider rounded-xl shadow-2xs disabled:opacity-50"
                >
                  {assigning ? 'Assigning...' : 'Assign Tasks'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default OnboardingPipeline;
