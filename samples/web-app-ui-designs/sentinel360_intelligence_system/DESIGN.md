---
name: Sentinel360 Intelligence System
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#3c494e'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#6c797f'
  outline-variant: '#bbc9cf'
  surface-tint: '#00677e'
  primary: '#00677e'
  on-primary: '#ffffff'
  primary-container: '#00d4ff'
  on-primary-container: '#00586b'
  inverse-primary: '#3cd7ff'
  secondary: '#006d37'
  on-secondary: '#ffffff'
  secondary-container: '#00fa85'
  on-secondary-container: '#006e37'
  tertiary: '#825500'
  on-tertiary: '#ffffff'
  tertiary-container: '#ffb440'
  on-tertiary-container: '#6f4800'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#b4ebff'
  primary-fixed-dim: '#3cd7ff'
  on-primary-fixed: '#001f27'
  on-primary-fixed-variant: '#004e5f'
  secondary-fixed: '#60ff99'
  secondary-fixed-dim: '#00e479'
  on-secondary-fixed: '#00210c'
  on-secondary-fixed-variant: '#005228'
  tertiary-fixed: '#ffddb4'
  tertiary-fixed-dim: '#ffb952'
  on-tertiary-fixed: '#291800'
  on-tertiary-fixed-variant: '#633f00'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  headline-xl:
    fontFamily: Inter
    fontSize: 36px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 30px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.5'
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
  label-caps:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: 0.05em
  headline-xl-mobile:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '700'
    lineHeight: '1.2'
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  container-max: 1440px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 32px
  stack-xs: 4px
  stack-sm: 8px
  stack-md: 16px
  stack-lg: 24px
---

## Brand & Style

The design system is engineered for high-stakes surveillance intelligence, prioritizing clarity, speed of cognition, and professional authority. The brand personality is **vigilant, precise, and sophisticated**, moving away from "security tropes" toward a premium, data-centric aesthetic.

The visual style is **Corporate Modern with a Tech-Infusion**. It utilizes a light-themed interface to ensure maximum legibility in control room environments while maintaining a "high-tech" feel through the use of vibrant accent colors against clinical, off-white surfaces. The interface should feel like a high-performance instrument: quiet by default, but capable of highlighting critical information with surgical precision.

Target Audience:
- Intelligence Analysts
- Security Directors
- Law Enforcement Personnel
- Infrastructure Operations Managers

## Colors

The palette is designed around a "Signal vs. Noise" philosophy. A neutral base of White and Slate-toned Off-whites provides a calm canvas, allowing functional status colors to command immediate attention.

- **Primary (Electric Blue):** Used for primary actions, active states, and brand presence. It signifies the "Active Intelligence" layer.
- **Success/Verified (Cyan):** Specifically for AI-verified matches and confirmed identifications.
- **Safety (Green):** Indicates resolved threats or secured zones.
- **Warning (Amber):** High-priority alerts requiring investigation.
- **Danger (Red):** Critical threats or active breaches.
- **Surface Strategy:** Use `#ffffff` for cards and foreground elements, and `#f8fafc` for the application background to create subtle structural contrast without heavy lines.

## Typography

This design system utilizes **Inter** exclusively to ensure a systematic, utilitarian aesthetic that remains highly readable at small sizes. 

- **Scale:** A tight, focused scale ensures data density remains high without sacrificing hierarchy.
- **Labels:** The `label-caps` style is critical for metadata, table headers, and timestamping, providing a distinct visual "texture" compared to body text.
- **Weights:** Use SemiBold (600) for UI headings and Bold (700) for critical alerts. Regular (400) is used for all narrative data.

## Layout & Spacing

The layout employs a **Fluid Grid** approach with strict containment for data-heavy views.

- **Grid:** A 12-column system is used for dashboard layouts.
- **Margins:** 32px on desktop to provide "breathing room" for the dense data panels. 
- **Sidebars:** Utilize fixed-width left navigation (240px) and collapsible right-hand "Intelligence Panels" (320px) for situational awareness.
- **Density:** In monitoring views, use compact spacing (`stack-sm`) to maximize the number of visible data points. In settings or report views, use `stack-lg` for better focus.

## Elevation & Depth

Hierarchy is established through **Ambient Shadows** and tonal layering. Since the background is Off-white (#f8fafc), White (#ffffff) elements naturally "pop" when combined with soft shadows.

- **Surface Layers:**
  - **Level 0 (Background):** #f8fafc.
  - **Level 1 (Cards/Panels):** #ffffff with a multi-layered shadow (0 1px 3px rgba(0,0,0,0.08) and 0 4px 12px rgba(0,0,0,0.04)).
  - **Level 2 (Modals/Popovers):** #ffffff with a more aggressive 16px blur shadow to indicate priority.
- **Interaction:** On hover, cards should transition to a slightly deeper shadow and a subtle border-tint of the Primary color to indicate interactivity.

## Shapes

The design system uses a **Rounded** shape language to balance the "technical" nature of the product with a modern, approachable feel.

- **Standard Radius:** 12px (0.75rem) for all primary containers, cards, and input fields.
- **Small Radius:** 4px for checkboxes and small utility tags.
- **Pill:** Fully rounded (999px) for status indicators and chips to distinguish them from interactive buttons.

## Components

### Buttons & Inputs
- **Primary Button:** Solid Blue (#00d4ff) with White text. 12px corner radius.
- **Input Fields:** Off-white fill (#f1f5f9) or White with a subtle 1px border (#e2e8f0). 12px corner radius. Focus state uses a 2px Primary Blue glow.

### Status Pills
- Used for "Verified," "Alert," "Critical," etc.
- **Style:** Lightly tinted background (10-15% opacity of the status color) with high-contrast text of the same hue.

### Navigation & Tabs
- **Underline-style Tabs:** Active states are indicated by a 2px thick Primary Blue bottom border and Medium weight text. Inactive states use Gray (#94a3b8).

### Data Tables
- **Header:** Sticky headers with a 1px bottom border (#f1f5f9). Use `label-caps` for header text.
- **Rows:** Subtle hover state change to #f8fafc. No vertical borders; use horizontal lines only for a clean, scanable look.

### Intelligence Cards
- Cards used for camera feeds or person-of-interest profiles. 
- Must include a `label-caps` header area and a footer for "Quick Actions."