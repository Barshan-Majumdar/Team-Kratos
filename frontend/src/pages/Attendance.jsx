import React, { useState, useEffect } from 'react';
import { hasPermission } from '../lib/permissions';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Clock, MapPin, AlertCircle, CheckCircle } from 'lucide-react';
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
  
  const {
    startVerification,
    processFrame,
    cancelVerification,
    isVerifying,
    isModelLoaded,
    status,
    error: livenessError
  } = useLiveness();
  const [currentChallenge, setCurrentChallenge] = useState(null);

  const isAdmin = hasPermission(user, 'view_all_employees');

  const getTrustBadgeClass = (score) => {
    if (score === null || score === undefined) return 'bg-slate-50 text-slate-500 border-slate-100';
    if (score >= 80) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (score >= 60) return 'bg-amber-50 text-amber-700 border-amber-200';
    return 'bg-rose-50 text-rose-700 border-rose-200';
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

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6 md:space-y-8">
      <div className="mb-6 md:mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-slate-800 tracking-tight">Time & Attendance</h1>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Clock In / Out Widget */}
        <Card className="p-8 text-center bg-gradient-to-br from-indigo-50 to-white">
          <Clock size={48} className="mx-auto text-indigo-500 mb-4" />
          <h2 className="text-xl font-bold mb-2">Live Time Clock</h2>
          <p className="text-slate-500 mb-6 text-sm">
            Make sure you are at the office or your clock-in will be flagged.
          </p>
          
          <div className="flex justify-center gap-4">
            <Button 
              onClick={() => handleClockAction('clock-in')}
              disabled={isClockedIn || isClockedOut || loading}
              className="bg-emerald-500 hover:bg-emerald-600 text-white"
            >
              Clock In
            </Button>
            <Button 
              onClick={() => handleClockAction('clock-out')}
              disabled={!isClockedIn || isClockedOut || loading}
              className="bg-rose-500 hover:bg-rose-600 text-white"
            >
              Clock Out
            </Button>
          </div>
          
          {statusMsg && (
            <div className={`mt-4 p-4 text-sm rounded-lg border flex flex-col items-start gap-1 text-left ${statusMsg.includes('Error') ? 'bg-red-50 text-red-600 border-red-200' : 'bg-emerald-50 text-emerald-600 border-emerald-200'}`}>
              <div className="flex gap-2 items-center">
                <span className="font-semibold">{statusMsg.includes('Error') ? 'Error:' : 'Success:'}</span>
                <span>{statusMsg.replace('Error: ', '')}</span>
              </div>
            </div>
          )}

          {todayRecord && (
            <div className="mt-6 p-4 bg-white rounded-lg border border-slate-100 shadow-sm text-left">
              <p className="text-sm text-slate-500 uppercase tracking-wider font-bold mb-2">Today's Status</p>
              <p className="text-slate-800"><span className="font-semibold">In:</span> {new Date(todayRecord.checkIn).toLocaleTimeString()}</p>
              {todayRecord.checkOut && (
                <p className="text-slate-800"><span className="font-semibold">Out:</span> {new Date(todayRecord.checkOut).toLocaleTimeString()}</p>
              )}
              {todayRecord.status === 'Absent' && (
                <p className="text-red-500 font-bold flex items-center gap-1 mt-2">
                  <AlertCircle size={14} /> Flagged: Suspicious Location
                </p>
              )}
            </div>
          )}
        </Card>

        {/* My Recent History */}
        <Card className="p-6">
          <h3 className="text-lg font-bold mb-4">My Recent Logs</h3>
          <div className="space-y-3 max-h-64 overflow-y-auto custom-scrollbar">
            {dataLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="p-3 bg-slate-50 rounded-lg animate-pulse flex justify-between items-center">
                  <div className="space-y-1"><Skeleton className="h-4 w-24" /><Skeleton className="h-3 w-16" /></div>
                  <Skeleton className="h-5 w-16 rounded" />
                </div>
              ))
            ) : myAttendance.length === 0 ? (
              <p className="text-slate-500 text-sm">No attendance records yet.</p>
            ) : (
              myAttendance.map(log => (
                <div key={log.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                  <div>
                    <p className="font-semibold text-slate-800">{new Date(log.date).toLocaleDateString()}</p>
                    <p className="text-xs text-slate-500">{log.workHours.toFixed(1)} hrs logged</p>
                  </div>
                  <div>
                    {log.status === 'Absent' ? (
                      <span className="text-xs font-bold text-red-500 bg-red-50 px-2 py-1 rounded">Flagged</span>
                    ) : (
                      <span className="text-xs font-bold text-emerald-500 bg-emerald-50 px-2 py-1 rounded">Present</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* Admin View: Today's Status Grid */}
      {isAdmin && (
        <Card className="p-6 mt-8">
          <h3 className="text-xl font-bold mb-4">Today's Live Company Status</h3>
          <div className="hidden md:block overflow-x-auto custom-scrollbar">
            <table className="w-full text-left min-w-[750px]">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="pb-3 text-sm font-bold text-slate-400">Employee</th>
                  <th className="pb-3 text-sm font-bold text-slate-400">Clock In</th>
                  <th className="pb-3 text-sm font-bold text-slate-400">Clock Out</th>
                  <th className="pb-3 text-sm font-bold text-slate-400">Status</th>
                  <th className="pb-3 text-sm font-bold text-slate-400">Trust Score</th>
                  <th className="pb-3 text-sm font-bold text-slate-400">Method</th>
                  <th className="pb-3 text-sm font-bold text-slate-400 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {dataLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i} className="border-b border-slate-100 animate-pulse">
                      <td className="py-3"><div className="flex items-center gap-2"><Skeleton className="h-8 w-8 rounded-full" /><Skeleton className="h-4 w-28" /></div></td>
                      <td className="py-3"><Skeleton className="h-4 w-16" /></td>
                      <td className="py-3"><Skeleton className="h-4 w-16" /></td>
                      <td className="py-3"><Skeleton className="h-5 w-16 rounded" /></td>
                      <td className="py-3"><Skeleton className="h-5 w-20 rounded" /></td>
                      <td className="py-3"><Skeleton className="h-4 w-20" /></td>
                      <td className="py-3 text-right"><Skeleton className="h-6 w-20 ml-auto rounded" /></td>
                    </tr>
                  ))
                ) : todayAdminData.length === 0 ? (
                  <tr><td colSpan="7" className="py-4 text-center text-slate-500">No one has clocked in today yet.</td></tr>
                ) : (
                  todayAdminData.map(record => (
                    <tr key={record.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 font-semibold text-slate-800">{record.user.displayName}</td>
                      <td className="py-3 text-sm text-slate-600">{new Date(record.checkIn).toLocaleTimeString()}</td>
                      <td className="py-3 text-sm text-slate-600">{record.checkOut ? new Date(record.checkOut).toLocaleTimeString() : '--:--'}</td>
                      <td className="py-3">
                        {record.status === 'Absent' ? (
                           <span className="text-xs font-bold text-red-500 bg-red-50 px-2.5 py-1 rounded-md border border-red-100">Suspicious Location</span>
                        ) : (
                           <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-100 flex items-center w-max gap-1"><CheckCircle size={14}/> Valid</span>
                        )}
                      </td>
                      <td className="py-3">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-md border ${getTrustBadgeClass(record.trustScore)}`}>
                          {record.trustScore !== null && record.trustScore !== undefined ? `${record.trustScore}%` : 'N/A'}
                        </span>
                      </td>
                      <td className="py-3 text-xs text-slate-500 font-semibold uppercase tracking-wide">
                        {formatMethod(record.verificationMethod)}
                      </td>
                      <td className="py-3 text-right">
                        <Button 
                          onClick={() => setSelectedRecord(record)}
                          className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1 text-xs font-semibold rounded-md border border-slate-200"
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

          {/* Mobile View */}
          <div className="md:hidden flex flex-col gap-4 mt-2">
            {todayAdminData.length === 0 ? (
              <div className="py-4 text-center text-slate-500 text-sm">No one has clocked in today yet.</div>
            ) : (
              todayAdminData.map(record => (
                <div key={record.id} className="bg-white p-4 rounded-xl border border-slate-200/60 shadow-sm flex flex-col gap-3 relative overflow-hidden">
                  <div className={`absolute top-0 left-0 w-1 h-full ${record.status === 'Absent' ? 'bg-red-400' : 'bg-emerald-400'}`}></div>
                  <div className="flex justify-between items-start gap-2">
                    <span className="font-bold text-slate-800 text-base">{record.user.displayName}</span>
                    {record.status === 'Absent' ? (
                      <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-100 shrink-0">Suspicious</span>
                    ) : (
                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 flex items-center gap-1 shrink-0"><CheckCircle size={10}/> Valid</span>
                    )}
                  </div>
                  
                  <div className="bg-slate-50 rounded-lg p-3 grid grid-cols-2 gap-4 border border-slate-100 text-sm">
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Clock In</span>
                      <span className="font-semibold text-slate-700">{new Date(record.checkIn).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Clock Out</span>
                      <span className="font-semibold text-slate-700">{record.checkOut ? new Date(record.checkOut).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--:--'}</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center border-t border-slate-100 pt-3 mt-1">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getTrustBadgeClass(record.trustScore)}`}>
                      Trust: {record.trustScore !== null && record.trustScore !== undefined ? `${record.trustScore}%` : 'N/A'}
                    </span>
                    <button 
                      onClick={() => setSelectedRecord(record)}
                      className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-1 rounded"
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

      {/* Spatial Trust Audit Log Drawer / Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-lg p-6 relative bg-white shadow-xl animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-xl font-bold text-slate-800 mb-1">Spatial Trust Audit Log</h3>
            <p className="text-sm text-slate-500 mb-6">Employee: <span className="font-semibold text-slate-700">{selectedRecord.user.displayName}</span></p>
            
            <div className="space-y-4">
              {/* Metrics Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Trust Score</span>
                  <span className={`text-sm font-bold px-2 py-0.5 rounded border ${getTrustBadgeClass(selectedRecord.trustScore)}`}>
                    {selectedRecord.trustScore ?? 'N/A'}%
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Verification Method</span>
                  <span className="text-sm font-semibold text-slate-700">{formatMethod(selectedRecord.verificationMethod)}</span>
                </div>
              </div>

              {/* GPS Details */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-2.5 text-sm">
                <h4 className="font-bold text-slate-700 text-xs uppercase tracking-wider mb-2">GPS Diagnostics</h4>
                <div className="flex justify-between">
                  <span className="text-slate-500">Coordinates</span>
                  <span className="font-medium text-slate-800">
                    {selectedRecord.latitude?.toFixed(6) ?? 'N/A'}, {selectedRecord.longitude?.toFixed(6) ?? 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Device Accuracy</span>
                  <span className="font-medium text-slate-800">
                    {selectedRecord.accuracy ? `${selectedRecord.accuracy}m` : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Distance from Office</span>
                  <span className="font-medium text-slate-800">
                    {selectedRecord.proxyAlerts?.[0]?.details?.distanceFromOffice !== undefined
                      ? `${selectedRecord.proxyAlerts[0].details.distanceFromOffice}m`
                      : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Calculated Velocity</span>
                  <span className="font-medium text-slate-800">
                    {selectedRecord.proxyAlerts?.[0]?.details?.velocityKmH !== undefined
                      ? `${selectedRecord.proxyAlerts[0].details.velocityKmH} km/h`
                      : 'N/A'}
                  </span>
                </div>
              </div>

              {/* Flags and Reasons */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-sm">
                <h4 className="font-bold text-slate-700 text-xs uppercase tracking-wider mb-2">Flagging Diagnostics</h4>
                <div className="flex justify-between mb-2">
                  <span className="text-slate-500">Is Flagged</span>
                  <span className={`font-bold ${selectedRecord.isFlagged ? 'text-rose-500' : 'text-emerald-500'}`}>
                    {selectedRecord.isFlagged ? 'Yes' : 'No'}
                  </span>
                </div>
                {selectedRecord.flagReason && (
                  <div className="mt-2 p-2.5 bg-rose-50/50 text-rose-700 border border-rose-100 rounded-lg text-xs leading-relaxed">
                    <span className="font-bold">Deductions:</span> {selectedRecord.flagReason}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <Button onClick={() => setSelectedRecord(null)} className="bg-slate-800 hover:bg-slate-700 text-white">
                Close Audit Log
              </Button>
            </div>
          </Card>
        </div>
      )}

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

