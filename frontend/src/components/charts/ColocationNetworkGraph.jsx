import React, { useState, useMemo, useRef, useEffect } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { Card } from '../ui/Card';
import { Network, Filter, RefreshCw } from 'lucide-react';

const DEPARTMENT_COLORS = [
  '#6366f1', '#10b981', '#f59e0b', '#ef4444', 
  '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'
];

const getDepartmentColor = (dept, deptList) => {
  if (!dept || dept === 'Unassigned') return '#94a3b8';
  const index = deptList.indexOf(dept);
  if (index === -1) return '#94a3b8';
  return DEPARTMENT_COLORS[index % DEPARTMENT_COLORS.length];
};

export const ColocationNetworkGraph = ({ data = { nodes: [], links: [] }, loading = false, onRefresh }) => {
  const [selectedDept, setSelectedDept] = useState('ALL');
  const [containerWidth, setContainerWidth] = useState(800);
  const containerRef = useRef(null);
  const fgRef = useRef(null);

  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.clientWidth);
      }
    };
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  const departments = useMemo(() => {
    const set = new Set();
    (data.nodes || []).forEach(n => {
      if (n.department && n.department !== 'Unassigned') set.add(n.department);
    });
    return Array.from(set);
  }, [data.nodes]);

  const filteredGraphData = useMemo(() => {
    let nodes = data.nodes || [];
    let links = data.links || [];

    if (selectedDept !== 'ALL') {
      const allowedNodeIds = new Set(nodes.filter(n => n.department === selectedDept).map(n => n.id));
      links = links.filter(l => {
        const sourceId = typeof l.source === 'object' ? l.source.id : l.source;
        const targetId = typeof l.target === 'object' ? l.target.id : l.target;
        return allowedNodeIds.has(sourceId) || allowedNodeIds.has(targetId);
      });
      const activeIds = new Set();
      links.forEach(l => {
        const s = typeof l.source === 'object' ? l.source.id : l.source;
        const t = typeof l.target === 'object' ? l.target.id : l.target;
        activeIds.add(s);
        activeIds.add(t);
      });
      nodes = nodes.filter(n => activeIds.has(n.id) || n.department === selectedDept);
    }

    return {
      nodes: nodes.map(n => ({ ...n })),
      links: links.map(l => ({ ...l }))
    };
  }, [data, selectedDept]);

  return (
    <div className="cinematic-panel p-7 bg-white/90 backdrop-blur-sm ring-1 ring-slate-100 shadow-[0_4px_24px_rgba(148,163,184,0.04)] rounded-[24px] flex flex-col transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:shadow-[0_20px_60px_rgba(100,116,139,0.08)] hover:-translate-y-1 hover:border-white">
      <div className="mb-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
            <Network className="text-indigo-500" size={20} />
            Colocation Network Graph
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Pairwise in-office overlap (3+ hours or 3+ days over the last 30 days)
          </p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          {departments.length > 0 && (
            <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 text-xs">
              <Filter size={14} className="text-slate-400" />
              <select
                value={selectedDept}
                onChange={e => setSelectedDept(e.target.value)}
                className="bg-transparent font-medium text-slate-700 outline-none cursor-pointer"
              >
                <option value="ALL">All Departments ({data.nodes?.length || 0})</option>
                {departments.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>
          )}

          {onRefresh && (
            <button
              onClick={onRefresh}
              className="p-2 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 transition-colors"
              title="Refresh graph"
            >
              <RefreshCw size={14} />
            </button>
          )}
        </div>
      </div>

      <div ref={containerRef} className="w-full h-[450px] bg-slate-50/50 backdrop-blur-sm border border-slate-100/50 rounded-xl overflow-hidden relative">
        {loading ? (
          <div className="flex items-center justify-center h-full text-slate-400 text-xs font-bold uppercase tracking-wider">
            Loading colocation network...
          </div>
        ) : filteredGraphData.nodes.length === 0 ? (
          <div className="flex items-center justify-center h-full text-slate-400 text-xs font-bold uppercase tracking-wider">
            No qualifying colocation links recorded in the past 30 days.
          </div>
        ) : (
          <ForceGraph2D
            ref={fgRef}
            width={containerWidth}
            height={450}
            graphData={filteredGraphData}
            nodeLabel={node => `${node.name} (${node.department || 'Unassigned'})`}
            linkLabel={link => `${typeof link.source === 'object' ? link.source.name : link.source} ↔ ${typeof link.target === 'object' ? link.target.name : link.target}: ${link.value} hrs (${link.daysOverlapped} days)`}
            nodeColor={node => getDepartmentColor(node.department, departments)}
            nodeRelSize={6}
            linkWidth={link => Math.max(1, Math.min(6, link.value / 5))}
            linkColor={() => 'rgba(148, 163, 184, 0.4)'}
            nodeCanvasObject={(node, ctx, globalScale) => {
              const label = node.name;
              const fontSize = 12 / globalScale;
              ctx.font = `${fontSize}px Sans-Serif`;
              const color = getDepartmentColor(node.department, departments);

              // Circle
              ctx.beginPath();
              ctx.arc(node.x, node.y, 5, 0, 2 * Math.PI, false);
              ctx.fillStyle = color;
              ctx.fill();
              ctx.strokeStyle = '#ffffff';
              ctx.lineWidth = 1.5 / globalScale;
              ctx.stroke();

              // Text label
              ctx.fillStyle = '#475569';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText(label, node.x, node.y + 10);
            }}
          />
        )}
      </div>

      {/* Legend */}
      {departments.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-4 text-xs">
          <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Legend:</span>
          {departments.map((dept, idx) => (
            <div key={dept} className="flex items-center gap-1.5">
              <span
                className="w-2.5 h-2.5 rounded-full inline-block"
                style={{ backgroundColor: DEPARTMENT_COLORS[idx % DEPARTMENT_COLORS.length] }}
              />
              <span className="text-slate-600 font-medium">{dept}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
