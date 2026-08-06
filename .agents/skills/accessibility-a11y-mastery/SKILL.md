---
name: accessibility-a11y-mastery
description: Web accessibility (a11y) and WCAG 2.2 compliance skill. Enforces keyboard navigation, screen reader accessibility, semantic ARIA roles, focus management, color contrast standards, and touch target sizing.
---

# Accessibility (A11y) & WCAG 2.2 Mastery

This skill guarantees that all generated web interfaces meet WCAG 2.2 Level AA/AAA standards, ensuring complete accessibility for users relying on screen readers, keyboard navigation, or assistive technologies.

---

## 1. Core Principles of Web Accessibility

1. **Perceivable**: Text alternatives for non-text content, adaptable layouts, clear contrast ratios (min 4.5:1 for normal text, 3:1 for large text).
2. **Operable**: All functionality available from keyboard, no focus traps, adequate time limits, touch target size ≥ 44×44px.
3. **Understandable**: Predictable navigation, explicit input labels, helpful error messages and instructions.
4. **Robust**: Semantic HTML tags, appropriate ARIA attributes, compatible with modern screen readers (NVDA, JAWS, VoiceOver).

---

## 2. Keyboard Navigation & Focus Management

### Visible Focus Indicators
Never remove `:focus` outlines without providing a custom `:focus-visible` state!

```css
/* Accessible High-Contrast Focus Ring */
:focus-visible {
  outline: 3px solid #3b82f6 !important;
  outline-offset: 3px !important;
  border-radius: 4px;
}

/* Skip Navigation Link */
.skip-link {
  position: absolute;
  top: -100px;
  left: 16px;
  background: #0f172a;
  color: #ffffff;
  padding: 12px 20px;
  z-index: 9999;
  transition: top 0.2s ease;
}

.skip-link:focus {
  top: 16px;
}
```

---

## 3. ARIA Roles & State Patterns

### Modal Dialog Accessible Markup
```html
<div 
  class="modal-backdrop"
  role="dialog"
  aria-modal="true"
  aria-labelledby="modal-title"
  aria-describedby="modal-desc"
>
  <div class="modal-content">
    <h2 id="modal-title">Confirm Action</h2>
    <p id="modal-desc">Are you sure you want to proceed?</p>
    <button type="button" class="btn" aria-label="Close modal">✕</button>
  </div>
</div>
```

### Accessible Form Controls
```html
<div class="form-group">
  <label for="user-email" class="form-label">
    Email Address <span class="required" aria-hidden="true">*</span>
  </label>
  <input 
    type="email" 
    id="user-email" 
    name="email" 
    class="form-input"
    required
    aria-required="true"
    aria-invalid="false"
    aria-describedby="email-hint"
  />
  <span id="email-hint" class="form-hint">We will never share your email.</span>
</div>
```

---

## 4. Reduced Motion & Theme Preferences

Respect user system accessibility preferences automatically:

```css
@media (prefers-reduced-motion: reduce) {
  *,
  ::before,
  ::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}

@media (prefers-contrast: high) {
  :root {
    --border-subtle: #ffffff;
    --text-muted: #ffffff;
  }
}
```
