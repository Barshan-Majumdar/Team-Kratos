import React, { useState, useEffect } from 'react';
import { Mail, Plus, Trash2, Send } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';

const InviteEmployee = () => {
  const [emails, setEmails] = useState([]);
  const [newEmail, setNewEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchEmails = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/users/invited-emails`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setEmails(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmails();
  }, []);

  const handleInvite = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/users/invited-emails`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ email: newEmail })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setNewEmail('');
      fetchEmails();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleRemove = async (emailToRemove) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/users/invited-emails/${emailToRemove}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      fetchEmails();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <Card className="p-4 sm:p-6 md:p-8 max-w-3xl !rounded-[24px]">
      <div className="flex items-start sm:items-center gap-3 sm:gap-4 mb-6 sm:mb-8 border-b border-border-subtle pb-4 sm:pb-6">
        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-accent-primary/10 rounded-lg sm:rounded-xl flex items-center justify-center text-accent-primary shrink-0 mt-1 sm:mt-0">
          <Mail size={20} className="sm:w-6 sm:h-6" />
        </div>
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-text-primary">Invite Employees</h2>
          <p className="text-xs sm:text-sm text-text-secondary mt-1 max-w-lg">Provide an email address. They will be required to fill out their own details during Sign Up.</p>
        </div>
      </div>

      <form onSubmit={handleInvite} className="flex flex-col sm:flex-row gap-3 mb-8 sm:mb-10">
        <div className="flex-1 min-w-0">
          <Input
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            placeholder="Enter employee's email address..."
            required
            className="w-full text-sm sm:text-base py-2.5 sm:py-3"
          />
          {error && <p className="text-danger text-xs mt-1.5">{error}</p>}
        </div>
        <Button
          type="submit"
          className="gap-2 shrink-0 w-full sm:w-auto justify-center py-2.5 sm:py-3"
        >
          <Send size={18} /> Send Invite
        </Button>
      </form>

      <div>
        <h3 className="font-bold text-text-primary mb-4 text-base sm:text-lg">Pending Invitations</h3>
        {loading ? (
          <div className="py-8 text-center text-sm text-text-secondary">Loading invitations...</div>
        ) : (
          <ul className="divide-y divide-border-subtle border border-border-default rounded-xl bg-slate-50/30 overflow-hidden">
            {emails.length === 0 ? (
              <li className="p-6 text-center text-sm text-text-secondary">
                No pending invitations. <br className="sm:hidden" />
                <span className="text-xs sm:text-sm block sm:inline mt-1 sm:mt-0">When invited employees sign up, they are removed from this list.</span>
              </li>
            ) : (
              emails.map((item) => (
                <li key={item.id} className="p-3 sm:p-4 flex items-center justify-between hover:bg-white transition-colors bg-white/50">
                  <span className="text-sm font-medium text-slate-700 truncate pr-4">{item.email}</span>
                  <button
                    onClick={() => handleRemove(item.email)}
                    className="text-danger hover:text-danger/90 p-2 hover:bg-danger/10 rounded-lg transition-colors shrink-0"
                    title="Revoke Invite"
                  >
                    <Trash2 size={18} />
                  </button>
                </li>
              ))
            )}
          </ul>
        )}
      </div>
    </Card>
  );
};

export default InviteEmployee;

