import React, { useState, useEffect, useRef } from 'react';
import { API_BASE } from '../../lib/api';
import { 
  AlertTriangle, 
  Clock, 
  User as UserIcon, 
  MapPin, 
  Gauge, 
  Calendar, 
  CheckCircle, 
  Filter, 
  RefreshCw, 
  ShieldAlert,
  X
} from 'lucide-react';
import { Skeleton } from '../../components/ui/Skeleton';
import { motion, AnimatePresence } from 'framer-motion';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

const ProxyAlerts = ({ user }) => {
  const [alerts, setAlerts] = useState([]);
  const [stats, setStats] = useState({
    totalUnresolved: 0,
    severity: { HIGH: 0, MEDIUM: 0, LOW: 0 },
    alertType: { coordinate_proximity: 0, travel_speed: 0, temporal_cluster: 0, identity_embedding_collision: 0 }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Filters
  const [filterResolved, setFilterResolved] = useState('false');
  const [filterSeverity, setFilterSeverity] = useState('');
  const [filterType, setFilterType] = useState('');

  // Selection for bulk actions
  const [selectedIds, setSelectedIds] = useState([]);
  
  // Modal state
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [resolutionValue, setResolutionValue] = useState('dismissed');
  const [resolutionComments, setResolutionComments] = useState('');
  const [submittingResolution, setSubmittingResolution] = useState(false);

  // RBAC checks
  const hasFullAccess = user?.roleDefinition?.level <= 1;

  const containerRef = useRef(null);

  // GSAP Choreographed Intro Sequence
  useGSAP(() => {
    // Only run if not loading and we have data (or empty state)
    if (loading) return;

    const tl = gsap.timeline({ defaults: { ease: "power4.out" } });

    tl.from('.intro-header', {
      y: 30,
      opacity: 0,
      duration: 0.8,
    })
    .from('.intro-kpi', {
      scale: 0.85,
      opacity: 0,
      duration: 0.6,
      stagger: 0.15,
      clearProps: "all" // Allows CSS hover physics to take back over
    }, "-=0.4")
    .from('.intro-filters', {
      opacity: 0,
      y: 15,
      duration: 0.5,
    }, "-=0.2")
    .from('.intro-table-container', {
      opacity: 0,
      duration: 0.4
    }, "-=0.2")
    .from('.intro-row', {
      y: 20,
      opacity: 0,
      duration: 0.5,
      stagger: 0.05,
      clearProps: "all"
    }, "-=0.2");

    // Continuous Pulse for High Severity
    gsap.to('.gsap-pulse', {
      scale: 1.05,
      opacity: 0.1, // fade down
      duration: 1.5,
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut"
    });

  }, { dependencies: [loading], scope: containerRef });

  useEffect(() => {
    fetchData();
  }, [filterResolved, filterSeverity, filterType]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    const token = localStorage.getItem('token');

    const params = new URLSearchParams();
    if (filterResolved) params.append('resolved', filterResolved);
    if (filterSeverity) params.append('severity', filterSeverity);
    if (filterType) params.append('alertType', filterType);

    try {
      const [alertsRes, statsRes] = await Promise.all([
        fetch(`${API_BASE}/api/proxy-alerts?${params.toString()}`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API_BASE}/api/proxy-alerts/stats`, { headers: { 'Authorization': `Bearer ${token}` } })
      ]);

      if (alertsRes.ok) {
        const dataAlerts = await alertsRes.json();
        setAlerts(Array.isArray(dataAlerts) ? dataAlerts : []);
      } else {
        setAlerts([]);
      }

      if (statsRes.ok) {
        setStats(await statsRes.json());
      }
    } catch (err) {
      console.warn('Failed to fetch proxy alerts data:', err.message);
      setAlerts([]);
    }

    setLoading(false);
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(alerts.filter(a => !a.resolved).map(a => a.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleResolveSubmit = async (e) => {
    e.preventDefault();
    if (!selectedAlert) return;
    setSubmittingResolution(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/proxy-alerts/${selectedAlert.id}/resolve`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          resolution: resolutionValue,
          comments: resolutionComments
        })
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to resolve alert');
      }
      
      // Optically remove alert from local state if filter is unresolved
      if (filterResolved === 'false') {
        setAlerts(prev => prev.filter(a => a.id !== selectedAlert.id));
      }
      
      setSelectedAlert(null);
      setResolutionComments('');
      fetchData(); // Update stats
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmittingResolution(false);
    }
  };

  const handleBulkDismiss = async () => {
    if (selectedIds.length === 0) return;
    if (!await window.confirmDialog()) return;

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/proxy-alerts/bulk-dismiss`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ids: selectedIds,
          resolution: 'dismissed',
          comments: 'Bulk dismissed by auditor'
        })
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to bulk dismiss');
      }
      
      if (filterResolved === 'false') {
        setAlerts(prev => prev.filter(a => !selectedIds.includes(a.id)));
      }
      setSelectedIds([]);
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  const formatAlertType = (type) => {
    const map = {
      coordinate_proximity: 'Proximity Collision',
      travel_speed: 'Travel Speed Anomaly',
      temporal_cluster: 'Temporal Cluster',
      identity_embedding_collision: 'Face Collision'
    };
    return map[type] || type;
  };

  const getAlertTypeIcon = (type) => {
    switch (type) {
      case 'coordinate_proximity':
        return <MapPin className="text-[#B91C1C]" size={16} />;
      case 'travel_speed':
        return <Gauge className="text-[#B5793A]" size={16} />;
      case 'temporal_cluster':
        return <Clock className="text-[#1F2B4D]" size={16} />;
      case 'identity_embedding_collision':
        return <ShieldAlert className="text-[#B91C1C]" size={16} />;
      default:
        return <AlertTriangle className="text-[#6B655C]" size={16} />;
    }
  };

  // Framer Motion variants for AnimatePresence row exits & modal
  const itemVariants = {
    exit: { 
      opacity: 0, 
      height: 0, 
      y: -10,
      transition: { duration: 0.3 }
    }
  };

  const modalVariants = {
    hidden: { opacity: 0, scale: 0.95, y: 20 },
    visible: { 
      opacity: 1, 
      scale: 1, 
      y: 0,
      transition: { type: 'spring', stiffness: 260, damping: 25 }
    },
    exit: { 
      opacity: 0, 
      scale: 0.95, 
      y: 10,
      transition: { duration: 0.2, ease: "easeInOut" }
    }
  };

  return (
    <div ref={containerRef} className="p-4 md:p-8 lg:p-12 min-h-screen bg-[#FAF9F6] flex flex-col gap-6 md:gap-8 overflow-x-hidden">
      
      {/* Title Header */}
      <div className="intro-header flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-[28px] font-bold text-[#1D1B16] tracking-tight flex items-center gap-3">
            <ShieldAlert size={28} className="text-[#1F2B4D]" /> Fraud Alerts Console
          </h1>
          <p className="text-[#6B655C] mt-1 text-sm font-medium">
            Systematic detection and audit logs for buddy-punching, geo-spoofing, and proxy attendance.
          </p>
        </div>
        
        <button
          onClick={fetchData}
          className="relative overflow-hidden group flex items-center gap-2 bg-white border border-[#EAE7E0] text-[#1D1B16] px-5 py-2.5 rounded-xl font-bold shadow-xs transition-all duration-300 hover:border-[#1F2B4D] active:scale-95 whitespace-nowrap"
        >
          <span className="absolute inset-0 bg-[#1F2B4D] translate-y-[100%] group-hover:translate-y-0 transition-transform duration-500 cubic-bezier(0.34, 1.56, 0.64, 1) z-0" />
          <RefreshCw size={16} className="relative z-10 text-[#1F2B4D] group-hover:text-white transition-colors duration-300" />
          <span className="relative z-10 group-hover:text-white transition-colors duration-300">Refresh Data</span>
        </button>
      </div>

      {/* Stats Board (KPI Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="intro-kpi double-bezel-outer bg-[#F4F1EA] p-1.5 group hover:-translate-y-[2px] transition-transform duration-500 cubic-bezier(0.34, 1.56, 0.64, 1)">
          <div className="double-bezel-inner bg-white h-full p-5 flex flex-col justify-between">
            <span className="text-[11px] font-bold text-[#6B655C] uppercase tracking-wider mb-2">Unresolved Alerts</span>
            <span className="text-3xl font-extrabold text-[#1F2B4D]">{stats.totalUnresolved}</span>
          </div>
        </div>
        
        {/* Dynamic Pulse for High Severity */}
        <div className="intro-kpi relative group">
          {stats.severity.HIGH > 0 && (
            <div className="gsap-pulse absolute inset-0 bg-[#B91C1C] rounded-[24px] blur-md opacity-30" />
          )}
          <div className="double-bezel-outer bg-[#F4F1EA] p-1.5 h-full relative z-10 hover:-translate-y-[2px] transition-transform duration-500 cubic-bezier(0.34, 1.56, 0.64, 1)">
            <div className="double-bezel-inner bg-white h-full p-5 flex flex-col justify-between">
              <span className="text-[11px] font-bold text-[#9A948A] uppercase tracking-wider mb-2">High Severity</span>
              <span className="text-3xl font-extrabold text-[#B91C1C]">{stats.severity.HIGH}</span>
            </div>
          </div>
        </div>
        
        <div className="intro-kpi double-bezel-outer bg-[#F4F1EA] p-1.5 group hover:-translate-y-[2px] transition-transform duration-500 cubic-bezier(0.34, 1.56, 0.64, 1)">
          <div className="double-bezel-inner bg-white h-full p-5 flex flex-col justify-between">
            <span className="text-[11px] font-bold text-[#9A948A] uppercase tracking-wider mb-2">Medium Severity</span>
            <span className="text-3xl font-extrabold text-[#B5793A]">{stats.severity.MEDIUM}</span>
          </div>
        </div>

        <div className="intro-kpi double-bezel-outer bg-[#F4F1EA] p-1.5 group hover:-translate-y-[2px] transition-transform duration-500 cubic-bezier(0.34, 1.56, 0.64, 1)">
          <div className="double-bezel-inner bg-white h-full p-5 flex flex-col justify-between">
            <span className="text-[11px] font-bold text-[#9A948A] uppercase tracking-wider mb-2">Low Severity</span>
            <span className="text-3xl font-extrabold text-[#065F46]">{stats.severity.LOW}</span>
          </div>
        </div>
      </div>

      {error && <div className="text-[#B91C1C] bg-[#FEF2F2] p-4 rounded-xl border border-[#FECACA] font-bold text-[13px]">{error}</div>}

      {/* Filters & Actions Panel */}
      <div className="intro-filters bg-white border border-[#EAE7E0] p-4 rounded-[20px] shadow-sm flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 text-[11px] font-bold text-[#6B655C] uppercase tracking-wider">
            <Filter size={16} /> Filter:
          </div>
          
          <select 
            value={filterResolved} 
            onChange={(e) => setFilterResolved(e.target.value)}
            className="text-[13px] font-bold text-[#1D1B16] bg-[#FAF9F6] border border-[#EAE7E0] rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#1F2B4D] transition-all appearance-none pr-8 bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2224%22%20height%3D%2224%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20stroke%3D%22%236B655C%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-[length:16px_16px] bg-[right_12px_center] bg-no-repeat"
          >
            <option value="false">Unresolved Only</option>
            <option value="true">Resolved Only</option>
            <option value="">All Alerts</option>
          </select>

          <select 
            value={filterSeverity} 
            onChange={(e) => setFilterSeverity(e.target.value)}
            className="text-[13px] font-bold text-[#1D1B16] bg-[#FAF9F6] border border-[#EAE7E0] rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#1F2B4D] transition-all appearance-none pr-8 bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2224%22%20height%3D%2224%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20stroke%3D%22%236B655C%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-[length:16px_16px] bg-[right_12px_center] bg-no-repeat"
          >
            <option value="">All Severities</option>
            <option value="HIGH">High Only</option>
            <option value="MEDIUM">Medium Only</option>
            <option value="LOW">Low Only</option>
          </select>

          <select 
            value={filterType} 
            onChange={(e) => setFilterType(e.target.value)}
            className="text-[13px] font-bold text-[#1D1B16] bg-[#FAF9F6] border border-[#EAE7E0] rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#1F2B4D] transition-all appearance-none pr-8 bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2224%22%20height%3D%2224%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20stroke%3D%22%236B655C%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-[length:16px_16px] bg-[right_12px_center] bg-no-repeat"
          >
            <option value="">All Types</option>
            <option value="coordinate_proximity">Proximity Collision</option>
            <option value="travel_speed">Travel Speed</option>
            <option value="temporal_cluster">Temporal Cluster</option>
            <option value="identity_embedding_collision">Face Collision</option>
          </select>
        </div>

        {/* Bulk Resolve Action */}
        {hasFullAccess && filterResolved === 'false' && selectedIds.length > 0 && (
          <button
            onClick={handleBulkDismiss}
            className="relative overflow-hidden group flex items-center justify-center gap-2 bg-[#1F2B4D] border border-[#141C33] text-white px-5 py-2.5 rounded-xl font-bold shadow-md transition-all duration-300 active:scale-95 whitespace-nowrap"
          >
            <span className="relative z-10 text-white">Bulk Dismiss ({selectedIds.length})</span>
          </button>
        )}
      </div>

      {/* Alerts List Table inside Doppelrand */}
      <div className="intro-table-container double-bezel-outer bg-[#F4F1EA] p-1.5 flex-1 flex flex-col">
        <div className="double-bezel-inner bg-white flex-1 p-0 flex flex-col overflow-hidden">
          <div className="overflow-x-auto custom-scrollbar flex-1">
            <table className="w-full text-left min-w-[1000px]">
              <thead className="border-b border-[#EAE7E0] bg-[#FAF9F6]">
                <tr>
                  {hasFullAccess && filterResolved === 'false' && (
                    <th className="py-4 px-4 w-12 text-center">
                      <input 
                        type="checkbox" 
                        onChange={handleSelectAll}
                        checked={alerts.length > 0 && selectedIds.length === alerts.filter(a => !a.resolved).length}
                        className="w-4 h-4 rounded border-[#EAE7E0] text-[#1F2B4D] focus:ring-[#1F2B4D]"
                      />
                    </th>
                  )}
                  <th className="py-4 px-4 text-[11px] font-bold text-[#9A948A] uppercase tracking-wider">Date & Timestamp</th>
                  <th className="py-4 px-4 text-[11px] font-bold text-[#9A948A] uppercase tracking-wider">Type / Severity</th>
                  <th className="py-4 px-4 text-[11px] font-bold text-[#9A948A] uppercase tracking-wider">Suspect (A)</th>
                  <th className="py-4 px-4 text-[11px] font-bold text-[#9A948A] uppercase tracking-wider">Colliding (B)</th>
                  <th className="py-4 px-4 text-[11px] font-bold text-[#9A948A] uppercase tracking-wider">Reason Diagnostics</th>
                  <th className="py-4 px-4 text-[11px] font-bold text-[#9A948A] uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F4F1EA]">
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="p-4"><Skeleton className="h-4 w-4 bg-[#EAE7E0]" /></td>
                      <td className="p-4"><Skeleton className="h-6 w-16 bg-[#EAE7E0] rounded-full" /></td>
                      <td className="p-4"><Skeleton className="h-4 w-24 bg-[#EAE7E0]" /></td>
                      <td className="p-4"><Skeleton className="h-4 w-24 bg-[#EAE7E0]" /></td>
                      <td className="p-4"><Skeleton className="h-4 w-24 bg-[#EAE7E0]" /></td>
                      <td className="p-4"><Skeleton className="h-4 w-40 bg-[#EAE7E0]" /></td>
                      <td className="p-4 text-right"><Skeleton className="h-8 w-20 ml-auto rounded-lg bg-[#EAE7E0]" /></td>
                    </tr>
                  ))
                ) : alerts.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="py-20 text-center">
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex flex-col items-center gap-4"
                      >
                        <motion.div 
                          animate={{ y: [0, -10, 0] }}
                          transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                          className="w-20 h-20 rounded-full bg-[#ECFDF5] border border-[#A7F3D0] shadow-sm flex items-center justify-center"
                        >
                          <CheckCircle size={32} className="text-[#10B981]" />
                        </motion.div>
                        <div>
                          <span className="text-[19px] font-bold text-[#1D1B16] block tracking-tight">All Clear — No Anomalies Detected</span>
                          <span className="text-[13px] text-[#6B655C] font-medium mt-1 block">No proxy or fraud alerts match the current filters. The system is clean.</span>
                        </div>
                      </motion.div>
                    </td>
                  </tr>
                ) : (
                  <AnimatePresence>
                    {alerts.map(alert => (
                      <motion.tr 
                        key={alert.id} 
                        variants={itemVariants}
                        exit="exit"
                        layout
                        className="intro-row hover:bg-[#FAF9F6] transition-colors"
                      >
                        {hasFullAccess && filterResolved === 'false' && (
                          <td className="p-4 text-center align-middle">
                            {!alert.resolved ? (
                              <input 
                                type="checkbox" 
                                checked={selectedIds.includes(alert.id)}
                                onChange={() => handleSelectOne(alert.id)}
                                className="w-4 h-4 rounded border-[#EAE7E0] text-[#1F2B4D] focus:ring-[#1F2B4D]"
                              />
                            ) : '-'}
                          </td>
                        )}
                        <td className="py-4 px-4 text-[13.5px] text-[#6B655C] font-medium align-middle">
                          <div className="flex items-center gap-2">
                            <Calendar size={14} className="text-[#9A948A]" />
                            {new Date(alert.attendanceDate).toLocaleDateString()}
                          </div>
                          <div className="text-[11px] text-[#9A948A] mt-1 uppercase tracking-wider font-bold">
                            Triggered: {new Date(alert.createdAt).toLocaleString(undefined, { hour: 'numeric', minute: '2-digit', hour12: true })}
                          </div>
                        </td>
                        <td className="py-4 px-4 align-middle">
                          <div className="flex items-center gap-2 text-[13.5px] font-bold text-[#1D1B16]">
                            {getAlertTypeIcon(alert.alertType)}
                            {formatAlertType(alert.alertType)}
                          </div>
                          <span className={`inline-block px-2.5 py-1 mt-2 rounded-[6px] text-[10px] font-bold uppercase tracking-wider border shadow-xs ${
                            alert.severity === 'HIGH' ? 'bg-[#FEF2F2] text-[#B91C1C] border-[#FECACA]' :
                            alert.severity === 'MEDIUM' ? 'bg-[#FDF8F3] text-[#8C5722] border-[#EEDCCE]' :
                            'bg-[#F0F3F9] text-[#1F2B4D] border-[#EAE7E0]'
                          }`}>
                            {alert.severity}
                          </span>
                        </td>
                        <td className="py-4 px-4 align-middle">
                          {alert.user ? (
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-[#FAF9F6] border border-[#EAE7E0] flex items-center justify-center font-bold text-xs text-[#6B655C] overflow-hidden shrink-0 shadow-sm">
                                {alert.user.avatar ? <img src={alert.user.avatar} alt="A" className="object-cover w-full h-full" /> : <UserIcon size={14} />}
                              </div>
                              <div className="flex flex-col min-w-0">
                                <span className="font-bold text-[#1D1B16] text-[13.5px] truncate">{alert.user.displayName}</span>
                                <span className="text-[11px] text-[#9A948A] font-bold uppercase tracking-wider mt-0.5">ID: {alert.user.employeeId}</span>
                              </div>
                            </div>
                          ) : (
                            <span className="text-[13.5px] text-[#9A948A] font-medium">Unknown User</span>
                          )}
                        </td>
                        <td className="py-4 px-4 align-middle">
                          {alert.targetUser ? (
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-[#FAF9F6] border border-[#EAE7E0] flex items-center justify-center font-bold text-xs text-[#6B655C] overflow-hidden shrink-0 shadow-sm">
                                {alert.targetUser.avatar ? <img src={alert.targetUser.avatar} alt="B" className="object-cover w-full h-full" /> : <UserIcon size={14} />}
                              </div>
                              <div className="flex flex-col min-w-0">
                                <span className="font-bold text-[#1D1B16] text-[13.5px] truncate">{alert.targetUser.displayName}</span>
                                <span className="text-[11px] text-[#9A948A] font-bold uppercase tracking-wider mt-0.5">ID: {alert.targetUser.employeeId}</span>
                              </div>
                            </div>
                          ) : (
                            <span className="text-[13px] text-[#9A948A] italic">Self Check-in</span>
                          )}
                        </td>
                        <td className="py-4 px-4 text-[13.5px] text-[#6B655C] font-medium max-w-[280px] align-middle">
                          <div className="line-clamp-2 leading-relaxed" title={alert.reason}>{alert.reason}</div>
                        </td>
                        <td className="py-4 px-4 text-right align-middle">
                          {!alert.resolved ? (
                            hasFullAccess ? (
                              <button 
                                onClick={() => setSelectedAlert(alert)}
                                className="bg-[#1F2B4D] hover:bg-[#141C33] text-white text-[11px] font-bold uppercase tracking-wider px-4 py-2 rounded-[10px] shadow-sm transition-all active:scale-95"
                              >
                                Resolve
                              </button>
                            ) : (
                              <span className="text-[11px] text-[#9A948A] italic font-bold uppercase tracking-wider">Unresolved</span>
                            )
                          ) : (
                            <div className="flex flex-col items-end gap-1.5">
                              <span className="text-[10px] font-bold text-[#065F46] bg-[#ECFDF5] px-2.5 py-1 rounded-[6px] border border-[#A7F3D0] uppercase tracking-wider inline-flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" /> Resolved
                              </span>
                              <span className="text-[10px] text-[#9A948A] font-bold tracking-wide" title={alert.resolvedBy}>
                                BY {alert.resolvedBy?.substring(0, 10).toUpperCase()}...
                              </span>
                            </div>
                          )}
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Premium Resolution Dialog / Modal */}
      <AnimatePresence>
        {selectedAlert && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-[#0F172A]/40 backdrop-blur-md"
              onClick={() => setSelectedAlert(null)}
            />
            
            <motion.div 
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="relative w-full max-w-lg bg-white rounded-[24px] shadow-2xl border border-[#EAE7E0] overflow-hidden"
            >
              <div className="flex items-center justify-between p-6 border-b border-[#F4F1EA] bg-[#FAF9F6]">
                <h2 className="text-xl font-bold text-[#1D1B16] tracking-tight">Audit Alert Resolution</h2>
                <button 
                  onClick={() => setSelectedAlert(null)}
                  className="p-1.5 text-[#9A948A] hover:text-[#1D1B16] hover:bg-[#EAE7E0] rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6">
                <p className="text-[13.5px] text-[#6B655C] mb-6 font-medium bg-[#F4F1EA] p-4 rounded-xl border border-[#EAE7E0]">
                  Resolving alert: <span className="font-bold text-[#1D1B16]">{formatAlertType(selectedAlert.alertType)}</span> for <span className="font-bold text-[#1D1B16]">{selectedAlert.user?.displayName}</span>
                </p>

                <form onSubmit={handleResolveSubmit} className="space-y-5">
                  <div>
                    <label className="text-[11px] font-bold text-[#6B655C] uppercase tracking-wider block mb-2">Resolution Type</label>
                    <select 
                      value={resolutionValue}
                      onChange={(e) => setResolutionValue(e.target.value)}
                      className="w-full text-[13.5px] font-bold text-[#1D1B16] bg-[#FAF9F6] border border-[#EAE7E0] rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#1F2B4D] transition-all appearance-none"
                    >
                      <option value="dismissed">Dismissed (Safe / Legitimate exception)</option>
                      <option value="confirmed_fraud">Confirmed Fraud (Time-theft confirmed)</option>
                      <option value="false_positive">False Positive (Technical glitch)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-[#6B655C] uppercase tracking-wider block mb-2">Auditor Comments</label>
                    <textarea 
                      value={resolutionComments}
                      onChange={(e) => setResolutionComments(e.target.value)}
                      placeholder="Enter detailed audit findings or reason for resolving..."
                      required
                      rows={4}
                      className="w-full text-[13.5px] font-medium text-[#1D1B16] bg-[#FAF9F6] border border-[#EAE7E0] rounded-xl p-4 focus:outline-none focus:ring-2 focus:ring-[#1F2B4D] transition-all resize-none placeholder:text-[#9A948A]"
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-2">
                    <button 
                      type="button" 
                      onClick={() => setSelectedAlert(null)}
                      className="flex-1 px-4 py-3 border border-[#EAE7E0] bg-white text-[#1D1B16] font-bold rounded-xl hover:bg-[#FAF9F6] transition-colors active:scale-95"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit" 
                      disabled={submittingResolution}
                      className="flex-1 px-4 py-3 bg-[#1F2B4D] text-white font-bold rounded-xl shadow-md hover:bg-[#141C33] hover:shadow-lg transition-all active:scale-95 disabled:opacity-50"
                    >
                      {submittingResolution ? 'Submitting...' : 'Complete Resolve'}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default ProxyAlerts;
