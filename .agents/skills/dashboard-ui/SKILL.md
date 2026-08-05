---
name: dashboard-ui
description: Skill for recreating the main frontend dashboard UI. Uses React, Tailwind 4, Lucide icons, glassmorphism, mesh backgrounds, and the Obsidian Ember sidebar. Apply this skill when instructed to create dashboard pages matching the main app.
---

# dashboard-ui: The Main Frontend Dashboard UI System

> This skill defines the exact UI guidelines, design system, layout structure, and aesthetics for the main frontend dashboard. Apply these rules whenever you are asked to build a new dashboard page, view, or component that needs to match the exact same UI.

---

## 1. TECH STACK & FOUNDATION

*   **Framework:** React (Vite)
*   **Styling:** Tailwind CSS (v4) with native CSS variables via `@theme`
*   **Icons:** `lucide-react`
*   **Animations:** Native CSS transitions, `framer-motion` (if complex), micro-animation utility classes.

## 2. DESIGN AESTHETICS & THEME

The dashboard uses a premium, modern, and slightly playful aesthetic featuring soft mesh gradients, glassmorphism, and deep indigo/cyan accents.

### Typography
*   **Primary Font:** `Inter` (sans-serif).
*   **Page Titles:** `text-4xl font-bold text-slate-800 tracking-tight`.

### Color Palette (Tailwind custom properties from `index.css`)
*   **Backgrounds:**
    *   Light mode: Premium off-white/purple (`--bg-base: hsl(248, 60%, 96%)`).
    *   Cards: `--surface-card: hsl(265, 45%, 97%)`.
    *   Glass: `--surface-glass: hsla(0, 0%, 100%, 0.8)`.
*   **Accents:**
    *   Primary: Indigo/Purple (`--accent-primary`, `#6366f1`).
    *   Secondary: Blue (`--accent-secondary`).
*   **Dark Mode ("Premium Deep Space"):**
    *   Background: `--bg-base: hsl(230, 25%, 8%)`.
    *   Cards: `--surface-card: hsl(230, 25%, 12%)`.

### Backgrounds & Textures
*   **Mesh Background:** Apply `.mesh-bg` class to the root wrapper of the page for soft radial background blobs (light blue/purple).
*   **Glassmorphism:** Use `.glass-panel` or `.ag-glass` for overlay panels or premium cards requiring a frosted glass effect with a subtle 1px border.

### Micro-Animations
Always apply these interaction classes to interactive elements:
*   `.hover-float`: `-translate-y-[4px]` on hover.
*   `.micro-bounce`: Active state shrink (`scale(0.95)`).
*   `.premium-glow`: Adds an accent shadow on hover.

---

## 3. PAGE LAYOUT STRUCTURE

Every dashboard page should follow this exact structural pattern:

### 3.1 Shell Layout Container
Dashboard views are rendered inside `ShellLayout.jsx` which provides the global sidebar and mobile header. Do not recreate the sidebar in the page components.

### 3.2 Page Wrapper
The main page container inside `ShellLayout` should be:
```jsx
<div className="p-4 md:p-8 lg:p-12 relative h-full flex flex-col">
  {/* Content */}
</div>
```

### 3.3 Page Header Row
Every page must have a flex header containing the title on the left and actions (search, add buttons) on the right.
```jsx
<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
  <h1 className="text-4xl font-bold text-slate-800 tracking-tight">Page Title</h1>
  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full sm:w-auto">
    <div className="w-full sm:w-64">
      <Input
        type="text"
        placeholder="Search..."
        className="rounded-full bg-slate-50 border-slate-200"
      />
    </div>
    <Button variant="primary" className="rounded-full gap-2 justify-center w-full sm:w-auto">
      <Plus size={18} /> New Item
    </Button>
  </div>
</div>
```

### 3.4 Content Area
*   **Scrollable Container:** Wrap main content grids/tables in a flex-1 container with a custom scrollbar: `<div className="flex-1 overflow-y-auto pb-8 custom-scrollbar">`
*   **Loading States:** Do not use basic spinners. Use skeletal loaders with pulsing gradient blocks matching the target layout (e.g., `<div className="animate-pulse bg-slate-200 h-4 rounded w-24">`).
*   **Empty States:** Provide a beautifully composed center-aligned empty state with soft text (`text-slate-500`).

---

## 4. COMPONENT PATTERNS

### Tables
*   Tables should strip default borders inside the main content area (already handled by `main table, main table th, main table td { border: none; }` in `index.css`).
*   Use `style={{ borderCollapse: 'separate', borderSpacing: 0, border: 'none' }}` on the `<table>` element.
*   Header styling: `tr className="text-slate-500 text-sm"`, `th className="py-4 px-6 font-semibold"`.
*   Body styling: `py-4 px-6` for `td`. Add rounded hover states or subtle background shifts.

### Sidebar (Obsidian Ember)
*   If managing sidebar links, know that the sidebar uses the `sidebar-ember` class.
*   Background: `linear-gradient(185deg, #1E293B 0%, #0F172A 100%)`.
*   Text: Cyan/Blue (`text-[rgba(224,231,255,0.8)]`), Hover: `#E0E7FF`.
*   Active state pill: `bg-[rgba(14,165,233,0.18)]` with `#38BDF8` accent.

### Cards
*   Import `Card` from `../components/ui/Card`.
*   Use `.ag-tilt-card` or `.hover-float` for interactive cards.

### Badges
*   Import `Badge` from `../components/ui/Badge`.
*   Status colors commonly used:
    *   Success/Active: `emerald` or `green`
    *   Warning/Pending: `amber` or `orange`
    *   Error/Danger: `rose` or `red`
    *   Neutral: `slate` or `gray`

## 5. RESPONSIVE RULES
*   **Mobile-first headers:** `flex-col` stack on mobile, `flex-row` on `sm` (640px) or `md` (768px).
*   **Full-width buttons on mobile:** `w-full sm:w-auto`.
*   **Hidden columns in tables:** Hide less critical table columns on mobile using `hidden md:table-cell` or `hidden md:block`.

## 6. PRE-FLIGHT CHECKLIST
Before completing a UI generation with this skill:
1. Is the page title `text-4xl font-bold tracking-tight`?
2. Are primary buttons `rounded-full`?
3. Is `lucide-react` used for all icons?
4. Is the layout wrapped in the `p-4 md:p-8 lg:p-12 flex flex-col h-full` container?
5. Did you implement skeletal loaders instead of standard spinners?
