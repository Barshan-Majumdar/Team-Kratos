import React, { useState, useEffect } from 'react';
import { Network, Users, ChevronDown, ChevronRight, UserCircle } from 'lucide-react';
import { API_BASE } from '../lib/api';
import { motion, AnimatePresence } from 'framer-motion';

// Recursive Tree Node Component
const OrgNode = ({ employee, employees, level = 0 }) => {
  const [expanded, setExpanded] = useState(true);
  const subordinates = employees.filter(e => e.managerId === employee.id);

  return (
    <div className="flex flex-col items-center">
      <motion.div 
        layout
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`relative z-10 glass-panel p-4 rounded-xl border border-white/20 shadow-premium-glow flex flex-col items-center min-w-[200px] hover:-translate-y-1 transition-transform cursor-pointer
          ${employee.role === 'CEO' || employee.role === 'SuperAdmin' ? 'bg-gradient-to-br from-primary-900/50 to-primary-600/50 border-primary-500/50' : 'bg-bg-base'}`}
        onClick={() => setExpanded(!expanded)}
      >
        <div className="w-12 h-12 rounded-full overflow-hidden mb-3 border-2 border-primary-500/50 shadow-lg">
          {employee.avatar ? (
            <img src={employee.avatar} alt="avatar" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-primary-900/50 text-primary-300 flex items-center justify-center font-bold text-lg">
              {employee.displayName?.charAt(0) || 'U'}
            </div>
          )}
        </div>
        <h3 className="font-bold text-text-primary text-sm whitespace-nowrap">{employee.displayName}</h3>
        <span className="text-xs font-semibold text-primary-400 mt-0.5">{employee.jobPosition || employee.role}</span>
        {employee.department && (
          <span className="text-[10px] uppercase tracking-wider text-text-muted mt-1 bg-white/5 px-2 py-0.5 rounded-full border border-white/10">
            {employee.department}
          </span>
        )}
        
        {subordinates.length > 0 && (
          <div className="absolute -bottom-3 bg-primary-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg border border-primary-500">
            {subordinates.length}
          </div>
        )}
      </motion.div>

      <AnimatePresence>
        {expanded && subordinates.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex flex-col items-center overflow-hidden pt-6"
          >
            {/* Vertical Line from parent */}
            <div className="w-px h-6 bg-primary-500/30 -mt-6"></div>
            
            {/* Horizontal Line connecting children */}
            {subordinates.length > 1 && (
              <div className="h-px bg-primary-500/30" style={{ width: `calc(100% - ${100 / subordinates.length}%)` }}></div>
            )}
            
            <div className="flex justify-center gap-6 pt-6 relative">
              {/* Lines down to children are handled by relative positioning logic but let's keep it simple with borders */}
              {subordinates.map((sub, idx) => (
                <div key={sub.id} className="relative flex flex-col items-center">
                  <div className="absolute -top-6 w-px h-6 bg-primary-500/30"></div>
                  <OrgNode employee={sub} employees={employees} level={level + 1} />
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const OrgChart = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrg = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/users/org-chart`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const data = await res.json();
        setEmployees(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchOrg();
  }, []);

  if (loading) {
    return <div className="p-8 text-center animate-pulse text-text-muted">Loading Organization Structure...</div>;
  }

  // Find root nodes (employees without a managerId, or whose manager is not in the list)
  const employeeIds = new Set(employees.map(e => e.id));
  const roots = employees.filter(e => !e.managerId || !employeeIds.has(e.managerId));

  return (
    <div className="p-4 md:p-8 max-w-[1400px] mx-auto min-h-screen animate-in fade-in zoom-in-95 duration-300">
      <div className="mb-8">
        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary-400 to-primary-600 flex items-center gap-3">
          <Network size={32} className="text-primary-500" /> Organization Chart
        </h1>
        <p className="text-text-muted text-sm md:text-base mt-2">
          Dynamic visual hierarchy of your entire workforce.
        </p>
      </div>

      <div className="bg-bg-panel/40 backdrop-blur-xl border border-white/5 rounded-3xl p-8 overflow-auto custom-scrollbar flex justify-center min-h-[600px]">
        {roots.length === 0 ? (
          <div className="text-center text-text-muted mt-20">No employees found in the organization.</div>
        ) : (
          <div className="flex gap-12 justify-center">
            {roots.map(root => (
              <OrgNode key={root.id} employee={root} employees={employees} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default OrgChart;
