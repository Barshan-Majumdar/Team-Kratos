import React, { useState, useEffect } from 'react';
import { Terminal, Key, Webhook, Plus, Trash2, ShieldAlert } from 'lucide-react';
import { API_BASE } from '../../lib/api';
import Alert from '../../components/ui/Alert';

const DeveloperSettings = () => {
  const [activeTab, setActiveTab] = useState('apikeys');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // API Keys
  const [apiKeys, setApiKeys] = useState([]);
  const [newKeyName, setNewKeyName] = useState('');
  const [revealedKey, setRevealedKey] = useState(null);

  // Webhooks
  const [webhooks, setWebhooks] = useState([]);
  const [webhookForm, setWebhookForm] = useState({ eventType: 'user.created', targetUrl: '' });

  const fetchKeys = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/developer-settings/api-keys`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (!res.ok) throw new Error('Failed to fetch API keys');
      setApiKeys(await res.json());
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  const fetchWebhooks = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/developer-settings/webhooks`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (!res.ok) throw new Error('Failed to fetch webhooks');
      setWebhooks(await res.json());
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchKeys(), fetchWebhooks()]).finally(() => setLoading(false));
  }, []);

  const handleCreateKey = async (e) => {
    e.preventDefault();
    setErrorMsg(''); setSuccessMsg(''); setRevealedKey(null);
    try {
      const res = await fetch(`${API_BASE}/api/developer-settings/api-keys`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ name: newKeyName })
      });
      if (!res.ok) throw new Error('Failed to create API key');
      const data = await res.json();
      setRevealedKey(data.rawKey);
      setNewKeyName('');
      fetchKeys();
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  const handleRevokeKey = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/api/developer-settings/api-keys/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (!res.ok) throw new Error('Failed to revoke API key');
      fetchKeys();
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  const handleCreateWebhook = async (e) => {
    e.preventDefault();
    setErrorMsg(''); setSuccessMsg('');
    try {
      const res = await fetch(`${API_BASE}/api/developer-settings/webhooks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(webhookForm)
      });
      if (!res.ok) throw new Error('Failed to create webhook');
      setSuccessMsg('Webhook created successfully');
      setWebhookForm({ eventType: 'user.created', targetUrl: '' });
      fetchWebhooks();
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  const handleDeleteWebhook = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/api/developer-settings/webhooks/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (!res.ok) throw new Error('Failed to delete webhook');
      fetchWebhooks();
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6 md:space-y-8 animate-in fade-in zoom-in-95 duration-300">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary-400 to-primary-600 flex items-center gap-3">
          <Terminal size={32} className="text-primary-500" /> Developer Console
        </h1>
        <p className="text-text-muted text-sm md:text-base">
          Manage API keys and Webhook subscriptions for external integrations.
        </p>
      </div>

      {errorMsg && <Alert type="error" message={errorMsg} />}
      {successMsg && <Alert type="success" message={successMsg} />}

      <div className="flex border-b border-white/10 gap-4 mb-6">
        <button
          onClick={() => setActiveTab('apikeys')}
          className={`pb-3 px-2 flex items-center gap-2 font-semibold transition-colors border-b-2 ${
            activeTab === 'apikeys' 
              ? 'border-primary-500 text-primary-500' 
              : 'border-transparent text-text-muted hover:text-text-primary'
          }`}
        >
          <Key size={18} /> API Keys
        </button>
        <button
          onClick={() => setActiveTab('webhooks')}
          className={`pb-3 px-2 flex items-center gap-2 font-semibold transition-colors border-b-2 ${
            activeTab === 'webhooks' 
              ? 'border-primary-500 text-primary-500' 
              : 'border-transparent text-text-muted hover:text-text-primary'
          }`}
        >
          <Webhook size={18} /> Webhooks
        </button>
      </div>

      {activeTab === 'apikeys' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="glass-panel p-6 rounded-2xl lg:col-span-1 h-fit border border-primary-500/30">
            <h2 className="text-xl font-bold text-text-primary mb-4 flex items-center gap-2">
              <Plus size={20} className="text-primary-500" /> Generate New Key
            </h2>
            <form onSubmit={handleCreateKey} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-text-muted mb-1">Key Description</label>
                <input required type="text" value={newKeyName} onChange={(e) => setNewKeyName(e.target.value)} placeholder="e.g. Zapier Integration" className="w-full p-2.5 bg-bg-base border border-white/10 rounded-lg text-text-primary focus:border-primary-500 outline-none transition-all" />
              </div>
              <button type="submit" className="w-full py-2.5 bg-primary-600 hover:bg-primary-500 text-white font-bold rounded-lg transition-colors shadow-premium-glow">
                Generate Key
              </button>
            </form>

            {revealedKey && (
              <div className="mt-6 p-4 bg-emerald-900/20 border border-emerald-500/30 rounded-xl animate-in zoom-in-95">
                <div className="flex items-center gap-2 mb-2 text-emerald-400 font-bold">
                  <ShieldAlert size={16} /> Copy This Key Now
                </div>
                <p className="text-xs text-text-muted mb-3">You will not be able to see it again.</p>
                <div className="p-3 bg-black/40 rounded-lg text-emerald-300 font-mono text-sm break-all select-all">
                  {revealedKey}
                </div>
              </div>
            )}
          </div>

          <div className="glass-panel p-6 rounded-2xl lg:col-span-2">
            <h2 className="text-xl font-bold text-text-primary mb-4 flex items-center gap-2">
              <Key size={20} className="text-primary-500" /> Active API Keys
            </h2>
            <div className="space-y-4">
              {apiKeys.length === 0 ? (
                <div className="text-center p-8 border border-dashed border-white/10 rounded-xl text-text-muted">
                  No active API keys found.
                </div>
              ) : (
                apiKeys.map(key => (
                  <div key={key.id} className="p-4 bg-bg-base border border-white/5 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover-float">
                    <div>
                      <h3 className="font-bold text-lg text-text-primary">{key.name}</h3>
                      <p className="text-xs text-text-muted mt-1 font-mono">{key.keyPrefix}••••••••••••••••••••••••••••••••••••</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-xs text-text-muted">
                        Created {new Date(key.createdAt).toLocaleDateString('en-IN')}
                      </span>
                      <button onClick={() => handleRevokeKey(key.id)} className="p-2 text-danger/70 hover:text-danger hover:bg-danger/10 rounded-lg transition-colors" title="Revoke Key">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'webhooks' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="glass-panel p-6 rounded-2xl lg:col-span-1 h-fit border border-primary-500/30">
            <h2 className="text-xl font-bold text-text-primary mb-4 flex items-center gap-2">
              <Plus size={20} className="text-primary-500" /> New Webhook
            </h2>
            <form onSubmit={handleCreateWebhook} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-text-muted mb-1">Event Type</label>
                <select value={webhookForm.eventType} onChange={(e) => setWebhookForm({...webhookForm, eventType: e.target.value})} className="w-full p-2.5 bg-bg-base border border-white/10 rounded-lg text-text-primary focus:border-primary-500 outline-none transition-all">
                  <option value="user.created">Employee Onboarded</option>
                  <option value="attendance.checkin">Attendance Check-In</option>
                  <option value="payroll.generated">Payroll Generated</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-text-muted mb-1">Target URL</label>
                <input required type="url" value={webhookForm.targetUrl} onChange={(e) => setWebhookForm({...webhookForm, targetUrl: e.target.value})} placeholder="https://api.yourdomain.com/webhook" className="w-full p-2.5 bg-bg-base border border-white/10 rounded-lg text-text-primary focus:border-primary-500 outline-none transition-all" />
              </div>
              <button type="submit" className="w-full py-2.5 bg-primary-600 hover:bg-primary-500 text-white font-bold rounded-lg transition-colors shadow-premium-glow">
                Subscribe
              </button>
            </form>
          </div>

          <div className="glass-panel p-6 rounded-2xl lg:col-span-2">
            <h2 className="text-xl font-bold text-text-primary mb-4 flex items-center gap-2">
              <Webhook size={20} className="text-primary-500" /> Active Subscriptions
            </h2>
            <div className="space-y-4">
              {webhooks.length === 0 ? (
                <div className="text-center p-8 border border-dashed border-white/10 rounded-xl text-text-muted">
                  No active webhooks configured.
                </div>
              ) : (
                webhooks.map(hook => (
                  <div key={hook.id} className="p-4 bg-bg-base border border-white/5 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover-float">
                    <div className="flex-1 min-w-0">
                      <span className="inline-block px-2.5 py-1 bg-indigo-900/40 text-indigo-400 font-bold text-xs rounded-md border border-indigo-500/20 mb-2">
                        {hook.eventType}
                      </span>
                      <p className="text-sm text-text-secondary truncate font-mono">{hook.targetUrl}</p>
                    </div>
                    <button onClick={() => handleDeleteWebhook(hook.id)} className="p-2 text-danger/70 hover:text-danger hover:bg-danger/10 rounded-lg transition-colors shrink-0" title="Delete Webhook">
                      <Trash2 size={18} />
                    </button>
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

export default DeveloperSettings;
