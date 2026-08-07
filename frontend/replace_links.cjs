const fs = require('fs');
const file = 'd:/Crew/frontend/src/components/layout/Sidebar.jsx';
let content = fs.readFileSync(file, 'utf8');

// Replace handleLinkClick definition with handleNavClick
content = content.replace(/const handleLinkClick = \(\) => {[\s\S]*?};/, `const handleNavClick = (path) => {
    navigate(path);
    if (onCloseMobile) {
      onCloseMobile();
    }
  };`);

// Replace <Link with handleLinkClick to div
content = content.replace(/<Link\s+to="([^"]+)"\s+onClick={handleLinkClick}\s+className={([^}]+)}\s+title=({[^}]+}|"[^"]+")>/g, 
  (match, to, className, title) => {
    // If title starts with { and ends with }, we just extract it inside ()
    let safeTitle = title;
    if (title.startsWith('{') && title.endsWith('}')) {
      safeTitle = '(' + title.substring(1, title.length - 1) + ')';
    }
    return `<div onClick={() => handleNavClick('${to}')} className={${className} + ' cursor-pointer'} title={isCollapsed ? ${safeTitle} : undefined}>`;
  });

// Replace <Link without title
content = content.replace(/<Link\s+to="([^"]+)"\s+onClick={handleLinkClick}\s+className={([^}]+)}>/g, 
  (match, to, className) => {
    return `<div onClick={() => handleNavClick('${to}')} className={${className} + ' cursor-pointer'}>`;
  });

// Replace </Link> to </div>
content = content.replace(/<\/Link>/g, '</div>');

fs.writeFileSync(file, content);
console.log('Successfully replaced Links with divs');
