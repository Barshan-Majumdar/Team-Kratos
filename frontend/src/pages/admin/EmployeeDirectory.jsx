import React, { useState, useMemo, useCallback, useRef, useEffect, lazy, Suspense } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Plus, Search, Users, UserCheck, UserX, Clock, LayoutGrid, List, AlignJustify,
  ChevronDown, X, Mail, Phone, ArrowUpDown, ArrowUp, ArrowDown, UserPlus, SearchX,
  Sparkles, Building2, ExternalLink, Copy, Check, Filter, Command, Eye, CheckSquare, Square,
  Radio, Waves, Activity, Flame, SlidersHorizontal, Volume2
} from 'lucide-react';
import { hasPermission } from '../../lib/permissions';
import { useEmployees } from '../../hooks/useEmployees';
import { getEmployeeStatus, getStatusClasses, getStatusDotColor } from '../../utils/employeeStatus';

const EmployeeDashboard = lazy(() => import('../EmployeeDashboard'));

// ── Debounce hook ──────────────────────────────────────────────────────────
function useDebounce(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

// ── Department Style Map ──────────────────────────────────────────────────
const DEPARTMENT_STYLES = {
  'Engineering': 'bg-cyan-50 text-cyan-700 border-cyan-200',
  'Product': 'bg-indigo-50 text-indigo-700 border-indigo-200',
  'Design': 'bg-violet-50 text-violet-700 border-violet-200',
  'Marketing': 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200',
  'Sales': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'HR': 'bg-rose-50 text-rose-700 border-rose-200',
  'General': 'bg-slate-50 text-slate-700 border-slate-200',
};

const getDeptBadgeClass = (dept = 'General') => DEPARTMENT_STYLES[dept] || DEPARTMENT_STYLES['General'];

// ── 3D Tilt Perspective Card Container ──────────────────────────────────
const TiltCard = ({ children, className = "", onClick, ...props }) => {
  const [transform, setTransform] = useState("perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)");
  const cardRef = useRef(null);

  const handleMouseMove = (e) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = ((y - centerY) / centerY) * -5;
    const rotateY = ((x - centerX) / centerX) * 5;
    setTransform(`perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.015, 1.015, 1.015)`);
  };

  const handleMouseLeave = () => {
    setTransform("perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)");
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      style={{ transform, transition: "transform 0.15s ease-out", transformStyle: "preserve-3d" }}
      className={className}
      {...props}
    >
      {children}
    </div>
  );
};

// ── Spotify-Inspired Live Equalizer Audio Spectrum Bars ────────────────────
const EqualizerBars = () => (
  <div className="flex items-end gap-1 h-3.5 px-0.5 shrink-0">
    <span className="w-1 bg-emerald-400 rounded-full animate-bounce h-3" style={{ animationDuration: '0.6s' }} />
    <span className="w-1 bg-emerald-400 rounded-full animate-bounce h-3.5" style={{ animationDuration: '0.4s' }} />
    <span className="w-1 bg-amber-400 rounded-full animate-bounce h-2" style={{ animationDuration: '0.8s' }} />
    <span className="w-1 bg-rose-400 rounded-full animate-bounce h-3" style={{ animationDuration: '0.5s' }} />
  </div>
);

// ── Curvy Dynamic Wave Shift Telemetry ─────────────────────────────────────
const CurvyTelemetryWave = ({ stats }) => {
  const pPct = stats.presentPct || 0;
  const lPct = stats.onLeavePct || 0;
  const aPct = stats.absentPct || 0;

  // Compute control coordinates across 800 viewBox units
  const x1 = Math.max(8, (pPct / 100) * 800);
  const x2 = Math.min(792, x1 + (lPct / 100) * 800);

  return (
    <div className="relative w-full h-11 rounded-2xl bg-[#FAF9F6] border border-[#EAE7E0] overflow-hidden p-1 shadow-inner flex items-center">
      <svg className="w-full h-full rounded-xl overflow-hidden" viewBox="0 0 800 36" preserveAspectRatio="none">
        <defs>
          <linearGradient id="presentWave" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#10B981" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#059669" stopOpacity="0.9" />
          </linearGradient>
          <linearGradient id="leaveWave" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#D97706" stopOpacity="0.9" />
          </linearGradient>
          <linearGradient id="absentWave" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#F43F5E" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#E11D48" stopOpacity="0.9" />
          </linearGradient>
        </defs>

        {/* Present Segment Path */}
        <path
          d={`M 0 0 L ${x1} 0 Q ${x1 + 18} 18, ${x1} 36 L 0 36 Z`}
          fill="url(#presentWave)"
          className="transition-all duration-700 ease-out"
        />

        {/* On Leave Segment Path */}
        {lPct > 0 && (
          <path
            d={`M ${x1} 0 L ${x2} 0 Q ${x2 + 18} 18, ${x2} 36 L ${x1} 36 Q ${x1 + 18} 18, ${x1} 0 Z`}
            fill="url(#leaveWave)"
            className="transition-all duration-700 ease-out"
          />
        )}

        {/* Absent Segment Path */}
        <path
          d={`M ${x2 > x1 ? x2 : x1} 0 L 800 0 L 800 36 L ${x2 > x1 ? x2 : x1} 36 Q ${(x2 > x1 ? x2 : x1) + 18} 18, ${x2 > x1 ? x2 : x1} 0 Z`}
          fill="url(#absentWave)"
          className="transition-all duration-700 ease-out"
        />
      </svg>
    </div>
  );
};

// ── Spotify-Style Equalizer Shift Distribution Telemetry Widget ───────────
const ShiftEqualizerWidget = ({ stats, statusFilter, setStatusFilter }) => (
  <TiltCard className="bg-[#FAF8F5] rounded-[24px] border border-[#EAE7E0] p-5 shadow-xs flex flex-col gap-3.5 relative overflow-hidden group">
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-[#1F2B4D] text-white flex items-center gap-2 shadow-xs">
          <Radio size={16} className="animate-pulse text-emerald-400" />
          <EqualizerBars />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-serif font-bold text-base text-[#1F2B4D] tracking-tight">Live Shift Equalizer Telemetry</h3>
            <span className="inline-flex items-center gap-1 text-[10px] font-display font-bold uppercase tracking-wider bg-emerald-50 text-emerald-800 px-2.5 py-0.5 rounded-full border border-emerald-200">
              <Waves size={10} className="animate-spin text-emerald-600" /> Live Visualizer
            </span>
          </div>
          <p className="text-[11px] text-[#6B655C] font-medium mt-0.5">Real-time attendance spectrum waveform across organization divisions.</p>
        </div>
      </div>

      {/* Floating Glass Status Badges */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={() => setStatusFilter(statusFilter === 'Present' ? '' : 'Present')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-display font-bold uppercase tracking-wider transition-all border ${
            statusFilter === 'Present'
              ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm scale-105'
              : 'bg-emerald-50/90 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
          }`}
        >
          <UserCheck size={12} /> Present: {stats.present} ({stats.presentPct}%)
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter(statusFilter === 'On Leave' ? '' : 'On Leave')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-display font-bold uppercase tracking-wider transition-all border ${
            statusFilter === 'On Leave'
              ? 'bg-amber-600 text-white border-amber-700 shadow-sm scale-105'
              : 'bg-amber-50/90 text-amber-800 border-amber-200 hover:bg-amber-100'
          }`}
        >
          <Clock size={12} /> On Leave: {stats.onLeave} ({stats.onLeavePct}%)
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter(statusFilter === 'Absent' ? '' : 'Absent')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-display font-bold uppercase tracking-wider transition-all border ${
            statusFilter === 'Absent'
              ? 'bg-rose-600 text-white border-rose-700 shadow-sm scale-105'
              : 'bg-rose-50/90 text-rose-800 border-rose-200 hover:bg-rose-100'
          }`}
        >
          <UserX size={12} /> Absent: {stats.absent} ({stats.absentPct}%)
        </button>
      </div>
    </div>

    {/* Curvy Dynamic Telemetry Wave */}
    <CurvyTelemetryWave stats={stats} />
  </TiltCard>
);

// ── Stat Card (Clean Solid Corporate Widget) ──────────────────────────────
const StatCard = ({ icon: Icon, label, value, subtext, color, iconBg, isActive, onClick }) => (
  <TiltCard
    onClick={onClick}
    className={`bg-[#FAF8F5] rounded-[20px] border p-4.5 flex items-center justify-between cursor-pointer transition-all duration-300 ${
      isActive
        ? 'border-[#1F2B4D] ring-2 ring-[#1F2B4D]/10 shadow-md scale-[1.01]'
        : 'border-[#EAE7E0] shadow-xs hover:shadow-md hover:border-[#CBD5E1]'
    }`}
  >
    <div className="flex items-center gap-3.5 min-w-0">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${iconBg} ${color} border border-[#EAE7E0] shrink-0`}>
        <Icon size={20} className="opacity-95" />
      </div>
      <div className="min-w-0">
        <p className="text-3xl font-serif font-bold text-[#1F2B4D] tracking-tight leading-none">{value}</p>
        <p className="text-[10px] font-display font-bold text-[#6B655C] uppercase tracking-wider mt-1.5 truncate">{label}</p>
      </div>
    </div>

    {subtext && (
      <span className={`hidden sm:inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-display font-bold tracking-wide border transition-colors ${
        isActive
          ? 'bg-[#1F2B4D] text-white border-[#1F2B4D]'
          : 'bg-[#F0F3F9] text-[#1F2B4D] border-[#D0D9E8]'
      }`}>
        {subtext}
      </span>
    )}
  </TiltCard>
);

// ── Filter Dropdown ────────────────────────────────────────────────────────
const FilterDropdown = ({ label, options, value, onChange }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-display font-bold tracking-wide transition-all duration-200 border ${
          value
            ? 'bg-[#F0F3F9] text-[#1F2B4D] border-[#CBD5E1] shadow-xs'
            : 'bg-white text-[#6B655C] border-[#EAE7E0] hover:border-[#CBD5E1]'
        }`}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <Filter size={12} className={value ? 'text-[#1F2B4D]' : 'opacity-60'} />
        {value || label}
        {value ? (
          <X size={13} className="opacity-70 hover:opacity-100 transition-opacity ml-1" onClick={(e) => { e.stopPropagation(); onChange(''); }} />
        ) : (
          <ChevronDown size={13} className={`transition-transform duration-200 opacity-60 ml-1 ${open ? 'rotate-180' : ''}`} />
        )}
      </button>
      {open && (
        <div className="absolute right-0 mt-1.5 w-52 rounded-[16px] bg-white border border-[#EAE7E0] shadow-xl backdrop-blur-md z-50 py-1.5 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          <div className="px-3 py-1.5 border-b border-[#F4F1EA] text-[10px] font-display font-bold text-[#9A948A] uppercase tracking-wider">
            {label} Selection
          </div>
          <div className="max-h-56 overflow-y-auto py-1">
            {options.map((opt) => {
              const optVal = typeof opt === 'string' ? opt : opt.label || opt.name;
              const optId = typeof opt === 'string' ? opt : opt.id || opt.name;
              const isSelected = value === optVal;
              return (
                <button
                  key={optId}
                  type="button"
                  onClick={() => { onChange(optVal); setOpen(false); }}
                  className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between transition-colors ${
                    isSelected ? 'bg-[#F0F3F9] text-[#1F2B4D] font-bold' : 'text-[#1F2B4D] hover:bg-[#FAF8F5] font-medium'
                  }`}
                >
                  <span>{optVal}</span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-[#1F2B4D]" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

// ── Copyable Employee ID ───────────────────────────────────────────────────
const CopyableEmployeeId = ({ employeeId }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = (e) => {
    e.preventDefault(); e.stopPropagation();
    if (!employeeId) return;
    navigator.clipboard.writeText(employeeId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex items-center gap-1 font-mono text-[11px] text-[#6B655C] hover:text-[#1F2B4D] bg-[#FAF9F6] border border-[#EAE7E0] px-2 py-0.5 rounded-md transition-colors"
      title="Click to copy ID"
    >
      <span>{employeeId || 'EMP-N/A'}</span>
      {copied ? <Check size={10} className="text-emerald-600" /> : <Copy size={10} className="opacity-50" />}
    </button>
  );
};

// ── Status Badge ───────────────────────────────────────────────────────────
const StatusBadge = ({ status }) => (
  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-display font-bold uppercase tracking-wider border ${getStatusClasses(status.variant)}`}>
    <span className={`w-1.5 h-1.5 rounded-full ${getStatusDotColor(status.variant)} ${status.variant === 'emerald' ? 'animate-pulse-dot' : ''}`} />
    {status.text}
  </span>
);

// ── Employee Avatar ────────────────────────────────────────────────────────
const EmployeeAvatar = ({ emp, size = "md", statusVariant }) => {
  const initials = (emp.displayName || 'U').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  const sizeClasses = size === 'lg' ? 'w-16 h-16 text-xl' : size === 'sm' ? 'w-8 h-8 text-xs' : 'w-11 h-11 text-sm';

  const ringColor = statusVariant === 'emerald' ? 'ring-emerald-400'
    : statusVariant === 'amber' ? 'ring-amber-400'
    : statusVariant === 'rose' ? 'ring-rose-400'
    : 'ring-[#EAE7E0]';

  return (
    <div className={`relative shrink-0 rounded-full ring-2 ${ringColor} ring-offset-2 ring-offset-white`}>
      <div className={`${sizeClasses} rounded-full flex items-center justify-center font-bold overflow-hidden bg-blue-50 text-[#3b82f6]`}>
        {emp.avatar ? (
          <img src={emp.avatar} alt={emp.displayName} className="w-full h-full object-cover" loading="lazy" decoding="async" />
        ) : (
          initials
        )}
      </div>
    </div>
  );
};

// ── Employee Grid Card ─────────────────────────────────────────────────────
const EmployeeGridCard = ({ emp, status, index, isSelected, onToggleSelect, onQuickView }) => (
  <TiltCard
    className={`bg-white rounded-[20px] border p-5 flex flex-col justify-between transition-all duration-300 hover:shadow-md group relative overflow-hidden ${
      isSelected ? 'border-[#1F2B4D] ring-2 ring-[#1F2B4D]/10 bg-[#F0F3F9]/30' : 'border-[#EAE7E0] shadow-xs hover:border-[#CBD5E1]'
    }`}
    style={{ animationDelay: `${index * 45}ms` }}
  >
    {/* Header controls: selection & quick view */}
    <div className="flex items-center justify-between mb-3 z-10">
      <button
        type="button"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleSelect(emp.id); }}
        className="text-[#9A948A] hover:text-[#1F2B4D] transition-colors p-1 -ml-1 active:scale-90"
        aria-label={`Select ${emp.displayName}`}
      >
        {isSelected ? <CheckSquare size={18} className="text-[#1F2B4D]" /> : <Square size={18} className="opacity-50 hover:opacity-100" />}
      </button>
      <button
        type="button"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onQuickView(emp); }}
        className="inline-flex items-center gap-1 text-[11px] font-display font-bold text-[#6B655C] hover:text-[#1F2B4D] bg-[#FAF8F5] hover:bg-[#F0F3F9] px-2.5 py-1 rounded-lg border border-[#EAE7E0] opacity-0 group-hover:opacity-100 -translate-y-1 group-hover:translate-y-0 transition-all duration-200 shadow-xs active:scale-95"
      >
        <Eye size={12} /> Quick View
      </button>
    </div>

    {/* Main Link Content */}
    <Link to={`/dashboard/employee/${emp.id}`} className="flex flex-col flex-1 z-10">
      <div className="flex items-start gap-3.5 mb-4">
        <EmployeeAvatar emp={emp} size="lg" statusVariant={status.variant} />
        <div className="flex-1 min-w-0">
          <h3 className="font-serif font-bold text-[#1F2B4D] text-[15px] group-hover:text-[#141C33] transition-colors truncate">
            {emp.displayName}
          </h3>
          <p className="text-xs text-[#6B655C] font-medium mt-0.5 truncate">{emp.jobPosition || emp.role || 'Employee'}</p>
          <div className="mt-1.5">
            <CopyableEmployeeId employeeId={emp.employeeId} />
          </div>
        </div>
      </div>

      {/* Info badges */}
      <div className="flex flex-wrap gap-2 mb-4">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-display font-bold uppercase tracking-wider bg-[#FAF9F6] text-[#6B655C] border border-[#EAE7E0]">
          <Building2 size={11} className="opacity-70" />
          {emp.department || 'General'}
        </span>
      </div>

      {/* Contact info */}
      <div className="flex flex-col gap-1.5 pb-4 border-b border-[#F4F1EA] mb-4">
        {emp.email && (
          <p className="text-[11px] text-[#6B655C] flex items-center gap-2 truncate hover:text-[#1F2B4D] transition-colors font-medium">
            <Mail size={11} className="shrink-0 text-[#1F2B4D]" /> {emp.email}
          </p>
        )}
        {emp.phone && (
          <p className="text-[11px] text-[#6B655C] flex items-center gap-2 font-mono">
            <Phone size={11} className="shrink-0 text-[#1F2B4D]" /> {emp.phone}
          </p>
        )}
      </div>

      {/* Footer */}
      <div className="mt-auto flex items-center justify-between">
        <StatusBadge status={status} />
        <span className="inline-flex items-center gap-1 text-xs font-display font-bold text-[#1F2B4D] group-hover:text-[#141C33] transition-colors">
          Details <span aria-hidden="true" className="inline-block transition-transform duration-200 group-hover:translate-x-1.5">→</span>
        </span>
      </div>
    </Link>
  </TiltCard>
);

// ── Table Row View ─────────────────────────────────────────────────────────
const EmployeeTableRow = ({ emp, status, index, isSelected, onToggleSelect, onQuickView }) => (
  <tr
    className={`group transition-colors duration-200 border-b border-[#F4F1EA] last:border-0 ${
      isSelected ? 'bg-[#F0F3F9]/60' : 'hover:bg-[#FAF9F6]/80'
    }`}
    style={{ animationDelay: `${index * 25}ms` }}
  >
    <td className="py-4 px-4 w-10">
      <button type="button" onClick={() => onToggleSelect(emp.id)} className="text-[#9A948A] hover:text-[#1F2B4D] transition-colors">
        {isSelected ? <CheckSquare size={16} className="text-[#1F2B4D]" /> : <Square size={16} className="opacity-50 hover:opacity-100" />}
      </button>
    </td>
    <td className="py-4 px-5">
      <div className="flex items-center gap-3.5">
        <EmployeeAvatar emp={emp} size="sm" statusVariant={status.variant} />
        <div className="flex flex-col min-w-0">
          <Link to={`/dashboard/employee/${emp.id}`} className="font-serif font-bold text-[#1F2B4D] hover:text-[#141C33] transition-colors text-xs truncate">
            {emp.displayName}
          </Link>
          <span className="text-[10px] text-[#6B655C] font-mono">{emp.employeeId}</span>
        </div>
      </div>
    </td>
    <td className="py-4 px-5">
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10px] font-display font-bold uppercase tracking-wider bg-[#FAF9F6] text-[#6B655C] border border-[#EAE7E0]">
        {emp.department || 'General'}
      </span>
    </td>
    <td className="py-4 px-5 hidden lg:table-cell">
      <span className="text-xs text-[#6B655C] font-medium">{emp.jobPosition || emp.role || '—'}</span>
    </td>
    <td className="py-4 px-5">
      <StatusBadge status={status} />
    </td>
    <td className="py-4 px-5 text-right">
      <div className="inline-flex items-center gap-2">
        <button
          type="button"
          onClick={() => onQuickView(emp)}
          className="p-1.5 rounded-lg text-[#9A948A] hover:text-[#1F2B4D] hover:bg-[#F0F3F9] transition-colors"
          title="Quick View"
        >
          <Eye size={15} />
        </button>
        <Link
          to={`/dashboard/employee/${emp.id}`}
          className="inline-flex items-center gap-1 text-xs font-display font-bold text-[#1F2B4D] hover:text-[#141C33] transition-colors"
        >
          Details <span aria-hidden="true">→</span>
        </Link>
      </div>
    </td>
  </tr>
);

// ── Compact Row View ───────────────────────────────────────────────────────
const EmployeeCompactRow = ({ emp, status, index, isSelected, onToggleSelect, onQuickView }) => (
  <div
    className={`flex items-center gap-3.5 px-5 py-3 border-b border-[#F4F1EA] last:border-0 transition-colors duration-150 ${
      isSelected ? 'bg-[#F0F3F9]/60' : 'hover:bg-[#FAF9F6]/80'
    }`}
    style={{ animationDelay: `${index * 20}ms` }}
  >
    <button type="button" onClick={() => onToggleSelect(emp.id)} className="text-[#9A948A] hover:text-[#1F2B4D] transition-colors">
      {isSelected ? <CheckSquare size={16} className="text-[#1F2B4D]" /> : <Square size={16} className="opacity-50 hover:opacity-100" />}
    </button>
    <EmployeeAvatar emp={emp} size="sm" statusVariant={status.variant} />
    <Link to={`/dashboard/employee/${emp.id}`} className="flex-1 font-serif font-bold text-[#1F2B4D] text-xs hover:text-[#141C33] transition-colors truncate">
      {emp.displayName}
    </Link>
    <span className="text-[10px] font-mono text-[#6B655C] hidden sm:block w-28 truncate">{emp.employeeId}</span>
    <span className="text-xs text-[#6B655C] hidden md:block w-32 truncate">{emp.department || 'General'}</span>
    <StatusBadge status={status} />
    <button
      type="button"
      onClick={() => onQuickView(emp)}
      className="p-1 rounded-lg text-[#9A948A] hover:text-[#1F2B4D] transition-colors ml-1"
      title="Quick View"
    >
      <Eye size={15} />
    </button>
  </div>
);

// ── Skeleton Loaders ───────────────────────────────────────────────────────
const SkeletonGrid = () => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
    {Array.from({ length: 8 }).map((_, i) => (
      <div key={i} className="bg-[#FAF8F5] rounded-[20px] border border-[#EAE7E0] p-5 space-y-4 animate-pulse">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-full bg-[#F0F3F9] shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-[#F0F3F9] rounded-lg w-3/4" />
            <div className="h-3 bg-[#EAE7E0] rounded w-1/2" />
          </div>
        </div>
        <div className="h-6 bg-[#EAE7E0] rounded-lg w-1/3" />
        <div className="flex justify-between items-center pt-2">
          <div className="h-6 bg-[#F0F3F9] rounded-full w-20" />
          <div className="h-4 bg-[#EAE7E0] rounded w-12" />
        </div>
      </div>
    ))}
  </div>
);

const SkeletonTable = () => (
  <div className="space-y-0">
    {Array.from({ length: 6 }).map((_, i) => (
      <div key={i} className="flex items-center gap-4 px-5 py-4 border-b border-[#EAE7E0] bg-white animate-pulse">
        <div className="w-9 h-9 rounded-full bg-[#F0F3F9] shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-[#F0F3F9] rounded w-32" />
          <div className="h-3 bg-[#EAE7E0] rounded w-20" />
        </div>
        <div className="h-4 bg-[#EAE7E0] rounded w-20 hidden md:block" />
        <div className="h-5 bg-[#F0F3F9] rounded-full w-16" />
        <div className="h-4 bg-[#EAE7E0] rounded w-14" />
      </div>
    ))}
  </div>
);

// ── Empty State ────────────────────────────────────────────────────────────
const EmptyState = ({ hasFilters, onClear }) => {
  const Icon = hasFilters ? SearchX : UserPlus;
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-[#F0F3F9] flex items-center justify-center mb-4 border border-[#D0D9E8] shadow-xs">
        <Icon size={28} className="text-[#1F2B4D]" />
      </div>
      <h3 className="font-serif font-bold text-xl text-[#1F2B4D] mb-1.5 tracking-tight">
        {hasFilters ? 'No matching employees' : 'No team members added'}
      </h3>
      <p className="text-xs text-[#6B655C] max-w-sm mb-5 font-medium leading-relaxed">
        {hasFilters
          ? 'Try adjusting your search criteria or active filters to locate team members.'
          : 'Get started by adding your first employee to your workforce directory.'}
      </p>
      {hasFilters && (
        <button
          type="button"
          onClick={onClear}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-display font-bold text-[#1F2B4D] bg-[#F0F3F9] hover:bg-[#E2E8F0] border border-[#CBD5E1] shadow-xs transition-all active:scale-95"
        >
          Clear active filters
        </button>
      )}
    </div>
  );
};

// ── Quick View Slide-over Drawer ───────────────────────────────────────────
const QuickViewDrawer = ({ emp, onClose }) => {
  if (!emp) return null;
  const status = getEmployeeStatus(emp);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-[#1F2B4D]/20 backdrop-blur-xs transition-opacity" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white border-l border-[#EAE7E0] shadow-2xl p-6 flex flex-col justify-between overflow-y-auto">
          <div>
            {/* Drawer Header */}
            <div className="flex items-center justify-between pb-4 border-b border-[#EAE7E0] mb-6">
              <span className="text-[10px] font-display font-bold uppercase tracking-wider text-[#1F2B4D] flex items-center gap-1.5">
                <Sparkles size={14} className="text-amber-500" /> Quick Profile Overview
              </span>
              <button type="button" onClick={onClose} className="p-1.5 rounded-xl text-[#6B655C] hover:text-[#1F2B4D] hover:bg-[#EAE7E0] transition-colors">
                <X size={18} />
              </button>
            </div>

            {/* Profile Header */}
            <div className="flex flex-col items-center text-center mb-6">
              <EmployeeAvatar emp={emp} size="lg" statusVariant={status.variant} />
              <h2 className="font-serif font-bold text-xl text-[#1F2B4D] mt-3">{emp.displayName}</h2>
              <p className="text-xs text-[#6B655C] font-medium mt-0.5">{emp.jobPosition || emp.role || 'Employee'}</p>
              <div className="mt-2">
                <StatusBadge status={status} />
              </div>
            </div>

            {/* Info Grid */}
            <div className="space-y-3.5 bg-[#FAF8F5] rounded-2xl p-4 border border-[#EAE7E0]">
              <div className="flex justify-between items-center text-xs py-1 border-b border-[#EAE7E0]">
                <span className="text-[#6B655C] font-medium">Employee ID</span>
                <CopyableEmployeeId employeeId={emp.employeeId} />
              </div>
              <div className="flex justify-between items-center text-xs py-1 border-b border-[#EAE7E0]">
                <span className="text-[#6B655C] font-medium">Department</span>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-display font-bold uppercase tracking-wider bg-[#FAF9F6] text-[#6B655C] border border-[#EAE7E0]">
                  {emp.department || 'General'}
                </span>
              </div>
              {emp.email && (
                <div className="flex justify-between items-center text-xs py-1 border-b border-[#EAE7E0]">
                  <span className="text-[#6B655C] font-medium">Email</span>
                  <a href={`mailto:${emp.email}`} className="text-[#1F2B4D] font-medium hover:underline truncate max-w-[200px]">
                    {emp.email}
                  </a>
                </div>
              )}
              {emp.phone && (
                <div className="flex justify-between items-center text-xs py-1">
                  <span className="text-[#6B655C] font-medium">Phone</span>
                  <a href={`tel:${emp.phone}`} className="text-[#1F2B4D] font-mono hover:underline">
                    {emp.phone}
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Drawer Actions */}
          <div className="pt-6 border-t border-[#EAE7E0] mt-6 flex gap-3">
            <Link
              to={`/dashboard/employee/${emp.id}`}
              className="flex-1 flex items-center justify-center gap-2 bg-[#F0F3F9] hover:bg-[#E2E8F0] text-[#1F2B4D] border border-[#CBD5E1] py-2.5 rounded-xl text-xs font-display font-bold shadow-xs active:scale-[0.98] transition-all"
            >
              View Full Profile <ExternalLink size={14} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Command-K Spotlight Modal ──────────────────────────────────────────────
const CommandKModal = ({ isOpen, onClose, employees, onSelect }) => {
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 50);
  }, [isOpen]);

  if (!isOpen) return null;

  const results = query.trim()
    ? employees.filter(e =>
        (e.displayName || '').toLowerCase().includes(query.toLowerCase()) ||
        (e.employeeId || '').toLowerCase().includes(query.toLowerCase()) ||
        (e.department || '').toLowerCase().includes(query.toLowerCase())
      ).slice(0, 5)
    : employees.slice(0, 5);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4">
      <div className="fixed inset-0 bg-[#1F2B4D]/20 backdrop-blur-xs transition-opacity" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white rounded-[24px] shadow-2xl border border-[#EAE7E0] overflow-hidden z-10">
        <div className="flex items-center px-4 border-b border-[#EAE7E0] bg-[#FAF8F5]">
          <Search size={16} className="text-[#1F2B4D] shrink-0 mr-3" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search employee name, ID, or department..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full py-4 bg-transparent text-xs font-medium text-[#1F2B4D] placeholder:text-[#9A948A] focus:outline-none"
          />
          <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#F4F1EA] text-[#6B655C] border border-[#EAE7E0]">ESC</kbd>
        </div>

        <div className="p-2 max-h-80 overflow-y-auto">
          {results.length === 0 ? (
            <div className="py-8 text-center text-xs text-[#9A948A]">No matching employees found</div>
          ) : (
            results.map(emp => (
              <div
                key={emp.id}
                onClick={() => { onSelect(emp); onClose(); }}
                className="flex items-center justify-between p-3 rounded-xl hover:bg-[#F0F3F9]/60 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3">
                  <EmployeeAvatar emp={emp} size="sm" />
                  <div>
                    <p className="text-xs font-serif font-bold text-[#1F2B4D]">{emp.displayName}</p>
                    <p className="text-[10.5px] text-[#6B655C] font-mono">{emp.employeeId} · {emp.department || 'General'}</p>
                  </div>
                </div>
                <span className="text-[11px] font-display font-bold text-[#1F2B4D]">View →</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════════════

const EmployeeDirectory = ({ user }) => {
  const isAdmin = hasPermission(user, 'view_all_employees');
  const { employees, loading, error } = useEmployees(isAdmin);
  const navigate = useNavigate();

  // Non-admin fallback
  if (!isAdmin) {
    return (
      <Suspense fallback={<div className="flex items-center justify-center h-full min-h-[50vh]"><div className="w-8 h-8 border-4 border-[#D0D9E8] border-t-[#1F2B4D] rounded-full animate-spin" /></div>}>
        <EmployeeDashboard user={user} />
      </Suspense>
    );
  }

  // ── State & Selection ──────────────────────────────────────────────────
  const [view, setView] = useState(() => localStorage.getItem('emp-view') || 'grid');
  const [searchRaw, setSearchRaw] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortField, setSortField] = useState('displayName');
  const [sortDir, setSortDir] = useState('asc');

  const [selectedIds, setSelectedIds] = useState(new Set());
  const [quickViewEmp, setQuickViewEmp] = useState(null);
  const [isCommandOpen, setIsCommandOpen] = useState(false);

  const searchTerm = useDebounce(searchRaw, 250);
  const searchRef = useRef(null);

  // Keyboard shortcut listener for ⌘K
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Persist view preference
  useEffect(() => { localStorage.setItem('emp-view', view); }, [view]);

  // ── Derived data ────────────────────────────────────────────────────────
  const employeesWithStatus = useMemo(() =>
    employees.map(emp => ({ ...emp, _status: getEmployeeStatus(emp) })),
    [employees]
  );

  const departments = useMemo(() =>
    [...new Set(employees.map(e => e.department || 'General'))].sort(),
    [employees]
  );

  const statusOptions = ['Present', 'Absent', 'On Leave', 'Half Day', 'Offboarded'];

  const filtered = useMemo(() => {
    let list = employeesWithStatus;

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      list = list.filter(emp =>
        (emp.displayName || '').toLowerCase().includes(q) ||
        (emp.employeeId || '').toLowerCase().includes(q) ||
        (emp.department || '').toLowerCase().includes(q) ||
        (emp.email || '').toLowerCase().includes(q)
      );
    }

    if (deptFilter) {
      list = list.filter(emp => (emp.department || 'General') === deptFilter);
    }

    if (statusFilter) {
      list = list.filter(emp => emp._status.text === statusFilter);
    }

    list = [...list].sort((a, b) => {
      let aVal, bVal;
      if (sortField === 'displayName') { aVal = a.displayName || ''; bVal = b.displayName || ''; }
      else if (sortField === 'department') { aVal = a.department || ''; bVal = b.department || ''; }
      else if (sortField === 'status') { aVal = a._status.text; bVal = b._status.text; }
      else { aVal = a.displayName || ''; bVal = b.displayName || ''; }
      const cmp = aVal.localeCompare(bVal);
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return list;
  }, [employeesWithStatus, searchTerm, deptFilter, statusFilter, sortField, sortDir]);

  // ── Stats ───────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const total = employees.length;
    const present = employeesWithStatus.filter(e => e._status.variant === 'emerald').length;
    const onLeave = employeesWithStatus.filter(e => e._status.text === 'On Leave' || e._status.text === 'Half Day').length;
    const absent = employeesWithStatus.filter(e => e._status.variant === 'rose').length;
    const presentPct = total ? Math.round((present / total) * 100) : 0;
    const onLeavePct = total ? Math.round((onLeave / total) * 100) : 0;
    const absentPct = total ? Math.round((absent / total) * 100) : 0;
    return { total, present, onLeave, absent, presentPct, onLeavePct, absentPct };
  }, [employees, employeesWithStatus]);

  const hasFilters = searchTerm || deptFilter || statusFilter;

  const clearAllFilters = useCallback(() => {
    setSearchRaw('');
    setDeptFilter('');
    setStatusFilter('');
  }, []);

  const toggleSort = useCallback((field) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  }, [sortField]);

  // Bulk Selection Handlers
  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map(e => e.id)));
    }
  }, [filtered, selectedIds]);

  const toggleSelectOne = useCallback((id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <ArrowUpDown size={12} className="opacity-30" />;
    return sortDir === 'asc' ? <ArrowUp size={12} className="text-[#1F2B4D]" /> : <ArrowDown size={12} className="text-[#1F2B4D]" />;
  };

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="relative p-4 md:p-6 flex flex-col h-full max-w-[1500px] mx-auto w-full">
      
      {/* HEADER */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#EAE7E0] mb-6">
          <div>
            <h1 className="font-serif font-bold text-3xl md:text-4xl text-[#1F2B4D] tracking-tight leading-none">
              Employees
            </h1>
            <p className="text-[#6B655C] text-sm mt-1.5 font-medium">
              {loading ? 'Loading directory...' : `${employees.length} registered team member${employees.length !== 1 ? 's' : ''} in organization`}
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/dashboard/add-employee')}
            className="flex items-center gap-1.5 bg-[#F0F3F9] hover:bg-[#E2E8F0] text-[#1F2B4D] border border-[#CBD5E1] px-4.5 py-2 rounded-xl font-display font-bold transition-all hover:scale-[1.02] active:scale-95 shadow-xs whitespace-nowrap text-xs shrink-0"
          >
            <Plus size={16} strokeWidth={2.5} /> Add Employee
          </button>
        </div>

        {/* Stats Ribbon */}
        {!loading && (
          <div className="space-y-4 mb-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard
                icon={Users}
                label="Total Workforce"
                value={stats.total}
                subtext="100% total"
                color="text-[#1F2B4D]"
                iconBg="bg-[#F0F3F9]"
                isActive={!statusFilter}
                onClick={() => setStatusFilter('')}
              />
              <StatCard
                icon={UserCheck}
                label="Present Today"
                value={stats.present}
                subtext={`${stats.presentPct}% active`}
                color="text-emerald-700"
                iconBg="bg-emerald-50"
                isActive={statusFilter === 'Present'}
                onClick={() => setStatusFilter(statusFilter === 'Present' ? '' : 'Present')}
              />
              <StatCard
                icon={Clock}
                label="On Leave"
                value={stats.onLeave}
                subtext={`${stats.onLeavePct}% scheduled`}
                color="text-amber-700"
                iconBg="bg-amber-50"
                isActive={statusFilter === 'On Leave'}
                onClick={() => setStatusFilter(statusFilter === 'On Leave' ? '' : 'On Leave')}
              />
              <StatCard
                icon={UserX}
                label="Absent"
                value={stats.absent}
                subtext={`${stats.absentPct}% unrecorded`}
                color="text-rose-700"
                iconBg="bg-rose-50"
                isActive={statusFilter === 'Absent'}
                onClick={() => setStatusFilter(statusFilter === 'Absent' ? '' : 'Absent')}
              />
            </div>

            {/* Live Shift Equalizer Telemetry Widget */}
            {stats.total > 0 && (
              <ShiftEqualizerWidget stats={stats} statusFilter={statusFilter} setStatusFilter={setStatusFilter} />
            )}
          </div>
        )}

        {/* Search & Filter Controls */}
        <div className="p-3 bg-[#FAF8F5] border border-[#EAE7E0] rounded-[20px] shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Search Bar */}
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9A948A] pointer-events-none" />
            <input
              ref={searchRef}
              type="text"
              placeholder="Search by name, ID, department, email..."
              value={searchRaw}
              onChange={e => setSearchRaw(e.target.value)}
              className="w-full pl-10 pr-12 py-2 rounded-xl bg-white text-xs font-medium text-[#1F2B4D] placeholder:text-[#9A948A] border border-[#EAE7E0] focus:outline-none focus:border-[#1F2B4D] focus:ring-2 focus:ring-[#1F2B4D]/10 transition-all duration-200 shadow-xs"
              aria-label="Search employees"
            />
            {searchRaw ? (
              <button type="button" onClick={() => setSearchRaw('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9A948A] hover:text-[#1F2B4D] transition-colors" aria-label="Clear search">
                <X size={14} />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsCommandOpen(true)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-[#FAF9F6] text-[10px] font-mono text-[#6B655C] border border-[#EAE7E0] hover:text-[#1F2B4D] transition-colors"
              >
                <Command size={10} />K
              </button>
            )}
          </div>

          {/* Filter Dropdowns */}
          <div className="flex items-center gap-2 flex-wrap">
            <FilterDropdown label="Department" options={departments} value={deptFilter} onChange={setDeptFilter} />
            <FilterDropdown label="Status" options={statusOptions} value={statusFilter} onChange={setStatusFilter} />
          </div>

          {/* View Toggle Controller */}
          <div className="flex items-center gap-1 bg-white rounded-xl p-1 ml-auto shrink-0 border border-[#EAE7E0] shadow-xs">
            {[
              { key: 'grid', icon: LayoutGrid, label: 'Grid view' },
              { key: 'list', icon: List, label: 'List view' },
              { key: 'compact', icon: AlignJustify, label: 'Compact view' },
            ].map(({ key, icon: VIcon, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => setView(key)}
                className={`p-1.5 rounded-lg transition-all duration-200 active:scale-[0.97] ${
                  view === key
                    ? 'bg-[#1F2B4D] text-white shadow-xs'
                    : 'text-[#9A948A] hover:text-[#1F2B4D] hover:bg-[#FAF8F5]'
                }`}
                aria-label={label}
                aria-pressed={view === key}
              >
                <VIcon size={15} />
              </button>
            ))}
          </div>
        </div>

        {/* Bulk Selection Bar */}
        <div className="mt-3 flex items-center justify-between gap-2 text-xs px-1">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={toggleSelectAll}
              className="inline-flex items-center gap-1.5 text-[#6B655C] hover:text-[#1F2B4D] font-display font-bold transition-colors text-xs"
            >
              {selectedIds.size > 0 && selectedIds.size === filtered.length ? <CheckSquare size={14} className="text-[#1F2B4D]" /> : <Square size={14} />}
              Select All ({filtered.length})
            </button>

            {selectedIds.size > 0 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#F0F3F9] text-[#1F2B4D] font-display font-bold text-[10px] border border-[#CBD5E1]">
                {selectedIds.size} selected
              </span>
            )}
          </div>

          {hasFilters && (
            <button type="button" onClick={clearAllFilters} className="font-display font-bold text-[11px] text-[#1F2B4D] hover:underline transition-all">
              Clear all filters
            </button>
          )}
        </div>
      </div>

      {/* CONTENT AREA */}
      <div className="flex-1 overflow-y-auto custom-scrollbar pt-1 pb-8" role="region" aria-label="Employee directory" aria-live="polite">
        {loading ? (
          view === 'grid' ? <SkeletonGrid /> : <SkeletonTable />
        ) : filtered.length === 0 ? (
          <EmptyState hasFilters={!!hasFilters} onClear={clearAllFilters} />
        ) : view === 'grid' ? (
          /* Grid View */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 pt-1 pb-4" role="list">
            {filtered.map((emp, i) => (
              <EmployeeGridCard
                key={emp.id}
                emp={emp}
                status={emp._status}
                index={i}
                isSelected={selectedIds.has(emp.id)}
                onToggleSelect={toggleSelectOne}
                onQuickView={setQuickViewEmp}
              />
            ))}
          </div>
        ) : view === 'list' ? (
          /* Table View */
          <div className="bg-white rounded-[20px] shadow-xs border border-[#EAE7E0] overflow-hidden">
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left min-w-[640px]" role="grid" aria-label="Employee directory table">
                <thead>
                  <tr className="border-b border-[#EAE7E0] bg-[#FAF8F5] text-[10px] font-display font-bold uppercase tracking-wider text-[#6B655C]">
                    <th className="py-4 px-4 w-10">
                      <button type="button" onClick={toggleSelectAll} className="text-[#9A948A] hover:text-[#1F2B4D] transition-colors">
                        {selectedIds.size > 0 && selectedIds.size === filtered.length ? <CheckSquare size={16} className="text-[#1F2B4D]" /> : <Square size={16} />}
                      </button>
                    </th>
                    <th className="py-4 px-5 cursor-pointer select-none hover:text-[#1F2B4D] transition-colors" onClick={() => toggleSort('displayName')}>
                      <span className="flex items-center gap-1.5">Employee <SortIcon field="displayName" /></span>
                    </th>
                    <th className="py-4 px-5 cursor-pointer select-none hover:text-[#1F2B4D] transition-colors" onClick={() => toggleSort('department')}>
                      <span className="flex items-center gap-1.5">Department <SortIcon field="department" /></span>
                    </th>
                    <th className="py-4 px-5 hidden lg:table-cell">Position</th>
                    <th className="py-4 px-5 cursor-pointer select-none hover:text-[#1F2B4D] transition-colors" onClick={() => toggleSort('status')}>
                      <span className="flex items-center gap-1.5">Status <SortIcon field="status" /></span>
                    </th>
                    <th className="py-4 px-5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((emp, i) => (
                    <EmployeeTableRow
                      key={emp.id}
                      emp={emp}
                      status={emp._status}
                      index={i}
                      isSelected={selectedIds.has(emp.id)}
                      onToggleSelect={toggleSelectOne}
                      onQuickView={setQuickViewEmp}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* Compact View */
          <div className="bg-white rounded-[24px] shadow-sm shadow-slate-200/50 border border-slate-100 divide-y divide-slate-100 overflow-hidden" role="list">
            {filtered.map((emp, i) => (
              <EmployeeCompactRow
                key={emp.id}
                emp={emp}
                status={emp._status}
                index={i}
                isSelected={selectedIds.has(emp.id)}
                onToggleSelect={toggleSelectOne}
                onQuickView={setQuickViewEmp}
              />
            ))}
          </div>
        )}
      </div>

      {/* Slide-over Quick View Drawer */}
      <QuickViewDrawer emp={quickViewEmp} onClose={() => setQuickViewEmp(null)} />

      {/* Command-K Search Modal */}
      <CommandKModal
        isOpen={isCommandOpen}
        onClose={() => setIsCommandOpen(false)}
        employees={employeesWithStatus}
        onSelect={(emp) => navigate(`/dashboard/employee/${emp.id}`)}
      />
    </div>
  );
};

export default EmployeeDirectory;
