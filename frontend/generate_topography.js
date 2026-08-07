import fs from 'fs';

const svgPaths = [];

// Generate concentric wavy lines
for (let i = 0; i < 40; i++) {
  const scale = 1 - (i * 0.02);
  const offsetY = i * 15;
  const opacity = 0.05 + (0.1 * (1 - i/40));
  
  // Creates a beautiful, organic, continuous wave
  const d = `M -200 ${300 + Math.sin(i)*100} 
             C 100 ${100 + Math.cos(i)*200}, 
               400 ${600 + Math.sin(i)*200}, 
               800 ${400 + Math.cos(i)*100} 
             S 1200 ${500 + Math.sin(i)*150}, 
               1500 ${200 + Math.cos(i)*100}`;
               
  svgPaths.push(
    `<path 
      d="${d}" 
      fill="none" 
      stroke="#1F2B4D" 
      stroke-width="1.5" 
      stroke-opacity="${opacity}" 
      style="transform: scale(${scale}) translateY(${offsetY}px); transform-origin: center" 
    />`
  );
}

// Some vertical curving lines to intersect and create the contour map feel
for (let i = 0; i < 20; i++) {
  const opacity = 0.03 + (0.05 * (1 - i/20));
  const d = `M ${100 + i*60} -200 
             C ${300 + Math.sin(i)*100} 200, 
               ${-100 + Math.cos(i)*200} 600, 
               ${400 + Math.sin(i)*150} 1000`;
               
  svgPaths.push(
    `<path 
      d="${d}" 
      fill="none" 
      stroke="#1F2B4D" 
      stroke-width="1" 
      stroke-opacity="${opacity}" 
    />`
  );
}

const svg = `<svg width="100%" height="100%" viewBox="0 0 1200 800" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
  <filter id="blur">
    <feGaussianBlur stdDeviation="1.5" />
  </filter>
  <g filter="url(#blur)">
    ${svgPaths.join('\n    ')}
  </g>
</svg>`;

fs.writeFileSync('public/topography.svg', svg);
console.log('Successfully generated public/topography.svg');
