import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { KeyRound, ShieldCheck, AlertCircle, ArrowRight, Loader2 } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

export default function SetPasswordFromInvite() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();

  const [verifying, setVerifying] = useState(true);
  const [invitedUser, setInvitedUser] = useState(null);
  const [verifyError, setVerifyError] = useState('');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function verifyToken() {
      if (!token) {
        setVerifyError('Missing invitation token in URL. Please check your welcome email link.');
        setVerifying(false);
        return;
      }

      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/users/verify-invite-token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Invalid or expired invitation token');

        setInvitedUser(data.user);
      } catch (err) {
        setVerifyError(err.message);
      } finally {
        setVerifying(false);
      }
    }

    verifyToken();
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');

    if (newPassword.length < 8) {
      return setSubmitError('Password must be at least 8 characters long.');
    }
    if (newPassword !== confirmPassword) {
      return setSubmitError('Passwords do not match.');
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/users/set-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to set password');

      // Store authentication token & user session
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      setSuccess(true);
      setTimeout(() => {
        navigate('/face-registration');
      }, 1500);
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (verifying) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-900 text-white">
        <Card className="p-8 max-w-md w-full bg-slate-800 border border-slate-700 flex flex-col items-center gap-4 text-center">
          <Loader2 className="animate-spin text-indigo-400" size={36} />
          <h2 className="text-xl font-bold">Verifying Onboarding Invitation...</h2>
          <p className="text-xs text-slate-400">Validating your secure setup link</p>
        </Card>
      </div>
    );
  }

  if (verifyError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-950 text-white">
        <Card className="p-8 max-w-md w-full bg-slate-900 border border-slate-800 flex flex-col items-center gap-4 text-center">
          <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
            <AlertCircle size={30} />
          </div>
          <h2 className="text-xl font-bold text-white">Invitation Expired or Invalid</h2>
          <p className="text-xs text-slate-400 leading-relaxed">{verifyError}</p>
          <Button 
            onClick={() => navigate('/login')}
            className="w-full mt-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold"
          >
            Go to Login
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-950 text-white">
      <Card className="p-8 max-w-md w-full bg-slate-900 border border-slate-800 shadow-2xl rounded-3xl">
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-indigo-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-indigo-500/20 text-indigo-400">
            <ShieldCheck size={32} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Welcome, {invitedUser?.displayName || 'User'}!</h1>
          <p className="text-xs text-slate-400 mt-1">
            Setting up account as <strong className="text-indigo-300">{invitedUser?.customRole || 'Team Member'}</strong> ({invitedUser?.email})
          </p>
        </div>

        {submitError && (
          <div className="mb-4 p-3 bg-rose-500/10 text-rose-400 text-xs rounded-xl border border-rose-500/20 font-medium">
            {submitError}
          </div>
        )}

        {success ? (
          <div className="text-center p-6 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 text-emerald-400">
            <h3 className="font-bold text-base mb-1">Password Successfully Set!</h3>
            <p className="text-xs text-emerald-300">Redirecting to mandatory Face Registration...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">New Password</label>
              <Input
                type="password"
                placeholder="At least 8 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Confirm Password</label>
              <Input
                type="password"
                placeholder="Re-enter new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>

            <Button
              type="submit"
              disabled={submitting}
              className="w-full mt-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-2xl flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  Saving Password...
                </>
              ) : (
                <>
                  Set Password & Register Face
                  <ArrowRight size={18} />
                </>
              )}
            </Button>
          </form>
        )}
      </Card>
    </div>
  );
}
