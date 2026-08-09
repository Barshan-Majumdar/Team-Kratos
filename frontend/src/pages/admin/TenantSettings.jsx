import React, { useState, useEffect, useRef } from 'react';
import { Building2, ShieldCheck, Plus, Building, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import { API_BASE } from '../../lib/api';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

const TenantSettings = () => {
  const [activeTab, setActiveTab] = useState('entities');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Legal Entities State
  const [legalEntities, setLegalEntities] = useState([]);
  const [entityForm, setEntityForm] = useState({ name: '', pfCode: '', ptRegNo: '' });

  // Compliance Rules State
  const [complianceRules, setComplianceRules] = useState([]);
  const [ruleForm, setRuleForm] = useState({ state: '', ruleType: 'PF', rateTable: '' });

  const containerRef = useRef(null);
  const contentRef = useRef(null);

  const fetchEntities = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/tenant-settings/legal-entities`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (!res.ok) throw new Error('Failed to fetch legal entities');
      const data = await res.json();
      setLegalEntities(data);
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  const fetchRules = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/tenant-settings/compliance-rules`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (!res.ok) throw new Error('Failed to fetch compliance rules');
      const data = await res.json();
      setComplianceRules(data);
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchEntities(), fetchRules()]).finally(() => setLoading(false));
  }, []);

  useGSAP(() => {
    gsap.fromTo('.gsap-stagger-header', 
      { opacity: 0, y: 20 }, 
      { opacity: 1, y: 0, duration: 0.8, stagger: 0.1, ease: 'power3.out' }
    );
  }, []);

  useGSAP(() => {
    // Animate tab content smoothly when activeTab changes
    if (contentRef.current) {
      gsap.fromTo(contentRef.current.children,
        { opacity: 0, y: 15 },
        { opacity: 1, y: 0, duration: 0.6, stagger: 0.05, ease: 'power3.out', overwrite: 'auto' }
      );
    }
  }, [activeTab]);

  const handleCreateEntity = async (e) => {
    e.preventDefault();
    setErrorMsg(''); setSuccessMsg('');
    try {
      const res = await fetch(`${API_BASE}/api/tenant-settings/legal-entities`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(entityForm)
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create legal entity');
      }
      setSuccessMsg('Legal Entity created successfully');
      setEntityForm({ name: '', pfCode: '', ptRegNo: '' });
      fetchEntities();
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  const handleCreateRule = async (e) => {
    e.preventDefault();
    setErrorMsg(''); setSuccessMsg('');
    try {
      let parsedRateTable;
      try {
        parsedRateTable = JSON.parse(ruleForm.rateTable);
      } catch (parseErr) {
        throw new Error('Rate Table must be valid JSON');
      }

      const res = await fetch(`${API_BASE}/api/tenant-settings/compliance-rules`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ ...ruleForm, rateTable: parsedRateTable })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create compliance rule');
      }
      setSuccessMsg('Compliance Rule added successfully');
      setRuleForm({ state: '', ruleType: 'PF', rateTable: '' });
      fetchRules();
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  const doppelrandOuter = "bg-[#F4F1EA] rounded-[32px] p-2 shadow-[0_4px_24px_rgba(29,27,22,0.04)]";
  const doppelrandInner = "bg-white rounded-[24px] border border-[#EAE7E0] w-full h-full p-6 md:p-8 flex flex-col relative overflow-hidden";

  return (
    <div ref={containerRef} className="p-4 md:p-8 lg:p-12 max-w-7xl mx-auto space-y-10 min-h-screen font-sans bg-[#FAF9F6]">
      
      {/* Header */}
      <div className="gsap-stagger-header opacity-0 flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-[#F0F3F9] rounded-[14px] flex items-center justify-center text-[#1F2B4D]">
            <Building2 size={24} strokeWidth={2.5} />
          </div>
          <h1 className="text-[36px] md:text-[40px] font-bold text-[#1D1B16] tracking-tighter leading-none">
            Organization Settings
          </h1>
        </div>
        <p className="text-[#6B655C] text-[15px] font-medium tracking-tight">
          Configure multi-entity group companies and state-wise statutory compliance rules.
        </p>
      </div>

      {errorMsg && (
        <div className="gsap-stagger-header opacity-0 p-5 rounded-2xl font-semibold text-[14px] flex items-center gap-3 bg-rose-50 text-rose-700 border border-rose-200">
          <AlertCircle size={20} strokeWidth={2.5} />
          {errorMsg}
        </div>
      )}
      {successMsg && (
        <div className="gsap-stagger-header opacity-0 p-5 rounded-2xl font-semibold text-[14px] flex items-center gap-3 bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0]">
          <CheckCircle size={20} strokeWidth={2.5} />
          {successMsg}
        </div>
      )}

      {/* Segmented Control Tabs */}
      <div className="gsap-stagger-header opacity-0 flex p-1.5 bg-[#F4F1EA] rounded-2xl w-fit shadow-sm border border-[#EAE7E0]">
        <button
          onClick={() => setActiveTab('entities')}
          className={`flex items-center gap-2 px-6 py-3 text-[14px] font-bold rounded-[14px] transition-all duration-300 ease-out ${
            activeTab === 'entities' 
              ? 'bg-white text-[#1D1B16] shadow-sm' 
              : 'text-[#6B655C] hover:text-[#1D1B16] hover:bg-white/50'
          }`}
        >
          <Building2 size={18} strokeWidth={2.5} className={activeTab === 'entities' ? "text-[#1F2B4D]" : ""} /> 
          Companies & Subsidiaries
        </button>
        <button
          onClick={() => setActiveTab('rules')}
          className={`flex items-center gap-2 px-6 py-3 text-[14px] font-bold rounded-[14px] transition-all duration-300 ease-out ${
            activeTab === 'rules' 
              ? 'bg-white text-[#1D1B16] shadow-sm' 
              : 'text-[#6B655C] hover:text-[#1D1B16] hover:bg-white/50'
          }`}
        >
          <ShieldCheck size={18} strokeWidth={2.5} className={activeTab === 'rules' ? "text-[#1F2B4D]" : ""} /> 
          Compliance Rules
        </button>
      </div>

      {/* Tab Content Container */}
      <div ref={contentRef} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEGAL ENTITIES TAB */}
        {activeTab === 'entities' && (
          <>
            {/* Form Column */}
            <div className={`lg:col-span-4 h-fit ${doppelrandOuter}`}>
              <div className={doppelrandInner}>
                <h2 className="text-[18px] font-bold text-[#1D1B16] mb-6 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#1F2B4D]"></span>
                  Register Company
                </h2>
                <form onSubmit={handleCreateEntity} className="space-y-5">
                  <div>
                    <label className="block text-[13px] font-bold text-[#6B655C] mb-2">Company Name</label>
                    <input required type="text" value={entityForm.name} onChange={(e) => setEntityForm({...entityForm, name: e.target.value})} placeholder="Acme Pvt Ltd" className="w-full bg-[#FAF9F6] border border-[#EAE7E0] text-[#1D1B16] text-[15px] font-semibold rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-[#1F2B4D] focus:border-[#1F2B4D] transition-all duration-300 placeholder:text-[#9A948A] placeholder:font-medium" />
                  </div>
                  <div>
                    <label className="block text-[13px] font-bold text-[#6B655C] mb-2">PF Registration Code</label>
                    <input type="text" value={entityForm.pfCode} onChange={(e) => setEntityForm({...entityForm, pfCode: e.target.value})} placeholder="MH/BAN/12345" className="w-full bg-[#FAF9F6] border border-[#EAE7E0] text-[#1D1B16] text-[15px] font-semibold rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-[#1F2B4D] focus:border-[#1F2B4D] transition-all duration-300 placeholder:text-[#9A948A] placeholder:font-medium" />
                  </div>
                  <div>
                    <label className="block text-[13px] font-bold text-[#6B655C] mb-2">PT Registration Number</label>
                    <input type="text" value={entityForm.ptRegNo} onChange={(e) => setEntityForm({...entityForm, ptRegNo: e.target.value})} placeholder="PTR-987654321" className="w-full bg-[#FAF9F6] border border-[#EAE7E0] text-[#1D1B16] text-[15px] font-semibold rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-[#1F2B4D] focus:border-[#1F2B4D] transition-all duration-300 placeholder:text-[#9A948A] placeholder:font-medium" />
                  </div>
                  <button type="submit" className="w-full py-4 mt-2 bg-[#1F2B4D] text-white text-[14px] font-bold rounded-xl shadow-[0_4px_16px_rgba(31,43,77,0.2)] transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:scale-[1.02] hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(31,43,77,0.3)] hover:bg-[#141C33] active:scale-95 flex items-center justify-center gap-2">
                    <Plus size={18} strokeWidth={2.5} /> Register Company
                  </button>
                </form>
              </div>
            </div>

            {/* List Column */}
            <div className={`lg:col-span-8 ${doppelrandOuter}`}>
              <div className={`${doppelrandInner} bg-[#FAF9F6]`}>
                <h2 className="text-[18px] font-bold text-[#1D1B16] mb-6 flex items-center gap-2">
                  <Building size={20} className="text-[#1F2B4D]" strokeWidth={2.5} /> Active Companies
                </h2>
                
                <div className="space-y-3">
                  {legalEntities.length === 0 ? (
                    <div className="text-center py-12 bg-white border border-[#EAE7E0] rounded-2xl flex flex-col items-center justify-center">
                      <Building2 size={32} className="text-[#9A948A] mb-3" strokeWidth={1.5} />
                      <p className="text-[15px] font-bold text-[#1D1B16]">No companies registered</p>
                      <p className="text-[14px] text-[#6B655C] font-medium mt-1">Use the form to register your first entity.</p>
                    </div>
                  ) : (
                    legalEntities.map(entity => (
                      <div key={entity.id} className="p-5 bg-white border border-[#EAE7E0] rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-all duration-300 ease-out hover:shadow-md hover:-translate-y-1 hover:border-[#D9D6CE]">
                        <div>
                          <h3 className="font-bold text-[16px] text-[#1D1B16]">{entity.name}</h3>
                          <p className="text-[13px] text-[#6B655C] font-medium mt-0.5">Entity ID: {entity.id}</p>
                        </div>
                        <div className="flex flex-col md:items-end gap-1.5 text-sm">
                          <span className="font-mono bg-[#F0F3F9] text-[#1F2B4D] px-2.5 py-1 rounded-md text-[12px] font-bold">PF: {entity.pfCode || 'N/A'}</span>
                          <span className="text-[#6B655C] text-[12px] font-bold bg-[#FAF9F6] px-2.5 py-1 rounded-md border border-[#EAE7E0]">PT: {entity.ptRegNo || 'N/A'}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {/* COMPLIANCE RULES TAB */}
        {activeTab === 'rules' && (
          <>
            {/* Form Column */}
            <div className={`lg:col-span-4 h-fit ${doppelrandOuter}`}>
              <div className={doppelrandInner}>
                <h2 className="text-[18px] font-bold text-[#1D1B16] mb-6 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#1F2B4D]"></span>
                  Add Rule
                </h2>
                <form onSubmit={handleCreateRule} className="space-y-5">
                  <div>
                    <label className="block text-[13px] font-bold text-[#6B655C] mb-2">State</label>
                    <input required type="text" value={ruleForm.state} onChange={(e) => setRuleForm({...ruleForm, state: e.target.value})} placeholder="e.g. Karnataka" className="w-full bg-[#FAF9F6] border border-[#EAE7E0] text-[#1D1B16] text-[15px] font-semibold rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-[#1F2B4D] focus:border-[#1F2B4D] transition-all duration-300 placeholder:text-[#9A948A] placeholder:font-medium" />
                  </div>
                  <div>
                    <label className="block text-[13px] font-bold text-[#6B655C] mb-2">Rule Type</label>
                    <select value={ruleForm.ruleType} onChange={(e) => setRuleForm({...ruleForm, ruleType: e.target.value})} className="w-full bg-[#FAF9F6] border border-[#EAE7E0] text-[#1D1B16] text-[15px] font-semibold rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-[#1F2B4D] focus:border-[#1F2B4D] transition-all duration-300 cursor-pointer appearance-none">
                      <option value="PF">Provident Fund (PF)</option>
                      <option value="ESI">ESI</option>
                      <option value="PT">Professional Tax (PT)</option>
                      <option value="LWF">Labour Welfare Fund (LWF)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[13px] font-bold text-[#6B655C] mb-2">Rate Table (JSON)</label>
                    <textarea required value={ruleForm.rateTable} onChange={(e) => setRuleForm({...ruleForm, rateTable: e.target.value})} placeholder='{"employeeShare": 12, "employerShare": 12}' className="w-full bg-[#FAF9F6] border border-[#EAE7E0] text-[#1D1B16] text-[13px] font-mono rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-[#1F2B4D] focus:border-[#1F2B4D] transition-all duration-300 resize-none h-36 placeholder:text-[#9A948A] placeholder:font-sans" />
                  </div>
                  <button type="submit" className="w-full py-4 mt-2 bg-[#1F2B4D] text-white text-[14px] font-bold rounded-xl shadow-[0_4px_16px_rgba(31,43,77,0.2)] transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:scale-[1.02] hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(31,43,77,0.3)] hover:bg-[#141C33] active:scale-95 flex items-center justify-center gap-2">
                    <Plus size={18} strokeWidth={2.5} /> Save Rule
                  </button>
                </form>
              </div>
            </div>

            {/* List Column */}
            <div className={`lg:col-span-8 ${doppelrandOuter}`}>
              <div className={`${doppelrandInner} bg-[#FAF9F6]`}>
                <h2 className="text-[18px] font-bold text-[#1D1B16] mb-6 flex items-center gap-2">
                  <FileText size={20} className="text-[#1F2B4D]" strokeWidth={2.5} /> Active Configurations
                </h2>
                <div className="space-y-4">
                  {complianceRules.length === 0 ? (
                    <div className="text-center py-12 bg-white border border-[#EAE7E0] rounded-2xl flex flex-col items-center justify-center">
                      <ShieldCheck size={32} className="text-[#9A948A] mb-3" strokeWidth={1.5} />
                      <p className="text-[15px] font-bold text-[#1D1B16]">No compliance rules mapped</p>
                      <p className="text-[14px] text-[#6B655C] font-medium mt-1">Configure statutory logic using the form.</p>
                    </div>
                  ) : (
                    complianceRules.map(rule => (
                      <div key={rule.id} className="bg-white border border-[#EAE7E0] rounded-2xl overflow-hidden transition-all duration-300 ease-out hover:shadow-md hover:-translate-y-1 hover:border-[#D9D6CE]">
                        <div className="p-5 border-b border-[#EAE7E0] flex justify-between items-center bg-white">
                          <div className="flex items-center gap-3">
                            <span className="font-bold text-[16px] text-[#1D1B16]">{rule.state}</span>
                            <span className="text-[12px] font-bold bg-[#F0F3F9] text-[#1F2B4D] px-2.5 py-1 rounded-md">{rule.ruleType}</span>
                          </div>
                          <span className="text-[12px] font-bold text-[#6B655C] bg-[#FAF9F6] px-2.5 py-1 rounded-md border border-[#EAE7E0]">
                            Since {new Date(rule.effectiveFrom).toLocaleDateString('en-IN')}
                          </span>
                        </div>
                        <div className="p-5 bg-[#FAF9F6]">
                          <pre className="text-[13px] font-bold font-mono text-[#1D1B16] m-0 overflow-x-auto custom-scrollbar">
                            {JSON.stringify(rule.rateTable, null, 2)}
                          </pre>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>

    </div>
  );
};

export default TenantSettings;
