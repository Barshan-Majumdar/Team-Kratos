import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useNavigate, Navigate } from 'react-router-dom';
import { Users, Plus, Cpu, FileText, FlaskConical } from 'lucide-react';
import CreateEmployee from './admin/CreateEmployee';
import ManageAdmins from './admin/ManageAdmins';
import LeaveApprovals from './admin/LeaveApprovals';
import AuditLogs from './admin/AuditLogs';
import TenantSettings from './admin/TenantSettings';
import DeveloperSettings from './admin/DeveloperSettings';
import DataImport from './admin/DataImport';
import OrgChart from './OrgChart';
import Helpdesk from './Helpdesk';
import { MyProfile } from './MyProfile';
import InviteEmployee from './admin/InviteEmployee';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { SegmentedControl } from '../components/ui/SegmentedControl';
import ShellLayout from '../components/layout/ShellLayout';
import EmployeeDetails from './admin/EmployeeDetails';
import Attendance from './Attendance';
import TimeOff from './TimeOff';
import Payroll from './Payroll';
import EmployeeDashboard from './EmployeeDashboard';

// ── Employee Cards View (Marketplace-style grid) ───────

const EmployeeCards = ({ user }) => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const isAdmin = user?.role === 'Admin';
  const navigate = useNavigate();

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/users`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setEmployees(data);
        }
      } catch (err) {
        console.error('Failed to fetch employees:', err);
      } finally {
        setLoading(false);
      }
    };

    if (isAdmin) {
      fetchEmployees();
    } else {
      setLoading(false);
    }
  }, [isAdmin]);

  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = (emp.displayName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (emp.employeeId || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (emp.department || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });

  if (!isAdmin) {
    return <EmployeeDashboard user={user} />;
  }

  return (
    <div className="p-4 md:p-8 lg:p-12 relative h-full flex flex-col">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <h1 className="text-4xl font-bold text-slate-800 tracking-tight">Employees</h1>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full sm:w-auto">
          <div className="w-full sm:w-64">
            <Input
              type="text"
              placeholder="Search directory..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="rounded-full bg-slate-50 border-slate-200"
            />
          </div>
          <Button variant="primary" onClick={() => navigate('/dashboard/add-employee')} className="rounded-full gap-2 justify-center w-full sm:w-auto">
            <Plus size={18} /> New Listing
          </Button>
        </div>
      </div>

      {/* Removed Segmented Toggle */}

      {/* Card Grid */}
      <div className="flex-1 overflow-y-auto pb-8 custom-scrollbar">
        {loading ? (
          <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden animate-pulse">
            <div className="w-full">
              <div className="bg-slate-50/50 border-b border-slate-200/60 py-4 px-6 flex items-center justify-between">
                 <div className="h-4 bg-slate-200 rounded w-24"></div>
                 <div className="h-4 bg-slate-200 rounded w-24 hidden md:block"></div>
                 <div className="h-4 bg-slate-200 rounded w-24 hidden md:block"></div>
                 <div className="h-4 bg-slate-200 rounded w-16"></div>
                 <div className="h-4 bg-slate-200 rounded w-20"></div>
              </div>
              <div className="divide-y divide-slate-100">
                {[1, 2, 3, 4, 5, 6].map(i => (
                  <div key={i} className="py-4 px-6 flex items-center justify-between">
                    <div className="flex items-center gap-3 w-1/3">
                      <div className="w-10 h-10 rounded-full bg-slate-200 shrink-0"></div>
                      <div className="w-full max-w-[140px] space-y-2">
                         <div className="h-4 bg-slate-200 rounded w-full"></div>
                         <div className="h-3 bg-slate-100 rounded w-2/3"></div>
                      </div>
                    </div>
                    <div className="h-4 bg-slate-200 rounded w-20 hidden md:block"></div>
                    <div className="h-4 bg-slate-200 rounded w-24 hidden md:block"></div>
                    <div className="h-6 bg-slate-200 rounded-full w-16"></div>
                    <div className="h-4 bg-slate-200 rounded w-20 text-right"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : filteredEmployees.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-slate-500 text-lg">No employees found in this view.</p>
          </div>
        ) : (
          <div className="bg-transparent md:bg-white md:rounded-2xl md:border md:border-slate-200/60 md:shadow-sm overflow-hidden">
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto custom-scrollbar bg-white rounded-2xl border border-slate-200/60 shadow-sm">
              <table className="w-full text-left min-w-[700px]">
                <thead>
                <tr className="bg-slate-50/50 border-b border-slate-200/60 text-slate-500 text-sm">
                  <th className="py-4 px-6 font-semibold">Employee</th>
                  <th className="py-4 px-6 font-semibold">Department</th>
                  <th className="py-4 px-6 font-semibold">Position</th>
                  <th className="py-4 px-6 font-semibold">Status</th>
                  <th className="py-4 px-6 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEmployees.map((emp) => {
                  let statusVariant = 'gray';
                  let statusText = emp.status || 'UNKNOWN';
                  if (emp.status === 'Active') {
                    if (emp.leaves && emp.leaves.length > 0) {
                      statusText = 'On Leave';
                      statusVariant = 'amber';
                    } else if (emp.attendances && emp.attendances.length > 0) {
                      statusText = 'Present (Clocked In)';
                      statusVariant = 'emerald';
                    } else {
                      statusText = 'Absent (Not Clocked In)';
                      statusVariant = 'rose';
                    }
                  } else if (emp.status === 'Inactive') {
                    statusVariant = 'red';
                    statusText = 'Offboarded';
                  }

                  const initials = (emp.displayName || 'U').split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase();

                  return (
                    <tr key={emp.id} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm shrink-0 overflow-hidden border border-indigo-200 shadow-sm">
                            {emp.avatar ? (
                              <img src={emp.avatar} alt="Avatar" className="w-full h-full object-cover" />
                            ) : (
                              initials
                            )}
                          </div>
                          <div>
                            <p className="font-bold text-slate-800">{emp.displayName}</p>
                            <p className="text-xs text-slate-500">ID: {emp.employeeId}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className="text-sm text-slate-600 font-medium">{emp.department || 'General'}</span>
                      </td>
                      <td className="py-4 px-6">
                        <span className="text-sm text-slate-600">{emp.jobPosition || emp.role}</span>
                      </td>
                      <td className="py-4 px-6">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          statusVariant === 'emerald' ? 'bg-emerald-100 text-emerald-700' : 
                          statusVariant === 'amber' ? 'bg-amber-100 text-amber-700' : 
                          statusVariant === 'rose' ? 'bg-rose-100 text-rose-700' : 
                          statusVariant === 'red' ? 'bg-red-100 text-red-700' : 
                          'bg-slate-100 text-slate-700'
                        }`}>
                          {statusText}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <Link to={`/dashboard/employee/${emp.id}`} className="inline-flex items-center text-sm font-bold text-indigo-600 hover:text-indigo-800 transition-colors">
                          View details &rarr;
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>

            {/* Mobile Cards View */}
            <div className="md:hidden flex flex-col gap-4">
              {filteredEmployees.map((emp) => {
                let statusVariant = 'gray';
                let statusText = emp.status || 'UNKNOWN';
                if (emp.status === 'Active') {
                  if (emp.leaves && emp.leaves.length > 0) {
                    statusText = 'On Leave';
                    statusVariant = 'amber';
                  } else if (emp.attendances && emp.attendances.length > 0) {
                    statusText = 'Present (Clocked In)';
                    statusVariant = 'emerald';
                  } else {
                    statusText = 'Absent (Not Clocked In)';
                    statusVariant = 'rose';
                  }
                } else if (emp.status === 'Inactive') {
                  statusVariant = 'red';
                  statusText = 'Offboarded';
                }
                const initials = (emp.displayName || 'U').split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase();

                return (
                  <div key={emp.id} className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col gap-4">
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm shrink-0 overflow-hidden border border-indigo-200 shadow-sm">
                          {emp.avatar ? (
                            <img src={emp.avatar} alt="Avatar" className="w-full h-full object-cover" />
                          ) : (
                            initials
                          )}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <p className="font-bold text-slate-800 text-base truncate">{emp.displayName}</p>
                          <p className="text-xs text-slate-500 font-medium">ID: {emp.employeeId}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-slate-50 rounded-xl p-3 flex flex-col gap-2 border border-slate-100">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Department</span>
                        <span className="font-semibold text-slate-700">{emp.department || 'General'}</span>
                      </div>
                      <div className="h-px w-full bg-slate-200/60"></div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Position</span>
                        <span className="font-semibold text-slate-700">{emp.jobPosition || emp.role}</span>
                      </div>
                      <div className="h-px w-full bg-slate-200/60"></div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Status</span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase ${
                          statusVariant === 'emerald' ? 'bg-emerald-100 text-emerald-700' : 
                          statusVariant === 'amber' ? 'bg-amber-100 text-amber-700' : 
                          statusVariant === 'rose' ? 'bg-rose-100 text-rose-700' : 
                          statusVariant === 'red' ? 'bg-red-100 text-red-700' : 
                          'bg-slate-100 text-slate-700'
                        }`}>
                          {statusText}
                        </span>
                      </div>
                    </div>

                    <Link to={`/dashboard/employee/${emp.id}`} className="w-full py-2.5 flex items-center justify-center bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-sm font-bold transition-colors">
                      View details
                    </Link>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};



const Dashboard = () => {
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user') || '{}'));

  useEffect(() => {
    const fetchMe = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        const res = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/auth/me`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const fetchedUser = await res.json();
          localStorage.setItem('user', JSON.stringify(fetchedUser));
          setUser(fetchedUser); 
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchMe();
  }, []);

  return (
    <ShellLayout user={user}>
      <Routes>
        <Route path="/" element={<EmployeeCards user={user} />} />
        <Route path="/employee/:id" element={<EmployeeDetails user={user} />} />
        {/* Removed intercepting Navigate route for my-profile */}
        <Route path="/attendance" element={<Attendance user={user} />} />
        <Route path="/time-off" element={<TimeOff user={user} />} />
        <Route path="/payroll" element={<Payroll user={user} />} />
        <Route path="/add-employee" element={<div className="p-4 md:p-8 lg:p-12"><CreateEmployee /></div>} />
        <Route path="/invite-employee" element={<div className="p-4 md:p-8 lg:p-12"><InviteEmployee /></div>} />
        <Route path="/manage-admins" element={<div className="p-4 md:p-8 lg:p-12"><ManageAdmins /></div>} />
        <Route path="/org-chart" element={<OrgChart />} />
        <Route path="/helpdesk" element={<Helpdesk user={user} />} />
        <Route path="/tenant-settings" element={<TenantSettings />} />
        <Route path="/developer" element={<DeveloperSettings />} />
        <Route path="/leave-approvals" element={<LeaveApprovals />} />
        <Route path="/audit-logs" element={<AuditLogs />} />
        <Route path="/data-import" element={<DataImport />} />
        <Route path="/my-profile" element={<MyProfile />} />
      </Routes>
    </ShellLayout>
  );
};

export default Dashboard;

