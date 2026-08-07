---
name: soumyas-typography
description: Design complete, production-ready typography systems for websites, apps, and brands — font selection grounded in brand psychology, font pairing, full responsive type scales (design tokens), weight and hierarchy rules, accessibility, and ready-to-paste CSS/Tailwind/Next.js/SCSS code. Use this whenever the user asks about fonts, font pairing, type scale, design tokens for text, headings vs body fonts, or wants a UI/brand to feel more premium, trustworthy, modern, or professional — even for casual asks like "what font should I use for my landing page" or "this dashboard looks generic, help me fix the type."
---

# UI Typography System — Full Skill Reference

> Combined contents of `ui-typography-system.skill`: the main SKILL.md plus every bundled reference file, merged into one document for easy copying.

---

## Table of Contents
1. [SKILL.md — Core Instructions](#skillmd--core-instructions)
2. [references/font-library.md](#referencesfont-librarymd)
3. [references/pairings-and-weights.md](#referencespairings-and-weightsmd)
4. [references/type-scale.md](#referencestype-scalemd)
5. [references/implementation.md](#referencesimplementationmd)
6. [references/resource-library.md](#referencesresource-librarymd)

---

## SKILL.md — Core Instructions

# UI Typography System

Typography is one of the highest-leverage design decisions in a product: it sets the brand's personality before a single word is read, and it silently affects readability, trust, and conversion on every screen after that. Treat it with the same rigor as any other system-level design decision — never pick a font because it's trendy or because it's the first thing that came to mind.

The core discipline of this skill: **every font recommendation is justified by the product's context, not by taste alone**, and every recommendation names its trade-offs and at least one or two viable alternatives. A font choice with no stated reason is a guess wearing a decision's clothes.

## Scale the response to the ask

Not every question needs the full report below. If someone asks "what's a good pairing for a fintech dashboard," give a focused answer: 1-2 pairing recommendations with a short rationale, maybe a token snippet if they're clearly implementing it. Reserve the full workflow and report format for when someone is actually building or overhauling a typography system (a new product, a rebrand, a design system, "help me set up our type scale"). Read the room the same way a senior designer would in a real conversation — don't pad a quick answer into a 13-section report.

## Workflow

### 1. Read the brief

Before touching fonts, understand what's actually being designed. Pull from what the user has already told you (product type, stack, vibe they described) and only ask about what's genuinely missing and would change the recommendation — don't interrogate someone who just wants a quick suggestion. Relevant context:

- Industry, product category, and what the product is trying to make someone feel or do
- Target audience and geographic/language market
- Brand personality in a few words, and desired emotional tone
- Reading density (marketing site vs. dense dashboard vs. long-form docs)
- Device mix (mobile-heavy vs. desktop-heavy) and any accessibility requirements
- Tech stack (Next.js, Vite, plain HTML, etc.) and performance constraints

Generic context ("it's a B2B SaaS tool that needs to feel trustworthy but not boring") is enough to proceed — you don't need every bullet answered.

### 2. Position the brand

Place the brand on a handful of personality spectra and give each a rough score (1-10) with a one-line reason — this is what everything downstream gets justified against:

Minimal ↔ Expressive · Luxury ↔ Affordable · Friendly ↔ Professional · Human ↔ Technical · Creative ↔ Corporate · Playful ↔ Serious · Modern ↔ Traditional · Premium ↔ Mass-market

You don't need all eight for a quick answer — pick the 2-3 that actually differentiate this brand's choices.

### 3. Connect typography to psychology

Typeface qualities read as personality traits before anyone processes the words: geometric sans faces (circular bowls, uniform stroke) tend to read as modern and technical; humanist sans faces (calligraphic roots, warmer curves) read as approachable and trustworthy; high-contrast serifs read as luxury and editorial authority; monospace reads as technical precision. Wide letter-spacing and light weights read as premium/airy; tight spacing and heavy weights read as bold/urgent. Use this to explain *why* a candidate font fits, not just *that* it does.

### 4. Shortlist and evaluate fonts

Read `references/font-library.md` for the candidate pool (organized by grotesque/geometric/humanist sans, serif/display, and monospace) and the evaluation criteria (readability, variable-font support, licensing, language coverage, performance, brand match, adoption/maintenance). Score your top 3-5 candidates against the brief and pick a winner — but always name the runner-up(s) and why they lost.

### 5. Build the pairing system

Read `references/pairings-and-weights.md` for example complete systems and the logic behind a good pairing (contrast on at least one axis, shared mood, clear hierarchy). Propose a primary heading/body/mono pairing plus one alternative system, and explain the pairing logic rather than just naming fonts.

### 6. Define the type scale as design tokens

Read `references/type-scale.md` for the full token list (Display sizes down through Caption, Label, Button, Code) with responsive guidance. Prefer a consistent modular scale over eyeballed pixel jumps, and fluid (`clamp()`-based) sizing over fixed breakpoints where the stack supports it — explain this choice if it's non-obvious to the reader.

### 7. Set hierarchy and rhythm rules

Give concrete rules, not vague advice: line length (~45-75 characters for body text), line-height that loosens as text gets smaller and tightens as it gets larger, spacing on a consistent rhythm (e.g. an 8px grid), and clear alignment defaults. These rules are what make a system feel deliberate on every screen, not just the one it was designed on.

### 8. Plan for performance and accessibility

Cover both briefly inline, and point to `references/implementation.md` for specifics: variable fonts, subsetting, self-hosting vs. Google Fonts/Fontsource, `font-display: swap`, preloading, and CLS prevention on the performance side; WCAG-aligned minimum sizes, contrast ratios, line-height, and reflow on the accessibility side. Accessibility and performance are not "nice to haves" tacked on at the end — a beautiful system that causes layout shift or fails contrast checks isn't done yet.

### 9. Ship implementation-ready code

Read `references/implementation.md` for ready-to-adapt snippets (CSS variables, SCSS, Tailwind config, Next.js `next/font`, React, Vite + Fontsource, Astro, plain HTML). Only produce code for the stack the user actually has — don't dump all seven variants unless they're comparing options.

### 10. Note alternatives by budget or use case

If it's relevant, mention how the recommendation would shift for a different constraint: a free/open-source-only budget, an enterprise licensing requirement, or a different product type (marketing landing page vs. dense dashboard vs. documentation site vs. portfolio). A line or two per relevant alternative is usually enough — this isn't its own deep section unless asked.

## Final deliverable format

When the ask calls for the full system (see "Scale the response to the ask" above), structure the report this way:

```markdown
# Typography System — [Product/Brand Name]

## 1. Brief & Brand Analysis
## 2. Brand Personality Scorecard
## 3. Typography Psychology Rationale
## 4. Font Shortlist & Evaluation (winner + runners-up, with trade-offs)
## 5. Recommended Pairing (+ 1-2 alternative systems)
## 6. Type Scale (responsive design tokens)
## 7. Weight System
## 8. Hierarchy & Spacing Rules
## 9. Performance Plan
## 10. Accessibility Notes
## 11. Implementation Code (for the user's actual stack)
## 12. Alternatives (budget / use case, if relevant)
## 13. Trade-offs & Confidence (0-100, and what would raise it)
```

Leave out any section that doesn't apply rather than padding it — a confidence score with no stated caveats, or an accessibility section that just says "looks fine," isn't adding anything.

## Reference files

- `references/font-library.md` — candidate font pool by category, with the evaluation criteria and how to score them
- `references/pairings-and-weights.md` — example pairing systems and per-element weight guidance
- `references/type-scale.md` — the full responsive token scale, from Display sizes to Code
- `references/implementation.md` — production code for CSS/SCSS/Tailwind/Next.js/React/Vite/Astro/HTML, plus performance and accessibility checklists
- `references/resource-library.md` — curated font sources, GitHub repos, and pairing/inspiration sites, including a "just five bookmarks" shortlist


---

## references/font-library.md

# Font Library & Evaluation Matrix

Use this as a starting shortlist, not a closed list — if the brief calls for something outside this pool (a specific brand typeface, a licensed commercial face), evaluate it with the same criteria below. These candidates are here because they're well-maintained, have solid variable-font support, and cover the range of moods a product typically needs.

## Candidate pool, by category

### Neo-grotesque / workhorse sans (safe, neutral, highly legible UI text)
- **Inter** — the default-safe choice for product UI. Huge adoption, excellent hinting at small sizes, enormous language coverage. Reads as competent and neutral rather than distinctive — a fine choice when the brand personality should come from color/imagery rather than type.
- **Public Sans** — US government's open sans; similar neutrality to Inter with a slightly more institutional, no-nonsense feel. Good for trust-heavy, compliance-adjacent products.
- **Work Sans** — warmer and slightly more humanist than Inter at a glance; good middle ground for products that want approachable-but-clean.
- **Source Sans 3** — mature, well-tested, Adobe-maintained; safe for documentation and enterprise tools.

### Geometric / technical sans (modern, confident, slightly more character than a pure workhorse)
- **Geist** — Vercel's typeface; crisp, technical, and unmistakably "developer tool" in mood. Strong choice for dev-facing products, dashboards, CLIs.
- **Space Grotesk** — geometric with quirky details (the lowercase 'g', tighter apertures); reads as startup-modern with a bit of personality without going full display face.
- **General Sans / Satoshi / Switzer / Cabinet Grotesk** (Fontshare) — contemporary geometric grotesques with excellent variable-weight ranges; popular in current SaaS/startup design because they read as fresh without being unfamiliar. Free for commercial use with attribution-friendly licensing — check current terms before shipping.
- **Outfit** — rounder geometric sans, friendlier and softer than Space Grotesk; good for consumer products wanting warmth with a modern edge.
- **Instrument Sans / Mona Sans** — newer, well-executed geometric sans with strong variable axes; Mona Sans (GitHub) leans slightly technical.

### Humanist sans (warmer, more approachable, better for long reading)
- **Manrope** — rounded terminals, friendly but still crisp enough for UI; a common Inter alternative when the brand wants more warmth.
- **Plus Jakarta Sans** — humanist with distinctive character in the italics and numerals; good for products wanting personality in body text, not just headings.
- **DM Sans** — clean humanist sans, low-contrast, reads well at small sizes; safe secondary choice.
- **IBM Plex Sans** — part of a full type family (sans/serif/mono) with a technical-but-humane feel; good when you want the whole family (headings, body, code) to visibly belong together.
- **Recursive** — a variable "superfamily" spanning sans to mono to casual/code in one font; useful when you want one file to flex across many roles and cut down on font-loading overhead.
- **Geologica** — geometric-humanist hybrid with a very wide weight range; good for expressive display use.

### Serif / display (editorial authority, luxury, warmth, long-form reading)
- **Literata** — Google's serif designed for long-form reading (originally for ebooks); excellent body-text choice when a product wants editorial warmth without going fully decorative.
- **Newsreader / Spectral** — contemporary text serifs, good for blogs, docs, and long-form content that still needs to feel current rather than classical.
- **Merriweather** — sturdy, high-legibility serif; safe and slightly more traditional than Newsreader/Spectral.
- **Playfair Display** — high-contrast display serif; strong luxury/editorial signal for headlines, but not for body text (contrast makes small sizes harder to read).
- **Cormorant Garamond** — elegant, light, classical; luxury/fashion territory, headline use only.

### Monospace (code, data, technical precision)
- **JetBrains Mono** — purpose-built for code, excellent ligature support, very popular; safe default.
- **IBM Plex Mono** — pairs naturally if you're already using IBM Plex Sans elsewhere.
- **Geist Mono** — pairs naturally with Geist; good for dev-tool products wanting one cohesive family.
- **Iosevka** — narrower, highly customizable, good when horizontal density matters (terminals, data-dense tables).

## Evaluation criteria

Score realistic candidates (usually 3-5) against these; not every criterion matters equally for every product — weight them by what the brief actually needs.

| Criterion | What "good" looks like |
|---|---|
| Readability (desktop) | Clear letterforms at 14-18px body sizes, no ambiguous character pairs (I/l/1, O/0) |
| Readability (mobile) | Holds up at smaller effective sizes and lower-DPI rendering |
| Variable font support | Single file covers the weight range you need — fewer HTTP requests, smoother interpolation |
| Hinting quality | Renders cleanly at small sizes without blurring, especially on Windows ClearType |
| Accessibility | Adequate x-height, open apertures, distinguishable characters |
| License | Open (OFL) is safe for most products; check commercial terms for anything from a foundry marketplace |
| Language/character coverage | Covers every market the product ships in — don't discover a missing script in production |
| Performance (file size) | Variable font file size vs. how many weights/styles you'd otherwise load separately |
| Brand match | Ties back to the brand personality scoring from step 2 of the main workflow |
| Developer friendliness | Available via Fontsource/Google Fonts/npm, or easy to self-host |
| Adoption / long-term maintenance | Active GitHub repo, used by other serious products — lowers the risk of an abandoned font |

When you present the evaluation, don't just list scores — say which criteria were decisive for this particular product, since that's the part that makes the recommendation feel earned rather than arbitrary.


---

## references/pairings-and-weights.md

# Font Pairing & Weight System

## What makes a pairing work

A pairing needs contrast on at least one axis (geometric vs. humanist, high vs. low stroke contrast, wide vs. tight x-height) so headings and body text are visually distinct — but it also needs a shared mood so the two don't fight each other. Two workhorse grotesques with near-identical proportions (e.g. Inter heading + Inter body) isn't wrong, it's just low-contrast on purpose — fine for a product that wants type to disappear into the background. A display serif heading over a technical mono body would be high-contrast but mismatched in mood unless the brand genuinely spans "editorial" and "technical."

When proposing a pairing, name what axis creates the contrast and why that contrast serves the brand — that's the difference between a pairing and a guess.

## Example complete systems

**System A — Neutral & technical** (dev tools, dashboards, infrastructure products)
- Heading: Geist
- Body: Inter
- Mono: JetBrains Mono
- Why it works: both sans faces share a technical, low-warmth mood, so there's no jarring shift between headline and paragraph; Geist's slightly more geometric character gives headlines a bit more presence without breaking the family resemblance.

**System B — Modern startup with personality** (consumer SaaS, product marketing)
- Heading: Space Grotesk
- Body: Manrope
- Mono: IBM Plex Mono
- Why it works: Space Grotesk's geometric quirks read as confident and current in large display sizes; Manrope's humanist warmth keeps body copy comfortable to read at length, so the personality lives in headlines without tiring the reader in paragraphs.

**System C — Contemporary and crafted** (design tools, creative products, premium consumer)
- Heading: General Sans
- Body: Satoshi
- Mono: Geist Mono
- Why it works: both from the same type family logic (Fontshare's contemporary geometric grotesques), so the pairing reads as one cohesive voice rather than two competing ones — a good choice when the brand wants freshness without visual noise.

**System D — Editorial warmth** (content-heavy products, blogs, docs, long-form reading)
- Heading: Newsreader or Spectral
- Body: Literata or Source Sans 3
- Mono: IBM Plex Mono
- Why it works: a text serif in headlines signals editorial authority and warmth; pairing it with a highly legible sans (or a reading-optimized serif) for body text keeps long-form content comfortable rather than precious.

Treat these as starting templates — swap in whichever candidate from `font-library.md` best matches the brief's brand-personality scoring, keeping the same contrast logic.

## Weight usage by UI element

Overusing bold flattens hierarchy — if everything is emphasized, nothing is. Reserve heavier weights for places that need to win the eye immediately, and lean on size/color/spacing for hierarchy everywhere else.

| Element | Typical weight range | Why |
|---|---|---|
| Hero / Display | 600-800 (semibold-bold) | Needs to command attention at first glance |
| Section titles | 600 (semibold) | Clear hierarchy without competing with the hero |
| Cards | 500-600 for title, 400 for body | Title needs to stand out from its own card body, not from the whole page |
| Body text | 400 (regular) | Long reading needs the lowest visual weight for comfort |
| Navigation | 500 (medium) | Slightly heavier than body so it reads as UI chrome, not content |
| Sidebar | 400-500 | Usually secondary to main content — keep it quiet |
| Forms (labels/inputs) | 500 for labels, 400 for input text | Labels need to be scannable; input text should feel neutral |
| Buttons | 500-600 (medium-semibold) | Needs to read as actionable without shouting |
| Tables | 400 body, 500-600 header | Headers need to separate from data rows at a glance |
| Dashboard numerals/KPIs | 600-700, often with tabular figures enabled | Numbers are usually the whole point of a dashboard — let them be the heaviest thing on the card |
| Documentation | 400 body, 600 headings, 400 mono for code | Long-form reading rules apply; code should look distinct, not shouty |
| Charts (axis/legend) | 400-500 | Supporting information, should recede behind the data itself |
| Dialogs/modals | 600 for title, 400 for body | Same logic as cards, at higher stakes since it's interrupting the user |
| Code blocks | 400 mono, occasionally 500 for emphasis/diff highlighting | Monospace already reads as distinct; extra weight is rarely needed |

If a variable font is in use, prefer interpolated weights that match this table over jumping straight to a static 700 "Bold" — it usually looks heavier than intended relative to the rest of the system.


---

## references/type-scale.md

# Type Scale (Design Tokens)

Build the scale from a consistent ratio rather than picking sizes by feel — it's what makes every screen in the product feel like it belongs to the same system. A ratio between 1.125 (major second, subtle) and 1.333 (perfect fourth, more dramatic contrast) works for most products; go tighter for dense dashboards, looser for marketing/editorial sites where big type is doing brand work.

Prefer fluid sizing (`clamp(min, preferred, max)`) over fixed breakpoint jumps where the stack supports it — type scales smoothly with the viewport instead of snapping at arbitrary widths, and it's fewer tokens to maintain. The desktop/tablet/mobile values below are still useful as the min/max anchors for those `clamp()` calls, or as literal breakpoint values if the project prefers fixed steps.

As a rule of thumb: line-height loosens as text gets smaller (small text needs more breathing room to stay legible) and tightens as text gets larger (big headlines look loose and disconnected at body-text line-heights).

| Token | Desktop | Tablet | Mobile | Line-height | Letter-spacing | Typical use |
|---|---|---|---|---|---|---|
| Display XXL | 96-128px | 72-96px | 48-64px | 1.0-1.05 | -2% to -3% | Marketing hero, landing page statement |
| Display XL | 72-96px | 56-72px | 40-48px | 1.05-1.1 | -1.5% to -2% | Large hero headline |
| Display L | 56-72px | 44-56px | 32-40px | 1.1-1.15 | -1% to -1.5% | Section hero, feature headline |
| Hero | 48-56px | 36-44px | 28-32px | 1.1-1.2 | -0.5% to -1% | Page-level hero (product pages, dashboards) |
| H1 | 36-44px | 30-36px | 24-28px | 1.15-1.25 | -0.5% | Page title |
| H2 | 28-32px | 24-28px | 20-24px | 1.2-1.3 | -0.25% to -0.5% | Major section heading |
| H3 | 22-24px | 20-22px | 18-20px | 1.25-1.35 | 0 to -0.25% | Subsection heading |
| H4 | 18-20px | 18px | 16-18px | 1.3-1.4 | 0 | Card/component title |
| H5 | 16-18px | 16px | 16px | 1.35-1.4 | 0 | Minor heading, list group title |
| H6 | 14-16px | 14px | 14px | 1.4 | 0.25% (often uppercase) | Smallest heading, eyebrow-adjacent |
| Subtitle | 18-20px | 16-18px | 16px | 1.4-1.5 | 0 | Supporting line under a heading |
| Body XL | 18-20px | 18px | 16-18px | 1.5-1.6 | 0 | Lead paragraph, intro copy |
| Body L | 16-18px | 16px | 16px | 1.5-1.6 | 0 | Comfortable default reading size |
| Body | 14-16px | 14-16px | 14-16px | 1.5-1.6 | 0 | Standard UI/paragraph text |
| Body Small | 13-14px | 13-14px | 13-14px | 1.5 | 0.1% | Secondary/supporting text |
| Caption | 12-13px | 12-13px | 12px | 1.4-1.5 | 0.2% | Image captions, timestamps, metadata |
| Overline | 11-12px | 11-12px | 11-12px | 1.3 | 8-12% (uppercase) | Category labels, eyebrow text above headings |
| Label | 12-13px | 12-13px | 12-13px | 1.3-1.4 | 0.2-0.5% | Form labels, input labels |
| Button | 14-16px | 14-16px | 14-16px | 1.2 (usually single line) | 0.2-0.5% | Button/CTA text |
| Navigation | 14-15px | 14-15px | 14-16px | 1.3 | 0.1-0.2% | Nav bar, tab labels |
| Tooltip | 12-13px | 12-13px | 12-13px | 1.4 | 0 | Tooltips, popovers |
| Code | 13-14px | 13-14px | 13-14px | 1.5-1.6 | 0 | Inline code, code blocks (monospace) |

Never go below 16px for primary body text on mobile — smaller forces iOS Safari to zoom in on input focus, which is a jarring, unintentional UX break, not a deliberate choice.

Pair each token with a paragraph-spacing value too (commonly 0.75-1× the token's line-height, in `rem`) so vertical rhythm stays consistent — see "Set hierarchy and rhythm rules" in the main workflow for the broader spacing system this scale sits inside.


---

## references/implementation.md

# Implementation

Only produce the snippet(s) for the stack the user is actually on — these are templates to adapt with the real chosen fonts and token values from `type-scale.md`, not boilerplate to dump wholesale.

## CSS custom properties (framework-agnostic base)

```css
:root {
  /* Font families */
  --font-heading: 'Geist', system-ui, sans-serif;
  --font-body: 'Inter', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', ui-monospace, monospace;

  /* Type scale (fluid, clamp(min, preferred, max)) */
  --text-h1: clamp(1.75rem, 1.4rem + 1.5vw, 2.75rem);
  --text-h2: clamp(1.375rem, 1.2rem + 0.8vw, 2rem);
  --text-body: clamp(0.9375rem, 0.9rem + 0.1vw, 1rem);
  --text-caption: 0.8125rem;

  /* Weights */
  --weight-regular: 400;
  --weight-medium: 500;
  --weight-semibold: 600;
  --weight-bold: 700;

  /* Line-height */
  --leading-tight: 1.15;
  --leading-heading: 1.3;
  --leading-body: 1.55;
}

h1 { font: var(--weight-semibold) var(--text-h1)/var(--leading-tight) var(--font-heading); }
body { font: var(--weight-regular) var(--text-body)/var(--leading-body) var(--font-body); }
code { font-family: var(--font-mono); }
```

## SCSS (map-based tokens)

```scss
$fonts: (
  heading: ('Geist', system-ui, sans-serif),
  body: ('Inter', system-ui, sans-serif),
  mono: ('JetBrains Mono', ui-monospace, monospace),
);

$type-scale: (
  h1: (size: clamp(1.75rem, 1.4rem + 1.5vw, 2.75rem), leading: 1.15, weight: 600),
  h2: (size: clamp(1.375rem, 1.2rem + 0.8vw, 2rem), leading: 1.25, weight: 600),
  body: (size: clamp(0.9375rem, 0.9rem + 0.1vw, 1rem), leading: 1.55, weight: 400),
);

@mixin text-style($token) {
  $s: map-get($type-scale, $token);
  font-size: map-get($s, size);
  line-height: map-get($s, leading);
  font-weight: map-get($s, weight);
}
```

## Tailwind config

```js
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      fontFamily: {
        heading: ['Geist', 'system-ui', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        h1: ['clamp(1.75rem, 1.4rem + 1.5vw, 2.75rem)', { lineHeight: '1.15', fontWeight: '600' }],
        h2: ['clamp(1.375rem, 1.2rem + 0.8vw, 2rem)', { lineHeight: '1.25', fontWeight: '600' }],
        body: ['clamp(0.9375rem, 0.9rem + 0.1vw, 1rem)', { lineHeight: '1.55' }],
      },
    },
  },
};
```

## Next.js (`next/font`)

```tsx
// app/fonts.ts
import { Inter, Geist } from 'next/font/google';

export const inter = Inter({ subsets: ['latin'], variable: '--font-body' });
export const geist = Geist({ subsets: ['latin'], variable: '--font-heading' });

// app/layout.tsx
import { inter, geist } from './fonts';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${geist.variable}`}>
      <body>{children}</body>
    </html>
  );
}
```

`next/font` self-hosts and subsets automatically, so there's no extra step needed for the self-hosting/subsetting guidance below — it's handled for you.

## Vite + Fontsource

```bash
npm install @fontsource-variable/inter @fontsource-variable/geist
```

```ts
// main.ts
import '@fontsource-variable/inter';
import '@fontsource-variable/geist';
```

## Astro

```astro
---
// src/layouts/Base.astro
---
<link rel="preload" href="/fonts/inter-var.woff2" as="font" type="font/woff2" crossorigin />
<style is:global>
  @font-face {
    font-family: 'Inter';
    src: url('/fonts/inter-var.woff2') format('woff2-variations');
    font-weight: 100 900;
    font-display: swap;
  }
</style>
```

## Plain HTML / self-hosted `@font-face`

```html
<link rel="preload" href="/fonts/geist-var.woff2" as="font" type="font/woff2" crossorigin>
<style>
  @font-face {
    font-family: 'Geist';
    src: url('/fonts/geist-var.woff2') format('woff2-variations');
    font-weight: 100 900;
    font-display: swap;
  }
</style>
```

## Performance checklist

- **Prefer variable fonts** — one file covers the whole weight range instead of loading 4-6 static files.
- **Subset to what you ship** (glyphhanger or similar) — don't load Cyrillic/Greek glyph sets for a Latin-only product.
- **Self-host over Google Fonts' CDN** where possible — one fewer DNS/TLS round trip, and avoids third-party request waterfalls; Fontsource and Bunny Fonts both make self-hosting easy without giving up Google Fonts' catalog.
- **`font-display: swap`** (or `optional` if a layout shift on swap is worse than showing the fallback longer) — prevents invisible text during load (FOIT).
- **Preload the critical font** (usually the body text font) with `<link rel="preload" as="font">` so it's discovered before render-blocking CSS finishes.
- **Prevent CLS on swap** — use `size-adjust`, `ascent-override`, and `descent-override` in the `@font-face` block (or let `next/font` handle this automatically) so the fallback font occupies the same space as the webfont once it loads.
- **Cache aggressively** — font files are static assets; long `Cache-Control` max-age is safe.

## Accessibility checklist (WCAG-aligned)

- **Minimum sizes** — 16px for primary body text; never smaller than 12px anywhere, including captions/labels.
- **Contrast** — at least 4.5:1 for body text, 3:1 for large text (24px+ or 19px+ bold), against its background.
- **Line-height** — at least 1.5× for body text, per WCAG 1.4.12 (Text Spacing).
- **Line length** — cap body text around 75 characters so tracking eye-return doesn't become fatiguing.
- **Avoid long stretches of all-caps or heavy letter-spacing** on body text — it slows reading for everyone and is worse for some cognitive/reading disabilities.
- **Don't rely on a purely decorative display face for anything functional** (buttons, form labels, error messages) — save personality fonts for headlines where mis-reading a character has no consequence.
- **Support zoom and reflow** — don't disable pinch-zoom (`user-scalable=no`), and make sure the layout reflows cleanly up to 200% zoom without horizontal scrolling.
- **Don't communicate meaning through weight/style alone** — e.g. a bold-only error state also needs a color/icon cue for colorblind users.


---

## references/resource-library.md

# Resource Library

Point to these when the user wants to explore fonts themselves, self-host, or dig into pairing inspiration. Prefer linking the specific relevant one over dumping the whole list.

## Font discovery / hosting

- **Google Fonts** — https://fonts.google.com — the largest free catalog; good default, though CDN self-hosting is worth considering for performance/privacy.
- **Fontshare** — https://www.fontshare.com — Indian Type Foundry's free catalog; source of General Sans, Satoshi, Switzer, Cabinet Grotesk, Clash Display.
- **Fontsource** — https://fontsource.org — npm-installable self-hosted packages for most open-source fonts (including variable versions); the easiest way to self-host without manually managing font files.
- **Adobe Fonts** — https://fonts.adobe.com — subscription catalog, useful when a Creative Cloud license is already in place.
- **Bunny Fonts** — https://fonts.bunny.net — GDPR-friendly, privacy-respecting drop-in replacement for the Google Fonts API.
- **Open Foundry** — https://open-foundry.com — curated open-license type foundry.
- **Font Squirrel** — https://www.fontsquirrel.com — free commercial-use fonts plus a webfont generator/subsetting tool.

## Official GitHub repositories

- Google Fonts — https://github.com/google/fonts
- Fontsource — https://github.com/fontsource/fontsource
- Inter — https://github.com/rsms/inter
- Geist (Vercel) — https://github.com/vercel/geist-font
- JetBrains Mono — https://github.com/JetBrains/JetBrainsMono
- IBM Plex — https://github.com/IBM/plex
- Adobe Fonts (Source Sans/Serif/Code) — https://github.com/adobe-fonts
- Recursive — https://github.com/arrowtype/recursive
- Iosevka — https://github.com/be5invis/Iosevka

## Performance tooling

- **Font Face Observer** — https://github.com/bramstein/fontfaceobserver — detect when a webfont has finished loading, for finer-grained FOIT/FOUT control than `font-display` alone.
- **Glyphhanger** — https://github.com/filamentgroup/glyphhanger — subset fonts to only the glyphs a page actually uses.

## Curated lists

- **Beautiful Web Type** — https://github.com/ubuwaits/beautiful-web-type
- **Awesome Typography** — https://github.com/Jolg42/awesome-typography
- **Design Resources for Developers** — https://github.com/bradtraversy/design-resources-for-developers
- **400 Free Design Resources** — https://github.com/noahelhadedy/400-free-design-resources

## Pairing & inspiration

- **Typewolf** — https://www.typewolf.com — curated real-world pairings, updated regularly.
- **Fontjoy** — https://fontjoy.com — generates pairing suggestions; good for breaking a rut, not a substitute for the reasoning in `pairings-and-weights.md`.
- **Typespiration** — https://typespiration.com
- **Fonts In Use** — https://fontsinuse.com — see typefaces in real shipped design work.
- **Awwwards** — https://www.awwwards.com
- **Land-book** — https://land-book.com — landing-page gallery, useful for marketing-site type in context.
- **Lapa Ninja** — https://www.lapa.ninja

## If you only bookmark five

1. **Google Fonts** — the widest catalog, the default starting point.
2. **Fontsource** — turns any of those fonts into a two-line self-hosted install.
3. **Beautiful Web Type** — curated quality bar, saves time filtering the huge catalogs.
4. **Typewolf** — real pairings in real products, for when a system needs a second reference point.
5. **Fontjoy** — quick unstuck button when nothing on the shortlist feels right.

These five cover the whole loop: discovery, self-hosting, quality filtering, pairing inspiration, and a fallback when stuck.

---

# Universal AI Prompt for Professional Website Typography

You are an expert UI/UX designer and typography specialist with experience designing interfaces at the quality level of Apple, Stripe, Linear, Vercel, Notion, Framer, Airbnb, and Figma.

Your task is to select the **best typography system** for every website you design. Do **not** choose fonts randomly. Every font pairing must match the brand personality, industry, readability, accessibility, and overall visual hierarchy.

## Objectives

* Choose modern, professional, and highly readable fonts.
* Match the typography to the website's purpose.
* Use proper font hierarchy, spacing, and sizing.
* Ensure excellent readability on desktop, tablet, and mobile.
* Prioritize performance and accessibility.
* Prefer variable fonts whenever possible.
* Avoid outdated or overused combinations unless they genuinely fit the design.

---

# Typography Workflow

For every project:

### Step 1 — Analyze the Brand

Determine:

* Industry
* Target audience
* Brand personality
* Premium vs Minimal
* Friendly vs Corporate
* Luxury vs Startup
* Serious vs Playful
* Modern vs Traditional

---

### Step 2 — Select Fonts

Choose:

* Display Font (optional)
* Heading Font
* Body Font
* UI Font
* Monospace Font (if needed)

Provide reasons for every choice.

---

### Step 3 — Create Font Pairing

Generate combinations such as:

Example:

Heading:
Space Grotesk

Body:
Inter

Buttons:
Inter Medium

Code:
JetBrains Mono

Explain why this combination works.

---

### Step 4 — Typography Scale

Generate a complete scale.

Example:

Hero
64–80px

H1
48px

H2
40px

H3
32px

H4
24px

Body Large
20px

Body
18px

Body Small
16px

Caption
14px

Tiny
12px

Specify:

* font-weight
* line-height
* letter-spacing

---

### Step 5 — Responsive Typography

Provide typography for:

Desktop

Tablet

Mobile

---

### Step 6 — Accessibility

Ensure:

* WCAG compliant
* Good readability
* Proper contrast
* Comfortable line length
* Proper paragraph spacing

---

### Step 7 — Performance

Recommend:

* Variable fonts
* Self-hosting
* Font preloading
* font-display: swap
* Font fallbacks
* Minimal font files

---

### Step 8 — Deliverables

Always include:

* Font names
* Download links
* GitHub repository (if available)
* License
* Google Fonts availability
* Variable font support
* CDN/self-hosting recommendation

---

# Choose Fonts Based on Website Type

Recommend typography for:

* SaaS
* AI
* Startup
* Dashboard
* Portfolio
* Agency
* E-commerce
* Blog
* News
* Healthcare
* Finance
* Education
* Government
* Restaurant
* Travel
* Luxury Brand
* Landing Page
* Mobile App
* Enterprise Software

---

# Always Suggest Alternatives

Example:

Primary

Inter

Alternative

Manrope

Alternative

General Sans

Alternative

Plus Jakarta Sans

Explain the trade-offs.

---

# Typography Rules

Never:

* Use more than 2–3 font families.
* Mix unrelated styles.
* Sacrifice readability.
* Use decorative fonts for body text.

Always:

* Maintain strong visual hierarchy.
* Use consistent spacing.
* Keep font weights balanced.
* Optimize loading speed.

---

# Required Resources

## Font Libraries

Google Fonts
https://fonts.google.com

Fontsource
https://fontsource.org

Adobe Fonts
https://fonts.adobe.com

Fontshare
https://www.fontshare.com

Bunny Fonts
https://fonts.bunny.net

Open Foundry
https://open-foundry.com

Font Squirrel
https://www.fontsquirrel.com

---

## GitHub Repositories

Google Fonts
https://github.com/google/fonts

Fontsource
https://github.com/fontsource/fontsource

Inter
https://github.com/rsms/inter

Geist
https://github.com/vercel/geist-font

JetBrains Mono
https://github.com/JetBrains/JetBrainsMono

IBM Plex
https://github.com/IBM/plex

Adobe Fonts
https://github.com/adobe-fonts

Recursive
https://github.com/arrowtype/recursive

Iosevka
https://github.com/be5invis/Iosevka

---

## Typography Inspiration

Typewolf
https://www.typewolf.com

Fontjoy
https://fontjoy.com

Typespiration
https://typespiration.com

Fonts In Use
https://fontsinuse.com

Awwwards
https://www.awwwards.com

Land-book
https://land-book.com

Lapa Ninja
https://www.lapa.ninja

Beautiful Web Type
https://github.com/ubuwaits/beautiful-web-type

Awesome Typography
https://github.com/Jolg42/awesome-typography

Design Resources for Developers
https://github.com/bradtraversy/design-resources-for-developers

---

# Final Output Format

For every website, produce:

1. Brand personality analysis
2. Recommended font system
3. Font pairing with rationale
4. Typography scale
5. Responsive typography
6. Accessibility notes
7. Performance optimization recommendations
8. Font download links
9. GitHub repositories
10. Alternative font pairings
11. CSS/Next.js/Tailwind implementation example
12. Final explanation of why this typography system best matches the website's design goals.
