---
name: dashboard-data-visualization-ui
description: High-density admin dashboard, analytics, and data visualization UI skill. Enforces KPI metrics cards, interactive data grids, custom chart color palettes, filtering control bars, and compact layout density.
---

# Dashboard & Data Visualization UI Master Skill

This skill provides design patterns, grid layouts, component specs, and data density rules specifically engineered for complex dashboards, admin consoles, and data analytics tools.

---

## 1. Dashboard Visual Hierarchy & Density Rules

1. **Top Tier (Strategic Overview)**: KPI cards displaying aggregate numbers, trend percentages (+12.4%), sparkline previews, and status badges.
2. **Mid Tier (Data Trends)**: Interactive Chart containers (Line graphs, Stacked bar charts, Donut charts) with temporal selectors (1D, 7D, 1M, 1Y, YTD).
3. **Bottom Tier (Tactical Detail)**: Filterable Data Table with sorting, column toggle, bulk actions, and pagination controls.

---

## 2. KPI Metrics Card Design Tokens

```html
<div class="kpi-card">
  <div class="kpi-header">
    <span class="kpi-label">Total Monthly Revenue</span>
    <span class="kpi-badge positive" aria-label="14.2% increase">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>
      +14.2%
    </span>
  </div>
  <div class="kpi-value-row">
    <span class="kpi-value">$142,850.00</span>
    <span class="kpi-subtext">vs. $125,050.00 last month</span>
  </div>
  <div class="kpi-sparkline-container">
    <!-- SVG Sparkline Path -->
  </div>
</div>
```

### KPI Styling
```css
.kpi-card {
  background: var(--bg-surface, #12151E);
  border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
  border-radius: 12px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.kpi-card:hover {
  border-color: rgba(99, 102, 241, 0.3);
  box-shadow: 0 8px 24px -6px rgba(0, 0, 0, 0.3);
}

.kpi-value {
  font-family: var(--font-display, 'Outfit', sans-serif);
  font-size: 2rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--text-main, #ffffff);
}

.kpi-badge.positive {
  background: rgba(16, 185, 129, 0.12);
  color: #10b981;
  border: 1px solid rgba(16, 185, 129, 0.25);
  padding: 4px 8px;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
}
```

---

## 3. Accessible Chart Color Palette (High Contrast & Distinctness)

Never use random colors for chart series. Use a cohesive, accessible palette designed for dark & light themes:

| Series | Hex Code | Dark Theme Application |
|---|---|---|
| Primary Metric | `#6366f1` | Main Trend Line / Revenue |
| Secondary Metric | `#10b981` | Growth / Active Users |
| Tertiary Metric | `#f59e0b` | Warnings / Pending States |
| Quaternary Metric | `#ec4899` | Conversions / Retention |
| Neutral Comparison | `#64748b` | Historical Baseline |

---

## 4. High-Density Data Table Design

```css
.data-table-container {
  width: 100%;
  overflow-x: auto;
  border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
  border-radius: 12px;
  background: var(--bg-surface, #12151E);
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
  font-size: 0.875rem;
}

.data-table th {
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.03);
  color: var(--text-muted, #94a3b8);
  font-weight: 600;
  border-bottom: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
  white-space: nowrap;
}

.data-table td {
  padding: 14px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  color: var(--text-main, #f8fafc);
}

.data-table tr:hover td {
  background: rgba(255, 255, 255, 0.025);
}
```
