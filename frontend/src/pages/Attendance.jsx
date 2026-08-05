import React, { useState, useEffect } from 'react';
import { hasPermission } from '../lib/permissions';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { 
  Clock, 
  MapPin, 
  AlertCircle, 
  CheckCircle, 
  Wifi, 
  ShieldCheck, 
  Activity, 
  ArrowRight, 
  ShieldAlert, 
  Calendar,
  Sparkles,
  UserCheck
} from 'lucide-react';
import { useLiveness } from '../hooks/useLiveness';
import LivenessModal from '../components/liveness/LivenessModal';
import { Skeleton } from '../components/ui/Skeleton';

const Attendance = ({ user }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [statusMsg, setStatusMsg] = useState('');
  const [myAttendance, setMyAttendance] = useState([]);
  const [todayAdminData, setTodayAdminData] = useState([]);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Real-time ticking clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const {
    startVerification,
    processFrame,
    cancelVerification,
    isVerifying,
    isModelLoaded,
    status,
    error: livenessError
  } = useLiveness();

  const isAdmin = hasPermission(user, 'view_all_employees');

  const getTrustBadgeClass = (score) => {
    if (score === null || score === undefined) return '!bg-slate-100 !text-slate-600 !border-slate-200';
    if (score >= 80) return '!bg-emerald-50 !text-emerald-700 !border-emerald-200/80 shadow-xs';
    if (score >= 60) return '!bg-amber-50 !text-amber-700 !border-amber-200/80 shadow-xs';
    return '!bg-rose-50 !text-rose-700 !border-rose-200/80 shadow-xs';
  };

  const formatMethod = (method) => {
    if (!method) return 'N/A';
    return method.split('_').map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(' ');
  };

  const fetchMyData = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/attendance/me`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      setMyAttendance(Array.isArray(data) ? data : []);
    } catch (e) { console.error(e); }
  };

  const fetchAdminData = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/attendance/today`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      setTodayAdminData(Array.isArray(data) ? data : []);
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    setDataLoading(true);
    const promises = [fetchMyData()];
    if (isAdmin) promises.push(fetchAdminData());
    Promise.all(promises).finally(() => setDataLoading(false));
  }, [isAdmin]);

  const handleClockAction = async (action) => {
    setLoading(true);
    setStatusMsg('');

    let livenessData = {};
    if (action === 'clock-in') {
      try {
        const result = await startVerification();
        if (!result.isLive) {
          setStatusMsg('Error: Face verification failed. Please try again.');
          setLoading(false);
          return;
        }
        livenessData = {
          isLivenessVerified: true,
          livenessEmbeddingHash: result.embeddingHash,
          livenessConfidence: result.confidence,
          liveEmbedding: result.rawEmbedding,
          verificationId: result.verificationId,
          livenessTimestamp: result.timestamp
        };
      } catch (err) {
        setStatusMsg(`Error: ${err.message === 'CAMERA_DENIED' ? 'Camera access is required for identity verification.' : err.message}`);
        setLoading(false);
        return;
      }
    }
    
    // Geofencing for clock-in
    let locationData = {};
    if (action === 'clock-in') {
      try {
        const position = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { 
            timeout: 8000,
            maximumAge: 0,
            enableHighAccuracy: true
          });
        });
        locationData = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy
        };
      } catch (err) {
        setStatusMsg('Error: Location access is required for clocking in.');
        setLoading(false);
        return;
      }
    }

    try {
      const endpoint = action === 'clock-in' ? '/api/attendance/clock-in' : '/api/attendance/clock-out';
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ ...locationData, ...livenessData })
      });
      const data = await res.json();
      
      if (!res.ok) {
        if (data.redirectTo) {
          navigate(data.redirectTo);
          return;
        }
        throw new Error(data.error || 'Action failed');
      }
      
      setStatusMsg(`Successfully ${action === 'clock-in' ? 'Clocked In' : 'Clocked Out'}!`);
      fetchMyData();
      if (isAdmin) fetchAdminData();
    } catch (error) {
      setStatusMsg(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Determine today's status for the employee
  const todayRecord = myAttendance.find(a => 
    (a.checkIn && new Date(a.checkIn).toDateString() === new Date().toDateString()) ||
    (a.date && new Date(a.date).toDateString() === new Date().toDateString())
  );
  const isClockedIn = todayRecord && !todayRecord.checkOut;
  const isClockedOut = todayRecord && todayRecord.checkOut;

  // Calculate work hours logged today or collected
  const hoursLoggedToday = todayRecord ? (todayRecord.workHours || 0) : 0;
  const targetHours = 9.0;
  const progressPercent = Math.min(100, Math.round((hoursLoggedToday / targetHours) * 100));

  const userName = user?.displayName || user?.name || user?.email?.split('@')[0] || 'Employee';

  // Admin stats count
  const totalAdminRecords = todayAdminData.length;
  const validAdminRecords = todayAdminData.filter(r => r.status !== 'Absent').length;
  const flaggedAdminRecords = todayAdminData.filter(r => r.status === 'Absent').length;

  return (
    <div className="min-h-screen pb-10 pt-7 md:pt-9 px-3 sm:px-5 lg:px-6 max-w-7xl mx-auto space-y-4 md:space-y-5 !bg-transparent">
      
      {/* ── TOP COMPACT BANNER & SPATIAL CONTEXT ───────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 !bg-white/95 backdrop-blur-md rounded-2xl p-4 sm:p-4.5 !border !border-slate-200/80 shadow-xs employee-card-enter">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold !bg-emerald-50 !text-emerald-700 !border !border-emerald-200/80">
              <span className="w-1.5 h-1.5 rounded-full !bg-emerald-500 animate-pulse"></span>
              Live Gateway
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] !text-slate-500 font-semibold">
              <Wifi size={11} className="!text-slate-400" />
              Office_Verified_5G
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black !text-slate-900 tracking-tight font-outfit">
            Good day, {userName}!
          </h1>
          <p className="text-xs !text-slate-500 font-medium">
            Log shift status or monitor spatial diagnostics in real time.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto !bg-slate-50 px-3.5 py-2 rounded-xl !border !border-slate-200/70 shadow-xs">
          <Clock className="!text-indigo-500 animate-pulse" size={16} />
          <div className="flex flex-col">
            <span className="text-base font-black !text-slate-900 tracking-tight font-kpi leading-none">
              {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
            <span className="text-[9px] font-bold uppercase tracking-wider !text-slate-400 mt-0.5">
              {currentTime.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          </div>
        </div>
      </div>

      {/* ── DUAL COLUMN COMPACT MAIN LAYOUT ───────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5">
        
        {/* Left Column: Focal Clock Engine & Telemetry Card (7 Cols) */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          <Card className="p-4 sm:p-5 !bg-white !dark:bg-white !border !border-slate-200/80 !dark:border-slate-200/80 shadow-xs rounded-2xl relative overflow-hidden flex flex-col items-center text-center transition-all duration-300 hover:-translate-y-0.5 employee-card-enter">
            
            {/* Background Soft Mesh Glow */}
            <div className="absolute -top-16 -right-16 w-56 h-56 !bg-indigo-500/10 rounded-full blur-2xl pointer-events-none"></div>
            <div className="absolute -bottom-16 -left-16 w-56 h-56 !bg-emerald-500/10 rounded-full blur-2xl pointer-events-none"></div>

            {/* Header Badge */}
            <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold !bg-white !text-slate-700 !border !border-slate-200/80 shadow-xs mb-3">
              <ShieldCheck size={12} className="!text-emerald-500" />
              <span>Biometric & GPS Encrypted Gateway</span>
            </div>

            {/* ── THE FOCAL RADIAL ORB ACTION BUTTON (DYNAMIC MORPHING ANIMATIONS) ── */}
            <div className="relative my-2 flex items-center justify-center">
              {/* Sonic Ripple Wave Layer 1 (Expanding Radar Ring) */}
              <div 
                className={`absolute inset-0 rounded-full animate-ping opacity-25 pointer-events-none transition-all duration-700 ${
                  isClockedIn ? '!bg-amber-400' : isClockedOut ? 'hidden' : '!bg-emerald-400'
                }`}
                style={{ animationDuration: '3s' }}
              ></div>

              {/* Sonic Ripple Wave Layer 2 (Outer Soft Ambient Glow) */}
              <div 
                className={`absolute -inset-2 rounded-full blur-xl opacity-60 transition-all duration-700 ease-in-out ${
                  isClockedIn 
                    ? '!bg-amber-500/40 animate-pulse' 
                    : isClockedOut 
                      ? '!bg-slate-300/25' 
                      : '!bg-emerald-500/40 animate-pulse'
                }`}
              ></div>

              {/* Orbital Ring Structure with Smooth Scale & Glow */}
              <div className="relative p-2.5 !bg-white/95 backdrop-blur-md rounded-full shadow-md !border !border-slate-200/80 transition-all duration-500 hover:shadow-lg">
                <button
                  onClick={() => handleClockAction(isClockedIn ? 'clock-out' : 'clock-in')}
                  disabled={isClockedOut || loading}
                  className={`w-32 h-32 md:w-36 md:h-36 rounded-full flex flex-col items-center justify-center !text-white transition-all duration-700 ease-in-out transform hover:scale-105 active:scale-95 shadow-xl relative overflow-hidden group ${
                    isClockedIn
                      ? '!bg-gradient-to-br !from-amber-400 !via-amber-500 !to-amber-600 hover:!from-amber-500 hover:!to-amber-700 shadow-amber-500/30'
                      : isClockedOut
                        ? '!bg-gradient-to-br !from-slate-400 !to-slate-500 cursor-not-allowed opacity-80 shadow-slate-300/20'
                        : '!bg-gradient-to-br !from-emerald-400 !via-emerald-500 !to-teal-600 hover:!from-emerald-500 hover:!to-teal-700 shadow-emerald-500/30'
                  }`}
                >
                  {/* Dynamic Shimmer Lens Highlight */}
                  <div className="absolute top-0 inset-x-0 h-1/2 bg-gradient-to-b from-white/35 to-transparent rounded-t-full pointer-events-none transition-opacity duration-500 group-hover:opacity-90"></div>

                  <Clock 
                    size={26} 
                    className={`mb-1 transition-all duration-500 ease-in-out transform group-hover:scale-110 group-hover:rotate-12 ${
                      loading ? 'animate-spin' : isClockedIn ? 'rotate-180' : 'rotate-0'
                    }`} 
                  />
                  
                  <span className="text-base md:text-lg font-black tracking-tight font-outfit transition-all duration-500 animate-in fade-in zoom-in-95">
                    {loading 
                      ? 'Processing...' 
                      : isClockedIn 
                        ? 'Clock Out' 
                        : isClockedOut 
                          ? 'Shift Done' 
                          : 'Clock In'}
                  </span>
                  
                  <span className="text-[10px] font-semibold opacity-90 tracking-wide transition-all duration-500">
                    {isClockedIn ? 'End Session' : isClockedOut ? 'Completed' : 'Start Session'}
                  </span>
                </button>
              </div>
            </div>

            {/* Time & Date Subtext */}
            <div className="mt-2.5 flex flex-col items-center">
              <span className="text-xl md:text-2xl font-black !text-slate-900 tracking-tight font-kpi leading-none">
                {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
              <span className="text-[10px] font-bold !text-slate-400 uppercase tracking-wider mt-0.5">
                {currentTime.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </div>

            {/* Status Feedback Banners */}
            {statusMsg && (
              <div className={`w-full mt-3 p-3 rounded-xl text-xs font-semibold flex items-center gap-2 text-left animate-in fade-in duration-200 !border ${
                statusMsg.includes('Error') 
                  ? '!bg-rose-50 !text-rose-700 !border-rose-200/80 shadow-xs' 
                  : '!bg-emerald-50 !text-emerald-800 !border-emerald-200/80 shadow-xs'
              }`}>
                {statusMsg.includes('Error') ? (
                  <AlertCircle size={15} className="!text-rose-500 shrink-0" />
                ) : (
                  <CheckCircle size={15} className="!text-emerald-500 shrink-0" />
                )}
                <span className="flex-1 leading-tight">{statusMsg}</span>
              </div>
            )}

            {/* Shift Hours Telemetry Progress */}
            <div className="w-full mt-3 !bg-slate-50 !dark:bg-slate-50 rounded-xl p-3 !border !border-slate-200/70 shadow-xs flex flex-col gap-2 text-left">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold !text-slate-600 uppercase tracking-wider text-[10px] flex items-center gap-1">
                  <Activity size={12} className="!text-indigo-500" /> Collected Shift Hours
                </span>
                <span className="font-black !text-slate-900 font-kpi text-xs">
                  {hoursLoggedToday.toFixed(1)}h / {targetHours.toFixed(1)}h
                </span>
              </div>
              <div className="w-full !bg-slate-200/80 h-2 rounded-full overflow-hidden p-0.5">
                <div 
                  className="bg-gradient-to-r from-indigo-500 to-emerald-500 h-full rounded-full transition-all duration-700"
                  style={{ width: `${progressPercent}%` }}
                ></div>
              </div>
            </div>

            {/* Today's Milestone Cards */}
            {todayRecord && (
              <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-3 text-left">
                <div className="!bg-slate-50 p-2.5 rounded-xl !border !border-slate-200/70 shadow-xs flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg !bg-emerald-100/70 !text-emerald-700 flex items-center justify-center shrink-0">
                    <CheckCircle size={14} />
                  </div>
                  <div>
                    <p className="text-[9px] font-bold !text-slate-400 uppercase tracking-wider">Clocked In</p>
                    <p className="text-xs font-extrabold !text-slate-900 font-kpi">
                      {new Date(todayRecord.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>

                <div className="!bg-slate-50 p-2.5 rounded-xl !border !border-slate-200/70 shadow-xs flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg !bg-indigo-100/70 !text-indigo-700 flex items-center justify-center shrink-0">
                    <Clock size={14} />
                  </div>
                  <div>
                    <p className="text-[9px] font-bold !text-slate-400 uppercase tracking-wider">Clocked Out</p>
                    <p className="text-xs font-extrabold !text-slate-900 font-kpi">
                      {todayRecord.checkOut 
                        ? new Date(todayRecord.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : 'Active'}
                    </p>
                  </div>
                </div>
              </div>
            )}

          </Card>
        </div>

        {/* Right Column: My Recent Attendance History (5 Cols - COMPACT) */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <Card className="p-4 sm:p-5 !bg-white !dark:bg-white !border !border-slate-200/80 !dark:border-slate-200/80 shadow-xs rounded-2xl flex flex-col h-full max-h-[380px] transition-all duration-300 hover:-translate-y-0.5 employee-card-enter">
            <div className="flex justify-between items-center mb-3 pb-2.5 !border-b !border-slate-200/70">
              <div>
                <h2 className="text-base font-black !text-slate-900 tracking-tight font-outfit flex items-center gap-1.5">
                  <Calendar size={16} className="!text-indigo-500" /> Recent Attendance Logs
                </h2>
                <p className="text-[11px] !text-slate-500 font-medium">Your latest verified entries</p>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full !bg-slate-100 !text-slate-700 !border !border-slate-200/70">
                {myAttendance.length} Entries
              </span>
            </div>

            <div className="space-y-2.5 overflow-y-auto custom-scrollbar flex-1 pr-1 max-h-[300px]">
              {dataLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="p-3 !bg-slate-50 rounded-xl animate-pulse flex justify-between items-center !border !border-slate-200/60">
                    <div className="space-y-1.5">
                      <Skeleton className="h-3.5 w-24 rounded-md" />
                      <Skeleton className="h-3 w-16 rounded-md" />
                    </div>
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </div>
                ))
              ) : myAttendance.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center p-6 text-center gap-1.5">
                  <UserCheck size={30} className="!text-slate-300 mb-0.5" />
                  <p className="text-xs font-semibold !text-slate-700">No attendance records yet</p>
                  <p className="text-[11px] !text-slate-400">Clock in to record your shift!</p>
                </div>
              ) : (
                myAttendance.map(log => (
                  <div 
                    key={log.id} 
                    className="p-3 !bg-slate-50/90 hover:!bg-slate-100/80 rounded-xl !border !border-slate-200/70 transition-all duration-200 hover:-translate-y-0.5 flex items-center justify-between group shadow-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        log.status === 'Absent' ? '!bg-rose-100/70 !text-rose-600' : '!bg-emerald-100/70 !text-emerald-700'
                      }`}>
                        {log.status === 'Absent' ? <ShieldAlert size={15} /> : <CheckCircle size={15} />}
                      </div>
                      <div>
                        <p className="font-extrabold !text-slate-900 text-xs tracking-tight">
                          {new Date(log.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                        </p>
                        <p className="text-[11px] !text-slate-600 font-bold font-kpi">
                          {log.workHours ? `${log.workHours.toFixed(1)} hrs logged` : '0.0 hrs logged'}
                        </p>
                      </div>
                    </div>

                    <div>
                      {log.status === 'Absent' ? (
                        <span className="text-[10px] font-bold !text-rose-700 !bg-rose-50 px-2 py-0.5 rounded-full !border !border-rose-200/80 inline-flex items-center gap-1">
                          <AlertCircle size={10} /> Flagged
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold !text-emerald-800 !bg-emerald-50 px-2 py-0.5 rounded-full !border !border-emerald-200/80 inline-flex items-center gap-1">
                          <CheckCircle size={10} /> Present
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

      </div>

      {/* ── ADMIN LIVE COMPANY STATUS AUDIT CENTER (COMPACT) ─────────────── */}
      {isAdmin && (
        <Card className="p-4 sm:p-5 !bg-white !dark:bg-white !border !border-slate-200/80 !dark:border-slate-200/80 shadow-xs rounded-2xl mt-4 employee-card-enter">
          
          {/* Admin Header & Summary Pills */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 !border-b !border-slate-200/70">
            <div>
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold !bg-indigo-50 !text-indigo-700 uppercase tracking-wider !border !border-indigo-100">
                  Admin Telemetry
                </span>
              </div>
              <h2 className="text-lg font-black !text-slate-900 tracking-tight font-outfit">
                Today's Live Company Status
              </h2>
              <p className="text-[11px] !text-slate-500 font-medium">Real-time logs & spatial diagnostics for all employees.</p>
            </div>

            {/* Quick KPI Stats Pills */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="!bg-slate-50 !border !border-slate-200/70 px-2.5 py-1 rounded-lg flex items-center gap-1.5">
                <span className="text-[10px] font-bold !text-slate-400 uppercase tracking-wider">Total</span>
                <span className="text-xs font-black !text-slate-900 font-kpi">{totalAdminRecords}</span>
              </div>
              <div className="!bg-emerald-50 !border !border-emerald-200/80 px-2.5 py-1 rounded-lg flex items-center gap-1.5">
                <span className="text-[10px] font-bold !text-emerald-700 uppercase tracking-wider">Valid</span>
                <span className="text-xs font-black !text-emerald-800 font-kpi">{validAdminRecords}</span>
              </div>
              <div className="!bg-rose-50 !border !border-rose-200/80 px-2.5 py-1 rounded-lg flex items-center gap-1.5">
                <span className="text-[10px] font-bold !text-rose-700 uppercase tracking-wider">Flagged</span>
                <span className="text-xs font-black !text-rose-800 font-kpi">{flaggedAdminRecords}</span>
              </div>
            </div>
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto custom-scrollbar">
            <table className="w-full text-left min-w-[750px]">
              <thead>
                <tr className="!border-b !border-slate-200/80 !text-slate-400 text-[10px] font-extrabold uppercase tracking-wider">
                  <th className="pb-2 pl-2">Employee</th>
                  <th className="pb-2">Clock In</th>
                  <th className="pb-2">Clock Out</th>
                  <th className="pb-2">Status</th>
                  <th className="pb-2">Trust Score</th>
                  <th className="pb-2">Verification Method</th>
                  <th className="pb-2 pr-2 text-right">Audit</th>
                </tr>
              </thead>
              <tbody className="divide-y !divide-slate-200/70 text-xs">
                {dataLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="py-3 pl-2"><Skeleton className="h-4 w-32 rounded-md" /></td>
                      <td className="py-3"><Skeleton className="h-4 w-16 rounded-md" /></td>
                      <td className="py-3"><Skeleton className="h-4 w-16 rounded-md" /></td>
                      <td className="py-3"><Skeleton className="h-5 w-16 rounded-full" /></td>
                      <td className="py-3"><Skeleton className="h-5 w-14 rounded-full" /></td>
                      <td className="py-3"><Skeleton className="h-4 w-20 rounded-md" /></td>
                      <td className="py-3 pr-2 text-right"><Skeleton className="h-7 w-16 ml-auto rounded-lg" /></td>
                    </tr>
                  ))
                ) : todayAdminData.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="py-6 text-center !text-slate-500 font-medium text-xs">
                      No clock-in records logged for today yet.
                    </td>
                  </tr>
                ) : (
                  todayAdminData.map(record => (
                    <tr key={record.id} className="hover:!bg-slate-50/90 transition-colors group">
                      <td className="py-2.5 pl-2 font-bold !text-slate-900 flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full !bg-indigo-50 !text-indigo-700 font-black flex items-center justify-center text-[11px] !border !border-indigo-100">
                          {record.user.displayName ? record.user.displayName.charAt(0).toUpperCase() : 'E'}
                        </div>
                        <span>{record.user.displayName}</span>
                      </td>

                      <td className="py-2.5 font-bold !text-slate-800 font-kpi text-[11px]">
                        {new Date(record.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>

                      <td className="py-2.5 font-bold !text-slate-600 font-kpi text-[11px]">
                        {record.checkOut ? new Date(record.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                      </td>

                      <td className="py-2.5">
                        {record.status === 'Absent' ? (
                          <span className="text-[10px] font-bold !text-rose-700 !bg-rose-50 px-2 py-0.5 rounded-full !border !border-rose-200/80 inline-flex items-center gap-1">
                            <AlertCircle size={10} /> Suspicious
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold !text-emerald-800 !bg-emerald-50 px-2 py-0.5 rounded-full !border !border-emerald-200/80 inline-flex items-center gap-1">
                            <CheckCircle size={10} /> Valid
                          </span>
                        )}
                      </td>

                      <td className="py-2.5">
                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full !border font-kpi ${getTrustBadgeClass(record.trustScore)}`}>
                          {record.trustScore !== null && record.trustScore !== undefined ? `${record.trustScore}%` : 'N/A'}
                        </span>
                      </td>

                      <td className="py-2.5 text-[11px] !text-slate-600 font-semibold uppercase tracking-wider">
                        {formatMethod(record.verificationMethod)}
                      </td>

                      <td className="py-2.5 pr-2 text-right">
                        <Button 
                          onClick={() => setSelectedRecord(record)}
                          className="!bg-slate-100 hover:!bg-slate-200 !text-slate-800 px-2.5 py-1 text-[11px] font-extrabold rounded-lg !border !border-slate-200/80 active:scale-95 transition-all"
                        >
                          Audit Log
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card Grid View */}
          <div className="md:hidden flex flex-col gap-3 mt-1">
            {todayAdminData.length === 0 ? (
              <div className="py-4 text-center !text-slate-500 text-xs font-medium">No clock-in records logged today yet.</div>
            ) : (
              todayAdminData.map(record => (
                <div key={record.id} className="!bg-white p-3 rounded-xl !border !border-slate-200/80 shadow-xs flex flex-col gap-2 relative overflow-hidden">
                  <div className={`absolute top-0 left-0 w-1 h-full ${record.status === 'Absent' ? '!bg-rose-500' : '!bg-emerald-500'}`}></div>
                  
                  <div className="flex justify-between items-start gap-2 pl-2">
                    <span className="font-extrabold !text-slate-900 text-sm">{record.user.displayName}</span>
                    {record.status === 'Absent' ? (
                      <span className="text-[9px] font-bold !text-rose-700 !bg-rose-50 px-2 py-0.5 rounded-full !border !border-rose-200 shrink-0">Suspicious</span>
                    ) : (
                      <span className="text-[9px] font-bold !text-emerald-800 !bg-emerald-50 px-2 py-0.5 rounded-full !border !border-emerald-200 flex items-center gap-1 shrink-0"><CheckCircle size={9}/> Valid</span>
                    )}
                  </div>

                  <div className="!bg-slate-50 rounded-lg p-2.5 grid grid-cols-2 gap-2 !border !border-slate-200/70 text-xs pl-2">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[9px] font-bold !text-slate-400 uppercase tracking-wider">Clock In</span>
                      <span className="font-extrabold !text-slate-900 font-kpi">{new Date(record.checkIn).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[9px] font-bold !text-slate-400 uppercase tracking-wider">Clock Out</span>
                      <span className="font-extrabold !text-slate-900 font-kpi">{record.checkOut ? new Date(record.checkOut).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--:--'}</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center !border-t !border-slate-200/70 pt-2 pl-2">
                    <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full !border ${getTrustBadgeClass(record.trustScore)}`}>
                      Trust: {record.trustScore !== null && record.trustScore !== undefined ? `${record.trustScore}%` : 'N/A'}
                    </span>
                    <button 
                      onClick={() => setSelectedRecord(record)}
                      className="text-[11px] font-bold !text-indigo-700 hover:!text-indigo-800 !bg-indigo-50 hover:!bg-indigo-100 px-2.5 py-0.5 rounded-lg transition-colors"
                    >
                      Audit Details
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

        </Card>
      )}

      {/* ── SPATIAL TRUST AUDIT LOG MODAL ─────────────────────────────────── */}
      {selectedRecord && (
        <div className="fixed inset-0 !bg-slate-900/40 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-lg p-5 relative !bg-white shadow-2xl rounded-2xl !border !border-slate-200/80 animate-in fade-in zoom-in-95 duration-200">
            
            <div className="flex justify-between items-start mb-3 pb-2.5 !border-b !border-slate-200/70">
              <div>
                <h3 className="text-lg font-black !text-slate-900 tracking-tight font-outfit flex items-center gap-1.5">
                  <ShieldCheck size={18} className="!text-indigo-600" /> Spatial Trust Audit Log
                </h3>
                <p className="text-xs !text-slate-500 font-medium">Employee Diagnostics: <span className="font-bold !text-slate-900">{selectedRecord.user.displayName}</span></p>
              </div>
              <button 
                onClick={() => setSelectedRecord(null)}
                className="w-7 h-7 rounded-full !bg-slate-100 hover:!bg-slate-200 !text-slate-600 flex items-center justify-center text-xs font-bold transition-colors"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-3">
              {/* Metrics Grid */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-3 !bg-slate-50 rounded-xl !border !border-slate-200/70 flex flex-col justify-center">
                  <span className="text-[9px] font-bold !text-slate-400 uppercase tracking-wider mb-1">Spatial Trust Score</span>
                  <span className={`text-[11px] font-extrabold px-2 py-0.5 rounded-full !border w-max ${getTrustBadgeClass(selectedRecord.trustScore)}`}>
                    {selectedRecord.trustScore ?? 'N/A'}% Confidence
                  </span>
                </div>
                <div className="p-3 !bg-slate-50 rounded-xl !border !border-slate-200/70 flex flex-col justify-center">
                  <span className="text-[9px] font-bold !text-slate-400 uppercase tracking-wider mb-1">Verification Method</span>
                  <span className="text-xs font-extrabold !text-slate-900">{formatMethod(selectedRecord.verificationMethod)}</span>
                </div>
              </div>

              {/* GPS Details */}
              <div className="p-3.5 !bg-slate-50 rounded-xl !border !border-slate-200/70 space-y-2 text-xs">
                <h4 className="font-black !text-slate-900 text-[10px] uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <MapPin size={13} className="!text-indigo-500" /> GPS Diagnostics
                </h4>
                <div className="flex justify-between border-b border-slate-200/70 pb-1">
                  <span className="!text-slate-500 font-medium">Coordinates</span>
                  <span className="font-mono font-bold !text-slate-900">
                    {selectedRecord.latitude?.toFixed(6) ?? 'N/A'}, {selectedRecord.longitude?.toFixed(6) ?? 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between border-b border-slate-200/70 pb-1">
                  <span className="!text-slate-500 font-medium">Device Accuracy</span>
                  <span className="font-bold !text-slate-900">
                    {selectedRecord.accuracy ? `${selectedRecord.accuracy}m` : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between border-b border-slate-200/70 pb-1">
                  <span className="!text-slate-500 font-medium">Distance from Office</span>
                  <span className="font-bold !text-slate-900">
                    {selectedRecord.proxyAlerts?.[0]?.details?.distanceFromOffice !== undefined
                      ? `${selectedRecord.proxyAlerts[0].details.distanceFromOffice}m`
                      : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="!text-slate-500 font-medium">Calculated Velocity</span>
                  <span className="font-bold !text-slate-900">
                    {selectedRecord.proxyAlerts?.[0]?.details?.velocityKmH !== undefined
                      ? `${selectedRecord.proxyAlerts[0].details.velocityKmH} km/h`
                      : 'N/A'}
                  </span>
                </div>
              </div>

              {/* Flags and Deductions */}
              <div className="p-3.5 !bg-slate-50 rounded-xl !border !border-slate-200/70 text-xs">
                <h4 className="font-black !text-slate-900 text-[10px] uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <ShieldAlert size={13} className="!text-rose-500" /> Flagging Diagnostics
                </h4>
                <div className="flex justify-between mb-1">
                  <span className="!text-slate-500 font-medium">Is Flagged</span>
                  <span className={`font-black ${selectedRecord.isFlagged ? '!text-rose-600' : '!text-emerald-600'}`}>
                    {selectedRecord.isFlagged ? 'Flagged Suspicious' : 'Clean / Verified'}
                  </span>
                </div>
                {selectedRecord.flagReason && (
                  <div className="mt-1.5 p-2.5 !bg-rose-50 !text-rose-700 !border !border-rose-200/80 rounded-lg text-xs leading-relaxed font-medium">
                    <span className="font-bold">Deduction Reason:</span> {selectedRecord.flagReason}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <Button 
                onClick={() => setSelectedRecord(null)} 
                className="!bg-slate-900 hover:!bg-slate-800 !text-white font-extrabold rounded-xl px-4 py-1.5 active:scale-95 transition-all text-xs"
              >
                Close Audit Log
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* ── FACIAL LIVENESS CAMERA MODAL ──────────────────────────────────── */}
      {isVerifying && (
        <LivenessModal
          status={status}
          onCancel={cancelVerification}
          processFrame={processFrame}
          isModelLoaded={isModelLoaded}
          onCameraError={(err) => {
            cancelVerification();
            setStatusMsg('Error: Camera permission is required for face presence check.');
          }}
        />
      )}
    </div>
  );
};

export default Attendance;
