import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { Briefcase, Plus, Clock, FileText, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';

const ProjectsDashboard = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [budget, setBudget] = useState('');

  const fetchProjects = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/projects`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProjects(res.data);
    } catch (err) {
      toast.error('Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleAddProject = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/projects`, {
        name, description, budget
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Project created successfully');
      setShowAddModal(false);
      setName('');
      setDescription('');
      setBudget('');
      fetchProjects();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create project');
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-500 font-medium">Loading projects...</div>;

  return (
    <div className="p-4 md:p-8 lg:p-12 max-w-7xl mx-auto space-y-8 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Projects (PSA)</h1>
          <p className="text-slate-500 mt-1 text-lg">Manage billable projects and track logged hours.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/dashboard/timesheets" className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-5 py-2.5 rounded-xl font-semibold hover:bg-slate-50 transition-all shadow-sm active:scale-95 whitespace-nowrap">
            <Clock size={18} /> View All Timesheets
          </Link>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-indigo-700 transition-all shadow-sm active:scale-95 whitespace-nowrap"
          >
            <Plus size={18} /> New Project
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map(project => (
          <div key={project.id} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-all flex flex-col">
            <div className="flex justify-between items-start mb-4">
              <div className="bg-indigo-50 p-3 rounded-xl">
                <Briefcase size={20} className="text-indigo-600" />
              </div>
              <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide ${
                project.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'
              }`}>
                {project.status}
              </span>
            </div>
            
            <h3 className="font-bold text-slate-900 text-xl truncate">{project.name}</h3>
            <p className="text-sm text-slate-500 mt-1 line-clamp-2 min-h-[40px]">{project.description || 'No description provided.'}</p>
            
            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase">Timesheets Logged</p>
                <p className="font-semibold text-slate-800 mt-0.5">{project._count?.timesheets || 0} entries</p>
              </div>
              {project.budget && (
                <div className="text-right">
                  <p className="text-xs font-bold text-slate-400 uppercase">Budget</p>
                  <p className="font-semibold text-slate-800 mt-0.5">${project.budget.toLocaleString()}</p>
                </div>
              )}
            </div>
          </div>
        ))}

        {projects.length === 0 && (
          <div className="col-span-full py-16 text-center bg-slate-50 rounded-3xl border border-dashed border-slate-200">
            <FileText size={48} className="mx-auto text-slate-300 mb-4" />
            <h3 className="text-lg font-bold text-slate-700">No projects found</h3>
            <p className="text-slate-500 mt-1">Start creating projects to track billable hours.</p>
          </div>
        )}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-scale-in">
            <div className="p-6 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-800">Create New Project</h2>
            </div>
            <form onSubmit={handleAddProject} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Project Name</label>
                <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all" placeholder="e.g. Acme Website Redesign" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Description</label>
                <textarea rows="3" value={description} onChange={(e) => setDescription(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all" placeholder="Brief details about the project..."></textarea>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Budget ($)</label>
                <input type="number" step="0.01" value={budget} onChange={(e) => setBudget(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all" placeholder="Optional" />
              </div>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 font-semibold rounded-xl hover:bg-slate-50 transition-colors">Cancel</button>
                <button type="submit" className="flex-1 px-4 py-2.5 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-colors">Create Project</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectsDashboard;
