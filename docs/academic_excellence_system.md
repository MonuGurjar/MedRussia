---
name: Academic Excellence System
colors:
  surface: '#f7fafc'
  surface-dim: '#d7dadc'
  surface-bright: '#f7fafc'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f1f4f6'
  surface-container: '#ebeef0'
  surface-container-high: '#e5e9eb'
  surface-container-highest: '#e0e3e5'
  on-surface: '#181c1e'
  on-surface-variant: '#43474e'
  inverse-surface: '#2d3133'
  inverse-on-surface: '#eef1f3'
  outline: '#74777f'
  outline-variant: '#c4c6cf'
  surface-tint: '#455f88'
  primary: '#002045'
  on-primary: '#ffffff'
  primary-container: '#1a365d'
  on-primary-container: '#86a0cd'
  inverse-primary: '#adc7f7'
  secondary: '#875200'
  on-secondary: '#ffffff'
  secondary-container: '#ffb55c'
  on-secondary-container: '#744600'
  tertiary: '#1b2127'
  on-tertiary: '#ffffff'
  tertiary-container: '#30363c'
  on-tertiary-container: '#989fa6'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d6e3ff'
  primary-fixed-dim: '#adc7f7'
  on-primary-fixed: '#001b3c'
  on-primary-fixed-variant: '#2d476f'
  secondary-fixed: '#ffddba'
  secondary-fixed-dim: '#ffb866'
  on-secondary-fixed: '#2b1700'
  on-secondary-fixed-variant: '#673d00'
  tertiary-fixed: '#dde3eb'
  tertiary-fixed-dim: '#c1c7cf'
  on-tertiary-fixed: '#161c22'
  on-tertiary-fixed-variant: '#41474e'
  background: '#f7fafc'
  on-background: '#181c1e'
  surface-variant: '#e0e3e5'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 8px
  container-max: 1280px
  gutter: 24px
  margin-desktop: 64px
  margin-mobile: 20px
  stack-sm: 8px
  stack-md: 16px
  stack-lg: 32px
---

## Brand & Style

The design system is engineered to project **authority, prestige, and institutional trust**. Aimed at medical students and their families, the interface balances the high-stakes nature of medical education with an approachable, supportive guidance model.

The style is **Modern Corporate**, characterized by a rigorous adherence to grid structures, intentional whitespace, and a "clinical" clarity that mirrors the precision of the medical field. It avoids decorative excess in favor of functional elegance, using subtle depth to guide the user's focus through complex information hierarchies.

## Colors

The palette is anchored by **Deep Academic Blue**, which serves as the primary driver for navigation, headers, and primary actions to establish an immediate sense of institutional reliability. 

**Golden Yellow** is used sparingly as a high-contrast accent. It highlights "opportunity" points, such as scholarship calls-to-action, success stories, or active application buttons. 

The background environment utilizes **Light Gray (#F7FAFC)** instead of pure white to reduce eye strain during long reading sessions and to provide a more sophisticated, "executive" feel. Success, Error, and Warning states should use muted, professional tones rather than neon variants to maintain the academic tone.

## Typography

This design system exclusively employs **Inter** for its exceptional legibility and systematic, neutral character. 

- **Headlines:** Use tight letter-spacing and semi-bold weights to create a sense of firm declaration.
- **Body Text:** Use `body-md` for standard documentation and `body-lg` for introductory paragraphs to improve scanability.
- **Labels:** Small labels and captions use a slightly increased letter-spacing and medium weight to ensure clarity against the light gray background surfaces.

## Layout & Spacing

The layout follows a **Fixed Grid** model on desktop to maintain the organized, structured feel of an academic prospectus. 

- **Desktop (1280px+):** 12-column grid with 24px gutters. Content is centered with generous 64px margins.
- **Tablet (768px - 1024px):** 8-column grid with 16px gutters and 40px margins.
- **Mobile (<768px):** 4-column fluid grid with 16px gutters and 20px margins.

Vertical rhythm is strictly maintained using multiples of **8px**. Complex information (like university course details) should use a "Content-First" layout where technical data is grouped into clear vertical stacks with `stack-lg` spacing between distinct sections.

## Elevation & Depth

To maintain a prestigious feel, the design system avoids heavy shadows. Instead, it utilizes **Tonal Layers** and **Soft Ambient Occlusion**.

- **Level 0 (Background):** #F7FAFC.
- **Level 1 (Cards/Content):** #FFFFFF with a 1px border of #E2E8F0.
- **Level 2 (Hover/Active):** A soft shadow: `0px 4px 12px rgba(26, 54, 93, 0.08)`. This tinting with the Primary Blue ensures the shadow feels integrated rather than dirty.

Information is organized into "containers." Each container should be clearly defined by its white surface against the light gray background, creating depth through contrast rather than artificial height.

## Shapes

The design system uses a **Rounded (8px)** corner radius for standard components like buttons, input fields, and cards. This radius strikes a balance between the sharp, rigid corners of traditional legal documents and the overly soft, "bubbly" feel of consumer social apps. 

Large containers, such as University Profile cards or Hero sections, may use `rounded-xl` (24px) for a more modern, high-end editorial appearance. Interactive elements like "tags" or "status chips" should use a pill shape to distinguish them from actionable buttons.

## Components

### Buttons
- **Primary:** Deep Academic Blue background with White text. Rectangular with 8px radius. High weight (Semi-bold).
- **Secondary:** Transparent background with 1.5px Deep Academic Blue border.
- **CTA:** Golden Yellow background with Primary Blue text for maximum visibility on "Apply Now" actions.

### Input Fields
Inputs must feel "clinical" and precise. Use a White background, #E2E8F0 border, and `body-md` text. Focus states should transition the border to Primary Blue with a 1px outer glow.

### Cards
University and Course cards are the centerpiece. They should feature a clear image header, followed by a titled section. Use a subtle 1px border instead of a shadow to maintain a clean, grid-aligned aesthetic.

### Status Chips
For application stages (e.g., "Pending," "Verified," "Enrolled"), use low-saturation background tints with high-saturation text to ensure they are legible but do not distract from the primary content.

### Additional Components
- **Data Tables:** High-density, clean rows with #F7FAFC alternating row highlights for comparing university fees and rankings.
- **Step Indicators:** Vertical or horizontal steppers to guide students through the complex MBBS application process.