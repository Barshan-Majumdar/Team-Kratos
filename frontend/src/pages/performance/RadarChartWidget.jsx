import React from 'react';

const RadarChartWidget = ({ 
  data, 
  selectedData = null, 
  personName = "Barshan", 
  activeView = "matrix", 
  onToggleView = null 
}) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-[#9A948A] text-xs p-6 text-center">
        <span className="font-semibold block mb-1">No Competency Benchmarks</span>
        <span>Submit 360 feedback to populate evaluation graph.</span>
      </div>
    );
  }

  const ICON_PATHS = {
    Leadership: <><path d="M2 20h20"/><path d="M5 20 3 8l5.5 5L12 6l3.5 7L21 8l-2 12"/></>,
    Teamwork: <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>,
    Communication: <><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></>,
    'Problem Solving': <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
  };

  const MAX = 5;

  // Radar SVG Math (CX=110, CY=86, R=54)
  const cx = 110;
  const cy = 86;
  const R = 54;
  const n = data.length;

  const angleFor = (i) => (Math.PI * 2 * i) / n - Math.PI / 2;
  const ptFor = (i, val) => {
    const r = (val / MAX) * R;
    const a = angleFor(i);
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  };

  return (
    <div className="w-full font-['Manrope',-apple-system,sans-serif]">
      {activeView === 'matrix' ? (
        /* ===== MATRIX VIEW: Merged Comparison Rows (Clean Individual Meter) ===== */
        <div className="divide-y divide-[#F2F0EA] transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]">
          {data.map((c, idx) => {
            const matchedPerson = selectedData ? selectedData.find(s => s.subject === c.subject) : null;
            const personScore = matchedPerson ? matchedPerson.score : c.score;
            const personPct = (personScore / MAX) * 100;
            const iconSvg = ICON_PATHS[c.subject] || ICON_PATHS['Leadership'];

            return (
              <div 
                key={c.subject} 
                className="flex items-center gap-2.5 py-2.5 group hover:bg-[#FAF9F6] px-1 rounded-lg transition-all duration-300"
                style={{ animationDelay: `${idx * 60}ms` }}
              >
                {/* Icon box */}
                <div className="w-7 h-7 rounded-[7px] bg-[#F6F4EF] border border-[#EAE7E0] flex items-center justify-center shrink-0 text-[#1F2B4D] group-hover:scale-105 transition-transform duration-300">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                    {iconSvg}
                  </svg>
                </div>

                {/* Body */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between mb-1">
                    <span className="text-[12.5px] font-bold text-[#1D1B16]">{c.subject}</span>
                    <span className="text-xs font-bold text-[#8C5722] [font-variant-numeric:tabular-nums]">
                      {personScore.toFixed(1)} <small className="text-[#9A948A] font-semibold text-[10px]">/5.0</small>
                    </span>
                  </div>

                  {/* Track with Smooth Animated Person Fill */}
                  <div className="relative h-1 bg-[#F0EEE9] rounded-full overflow-hidden">
                    <div 
                      className="absolute top-0 left-0 bottom-0 bg-[#B5793A] rounded-full transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)]" 
                      style={{ width: `${personPct}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ===== RADAR VIEW: Clean SVG Radar + Inline Score Chips ===== */
        <div className="space-y-3 transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]">
          <div className="flex justify-center pt-1">
            <svg width="220" height="188" viewBox="0 0 220 188" className="overflow-visible">
              {/* Concentric grid rings */}
              {[0.33, 0.66, 1].map((f) => {
                const pts = data.map((_, i) => ptFor(i, MAX * f).join(',')).join(' ');
                return <polygon key={f} points={pts} fill="none" stroke="#EAE7E0" strokeWidth="1" />;
              })}

              {/* Axis ray lines */}
              {data.map((_, i) => {
                const [x, y] = ptFor(i, MAX);
                return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="#EAE7E0" strokeWidth="1" />;
              })}

              {/* Person Polygon */}
              {(() => {
                const personPts = data.map((c, i) => {
                  const matched = selectedData ? selectedData.find(s => s.subject === c.subject) : null;
                  const scoreVal = matched ? matched.score : c.score;
                  return ptFor(i, scoreVal).join(',');
                }).join(' ');

                return (
                  <polygon 
                    points={personPts} 
                    fill="rgba(181,121,58,0.16)" 
                    stroke="#B5793A" 
                    strokeWidth="1.75" 
                    className="transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
                  />
                );
              })()}

              {/* Person Vertex Dots */}
              {data.map((c, i) => {
                const matched = selectedData ? selectedData.find(s => s.subject === c.subject) : null;
                const scoreVal = matched ? matched.score : c.score;
                const [x, y] = ptFor(i, scoreVal);
                return (
                  <circle 
                    key={i} 
                    cx={x} 
                    cy={y} 
                    r="3" 
                    fill="#B5793A" 
                    stroke="#FFFFFF" 
                    strokeWidth="1.25" 
                    className="transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:r-4"
                  />
                );
              })}

              {/* Axis Text Labels */}
              {data.map((c, i) => {
                const a = angleFor(i);
                const lx = cx + (R + 26) * Math.cos(a);
                const ly = cy + (R + 16) * Math.sin(a);
                const anchor = Math.abs(Math.cos(a)) < 0.2 ? 'middle' : (Math.cos(a) > 0 ? 'start' : 'end');
                return (
                  <text 
                    key={c.subject} 
                    x={lx} 
                    y={ly} 
                    textAnchor={anchor} 
                    fill="#6B655C" 
                    fontSize="9" 
                    fontWeight="700" 
                    fontFamily="Manrope, sans-serif"
                  >
                    {c.subject}
                  </text>
                );
              })}
            </svg>
          </div>

          {/* Inline Score Chips Below Radar */}
          <div className="flex flex-wrap gap-1.5 justify-center">
            {data.map((c) => {
              const matched = selectedData ? selectedData.find(s => s.subject === c.subject) : null;
              const scoreVal = matched ? matched.score : c.score;
              const iconSvg = ICON_PATHS[c.subject] || ICON_PATHS['Leadership'];

              return (
                <div 
                  key={c.subject} 
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#F6F4EF] border border-[#EAE7E0] text-[10.5px] font-bold text-[#6B655C] hover:border-[#B5793A]/40 transition-colors"
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                    {iconSvg}
                  </svg>
                  {c.subject} <strong className="text-[#8C5722] [font-variant-numeric:tabular-nums]">{scoreVal.toFixed(1)}</strong>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default RadarChartWidget;
