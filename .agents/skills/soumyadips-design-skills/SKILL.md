---
name: soumyadips-design-skills
description: Soumyadip's Anti-AI-Slop Master Design System & Executive Frontend Architecture Skill. Synthesizes Soumyadip's personal design DNA, HSL slate-navy & warm-clay token palettes, double-bezel (Doppelrand) card architecture, physics-based cubic-bezier spring micro-motion, zero-overlap HUD graphics, custom floating Tailwind UI dropdowns, and exact component blueprints derived from Employees, Attendance, and Performance Feedback modules.
---

# Soumyadip's Design DNA & Executive Frontend System

> **The Sovereign Rule**: Design interfaces that evoke immediate awe, feel agency-crafted ($150k+ bespoke engineering quality), eliminate every AI template cliché, and adhere strictly to Soumyadip's signature visual preferences, color tokens, semantic meaning rules, WAI-ARIA APG standards, and structural ergonomics.

---

## 1. SOUMYADIP DESIGN MANIFESTO & CORE PHILOSOPHY

### 1.1 Executive Anti-Slop Directive
LLM-generated frontend interfaces are notoriously predictable and cheapened by default design tropes. Soumyadip's design system explicitly outlaws all generic AI patterns and enforces bespoke, executive-level visual polish.

#### ❌ ABSOLUTELY BANNED AI TROPES:
1. **AI-Purple / Radial Blur Blobs**: No background glows made of `#8B5CF6`, `#6366F1`, or violet radial gradient meshes floating aimlessly behind cards.
2. **Rainbow Badge Confetti**: Never mix bright pastel badges (`bg-blue-100`, `bg-purple-100`, `bg-emerald-100`, `bg-pink-100`) on the same view.
3. **Semantic Color Collisions**: **NEVER repurpose the Clay-Amber palette (`Hex: #B5793A` fill | `Hex: #8C5722` text)** for CEO or status badges. The Clay-Amber pair is strictly reserved for **"Needs Attention / At-Risk / Pending Review"**.
4. **Amber Distractions on Executive Badges**: CEO / C-Suite rank badges must NOT use amber accent rings (`amber-300`, etc.) to prevent visual confusion with attention flags.
5. **Canvas Color Drift**: Always use the canonical workspace canvas token `--bg-canvas: #FAF9F6`. Never introduce near-duplicate warm off-white hashes like `#F4F1EA`.
6. **Raw Tailwind Gray Drift**: Avoid stock `bg-slate-100 text-slate-800`. Use locked warm-stone tokens (`--text-secondary: #6B655C`, `--border-subtle: #EAE7E0`, warm neutral fill `#F4F1EA`/`#F0EEE9`).
7. **Incorrect Color Notation**: Never label Hex codes (`#1F2B4D`) as HSL. Always write explicit formats: `Hex: #1F2B4D` | `HSL: hsl(225, 42%, 21%)`.
8. **Clipping / Native `<select>` Menus**: Never use native browser dropdown select tags that overflow, bleed across adjacent card labels, or clip headers. Use `FloatingFilterDropdown`.
9. **Non-Standard Keyboard Navigation**: Never invent custom keymaps for WAI-ARIA tree views. Adhere strictly to WAI-ARIA APG tree navigation standards.
10. **Em-Dash Decorative Abuse**: No `—` em-dashes inside titles, subheadings, or pull quotes as artificial visual flourishes.
11. **Secondary Background Layer Clutter**: Never stack unnecessary secondary background containers or nested background color fills (`bg-slate-50/50` canvas overlays + `bg-slate-100` double outer bezels) behind topbars, sidebars, or page sections when the primary surface background should be clean, single-surface, and seamless.

#### ✅ SOUMYADIP'S APPROVED EXECUTIVE STANDARDS:
1. **Soft Structuralism & Doppelrand Architecture**: Layered, double-bezel card containers (`rounded-[24px]` outer container with `rounded-[16px]` inner white surface).
2. **Executive Navy & Warm Stone Token Discipline**: Deep Executive Navy (`Hex: #1F2B4D` | `HSL: hsl(225, 42%, 21%)`) paired with warm stone neutrals (`#FAF9F6`, `#FAF8F5`, `#EAE7E0`).
3. **Pure Midnight Navy CEO Rank Badge**: CEO and Founder C-Suite badges use Deep Executive Midnight Navy (`Hex: #0F172A` | `HSL: hsl(222, 47%, 11%)`) with a clean neutral metallic outline (`border border-slate-700/60` or `--border-subtle`), keeping amber strictly for attention flags.
4. **Zero-Overlap Graphics**: SVG HUD elements, radar charts, and progress gauges engineered with explicit radial margin clearances (min 60-75px clearance).
5. **Custom Floating UI Dropdowns**: Accessible, custom React-controlled floating menus (`FloatingFilterDropdown`) with backdrop blur, micro-shadows, checkmarks, and click-outside hooks.
6. **Physics-Based Spring Micro-Motion**: All animated elements use custom cubic-bezier spring curves (`transition-all duration-500 cubic-bezier(0.34, 1.56, 0.64, 1)`), fully respecting `prefers-reduced-motion`.
7. **WAI-ARIA APG Standard Tree Navigation**: Interactive tree widgets implement `role="tree"`, `role="treeitem"`, `aria-expanded`, distinct WAI-ARIA APG arrow-key navigation (Down/Up for focus movement, Right to expand/move to child, Left to collapse/move to parent, Space to toggle, Enter to open inspection drawer), and high-contrast `--ring-focus` rings.

---

### 1.2 The "Design Read" Pre-Flight Declaration Protocol

Before writing a single line of JSX or CSS for Soumyadip, you MUST state the internal **Design Read**:

```text
Reading this as: Executive B2B Platform View for Soumyadip, built with Soft Structuralism & Doppelrand architecture, using the HSL Slate-Navy (hsl(225, 42%, 21%) / #1F2B4D) & Warm Stone palette system, WAI-ARIA APG accessibility, custom spring micro-motion, and zero-overlap spatial layout.
```

---

## 2. PALETTE ARCHITECTURE & COLOR SEMANTICS

### 2.1 The Executive Palette Token Map

All color declarations strictly follow these semantically locked tokens:

```css
:root {
  /* Canvas & Foundations */
  --bg-canvas: #FAF9F6;            /* Canonical warm slate paper base */
  --surface-card: #FFFFFF;         /* Crisp white card surface */
  --surface-bezel: #F4F1EA;        /* Doppelrand outer container background */
  
  /* Borders & Dividers */
  --border-subtle: #EAE7E0;        /* Subtle hairline border */
  --border-card: #E2E8F0;          /* Card inner border */
  --border-focus: #1F2B4D;         /* Focus ring / active stroke */

  /* Text & Typography */
  --text-primary: #1D1B16;         /* High-contrast primary headings */
  --text-secondary: #6B655C;       /* Body and section subtitles */
  --text-tertiary: #9A948A;        /* Captions and metadata */

  /* Brand & Executive Rank Accents */
  --accent-navy: #1F2B4D;          /* Deep Executive Navy (Hex: #1F2B4D | HSL: hsl(225, 42%, 21%)) */
  --accent-navy-hover: #141C33;    /* Navy hover state */
  --accent-navy-subtle: #F0F3F9;   /* Tinted navy capsule background */
  --rank-executive: #0F172A;       /* Executive Rank / CEO C-Suite Badge (Hex: #0F172A | HSL: hsl(222, 47%, 11%)) */

  /* SEMANTIC ONLY: Attention & Risk Flags (DO NOT USE FOR RANK) */
  --status-attention-text: #8C5722; /* Attention / At-Risk Text (Hex: #8C5722) */
  --status-attention-fill: #B5793A; /* Attention / At-Risk Fill (Hex: #B5793A) */
  --status-attention-bg: #FDF8F3;   /* Attention Light Tint Background */
  --status-attention-border: #EEDCCE; /* Attention Subtle Border */

  /* Metric & Trajectory Highlights */
  --emerald-text: #065F46;         /* Executive Emerald Text */
  --emerald-fill: #10B981;         /* Executive Emerald Meter Fill */
  --emerald-bg: #ECFDF5;           /* Executive Emerald Background */
  --emerald-border: #A7F3D0;       /* Executive Emerald Border */

  /* UI Track & Gauge Neutrals */
  --track-neutral: #F0EEE9;        /* Gauge track background */
  --shadow-soft: 0 1px 2px rgba(29,27,22,.04), 0 8px 20px rgba(29,27,22,.06);
  --shadow-hover: 0 6px 24px -4px rgba(29,27,22,.08), 0 12px 32px -6px rgba(29,27,22,.10);
}
```

---

### 2.2 Warm Stone Badge Discipline (Zero Amber Drift on CEO Badge)

```jsx
// ✅ CORRECT: Warm Stone Executive Neutral Badge
<span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F4F1EA] text-[#1D1B16] border border-[#EAE7E0] text-xs font-medium">
  <span className="w-1.5 h-1.5 rounded-full bg-[#6B655C]" />
  Active Employee
</span>

// ✅ CORRECT: Executive C-Suite Rank Badge (Midnight Navy, Zero Amber)
<span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0F172A] text-white border border-slate-700/60 text-xs font-bold shadow-xs">
  <Crown className="w-3.5 h-3.5 text-slate-300" />
  Chief Executive
</span>

// ✅ CORRECT: Attention / At-Risk Badge (Locked Semantic Use Only)
<span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FDF8F3] text-[#8C5722] border border-[#EEDCCE] text-xs font-semibold">
  <AlertCircle className="w-3.5 h-3.5 text-[#B5793A]" />
  Review Pending
</span>

// ❌ BANNED: Raw Tailwind Slate Confetti or Amber Accents on CEO Badge
<span className="bg-slate-100 text-slate-800 text-amber-300">Raw Drift</span>
```

---

## 3. ACCESSIBILITY & WAI-ARIA APG TREE NAVIGATION SPECIFICATION

### 3.1 Strict WAI-ARIA APG Keyboard Mapping (`role="tree"`)

For hierarchy and org chart interfaces, keyboard navigation strictly follows the WAI-ARIA Authoring Practices Guide (APG):

- **`ArrowDown`**: Moves focus to the next visible tree item without expanding or collapsing any node.
- **`ArrowUp`**: Moves focus to the previous visible tree item without expanding or collapsing any node.
- **`ArrowRight`**:
  - On a closed/collapsed node: Expands the node (focus remains on current node).
  - On an open/expanded node: Moves focus to its first child node.
  - On an end/leaf node: Does nothing.
- **`ArrowLeft`**:
  - On an open/expanded node: Collapses the node (focus remains on current node).
  - On a closed/collapsed or leaf node: Moves focus to its parent node.
- **`Space`**: Toggles the expand/collapse state of the currently focused parent node.
- **`Enter`**: Executes the primary node action (opens the side inspection drawer for employee details).
- **Focus Rings**: High-contrast focus outline (`focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F2B4D] focus-visible:ring-offset-2`).

---

### 3.2 Motion Budget & `prefers-reduced-motion`

```jsx
import { useReducedMotion } from 'framer-motion';

// Honor user reduced motion preferences
const shouldReduceMotion = useReducedMotion();

const springTransition = shouldReduceMotion 
  ? { duration: 0 } 
  : { type: 'spring', stiffness: 260, damping: 20 };
```

---

### 3.3 Large Scale Threshold Strategy (> 50 Nodes)

- **Node Threshold**: When `totalNodes > 50`, automatically collapse tree nodes beyond Level 2.
- **Mobile Default**: On screen viewports `< 768px`, default to the **Department Grid Matrix** view or accessible accordion tree to prevent pan/zoom multi-touch bugs.
- **Text Truncation**: All node titles use `truncate line-clamp-1` with explicit HTML `title` attributes for tooltips on hover.

---

## 4. REUSABLE COMPONENT SPECIFICATIONS

### 4.1 Floating Filter Dropdown Component (`FloatingFilterDropdown`)

```jsx
import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Filter } from 'lucide-react';

export const FloatingFilterDropdown = ({ 
  options, 
  selectedValue, 
  onSelect, 
  label = "Filter",
  icon: Icon = Filter 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const selectedOption = options.find(opt => opt.id === selectedValue) || options[0];

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center justify-between gap-2 px-3.5 py-2 rounded-xl bg-white border border-[#EAE7E0] text-xs font-semibold text-[#1D1B16] shadow-xs hover:bg-[#FAF9F6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F2B4D] focus-visible:ring-offset-1 transition-all"
      >
        <div className="flex items-center gap-2">
          <Icon className="w-3.5 h-3.5 text-[#1F2B4D]" />
          <span className="text-[#6B655C] font-normal">{label}:</span>
          <span className="font-bold">{selectedOption?.label || selectedOption?.name}</span>
        </div>
        <ChevronDown className={`w-3.5 h-3.5 text-[#6B655C] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div 
          role="listbox"
          className="absolute right-0 mt-1.5 w-56 rounded-[14px] bg-white border border-[#EAE7E0] shadow-soumyadip-dropdown backdrop-blur-md z-50 py-1.5 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="px-3 py-1.5 border-b border-[#EAE7E0] text-[10px] font-bold text-[#9A948A] uppercase tracking-wider">
            {label} Options
          </div>
          <div className="max-h-60 overflow-y-auto py-1">
            {options.map((opt) => {
              const isSelected = opt.id === selectedValue;
              return (
                <button
                  key={opt.id}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    onSelect(opt.id);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between transition-colors ${
                    isSelected ? 'bg-[#F0F3F9] text-[#1F2B4D] font-bold' : 'text-[#1D1B16] hover:bg-[#FAF9F6] font-medium'
                  }`}
                >
                  <span>{opt.label || opt.name}</span>
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
```

---

## 5. ANTI-PATTERNS & PRE-FLIGHT AUDIT CHECKLIST

Before shipping code for Soumyadip, verify:

1. [ ] **No Clay-Amber CEO Collisions**: Is `#B5793A`/`#8C5722` strictly reserved for "Attention / At-Risk"?
2. [ ] **No Amber Accents on CEO Badge**: Is the CEO badge pure Midnight Navy (`#0F172A`) with neutral slate/white trim?
3. [ ] **Canonical Canvas Token**: Is the canvas background set strictly to `#FAF9F6`?
4. [ ] **Warm Stone Tokens**: Are neutral badges styled with `#F4F1EA`/`#EAE7E0` instead of raw Tailwind slate?
5. [ ] **Proper Color Terminology**: Are color codes labeled accurately (Hex vs HSL)?
6. [ ] **WAI-ARIA APG Tree Standard**: Does the tree implement distinct APG behaviors for Down, Up, Right, Left, Space, and Enter keys?
7. [ ] **Reduced Motion Handling**: Does animation honor `prefers-reduced-motion`?
8. [ ] **Empty / Loading / Error States**: Are shimmer skeletons, empty search states, and error banners included?
9. [ ] **Large Scale & Mobile Fallback**: Are large trees handled safely with collapse limits and mobile matrix fallback?
10. [ ] **Descriptive Component Naming**: Is the dropdown named `FloatingFilterDropdown`?

---
*Updated for Soumyadip's Anti-AI-Slop Executive Frontend Architecture System.*
