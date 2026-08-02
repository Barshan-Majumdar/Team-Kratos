import React, { useState, useEffect } from 'react';
import { hasPermission } from '../lib/permissions';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Avatar } from '../components/ui/Avatar';
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
  Info
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

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

      // 1. Fetch templates
      const tmplRes = await fetch(`${apiBase}/api/documents/templates`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (tmplRes.ok) setTemplates(await tmplRes.json());

      // 2. Fetch my documents
      const myDocsRes = await fetch(`${apiBase}/api/documents/my`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (myDocsRes.ok) setMyDocuments(await myDocsRes.json());

      // 3. Fetch all company documents if manager/admin
      if (isManager) {
        const allDocsRes = await fetch(`${apiBase}/api/documents/all`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (allDocsRes.ok) setAllDocuments(await allDocsRes.json());

        // 4. Fetch employee list for generation selector
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
    if (!selectedTemplate) return 'Select a document template to preview.';
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
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto min-h-full flex flex-col gap-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-2.5">
            <FileText size={28} className="text-indigo-600" />
            Document Generation Engine
          </h1>
          <p className="text-slate-500 mt-1 text-sm">Create, template, and issue official HR & employment certificates with protected PDF rendering.</p>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 bg-slate-100 p-1.5 rounded-2xl border border-slate-200/80">
          <button
            onClick={() => setActiveTab('generate')}
            className={`px-4 py-2 rounded-xl font-bold text-xs transition-all flex items-center gap-2 ${
              activeTab === 'generate'
                ? 'bg-white text-indigo-600 shadow-sm shadow-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sparkles size={16} /> Generate Document
          </button>
          
          {isAdmin && (
            <button
              onClick={() => setActiveTab('builder')}
              className={`px-4 py-2 rounded-xl font-bold text-xs transition-all flex items-center gap-2 ${
                activeTab === 'builder'
                  ? 'bg-white text-indigo-600 shadow-sm shadow-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileCheck size={16} /> Template Builder
            </button>
          )}

          <button
            onClick={() => setActiveTab('archive')}
            className={`px-4 py-2 rounded-xl font-bold text-xs transition-all flex items-center gap-2 ${
              activeTab === 'archive'
                ? 'bg-white text-indigo-600 shadow-sm shadow-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Building size={16} /> Archive & History
          </button>
        </div>
      </div>

      {/* TAB 1: GENERATE DOCUMENT */}
      {activeTab === 'generate' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Generation Controls */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            <Card className="p-6 rounded-3xl border border-slate-200 shadow-sm bg-white">
              <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Sparkles size={20} className="text-indigo-600" />
                Issue Employee Document
              </h2>

              <form onSubmit={handleGenerateSubmit} className="flex flex-col gap-5">
                
                {/* Employee Selector */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                    Select Target Employee
                  </label>
                  <select
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    required
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm font-semibold rounded-2xl p-3.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                  >
                    <option value="">-- Choose Employee --</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.displayName} ({emp.jobPosition || 'Employee'} • {emp.department || 'General'})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Template Selector */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                    Select Document Template
                  </label>
                  <select
                    value={selectedTemplateId}
                    onChange={(e) => setSelectedTemplateId(e.target.value)}
                    required
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm font-semibold rounded-2xl p-3.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                  >
                    <option value="">-- Choose Template --</option>
                    {templates.map((tmpl) => {
                      const isSalary = ['OFFER_LETTER', 'SALARY_CERTIFICATE', 'PROMOTION_LETTER'].includes(tmpl.type) ||
                        ['{{baseSalary}}', '{{ctc}}', '{{salary}}'].some(ph => tmpl.bodyTemplate?.includes(ph));
                      return (
                        <option key={tmpl.id} value={tmpl.id}>
                          {tmpl.title} {isSalary ? '🔒 [Admin Only - Salary Data]' : ''}
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Custom Title Override */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                    Custom Document Title (Optional)
                  </label>
                  <Input
                    placeholder="e.g. Relieving Letter - 2026"
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    className="rounded-2xl bg-slate-50"
                  />
                </div>

                {/* RBAC Salary Warning Banner if manager tries salary template */}
                {isGenerateBlockedForManager && (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3 text-amber-900 text-xs font-semibold">
                    <Lock size={18} className="text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold mb-1">Admin Authorization Required</p>
                      <p>This document template contains salary/compensation placeholders. Per RBAC security rules, salary documents can only be generated by Admins.</p>
                    </div>
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={generating || isGenerateBlockedForManager || !selectedUserId || !selectedTemplateId}
                  className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl shadow-lg shadow-indigo-600/20 gap-2 text-sm"
                >
                  {generating ? 'Rendering PDF...' : '✨ Generate & Save PDF Document'}
                </Button>
              </form>
            </Card>
          </div>

          {/* Live Document Preview Box */}
          <div className="lg:col-span-7">
            <Card className="p-6 rounded-3xl border border-slate-200 shadow-sm bg-white min-h-[500px] flex flex-col">
              <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Eye size={20} className="text-indigo-600" />
                  <h3 className="font-bold text-slate-800">Live Template Preview</h3>
                </div>
                {selectedTemplate && (
                  <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 font-bold">
                    {selectedTemplate.type}
                  </Badge>
                )}
              </div>

              <div className="mt-6 flex-1 bg-slate-50 border border-slate-200/80 rounded-2xl p-8 font-mono text-sm text-slate-800 whitespace-pre-wrap leading-relaxed shadow-inner overflow-y-auto max-h-[550px]">
                {getLivePreviewText()}
              </div>
            </Card>
          </div>

        </div>
      )}

      {/* TAB 2: TEMPLATE BUILDER (ADMIN ONLY) */}
      {activeTab === 'builder' && isAdmin && (
        <div className="flex flex-col gap-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-black text-slate-800">Document Templates</h2>
              <p className="text-xs text-slate-500">Manage system default templates and build custom tenant document formats.</p>
            </div>
            <Button
              onClick={() => {
                setEditingTemplate(null);
                setBuilderForm({ title: '', type: 'CUSTOM', bodyTemplate: '', headerText: '', footerText: '' });
                setIsTemplateModalOpen(true);
              }}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl gap-2 text-xs"
            >
              <Plus size={16} /> Create Custom Template
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.map((tmpl) => (
              <Card key={tmpl.id} className="p-6 rounded-3xl border border-slate-200 shadow-sm bg-white flex flex-col justify-between hover:border-indigo-200 transition-all">
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                      tmpl.isSystemDefault ? 'bg-amber-100 text-amber-800' : 'bg-indigo-100 text-indigo-800'
                    }`}>
                      {tmpl.isSystemDefault ? 'System Default' : tmpl.type}
                    </span>
                    {tmpl.isSystemDefault && <Lock size={14} className="text-slate-400" title="System default templates cannot be modified" />}
                  </div>

                  <h3 className="text-base font-bold text-slate-800 mb-2">{tmpl.title}</h3>
                  <p className="text-xs text-slate-500 line-clamp-3 font-mono bg-slate-50 p-3 rounded-xl border border-slate-100">
                    {tmpl.bodyTemplate}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                  {tmpl.isSystemDefault ? (
                    <Button
                      onClick={() => handleDuplicateTemplate(tmpl)}
                      variant="outline"
                      className="text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border-indigo-200 w-full gap-1.5 py-2 rounded-xl"
                    >
                      <Copy size={14} /> Duplicate as Custom
                    </Button>
                  ) : (
                    <>
                      <Button
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
                        variant="outline"
                        className="text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 border-slate-200 flex-1 py-2 rounded-xl"
                      >
                        Edit
                      </Button>
                      <Button
                        onClick={() => handleDeleteTemplate(tmpl.id)}
                        variant="outline"
                        className="text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 border-red-200 py-2 rounded-xl"
                      >
                        <Trash2 size={14} />
                      </Button>
                    </>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: ARCHIVE & HISTORY */}
      {activeTab === 'archive' && (
        <div className="flex flex-col gap-6">
          <div className="flex justify-between items-center border-b border-slate-200 pb-4">
            <div className="flex gap-2">
              <button
                onClick={() => setArchiveSubTab('my')}
                className={`px-4 py-2 rounded-xl font-bold text-xs transition-all ${
                  archiveSubTab === 'my' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                My Documents ({myDocuments.length})
              </button>
              {isManager && (
                <button
                  onClick={() => setArchiveSubTab('all')}
                  className={`px-4 py-2 rounded-xl font-bold text-xs transition-all ${
                    archiveSubTab === 'all' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  All Company Documents ({allDocuments.length})
                </button>
              )}
            </div>
          </div>

          <Card className="rounded-3xl border border-slate-200 shadow-sm bg-white overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
                    <th className="p-4 pl-6">Document Title</th>
                    <th className="p-4">Recipient Employee</th>
                    <th className="p-4">Generated Date</th>
                    <th className="p-4">Issued By</th>
                    <th className="p-4 text-right pr-6">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {(archiveSubTab === 'my' ? myDocuments : allDocuments).length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-12 text-center text-slate-400 font-medium">
                        No generated documents found.
                      </td>
                    </tr>
                  ) : (
                    (archiveSubTab === 'my' ? myDocuments : allDocuments).map((doc) => (
                      <tr key={doc.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-4 pl-6 font-bold text-slate-800">
                          <div className="flex items-center gap-2">
                            <FileText size={18} className="text-indigo-600" />
                            {doc.title}
                          </div>
                        </td>
                        <td className="p-4 font-semibold text-slate-700">
                          {doc.user?.displayName || user.displayName}
                        </td>
                        <td className="p-4 text-xs font-medium text-slate-500">
                          {format(new Date(doc.createdAt), 'MMM d, yyyy')}
                        </td>
                        <td className="p-4 text-xs font-semibold text-slate-600">
                          {doc.generatedBy?.displayName || 'HR Admin'}
                        </td>
                        <td className="p-4 pr-6 text-right">
                          <button
                            onClick={() => setSelectedDocForView(doc)}
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-xl transition-colors"
                          >
                            <Eye size={14} /> View & Download PDF
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* TEMPLATE BUILDER MODAL */}
      {isTemplateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100 mb-5">
              <h3 className="text-lg font-black text-slate-800">
                {editingTemplate ? 'Edit Custom Template' : 'Create Custom Template'}
              </h3>
              <button onClick={() => setIsTemplateModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveTemplate} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Template Title</label>
                <Input
                  required
                  placeholder="e.g. Senior Software Engineer Offer Letter"
                  value={builderForm.title}
                  onChange={(e) => setBuilderForm({ ...builderForm, title: e.target.value })}
                  className="rounded-xl"
                />
              </div>

              {/* Placeholder Insert Chips */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Insert Placeholder Chips (Click to append)
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {PLACEHOLDER_CHIPS.map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => insertPlaceholderToForm(chip)}
                      className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-lg transition-colors border border-indigo-200/60"
                    >
                      + {chip}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Header Banner Text (Optional)</label>
                <Input
                  placeholder="e.g. CONFIDENTIAL — EMPLOYMENT CERTIFICATE"
                  value={builderForm.headerText}
                  onChange={(e) => setBuilderForm({ ...builderForm, headerText: e.target.value })}
                  className="rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Body Template Text</label>
                <textarea
                  required
                  rows={10}
                  value={builderForm.bodyTemplate}
                  onChange={(e) => setBuilderForm({ ...builderForm, bodyTemplate: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm font-mono rounded-2xl p-4 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Footer Text (Optional)</label>
                <Input
                  placeholder="e.g. Official Document — Verified via Crew HRMS"
                  value={builderForm.footerText}
                  onChange={(e) => setBuilderForm({ ...builderForm, footerText: e.target.value })}
                  className="rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <Button type="button" variant="outline" onClick={() => setIsTemplateModalOpen(false)} className="rounded-xl text-xs">
                  Cancel
                </Button>
                <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs">
                  Save Template
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PDF LIGHTBOX VIEWER MODAL */}
      {selectedDocForView && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-4xl w-full h-[85vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-5 bg-slate-900 text-white">
              <div className="flex items-center gap-3">
                <FileText size={22} className="text-indigo-400" />
                <div>
                  <h3 className="font-bold text-sm text-white">{selectedDocForView.title}</h3>
                  <p className="text-xs text-slate-400">Issued for: {selectedDocForView.user?.displayName || user.displayName}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {pdfBlobUrl && (
                  <a
                    href={pdfBlobUrl}
                    download={selectedDocForView.fileName || 'document.pdf'}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-colors"
                  >
                    <Download size={14} /> Download PDF
                  </a>
                )}
                <button
                  onClick={() => setSelectedDocForView(null)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="flex-1 bg-slate-100 flex items-center justify-center relative p-4">
              {pdfLoading && (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-xs font-bold text-slate-600">Loading protected PDF stream...</p>
                </div>
              )}

              {pdfError && (
                <div className="bg-red-50 border border-red-200 text-red-800 p-6 rounded-2xl max-w-md text-center">
                  <AlertTriangle size={24} className="mx-auto text-red-600 mb-2" />
                  <p className="font-bold text-sm">Failed to Load Document</p>
                  <p className="text-xs text-red-600 mt-1">{pdfError}</p>
                </div>
              )}

              {!pdfLoading && !pdfError && pdfBlobUrl && (
                <iframe
                  src={pdfBlobUrl}
                  title="PDF Viewer"
                  className="w-full h-full rounded-xl border border-slate-200 shadow-inner"
                />
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default DocumentGenerator;
