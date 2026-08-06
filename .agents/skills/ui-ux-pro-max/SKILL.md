---
name: ui-ux-pro-max
description: Master UI/UX design intelligence skill. Provides color system rules, typography scale ratios, optical spacing hierarchy, dark-mode aesthetics, micro-interaction triggers, card system rules, and design token architectures for production web apps.
---

# UI/UX Pro Max: Master Design Intelligence

This skill provides production-grade UI/UX design intelligence to elevate frontend interfaces beyond generic templates into bespoke, highly responsive, and visually stunning web applications.

---

## 1. Anti-Generic AI Design Directives

### ❌ Banned AI Defaults
* **No generic AI-purple gradients** (`#6366f1` to `#a855f7`) on dark backgrounds without brand context.
* **No standard 3-card equal column grids** with identical icons in circles.
* **No centered text heroes** with default system sans fonts and 2 identical buttons below.
* **No uniform gray cards** (`#1f2937`) with 1px border (`#374151`) on black backdrop.
* **No static, lifeless UI** without hover feedback, active states, or micro-transitions.

### ✅ Modern Production Design Principles
1. **Asymmetric Visual Balance**: Pair high-density components with generous breathing room.
2. **Layered Surface Depth**: Use relative elevation (z-index + ambient shadows + border glows) rather than flat background colors.
3. **Intentional Typography Pairing**: Pair a high-character Display font (e.g. *Outfit*, *Space Grotesk*, *Playfair*) with a hyper-legible Body font (e.g. *Inter*, *Plus Jakarta Sans*).
4. **Calibrated Color Math**: Use HSL color spaces for programmatic lightness steps and alpha-transparency overlays.

---

## 2. Color System Architecture

### 60-30-10 Rule
* **60% Dominant (Neutral)**: Backgrounds, subtle borders, card surfaces (`hsl(220, 15%, 8%)` or `hsl(0, 0%, 98%)`).
* **30% Secondary (Structure)**: Typography, containers, dividers, muted badges (`hsl(220, 12%, 18%)` or `hsl(220, 20%, 92%)`).
* **10% Accent (Action)**: Primary CTAs, key focus states, status indicators (`hsl(250, 85%, 62%)` or custom brand color).

### Dark Mode Elevation Palette (Layered Depth)
| Layer | Hex Code | Purpose |
|---|---|---|
| Level 0 | `#08090D` | Base Application Canvas |
| Level 1 | `#10121A` | Main Container / Sidebar background |
| Level 2 | `#181B26` | Card Surfaces & Inset Panels |
| Level 3 | `#222634` | Hover States, Dropdowns & Modals |
| Accent Glow | `rgba(99, 102, 241, 0.15)` | Ambient lighting behind focused elements |

---

## 3. Typography Scale & Fluid Type System

### Responsive Font Scale (Fluid `clamp()`)
```css
:root {
  --font-display: 'Outfit', -apple-system, sans-serif;
  --font-body: 'Plus Jakarta Sans', -apple-system, sans-serif;
  --font-mono: 'JetBrains Mono', monospace;

  --text-xs: clamp(0.75rem, 0.7rem + 0.25vw, 0.875rem);
  --text-sm: clamp(0.875rem, 0.83rem + 0.23vw, 1rem);
  --text-base: clamp(1rem, 0.95rem + 0.25vw, 1.125rem);
  --text-lg: clamp(1.125rem, 1.05rem + 0.38vw, 1.35rem);
  --text-xl: clamp(1.35rem, 1.22rem + 0.65vw, 1.75rem);
  --text-2xl: clamp(1.75rem, 1.5rem + 1.25vw, 2.5rem);
  --text-3xl: clamp(2.5rem, 2.0rem + 2.5vw, 4rem);
}
```

### Font Pairing Matrix
* **Tech / SaaS**: *Space Grotesk* (Headings) + *Inter* (Body)
* **Luxury / Editorial**: *Playfair Display* (Headings) + *Plus Jakarta Sans* (Body)
* **Modern Consumer / Mobile**: *Outfit* (Headings) + *Plus Jakarta Sans* (Body)
* **Developer / Cyber**: *Syne* (Headings) + *JetBrains Mono* (Body)

---

## 4. Spacing, Micro-Interactions & Hover Physics

### 8px Spatial Grid Token System
* `space-1`: 4px (Micro gaps, badge padding)
* `space-2`: 8px (Tight component spacing)
* `space-3`: 12px (Form control gaps)
* `space-4`: 16px (Standard card padding)
* `space-6`: 24px (Section internal padding)
* `space-8`: 32px (Component separation)
* `space-12`: 48px (Major layout gap)

### Production Spring Easing Curves
```css
:root {
  --ease-out-quad: cubic-bezier(0.25, 0.46, 0.45, 0.94);
  --ease-out-back: cubic-bezier(0.34, 1.56, 0.64, 1);
  --ease-spring: cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.interactive-card {
  transition: transform 0.25s var(--ease-spring), box-shadow 0.25s var(--ease-out-quad), border-color 0.2s ease;
}

.interactive-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 12px 30px -10px rgba(0, 0, 0, 0.4), 0 0 20px 0 rgba(99, 102, 241, 0.15);
  border-color: rgba(99, 102, 241, 0.4);
}
```

---

## 5. UI Layout Archetypes

1. **Bento Grid**: Asymmetric, multi-sized feature blocks (`grid-template-columns: repeat(12, 1fr)` with `grid-column: span 8`, `span 4`, etc.).
2. **Command Bar / Spotlight UI**: Floating search modal (`⌘K`) with subtle backdrop blur (`backdrop-filter: blur(16px)`).
3. **Glassmorphic Floating Action Bar**: Fixed bottom or floating top navigation with high contrast borders.
4. **Data Density Cockpit**: High-density KPI cards paired with compact data tables and sparklines.

---

## 6. Pre-Flight Quality Assurance Checklist

Before declaring any UI task complete, ensure:
- [ ] No horizontal overflow on mobile viewports (`320px` to `430px`).
- [ ] Contrast ratio between text and background is at least 4.5:1 (WCAG AA).
- [ ] Focus states are clearly visible for keyboard users.
- [ ] Interactive elements have a minimum target size of `44x44px`.
- [ ] Micro-transitions exist for hover, active, and focus states.
