import React, { useState, useEffect } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { AlertCircle, Clock, UserCheck } from 'lucide-react';
import toast from 'react-hot-toast';

const OnboardingPipeline = () => {
  const [pipeline, setPipeline] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPipeline();
  }, []);

  const fetchPipeline = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/onboarding/pipeline`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPipeline(data);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load pipeline');
    } finally {
      setLoading(false);
    }
  };

  const getStepColor = (step) => {
    const steps = {
      'personal_details': 'bg-slate-100 text-slate-600',
      'emergency_contact': 'bg-blue-100 text-blue-700',
      'financial_details': 'bg-indigo-100 text-indigo-700',
      'statutory_details': 'bg-purple-100 text-purple-700'
    };
    return steps[step] || 'bg-slate-100 text-slate-600';
  };

  const formatStepName = (step) => {
    return step.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  if (loading) return <div className="p-8">Loading pipeline...</div>;

  return (
    <div className="p-4 md:p-8 lg:p-12 max-w-7xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Onboarding Pipeline</h1>
          <p className="text-slate-500 mt-1">Monitor new hires stuck in the data collection wizard.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {pipeline.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-slate-200">
            <UserCheck className="mx-auto h-12 w-12 text-slate-300 mb-4" />
            <h3 className="text-lg font-medium text-slate-900">All caught up!</h3>
            <p className="text-slate-500">No employees are currently stuck in onboarding.</p>
          </div>
        ) : (
          pipeline.map(user => (
            <Card key={user.id} className="p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-lg shrink-0">
                  {user.displayName?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-lg">{user.displayName}</h3>
                  <p className="text-sm text-slate-500">{user.email}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-6 flex-wrap">
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Current Step</span>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold inline-block w-fit ${getStepColor(user.onboardingStep)}`}>
                    {formatStepName(user.onboardingStep)}
                  </span>
                </div>
                
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Stalled For</span>
                  <div className="flex items-center gap-1.5 text-sm font-medium text-amber-600 bg-amber-50 px-3 py-1 rounded-full w-fit">
                    <Clock size={14} />
                    {user.daysSinceJoining} {user.daysSinceJoining === 1 ? 'day' : 'days'}
                  </div>
                </div>

                {/* For V1, manual task assignment button could go here */}
                <Button variant="outline" className="text-indigo-600 border-indigo-200 hover:bg-indigo-50" onClick={() => {
                  toast.success('Checklist assignment coming soon in V2');
                }}>
                  Assign Tasks
                </Button>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default OnboardingPipeline;
