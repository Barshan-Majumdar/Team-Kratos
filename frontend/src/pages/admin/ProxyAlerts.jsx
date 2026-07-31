import React, { useState, useEffect } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { API_BASE } from '../../lib/api';
import { 
  AlertTriangle, 
  Clock, 
  User as UserIcon, 
  MapPin, 
  Gauge, 
  Calendar, 
  CheckCircle, 
  XCircle, 
  Filter, 
  RefreshCw, 
  ShieldAlert 
} from 'lucide-react';
import { Skeleton, StatCardSkeleton } from '../../components/ui/Skeleton';

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

  // RBAC checks: level <= 1 is Admin, CEO, SuperAdmin (Full Access); level 2 is Manager (View Only)
  const hasFullAccess = user?.roleDefinition?.level <= 1;

  useEffect(() => {
    fetchData();
  }, [filterResolved, filterSeverity, filterType]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    const token = localStorage.getItem('token');

    // Construct query parameters
    const params = new URLSearchParams();
    if (filterResolved) params.append('resolved', filterResolved);
    if (filterSeverity) params.append('severity', filterSeverity);
    if (filterType) params.append('alertType', filterType);

    // Parallelize alerts and stats fetches
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
      
      setSelectedAlert(null);
      setResolutionComments('');
      fetchData();
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmittingResolution(false);
    }
  };

  const handleBulkDismiss = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Are you sure you want to dismiss ${selectedIds.length} selected alerts?`)) return;

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
      identity_embedding_collision: 'Face Embedding Collision'
    };
    return map[type] || type;
  };

  const getAlertTypeIcon = (type) => {
    switch (type) {
      case 'coordinate_proximity':
        return <MapPin className="text-rose-500" size={18} />;
      case 'travel_speed':
        return <Gauge className="text-amber-500" size={18} />;
      case 'temporal_cluster':
        return <Clock className="text-indigo-500" size={18} />;
      case 'identity_embedding_collision':
        return <ShieldAlert className="text-red-600" size={18} />;
      default:
        return <AlertTriangle className="text-slate-500" size={18} />;
    }
  };

  const getSeverityClass = (severity) => {
    switch (severity) {
      case 'HIGH':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'MEDIUM':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'LOW':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="p-4 md:p-8 lg:p-12 max-w-7xl mx-auto h-full flex flex-col gap-6 md:gap-8">
      {/* Title Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-800 tracking-tight flex items-center gap-3">
            Fraud Alerts Console
          </h1>
          <p className="text-slate-500 mt-2 text-sm md:text-base">
            Systematic detection and audit logs for buddy-punching, geo-spoofing, and proxy attendance.
          </p>
        </div>
        <Button onClick={fetchData} variant="outline" className="rounded-full gap-2 text-sm font-semibold shrink-0">
          <RefreshCw size={16} /> Refresh
        </Button>
      </div>

      {/* Stats Board */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5 bg-gradient-to-br from-indigo-50/50 to-white border-slate-200/60 shadow-sm flex flex-col justify-between">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Unresolved Alerts</span>
          <span className="text-3xl font-extrabold text-indigo-900 mt-1">{stats.totalUnresolved}</span>
        </Card>
        <Card className="p-5 bg-gradient-to-br from-rose-50/50 to-white border-slate-200/60 shadow-sm flex flex-col justify-between">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">High Severity</span>
          <span className="text-3xl font-extrabold text-rose-600 mt-1">{stats.severity.HIGH}</span>
        </Card>
        <Card className="p-5 bg-gradient-to-br from-amber-50/50 to-white border-slate-200/60 shadow-sm flex flex-col justify-between">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Medium Severity</span>
          <span className="text-3xl font-extrabold text-amber-600 mt-1">{stats.severity.MEDIUM}</span>
        </Card>
        <Card className="p-5 bg-gradient-to-br from-emerald-50/50 to-white border-slate-200/60 shadow-sm flex flex-col justify-between">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Low Severity</span>
          <span className="text-3xl font-extrabold text-emerald-600 mt-1">{stats.severity.LOW}</span>
        </Card>
      </div>

      {error && <div className="text-red-500 bg-red-50 p-4 rounded-xl border border-red-100 font-semibold">{error}</div>}

      {/* Filters & Actions Panel */}
      <Card className="p-4 border-slate-200/60 shadow-sm flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 bg-slate-50/50">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
            <Filter size={14} /> Filter:
          </div>
          
          <select 
            value={filterResolved} 
            onChange={(e) => setFilterResolved(e.target.value)}
            className="text-sm font-semibold bg-white border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="false">Unresolved Only</option>
            <option value="true">Resolved Only</option>
            <option value="">All Alerts</option>
          </select>

          <select 
            value={filterSeverity} 
            onChange={(e) => setFilterSeverity(e.target.value)}
            className="text-sm font-semibold bg-white border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="">All Severities</option>
            <option value="HIGH">High Only</option>
            <option value="MEDIUM">Medium Only</option>
            <option value="LOW">Low Only</option>
          </select>

          <select 
            value={filterType} 
            onChange={(e) => setFilterType(e.target.value)}
            className="text-sm font-semibold bg-white border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
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
          <Button 
            onClick={handleBulkDismiss}
            className="bg-slate-800 hover:bg-slate-900 text-white rounded-lg px-4 py-2 font-bold text-xs"
          >
            Bulk Dismiss ({selectedIds.length})
          </Button>
        )}
      </Card>

      {/* Alerts List Table */}
      <Card className="p-0 overflow-hidden border-slate-200/60 shadow-sm flex-1 flex flex-col">
        <div className="overflow-x-auto custom-scrollbar flex-1">
          <table className="w-full text-left min-w-[900px]">
            <thead className="bg-slate-50/50 border-b border-slate-200/60">
              <tr>
                {hasFullAccess && filterResolved === 'false' && (
                  <th className="p-4 w-12 text-center">
                    <input 
                      type="checkbox" 
                      onChange={handleSelectAll}
                      checked={alerts.length > 0 && selectedIds.length === alerts.filter(a => !a.resolved).length}
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                    />
                  </th>
                )}
                <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Date & Timestamp</th>
                <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Type / Severity</th>
                <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Suspect (A)</th>
                <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Colliding (B)</th>
                <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Reason Diagnostics</th>
                <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="p-4"><Skeleton className="h-4 w-4" /></td>
                    <td className="p-4"><Skeleton className="h-6 w-16 rounded-full" /></td>
                    <td className="p-4"><Skeleton className="h-4 w-24" /></td>
                    <td className="p-4"><Skeleton className="h-4 w-24" /></td>
                    <td className="p-4"><Skeleton className="h-4 w-24" /></td>
                    <td className="p-4"><Skeleton className="h-4 w-40" /></td>
                    <td className="p-4 text-right"><Skeleton className="h-8 w-20 ml-auto rounded-lg" /></td>
                  </tr>
                ))
              ) : alerts.length === 0 ? (
                <tr><td colSpan="7" className="p-12 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center">
                      <CheckCircle size={28} className="text-emerald-500" />
                    </div>
                    <div>
                      <span className="text-sm font-bold text-slate-700 block">All Clear — No Anomalies Detected</span>
                      <span className="text-xs text-slate-400 mt-1 block">No proxy or fraud alerts match the current filters. The attendance system is clean.</span>
                    </div>
                  </div>
                </td></tr>
              ) : (
                alerts.map(alert => (
                  <tr key={alert.id} className="hover:bg-slate-50/50 transition-colors">
                    {hasFullAccess && filterResolved === 'false' && (
                      <td className="p-4 text-center">
                        {!alert.resolved ? (
                          <input 
                            type="checkbox" 
                            checked={selectedIds.includes(alert.id)}
                            onChange={() => handleSelectOne(alert.id)}
                            className="rounded text-indigo-600 focus:ring-indigo-500"
                          />
                        ) : '-'}
                      </td>
                    )}
                    <td className="p-4 text-sm text-slate-600 font-medium">
                      <div className="flex items-center gap-2">
                        <Calendar size={14} className="text-slate-400" />
                        {new Date(alert.attendanceDate).toLocaleDateString()}
                      </div>
                      <div className="text-xs text-slate-400 mt-1">
                        Triggered: {new Date(alert.createdAt).toLocaleString()}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
                        {getAlertTypeIcon(alert.alertType)}
                        {formatAlertType(alert.alertType)}
                      </div>
                      <span className={`inline-block px-2.5 py-0.5 mt-2 rounded-full text-[10px] font-bold border ${getSeverityClass(alert.severity)}`}>
                        {alert.severity}
                      </span>
                    </td>
                    <td className="p-4">
                      {alert.user ? (
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-xs text-slate-600 overflow-hidden shrink-0">
                            {alert.user.avatar ? <img src={alert.user.avatar} alt="A" className="object-cover w-full h-full" /> : <UserIcon size={12} />}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="font-bold text-slate-800 text-sm truncate">{alert.user.displayName}</span>
                            <span className="text-xs text-slate-400">ID: {alert.user.employeeId}</span>
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-slate-400 font-medium">Unknown User</span>
                      )}
                    </td>
                    <td className="p-4">
                      {alert.targetUser ? (
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-xs text-slate-600 overflow-hidden shrink-0">
                            {alert.targetUser.avatar ? <img src={alert.targetUser.avatar} alt="B" className="object-cover w-full h-full" /> : <UserIcon size={12} />}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="font-bold text-slate-800 text-sm truncate">{alert.targetUser.displayName}</span>
                            <span className="text-xs text-slate-400">ID: {alert.targetUser.employeeId}</span>
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-slate-400 italic">Self Check-in</span>
                      )}
                    </td>
                    <td className="p-4 text-sm text-slate-600 max-w-sm">
                      <div className="line-clamp-2" title={alert.reason}>{alert.reason}</div>
                    </td>
                    <td className="p-4 text-right">
                      {!alert.resolved ? (
                        hasFullAccess ? (
                          <Button 
                            onClick={() => setSelectedAlert(alert)}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg border border-indigo-700 shadow-sm"
                          >
                            Resolve
                          </Button>
                        ) : (
                          <span className="text-xs text-slate-400 italic font-semibold">Unresolved</span>
                        )
                      ) : (
                        <div className="flex flex-col items-end gap-1">
                          <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 uppercase tracking-wider">
                            Resolved
                          </span>
                          <span className="text-[10px] text-slate-400" title={alert.resolvedBy}>
                            by {alert.resolvedBy?.substring(0, 12)}...
                          </span>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Resolution Dialog / Modal */}
      {selectedAlert && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-lg p-6 relative bg-white shadow-xl animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-xl font-bold text-slate-800 mb-1">Audit Alert Resolution</h3>
            <p className="text-sm text-slate-500 mb-6">
              Resolving alert: <span className="font-semibold text-slate-700">{formatAlertType(selectedAlert.alertType)}</span> for <span className="font-semibold text-slate-700">{selectedAlert.user?.displayName}</span>
            </p>

            <form onSubmit={handleResolveSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Resolution Type</label>
                <select 
                  value={resolutionValue}
                  onChange={(e) => setResolutionValue(e.target.value)}
                  className="w-full text-sm font-semibold bg-white border border-slate-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="dismissed">Dismissed (Safe / Legitimate exception)</option>
                  <option value="confirmed_fraud">Confirmed Fraud (Time-theft confirmed)</option>
                  <option value="false_positive">False Positive (Technical glitch)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Auditor Comments</label>
                <textarea 
                  value={resolutionComments}
                  onChange={(e) => setResolutionComments(e.target.value)}
                  placeholder="Enter detailed audit findings or reason for resolving..."
                  required
                  rows={4}
                  className="w-full text-sm font-medium border border-slate-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button 
                  type="button" 
                  onClick={() => setSelectedAlert(null)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-4 py-2"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={submittingResolution}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2"
                >
                  {submittingResolution ? 'Submitting...' : 'Complete Resolve'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
};

export default ProxyAlerts;
