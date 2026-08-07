---
name: premium-typography
description: Enforces the use of high-end, premium typography scales and font families (like Plus Jakarta Sans, Outfit, Geist, Inter Display) over default browser fonts. Prevents generic AI font choices.
---

# Premium Typography Skill

This skill ensures that interfaces look expensive and professionally designed by enforcing strict typographic rules. Generic fonts like default Arial, standard Inter, and Times New Roman are banned for primary UI unless explicitly requested.

## 1. Allowed Font Families
- **Primary Sans (Modern/SaaS)**: `Plus Jakarta Sans`, `Geist`, `Inter Display`, `SF Pro Display`
- **Primary Sans (Agency/Bold)**: `Outfit`, `Clash Display`, `Space Grotesk`
- **Primary Mono**: `JetBrains Mono`, `Geist Mono`

## 2. Implementation Rules
- Always use Google Fonts (via `<link>` in `index.html`) or local font hosting.
- Extend `tailwind.config.js` to set the new font as the default `sans` family:
  ```javascript
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'sans-serif'],
      }
    }
  }
  ```

## 3. Typographic Styling Rules
- **Tracking (Letter-Spacing)**: High-end design relies on tight tracking for headers. Always use `tracking-tight` or `tracking-tighter` for `h1` through `h3`.
- **Line-Height**: Use `leading-none` or `leading-tight` for massive headers. Use `leading-relaxed` for body copy.
- **Small Caps**: For overlines (eyebrows) or micro-labels, use `text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.1em]`.

## 4. Anti-Slop Enforcement
- **Never** use generic serif fonts for SaaS products unless it is a specific editorial blog.
- **Never** leave the default Tailwind sans font active if a premium visual design is requested.
- **Always** ensure proper font weights are imported (e.g., 400, 500, 600, 700, 800) to support variable thickness.
