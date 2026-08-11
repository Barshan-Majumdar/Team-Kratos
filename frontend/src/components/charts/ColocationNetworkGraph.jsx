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
  const [containerHeight, setContainerHeight] = useState(380);
  const containerRef = useRef(null);
  const fgRef = useRef(null);

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.clientWidth);
        setContainerHeight(containerRef.current.clientHeight);
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
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
    <div className="cinematic-panel p-4 sm:p-5 md:p-6 bg-white rounded-2xl border border-[#EAE7E0] shadow-2xs flex flex-col w-full overflow-hidden font-sans">
      <div className="mb-3.5 pb-2.5 border-b border-[#EAE7E0] flex flex-col min-[500px]:flex-row justify-between items-start min-[500px]:items-center gap-2.5 w-full">
        <div>
          <h3 className="font-serif font-bold text-base sm:text-lg text-[#1F2B4D] tracking-tight flex items-center gap-2">
            <Network className="text-[#1F2B4D] w-5 h-5" />
            <span>Colocation Network Graph</span>
          </h3>
          <p className="text-xs text-[#6B655C] font-medium mt-0.5">
            Pairwise in-office overlap (3+ hours or 3+ days over the last 30 days)
          </p>
        </div>

        <div className="flex items-center gap-2 w-full min-[500px]:w-auto justify-between min-[500px]:justify-end shrink-0">
          {departments.length > 0 && (
            <div className="flex items-center gap-1.5 bg-[#FAF8F5] px-2.5 py-1 rounded-xl border border-[#EAE7E0] text-xs font-bold text-[#1F2B4D]">
              <Filter size={12} className="text-[#6B655C] shrink-0" />
              <select
                value={selectedDept}
                onChange={e => setSelectedDept(e.target.value)}
                className="bg-transparent font-bold text-xs text-[#1F2B4D] outline-none cursor-pointer"
              >
                <option value="ALL">All Depts ({data.nodes?.length || 0})</option>
                {departments.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>
          )}

          {onRefresh && (
            <button
              onClick={onRefresh}
              className="p-1.5 rounded-xl bg-[#FAF8F5] hover:bg-white border border-[#EAE7E0] text-[#1F2B4D] transition-colors shadow-2xs"
              title="Refresh graph"
            >
              <RefreshCw size={14} />
            </button>
          )}
        </div>
      </div>

      <div ref={containerRef} className="w-full h-[280px] sm:h-[380px] bg-[#FAF8F5] border border-[#EAE7E0] rounded-xl overflow-hidden relative flex items-center justify-center p-4">
        {loading ? (
          <div className="text-[#6B655C] text-xs font-bold uppercase tracking-wider animate-pulse">
            Loading colocation network...
          </div>
        ) : filteredGraphData.nodes.length === 0 ? (
          <div className="text-[#6B655C] font-serif font-bold text-xs sm:text-sm tracking-wider uppercase text-center max-w-sm leading-relaxed">
            No qualifying colocation links recorded in the past 30 days.
          </div>
        ) : (
          <ForceGraph2D
            ref={fgRef}
            width={containerWidth}
            height={containerHeight}
            graphData={filteredGraphData}
            nodeLabel={node => `${node.name} (${node.department || 'Unassigned'})`}
            linkLabel={link => `${typeof link.source === 'object' ? link.source.name : link.source} ↔ ${typeof link.target === 'object' ? link.target.name : link.target}: ${link.value} hrs (${link.daysOverlapped} days)`}
            nodeColor={node => getDepartmentColor(node.department, departments)}
            nodeRelSize={6}
            linkWidth={link => Math.max(1, Math.min(6, link.value / 5))}
            linkColor={() => 'rgba(31, 43, 77, 0.2)'}
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
              ctx.fillStyle = '#1F2B4D';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText(label, node.x, node.y + 10);
            }}
          />
        )}
      </div>

      {/* Legend */}
      {departments.length > 0 && (
        <div className="mt-3 pt-2.5 border-t border-[#F4F1EA] flex flex-wrap items-center gap-2 sm:gap-3 text-xs w-full">
          <span className="font-display font-bold text-[#6B655C] uppercase tracking-wider text-[10px]">Legend:</span>
          {departments.map((dept, idx) => (
            <div key={dept} className="flex items-center gap-1.5 bg-[#FAF8F5] border border-[#EAE7E0] px-2 py-0.5 rounded-lg">
              <span
                className="w-2.5 h-2.5 rounded-full inline-block shrink-0"
                style={{ backgroundColor: DEPARTMENT_COLORS[idx % DEPARTMENT_COLORS.length] }}
              />
              <span className="text-[#1F2B4D] font-bold text-[11px]">{dept}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
