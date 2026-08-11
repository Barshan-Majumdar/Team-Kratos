import React, { useState, useEffect, useMemo, useRef } from 'react';
import { API_BASE } from '../lib/api';
import { AlertCircle } from 'lucide-react';

export default function OrgChart() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const canvasRef = useRef(null);
  const svgRef = useRef(null);

  // Fetch Org Hierarchy Data
  const fetchOrgData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/users/org-chart`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();
      
      const mapped = (Array.isArray(data) ? data : []).filter(u => u.status === 'Active').map(u => ({
        id: u.id,
        name: u.displayName || 'Unknown',
        role: u.jobPosition || u.roleDefinition?.name || 'Employee',
        dept: u.department || 'General',
        level: typeof u.roleDefinition?.level === 'number' ? u.roleDefinition.level : 3,
        managerId: u.managerId,
        avatar: u.avatar || null
      }));
      
      setEmployees(mapped);
    } catch (e) {
      console.error("Failed to load org hierarchy:", e);
      setError("Failed to load organization structure. Please verify network connection or permissions.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrgData();
  }, []);

  // Compute Tree Data (Cycles, Dangling, Buckets)
  const treeData = useMemo(() => {
    if (!employees.length) return { normal: [], cyclicMembers: [], dangling: [], buckets: {0:[], 1:[], 2:[], 3:[]} };

    const byId = new Map(employees.map(e => [e.id, e]));
    
    // Cycle detection
    const cyclic = new Set();
    const state = new Map();
    function dfs(id, chain) {
      if (!byId.has(id)) return;
      const st = state.get(id) || 0;
      if (st === 1) { chain.forEach(c => cyclic.add(c)); cyclic.add(id); return; }
      if (st === 2) return;
      state.set(id, 1);
      const emp = byId.get(id);
      if (emp.managerId && byId.has(emp.managerId)) dfs(emp.managerId, chain.concat(id));
      state.set(id, 2);
    }
    employees.forEach(e => dfs(e.id, []));

    const dangling = employees.filter(e => e.managerId && !byId.has(e.managerId) && !cyclic.has(e.id));
    const cyclicMembers = employees.filter(e => cyclic.has(e.id));
    const normal = employees.filter(e => !cyclic.has(e.id) && !(e.managerId && !byId.has(e.managerId)));

    // Cluster near manager using DFS visit order
    const visitOrder = [];
    const seen = new Set();
    function visit(emp) {
      if (seen.has(emp.id)) return;
      seen.add(emp.id); 
      visitOrder.push(emp);
      normal.filter(e => e.managerId === emp.id).forEach(visit);
    }
    normal.filter(e => !e.managerId).forEach(visit);
    dangling.forEach(e => { if(!seen.has(e.id)){ seen.add(e.id); visitOrder.push(e);} });

    const buckets = { 0: [], 1: [], 2: [], 3: [] };
    visitOrder.forEach(e => { 
      const t = Math.min(Math.max(e.level, 0), 3); 
      buckets[t].push(e); 
    });

    return { normal, cyclicMembers, dangling, buckets };
  }, [employees]);

  useEffect(() => {
    const drawConnectors = () => {
      const svg = svgRef.current;
      const canvas = canvasRef.current;
      if (!svg || !canvas) return;

      const canvasRect = canvas.getBoundingClientRect();
      svg.setAttribute('width', canvasRect.width);
      svg.setAttribute('height', canvasRect.height);
      svg.innerHTML = ''; // clear

      const colors = {0:'#6B2C3E', 1:'#2B5C6B', 2:'#3F6B4A', 3:'#544F6E'};
      const { normal } = treeData;

      normal.forEach(e => {
        if (!e.managerId) return;
        const childNode = canvas.querySelector(`.org-node[data-id="${e.id}"]`);
        const parentNode = canvas.querySelector(`.org-node[data-id="${e.managerId}"]`);
        if (!childNode || !parentNode) return;

        const childEl = childNode.querySelector('.node-card');
        const parentEl = parentNode.querySelector('.node-card');
        if (!childEl || !parentEl) return;

        const c = childEl.getBoundingClientRect();
        const p = parentEl.getBoundingClientRect();

        const x1 = p.left + p.width/2 - canvasRect.left;
        const y1 = p.bottom - canvasRect.top;
        const x2 = c.left + c.width/2 - canvasRect.left;
        const y2 = c.top - canvasRect.top;
        const midY = y1 + (y2 - y1) / 2;

        const path = document.createElementNS('http://www.w3.org/2000/svg','path');
        const d = `M ${x1} ${y1} L ${x1} ${midY} L ${x2} ${midY} L ${x2} ${y2}`;
        path.setAttribute('d', d);
        path.setAttribute('fill','none');
        
        path.setAttribute('stroke', colors[Math.min(e.level,3)] || '#8A8474');
        path.setAttribute('stroke-width', '1.2');
        path.setAttribute('opacity','0.75');
        svg.appendChild(path);

        // tick caps
        [[x1,y1],[x2,y2]].forEach(([x,y]) => {
          const tick = document.createElementNS('http://www.w3.org/2000/svg','line');
          tick.setAttribute('x1', x-4); tick.setAttribute('x2', x+4);
          tick.setAttribute('y1', y); tick.setAttribute('y2', y);
          tick.setAttribute('stroke', colors[Math.min(e.level,3)] || '#8A8474');
          tick.setAttribute('stroke-width','1');
          svg.appendChild(tick);
        });
      });
    };

    // Small delay to ensure DOM is fully painted before calculating rects
    const timeout = setTimeout(drawConnectors, 50);
    const handleResize = () => drawConnectors();
    window.addEventListener('resize', handleResize);
    return () => {
      clearTimeout(timeout);
      window.removeEventListener('resize', handleResize);
    };
  }, [treeData]);

  const initials = (name) => name.split(' ').map(p=>p[0]).slice(0,2).join('').toUpperCase();

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[500px]">
        <div className="animate-pulse text-[#6B655C] font-mono text-sm">Building Architecture...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 max-w-[1400px] mx-auto min-h-screen flex flex-col items-center justify-center bg-transparent">
        <div className="bg-white border-[2px] border-[#EAE7E0] rounded-[24px] p-10 max-w-md w-full text-center shadow-sm">
          <AlertCircle className="w-14 h-14 text-rose-600 mx-auto mb-5" />
          <h2 className="font-serif font-bold text-2xl text-[#1F2B4D] mb-2">Architecture Error</h2>
          <p className="text-sm text-[#6B655C] mb-8">{error}</p>
          <button onClick={fetchOrgData} className="px-6 py-3 rounded-xl bg-[#1F2B4D] text-white font-bold text-sm shadow-md">Reload Architecture</button>
        </div>
      </div>
    );
  }

  return (
    <div className="org-chart-page">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
        
        .org-chart-page {
          --paper: transparent;
          --panel: #FFFFFF;
          --panel-alt: #FAF8F5;
          --ink: #1F2B4D;
          --ink-soft: #6B655C;
          --ink-faint: #9A948A;
          --line: #EAE7E0;
          --line-strong: #D6D1C4;
          --structural: #1F2B4D;
          --tier0: #D97706; /* Amber/Gold for Founder */
          --tier1: #1F2B4D; /* Navy for Execs */
          --tier2: #0F766E; /* Emerald for Managers */
          --tier3: #6366F1; /* Indigo for Workforce */
          --warn: #E11D48;
          --warn-soft: #FFE4E6;
          --brass: #D97706;
          --radius: 24px;
          --shadow-subtle: 0 4px 20px -8px rgba(31, 43, 77, 0.1);
          --shadow-float: 0 12px 32px -12px rgba(31, 43, 77, 0.2);

          color: var(--ink);
          font-family: 'Plus Jakarta Sans', sans-serif;
          min-height: 100vh;
          max-width: 1440px;
          margin: 0 auto;
          padding: 28px 20px 80px;
        }

        .org-chart-page header.toolbar {
          display: flex; flex-wrap: wrap; align-items: flex-end; justify-content: space-between;
          gap: 20px; padding-bottom: 20px; margin-bottom: 32px; border-bottom: 1px solid var(--line);
        }
        .org-chart-page .eyebrow {
          font-family: 'JetBrains Mono', monospace; font-size: 11px; letter-spacing: 0.15em;
          text-transform: uppercase; color: var(--structural); margin: 0 0 8px; font-weight: 500;
        }
        .org-chart-page h1 {
          font-family: 'Outfit', sans-serif; font-weight: 700; font-size: clamp(28px, 4vw, 42px);
          margin: 0 0 10px; letter-spacing: -0.02em; color: var(--ink);
        }
        .org-chart-page .sub { color: var(--ink-soft); font-size: 15px; max-width: 600px; line-height: 1.6; margin: 0; font-weight: 500; }

        .org-chart-page .legend { display: flex; flex-wrap: wrap; gap: 12px 20px; align-items: center; }
        .org-chart-page .legend .chip {
          display: flex; align-items: center; gap: 8px; font-family: 'JetBrains Mono', monospace;
          font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--ink-soft); font-weight: 500;
        }
        .org-chart-page .legend .dot { width: 10px; height: 10px; border-radius: 50%; display: inline-block; box-shadow: inset 0 1px 2px rgba(0,0,0,0.1); }

        .org-chart-page .tree-wrap {
          display: flex; border: 1px solid var(--line); background: var(--panel-alt);
          border-radius: var(--radius); overflow: hidden; box-shadow: inset 0 2px 10px rgba(0,0,0,0.01);
        }
        .org-chart-page .ruler {
          flex: 0 0 100px; position: sticky; left: 0; z-index: 5; background: rgba(250, 248, 245, 0.85);
          backdrop-filter: blur(12px); border-right: 1px solid var(--line); display: flex; flex-direction: column;
        }
        .org-chart-page .ruler .tick {
          display: flex; flex-direction: column; justify-content: center; align-items: flex-start;
          padding: 0 16px; border-bottom: 1px dashed var(--line);
          height: 190px;
        }
        .org-chart-page .ruler .tick:last-child { border-bottom: none; }
        .org-chart-page .ruler .tick .n { font-family: 'Outfit', sans-serif; font-size: 24px; font-weight: 700; line-height: 1; letter-spacing: -0.02em; }
        .org-chart-page .ruler .tick .label { margin-top: 6px; color: var(--ink-faint); text-transform: uppercase; font-size: 10px; font-family: 'JetBrains Mono', monospace; font-weight: 600; letter-spacing: 0.1em; }
        .org-chart-page .ruler .tick[data-tier="0"] .n { color: var(--tier0); }
        .org-chart-page .ruler .tick[data-tier="1"] .n { color: var(--tier1); }
        .org-chart-page .ruler .tick[data-tier="2"] .n { color: var(--tier2); }
        .org-chart-page .ruler .tick[data-tier="3"] .n { color: var(--tier3); }

        .org-chart-page .canvas-scroll { overflow-x: auto; overflow-y: hidden; flex: 1; }
        .org-chart-page .canvas-scroll::-webkit-scrollbar { height: 8px; }
        .org-chart-page .canvas-scroll::-webkit-scrollbar-track { background: transparent; }
        .org-chart-page .canvas-scroll::-webkit-scrollbar-thumb { background: var(--line-strong); border-radius: 4px; }
        .org-chart-page .canvas { position: relative; min-width: 100%; width: max-content; }
        .org-chart-page svg.connectors { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; z-index: 1; }

        .org-chart-page .tier-row {
          position: relative; display: flex; align-items: center; gap: 40px;
          padding: 24px 48px; border-bottom: 1px dashed var(--line); height: 190px;
          z-index: 2;
        }
        .org-chart-page .tier-row:last-child { border-bottom: none; }

        .org-chart-page .org-node { 
          position: relative; z-index: 2; 
          cursor: pointer;
          transition: all 700ms cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .org-chart-page .org-node:hover {
          transform: translateY(-6px) scale(1.02);
          z-index: 10;
        }
        .org-chart-page .org-node:active {
          transform: translateY(0) scale(0.98);
        }

        /* Double-Bezel (Doppelrand) Architecture */
        .org-chart-page .node-card {
          background: rgba(31, 43, 77, 0.02); 
          border: 1px solid rgba(31, 43, 77, 0.05); 
          border-radius: 20px;
          padding: 5px; 
          min-width: 190px; 
          box-shadow: inset 0 1px 1px rgba(255,255,255,1);
          position: relative;
          transition: all 700ms cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .org-chart-page .org-node:hover .node-card {
          background: rgba(31, 43, 77, 0.04);
          border-color: rgba(31, 43, 77, 0.1);
          box-shadow: var(--shadow-float);
        }

        .org-chart-page .node-card-inner {
          background: var(--panel);
          border-radius: 14px;
          padding: 12px 14px;
          box-shadow: var(--shadow-subtle), inset 0 1px 0 rgba(255,255,255,0.8);
          border: 1px solid var(--line);
          height: 100%;
        }

        .org-chart-page .node-card-inner .top { display: flex; align-items: center; gap: 12px; }
        .org-chart-page .avatar {
          width: 36px; height: 36px; border-radius: 50%; flex: 0 0 36px; display: flex; align-items: center;
          justify-content: center; font-family: 'Outfit', sans-serif; font-weight: 700; font-size: 14px;
          color: #fff; border: 2px solid var(--panel); overflow: hidden; background: #6B6558;
          box-shadow: 0 4px 12px -4px rgba(0,0,0,0.2);
        }
        .org-chart-page .avatar img { width: 100%; height: 100%; object-fit: cover; }
        .org-chart-page .name { font-family: 'Outfit', sans-serif; font-weight: 700; font-size: 15px; line-height: 1.2; color: var(--ink); }
        .org-chart-page .role {
          font-family: 'Plus Jakarta Sans', sans-serif; font-size: 11px; font-weight: 600;
          margin-top: 6px; color: var(--ink-soft);
        }
        .org-chart-page .dept {
          display: inline-block; margin-top: 10px; font-size: 10px; padding: 4px 8px; border-radius: 20px;
          background: var(--panel-alt); border: 1px solid var(--line); color: var(--ink-soft); font-family: 'JetBrains Mono', monospace; font-weight: 500;
        }
        
        .org-chart-page .org-node[data-tier="0"] .avatar { background: var(--tier0); }
        .org-chart-page .org-node[data-tier="1"] .avatar { background: var(--tier1); }
        .org-chart-page .org-node[data-tier="2"] .avatar { background: var(--tier2); }
        .org-chart-page .org-node[data-tier="3"] .avatar { background: var(--tier3); }



        .org-chart-page .org-node.unassigned .node-card { border-color: var(--warn); background: var(--warn-soft); }
        .org-chart-page .org-node.unassigned .node-card-inner { border-color: rgba(225,29,72,0.3); }
        .org-chart-page .org-node.unassigned .avatar { background: var(--ink-faint); }
        .org-chart-page .flag-tag {
          display: flex; align-items: center; gap: 6px; margin-top: 10px; font-family: 'JetBrains Mono', monospace;
          font-size: 10px; letter-spacing: 0.02em; color: var(--warn); font-weight: 600;
        }

        .org-chart-page .cycle-strip {
          display: none; margin-top: 24px; border: 2px dashed var(--warn); background: var(--warn-soft);
          padding: 24px 40px; border-radius: var(--radius);
        }
        .org-chart-page .cycle-strip.show { display: block; }
        .org-chart-page .cycle-strip .head {
          display: flex; align-items: center; gap: 8px; margin-bottom: 16px;
          font-family: 'JetBrains Mono', monospace; font-size: 12px; letter-spacing: 0.05em;
          text-transform: uppercase; color: var(--warn); font-weight: 600;
        }
        .org-chart-page .cycle-strip .cluster { display: flex; align-items: center; gap: 0; }
        .org-chart-page .cycle-strip .node-card { border-color: rgba(225,29,72,0.2); }
        .org-chart-page .loop-glyph {
          font-family: 'JetBrains Mono', monospace; font-size: 24px; color: var(--warn);
          padding: 0 16px; line-height: 1;
        }

        .org-chart-page footer.note {
          margin-top: 24px; font-size: 13px; color: var(--ink-faint); line-height: 1.6;
          font-family: 'Plus Jakarta Sans', sans-serif; max-width: 800px; font-weight: 500;
        }

        @media (max-width: 720px) {
          .org-chart-page .ruler { flex-basis: 72px; }
          .org-chart-page .ruler .tick { padding: 0 12px; height: 160px; }
          .org-chart-page .ruler .tick .n { font-size: 18px; }
          .org-chart-page .ruler .tick .label { display: none; }
          .org-chart-page .tier-row { padding: 20px 24px; gap: 24px; height: 160px; }
          .org-chart-page .node-card { min-width: 180px; }
        }
      `}</style>

      <header className="toolbar">
        <div>
          <p className="eyebrow">Directory · Structural view</p>
          <h1>Org Structure</h1>
          <p className="sub">Position on this chart reflects role level. Connecting lines trace actual reporting lines between managers and their subordinates.</p>
        </div>
        <div className="legend">
          <span className="chip"><span className="dot" style={{ background: 'var(--tier0)' }}></span>Tier 0 — Founder</span>
          <span className="chip"><span className="dot" style={{ background: 'var(--tier1)' }}></span>Tier 1 — Executive</span>
          <span className="chip"><span className="dot" style={{ background: 'var(--tier2)' }}></span>Tier 2 — Manager</span>
          <span className="chip"><span className="dot" style={{ background: 'var(--tier3)' }}></span>Tier 3 — Workforce</span>
        </div>
      </header>

      <div className="tree-wrap">
        <div className="ruler" id="ruler">
          <div className="tick" data-tier="0"><span className="n">00</span><span className="label">Founder</span></div>
          <div className="tick" data-tier="1"><span className="n">01</span><span className="label">Executive</span></div>
          <div className="tick" data-tier="2"><span className="n">02</span><span className="label">Manager</span></div>
          <div className="tick" data-tier="3"><span className="n">03</span><span className="label">Workforce</span></div>
        </div>
        <div className="canvas-scroll">
          <div className="canvas" id="canvas" ref={canvasRef}>
            <svg className="connectors" id="connectors" ref={svgRef}></svg>
            {[0, 1, 2, 3].map(t => (
              <div key={t} className="tier-row" data-tier={t}>
                {treeData.buckets[t].map(e => {
                  const isDangling = treeData.dangling.includes(e);
                  return (
                    <div key={e.id} className={`org-node ${isDangling ? 'unassigned' : ''}`} data-tier={t} data-id={e.id}>
                      <div className="node-card">
                        <div className="node-card-inner">
                          <div className="top">
                            <div className="avatar">
                              {e.avatar ? <img src={e.avatar} alt={e.name} /> : initials(e.name)}
                            </div>
                            <div>
                              <div className="name">{e.name}</div>
                            </div>
                          </div>
                          <div className="role">{e.role}</div>
                          <div className="dept">{e.dept}</div>
                          {isDangling && <div className="flag-tag">⚠ manager not found — unassigned</div>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className={`cycle-strip ${treeData.cyclicMembers.length ? 'show' : ''}`}>
        <div className="head">⚠ Cyclic manager reference detected — flagged for review, not auto-resolved</div>
        <div className="cluster">
          {treeData.cyclicMembers.map((e, i) => (
            <React.Fragment key={e.id}>
              {i > 0 && <div className="loop-glyph">⟲</div>}
              <div className="org-node" data-tier={Math.min(e.level, 3)}>
                <div className="node-card">
                  <div className="node-card-inner">
                    <div className="top">
                      <div className="avatar">
                        {e.avatar ? <img src={e.avatar} alt={e.name} /> : initials(e.name)}
                      </div>
                      <div><div className="name">{e.name}</div></div>
                    </div>
                    <div className="role">{e.role}</div>
                    <div className="flag-tag">⚠ cyclic manager reference</div>
                  </div>
                </div>
              </div>
            </React.Fragment>
          ))}
        </div>
      </div>

      <footer className="note">
        Tier is derived from RoleDefinition.level, independent of reporting depth. managerId only
        determines which line connects to which card. Employees whose manager record no longer
        exists are placed in a flagged "Unassigned" state rather than dropped. A cyclic manager
        reference (A → B → A) is detected and surfaced below the tree rather than left to loop
        silently.
      </footer>
    </div>
  );
}
