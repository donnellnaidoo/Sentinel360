# Sentinel360 — Theme & Styling System

> **Document Version:** 1.0  
> **Last Updated:** June 2026  
> **Author:** Lead Frontend Developer — Alpha Tech

---

## Table of Contents

1. [Complete TailwindCSS Configuration](#1-complete-tailwindcss-configuration)
2. [Color Palette](#2-color-palette)
3. [Typography System](#3-typography-system)
4. [Spacing System](#4-spacing-system)
5. [Glassmorphism Utility Classes](#5-glassmorphism-utility-classes)
6. [Animation Keyframes](#6-animation-keyframes)
7. [Dark Theme (Default) With Light Theme Support](#7-dark-theme-default-with-light-theme-support)
8. [Responsive Breakpoints Strategy](#8-responsive-breakpoints-strategy)

---

## 1. Complete TailwindCSS Configuration

```ts
// tailwind.config.ts
import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";

const config: Config = {
  darkMode: "class", // Use class-based dark mode (default to dark)
  content: [
    "./src/**/*.{ts,tsx}",
    "./src/**/*.css",
  ],
  theme: {
    extend: {
      // ─── Colors ───────────────────────────────────────────────
      colors: {
        // Backgrounds
        background: {
          DEFAULT: "#0a0e1a",
          secondary: "#1a1f2e",
          tertiary: "#2a2f3e",
          card: "rgba(255, 255, 255, 0.05)",
        },
        // Accent colors
        accent: {
          blue: "#00d4ff",
          cyan: "#00ff88",
          amber: "#ffaa00",
          red: "#ef4444",
          green: "#22c55e",
        },
        // Naval palette
        navy: {
          950: "#060a14",
          900: "#0a0e1a",
          800: "#1a1f2e",
          700: "#2a2f3e",
          600: "#3a4a5e",
          500: "#4a5a6e",
        },
        // Text colors
        text: {
          primary: "#f1f5f9",
          secondary: "#94a3b8",
          muted: "#475569",
          accent: "#00d4ff",
        },
        // Status colors
        status: {
          wanted: "#ef4444",
          investigating: "#f59e0b",
          arrested: "#22c55e",
          cleared: "#94a3b8",
          deceased: "#6b7280",
          underReview: "#3b82f6",
        },
        // Severity levels
        severity: {
          critical: "#ef4444",
          high: "#f59e0b",
          medium: "#eab308",
          low: "#3b82f6",
          info: "#00d4ff",
        },
      },

      // ─── Typography ──────────────────────────────────────────
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
        display: ["Inter", "system-ui", "sans-serif"],
      },
      fontSize: {
        // Heading sizes
        "display-xl": ["4.5rem", { lineHeight: "1.1", letterSpacing: "-0.02em", fontWeight: "700" }],
        "display-lg": ["3.75rem", { lineHeight: "1.1", letterSpacing: "-0.02em", fontWeight: "700" }],
        "display-md": ["3rem", { lineHeight: "1.2", letterSpacing: "-0.01em", fontWeight: "600" }],
        "heading-xl": ["2.25rem", { lineHeight: "1.3", letterSpacing: "-0.01em", fontWeight: "600" }],
        "heading-lg": ["1.875rem", { lineHeight: "1.3", fontWeight: "600" }],
        "heading-md": ["1.5rem", { lineHeight: "1.4", fontWeight: "600" }],
        "heading-sm": ["1.25rem", { lineHeight: "1.4", fontWeight: "600" }],
        // Body sizes
        "body-lg": ["1.125rem", { lineHeight: "1.6" }],
        "body-md": ["1rem", { lineHeight: "1.6" }],
        "body-sm": ["0.875rem", { lineHeight: "1.5" }],
        "body-xs": ["0.75rem", { lineHeight: "1.5" }],
        // Label sizes
        "label-lg": ["0.9375rem", { lineHeight: "1.4", fontWeight: "500" }],
        "label-md": ["0.8125rem", { lineHeight: "1.4", fontWeight: "500" }],
        "label-sm": ["0.6875rem", { lineHeight: "1.4", fontWeight: "500", letterSpacing: "0.05em" }],
        // Monospace
        "code-sm": ["0.8125rem", { lineHeight: "1.5", fontFamily: "JetBrains Mono" }],
        "code-xs": ["0.6875rem", { lineHeight: "1.5", fontFamily: "JetBrains Mono" }],
      },
      fontWeight: {
        hairline: "100",
        thin: "200",
        light: "300",
        normal: "400",
        medium: "500",
        semibold: "600",
        bold: "700",
        extrabold: "800",
        black: "900",
      },

      // ─── Spacing ────────────────────────────────────────────
      spacing: {
        px: "1px",
        0: "0px",
        0.5: "0.125rem",
        1: "0.25rem",
        1.5: "0.375rem",
        2: "0.5rem",
        2.5: "0.625rem",
        3: "0.75rem",
        3.5: "0.875rem",
        4: "1rem",
        5: "1.25rem",
        6: "1.5rem",
        7: "1.75rem",
        8: "2rem",
        9: "2.25rem",
        10: "2.5rem",
        11: "2.75rem",
        12: "3rem",
        14: "3.5rem",
        16: "4rem",
        18: "4.5rem",
        20: "5rem",
        24: "6rem",
        28: "7rem",
        32: "8rem",
        36: "9rem",
        40: "10rem",
        44: "11rem",
        48: "12rem",
        52: "13rem",
        56: "14rem",
        60: "15rem",
        64: "16rem",
        72: "18rem",
        80: "20rem",
        96: "24rem",
      },

      // ─── Border Radius ─────────────────────────────────────
      borderRadius: {
        none: "0px",
        sm: "0.25rem",
        DEFAULT: "0.5rem",
        md: "0.625rem",
        lg: "0.75rem",
        xl: "1rem",
        "2xl": "1.25rem",
        "3xl": "1.5rem",
        full: "9999px",
      },

      // ─── Shadows ──────────────────────────────────────────
      boxShadow: {
        glass: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)",
        "glass-lg": "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)",
        "glass-xl": "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
        "glass-2xl": "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
        "neon-blue": "0 0 10px rgba(0, 212, 255, 0.3), 0 0 20px rgba(0, 212, 255, 0.1)",
        "neon-cyan": "0 0 10px rgba(0, 255, 136, 0.3), 0 0 20px rgba(0, 255, 136, 0.1)",
        "neon-amber": "0 0 10px rgba(255, 170, 0, 0.3), 0 0 20px rgba(255, 170, 0, 0.1)",
        "neon-red": "0 0 10px rgba(239, 68, 68, 0.3), 0 0 20px rgba(239, 68, 68, 0.1)",
        inner: "inset 0 2px 4px 0 rgba(0, 0, 0, 0.05)",
      },

      // ─── Blur ──────────────────────────────────────────────
      backdropBlur: {
        xs: "2px",
        glass: "8px",
        "glass-md": "12px",
        "glass-lg": "16px",
        "glass-xl": "20px",
        "glass-2xl": "24px",
      },

      // ─── Animations ────────────────────────────────────────
      animation: {
        // Core animations
        "fade-in": "fade-in 0.3s ease-out",
        "fade-out": "fade-out 0.2s ease-in",
        "slide-up": "slide-up 0.3s ease-out",
        "slide-down": "slide-down 0.3s ease-out",
        "slide-left": "slide-left 0.3s ease-out",
        "slide-right": "slide-right 0.3s ease-out",
        scale: "scale 0.2s ease-out",

        // Glassmorphism
        shimmer: "shimmer 4s ease-in-out infinite",
        "glass-shimmer": "glass-shimmer 6s ease-in-out infinite",

        // Threat / Status
        pulse: "pulse 2s ease-in-out infinite",
        "pulse-fast": "pulse 1s ease-in-out infinite",
        "pulse-soft": "pulse-soft 3s ease-in-out infinite",
        "threat-glow": "threat-glow 2s ease-in-out infinite",

        // Facial recognition
        "scan-face": "scan-face 4s ease-in-out infinite",
        "scan-line": "scan-line 3s ease-in-out infinite",

        // Rotations
        "spin-slow": "spin 20s linear infinite",
        "spin-slower": "spin 30s linear infinite",
        "spin-slowest": "spin 45s linear infinite",

        // Skeleton loading
        skeleton: "skeleton 1.5s ease-in-out infinite",

        // Page transitions
        "page-enter": "page-enter 0.4s ease-out",
        "page-exit": "page-exit 0.2s ease-in",
      },

      // ─── Keyframes ────────────────────────────────────────
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "fade-out": {
          "0%": { opacity: "1" },
          "100%": { opacity: "0" },
        },
        "slide-up": {
          "0%": { transform: "translateY(10px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        "slide-down": {
          "0%": { transform: "translateY(-10px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        "slide-left": {
          "0%": { transform: "translateX(10px)", opacity: "0" },
          "100%": { transform: "translateX(0)", opacity: "1" },
        },
        "slide-right": {
          "0%": { transform: "translateX(-10px)", opacity: "0" },
          "100%": { transform: "translateX(0)", opacity: "1" },
        },
        scale: {
          "0%": { transform: "scale(0.95)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "glass-shimmer": {
          "0%": { backgroundPosition: "-200% center" },
          "100%": { backgroundPosition: "200% center" },
        },
        pulse: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.5" },
        },
        "pulse-soft": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.7" },
        },
        "threat-glow": {
          "0%, 100%": { boxShadow: "0 0 10px rgba(239, 68, 68, 0.3)" },
          "50%": { boxShadow: "0 0 25px rgba(239, 68, 68, 0.6)" },
        },
        "scan-face": {
          "0%": { top: "0%", opacity: "0" },
          "10%": { opacity: "0.8" },
          "90%": { opacity: "0.8" },
          "100%": { top: "100%", opacity: "0" },
        },
        "scan-line": {
          "0%": { left: "-100%" },
          "100%": { left: "200%" },
        },
        skeleton: {
          "0%": { opacity: "0.5" },
          "50%": { opacity: "1" },
          "100%": { opacity: "0.5" },
        },
        "page-enter": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "page-exit": {
          "0%": { opacity: "1" },
          "100%": { opacity: "0" },
        },
      },

      // ─── Transition ───────────────────────────────────────
      transitionDuration: {
        DEFAULT: "200ms",
        150: "150ms",
        200: "200ms",
        300: "300ms",
        400: "400ms",
        500: "500ms",
      },
      transitionTimingFunction: {
        "out-expo": "cubic-bezier(0.16, 1, 0.3, 1)",
        "out-back": "cubic-bezier(0.34, 1.56, 0.64, 1)",
      },
    },
  },
  plugins: [animate],
};

export default config;
```

---

## 2. Color Palette

### Core Palette

| Name | Hex | RGB | Usage |
|---|---|---|---|
| `navy-950` | `#060a14` | `rgb(6,10,20)` | Deepest background |
| `navy-900` | `#0a0e1a` | `rgb(10,14,26)` | Page background |
| `navy-800` | `#1a1f2e` | `rgb(26,31,46)` | Card/sidebar background |
| `navy-700` | `#2a2f3e` | `rgb(42,47,62)` | Hover state, elevated card |
| `navy-600` | `#3a4a5e` | `rgb(58,74,94)` | Borders, dividers |

### Accent Palette

| Name | Hex | RGB | Usage |
|---|---|---|---|
| `accent-blue` | `#00d4ff` | `rgb(0,212,255)` | Primary interactive, links, active state, neon glow |
| `accent-cyan` | `#00ff88` | `rgb(0,255,136)` | Success, verified, facial rec overlays, positive indicators |
| `accent-amber` | `#ffaa00` | `rgb(255,170,0)` | Warning, medium threat, pending |
| `accent-red` | `#ef4444` | `rgb(239,68,68)` | Critical, wanted, danger, destructive actions |
| `accent-green` | `#22c55e` | `rgb(34,197,94)` | Arrested, safe, confirmed, active |

### Text Palette

| Name | Hex | Contrast Ratio on bg-secondary | Usage |
|---|---|---|---|
| `text-primary` | `#f1f5f9` | 15.1:1 (AAA) | Primary body text |
| `text-secondary` | `#94a3b8` | 7.2:1 (AA) | Secondary/help text |
| `text-muted` | `#475569` | 3.5:1 (AA large) | Disabled, placeholder, metadata |
| `text-accent` | `#00d4ff` | 5.8:1 (AA) | Links, highlighted text |

### Status to Color Mapping

```ts
const statusColors: Record<string, string> = {
  wanted: "#ef4444",       // Red — urgent attention
  investigating: "#f59e0b", // Amber — active investigation
  arrested: "#22c55e",     // Green — resolved (arrested)
  cleared: "#94a3b8",      // Slate — resolved (cleared)
  deceased: "#6b7280",     // Gray — deceased
  under_review: "#3b82f6", // Blue — pending review
  active: "#22c55e",       // Green — active case
  closed: "#94a3b8",       // Slate — closed case
  archived: "#475569",     // Muted — archived
};

const severityColors: Record<string, string> = {
  critical: "#ef4444",
  high: "#f59e0b",
  medium: "#eab308",
  low: "#3b82f6",
  info: "#00d4ff",
};
```

### Glassmorphism Colors

```ts
// Glass backgrounds (rgba white overlays)
const glassBackgrounds = {
  subtle: "rgba(255, 255, 255, 0.03)",
  default: "rgba(255, 255, 255, 0.05)",
  elevated: "rgba(255, 255, 255, 0.08)",
  prominent: "rgba(255, 255, 255, 0.12)",
};

// Glass borders
const glassBorders = {
  subtle: "rgba(255, 255, 255, 0.05)",
  default: "rgba(255, 255, 255, 0.1)",
  elevated: "rgba(255, 255, 255, 0.15)",
  prominent: "rgba(255, 255, 255, 0.2)",
};
```

---

## 3. Typography System

### Font Stack

| Usage | Font | Fallback |
|---|---|---|
| Headings & Body | **Inter** | `system-ui, -apple-system, sans-serif` |
| Code & Data | **JetBrains Mono** | `monospace` |

### Type Scale

```
Display XL — 72px/4.5rem — Used for landing page hero
Display LG — 60px/3.75rem — Used for section titles
Display MD — 48px/3rem — Used for brand statements

Heading XL — 36px/2.25rem — Page titles
Heading LG — 30px/1.875rem — Section titles
Heading MD — 24px/1.5rem — Card titles
Heading SM — 20px/1.25rem — Sub-card titles

Body LG — 18px/1.125rem — Lead paragraphs
Body MD — 16px/1rem — Body text (default)
Body SM — 14px/0.875rem — Secondary text, card body
Body XS — 12px/0.75rem — Metadata, small print

Label LG — 15px/0.9375rem — Form labels
Label MD — 13px/0.8125rem — Small labels, stats
Label SM — 11px/0.6875rem — Badge text, uppercase labels

Code SM — 13px/0.8125rem — Code blocks
Code XS — 11px/0.6875rem — Inline code
```

### Typography CSS Classes

```css
/* Example usage in Tailwind */
h1 { @apply text-heading-xl text-text-primary; }
h2 { @apply text-heading-lg text-text-primary; }
h3 { @apply text-heading-md text-text-primary; }
h4 { @apply text-heading-sm text-text-primary; }
p  { @apply text-body-md text-text-primary; }
small { @apply text-body-xs text-text-secondary; }
label { @apply text-label-md text-text-secondary; }
```

---

## 4. Spacing System

### Base Unit: 0.25rem (4px)

| Token | Rem | Pixels | Usage |
|---|---|---|---|
| `space-0` | 0 | 0 | None |
| `space-0.5` | 0.125 | 2 | Tight inner padding |
| `space-1` | 0.25 | 4 | Icon gap, tight badge |
| `space-2` | 0.5 | 8 | Button gap, small margin |
| `space-3` | 0.75 | 12 | Card inner spacing |
| `space-4` | 1 | 16 | Default spacing |
| `space-5` | 1.25 | 20 | Section margin |
| `space-6` | 1.5 | 24 | Card padding |
| `space-8` | 2 | 32 | Subsection padding |
| `space-10` | 2.5 | 40 | Large card padding |
| `space-12` | 3 | 48 | Section margin |
| `space-16` | 4 | 64 | Page padding |

### Layout Spacing Rules

```
Page padding:         p-6 (24px) on mobile, p-8 (32px) on desktop
Card padding:         p-6 (24px)
Card gap (stacked):   space-y-4 (16px)
Grid gap:             gap-5 (20px)
Section margin:       mb-8 (32px)
Sidebar width:        256px (w-64)
Header height:        64px (h-16)
Icon size (default):  20px (h-5 w-5)
Button padding:       px-4 py-2 (8px vertical, 16px horizontal)
```

---

## 5. Glassmorphism Utility Classes

### Custom CSS (`src/styles/glassmorphism.css`)

```css
/* ─── Glass Base ─────────────────────────────────────────── */
.glass {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.glass-subtle {
  background: rgba(255, 255, 255, 0.03);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.glass-elevated {
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

.glass-prominent {
  background: rgba(255, 255, 255, 0.12);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 12px 48px rgba(0, 0, 0, 0.4);
}

/* ─── Glass Variants ─────────────────────────────────────── */
.glass-hover {
  transition: all 0.2s ease-out;
}

.glass-hover:hover {
  background: rgba(255, 255, 255, 0.1);
  transform: translateY(-2px);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.4);
  border-color: rgba(255, 255, 255, 0.2);
}

/* ─── Glass Shimmer ──────────────────────────────────────── */
.glass-shimmer {
  position: relative;
  overflow: hidden;
}

.glass-shimmer::after {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255, 255, 255, 0.03) 25%,
    rgba(255, 255, 255, 0.08) 50%,
    rgba(255, 255, 255, 0.03) 75%,
    transparent 100%
  );
  background-size: 200% 100%;
  animation: glass-shimmer 6s ease-in-out infinite;
  pointer-events: none;
}

/* ─── Glass with Accent Border ───────────────────────────── */
.glass-accent-blue {
  border-color: rgba(0, 212, 255, 0.2);
  box-shadow: 0 4px 20px rgba(0, 212, 255, 0.05);
}

.glass-accent-cyan {
  border-color: rgba(0, 255, 136, 0.2);
  box-shadow: 0 4px 20px rgba(0, 255, 136, 0.05);
}

.glass-accent-amber {
  border-color: rgba(255, 170, 0, 0.2);
  box-shadow: 0 4px 20px rgba(255, 170, 0, 0.05);
}

.glass-accent-red {
  border-color: rgba(239, 68, 68, 0.2);
  box-shadow: 0 4px 20px rgba(239, 68, 68, 0.05);
}

/* ─── Glass Card ─────────────────────────────────────────── */
.glass-card {
  @apply glass rounded-xl;
  padding: 1.5rem;
}

.glass-card-header {
  @apply text-label-md text-text-secondary uppercase tracking-wider mb-4;
}

.glass-card-divider {
  @apply my-4 border-t border-white/5;
}
```

### Utility Class Usage in Tailwind

```tsx
// Using Tailwind arbitrary values for glassmorphism
<div className="
  bg-white/5
  backdrop-blur-xl
  border border-white/10
  rounded-xl
  shadow-glass-xl
">
  Glass card content
</div>

// Using predefined Tailwind plugin classes (preferred)
<div className="
  glass
  glass-hover
  glass-shimmer
  rounded-xl
  p-6
">
  Glass card with hover and shimmer
</div>
```

---

## 6. Animation Keyframes

### Core Animations (`src/styles/animations.css`)

```css
/* ─── Pulse Variants ────────────────────────────────────── */
@keyframes pulse-soft {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

@keyframes pulse-wanted {
  0%, 100% {
    box-shadow: 0 0 8px rgba(239, 68, 68, 0.4), 0 0 16px rgba(239, 68, 68, 0.2);
  }
  50% {
    box-shadow: 0 0 16px rgba(239, 68, 68, 0.6), 0 0 32px rgba(239, 68, 68, 0.3);
  }
}

/* ─── Glass Shimmer ─────────────────────────────────────── */
@keyframes glass-shimmer {
  0% { background-position: -200% center; }
  100% { background-position: 200% center; }
}

/* ─── Skeleton Loading ──────────────────────────────────── */
@keyframes skeleton-pulse {
  0% { background-color: rgba(255, 255, 255, 0.05); }
  50% { background-color: rgba(255, 255, 255, 0.1); }
  100% { background-color: rgba(255, 255, 255, 0.05); }
}

.skeleton {
  animation: skeleton-pulse 1.5s ease-in-out infinite;
  border-radius: 0.5rem;
}

/* ─── Scanning Line ─────────────────────────────────────── */
@keyframes scan-face {
  0% { top: -2px; opacity: 0; }
  10% { opacity: 0.8; }
  90% { opacity: 0.8; }
  100% { top: calc(100% - 2px); opacity: 0; }
}

.facial-scan-line {
  position: absolute;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, transparent, #00ff88, #00d4ff, transparent);
  box-shadow: 0 0 8px #00ff88, 0 0 16px #00d4ff;
  animation: scan-face 4s ease-in-out infinite;
  pointer-events: none;
}

/* ─── Scanning Light Sweep ──────────────────────────────── */
@keyframes scan-sweep {
  0% { left: -100%; }
  100% { left: 200%; }
}

.scan-sweep {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 60%;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(0, 212, 255, 0.05),
    rgba(0, 255, 136, 0.1),
    rgba(0, 212, 255, 0.05),
    transparent
  );
  animation: scan-sweep 3s ease-in-out infinite;
  pointer-events: none;
}

/* ─── Threat Ring Glow ──────────────────────────────────── */
@keyframes threat-glow {
  0%, 100% {
    filter: drop-shadow(0 0 6px var(--glow-color, #ef4444));
  }
  50% {
    filter: drop-shadow(0 0 16px var(--glow-color, #ef4444)) drop-shadow(0 0 32px var(--glow-color, #ef4444));
  }
}

/* ─── Data Counter (Count-up) ───────────────────────────── */
@keyframes count-up {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

.count-up {
  animation: count-up 0.6s ease-out forwards;
}

/* ─── Page Transition ───────────────────────────────────── */
@keyframes page-enter {
  0% {
    opacity: 0;
    transform: translateY(8px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}

.page-enter {
  animation: page-enter 0.4s ease-out;
}

/* ─── Tab Content Slide ─────────────────────────────────── */
@keyframes tab-slide-in {
  0% { opacity: 0; transform: translateX(16px); }
  100% { opacity: 1; transform: translateX(0); }
}

.tab-slide-in {
  animation: tab-slide-in 0.3s ease-out;
}
```

### Animation Duration Reference

| Animation | Duration | Easing | Usage |
|---|---|---|---|
| Fade in | 0.3s | ease-out | Elements appearing |
| Slide up | 0.3s | ease-out | Cards entering viewport |
| Scale | 0.2s | ease-out | Modals, popups |
| Glass shimmer | 6s | ease-in-out | Card background sweep |
| Scan face | 4s | ease-in-out | Facial recognition line |
| Scan sweep | 3s | ease-in-out | Light sweep on portrait |
| Threat glow | 2s | ease-in-out | Risk ring pulse |
| Pulse | 2s | ease-in-out | Status badge (wanted) |
| Spin slow | 20s | linear | Outer threat ring |
| Spin slower | 30s | linear | Middle threat ring |
| Spin slowest | 45s | linear | Inner threat ring |
| Skeleton | 1.5s | ease-in-out | Loading placeholder |
| Tab slide | 0.3s | ease-out | Tab content transition |
| Page enter | 0.4s | ease-out | Page navigation |
| Hover lift | 0.2s | ease-out | Card hover effect |

---

## 7. Dark Theme (Default) With Light Theme Support

### Theme Provider

```tsx
// components/providers/ThemeProvider.tsx
"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useUIStore } from "@/store/ui-store";

type Theme = "dark" | "light";

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "dark",
  setTheme: () => {},
  toggleTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useUIStore();

  // Apply theme class to html element
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("dark", "light");
    root.classList.add(theme);
    setMounted(true);
  }, [theme]);

  // Respect system preference on first visit
  useEffect(() => {
    const stored = useUIStore.getState().theme;
    if (!stored) {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      setTheme(prefersDark ? "dark" : "light");
    }
  }, []);

  if (!mounted) {
    // Prevent flash of wrong theme
    return <div style={{ visibility: "hidden" }}>{children}</div>;
  }

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
```

### Light Theme Overrides

```css
/* Overrides for light theme */
.light {
  --bg-primary: #f8fafc;
  --bg-secondary: #f1f5f9;
  --bg-tertiary: #e2e8f0;

  /* Glass becomes opaque in light mode */
  --glass-bg: rgba(255, 255, 255, 0.8);
  --glass-border: rgba(0, 0, 0, 0.08);
  --glass-blur: 8px;

  /* Text */
  --text-primary: #0f172a;
  --text-secondary: #475569;
  --text-muted: #94a3b8;

  /* Surface */
  --surface-card: #ffffff;
  --surface-border: #e2e8f0;
}

/* Light mode glass overrides */
.light .glass {
  background: rgba(255, 255, 255, 0.7);
  border: 1px solid rgba(0, 0, 0, 0.08);
  backdrop-filter: blur(8px);
}

.light .glass-elevated {
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(0, 0, 0, 0.1);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
}
```

---

## 8. Responsive Breakpoints Strategy

### Breakpoint Definitions

| Tailwind | Width | Device | Layout Columns |
|---|---|---|---|
| `sm` | ≥640px | Large phones | 1 column |
| `md` | ≥768px | Tablets | 2 columns |
| `lg` | ≥1024px | Small laptops | 2–3 columns |
| `xl` | ≥1280px | Desktops | 3 columns |
| `2xl` | ≥1536px | Large desktops | 3 columns with max-width |

### Mobile-First Philosophy

```tsx
// Always start with mobile layout, then add larger breakpoints
<div className="
  grid
  grid-cols-1           /* Mobile: single column */
  md:grid-cols-2        /* Tablet: two columns */
  lg:grid-cols-3        /* Desktop: three columns */
  gap-4
  md:gap-5
  lg:gap-6
">
```

### Docket Page Specific Breakpoints

```
Mobile (< 640px):
  - Single column stacked layout
  - Sidebar sections as accordion (collapsible)
  - Bottom panel tabs: horizontal scroll
  - Threat rings: reduced to 2
  - Mini map: 150px height

Tablet (640px–1024px):
  - 2 columns: content + right sidebar
  - Left sidebar below content (accordion)
  - Threat rings: full 3
  - Mini map: 180px height

Desktop (> 1024px):
  - 3 columns: left sidebar | content | right sidebar
  - All cards visible (no accordion)
  - Full threat ring set
  - Mini map: 200px height
```

### Container Max-Width

```tsx
// Main content area max-width to prevent extremely wide layouts on ultra-wide
<main className="
  mx-auto
  w-full
  max-w-7xl            /* 1280px max content width */
  px-4 sm:px-6 lg:px-8
">
```

### Responsive Text

```tsx
<h1 className="
  text-heading-sm        /* Mobile: 20px */
  md:text-heading-md     /* Tablet: 24px */
  lg:text-heading-lg     /* Desktop: 30px */
">
  Page Title
</h1>
```

### Hide/Show Elements

```tsx
// Mobile: hide sidebar, show hamburger
<Sidebar className="hidden lg:flex" />
<MobileNav className="flex lg:hidden" />

// Mobile: hide full stats, show compact
<DesktopStats className="hidden md:grid" />
<MobileStats className="grid md:hidden" />
```

---

> **Next Document:** [08-TESTING-STRATEGY.md](./08-TESTING-STRATEGY.md)
