---
name: Velocity Blue
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
  on-surface-variant: '#434654'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#737686'
  outline-variant: '#c3c5d7'
  surface-tint: '#1353d8'
  primary: '#003fb1'
  on-primary: '#ffffff'
  primary-container: '#1a56db'
  on-primary-container: '#d4dcff'
  inverse-primary: '#b5c4ff'
  secondary: '#00668a'
  on-secondary: '#ffffff'
  secondary-container: '#40c2fd'
  on-secondary-container: '#004d6a'
  tertiary: '#424b50'
  on-tertiary: '#ffffff'
  tertiary-container: '#5a6368'
  on-tertiary-container: '#d6dfe5'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dbe1ff'
  primary-fixed-dim: '#b5c4ff'
  on-primary-fixed: '#00174d'
  on-primary-fixed-variant: '#003dab'
  secondary-fixed: '#c4e7ff'
  secondary-fixed-dim: '#7bd0ff'
  on-secondary-fixed: '#001e2c'
  on-secondary-fixed-variant: '#004c69'
  tertiary-fixed: '#dbe4ea'
  tertiary-fixed-dim: '#bfc8ce'
  on-tertiary-fixed: '#141d21'
  on-tertiary-fixed-variant: '#3f484d'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  headline-xl:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '800'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '700'
    lineHeight: '1.2'
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
  label-bold:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: '1'
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  container-max: 1200px
  gutter: 24px
  margin-mobile: 16px
  section-padding-desktop: 96px
  section-padding-mobile: 48px
---

## Brand & Style

This design system is built for high-conversion educational funnels, specifically focusing on the "7-Day No-Code E-Commerce Bootcamp." The brand personality is professional, authoritative, and momentum-driven. It aims to evoke a sense of clarity and immediate action, removing technical friction through a clean, minimalist aesthetic.

The design style follows **Modern Minimalism** with a focus on functional clarity. It utilizes generous whitespace to reduce cognitive load, ensuring that the primary value proposition and call-to-action (CTA) remain the focal points. The interface is grounded in systematic reliability, using a crisp blue palette to signal trust and competence.

## Colors

The color palette is strategically weighted to drive the user's eye toward conversion points.

- **Primary Blue (#1A56DB):** Used for the most critical actions, key headings, and active interactive states. It represents the "Action" color.
- **Secondary Sky-Blue (#38BDF8):** Used for highlights, supportive badges, and hover states to provide a sense of lightness and approachability.
- **Background Tiers:** The primary canvas is Pure White (#FFFFFF). Light Sky-Blue Tints (#F0F9FF) are used for section alternates to break up long-form landing pages without adding visual clutter.
- **Neutral/Borders:** We use a cool slate scale (#E2E8F0 for borders, #64748B for secondary text) to maintain a professional, tech-forward feel.

## Typography

The design system utilizes **Inter** for its entire typographic scale to maintain a systematic, utilitarian, and modern feel.

- **Headlines:** Use tight line-heights and negative letter-spacing for large display text to create a high-impact, editorial "No-Code" look.
- **Body:** Standard body text is set to 16px with a generous 1.6 line-height to ensure maximum readability during long-form sales copy.
- **Hierarchy:** Use font-weight as the primary differentiator. Primary headings should be Extra Bold (800) or Bold (700), while body text remains Regular (400). Labels and small caps should be SemiBold (600) for UI clarity.

## Layout & Spacing

This design system uses a **Fixed Grid** approach for desktop to control line lengths for better readability, transitioning to a **Fluid Grid** for mobile devices.

- **Desktop:** 12-column grid with a 1200px max-width.
- **Section Spacing:** High-conversion funnels require "breathability." Use 96px vertical padding between major landing page sections.
- **Content Blocks:** Use a 4px-based spacing scale (4, 8, 16, 24, 32, 48, 64) to maintain a consistent rhythmic flow between elements like icons, headlines, and buttons.

## Elevation & Depth

To maintain a "Professional/Clean" look, this design system avoids heavy shadows. Instead, it relies on **Low-Contrast Outlines** and **Ambient Depth**.

- **Cards:** Use a 1px solid border (#E2E8F0). Depth is added using a very soft, diffused shadow: `0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05)`.
- **Active Elements:** Buttons and input fields use a slight glow effect (using the Secondary Blue) when focused, rather than a heavy drop shadow.
- **Layering:** Use the light sky-blue background (#F0F9FF) to sit "behind" white cards to create natural depth without requiring shadows.

## Shapes

The design system uses a **Rounded** shape language to appear friendly yet professional.

- **Standard Elements:** 0.5rem (8px) is the default radius for buttons, input fields, and small cards.
- **Large Components:** 1rem (16px) is used for main container cards or pricing tables to give them a more modern, "app-like" feel.
- **Badges:** Use "Pill" styling (999px radius) for status indicators like "7-Day Challenge" or "Limited Time" tags to distinguish them from interactive buttons.

## Components

### Buttons
- **Primary:** Background #1A56DB, text #FFFFFF, 8px rounded. On hover, transition to a slightly darker shade.
- **Secondary/Outline:** Border #1A56DB, text #1A56DB, background transparent. On hover, background becomes #F0F9FF.
- **CTA Sizing:** Hero buttons should use a 18px font-size with 16px/32px padding for high-impact visibility.

### Cards
- **Product/Feature Cards:** Background #FFFFFF, border 1px #E2E8F0, rounded 16px. Internal padding should be a minimum of 32px.

### Input Fields
- **Form Elements:** Background #F8FAFC (slightly off-white), border 1px #E2E8F0, rounded 8px. Text should be 16px for iOS accessibility to prevent auto-zoom. Focused state uses a 1px #1A56DB border.

### Badges & Chips
- **Status Labels:** Light blue background (#F0F9FF) with bold sky-blue text (#38BDF8), uppercase, 12px font-size.

### Lists
- **Checklists:** Use the Primary Blue (#1A56DB) for checkmark icons to reinforce value delivery in feature lists. Text should have 16px spacing between list items.