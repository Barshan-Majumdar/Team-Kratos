import React, { useState, useEffect } from 'react';
import { hasPermission } from '../lib/permissions';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { 
  FileText, 
  Plus, 
  Download, 
  Eye, 
  Sparkles, 
  CheckCircle, 
  AlertTriangle, 
  Lock, 
  Copy, 
  Trash2, 
  UserCheck, 
  Search, 
  FileCheck,
  Building,
  Calendar,
  X,
  Info,
  ChevronRight
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

const PLACEHOLDER_CHIPS = [
  '{{employeeName}}',
  '{{employeeId}}',
  '{{jobPosition}}',
  '{{department}}',
  '{{baseSalary}}',
  '{{joiningDate}}',
  '{{companyName}}',
  '{{companyAddress}}',
  '{{currentDate}}'
];

// Animation Variants
const staggerContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.1 }
  }
};

const fadeInUp = {
  hidden: { opacity: 0, y: 30, scale: 0.98 },
  show: { 
    opacity: 1, 
    y: 0,
    scale: 1,
    transition: { type: "spring", stiffness: 300, damping: 24, ease: [0.34, 1.56, 0.64, 1] } 
  }
};

const CustomSelect = ({ value, onChange, options, placeholder }) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find(opt => opt.value === value);

  return (
    <div className="relative w-full">
      <div 
        className={`w-full px-4 py-3.5 rounded-[16px] bg-white border cursor-pointer text-sm font-bold text-[#1F2B4D] shadow-inner transition-all flex justify-between items-center ${isOpen ? 'border-[#1F2B4D] ring-2 ring-[#1F2B4D]/20' : 'border-[#EAE7E0] hover:border-[#CBD5E1]'}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span>{selectedOption ? selectedOption.label : placeholder}</span>
        <ChevronRight className={`w-4 h-4 text-[#9A948A] transition-transform duration-300 ${isOpen ? '-rotate-90' : 'rotate-90'}`} />
      </div>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.98 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="absolute top-full left-0 right-0 mt-2 bg-white border border-[#EAE7E0] rounded-[16px] shadow-xl overflow-hidden z-50 flex flex-col max-h-64 overflow-y-auto custom-scrollbar"
            >
              <div 
                className="px-4 py-3 hover:bg-[#3B82F6] hover:text-white cursor-pointer text-sm font-bold text-[#6B655C] border-b border-[#F4F1EA] transition-colors"
                onClick={() => { onChange(""); setIsOpen(false); }}
              >
                {placeholder}
              </div>
              {options.map((opt) => (
                <div 
                  key={opt.value}
                  className={`px-4 py-3 hover:bg-[#3B82F6] hover:text-white cursor-pointer text-sm font-bold transition-colors flex items-center justify-between ${value === opt.value ? 'bg-[#EFF6FF] text-[#2563EB]' : 'text-[#1F2B4D]'}`}
                  onClick={() => { onChange(opt.value); setIsOpen(false); }}
                >
                  <span className="flex items-center gap-2">
                    {opt.label}
                  </span>
                  {value === opt.value && <div className="w-1.5 h-1.5 rounded-full bg-current" />}
                </div>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

const DocumentGenerator = ({ user }) => {
  const [activeTab, setActiveTab] = useState('generate'); // 'generate' | 'builder' | 'archive'
  const [archiveSubTab, setArchiveSubTab] = useState('my'); // 'my' | 'all'

  const [templates, setTemplates] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [myDocuments, setMyDocuments] = useState([]);
  const [allDocuments, setAllDocuments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Generation state
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [customTitle, setCustomTitle] = useState('');
  const [generating, setGenerating] = useState(false);

  // Builder state
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [builderForm, setBuilderForm] = useState({
    title: '',
    type: 'CUSTOM',
    bodyTemplate: '',
    headerText: '',
    footerText: ''
  });

  // Viewer state
  const [selectedDocForView, setSelectedDocForView] = useState(null);
  const [pdfBlobUrl, setPdfBlobUrl] = useState(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState(null);

  const isAdmin = hasPermission(user, 'edit_all_employees');
  const isManager = hasPermission(user, 'edit_all_employees');
  const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) return;

      const tmplRes = await fetch(`${apiBase}/api/documents/templates`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (tmplRes.ok) setTemplates(await tmplRes.json());

      const myDocsRes = await fetch(`${apiBase}/api/documents/my`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (myDocsRes.ok) setMyDocuments(await myDocsRes.json());

      if (isManager) {
        const allDocsRes = await fetch(`${apiBase}/api/documents/all`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (allDocsRes.ok) setAllDocuments(await allDocsRes.json());

        const scope = isAdmin ? 'all' : 'team';
        const empRes = await fetch(`${apiBase}/api/users/directory?scope=${scope}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (empRes.ok) {
          const empData = await empRes.json();
          setEmployees(Array.isArray(empData) ? empData : []);
        }
      }
    } catch (err) {
      console.error('Error fetching document data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user?.id, isManager]);

  // Authenticated PDF Viewer using Blob Object URL
  useEffect(() => {
    if (!selectedDocForView) {
      if (pdfBlobUrl) {
        URL.revokeObjectURL(pdfBlobUrl);
        setPdfBlobUrl(null);
      }
      setPdfError(null);
      return;
    }

    const controller = new AbortController();
    setPdfLoading(true);
    setPdfError(null);

    const token = localStorage.getItem('token');
    fetch(`${apiBase}/api/documents/generated/${selectedDocForView.id}/download`, {
      headers: { 'Authorization': `Bearer ${token}` },
      signal: controller.signal
    })
      .then(async (res) => {
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `Failed to load document (${res.status})`);
        }
        return res.blob();
      })
      .then((blob) => {
        setPdfBlobUrl((prevUrl) => {
          if (prevUrl) URL.revokeObjectURL(prevUrl);
          return URL.createObjectURL(blob);
        });
        setPdfLoading(false);
      })
      .catch((err) => {
        if (err.name !== 'AbortError') {
          console.error('PDF fetch error:', err);
          setPdfError(err.message || 'Failed to load PDF document');
          setPdfLoading(false);
        }
      });

    return () => {
      controller.abort();
    };
  }, [selectedDocForView]);

  const selectedTemplate = templates.find(t => t.id === selectedTemplateId);
  const selectedEmployee = employees.find(e => e.id === selectedUserId);

  const isSalaryTemplate = selectedTemplate && (
    ['OFFER_LETTER', 'SALARY_CERTIFICATE', 'PROMOTION_LETTER'].includes(selectedTemplate.type) ||
    ['{{baseSalary}}', '{{ctc}}', '{{salary}}', '{{compensation}}'].some(ph => selectedTemplate.bodyTemplate?.includes(ph))
  );

  const isGenerateBlockedForManager = isManager && !isAdmin && isSalaryTemplate;

  // Live text preview generator
  const getLivePreviewText = () => {
    if (!selectedTemplate) return 'Select a document template to initialize preview engine.';
    let text = selectedTemplate.bodyTemplate || '';

    const empName = selectedEmployee?.displayName || '[Employee Name]';
    const empId = selectedEmployee?.employeeId || '[Employee ID]';
    const pos = selectedEmployee?.jobPosition || '[Job Title]';
    const dept = selectedEmployee?.department || '[Department]';
    const sal = selectedEmployee?.baseSalary ? `₹${Number(selectedEmployee.baseSalary).toLocaleString()}` : '[Base Salary]';
    const joining = selectedEmployee?.createdAt ? format(new Date(selectedEmployee.createdAt), 'MMMM d, yyyy') : '[Joining Date]';

    text = text
      .replace(/\{\{\s*employeeName\s*\}\}/g, empName)
      .replace(/\{\{\s*employeeId\s*\}\}/g, empId)
      .replace(/\{\{\s*jobPosition\s*\}\}/g, pos)
      .replace(/\{\{\s*department\s*\}\}/g, dept)
      .replace(/\{\{\s*baseSalary\s*\}\}/g, sal)
      .replace(/\{\{\s*joiningDate\s*\}\}/g, joining)
      .replace(/\{\{\s*companyName\s*\}\}/g, user?.tenant?.name || 'Company Name')
      .replace(/\{\{\s*currentDate\s*\}\}/g, format(new Date(), 'MMMM d, yyyy'));

    return text;
  };

  const handleGenerateSubmit = async (e) => {
    e.preventDefault();
    if (!selectedUserId || !selectedTemplateId) {
      toast.error('Please select both an employee and a template.');
      return;
    }

    setGenerating(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${apiBase}/api/documents/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          userId: selectedUserId,
          templateId: selectedTemplateId,
          customTitle: customTitle || undefined
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate document');

      toast.success(`🎉 Document "${data.title}" generated successfully!`);
      setSelectedUserId('');
      setSelectedTemplateId('');
      setCustomTitle('');
      fetchData();
      setActiveTab('archive');
    } catch (err) {
      toast.error(err.message || 'Operation failed');
    } finally {
      setGenerating(false);
    }
  };

  const handleSaveTemplate = async (e) => {
    e.preventDefault();
    if (!builderForm.title || !builderForm.bodyTemplate) {
      toast.error('Title and body template are required.');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const isEdit = !!editingTemplate;
      const url = isEdit
        ? `${apiBase}/api/documents/templates/${editingTemplate.id}`
        : `${apiBase}/api/documents/templates`;

      const res = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(builderForm)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save template');

      toast.success(isEdit ? 'Template updated successfully' : 'Custom template created successfully');
      setIsTemplateModalOpen(false);
      setEditingTemplate(null);
      setBuilderForm({ title: '', type: 'CUSTOM', bodyTemplate: '', headerText: '', footerText: '' });
      fetchData();
    } catch (err) {
      toast.error(err.message || 'Failed to save template');
    }
  };

  const handleDeleteTemplate = async (templateId) => {
    if (!window.confirm('Are you sure you want to delete this custom template?')) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${apiBase}/api/documents/templates/${templateId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete template');
      toast.success('Template deleted successfully');
      fetchData();
    } catch (err) {
      toast.error(err.message || 'Delete failed');
    }
  };

  const insertPlaceholderToForm = (placeholder) => {
    setBuilderForm(prev => ({
      ...prev,
      bodyTemplate: prev.bodyTemplate + ' ' + placeholder
    }));
  };

  const handleDuplicateTemplate = (tmpl) => {
    setEditingTemplate(null);
    setBuilderForm({
      title: `${tmpl.title} (Copy)`,
      type: 'CUSTOM',
      bodyTemplate: tmpl.bodyTemplate,
      headerText: tmpl.headerText || '',
      footerText: tmpl.footerText || ''
    });
    setIsTemplateModalOpen(true);
  };

  return (
    <div className="p-4 md:p-8 max-w-[1500px] mx-auto min-h-screen bg-transparent overflow-hidden">
      <motion.div 
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="space-y-8"
      >
        {/* ── TOP EXECUTIVE HEADER ── */}
        <motion.div variants={fadeInUp} className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 pb-5 border-b border-[#EAE7E0]">
          <div>
            <h1 className="font-serif font-bold text-3xl md:text-4xl text-[#1F2B4D] tracking-tight leading-none flex items-center gap-3">
              <div className="p-2.5 bg-white rounded-xl shadow-sm border border-[#EAE7E0]">
                <FileText className="text-[#1F2B4D]" size={28} />
              </div>
              Document Generator
            </h1>
            <p className="text-[#6B655C] mt-2.5 font-medium ml-2">
              Compile, template, and issue official HR certificates with encrypted PDF rendering.
            </p>
          </div>

          {/* iOS-Style Segmented Control Tabs */}
          <div className="flex p-1.5 bg-white border-[2px] border-[#EAE7E0] rounded-[20px] shadow-sm relative">
            {['generate', 'builder', 'archive'].map((tab) => {
              // Hide builder if not admin
              if (tab === 'builder' && !isAdmin) return null;
              
              const labels = {
                generate: 'Generate Docs',
                builder: 'Templates',
                archive: 'Archive'
              };
              const icons = {
                generate: <Sparkles size={16} />,
                builder: <FileCheck size={16} />,
                archive: <Building size={16} />
              };
              
              const isActive = activeTab === tab;
              
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`relative z-10 px-6 py-2.5 rounded-[14px] text-xs font-display font-bold uppercase tracking-wider flex items-center gap-2 transition-colors duration-300 ${
                    isActive ? 'text-[#1F2B4D]' : 'text-[#9A948A] hover:text-[#1F2B4D]'
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="docTabIndicator"
                      className="absolute inset-0 bg-[#FAF8F5] border border-[#EAE7E0] rounded-[14px] shadow-2xs z-[-1]"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                  {icons[tab]}
                  {labels[tab]}
                </button>
              );
            })}
          </div>
        </motion.div>

        <AnimatePresence mode="wait">
          {/* TAB 1: GENERATE DOCUMENT */}
          {activeTab === 'generate' && (
            <motion.div
              key="generate"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-8"
            >
              {/* Left Column: Generation Controls */}
              <div className="lg:col-span-4 flex flex-col">
                <div className="bg-[#FAF8F5] border-[2px] border-[#EAE7E0] rounded-[32px] p-6 md:p-8 shadow-sm flex flex-col transition-all duration-500 hover:shadow-lg hover:-translate-y-1">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-white rounded-xl border border-[#EAE7E0] shadow-2xs">
                      <Sparkles className="w-5 h-5 text-[#1F2B4D]" />
                    </div>
                    <h2 className="font-serif font-bold text-2xl text-[#1F2B4D]">
                      Issue Document
                    </h2>
                  </div>

                  <form onSubmit={handleGenerateSubmit} className="space-y-6 flex-1 flex flex-col">
                    <div className="group">
                      <label className="text-[11px] font-display font-bold text-[#9A948A] uppercase tracking-wider block mb-2 transition-colors group-focus-within:text-[#1F2B4D]">
                        Target Employee
                      </label>
                      <CustomSelect 
                        value={selectedUserId}
                        onChange={setSelectedUserId}
                        placeholder="-- Choose Employee --"
                        options={employees.map(emp => ({
                          value: emp.id,
                          label: `${emp.displayName} (${emp.jobPosition || 'Employee'})`
                        }))}
                      />
                    </div>

                    <div className="group">
                      <label className="text-[11px] font-display font-bold text-[#9A948A] uppercase tracking-wider block mb-2 transition-colors group-focus-within:text-[#1F2B4D]">
                        Document Template
                      </label>
                      <CustomSelect 
                        value={selectedTemplateId}
                        onChange={setSelectedTemplateId}
                        placeholder="-- Choose Template --"
                        options={templates.map(tmpl => {
                          const isSalary = ['OFFER_LETTER', 'SALARY_CERTIFICATE', 'PROMOTION_LETTER'].includes(tmpl.type) ||
                            ['{{baseSalary}}', '{{ctc}}', '{{salary}}'].some(ph => tmpl.bodyTemplate?.includes(ph));
                          return {
                            value: tmpl.id,
                            label: `${tmpl.title} ${isSalary ? '🔒 [Admin Only]' : ''}`
                          };
                        })}
                      />
                    </div>

                    <div className="group">
                      <label className="text-[11px] font-display font-bold text-[#9A948A] uppercase tracking-wider block mb-2 transition-colors group-focus-within:text-[#1F2B4D]">
                        Custom Title Override (Optional)
                      </label>
                      <Input
                        placeholder="e.g. Relieving Letter - 2026"
                        value={customTitle}
                        onChange={(e) => setCustomTitle(e.target.value)}
                        className="w-full px-4 py-3.5 rounded-2xl bg-white border border-[#EAE7E0] text-sm font-bold text-[#1F2B4D] placeholder-[#9A948A] shadow-inner focus:ring-2 focus:ring-[#1F2B4D] transition-all hover:border-[#CBD5E1]"
                      />
                    </div>

                    <AnimatePresence>
                      {isGenerateBlockedForManager && (
                        <motion.div 
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="p-4 bg-rose-50 border border-rose-200 rounded-[20px] flex items-start gap-3 text-rose-900 text-xs font-medium shadow-inner overflow-hidden"
                        >
                          <Lock size={18} className="text-rose-600 shrink-0 mt-0.5" />
                          <div>
                            <p className="font-bold mb-1 font-display uppercase tracking-wider text-[10px]">Admin Authorization Required</p>
                            <p>This document contains secure salary data. Per RBAC rules, only Admins can issue it.</p>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div className="pt-4 mt-auto">
                      <motion.button 
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.95 }}
                        type="submit" 
                        disabled={generating || isGenerateBlockedForManager || !selectedUserId || !selectedTemplateId} 
                        className="w-full bg-[#1F2B4D] disabled:opacity-50 disabled:hover:scale-100 text-white font-display font-bold text-sm py-4 rounded-[20px] transition-all flex items-center justify-center gap-2 shadow-[0_8px_16px_rgba(31,43,77,0.15)] hover:shadow-[0_16px_32px_rgba(31,43,77,0.25)] relative overflow-hidden group"
                      >
                        <span className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out pointer-events-none"></span>
                        <span className="relative z-10 flex items-center gap-2">
                          {generating ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Sparkles size={16} />}
                          {generating ? 'Compiling PDF Engine...' : 'Generate & Save Document'}
                        </span>
                      </motion.button>
                    </div>
                  </form>
                </div>
              </div>

              {/* Right Column: Live Preview */}
              <div className="lg:col-span-8 flex flex-col">
                <div className="bg-white border-[2px] border-[#EAE7E0] rounded-[32px] p-6 md:p-8 shadow-sm flex flex-col h-full transition-all duration-500 hover:shadow-lg hover:-translate-y-1">
                  <div className="flex justify-between items-center pb-4 border-b border-[#F4F1EA]">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-[#FAF8F5] rounded-xl border border-[#EAE7E0] shadow-2xs">
                        <Eye className="w-5 h-5 text-[#1F2B4D]" />
                      </div>
                      <h2 className="font-serif font-bold text-2xl text-[#1F2B4D]">
                        Live Engine Preview
                      </h2>
                    </div>
                    {selectedTemplate && (
                      <span className="px-3 py-1.5 text-[10px] font-display font-bold uppercase tracking-wider bg-indigo-50 text-indigo-800 border border-indigo-200 rounded-full flex items-center gap-1.5 shadow-2xs">
                        {selectedTemplate.type}
                      </span>
                    )}
                  </div>

                  <div className="mt-6 flex-1 bg-[#FAF8F5] border-[2px] border-[#EAE7E0] rounded-[24px] p-8 font-mono text-[13px] text-[#1F2B4D] whitespace-pre-wrap leading-relaxed shadow-inner overflow-y-auto max-h-[600px] custom-scrollbar selection:bg-indigo-100 relative">
                    {!selectedTemplate ? (
                       <div className="absolute inset-0 flex flex-col items-center justify-center text-[#9A948A]">
                         <FileText size={48} className="mb-4 opacity-20" />
                         <span className="font-display font-bold uppercase tracking-wider text-sm">Select Template to Initialize Preview</span>
                       </div>
                    ) : (
                      getLivePreviewText()
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 2: TEMPLATE BUILDER (ADMIN ONLY) */}
          {activeTab === 'builder' && isAdmin && (
            <motion.div
              key="builder"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
              className="flex flex-col gap-6"
            >
              <div className="flex justify-between items-end mb-4">
                <div>
                  <h2 className="font-serif font-bold text-3xl text-[#1F2B4D]">Master Templates</h2>
                  <p className="text-sm text-[#6B655C] mt-1 font-medium">Engineer and deploy custom tenant document architectures.</p>
                </div>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    setEditingTemplate(null);
                    setBuilderForm({ title: '', type: 'CUSTOM', bodyTemplate: '', headerText: '', footerText: '' });
                    setIsTemplateModalOpen(true);
                  }}
                  className="bg-[#1F2B4D] text-white font-display font-bold text-sm px-6 py-3.5 rounded-[16px] transition-all flex items-center gap-2 shadow-md hover:shadow-lg"
                >
                  <Plus size={16} /> Deploy Custom Template
                </motion.button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {templates.map((tmpl, i) => (
                  <motion.div
                    key={tmpl.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.05 }}
                    className="bg-white p-6 rounded-[28px] border-[2px] border-[#EAE7E0] shadow-sm flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 hover:shadow-[0px_24px_48px_-12px_rgba(31,43,77,0.15)] group relative overflow-hidden"
                  >
                    {tmpl.isSystemDefault && (
                      <div className="absolute top-0 right-0 w-16 h-16 bg-amber-50 rounded-bl-[100px] border-l border-b border-amber-100 flex items-start justify-end p-3">
                         <Lock size={14} className="text-amber-600" />
                      </div>
                    )}
                    
                    <div>
                      <div className="mb-4">
                        <span className={`px-2.5 py-1 text-[9px] font-display font-bold uppercase tracking-widest rounded-full border shadow-2xs ${
                          tmpl.isSystemDefault ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-indigo-50 text-indigo-800 border-indigo-200'
                        }`}>
                          {tmpl.isSystemDefault ? 'System Core' : tmpl.type}
                        </span>
                      </div>

                      <h3 className="font-serif font-bold text-xl text-[#1F2B4D] mb-3 group-hover:text-indigo-700 transition-colors pr-8">{tmpl.title}</h3>
                      <div className="text-[11px] text-[#6B655C] line-clamp-3 font-mono bg-[#FAF8F5] p-3 rounded-2xl border border-[#EAE7E0] shadow-inner">
                        {tmpl.bodyTemplate}
                      </div>
                    </div>

                    <div className="mt-6 pt-5 border-t border-[#F4F1EA] flex items-center justify-between gap-3">
                      {tmpl.isSystemDefault ? (
                        <button
                          onClick={() => handleDuplicateTemplate(tmpl)}
                          className="w-full text-xs font-display font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 py-3 rounded-[14px] flex items-center justify-center gap-2 transition-all hover:scale-[1.02]"
                        >
                          <Copy size={14} /> Duplicate Codebase
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={() => {
                              setEditingTemplate(tmpl);
                              setBuilderForm({
                                title: tmpl.title,
                                type: tmpl.type,
                                bodyTemplate: tmpl.bodyTemplate,
                                headerText: tmpl.headerText || '',
                                footerText: tmpl.footerText || ''
                              });
                              setIsTemplateModalOpen(true);
                            }}
                            className="flex-1 text-xs font-display font-bold text-[#1F2B4D] bg-white hover:bg-[#FAF8F5] border border-[#EAE7E0] py-3 rounded-[14px] transition-all shadow-2xs hover:shadow-sm"
                          >
                            Configure
                          </button>
                          <button
                            onClick={() => handleDeleteTemplate(tmpl.id)}
                            className="px-4 py-3 text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-[14px] transition-all shadow-2xs hover:shadow-sm"
                          >
                            <Trash2 size={16} />
                          </button>
                        </>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* TAB 3: ARCHIVE & HISTORY */}
          {activeTab === 'archive' && (
            <motion.div
              key="archive"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
              className="flex flex-col gap-6"
            >
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-[#EAE7E0] pb-6">
                <div>
                   <h2 className="font-serif font-bold text-3xl text-[#1F2B4D]">Document Archive</h2>
                   <p className="text-sm text-[#6B655C] mt-1 font-medium">Access historical records and download generated PDFs.</p>
                </div>
                
                <div className="flex gap-2 bg-[#FAF8F5] p-1.5 rounded-[20px] border border-[#EAE7E0] shadow-inner mt-4 sm:mt-0">
                  <button
                    onClick={() => setArchiveSubTab('my')}
                    className={`px-6 py-2 rounded-[14px] font-display font-bold text-xs uppercase tracking-wider transition-all duration-300 ${
                      archiveSubTab === 'my' ? 'bg-white text-[#1F2B4D] shadow-sm border border-[#EAE7E0]' : 'text-[#9A948A] hover:text-[#1F2B4D] border border-transparent'
                    }`}
                  >
                    My Files
                  </button>
                  {isManager && (
                    <button
                      onClick={() => setArchiveSubTab('all')}
                      className={`px-6 py-2 rounded-[14px] font-display font-bold text-xs uppercase tracking-wider transition-all duration-300 ${
                        archiveSubTab === 'all' ? 'bg-white text-[#1F2B4D] shadow-sm border border-[#EAE7E0]' : 'text-[#9A948A] hover:text-[#1F2B4D] border border-transparent'
                      }`}
                    >
                      Enterprise Scope
                    </button>
                  )}
                </div>
              </div>

              <div className="bg-white border-[2px] border-[#EAE7E0] rounded-[32px] overflow-hidden shadow-sm transition-all duration-500 hover:shadow-lg">
                <div className="overflow-x-auto p-2 bg-[#FAF8F5]">
                  <table className="w-full text-left border-separate border-spacing-y-2 min-w-[800px]">
                    <thead>
                      <tr>
                        <th className="px-6 py-4 text-[10px] font-display font-bold text-[#9A948A] uppercase tracking-wider">Document Title</th>
                        <th className="px-6 py-4 text-[10px] font-display font-bold text-[#9A948A] uppercase tracking-wider">Target Identity</th>
                        <th className="px-6 py-4 text-[10px] font-display font-bold text-[#9A948A] uppercase tracking-wider">Timestamp</th>
                        <th className="px-6 py-4 text-[10px] font-display font-bold text-[#9A948A] uppercase tracking-wider">Originator</th>
                        <th className="px-6 py-4 text-[10px] font-display font-bold text-[#9A948A] uppercase tracking-wider text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(archiveSubTab === 'my' ? myDocuments : allDocuments).length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-20 text-center bg-white rounded-[24px]">
                            <div className="flex flex-col items-center justify-center">
                              <Building className="w-12 h-12 text-[#9A948A] mb-4 opacity-50" />
                              <span className="text-[#1F2B4D] font-serif font-bold text-2xl">Vault is Empty</span>
                              <span className="text-[#6B655C] font-medium text-sm mt-2">No historical records found in this scope.</span>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        <AnimatePresence>
                          {(archiveSubTab === 'my' ? myDocuments : allDocuments).map((doc, i) => (
                            <motion.tr 
                              key={doc.id}
                              initial={{ opacity: 0, scale: 0.99 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: i * 0.05 }}
                              className="bg-white hover:bg-[#F0F3F9] transition-all group shadow-2xs hover:shadow-md cursor-pointer"
                            >
                              <td className="px-6 py-5 rounded-l-[20px] border-y border-l border-transparent group-hover:border-[#CBD5E1]">
                                <div className="flex items-center gap-3">
                                  <div className="p-2 bg-[#FAF8F5] rounded-xl border border-[#EAE7E0] group-hover:bg-white transition-colors">
                                    <FileText size={18} className="text-[#1F2B4D]" />
                                  </div>
                                  <span className="font-serif font-bold text-lg text-[#1F2B4D] group-hover:text-indigo-700 transition-colors">
                                    {doc.title}
                                  </span>
                                </div>
                              </td>
                              <td className="px-6 py-5 border-y border-transparent group-hover:border-[#CBD5E1]">
                                <span className="font-bold text-sm text-[#1F2B4D]">
                                  {doc.user?.displayName || user.displayName}
                                </span>
                              </td>
                              <td className="px-6 py-5 border-y border-transparent group-hover:border-[#CBD5E1]">
                                <span className="text-[11px] font-display font-bold uppercase tracking-wider text-[#6B655C]">
                                  {format(new Date(doc.createdAt), 'MMM d, yyyy')}
                                </span>
                              </td>
                              <td className="px-6 py-5 border-y border-transparent group-hover:border-[#CBD5E1]">
                                <span className="text-sm font-medium text-[#6B655C]">
                                  {doc.generatedBy?.displayName || 'HR Admin'}
                                </span>
                              </td>
                              <td className="px-6 py-5 text-right rounded-r-[20px] border-y border-r border-transparent group-hover:border-[#CBD5E1]">
                                <button
                                  onClick={() => setSelectedDocForView(doc)}
                                  className="inline-flex items-center gap-2 text-xs font-display font-bold uppercase tracking-wider text-[#1F2B4D] bg-white border border-[#EAE7E0] hover:border-[#1F2B4D] hover:bg-[#FAF8F5] px-4 py-2.5 rounded-[12px] transition-all shadow-sm group-hover:shadow-md"
                                >
                                  <Eye size={14} /> View File
                                </button>
                              </td>
                            </motion.tr>
                          ))}
                        </AnimatePresence>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ── TEMPLATE BUILDER MODAL ── */}
      <AnimatePresence>
        {isTemplateModalOpen && (
          <div className="fixed inset-0 z-50 bg-[#1F2B4D]/40 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="bg-white rounded-[36px] max-w-4xl w-full p-8 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] border-t border-t-white/40 max-h-[90vh] overflow-y-auto custom-scrollbar relative"
            >
              <div className="absolute top-0 left-0 right-0 h-2 w-full bg-indigo-500"></div>
              
              <div className="flex justify-between items-center pb-6 border-b border-[#F4F1EA] mb-6 mt-2">
                <h3 className="font-serif font-bold text-3xl text-[#1F2B4D]">
                  {editingTemplate ? 'Configure Template Engine' : 'Initialize New Engine'}
                </h3>
                <button onClick={() => setIsTemplateModalOpen(false)} className="text-[#9A948A] hover:text-[#1F2B4D] bg-[#FAF8F5] p-2 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSaveTemplate} className="space-y-6">
                <div className="group">
                  <label className="text-[11px] font-display font-bold text-[#9A948A] uppercase tracking-wider block mb-2 transition-colors group-focus-within:text-[#1F2B4D]">Target Architecture Name</label>
                  <Input
                    required
                    placeholder="e.g. Senior Executive Offer Letter"
                    value={builderForm.title}
                    onChange={(e) => setBuilderForm({ ...builderForm, title: e.target.value })}
                    className="w-full px-4 py-3.5 rounded-2xl bg-white border border-[#EAE7E0] text-sm font-bold text-[#1F2B4D] shadow-inner focus:ring-2 focus:ring-[#1F2B4D]"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-display font-bold text-[#9A948A] uppercase tracking-wider block mb-3">
                    Telemetry Injection Tags (Click to bind)
                  </label>
                  <div className="flex flex-wrap gap-2 p-4 bg-[#FAF8F5] border-[2px] border-[#EAE7E0] rounded-[20px]">
                    {PLACEHOLDER_CHIPS.map((chip) => (
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        key={chip}
                        type="button"
                        onClick={() => insertPlaceholderToForm(chip)}
                        className="px-3 py-1.5 bg-white border border-[#EAE7E0] shadow-sm text-[#1F2B4D] text-[11px] font-mono font-bold rounded-xl transition-colors hover:border-[#1F2B4D]"
                      >
                        {chip}
                      </motion.button>
                    ))}
                  </div>
                </div>

                <div className="group">
                  <label className="text-[11px] font-display font-bold text-[#9A948A] uppercase tracking-wider block mb-2 transition-colors group-focus-within:text-[#1F2B4D]">Header Banner Text</label>
                  <Input
                    placeholder="e.g. CONFIDENTIAL — EMPLOYMENT CERTIFICATE"
                    value={builderForm.headerText}
                    onChange={(e) => setBuilderForm({ ...builderForm, headerText: e.target.value })}
                    className="w-full px-4 py-3.5 rounded-2xl bg-white border border-[#EAE7E0] text-sm font-bold text-[#1F2B4D] shadow-inner focus:ring-2 focus:ring-[#1F2B4D]"
                  />
                </div>

                <div className="group">
                  <label className="text-[11px] font-display font-bold text-[#9A948A] uppercase tracking-wider block mb-2 transition-colors group-focus-within:text-[#1F2B4D]">Document Body Engine</label>
                  <textarea
                    required
                    rows={12}
                    value={builderForm.bodyTemplate}
                    onChange={(e) => setBuilderForm({ ...builderForm, bodyTemplate: e.target.value })}
                    className="w-full bg-[#FAF8F5] border border-[#EAE7E0] text-[#1F2B4D] text-[13px] font-mono rounded-2xl p-6 focus:outline-none focus:ring-2 focus:ring-[#1F2B4D] shadow-inner resize-y custom-scrollbar"
                  />
                </div>

                <div className="group">
                  <label className="text-[11px] font-display font-bold text-[#9A948A] uppercase tracking-wider block mb-2 transition-colors group-focus-within:text-[#1F2B4D]">Footer Text</label>
                  <Input
                    placeholder="e.g. Official Document — Verified via Kratos HRMS"
                    value={builderForm.footerText}
                    onChange={(e) => setBuilderForm({ ...builderForm, footerText: e.target.value })}
                    className="w-full px-4 py-3.5 rounded-2xl bg-white border border-[#EAE7E0] text-sm font-bold text-[#1F2B4D] shadow-inner focus:ring-2 focus:ring-[#1F2B4D]"
                  />
                </div>

                <div className="flex justify-end gap-4 pt-6 border-t border-[#F4F1EA]">
                  <Button type="button" onClick={() => setIsTemplateModalOpen(false)} className="bg-white hover:bg-[#FAF8F5] text-[#1F2B4D] border border-[#EAE7E0] font-display font-bold text-sm px-6 py-3 rounded-[16px] shadow-sm transition-all">
                    Cancel Deployment
                  </Button>
                  <motion.button 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.95 }}
                    type="submit" 
                    className="bg-[#1F2B4D] hover:bg-[#141C33] text-white font-display font-bold text-sm px-8 py-3 rounded-[16px] shadow-md transition-all"
                  >
                    Deploy Engine Template
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── PDF LIGHTBOX VIEWER MODAL ── */}
      <AnimatePresence>
        {selectedDocForView && (
          <div className="fixed inset-0 z-50 bg-[#0A0D14]/80 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="bg-white rounded-[32px] max-w-5xl w-full h-[90vh] flex flex-col shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)] overflow-hidden border border-white/10"
            >
              {/* Dark Cinematic Header */}
              <div className="flex justify-between items-center p-6 bg-[#101520] border-b border-white/10">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white/5 rounded-[16px] border border-white/10">
                    <FileText size={24} className="text-indigo-400" />
                  </div>
                  <div>
                    <h3 className="font-serif font-bold text-2xl text-white leading-none">{selectedDocForView.title}</h3>
                    <p className="text-[11px] font-display font-bold uppercase tracking-wider text-slate-400 mt-1.5">Target: {selectedDocForView.user?.displayName || user.displayName}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {pdfBlobUrl && (
                    <motion.a
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      href={pdfBlobUrl}
                      download={selectedDocForView.fileName || 'document.pdf'}
                      className="inline-flex items-center gap-2 px-5 py-3 bg-indigo-600 text-white text-xs font-display font-bold uppercase tracking-wider rounded-[16px] shadow-[0_8px_16px_rgba(79,70,229,0.2)] hover:shadow-[0_12px_24px_rgba(79,70,229,0.3)] transition-all"
                    >
                      <Download size={16} /> Fetch PDF Data
                    </motion.a>
                  )}
                  <button
                    onClick={() => setSelectedDocForView(null)}
                    className="text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 p-3 rounded-[16px] transition-all border border-transparent hover:border-white/10"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              <div className="flex-1 bg-[#1A2235] flex items-center justify-center relative p-6">
                {pdfLoading && (
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-xs font-display font-bold uppercase tracking-wider text-indigo-400 animate-pulse">Decrypting PDF Stream...</p>
                  </div>
                )}

                {pdfError && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-rose-950/50 border border-rose-500/30 p-8 rounded-[24px] max-w-md text-center">
                    <AlertTriangle size={32} className="mx-auto text-rose-500 mb-4" />
                    <p className="font-serif font-bold text-2xl text-white mb-2">Stream Failure</p>
                    <p className="text-sm font-medium text-rose-300">{pdfError}</p>
                  </motion.div>
                )}

                {!pdfLoading && !pdfError && pdfBlobUrl && (
                  <motion.iframe
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    src={pdfBlobUrl}
                    title="PDF Viewer"
                    className="w-full h-full rounded-[20px] shadow-2xl bg-white"
                  />
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default DocumentGenerator;
