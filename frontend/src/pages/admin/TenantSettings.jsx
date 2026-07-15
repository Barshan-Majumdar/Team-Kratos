import React, { useState, useEffect } from 'react';
import { Building2, ShieldCheck, Plus, Building, FileText } from 'lucide-react';
import { API_BASE } from '../../lib/api';
import Alert from '../../components/ui/Alert';

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

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6 md:space-y-8 animate-in fade-in zoom-in-95 duration-300">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary-400 to-primary-600">
          Organization Settings
        </h1>
        <p className="text-text-muted text-sm md:text-base">
          Configure multi-entity group companies and state-wise statutory compliance rules.
        </p>
      </div>

      {errorMsg && <Alert type="error" message={errorMsg} />}
      {successMsg && <Alert type="success" message={successMsg} />}

      <div className="flex border-b border-white/10 gap-4 mb-6">
        <button
          onClick={() => setActiveTab('entities')}
          className={`pb-3 px-2 flex items-center gap-2 font-semibold transition-colors border-b-2 ${
            activeTab === 'entities' 
              ? 'border-primary-500 text-primary-500' 
              : 'border-transparent text-text-muted hover:text-text-primary'
          }`}
        >
          <Building2 size={18} /> Legal Entities
        </button>
        <button
          onClick={() => setActiveTab('rules')}
          className={`pb-3 px-2 flex items-center gap-2 font-semibold transition-colors border-b-2 ${
            activeTab === 'rules' 
              ? 'border-primary-500 text-primary-500' 
              : 'border-transparent text-text-muted hover:text-text-primary'
          }`}
        >
          <ShieldCheck size={18} /> Compliance Rules
        </button>
      </div>

      {/* LEGAL ENTITIES TAB */}
      {activeTab === 'entities' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="glass-panel p-6 rounded-2xl lg:col-span-1 h-fit">
            <h2 className="text-xl font-bold text-text-primary mb-4 flex items-center gap-2">
              <Plus size={20} className="text-primary-500" /> Add Entity
            </h2>
            <form onSubmit={handleCreateEntity} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-text-muted mb-1">Entity Name</label>
                <input required type="text" value={entityForm.name} onChange={(e) => setEntityForm({...entityForm, name: e.target.value})} placeholder="Acme Pvt Ltd" className="w-full p-2.5 bg-bg-base border border-white/10 rounded-lg text-text-primary focus:border-primary-500 outline-none transition-all" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-text-muted mb-1">PF Registration Code</label>
                <input type="text" value={entityForm.pfCode} onChange={(e) => setEntityForm({...entityForm, pfCode: e.target.value})} placeholder="MH/BAN/12345" className="w-full p-2.5 bg-bg-base border border-white/10 rounded-lg text-text-primary focus:border-primary-500 outline-none transition-all" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-text-muted mb-1">PT Registration Number</label>
                <input type="text" value={entityForm.ptRegNo} onChange={(e) => setEntityForm({...entityForm, ptRegNo: e.target.value})} placeholder="PTR-987654321" className="w-full p-2.5 bg-bg-base border border-white/10 rounded-lg text-text-primary focus:border-primary-500 outline-none transition-all" />
              </div>
              <button type="submit" className="w-full py-2.5 bg-primary-600 hover:bg-primary-500 text-white font-bold rounded-lg transition-colors shadow-premium-glow">
                Register Entity
              </button>
            </form>
          </div>

          <div className="glass-panel p-6 rounded-2xl lg:col-span-2">
            <h2 className="text-xl font-bold text-text-primary mb-4 flex items-center gap-2">
              <Building size={20} className="text-primary-500" /> Active Entities
            </h2>
            <div className="space-y-4">
              {legalEntities.length === 0 ? (
                <div className="text-center p-8 border border-dashed border-white/10 rounded-xl text-text-muted">
                  No legal entities registered yet.
                </div>
              ) : (
                legalEntities.map(entity => (
                  <div key={entity.id} className="p-4 bg-bg-base border border-white/5 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover-float">
                    <div>
                      <h3 className="font-bold text-lg text-text-primary">{entity.name}</h3>
                      <p className="text-sm text-text-muted">ID: {entity.id}</p>
                    </div>
                    <div className="flex flex-col md:items-end gap-1 text-sm">
                      <span className="font-mono bg-primary-900/30 text-primary-400 px-2 py-1 rounded-md border border-primary-500/20">PF Code: {entity.pfCode || 'N/A'}</span>
                      <span className="text-text-muted text-xs">PT Reg: {entity.ptRegNo || 'N/A'}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* COMPLIANCE RULES TAB */}
      {activeTab === 'rules' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="glass-panel p-6 rounded-2xl lg:col-span-1 h-fit">
            <h2 className="text-xl font-bold text-text-primary mb-4 flex items-center gap-2">
              <Plus size={20} className="text-primary-500" /> Add Rule
            </h2>
            <form onSubmit={handleCreateRule} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-text-muted mb-1">State</label>
                <input required type="text" value={ruleForm.state} onChange={(e) => setRuleForm({...ruleForm, state: e.target.value})} placeholder="e.g. Karnataka" className="w-full p-2.5 bg-bg-base border border-white/10 rounded-lg text-text-primary focus:border-primary-500 outline-none transition-all" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-text-muted mb-1">Rule Type</label>
                <select value={ruleForm.ruleType} onChange={(e) => setRuleForm({...ruleForm, ruleType: e.target.value})} className="w-full p-2.5 bg-bg-base border border-white/10 rounded-lg text-text-primary focus:border-primary-500 outline-none transition-all">
                  <option value="PF">Provident Fund (PF)</option>
                  <option value="ESI">ESI</option>
                  <option value="PT">Professional Tax (PT)</option>
                  <option value="LWF">Labour Welfare Fund (LWF)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-text-muted mb-1">Rate Table (JSON)</label>
                <textarea required value={ruleForm.rateTable} onChange={(e) => setRuleForm({...ruleForm, rateTable: e.target.value})} placeholder='{"employeeShare": 12, "employerShare": 12}' className="w-full p-2.5 bg-bg-base border border-white/10 rounded-lg text-text-primary font-mono text-xs focus:border-primary-500 outline-none transition-all resize-none h-32" />
              </div>
              <button type="submit" className="w-full py-2.5 bg-primary-600 hover:bg-primary-500 text-white font-bold rounded-lg transition-colors shadow-premium-glow">
                Save Rule
              </button>
            </form>
          </div>

          <div className="glass-panel p-6 rounded-2xl lg:col-span-2">
            <h2 className="text-xl font-bold text-text-primary mb-4 flex items-center gap-2">
              <FileText size={20} className="text-primary-500" /> Active Configurations
            </h2>
            <div className="space-y-4">
              {complianceRules.length === 0 ? (
                <div className="text-center p-8 border border-dashed border-white/10 rounded-xl text-text-muted">
                  No compliance rules mapped yet.
                </div>
              ) : (
                complianceRules.map(rule => (
                  <div key={rule.id} className="p-4 bg-bg-base border border-white/5 rounded-xl hover-float">
                    <div className="flex justify-between items-center mb-3">
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-lg text-text-primary">{rule.state}</span>
                        <span className="text-xs font-bold bg-primary-900/40 text-primary-400 px-2.5 py-1 rounded-full">{rule.ruleType}</span>
                      </div>
                      <span className="text-xs text-text-muted">Since {new Date(rule.effectiveFrom).toLocaleDateString()}</span>
                    </div>
                    <div className="bg-black/20 rounded-lg p-3 overflow-x-auto">
                      <pre className="text-xs text-primary-200 m-0">
                        {JSON.stringify(rule.rateTable, null, 2)}
                      </pre>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default TenantSettings;
