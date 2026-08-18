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
import IrisInvestigation from '../../components/IrisInvestigation';

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
  const [viewingReport, setViewingReport] = useState(null);
  const [resolutionValue, setResolutionValue] = useState('dismissed');
  const [resolutionComments, setResolutionComments] = useState('');
  const [submittingResolution, setSubmittingResolution] = useState(false);

  // RBAC checks
  const hasFullAccess = user?.roleDefinition?.level <= 1;

  const containerRef = useRef(null);

  // GSAP Choreographed Intro Sequence (Safely Guarded Target Selectors)
  useGSAP(() => {
    if (loading) return;

    const container = containerRef.current;
    if (!container) return;

    const introHeader = container.querySelector('.intro-header');
    const introKpi = container.querySelectorAll('.intro-kpi');
    const introFilters = container.querySelector('.intro-filters');
    const introTableContainer = container.querySelector('.intro-table-container');
    const introRows = container.querySelectorAll('.intro-row');
    const gsapPulse = container.querySelectorAll('.gsap-pulse');

    const tl = gsap.timeline({ defaults: { ease: "power4.out" } });

    if (introHeader) tl.from(introHeader, { y: 30, opacity: 0, duration: 0.8 });
    if (introKpi.length > 0) tl.from(introKpi, { scale: 0.85, opacity: 0, duration: 0.6, stagger: 0.15, clearProps: "all" }, "-=0.4");
    if (introFilters) tl.from(introFilters, { opacity: 0, y: 15, duration: 0.5 }, "-=0.2");
    if (introTableContainer) tl.from(introTableContainer, { opacity: 0, duration: 0.4 }, "-=0.2");
    if (introRows.length > 0) tl.from(introRows, { y: 20, opacity: 0, duration: 0.5, stagger: 0.05, clearProps: "all" }, "-=0.2");

    // Continuous Pulse for High Severity (only if high severity pulse elements exist)
    if (gsapPulse.length > 0) {
      gsap.to(gsapPulse, {
        scale: 1.05,
        opacity: 0.1,
        duration: 1.5,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut"
      });
    }

  }, { dependencies: [loading], scope: containerRef });

  useEffect(() => {
    fetchData();
  }, [filterResolved, filterSeverity, filterType]);

  useEffect(() => {
    const handleChatbotDone = () => {
      fetchData();
    };
    window.addEventListener('chatbot-done', handleChatbotDone);
    return () => window.removeEventListener('chatbot-done', handleChatbotDone);
  }, []);

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
    <div ref={containerRef} className="w-full min-h-full flex flex-col gap-3.5 sm:gap-4 p-3 sm:p-5 md:p-6 bg-[#FAF9F6]">
      
      {/* ── TOP EXECUTIVE HEADER ── */}
      <div className="intro-header flex flex-col min-[600px]:flex-row min-[600px]:items-center justify-between gap-2.5 pb-3 border-b border-[#EAE7E0] w-full">
        <div>
          <h1 className="font-serif font-bold text-lg sm:text-2xl md:text-3xl text-[#1F2B4D] tracking-tight leading-tight flex items-center gap-2.5">
            <div className="p-1.5 bg-white rounded-xl shadow-2xs border border-[#EAE7E0]">
              <ShieldAlert className="text-[#1F2B4D] w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <span>Fraud Alerts & Proxy Audit</span>
          </h1>
          <p className="text-[#6B655C] mt-0.5 text-xs sm:text-sm font-medium">
            Systematic detection and audit logs for buddy-punching, geo-spoofing, and proxy attendance.
          </p>
        </div>
        
        {/* Sweep Animation Refresh Button */}
        <button
          type="button"
          onClick={fetchData}
          className="relative overflow-hidden group inline-flex items-center justify-center gap-1.5 bg-white border border-[#EAE7E0] text-[#1F2B4D] px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs font-display font-bold uppercase tracking-wider shadow-2xs transition-all duration-300 hover:border-[#1F2B4D] active:scale-95 whitespace-nowrap shrink-0 w-full min-[600px]:w-auto"
        >
          <span className="absolute inset-0 bg-[#1F2B4D] translate-y-[100%] group-hover:translate-y-0 transition-transform duration-500 cubic-bezier(0.34, 1.56, 0.64, 1) z-0" />
          <RefreshCw size={15} className="relative z-10 text-[#1F2B4D] group-hover:text-white transition-colors duration-300 shrink-0" />
          <span className="relative z-10 group-hover:text-white transition-colors duration-300">Refresh Data</span>
        </button>
      </div>

      {/* ── STATS BOARD (2x2 MOBILE / 4x1 DESKTOP) ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5 w-full">
        <div className="intro-kpi bg-white p-3.5 sm:p-4 rounded-2xl border border-[#EAE7E0] shadow-2xs flex flex-col justify-between">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[9.5px] sm:text-[10.5px] font-display font-bold uppercase tracking-wider text-[#6B655C]">Unresolved</span>
            <div className="p-1.5 bg-[#FAF8F5] rounded-xl border border-[#EAE7E0] text-[#1F2B4D]">
              <AlertTriangle size={16} />
            </div>
          </div>
          <span className="text-xl sm:text-2xl font-bold text-[#1F2B4D] tracking-tight">{stats.totalUnresolved}</span>
        </div>
        
        {/* Dynamic Pulse for High Severity */}
        <div className="intro-kpi relative group">
          {stats.severity.HIGH > 0 && (
            <div className="gsap-pulse absolute inset-0 bg-[#B91C1C] rounded-2xl blur-xs opacity-20" />
          )}
          <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-[#EAE7E0] shadow-2xs h-full relative z-10 flex flex-col justify-between">
            <div className="flex justify-between items-start mb-2">
              <span className="text-[9.5px] sm:text-[10.5px] font-display font-bold uppercase tracking-wider text-rose-700">High Severity</span>
              <div className="p-1.5 bg-rose-50 rounded-xl border border-rose-200 text-rose-700">
                <ShieldAlert size={16} />
              </div>
            </div>
            <span className="text-xl sm:text-2xl font-bold text-rose-700 tracking-tight">{stats.severity.HIGH}</span>
          </div>
        </div>
        
        <div className="intro-kpi bg-white p-3.5 sm:p-4 rounded-2xl border border-[#EAE7E0] shadow-2xs flex flex-col justify-between">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[9.5px] sm:text-[10.5px] font-display font-bold uppercase tracking-wider text-amber-700">Medium Severity</span>
            <div className="p-1.5 bg-amber-50 rounded-xl border border-amber-200 text-amber-700">
              <Clock size={16} />
            </div>
          </div>
          <span className="text-xl sm:text-2xl font-bold text-amber-700 tracking-tight">{stats.severity.MEDIUM}</span>
        </div>

        <div className="intro-kpi bg-white p-3.5 sm:p-4 rounded-2xl border border-[#EAE7E0] shadow-2xs flex flex-col justify-between">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[9.5px] sm:text-[10.5px] font-display font-bold uppercase tracking-wider text-emerald-700">Low Severity</span>
            <div className="p-1.5 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-700">
              <CheckCircle size={16} />
            </div>
          </div>
          <span className="text-xl sm:text-2xl font-bold text-emerald-700 tracking-tight">{stats.severity.LOW}</span>
        </div>
      </div>

      {error && <div className="text-rose-700 bg-rose-50 p-3 rounded-xl border border-rose-200 font-bold text-xs">{error}</div>}

      {/* ── FILTERS & ACTIONS PANEL ── */}
      <div className="intro-filters bg-white border border-[#EAE7E0] p-2.5 sm:p-3 rounded-2xl shadow-2xs flex flex-col min-[600px]:flex-row justify-between items-stretch min-[600px]:items-center gap-2 w-full">
        <div className="grid grid-cols-1 min-[440px]:grid-cols-3 gap-2 flex-1 w-full">
          <select 
            value={filterResolved} 
            onChange={(e) => setFilterResolved(e.target.value)}
            className="text-xs font-bold text-[#1F2B4D] bg-[#FAF8F5] border border-[#EAE7E0] rounded-xl px-3 py-1.5 focus:ring-2 focus:ring-[#1F2B4D] w-full"
          >
            <option value="false">Unresolved Only</option>
            <option value="true">Resolved Only</option>
            <option value="">All Alerts</option>
          </select>

          <select 
            value={filterSeverity} 
            onChange={(e) => setFilterSeverity(e.target.value)}
            className="text-xs font-bold text-[#1F2B4D] bg-[#FAF8F5] border border-[#EAE7E0] rounded-xl px-3 py-1.5 focus:ring-2 focus:ring-[#1F2B4D] w-full"
          >
            <option value="">All Severities</option>
            <option value="HIGH">High Only</option>
            <option value="MEDIUM">Medium Only</option>
            <option value="LOW">Low Only</option>
          </select>

          <select 
            value={filterType} 
            onChange={(e) => setFilterType(e.target.value)}
            className="text-xs font-bold text-[#1F2B4D] bg-[#FAF8F5] border border-[#EAE7E0] rounded-xl px-3 py-1.5 focus:ring-2 focus:ring-[#1F2B4D] w-full"
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
            type="button"
            onClick={handleBulkDismiss}
            className="bg-[#1F2B4D] hover:bg-[#141C33] text-white px-3.5 py-1.5 rounded-xl text-xs font-display font-bold uppercase tracking-wider shadow-2xs whitespace-nowrap shrink-0 w-full min-[600px]:w-auto"
          >
            <span>Bulk Dismiss ({selectedIds.length})</span>
          </button>
        )}
      </div>

      {/* ── ALERTS CONTAINER (FLEX-1 FULL SCREEN FULFILLMENT) ── */}
      <div className="intro-table-container double-bezel-outer bg-[#F4F1EA] p-1 rounded-2xl flex-1 flex flex-col w-full">
        <div className="double-bezel-inner bg-white rounded-xl flex-1 p-3 sm:p-4 flex flex-col overflow-hidden w-full">
          
          {/* Desktop Table View */}
          <div className="hidden lg:block overflow-hidden flex-1 w-full">
            <table className="w-full table-fixed text-left border-collapse">
              <thead>
                <tr className="border-b border-[#EAE7E0] text-[9.5px] font-display font-bold text-[#6B655C] uppercase tracking-wider">
                  {hasFullAccess && filterResolved === 'false' && (
                    <th className="pb-2.5 w-[4%] text-center pl-2">
                      <input 
                        type="checkbox" 
                        onChange={handleSelectAll}
                        checked={alerts.length > 0 && selectedIds.length === alerts.filter(a => !a.resolved).length}
                        className="w-3.5 h-3.5 rounded border-[#CBD5E1] text-[#1F2B4D] focus:ring-[#1F2B4D]"
                      />
                    </th>
                  )}
                  <th className="pb-2.5 pl-2 w-[15%]">Timestamp</th>
                  <th className="pb-2.5 w-[15%]">Type / Severity</th>
                  <th className="pb-2.5 w-[18%]">Suspect (A)</th>
                  <th className="pb-2.5 w-[18%]">Colliding (B)</th>
                  <th className="pb-2.5 w-[20%]">Reason Diagnostics</th>
                  <th className="pb-2.5 text-right pr-2 w-[10%]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F4F1EA] text-xs">
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="p-3"><Skeleton className="h-4 w-4 bg-[#EAE7E0]" /></td>
                      <td className="p-3"><Skeleton className="h-4 w-20 bg-[#EAE7E0]" /></td>
                      <td className="p-3"><Skeleton className="h-4 w-24 bg-[#EAE7E0]" /></td>
                      <td className="p-3"><Skeleton className="h-4 w-28 bg-[#EAE7E0]" /></td>
                      <td className="p-3"><Skeleton className="h-4 w-28 bg-[#EAE7E0]" /></td>
                      <td className="p-3"><Skeleton className="h-4 w-36 bg-[#EAE7E0]" /></td>
                      <td className="p-3 text-right"><Skeleton className="h-6 w-16 ml-auto bg-[#EAE7E0]" /></td>
                    </tr>
                  ))
                ) : alerts.length === 0 ? (
                  <tr>
                    <td colSpan={hasFullAccess && filterResolved === 'false' ? 7 : 6} className="py-12 text-center">
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex flex-col items-center gap-2"
                      >
                        <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shadow-2xs">
                          <CheckCircle size={24} />
                        </div>
                        <h3 className="font-serif font-bold text-base text-[#1F2B4D]">All Clear — No Anomalies Detected</h3>
                        <p className="text-xs text-[#6B655C] font-medium max-w-xs">
                          No proxy or fraud alerts match the current filters. The system is clean.
                        </p>
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
                          <td className="py-2.5 text-center pl-2">
                            {!alert.resolved ? (
                              <input 
                                type="checkbox" 
                                checked={selectedIds.includes(alert.id)}
                                onChange={() => handleSelectOne(alert.id)}
                                className="w-3.5 h-3.5 rounded border-[#CBD5E1] text-[#1F2B4D] focus:ring-[#1F2B4D]"
                              />
                            ) : '-'}
                          </td>
                        )}
                        <td className="py-2.5 pl-2 text-xs text-[#6B655C] font-medium">
                          <div className="flex items-center gap-1 text-[#1F2B4D] font-bold">
                            <Calendar size={13} className="text-[#6B655C] shrink-0" />
                            <span className="truncate">{new Date(alert.attendanceDate).toLocaleDateString('en-IN')}</span>
                          </div>
                          <div className="text-[9.5px] text-[#6B655C] font-mono uppercase tracking-wider mt-0.5">
                            {new Date(alert.createdAt).toLocaleString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true })}
                          </div>
                        </td>
                        <td className="py-2.5">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-[#1F2B4D] truncate">
                            {getAlertTypeIcon(alert.alertType)}
                            <span className="truncate">{formatAlertType(alert.alertType)}</span>
                          </div>
                          <span className={`inline-block px-2 py-0.5 mt-1 rounded-md text-[8.5px] font-display font-bold uppercase tracking-wider border shadow-2xs ${
                            alert.severity === 'HIGH' ? 'bg-rose-50 text-rose-800 border-rose-200' :
                            alert.severity === 'MEDIUM' ? 'bg-amber-50 text-amber-800 border-amber-200' :
                            'bg-indigo-50 text-indigo-800 border-indigo-200'
                          }`}>
                            {alert.severity}
                          </span>
                        </td>
                        <td className="py-2.5">
                          {alert.user ? (
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="w-7 h-7 rounded-full bg-[#FAF8F5] border border-[#EAE7E0] flex items-center justify-center font-bold text-[10px] text-[#1F2B4D] overflow-hidden shrink-0">
                                {alert.user.avatar ? <img src={alert.user.avatar} alt="A" className="object-cover w-full h-full" /> : <UserIcon size={12} />}
                              </div>
                              <div className="flex flex-col min-w-0">
                                <span className="font-bold text-[#1F2B4D] text-xs truncate">{alert.user.displayName}</span>
                                <span className="text-[9px] text-[#6B655C] font-mono uppercase">ID: {alert.user.employeeId}</span>
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-[#6B655C] italic">Unknown</span>
                          )}
                        </td>
                        <td className="py-2.5">
                          {alert.targetUser ? (
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="w-7 h-7 rounded-full bg-[#FAF8F5] border border-[#EAE7E0] flex items-center justify-center font-bold text-[10px] text-[#1F2B4D] overflow-hidden shrink-0">
                                {alert.targetUser.avatar ? <img src={alert.targetUser.avatar} alt="B" className="object-cover w-full h-full" /> : <UserIcon size={12} />}
                              </div>
                              <div className="flex flex-col min-w-0">
                                <span className="font-bold text-[#1F2B4D] text-xs truncate">{alert.targetUser.displayName}</span>
                                <span className="text-[9px] text-[#6B655C] font-mono uppercase">ID: {alert.targetUser.employeeId}</span>
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-[#6B655C] italic">Self Check-in</span>
                          )}
                        </td>
                        <td className="py-2.5 text-xs text-[#6B655C] font-medium pr-2">
                          <div className="line-clamp-2 leading-relaxed" title={alert.reason}>{alert.reason}</div>
                        </td>
                        <td className="py-2.5 text-right pr-2">
                          <div className="flex flex-col gap-1.5 items-end justify-center">
                            {alert.investigationReport?.resultJSON ? (
                              <>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setViewingReport(alert.investigationReport);
                                  }}
                                  className={`inline-flex items-center justify-center text-[9px] font-display font-bold uppercase tracking-wider px-2.5 py-1.5 rounded-lg shadow-2xs transition-all whitespace-nowrap border w-[105px] ${
                                    alert.investigationReport.generationStatus === 'STALE' 
                                      ? 'bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-200' 
                                      : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                                  }`}
                                >
                                  View
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const contextPayload = {
                                      alertId: alert.id,
                                      userId: alert.userId,
                                      alertType: alert.alertType,
                                      window: { start: alert.startDate, end: alert.endDate }
                                    };
                                    window.dispatchEvent(new CustomEvent('toggle-chatbot', { 
                                      detail: { 
                                        prompt: `Regenerate investigation for this ${alert.severity} severity ${alert.alertType} alert.`,
                                        context: contextPayload 
                                      } 
                                    }));
                                  }}
                                  className="inline-flex items-center justify-center text-[9px] font-display font-bold uppercase tracking-wider px-2.5 py-1.5 rounded-lg shadow-2xs transition-all whitespace-nowrap border border-indigo-200 bg-white hover:bg-indigo-50 text-indigo-700 w-[105px]"
                                >
                                  Refresh
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const contextPayload = {
                                    alertId: alert.id,
                                    userId: alert.userId,
                                    alertType: alert.alertType,
                                    window: { start: alert.startDate, end: alert.endDate }
                                  };
                                  window.dispatchEvent(new CustomEvent('toggle-chatbot', { 
                                    detail: { 
                                      prompt: `Investigate this ${alert.severity} severity ${alert.alertType} alert.`,
                                      context: contextPayload 
                                    } 
                                  }));
                                }}
                                className="inline-flex items-center justify-center text-[9px] font-display font-bold uppercase tracking-wider px-2.5 py-1.5 rounded-lg shadow-2xs transition-all whitespace-nowrap border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 w-[105px]"
                              >
                                {alert.investigationReport?.generationStatus === 'GENERATING' ? 'Generating...' : 'Ask Iris'}
                              </button>
                            )}
                            {!alert.resolved ? (
                              hasFullAccess ? (
                                <button 
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); setSelectedAlert(alert); }}
                                  className="bg-[#1F2B4D] hover:bg-[#141C33] text-white text-[9.5px] font-display font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg shadow-2xs transition-all whitespace-nowrap w-[105px]"
                                >
                                  Resolve
                                </button>
                              ) : (
                                <span className="text-[9.5px] text-[#6B655C] italic font-bold uppercase tracking-wider w-[105px] inline-block text-center">Unresolved</span>
                              )
                            ) : (
                              <span className="text-[8.5px] font-display font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 uppercase tracking-wider inline-flex items-center justify-center gap-1 w-[105px]">
                                <span className="w-1 h-1 rounded-full bg-emerald-500 shrink-0" /> Resolved
                              </span>
                            )}
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile & Tablet Card View */}
          <div className="lg:hidden flex flex-col gap-3 flex-1 overflow-y-auto pb-2 w-full">
            {loading ? (
               <div className="py-8 text-center text-[#6B655C] font-medium text-xs">Loading proxy alerts...</div>
            ) : alerts.length === 0 ? (
               <div className="py-8 text-center flex flex-col items-center gap-2">
                 <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
                   <CheckCircle size={20} />
                 </div>
                 <span className="font-serif font-bold text-sm text-[#1F2B4D]">No Anomalies Detected</span>
               </div>
            ) : (
               alerts.map(alert => (
                <motion.div key={alert.id} variants={itemVariants} className="bg-[#FAF8F5] p-1 rounded-2xl border border-[#EAE7E0] shadow-2xs">
                  <div className="bg-white rounded-xl p-3.5 sm:p-4 space-y-3">
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-[#1F2B4D]">
                        {getAlertTypeIcon(alert.alertType)}
                        <span>{formatAlertType(alert.alertType)}</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded-md text-[8.5px] font-display font-bold uppercase tracking-wider border shadow-2xs shrink-0 ${
                        alert.severity === 'HIGH' ? 'bg-rose-50 text-rose-800 border-rose-200' :
                        alert.severity === 'MEDIUM' ? 'bg-amber-50 text-amber-800 border-amber-200' :
                        'bg-indigo-50 text-indigo-800 border-indigo-200'
                      }`}>
                        {alert.severity}
                      </span>
                    </div>

                    <div className="bg-[#FAF8F5] rounded-xl p-3 border border-[#EAE7E0] space-y-2 text-xs">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-[#6B655C] text-[10px] font-display font-bold uppercase tracking-wider">Timestamp</span>
                        <span className="font-bold text-[#1F2B4D]">{new Date(alert.attendanceDate).toLocaleDateString('en-IN')}</span>
                      </div>
                      <div className="h-px w-full bg-[#EAE7E0]" />
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-[#6B655C] text-[10px] font-display font-bold uppercase tracking-wider">Suspect (A)</span>
                        <span className="font-bold text-[#1F2B4D]">{alert.user?.displayName || 'Unknown'}</span>
                      </div>
                      {alert.targetUser && (
                        <>
                          <div className="h-px w-full bg-[#EAE7E0]" />
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-[#6B655C] text-[10px] font-display font-bold uppercase tracking-wider">Colliding (B)</span>
                            <span className="font-bold text-[#1F2B4D]">{alert.targetUser.displayName}</span>
                          </div>
                        </>
                      )}
                      <div className="h-px w-full bg-[#EAE7E0]" />
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[#6B655C] text-[10px] font-display font-bold uppercase tracking-wider">Diagnostics</span>
                        <span className="text-[#1F2B4D] font-medium text-xs leading-snug">{alert.reason}</span>
                      </div>
                    </div>

                    <div className="flex gap-2 w-full">
                      {alert.investigationReport?.resultJSON ? (
                        <div className="flex gap-1.5 w-full">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setViewingReport(alert.investigationReport);
                            }}
                            className={`flex-1 inline-flex items-center justify-center text-[10px] font-display font-bold uppercase tracking-wider px-3 py-2 rounded-xl border ${
                              alert.investigationReport.generationStatus === 'STALE' 
                                ? 'bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-200' 
                                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                            }`}
                          >
                            View
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              const contextPayload = {
                                alertId: alert.id,
                                userId: alert.userId,
                                alertType: alert.alertType,
                                window: { start: alert.startDate, end: alert.endDate }
                              };
                              window.dispatchEvent(new CustomEvent('toggle-chatbot', { 
                                detail: { 
                                  prompt: `Regenerate investigation for this ${alert.severity} severity ${alert.alertType} alert.`,
                                  context: contextPayload 
                                } 
                              }));
                            }}
                            className="flex-1 inline-flex items-center justify-center text-[10px] font-display font-bold uppercase tracking-wider px-3 py-2 rounded-xl border border-indigo-200 bg-white hover:bg-indigo-50 text-indigo-700"
                          >
                            Refresh
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            const contextPayload = {
                              alertId: alert.id,
                              userId: alert.userId,
                              alertType: alert.alertType,
                              window: { start: alert.startDate, end: alert.endDate }
                            };
                            window.dispatchEvent(new CustomEvent('toggle-chatbot', { 
                              detail: { 
                                prompt: `Investigate this ${alert.severity} severity ${alert.alertType} alert.`,
                                context: contextPayload 
                              } 
                            }));
                          }}
                          className="flex-1 inline-flex items-center justify-center text-[10px] font-display font-bold uppercase tracking-wider px-3 py-2 rounded-xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700"
                        >
                          {alert.investigationReport?.generationStatus === 'GENERATING' ? 'Generating...' : 'Ask Iris'}
                        </button>
                      )}
                      {!alert.resolved && hasFullAccess && (
                        <button 
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setSelectedAlert(alert); }}
                          className="flex-1 bg-[#1F2B4D] hover:bg-[#141C33] text-white text-[10px] font-display font-bold uppercase tracking-wider px-3 py-2 rounded-xl shadow-2xs transition-all text-center"
                        >
                          Resolve
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
               ))
            )}
          </div>
        </div>
      </div>

      {/* ── RESPONSIVE RESOLUTION DIALOG / MODAL ── */}
      <AnimatePresence>
        {selectedAlert && (
          <div className="fixed inset-0 z-50 bg-[#1F2B4D]/30 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
            <motion.div 
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="bg-white rounded-[20px] max-w-md w-full p-4 sm:p-6 shadow-xl border border-[#EAE7E0] max-h-[92vh] overflow-y-auto relative"
            >
              <div className="flex items-center justify-between pb-3 border-b border-[#F4F1EA] mb-3">
                <h2 className="font-serif font-bold text-base sm:text-xl text-[#1F2B4D]">Audit Alert Resolution</h2>
                <button 
                  type="button"
                  onClick={() => setSelectedAlert(null)}
                  className="p-1.5 text-[#6B655C] hover:text-[#1F2B4D] bg-[#FAF8F5] rounded-lg transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-3">
                <p className="text-xs text-[#6B655C] font-medium bg-[#FAF8F5] p-3 rounded-xl border border-[#EAE7E0] leading-relaxed">
                  Resolving alert: <strong className="text-[#1F2B4D]">{formatAlertType(selectedAlert.alertType)}</strong> for <strong className="text-[#1F2B4D]">{selectedAlert.user?.displayName}</strong>
                </p>

                <form onSubmit={handleResolveSubmit} className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-display font-bold text-[#6B655C] mb-1 uppercase tracking-wider">Resolution Type</label>
                    <select 
                      value={resolutionValue}
                      onChange={(e) => setResolutionValue(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-[#EAE7E0] text-[#1F2B4D] text-xs font-bold rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1F2B4D]"
                    >
                      <option value="dismissed">Dismissed (Legitimate exception)</option>
                      <option value="confirmed_fraud">Confirmed Fraud (Time-theft confirmed)</option>
                      <option value="false_positive">False Positive (Technical glitch)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-display font-bold text-[#6B655C] mb-1 uppercase tracking-wider">Auditor Comments</label>
                    <textarea 
                      value={resolutionComments}
                      onChange={(e) => setResolutionComments(e.target.value)}
                      placeholder="Enter detailed audit findings..."
                      required
                      rows={3}
                      className="w-full px-3 py-2 bg-white border border-[#EAE7E0] text-[#1F2B4D] text-xs font-medium rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1F2B4D] resize-none"
                    />
                  </div>

                  <div className="pt-2 flex flex-col-reverse sm:flex-row gap-2 border-t border-[#F4F1EA]">
                    <button 
                      type="button" 
                      onClick={() => setSelectedAlert(null)}
                      className="w-full sm:w-auto flex-1 px-4 py-2 border border-[#EAE7E0] bg-white text-[#1F2B4D] text-xs font-display font-bold rounded-xl hover:bg-[#FAF8F5] transition-colors"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit" 
                      disabled={submittingResolution}
                      className="w-full sm:w-auto flex-1 px-5 py-2 bg-[#1F2B4D] hover:bg-[#141C33] text-white text-xs font-display font-bold rounded-xl shadow-2xs transition-all flex items-center justify-center gap-1.5"
                    >
                      {submittingResolution ? <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0" /> : null}
                      <span>{submittingResolution ? 'Submitting...' : 'Complete Resolve'}</span>
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {viewingReport && (
        <IrisInvestigation report={viewingReport} onClose={() => setViewingReport(null)} />
      )}

    </div>
  );
};

export default ProxyAlerts;
