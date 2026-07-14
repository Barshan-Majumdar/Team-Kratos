import React, { useState } from 'react';
import { UserPlus, Copy, Check } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';

const CreateEmployee = () => {
  const [formData, setFormData] = useState({
    email: '',
    displayName: '',
    role: 'Employee',
    department: '',
    phone: '',
    jobPosition: '',
    gender: 'Male',
    location: '',
    workingDaysPerWeek: 5,
    breakTimeHrs: 1.0
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successData, setSuccessData] = useState(null);
  const [copied, setCopied] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessData(null);
    setCopied(false);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create employee');
      }

      setSuccessData(data);
      setFormData({ 
        email: '', displayName: '', role: 'Employee', department: '', 
        phone: '', jobPosition: '', gender: 'Male', location: '', 
        workingDaysPerWeek: 5, breakTimeHrs: 1.0 
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    const textToCopy = `Email: ${successData.user.email}\nPassword: ${successData.generatedPassword}\nEmployee ID: ${successData.user.employeeId}`;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-text-primary">Add New Employee</h2>
        <p className="text-text-secondary text-sm mt-1">Create an account for a new team member. A secure password will be auto-generated.</p>
      </div>

      <Card className="p-6 sm:p-8 !rounded-[24px]">
        {error && (
          <div className="mb-6 p-4 bg-danger/10 text-danger text-sm rounded-lg border border-danger/20 flex items-start gap-2">
            <span className="font-semibold">Error:</span> {error}
          </div>
        )}

        {successData && (
          <div className="mb-6 p-5 bg-success/10 rounded-xl border border-success/20">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-success font-semibold text-lg flex items-center gap-2">
                  <Check size={20} />
                  Employee Created Successfully
                </h3>
                <p className="text-success/80 text-sm mt-1">Please securely share these credentials with the employee.</p>
              </div>
              <button 
                onClick={handleCopy}
                className="p-2 bg-success/20 hover:bg-success/30 text-success rounded-md transition-colors flex items-center gap-1 text-sm font-medium"
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
            
            <div className="bg-surface-glass p-4 rounded-lg border border-success/20 font-mono text-sm text-text-primary space-y-2">
              <div className="flex"><span className="w-24 text-text-secondary">EMP ID:</span> <span className="font-semibold">{successData.user.employeeId}</span></div>
              <div className="flex"><span className="w-24 text-text-secondary">Email:</span> <span className="font-semibold">{successData.user.email}</span></div>
              <div className="flex"><span className="w-24 text-text-secondary">Password:</span> <span className="font-semibold">{successData.generatedPassword}</span></div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 gap-y-6">
            {/* Primary Details */}
            <div className="md:col-span-2 lg:col-span-1">
              <label className="block text-sm font-medium text-text-secondary mb-1.5">Full Name</label>
              <Input 
                type="text" name="displayName" value={formData.displayName} onChange={handleChange}
                placeholder="John Doe" required
              />
            </div>
            
            <div className="md:col-span-2 lg:col-span-1">
              <label className="block text-sm font-medium text-text-secondary mb-1.5">Email Address</label>
              <Input 
                type="email" name="email" value={formData.email} onChange={handleChange}
                placeholder="john.doe@company.com" required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">Phone Number</label>
              <Input 
                type="tel" name="phone" value={formData.phone} onChange={handleChange}
                placeholder="+1 234 567 890" required
              />
            </div>

            {/* Employment Details */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">Department</label>
              <Input 
                type="text" name="department" value={formData.department} onChange={handleChange}
                placeholder="Engineering" required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">Job Position</label>
              <Input 
                type="text" name="jobPosition" value={formData.jobPosition} onChange={handleChange}
                placeholder="Senior Developer" required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">Work Location</label>
              <Input 
                type="text" name="location" value={formData.location} onChange={handleChange}
                placeholder="New York HQ / Remote" required
              />
            </div>

            {/* Additional Specs */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">Working Days per Week</label>
              <Input 
                type="number" min="1" max="7" name="workingDaysPerWeek" value={formData.workingDaysPerWeek} onChange={handleChange}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">Daily Break Time (Hrs)</label>
              <Input 
                type="number" step="0.5" min="0" max="4" name="breakTimeHrs" value={formData.breakTimeHrs} onChange={handleChange}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">Gender</label>
              <select 
                name="gender" value={formData.gender} onChange={handleChange}
                className="flex h-10 w-full rounded-[var(--radius-md)] border border-border-default bg-surface-glass-solid px-3 py-2 text-sm text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="md:col-span-2 lg:col-span-3">
              <label className="block text-sm font-medium text-text-secondary mb-1.5">System Role & Access</label>
              <select 
                name="role" value={formData.role} onChange={handleChange}
                className="flex h-10 w-full rounded-[var(--radius-md)] border border-border-default bg-surface-glass-solid px-3 py-2 text-sm text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="Employee">Employee (Dashboard, Attendance, Leave Requests)</option>
                <option value="Admin">Admin (Full System Access & Payroll)</option>
              </select>
            </div>
          </div>
          
          <div className="pt-6 border-t border-border-subtle mt-2 flex justify-end">
            <Button type="submit" disabled={loading} className="gap-2">
              <UserPlus size={18} />
              {loading ? 'Creating...' : 'Create Account'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default CreateEmployee;

