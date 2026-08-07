import React, { useState, useEffect } from 'react';
import { hasPermission } from '../lib/permissions';
import { useNavigate } from 'react-router-dom';
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
  UserCheck,
  Fingerprint
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
    if (score === null || score === undefined) return 'bg-[#FAF8F5] text-[#6B655C] border-[#EAE7E0]';
    if (score >= 80) return 'bg-emerald-50 text-emerald-800 border-emerald-200';
    if (score >= 60) return 'bg-amber-50 text-amber-800 border-amber-200';
    return 'bg-rose-50 text-rose-800 border-rose-200';
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
          image_base64: result.imageBase64
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
      
      setDataLoading(true);
      const refreshPromises = [fetchMyData()];
      if (isAdmin) refreshPromises.push(fetchAdminData());
      await Promise.all(refreshPromises);
      
    } catch (error) {
      setStatusMsg(`Error: ${error.message}`);
    } finally {
      setDataLoading(false);
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
    <div className="min-h-screen p-4 md:p-8 max-w-[1400px] mx-auto flex flex-col gap-6 bg-transparent">
      
      {/* ── TOP EXECUTIVE HEADER ───────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#EAE7E0]">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-display font-bold uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Gateway Active
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] text-[#6B655C] font-medium">
              <Wifi size={12} className="text-[#9A948A]" />
              Secure Connection
            </span>
          </div>
          <h1 className="font-serif font-bold text-3xl md:text-4xl text-[#1F2B4D] tracking-tight leading-none">
            Welcome, {userName}.
          </h1>
          <p className="text-[#6B655C] mt-1.5 text-xs md:text-sm font-medium">
            Manage your daily shift status and view spatial audit logs.
          </p>
        </div>

        <div className="flex items-center gap-3 bg-white px-4 py-2.5 rounded-xl border border-[#EAE7E0] shadow-sm shrink-0">
          <Clock className="text-[#1F2B4D]" size={20} />
          <div className="flex flex-col">
            <span className="font-mono text-lg font-bold text-[#1F2B4D] leading-none">
              {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
            <span className="text-[10px] font-display font-bold uppercase tracking-wider text-[#9A948A] mt-0.5">
              {currentTime.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          </div>
        </div>
      </div>

      {/* ── DUAL COLUMN MAIN LAYOUT ───────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Focal Clock Engine & Telemetry Card (7 Cols) */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          <div className="bg-[#FAF8F5] border border-[#EAE7E0] rounded-[24px] p-6 sm:p-10 shadow-xs relative overflow-hidden flex flex-col items-center text-center">
            
            {/* Header Badge */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-display font-bold bg-white text-[#1F2B4D] border border-[#EAE7E0] shadow-2xs mb-8">
              <ShieldCheck size={14} className="text-emerald-600" />
              <span>Biometric & GPS Encrypted Terminal</span>
            </div>

            {/* ── THE FOCAL RADIAL ACTION BUTTON ── */}
            <div className="relative my-4 flex items-center justify-center">
              {/* Orbital Ring Structure */}
              <div className="relative p-3 bg-white rounded-full shadow-sm border border-[#EAE7E0] transition-all duration-500 hover:shadow-md">
                <button
                  onClick={() => handleClockAction(isClockedIn ? 'clock-out' : 'clock-in')}
                  disabled={isClockedOut || loading}
                  className={`w-40 h-40 md:w-48 md:h-48 rounded-full flex flex-col items-center justify-center transition-all duration-500 transform hover:scale-[1.02] active:scale-[0.98] relative overflow-hidden group ${
                    isClockedIn
                      ? 'bg-amber-50 hover:bg-amber-100 border-2 border-amber-300 text-amber-900 shadow-inner'
                      : isClockedOut
                        ? 'bg-[#EAE7E0] border-2 border-[#CBD5E1] text-[#9A948A] cursor-not-allowed opacity-80'
                        : 'bg-[#F0F3F9] hover:bg-[#E2E8F0] border-2 border-[#CBD5E1] text-[#1F2B4D]'
                  }`}
                >
                  <Fingerprint 
                    size={40} 
                    className={`mb-2 transition-all duration-500 ${
                      loading ? 'animate-pulse' : isClockedIn ? 'text-amber-600' : isClockedOut ? 'text-[#9A948A]' : 'text-[#1F2B4D] group-hover:scale-110'
                    }`} 
                  />
                  
                  <span className="font-serif text-xl md:text-2xl font-bold tracking-tight">
                    {loading 
                      ? 'Authenticating' 
                      : isClockedIn 
                        ? 'Clock Out' 
                        : isClockedOut 
                          ? 'Shift Done' 
                          : 'Clock In'}
                  </span>
                  
                  <span className="text-[10px] font-display font-bold uppercase tracking-wider opacity-70 mt-1">
                    {isClockedIn ? 'End Session' : isClockedOut ? 'Completed' : 'Start Session'}
                  </span>
                </button>
              </div>
            </div>

            {/* Time & Date Subtext */}
            <div className="mt-6 flex flex-col items-center">
              <span className="font-mono text-2xl font-bold text-[#1F2B4D] leading-none">
                {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
              <span className="text-[11px] font-display font-bold text-[#9A948A] uppercase tracking-wider mt-1.5">
                {currentTime.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </div>

            {/* Status Feedback Banners */}
            {statusMsg && (
              <div className={`w-full max-w-md mt-6 p-4 rounded-xl text-sm font-medium flex items-center justify-center gap-2 border ${
                statusMsg.includes('Error') 
                  ? 'bg-rose-50 text-rose-800 border-rose-200' 
                  : 'bg-emerald-50 text-emerald-800 border-emerald-200'
              }`}>
                {statusMsg.includes('Error') ? (
                  <AlertCircle size={16} className="text-rose-500 shrink-0" />
                ) : (
                  <CheckCircle size={16} className="text-emerald-600 shrink-0" />
                )}
                <span>{statusMsg}</span>
              </div>
            )}

            {/* Shift Hours Telemetry Progress */}
            <div className="w-full max-w-md mt-8 bg-white rounded-xl p-4 border border-[#EAE7E0] shadow-sm flex flex-col gap-3 text-left">
              <div className="flex justify-between items-center">
                <span className="font-display font-bold text-[#6B655C] uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                  <Activity size={14} className="text-[#1F2B4D]" /> Collected Shift Hours
                </span>
                <span className="font-mono font-bold text-[#1F2B4D] text-sm">
                  {hoursLoggedToday.toFixed(1)}h / {targetHours.toFixed(1)}h
                </span>
              </div>
              <div className="w-full bg-[#EAE7E0] h-2.5 rounded-full overflow-hidden">
                <div 
                  className="bg-[#1F2B4D] h-full rounded-full transition-all duration-700 ease-out"
                  style={{ width: `${progressPercent}%` }}
                ></div>
              </div>
            </div>

          </div>
        </div>

        {/* Right Column: Historical Logs & Admin Feed (5 Cols) */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          
          {/* User's Own History Summary */}
          <div className="bg-white border border-[#EAE7E0] rounded-[24px] overflow-hidden shadow-sm flex flex-col h-full max-h-[480px]">
            <div className="p-5 border-b border-[#EAE7E0] bg-[#FAF8F5] flex justify-between items-center shrink-0">
              <h3 className="font-serif font-bold text-[#1F2B4D] text-lg flex items-center gap-2">
                <Calendar size={18} className="text-[#1F2B4D]" /> My Activity
              </h3>
              <span className="px-2 py-1 bg-white border border-[#EAE7E0] rounded-lg text-[10px] font-display font-bold text-[#6B655C] uppercase tracking-wider">
                Recent 7 Days
              </span>
            </div>
            
            <div className="p-5 overflow-y-auto custom-scrollbar flex-1 space-y-3">
              {dataLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex flex-col gap-2 p-3 border border-[#EAE7E0] rounded-xl">
                    <Skeleton className="h-4 w-1/3 bg-[#EAE7E0]" />
                    <Skeleton className="h-3 w-1/4 bg-[#EAE7E0]" />
                  </div>
                ))
              ) : myAttendance.length === 0 ? (
                <div className="text-center py-8 text-[#9A948A] text-sm font-medium">
                  No attendance records found.
                </div>
              ) : (
                myAttendance.slice(0, 5).map((record, i) => (
                  <div key={i} className="flex justify-between items-center p-3.5 bg-white border border-[#EAE7E0] rounded-xl hover:border-[#CBD5E1] transition-colors group">
                    <div className="flex flex-col">
                      <span className="font-bold text-[#1F2B4D] text-sm">
                        {new Date(record.date || record.checkIn).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                      </span>
                      <span className="text-[11px] font-medium text-[#6B655C] mt-0.5">
                        {record.checkIn ? new Date(record.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'} 
                        {' - '} 
                        {record.checkOut ? new Date(record.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Ongoing'}
                      </span>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={`text-[10px] font-display font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                        record.status === 'Present' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                        record.status === 'Absent' ? 'bg-rose-50 text-rose-800 border-rose-200' :
                        'bg-[#F0F3F9] text-[#1F2B4D] border-[#CBD5E1]'
                      }`}>
                        {record.status || 'Pending'}
                      </span>
                      <span className="font-mono text-[11px] font-bold text-[#1F2B4D]">
                        {record.workHours ? `${record.workHours.toFixed(1)}h` : '--'}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── ADMIN / MANAGER VIEW (IF HAS PERMISSION) ───────────────────────── */}
      {isAdmin && (
        <div className="mt-4 bg-white border border-[#EAE7E0] rounded-[24px] overflow-hidden shadow-sm flex flex-col">
          
          <div className="p-5 border-b border-[#EAE7E0] bg-[#FAF8F5] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h2 className="font-serif font-bold text-xl text-[#1F2B4D] flex items-center gap-2">
                <UserCheck size={20} className="text-[#1F2B4D]" /> Network Perimeter Log
              </h2>
              <p className="text-xs text-[#6B655C] font-medium mt-1">
                Real-time tracking of team spatial check-ins for today.
              </p>
            </div>
            
            {/* Quick Stats Pills */}
            <div className="flex items-center gap-2">
              <div className="px-3 py-1.5 bg-white border border-[#EAE7E0] rounded-xl flex items-center gap-2">
                <span className="text-[10px] font-display font-bold text-[#6B655C] uppercase tracking-wider">Total</span>
                <span className="font-mono font-bold text-[#1F2B4D]">{totalAdminRecords}</span>
              </div>
              <div className="px-3 py-1.5 bg-white border border-[#EAE7E0] rounded-xl flex items-center gap-2">
                <span className="text-[10px] font-display font-bold text-[#6B655C] uppercase tracking-wider">Active</span>
                <span className="font-mono font-bold text-emerald-600">{validAdminRecords}</span>
              </div>
            </div>
          </div>

          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 bg-[#FAF8F5]">
            {dataLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="bg-white border border-[#EAE7E0] p-4 rounded-2xl space-y-3">
                  <div className="flex gap-3 items-center">
                    <Skeleton className="w-8 h-8 rounded-full bg-[#EAE7E0]" />
                    <Skeleton className="h-4 w-24 bg-[#EAE7E0]" />
                  </div>
                  <Skeleton className="h-10 w-full bg-[#EAE7E0] rounded-xl" />
                </div>
              ))
            ) : todayAdminData.length === 0 ? (
              <div className="col-span-full py-10 text-center text-[#9A948A] text-sm font-medium">
                No telemetry available for the team today.
              </div>
            ) : (
              todayAdminData.map((record) => (
                <div key={record._id} className="bg-white border border-[#EAE7E0] rounded-2xl flex flex-col overflow-hidden hover:border-[#CBD5E1] hover:shadow-sm transition-all group">
                  
                  <div className="p-3 border-b border-[#EAE7E0] bg-[#FAF8F5] flex justify-between items-start">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-[#F0F3F9] text-[#1F2B4D] font-bold flex items-center justify-center text-xs border border-[#CBD5E1]">
                        {record.user?.displayName?.charAt(0) || 'E'}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-bold text-[#1F2B4D] text-sm truncate max-w-[120px]">{record.user?.displayName}</span>
                        <span className="text-[10px] text-[#6B655C] font-medium">{record.user?.department || 'Staff'}</span>
                      </div>
                    </div>
                    <span className={`w-2 h-2 rounded-full ${record.isFlagged ? 'bg-rose-500' : 'bg-emerald-500'}`} title={record.isFlagged ? 'Flagged' : 'Verified'}></span>
                  </div>

                  <div className="p-3 flex flex-col gap-2.5">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-display font-bold text-[#9A948A] uppercase tracking-wider">In</span>
                      <span className="font-mono font-bold text-[#1F2B4D] text-xs">{record.checkIn ? new Date(record.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-display font-bold text-[#9A948A] uppercase tracking-wider">Out</span>
                      <span className="font-mono font-bold text-[#1F2B4D] text-xs">{record.checkOut ? new Date(record.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center border-t border-[#EAE7E0] pt-2 pb-2 px-3 bg-[#FAF8F5]">
                    <span className={`text-[9px] font-display font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${getTrustBadgeClass(record.trustScore)}`}>
                      Trust: {record.trustScore !== null && record.trustScore !== undefined ? `${record.trustScore}%` : 'N/A'}
                    </span>
                    <button 
                      onClick={() => setSelectedRecord(record)}
                      className="text-[10px] font-display font-bold text-[#1F2B4D] hover:text-white bg-white hover:bg-[#1F2B4D] border border-[#CBD5E1] px-2.5 py-1 rounded-lg transition-colors"
                    >
                      Audit
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ── SPATIAL TRUST AUDIT LOG MODAL ───────────────────────── */}
      {selectedRecord && (
        <div className="fixed inset-0 bg-[#1F2B4D]/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg p-6 bg-white border border-[#EAE7E0] rounded-[24px] shadow-2xl animate-in zoom-in-95 duration-200">
            
            <div className="flex justify-between items-start mb-4 pb-3 border-b border-[#EAE7E0]">
              <div>
                <h3 className="font-serif font-bold text-[#1F2B4D] text-xl flex items-center gap-2">
                  <ShieldCheck size={20} className="text-[#1F2B4D]" /> Audit Log
                </h3>
                <p className="text-sm text-[#6B655C] font-medium mt-1">Diagnostic Report: <span className="font-bold text-[#1F2B4D]">{selectedRecord.user?.displayName}</span></p>
              </div>
              <button 
                onClick={() => setSelectedRecord(null)}
                className="w-8 h-8 rounded-full bg-[#FAF8F5] hover:bg-[#EAE7E0] text-[#1F2B4D] flex items-center justify-center transition-colors"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-4">
              {/* Metrics Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-[#FAF8F5] rounded-xl border border-[#EAE7E0] flex flex-col justify-center">
                  <span className="text-[10px] font-display font-bold text-[#6B655C] uppercase tracking-wider mb-1">Spatial Trust Score</span>
                  <span className={`text-[11px] font-display font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border w-max ${getTrustBadgeClass(selectedRecord.trustScore)}`}>
                    {selectedRecord.trustScore ?? 'N/A'}% Confidence
                  </span>
                </div>
                <div className="p-3 bg-[#FAF8F5] rounded-xl border border-[#EAE7E0] flex flex-col justify-center">
                  <span className="text-[10px] font-display font-bold text-[#6B655C] uppercase tracking-wider mb-1">Verification Method</span>
                  <span className="text-sm font-bold text-[#1F2B4D]">{formatMethod(selectedRecord.verificationMethod)}</span>
                </div>
              </div>

              {/* GPS Details */}
              <div className="p-4 bg-[#FAF8F5] rounded-xl border border-[#EAE7E0] space-y-2.5 text-sm">
                <h4 className="font-display font-bold text-[#1F2B4D] text-[11px] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <MapPin size={14} className="text-[#1F2B4D]" /> GPS Diagnostics
                </h4>
                <div className="flex justify-between border-b border-[#EAE7E0] pb-1.5">
                  <span className="text-[#6B655C] font-medium">Coordinates</span>
                  <span className="font-mono font-bold text-[#1F2B4D]">
                    {selectedRecord.latitude?.toFixed(6) ?? 'N/A'}, {selectedRecord.longitude?.toFixed(6) ?? 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between border-b border-[#EAE7E0] pb-1.5">
                  <span className="text-[#6B655C] font-medium">Device Accuracy</span>
                  <span className="font-bold text-[#1F2B4D]">
                    {selectedRecord.accuracy ? `${selectedRecord.accuracy}m` : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between border-b border-[#EAE7E0] pb-1.5">
                  <span className="text-[#6B655C] font-medium">Distance from Office</span>
                  <span className="font-bold text-[#1F2B4D]">
                    {selectedRecord.proxyAlerts?.[0]?.details?.distanceFromOffice !== undefined
                      ? `${selectedRecord.proxyAlerts[0].details.distanceFromOffice}m`
                      : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6B655C] font-medium">Calculated Velocity</span>
                  <span className="font-bold text-[#1F2B4D]">
                    {selectedRecord.proxyAlerts?.[0]?.details?.velocityKmH !== undefined
                      ? `${selectedRecord.proxyAlerts[0].details.velocityKmH} km/h`
                      : 'N/A'}
                  </span>
                </div>
              </div>

              {/* Flags and Deductions */}
              <div className="p-4 bg-[#FAF8F5] rounded-xl border border-[#EAE7E0] text-sm">
                <h4 className="font-display font-bold text-[#1F2B4D] text-[11px] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <ShieldAlert size={14} className="text-rose-600" /> Flagging Diagnostics
                </h4>
                <div className="flex justify-between mb-2">
                  <span className="text-[#6B655C] font-medium">Is Flagged</span>
                  <span className={`font-bold ${selectedRecord.isFlagged ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {selectedRecord.isFlagged ? 'Flagged Suspicious' : 'Clean / Verified'}
                  </span>
                </div>
                {selectedRecord.flagReason && (
                  <div className="mt-2 p-3 bg-rose-50 text-rose-800 border border-rose-200 rounded-xl text-xs leading-relaxed font-medium">
                    <span className="font-bold">Deduction Reason:</span> {selectedRecord.flagReason}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <Button 
                onClick={() => setSelectedRecord(null)} 
                className="bg-[#1F2B4D] hover:bg-[#141C33] text-white font-display font-bold rounded-xl px-5 py-2.5 transition-all text-sm"
              >
                Close Audit Log
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── FACIAL LIVENESS CAMERA MODAL ───────────────────────── */}
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
