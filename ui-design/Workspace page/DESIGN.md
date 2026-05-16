---
name: Atmospheric Azure
colors:
  surface: '#fbf8fa'
  surface-dim: '#dcd9db'
  surface-bright: '#fbf8fa'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f5f3f4'
  surface-container: '#f0edef'
  surface-container-high: '#eae7e9'
  surface-container-highest: '#e4e2e3'
  on-surface: '#1b1b1d'
  on-surface-variant: '#45474c'
  inverse-surface: '#303032'
  inverse-on-surface: '#f3f0f2'
  outline: '#75777d'
  outline-variant: '#c5c6cd'
  surface-tint: '#545f73'
  primary: '#091426'
  on-primary: '#ffffff'
  primary-container: '#1e293b'
  on-primary-container: '#8590a6'
  inverse-primary: '#bcc7de'
  secondary: '#0058be'
  on-secondary: '#ffffff'
  secondary-container: '#2170e4'
  on-secondary-container: '#fefcff'
  tertiary: '#061525'
  on-tertiary: '#ffffff'
  tertiary-container: '#1b2a3b'
  on-tertiary-container: '#8291a6'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d8e3fb'
  primary-fixed-dim: '#bcc7de'
  on-primary-fixed: '#111c2d'
  on-primary-fixed-variant: '#3c475a'
  secondary-fixed: '#d8e2ff'
  secondary-fixed-dim: '#adc6ff'
  on-secondary-fixed: '#001a42'
  on-secondary-fixed-variant: '#004395'
  tertiary-fixed: '#d4e4fa'
  tertiary-fixed-dim: '#b9c8de'
  on-tertiary-fixed: '#0d1c2d'
  on-tertiary-fixed-variant: '#39485a'
  background: '#fbf8fa'
  on-background: '#1b1b1d'
  surface-variant: '#e4e2e3'
typography:
  display-lg:
    fontFamily: Hanken Grotesk
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Hanken Grotesk
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Hanken Grotesk
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-caps:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  container-max: 1440px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 40px
---

## Brand & Style
This design system evolves the "Atmospheric Enterprise" aesthetic into a high-precision, professional environment. It targets high-stakes corporate users who require clarity without the sterility of traditional enterprise software. The style is a hybrid of **Corporate Modern** and **Glassmorphism**, utilizing depth and soft transparency to organize complex data hierarchies.

The emotional response is one of "commanding calm"—a UI that feels expensive, stable, and deeply intentional. By moving away from warm accents toward a cool-toned spectrum, the interface shifts focus from "vibrancy" to "intellectual focus."

## Colors
The palette is rooted in **Midnight Slate** (#1E293B) for primary authority and **Azure Frost** (#3B82F6 / #E0F2FE) for interaction and state. 

- **Surfaces:** To maintain eye comfort, surfaces use "Softened White" (warm-leaning neutrals like #F8FAFC) rather than pure clinical white.
- **Primary Actions:** Midnight Slate is used for high-contrast text and primary buttons to anchor the layout.
- **Active States:** Azure Frost provides a high-visibility signal for selected items and progress indicators.
- **System Feedback:** Success, Warning, and Error states should be desaturated to fit the slate profile, using cool-tinted variations of green and red.

## Typography
The typographic scale balances the geometric precision of **Hanken Grotesk** for headings with the systematic legibility of **Inter** for dense data. 

**JetBrains Mono** is utilized sparingly for labels, metadata, and "system-level" information (like IDs or timestamps) to reinforce the technical enterprise nature of the product. Heavy use of optical sizing and tight letter-spacing on larger headings ensures the UI feels tight and professionally "engineered."

## Layout & Spacing
The design system employs a **Fluid-Fixed Hybrid Grid**. Main content areas are constrained to a 1440px max-width, centered on the viewport. 

- **The 8px Rule:** All spacing, padding, and margins must be multiples of 8px to maintain a rhythmic vertical beat.
- **Desktop:** 12-column grid with 24px gutters. Sidebars are "floating" glass panels with 16px of internal padding.
- **Mobile:** Single column with 16px side margins. Complex data tables should collapse into "summary cards" rather than horizontal scrolling where possible.

## Elevation & Depth
Depth is created through **Glassmorphic Tiers** and **Tinted Shadows**. 

1.  **Level 0 (Base):** The "Softened White" background.
2.  **Level 1 (Cards/Panels):** White with 80% opacity, featuring a `20px` backdrop blur and a `1px` stroke in `Azure Frost` at 10% opacity.
3.  **Level 2 (Modals/Popovers):** Pure white with a deep, diffused shadow tinted with Midnight Slate (#1E293B at 8% alpha). 

Avoid harsh black shadows; elevation should feel like light passing through stacked layers of frosted glass and cool-toned air.

## Shapes
The design system uses a "Rounded" profile (8px base radius). This strikes a balance between the friendliness of consumer apps and the structural integrity required for enterprise tools. Large containers like main dashboard panels should use `rounded-xl` (24px) to create a distinct "shell" effect, while internal elements like buttons and inputs stay at the 8px base.

## Components
- **Buttons:** Primary buttons use `Midnight Slate` with white text. Secondary buttons use a transparent background with a `1px Azure Frost` border.
- **Chips:** Categorical chips use `Azure Frost` at 10% opacity with `Azure Frost` text (600 weight) for high legibility without visual noise.
- **Inputs:** Fields use a subtle inner shadow and a `1px` border that transitions to a `2px Azure Frost` glow on focus.
- **Cards:** Dashboard cards should feature a subtle gradient from the top-left (Soft White) to bottom-right (Azure Frost at 5% opacity) to provide a sense of light direction.
- **Navigation:** The sidebar should utilize the backdrop-blur effect, allowing the background colors to softly bleed through, pinned by a `Midnight Slate` active-state indicator.