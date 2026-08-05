---
name: frontend-design-expert
description: Production-grade frontend design and architecture skill. Enforces responsive layout grids, CSS design tokens, modern visual aesthetics, glassmorphism/surface elevation, component state transitions, and clean HTML5 semantic structures.
---

# Frontend Design Expert: Production Architecture & Styling

This skill guides the creation of modular, maintainable, and visually striking frontend components using vanilla CSS, modern CSS subgrid/flexbox/grid layouts, responsive media queries, design tokens, and smooth UI state transitions.

---

## 1. CSS Design Tokens Standard

Maintain clean CSS variables scoped to `:root` for effortless theme switching (Light/Dark mode) and visual consistency across all components:

```css
:root {
  /* Color Palette - HSL Derived */
  --bg-primary: hsl(224, 25%, 6%);
  --bg-surface: hsl(224, 20%, 10%);
  --bg-surface-elevated: hsl(224, 18%, 14%);
  --bg-glass: rgba(16, 20, 32, 0.7);
  
  --border-subtle: rgba(255, 255, 255, 0.08);
  --border-strong: rgba(255, 255, 255, 0.16);
  --border-focus: hsl(217, 91%, 60%);

  --text-main: hsl(210, 40%, 98%);
  --text-muted: hsl(215, 20%, 65%);
  --text-faint: hsl(215, 16%, 45%);

  --brand-primary: hsl(217, 91%, 60%);
  --brand-gradient: linear-gradient(135deg, hsl(217, 91%, 60%), hsl(270, 91%, 65%));

  /* Elevation Shadows */
  --shadow-sm: 0 2px 4px rgba(0, 0, 0, 0.2);
  --shadow-md: 0 8px 16px -4px rgba(0, 0, 0, 0.3);
  --shadow-lg: 0 16px 32px -8px rgba(0, 0, 0, 0.4);
  --shadow-glow: 0 0 24px -4px rgba(59, 130, 246, 0.3);

  /* Border Radii */
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 16px;
  --radius-full: 9999px;

  /* Transitions */
  --transition-fast: 150ms cubic-bezier(0.4, 0, 0.2, 1);
  --transition-normal: 250ms cubic-bezier(0.4, 0, 0.2, 1);
  --transition-bounce: 350ms cubic-bezier(0.34, 1.56, 0.64, 1);
}
```

---

## 2. Layout Mastery (Grid & Flexbox Patterns)

### Modern Auto-Fit Grid (No Media Query Clutter)
```css
.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 300px), 1fr));
  gap: var(--space-6, 24px);
}
```

### Flexible Center Container with Container Queries
```css
.container {
  width: 100%;
  max-width: 1280px;
  margin-left: auto;
  margin-right: auto;
  padding-left: clamp(1rem, 5vw, 2.5rem);
  padding-right: clamp(1rem, 5vw, 2.5rem);
}
```

---

## 3. Glassmorphism & Surface Elevation

```css
.glass-panel {
  background: var(--bg-glass);
  backdrop-filter: blur(16px) saturate(180%);
  -webkit-backdrop-filter: blur(16px) saturate(180%);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
}

.glass-panel:hover {
  border-color: var(--border-strong);
  box-shadow: var(--shadow-lg), var(--shadow-glow);
}
```

---

## 4. Semantic HTML5 Structure Standards

Always build components using explicit semantic HTML elements to maximize accessibility, SEO, and developer readability:

```html
<header class="app-header">
  <nav class="nav-container" aria-label="Main Navigation">
    <a href="/" class="brand-logo">...</a>
    <ul class="nav-links" role="list">
      <li><a href="#features">Features</a></li>
    </ul>
  </nav>
</header>

<main id="main-content">
  <section class="hero-section" aria-labelledby="hero-title">
    <h1 id="hero-title">...</h1>
  </section>
</main>
```

---

## 5. Component State Animations

Always implement explicit CSS styles for state variations:
- `:hover`
- `:focus-visible`
- `:active`
- `:disabled` / `aria-disabled="true"`
- `.is-loading` / `aria-busy="true"`

```css
.btn-primary {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 24px;
  font-weight: 600;
  border-radius: var(--radius-md);
  background: var(--brand-primary);
  color: #fff;
  border: none;
  cursor: pointer;
  transition: transform var(--transition-bounce), background-color var(--transition-fast), box-shadow var(--transition-fast);
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px -4px rgba(59, 130, 246, 0.5);
}

.btn-primary:active {
  transform: translateY(0);
}

.btn-primary:focus-visible {
  outline: 2px solid var(--border-focus);
  outline-offset: 3px;
}
```
