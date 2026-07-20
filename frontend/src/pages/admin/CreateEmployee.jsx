import React, { useState, useEffect } from 'react';
import { UserPlus, Copy, Check, Shield, ChevronDown, AlertCircle, Info } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// System Role → numeric level mapping (mirrors backend)
const SYSTEM_ROLE_TO_LEVEL = { CEO: 0, SuperAdmin: 0, Admin: 1, Manager: 2, Employee: 3 };

// Get the level badge color based on role level
const getLevelColor = (level) => {
  if (level === 0) return 'bg-purple-100 text-purple-700 border-purple-200';
  if (level === 1) return 'bg-indigo-100 text-indigo-700 border-indigo-200';
  if (level === 2) return 'bg-blue-100 text-blue-700 border-blue-200';
  return 'bg-slate-100 text-slate-600 border-slate-200';
};

const CreateEmployee = () => {
  const [formData, setFormData] = useState({
    email: '',
    displayName: '',
    customRole: '',
    department: '',
    phone: '',
    jobPosition: '',
    gender: 'Male',
    location: '',
    entityId: '',
    workingDaysPerWeek: 5,
    breakTimeHrs: 1.0
  });

  const [legalEntities, setLegalEntities] = useState([]);
  const [tenantRoles, setTenantRoles] = useState([]);   // All roles from chairman's config
  const [assignableRoles, setAssignableRoles] = useState([]); // Roles the current user can assign
  const [rolesLoading, setRolesLoading] = useState(true);
  const [rolesError, setRolesError] = useState('');
  const [departments, setDepartments] = useState([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successData, setSuccessData] = useState(null);
  const [copied, setCopied] = useState(false);

  // Decode the logged-in user's info from the JWT
  const getLoggedInUser = () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return null;
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload;
    } catch { return null; }
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    const headers = { 'Authorization': `Bearer ${token}` };

    // Fetch legal entities and tenant roles in parallel
    Promise.all([
      fetch(`${API_BASE}/api/tenant-settings/legal-entities`, { headers }).then(r => r.ok ? r.json() : []),
      fetch(`${API_BASE}/api/tenant-settings/roles`, { headers }).then(r => r.ok ? r.json() : null)
    ]).then(([entities, rolesData]) => {
      setLegalEntities(entities || []);

      if (!rolesData || !Array.isArray(rolesData.customRoles)) {
        setRolesError('No role hierarchy found. Please ask the company owner to configure roles in the registration.');
        setRolesLoading(false);
        return;
      }

      const allRoles = rolesData.customRoles;
      setTenantRoles(allRoles);
      setDepartments(rolesData.departments || []);

      // Determine which roles the current user can assign
      const loggedInUser = getLoggedInUser();
      if (!loggedInUser) {
        setRolesError('Unable to determine your authorization level.');
        setRolesLoading(false);
        return;
      }

      // Try to find the inviter's level via their stored customRole first,
      // falling back to system role level
      const userCustomRole = loggedInUser.customRole; // Now read from JWT
      const systemRole = loggedInUser.role;
      let inviterLevel = SYSTEM_ROLE_TO_LEVEL[systemRole] ?? 99;

      if (userCustomRole) {
        const roleDef = allRoles.find(r => r.name.toLowerCase() === userCustomRole.toLowerCase());
        if (roleDef) inviterLevel = roleDef.level;
      }

      // Filter: strictly show only roles BELOW the inviter's level
      // This means a CEO (L0) can only assign L1+, Admin (L1) can only assign L2+, etc.
      let allowed = allRoles.filter(r => r.level > inviterLevel);

      setAssignableRoles(allowed);

      // Pre-select the lowest assignable role
      if (allowed.length > 0) {
        // Sort by level descending (highest level number = lowest hierarchy = safest default)
        const sorted = [...allowed].sort((a, b) => b.level - a.level);
        setFormData(prev => ({ ...prev, customRole: sorted[0].name }));
      }

      setRolesLoading(false);
    }).catch(err => {
      console.error('Failed to load tenant configuration:', err);
      setRolesError('Failed to load role configuration. Please refresh the page.');
      setRolesLoading(false);
    });
  }, []);

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
      const res = await fetch(`${API_BASE}/api/users`, {
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
      setFormData(prev => ({ 
        ...prev,
        email: '', displayName: '', department: '', 
        phone: '', jobPosition: '', gender: 'Male', location: '', entityId: '',
        workingDaysPerWeek: 5, breakTimeHrs: 1.0 
        // Keep customRole so subsequent additions keep the same role
      }));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    const textToCopy = `Email: ${successData.user.email}\nEmployee ID: ${successData.user.employeeId}`;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const selectedRoleDef = tenantRoles.find(r => r.name === formData.customRole);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-text-primary">Add New Employee</h2>
        <p className="text-text-secondary text-sm mt-1">Create an account for a new team member. Roles are defined by your company's organizational structure.</p>
      </div>

      <Card className="p-6 sm:p-8 !rounded-[24px]">
        {error && (
          <div className="mb-6 p-4 bg-danger/10 text-danger text-sm rounded-lg border border-danger/20 flex items-start gap-2">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <div><span className="font-semibold">Error: </span>{error}</div>
          </div>
        )}

        {successData && (
          <div className="mb-6 p-5 bg-success/10 rounded-xl border border-success/20">
            <div className="flex items-center gap-3">
              <div className="bg-success/20 p-2 rounded-full text-success">
                <Check size={24} />
              </div>
              <div className="flex-1">
                <h3 className="text-success font-bold text-lg">Employee Created Successfully!</h3>
                <p className="text-success/80 text-sm mt-1 font-medium">
                  Login credentials have been securely sent to the employee's email.
                </p>
                <div className="mt-3 flex items-center gap-3">
                  <div className="text-sm font-mono bg-success/10 px-3 py-1.5 rounded-lg text-success/90">
                    {successData.user?.email} · {successData.user?.employeeId}
                  </div>
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 text-xs text-success/70 hover:text-success font-medium transition-colors"
                  >
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Roles Loading State */}
        {rolesLoading && (
          <div className="mb-6 p-4 bg-accent-primary/5 rounded-xl border border-accent-primary/20 flex items-center gap-3">
            <div className="w-5 h-5 border-2 border-accent-primary border-t-transparent rounded-full animate-spin shrink-0" />
            <span className="text-sm text-text-secondary">Loading your company's role hierarchy...</span>
          </div>
        )}

        {/* Roles Error State */}
        {rolesError && !rolesLoading && (
          <div className="mb-6 p-4 bg-warning/10 rounded-xl border border-warning/20 flex items-start gap-3">
            <AlertCircle size={16} className="shrink-0 mt-0.5 text-warning" />
            <div>
              <p className="text-sm font-semibold text-warning">Role Configuration Missing</p>
              <p className="text-xs text-text-secondary mt-0.5">{rolesError}</p>
            </div>
          </div>
        )}

        {/* Assignable Roles Info Banner */}
        {!rolesLoading && !rolesError && assignableRoles.length > 0 && (
          <div className="mb-6 p-4 bg-accent-primary/5 rounded-xl border border-accent-primary/15 flex items-start gap-3">
            <Info size={16} className="shrink-0 mt-0.5 text-accent-primary" />
            <div>
              <p className="text-sm font-semibold text-accent-primary">Company-Defined Roles</p>
              <p className="text-xs text-text-secondary mt-0.5">
                You can assign the following roles as configured by your company owner:{' '}
                <span className="font-medium text-text-primary">
                  {assignableRoles.map(r => r.name).join(', ')}
                </span>
              </p>
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
                placeholder="+91 98765 43210" required
              />
            </div>

            {/* Employment Details */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">Department</label>
              {departments.length > 0 ? (
                <select
                  name="department" value={formData.department} onChange={handleChange}
                  className="flex h-10 w-full rounded-[var(--radius-md)] border border-border-default bg-surface-glass-solid px-3 py-2 text-sm text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
                >
                  <option value="">Select Department...</option>
                  {departments.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              ) : (
                <Input 
                  type="text" name="department" value={formData.department} onChange={handleChange}
                  placeholder="Engineering" required
                />
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">Job Position / Title</label>
              <Input 
                type="text" name="jobPosition" value={formData.jobPosition} onChange={handleChange}
                placeholder="Senior Developer" required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">Work Location</label>
              <Input 
                type="text" name="location" value={formData.location} onChange={handleChange}
                placeholder="Mumbai HQ / Remote" required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">Legal Entity / Company</label>
              <select 
                name="entityId" value={formData.entityId} onChange={handleChange}
                className="flex h-10 w-full rounded-[var(--radius-md)] border border-border-default bg-surface-glass-solid px-3 py-2 text-sm text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
              >
                <option value="">Unassigned (Default)</option>
                {legalEntities.map(entity => (
                  <option key={entity.id} value={entity.id}>{entity.name}</option>
                ))}
              </select>
            </div>

            {/* Additional Specs */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">Working Days / Week</label>
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
                className="flex h-10 w-full rounded-[var(--radius-md)] border border-border-default bg-surface-glass-solid px-3 py-2 text-sm text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* ── Company Role Assignment ── */}
            <div className="md:col-span-2 lg:col-span-3">
              <label className="block text-sm font-medium text-text-secondary mb-1.5">
                <Shield size={14} className="inline mr-1.5 opacity-70" />
                Organizational Role & Access Level
              </label>

              {rolesLoading ? (
                <div className="h-10 rounded-[var(--radius-md)] border border-border-default bg-surface-glass-solid animate-pulse" />
              ) : assignableRoles.length === 0 ? (
                <div className="h-10 rounded-[var(--radius-md)] border border-warning/40 bg-warning/5 px-3 flex items-center text-sm text-text-secondary">
                  {rolesError || 'No assignable roles available for your permission level.'}
                </div>
              ) : (
                <>
                  <select 
                    name="customRole" value={formData.customRole} onChange={handleChange}
                    required
                    className="flex h-10 w-full rounded-[var(--radius-md)] border border-border-default bg-surface-glass-solid px-3 py-2 text-sm text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
                  >
                    <option value="">Select a role...</option>
                    {assignableRoles.map(role => (
                      <option key={role.name} value={role.name}>
                        {role.name} — Level {role.level} · {role.description}
                      </option>
                    ))}
                  </select>

                  {/* Show selected role info card */}
                  {selectedRoleDef && (
                    <div className={`mt-2 px-3 py-2 rounded-lg border text-xs flex items-center gap-2 ${getLevelColor(selectedRoleDef.level)}`}>
                      <span className="font-bold">L{selectedRoleDef.level}</span>
                      <span className="font-semibold">{selectedRoleDef.name}</span>
                      <span className="opacity-70">·</span>
                      <span className="opacity-80">{selectedRoleDef.description}</span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
          
          <div className="pt-6 border-t border-border-subtle mt-2 flex justify-end">
            <Button 
              type="submit" 
              disabled={loading || rolesLoading || assignableRoles.length === 0} 
              className="gap-2"
            >
              <UserPlus size={18} />
              {loading ? 'Creating...' : 'Create Employee Account'}
            </Button>
          </div>
        </form>
      </Card>

      {/* Tenant Role Hierarchy Viewer */}
      {!rolesLoading && tenantRoles.length > 0 && (
        <div className="mt-6">
          <Card className="p-5 !rounded-[20px] border border-border-subtle">
            <h3 className="text-sm font-bold text-text-primary mb-4 flex items-center gap-2">
              <Shield size={16} className="text-accent-primary" />
              Your Company's Role Hierarchy
              <span className="text-xs font-normal text-text-secondary ml-1">(set by company owner during registration)</span>
            </h3>
            <div className="flex flex-wrap gap-2">
              {[...tenantRoles].sort((a, b) => a.level - b.level).map(role => (
                <div
                  key={role.name}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium ${getLevelColor(role.level)}`}
                >
                  <span className="font-bold">L{role.level}</span>
                  <span>{role.name}</span>
                  {role.locked && <span className="opacity-50 text-[10px]">🔒</span>}
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default CreateEmployee;
