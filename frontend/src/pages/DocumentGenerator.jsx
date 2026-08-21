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
  const userLevel = user?.roleDefinition?.level ?? (user?.role === 'Admin' || user?.role === 'SuperAdmin' ? 1 : 3);
  const canGenerate = userLevel <= 1 || user?.role === 'Admin' || user?.role === 'SuperAdmin';
  const [activeTab, setActiveTab] = useState(canGenerate ? 'generate' : 'archive'); // 'generate' | 'builder' | 'archive'
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

  const isAdmin = canGenerate;
  const isManager = userLevel <= 2;
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
    if (!await window.confirmDialog()) return;
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
    <div className="w-full min-h-full flex flex-col gap-3.5 sm:gap-4 p-3 sm:p-5 md:p-6 bg-[#FAF9F6] font-sans">
      <motion.div 
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="space-y-3 sm:space-y-4 w-full"
      >
        {/* ── TOP EXECUTIVE HEADER ── */}
        <motion.div variants={fadeInUp} className="flex flex-col min-[480px]:flex-row justify-between items-start min-[480px]:items-center gap-2 pb-2.5 border-b border-[#EAE7E0]">
          <div>
            <h1 className="font-serif font-bold text-base min-[380px]:text-lg sm:text-xl md:text-2xl text-[#1F2B4D] tracking-tight leading-tight flex items-center gap-2">
              <div className="p-1.5 bg-white rounded-lg shadow-2xs border border-[#EAE7E0]">
                <FileText className="text-[#1F2B4D] w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <span>Document Generator</span>
            </h1>
            <p className="text-[#6B655C] mt-0.5 text-[10px] sm:text-xs font-medium">
              Compile, template, and issue official HR certificates with encrypted PDF rendering.
            </p>
          </div>

          {/* Locked Single-Line Segmented Control Tabs */}
          <div className="flex border border-[#CBD5E1] bg-white rounded-lg sm:rounded-xl p-1 gap-1 overflow-x-auto [&::-webkit-scrollbar]:hidden w-full min-[480px]:w-auto">
            {['generate', 'builder', 'archive'].map((tab) => {
              if ((tab === 'generate' || tab === 'builder') && !canGenerate) return null;
              
              const labels = {
                generate: 'Generate',
                builder: 'Templates',
                archive: 'Archive'
              };
              const icons = {
                generate: <Sparkles size={13} className="shrink-0" />,
                builder: <FileCheck size={13} className="shrink-0" />,
                archive: <Building size={13} className="shrink-0" />
              };
              
              const isActive = activeTab === tab;
              
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-md sm:rounded-lg text-[10px] sm:text-[11px] font-display font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all whitespace-nowrap shrink-0 flex-1 min-[480px]:flex-initial ${
                    isActive ? 'bg-[#F0F3F9] text-[#1F2B4D] border border-[#CBD5E1] shadow-2xs' : 'text-[#6B655C] hover:text-[#1F2B4D]'
                  }`}
                >
                  {icons[tab]}
                  <span>{labels[tab]}</span>
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
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-2.5 sm:gap-3.5"
            >
              {/* Left Column: Generation Controls */}
              <div className="lg:col-span-4 flex flex-col">
                <div className="bg-[#FAF8F5] border border-[#EAE7E0] rounded-[16px] sm:rounded-[20px] p-3.5 sm:p-4 shadow-2xs flex flex-col h-full">
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="p-1.5 bg-white rounded-lg border border-[#EAE7E0] shadow-2xs">
                      <Sparkles className="w-4 h-4 text-[#1F2B4D]" />
                    </div>
                    <h2 className="font-serif font-bold text-base sm:text-lg text-[#1F2B4D]">
                      Issue Document
                    </h2>
                  </div>

                  <form onSubmit={handleGenerateSubmit} className="space-y-2.5 flex-1 flex flex-col">
                    <div className="group">
                      <label className="text-[9px] sm:text-[10px] font-display font-bold text-[#6B655C] uppercase tracking-wider block mb-1">
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
                      <label className="text-[9px] sm:text-[10px] font-display font-bold text-[#6B655C] uppercase tracking-wider block mb-1">
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
                      <label className="text-[9px] sm:text-[10px] font-display font-bold text-[#6B655C] uppercase tracking-wider block mb-1">
                        Custom Title Override (Optional)
                      </label>
                      <Input
                        placeholder="e.g. Relieving Letter - 2026"
                        value={customTitle}
                        onChange={(e) => setCustomTitle(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-white border border-[#EAE7E0] text-xs font-bold text-[#1F2B4D] placeholder-[#9A948A] focus:ring-2 focus:ring-[#1F2B4D]"
                      />
                    </div>

                    <AnimatePresence>
                      {isGenerateBlockedForManager && (
                        <motion.div 
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2 text-rose-900 text-[11px] font-medium shadow-2xs overflow-hidden"
                        >
                          <Lock size={15} className="text-rose-600 shrink-0 mt-0.5" />
                          <div>
                            <p className="font-bold font-display uppercase tracking-wider text-[9px]">Admin Authorization Required</p>
                            <p className="leading-tight mt-0.5">This document contains salary data. Only Admins can issue it.</p>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div className="pt-2 mt-auto">
                      <button 
                        type="submit" 
                        disabled={generating || isGenerateBlockedForManager || !selectedUserId || !selectedTemplateId} 
                        className="w-full bg-[#1F2B4D] hover:bg-[#141C33] disabled:opacity-50 text-white font-display font-bold text-xs py-2 sm:py-2.5 rounded-xl transition-all inline-flex items-center justify-center gap-1.5 shadow-2xs whitespace-nowrap"
                      >
                        {generating ? <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0" /> : <Sparkles size={14} className="shrink-0" />}
                        <span>{generating ? 'Compiling PDF Engine...' : 'Generate & Save Document'}</span>
                      </button>
                    </div>
                  </form>
                </div>
              </div>

              {/* Right Column: Live Preview */}
              <div className="lg:col-span-8 flex flex-col">
                <div className="bg-white border border-[#EAE7E0] rounded-[16px] sm:rounded-[20px] p-3.5 sm:p-4 shadow-2xs flex flex-col h-full">
                  <div className="flex justify-between items-center pb-2.5 border-b border-[#F4F1EA]">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-[#FAF8F5] rounded-lg border border-[#EAE7E0] shadow-2xs">
                        <Eye className="w-4 h-4 text-[#1F2B4D]" />
                      </div>
                      <h2 className="font-serif font-bold text-base sm:text-lg text-[#1F2B4D]">
                        Live Engine Preview
                      </h2>
                    </div>
                    {selectedTemplate && (
                      <span className="px-2 py-0.5 text-[8.5px] sm:text-[9.5px] font-display font-bold uppercase tracking-wider bg-indigo-50 text-indigo-800 border border-indigo-200 rounded-full shrink-0">
                        {selectedTemplate.type}
                      </span>
                    )}
                  </div>

                  <div className="mt-3 flex-1 bg-[#FAF8F5] border border-[#EAE7E0] rounded-xl p-4 font-mono text-[11px] sm:text-xs text-[#1F2B4D] whitespace-pre-wrap leading-relaxed shadow-inner overflow-y-auto max-h-[460px] relative">
                    {!selectedTemplate ? (
                       <div className="absolute inset-0 flex flex-col items-center justify-center text-[#9A948A] p-4 text-center">
                         <FileText size={36} className="mb-2 opacity-20" />
                         <span className="font-display font-bold uppercase tracking-wider text-xs">Select Template to Initialize Preview</span>
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
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col gap-3"
            >
              <div className="flex flex-col min-[480px]:flex-row justify-between items-start min-[480px]:items-center gap-2 pb-2">
                <div>
                  <h2 className="font-serif font-bold text-base sm:text-xl text-[#1F2B4D]">Master Templates</h2>
                  <p className="text-[10px] sm:text-xs text-[#6B655C] font-medium">Engineer and deploy custom tenant document architectures.</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEditingTemplate(null);
                    setBuilderForm({ title: '', type: 'CUSTOM', bodyTemplate: '', headerText: '', footerText: '' });
                    setIsTemplateModalOpen(true);
                  }}
                  className="bg-[#1F2B4D] hover:bg-[#141C33] text-white font-display font-bold text-xs px-3.5 py-1.5 sm:py-2 rounded-xl transition-all inline-flex items-center justify-center gap-1.5 shadow-2xs whitespace-nowrap w-full min-[480px]:w-auto"
                >
                  <Plus size={14} className="shrink-0" /> <span>Deploy Custom Template</span>
                </button>
              </div>

              <div className="grid grid-cols-1 min-[500px]:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3.5">
                {templates.map((tmpl) => (
                  <div
                    key={tmpl.id}
                    className="bg-white p-3.5 sm:p-4 rounded-[14px] sm:rounded-[18px] border border-[#EAE7E0] shadow-2xs flex flex-col justify-between hover:shadow-xs transition-all relative overflow-hidden"
                  >
                    {tmpl.isSystemDefault && (
                      <div className="absolute top-0 right-0 w-12 h-12 bg-amber-50 rounded-bl-[60px] border-l border-b border-amber-100 flex items-start justify-end p-2">
                         <Lock size={12} className="text-amber-600" />
                      </div>
                    )}
                    
                    <div>
                      <div className="mb-2">
                        <span className={`px-2 py-0.5 text-[8px] sm:text-[9px] font-display font-bold uppercase tracking-widest rounded-full border shadow-2xs ${
                          tmpl.isSystemDefault ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-indigo-50 text-indigo-800 border-indigo-200'
                        }`}>
                          {tmpl.isSystemDefault ? 'System Core' : tmpl.type}
                        </span>
                      </div>

                      <h3 className="font-serif font-bold text-sm sm:text-base text-[#1F2B4D] mb-2 pr-6 truncate">{tmpl.title}</h3>
                      <div className="text-[10px] sm:text-[11px] text-[#6B655C] line-clamp-3 font-mono bg-[#FAF8F5] p-2.5 rounded-xl border border-[#EAE7E0]">
                        {tmpl.bodyTemplate}
                      </div>
                    </div>

                    <div className="mt-3 pt-3 border-t border-[#F4F1EA] flex items-center justify-between gap-2">
                      {tmpl.isSystemDefault ? (
                        <button
                          type="button"
                          onClick={() => handleDuplicateTemplate(tmpl)}
                          className="w-full text-[11px] font-display font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 py-1.5 rounded-xl inline-flex items-center justify-center gap-1.5 transition-all whitespace-nowrap"
                        >
                          <Copy size={13} className="shrink-0" /> <span>Duplicate Codebase</span>
                        </button>
                      ) : (
                        <>
                          <button
                            type="button"
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
                            className="flex-1 text-[11px] font-display font-bold text-[#1F2B4D] bg-white hover:bg-[#FAF8F5] border border-[#EAE7E0] py-1.5 rounded-xl transition-all shadow-2xs whitespace-nowrap"
                          >
                            Configure
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteTemplate(tmpl.id)}
                            className="px-2.5 py-1.5 text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-all shadow-2xs"
                          >
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* TAB 3: ARCHIVE & HISTORY */}
          {activeTab === 'archive' && (
            <motion.div
              key="archive"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col gap-3"
            >
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-[#EAE7E0] pb-2.5 gap-2">
                <div>
                   <h2 className="font-serif font-bold text-base sm:text-xl text-[#1F2B4D]">Document Archive</h2>
                   <p className="text-[10px] sm:text-xs text-[#6B655C] font-medium">Access historical records and download generated PDFs.</p>
                </div>
                
                <div className="flex gap-1 bg-[#FAF8F5] p-1 rounded-xl border border-[#EAE7E0] w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setArchiveSubTab('my')}
                    className={`px-3 py-1 rounded-lg font-display font-bold text-[10px] sm:text-[11px] uppercase tracking-wider transition-all whitespace-nowrap flex-1 sm:flex-initial justify-center ${
                      archiveSubTab === 'my' ? 'bg-white text-[#1F2B4D] shadow-2xs border border-[#EAE7E0]' : 'text-[#6B655C] hover:text-[#1F2B4D]'
                    }`}
                  >
                    My Files
                  </button>
                  {isManager && (
                    <button
                      type="button"
                      onClick={() => setArchiveSubTab('all')}
                      className={`px-3 py-1 rounded-lg font-display font-bold text-[10px] sm:text-[11px] uppercase tracking-wider transition-all whitespace-nowrap flex-1 sm:flex-initial justify-center ${
                        archiveSubTab === 'all' ? 'bg-white text-[#1F2B4D] shadow-2xs border border-[#EAE7E0]' : 'text-[#6B655C] hover:text-[#1F2B4D]'
                      }`}
                    >
                      Enterprise Scope
                    </button>
                  )}
                </div>
              </div>

              {/* Archive Table - 100% Fit with Hidden Scrollbar */}
              <div className="bg-white border border-[#EAE7E0] rounded-[14px] sm:rounded-[18px] p-0 shadow-2xs overflow-hidden w-full">
                <div className="overflow-x-auto [&::-webkit-scrollbar]:hidden w-full">
                  <table className="w-full text-left border-collapse min-w-[540px]">
                    <thead>
                      <tr className="bg-[#FAF8F5] border-b border-[#EAE7E0] text-[8px] sm:text-[9.5px] font-display font-bold text-[#6B655C] uppercase tracking-wider">
                        <th className="p-2 sm:p-3">Document Title</th>
                        <th className="p-2 sm:p-3">Target Identity</th>
                        <th className="p-2 sm:p-3">Timestamp</th>
                        <th className="p-2 sm:p-3">Originator</th>
                        <th className="p-2 sm:p-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F4F1EA] text-xs">
                      {(archiveSubTab === 'my' ? myDocuments : allDocuments).length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-4 sm:p-5 text-center">
                            <div className="flex flex-col items-center justify-center gap-1.5">
                              <Building className="w-8 h-8 text-[#9A948A] opacity-50" />
                              <span className="text-[#1F2B4D] font-serif font-bold text-sm">Vault is Empty</span>
                              <span className="text-[#6B655C] font-medium text-[11px]">No historical records found in this scope.</span>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        (archiveSubTab === 'my' ? myDocuments : allDocuments).map((doc) => (
                          <tr key={doc.id} className="hover:bg-[#FAF9F6] transition-colors">
                            <td className="p-2 sm:p-3">
                              <div className="flex items-center gap-2 min-w-0">
                                <div className="p-1 bg-[#FAF8F5] rounded border border-[#EAE7E0] shrink-0">
                                  <FileText size={14} className="text-[#1F2B4D]" />
                                </div>
                                <span className="font-serif font-semibold text-[#1F2B4D] text-[11px] sm:text-xs truncate">
                                  {doc.title}
                                </span>
                              </div>
                            </td>
                            <td className="p-2 sm:p-3 text-[10px] sm:text-xs font-bold text-[#1F2B4D] truncate">
                              {doc.user?.displayName || user.displayName}
                            </td>
                            <td className="p-2 sm:p-3 text-[9.5px] sm:text-[11px] font-medium text-[#6B655C] truncate">
                              {format(new Date(doc.createdAt), 'MMM d, yyyy')}
                            </td>
                            <td className="p-2 sm:p-3 text-[10px] sm:text-xs font-medium text-[#6B655C] truncate">
                              {doc.generatedBy?.displayName || 'HR Admin'}
                            </td>
                            <td className="p-2 sm:p-3 text-right">
                              <button
                                type="button"
                                onClick={() => setSelectedDocForView(doc)}
                                className="inline-flex items-center gap-1 text-[9px] sm:text-[10px] font-display font-bold text-[#1F2B4D] bg-white border border-[#EAE7E0] hover:border-[#1F2B4D] hover:bg-[#FAF8F5] px-2 py-0.5 rounded transition-all shadow-2xs shrink-0"
                              >
                                <Eye size={11} /> <span>View File</span>
                              </button>
                            </td>
                          </tr>
                        ))
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
          <div className="fixed inset-0 z-50 bg-[#1F2B4D]/30 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[20px] max-w-2xl w-full p-4 sm:p-6 shadow-xl border border-[#EAE7E0] relative overflow-hidden max-h-[92vh] overflow-y-auto"
            >
              <div className="absolute top-0 left-0 right-0 h-1.5 w-full bg-indigo-500"></div>
              
              <div className="flex justify-between items-center pb-3 border-b border-[#F4F1EA] mb-3 mt-1">
                <h3 className="font-serif font-bold text-base sm:text-xl text-[#1F2B4D]">
                  {editingTemplate ? 'Configure Template Engine' : 'Initialize New Engine'}
                </h3>
                <button type="button" onClick={() => setIsTemplateModalOpen(false)} className="text-[#6B655C] hover:text-[#1F2B4D] bg-[#FAF8F5] p-1.5 rounded-lg transition-colors">
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleSaveTemplate} className="space-y-3">
                <div>
                  <label className="text-[10px] font-display font-bold text-[#6B655C] uppercase tracking-wider block mb-1">Target Architecture Name</label>
                  <Input
                    required
                    placeholder="e.g. Senior Executive Offer Letter"
                    value={builderForm.title}
                    onChange={(e) => setBuilderForm({ ...builderForm, title: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-[#EAE7E0] text-xs font-bold text-[#1F2B4D]"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-display font-bold text-[#6B655C] uppercase tracking-wider block mb-1">
                    Telemetry Injection Tags (Click to bind)
                  </label>
                  <div className="flex flex-wrap gap-1.5 p-2.5 bg-[#FAF8F5] border border-[#EAE7E0] rounded-xl">
                    {PLACEHOLDER_CHIPS.map((chip) => (
                      <button
                        key={chip}
                        type="button"
                        onClick={() => insertPlaceholderToForm(chip)}
                        className="px-2 py-0.5 bg-white border border-[#EAE7E0] text-[#1F2B4D] text-[9.5px] font-mono font-bold rounded-lg hover:border-[#1F2B4D]"
                      >
                        {chip}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-display font-bold text-[#6B655C] uppercase tracking-wider block mb-1">Header Banner Text</label>
                  <Input
                    placeholder="e.g. CONFIDENTIAL — EMPLOYMENT CERTIFICATE"
                    value={builderForm.headerText}
                    onChange={(e) => setBuilderForm({ ...builderForm, headerText: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-[#EAE7E0] text-xs font-bold text-[#1F2B4D]"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-display font-bold text-[#6B655C] uppercase tracking-wider block mb-1">Document Body Engine</label>
                  <textarea
                    required
                    rows={8}
                    value={builderForm.bodyTemplate}
                    onChange={(e) => setBuilderForm({ ...builderForm, bodyTemplate: e.target.value })}
                    className="w-full bg-[#FAF8F5] border border-[#EAE7E0] text-[#1F2B4D] text-xs font-mono rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-[#1F2B4D] resize-y"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-display font-bold text-[#6B655C] uppercase tracking-wider block mb-1">Footer Text</label>
                  <Input
                    placeholder="e.g. Official Document — Verified via Kratos HRMS"
                    value={builderForm.footerText}
                    onChange={(e) => setBuilderForm({ ...builderForm, footerText: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-[#EAE7E0] text-xs font-bold text-[#1F2B4D]"
                  />
                </div>

                <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-3 border-t border-[#F4F1EA]">
                  <button type="button" onClick={() => setIsTemplateModalOpen(false)} className="w-full sm:w-auto bg-white hover:bg-[#FAF8F5] text-[#1F2B4D] border border-[#EAE7E0] font-display font-bold text-xs px-4 py-2 rounded-xl transition-all">
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="w-full sm:w-auto bg-[#1F2B4D] hover:bg-[#141C33] text-white font-display font-bold text-xs px-5 py-2 rounded-xl transition-all"
                  >
                    Deploy Engine Template
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── PDF LIGHTBOX VIEWER MODAL ── */}
      <AnimatePresence>
        {selectedDocForView && (
          <div className="fixed inset-0 z-50 bg-[#0A0D14]/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[24px] max-w-4xl w-full h-[88vh] flex flex-col shadow-2xl overflow-hidden border border-white/10"
            >
              {/* Dark Header */}
              <div className="flex justify-between items-center p-3.5 sm:p-4 bg-[#101520] border-b border-white/10">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 bg-white/5 rounded-xl border border-white/10 shrink-0">
                    <FileText size={18} className="text-indigo-400" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-serif font-bold text-base sm:text-lg text-white leading-none truncate">{selectedDocForView.title}</h3>
                    <p className="text-[10px] font-display font-bold uppercase tracking-wider text-slate-400 mt-1 truncate">Target: {selectedDocForView.user?.displayName || user.displayName}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {pdfBlobUrl && (
                    <a
                      href={pdfBlobUrl}
                      download={selectedDocForView.fileName || 'document.pdf'}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-[11px] font-display font-bold uppercase tracking-wider rounded-xl shadow-2xs hover:bg-indigo-700 transition-all whitespace-nowrap"
                    >
                      <Download size={13} className="shrink-0" /> <span>Fetch PDF</span>
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => setSelectedDocForView(null)}
                    className="text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 p-2 rounded-xl transition-all"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              <div className="flex-1 bg-[#1A2235] flex items-center justify-center relative p-3 sm:p-4">
                {pdfLoading && (
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-[11px] font-display font-bold uppercase tracking-wider text-indigo-400 animate-pulse">Decrypting PDF Stream...</p>
                  </div>
                )}

                {pdfError && (
                  <div className="bg-rose-950/50 border border-rose-500/30 p-6 rounded-2xl max-w-md text-center">
                    <AlertTriangle size={28} className="mx-auto text-rose-500 mb-2" />
                    <p className="font-serif font-bold text-lg text-white mb-1">Stream Failure</p>
                    <p className="text-xs font-medium text-rose-300">{pdfError}</p>
                  </div>
                )}

                {!pdfLoading && !pdfError && pdfBlobUrl && (
                  <iframe
                    src={pdfBlobUrl}
                    title="PDF Viewer"
                    className="w-full h-full rounded-xl shadow-2xl bg-white"
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
