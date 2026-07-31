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
        setPipeline(data);
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
        setTemplates(data);
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

  const getStepColor = (step) => {
    const steps = {
      'personal_details': 'bg-slate-100 text-slate-600',
      'emergency_contact': 'bg-blue-100 text-blue-700',
      'financial_details': 'bg-indigo-100 text-indigo-700',
      'statutory_details': 'bg-purple-100 text-purple-700'
    };
    return steps[step] || 'bg-slate-100 text-slate-600';
  };

  const formatStepName = (step) => {
    return step.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  if (loading) return (
    <div className="p-4 md:p-8 lg:p-12 max-w-7xl mx-auto space-y-8">
      <div className="animate-pulse space-y-2">
        <div className="h-8 w-48 bg-slate-200 rounded-lg" />
        <div className="h-4 w-72 bg-slate-100 rounded" />
      </div>
      <div className="space-y-4 mt-8">
        <ListSkeleton />
        <ListSkeleton />
        <ListSkeleton />
      </div>
    </div>
  );

  return (
    <div className="p-4 md:p-8 lg:p-12 max-w-7xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Onboarding Pipeline</h1>
          <p className="text-slate-500 mt-1">Monitor new hires progressing through the data collection wizard.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {pipeline.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-slate-200">
            <UserCheck className="mx-auto h-12 w-12 text-slate-300 mb-4" />
            <h3 className="text-lg font-medium text-slate-900">All caught up!</h3>
            <p className="text-slate-500">No employees are currently stuck in onboarding.</p>
          </div>
        ) : (
          pipeline.map(user => (
            <Card key={user.id} className="p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-lg shrink-0">
                  {user.displayName?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-lg">{user.displayName}</h3>
                  <p className="text-sm text-slate-500">{user.email}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-6 flex-wrap">
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Current Step</span>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold inline-block w-fit ${getStepColor(user.onboardingStep)}`}>
                    {formatStepName(user.onboardingStep)}
                  </span>
                </div>
                
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Stalled For</span>
                  <div className="flex items-center gap-1.5 text-sm font-medium text-amber-600 bg-amber-50 px-3 py-1 rounded-full w-fit">
                    <Clock size={14} />
                    {user.daysSinceJoining} {user.daysSinceJoining === 1 ? 'day' : 'days'}
                  </div>
                </div>

                <Button 
                  variant="outline" 
                  className="text-indigo-600 border-indigo-200 hover:bg-indigo-50" 
                  onClick={() => openAssignModal(user)}
                >
                  <ClipboardList size={16} className="mr-1.5" />
                  Assign Tasks
                </Button>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* ── Assign Tasks Modal ── */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-slate-800">Assign Onboarding Tasks</h2>
                <p className="text-sm text-slate-500 mt-1">For {selectedUser.displayName}</p>
              </div>
              <button onClick={closeModal} className="p-2 hover:bg-slate-100 rounded-xl transition">
                <X size={20} className="text-slate-400" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {loadingTemplates ? (
                <p className="text-sm text-slate-500">Loading templates...</p>
              ) : templates.length === 0 && !showCreateForm ? (
                <div className="text-center py-8">
                  <ClipboardList className="mx-auto h-10 w-10 text-slate-300 mb-3" />
                  <p className="text-slate-600 font-medium">No checklist templates yet</p>
                  <p className="text-sm text-slate-400 mt-1 mb-4">Create your first template to assign onboarding tasks.</p>
                  <Button onClick={() => setShowCreateForm(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                    <Plus size={16} className="mr-1.5" /> Create Template
                  </Button>
                </div>
              ) : !showCreateForm ? (
                <>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Select Template</label>
                    <div className="relative">
                      <select
                        value={selectedTemplateId}
                        onChange={(e) => setSelectedTemplateId(e.target.value)}
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl appearance-none bg-white text-sm font-medium text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      >
                        {templates.map(t => (
                          <option key={t.id} value={t.id}>
                            {t.name} ({t.tasks?.length || 0} tasks)
                          </option>
                        ))}
                      </select>
                      <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                  </div>

                  {/* Show selected template tasks preview */}
                  {selectedTemplateId && (() => {
                    const tmpl = templates.find(t => t.id === selectedTemplateId);
                    if (!tmpl || !tmpl.tasks?.length) return null;
                    return (
                      <div className="bg-slate-50 rounded-xl p-4">
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Tasks to be assigned</p>
                        <ul className="space-y-2">
                          {tmpl.tasks.map((task, i) => (
                            <li key={i} className="flex justify-between items-center text-sm">
                              <span className="text-slate-700">{task.title}</span>
                              <span className="text-xs text-slate-400">Due in {task.dueOffsetDays}d</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })()}

                  <button
                    onClick={() => setShowCreateForm(true)}
                    className="text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"
                  >
                    <Plus size={14} /> Or create a new template
                  </button>
                </>
              ) : (
                /* ── Create Template Inline Form ── */
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Template Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Standard New Hire Checklist"
                      value={newTemplateName}
                      onChange={(e) => setNewTemplateName(e.target.value)}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Tasks</label>
                    <div className="space-y-2">
                      {newTemplateTasks.map((task, i) => (
                        <div key={i} className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Task title"
                            value={task.title}
                            onChange={(e) => {
                              const updated = [...newTemplateTasks];
                              updated[i].title = e.target.value;
                              setNewTemplateTasks(updated);
                            }}
                            className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm"
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
                            className="w-20 px-2 py-2 border border-slate-200 rounded-lg text-sm text-center"
                            title="Due in X days"
                          />
                          {newTemplateTasks.length > 1 && (
                            <button
                              onClick={() => setNewTemplateTasks(newTemplateTasks.filter((_, j) => j !== i))}
                              className="text-red-400 hover:text-red-600 p-1"
                            >
                              <X size={16} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={() => setNewTemplateTasks([...newTemplateTasks, { title: '', dueOffsetDays: 7 }])}
                      className="mt-2 text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"
                    >
                      <Plus size={14} /> Add task
                    </button>
                  </div>

                  <div className="flex gap-3">
                    <Button onClick={createTemplate} className="bg-indigo-600 hover:bg-indigo-700 text-white flex-1">
                      Create Template
                    </Button>
                    <Button variant="ghost" onClick={() => setShowCreateForm(false)} className="text-slate-600">
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {!showCreateForm && templates.length > 0 && (
              <div className="p-6 border-t border-slate-100 flex justify-end gap-3">
                <Button variant="ghost" onClick={closeModal} className="text-slate-600">Cancel</Button>
                <Button 
                  onClick={assignChecklist} 
                  disabled={assigning || !selectedTemplateId}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50"
                >
                  {assigning ? 'Assigning...' : 'Assign Tasks'}
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default OnboardingPipeline;
