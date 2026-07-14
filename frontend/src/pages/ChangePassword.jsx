import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { KeyRound } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

const ChangePassword = () => {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      return setError('New passwords do not match');
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No authentication token found');

      const res = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ oldPassword, newPassword })
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to change password');
      }

      setSuccess(true);

      // Update localStorage so ProtectedRoute knows password was changed
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        user.mustChangePassword = false;
        localStorage.setItem('user', JSON.stringify(user));
      }

      setTimeout(() => navigate('/dashboard'), 2000);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="flex flex-col justify-center flex-grow py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md mx-auto">
        <Card className="p-8 sm:p-10">
          <div className="text-center mb-8">
            <div className="w-14 h-14 bg-warning/10 rounded-xl flex items-center justify-center mx-auto mb-4 border border-warning/20 shadow-sm">
              <KeyRound className="text-warning" size={28} />
            </div>
            <h1 className="text-2xl font-bold text-text-primary tracking-tight">Security Required</h1>
            <p className="text-text-secondary mt-2 text-sm">You must change your default password before accessing your dashboard.</p>
          </div>
          
          {error && (
            <div className="mb-6 p-3 bg-danger/10 text-danger text-sm rounded-lg border border-danger/20 font-medium text-center">
              {error}
            </div>
          )}

          {success ? (
            <div className="text-center p-6 bg-success/10 rounded-lg border border-success/20">
              <h3 className="text-success font-semibold mb-2">Password Updated!</h3>
              <p className="text-success/80 text-sm">Redirecting to dashboard...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Current Password</label>
                <Input
                  type="password"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">New Password</label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Confirm New Password</label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
              
              <Button
                type="submit"
                className="w-full mt-3"
              >
                Update Password
              </Button>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
};

export default ChangePassword;

