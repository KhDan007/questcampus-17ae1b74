---
name: QuestCampus
description: Evidence-grounded application cockpit for international university applicants.
colors:
  coral-primary: "#b3272c"
  coral-container: "#ff5f5d"
  amber-secondary: "#feb700"
  green-tertiary: "#3b6934"
  surface: "#fdf9f5"
  surface-container: "#f1ede9"
  surface-highest: "#e5e2de"
  ink: "#1c1c19"
  ink-muted: "#5a413f"
  outline: "#8d706e"
typography:
  display:
    fontFamily: "Epilogue, ui-sans-serif, system-ui, sans-serif"
    fontWeight: 700
    letterSpacing: "-0.02em"
  body:
    fontFamily: "Be Vietnam Pro, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    lineHeight: 1.5
  label:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontWeight: 600
    letterSpacing: "0.01em"
rounded:
  sm: "4px"
  md: "8px"
  lg: "8px"
  xl: "12px"
spacing:
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "40px"
components:
  button-primary:
    backgroundColor: "{colors.coral-primary}"
    textColor: "#ffffff"
    rounded: "{rounded.md}"
    padding: "10px 16px"
  card-tactile:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "20px"
---

# Design System: QuestCampus

## 1. Overview

**Creative North Star: "The Application Control Room"**

QuestCampus is a product workspace first. The visual system should feel like a
serious admissions operator: focused, tactile, and evidence-rich. It can be warm and
motivating, but the authenticated experience must always serve the task of choosing,
preparing, tracking, and safely applying.

The existing identity is committed rather than neutral: coral primary actions,
amber scholarship/upgrade moments, green readiness/aid signals, warm paper surfaces,
dark ink, compact labels, and hard shadows. Keep that identity, but apply it with
product restraint. Decoration never outranks status, evidence, or next action.

**Key Characteristics:**
- Tactile controls with firm borders and hard shadows.
- Warm surface system with high-contrast dark ink.
- Coral primary action used deliberately, not as background decoration.
- Dense but readable application cockpit layouts.
- Clear status language for ready, blocked, research-needed, and applied states.

## 2. Colors

The palette is a warm control-room system: coral for decisive action, amber for aid
and unlock moments, green for readiness, and dark ink for trust.

### Primary
- **Operator Coral** (`#b3272c`): primary CTAs, active route emphasis, focus rings,
  and the strongest state highlights.
- **Coral Lift** (`#ff5f5d`): containers and celebratory emphasis. Use sparingly.

### Secondary
- **Scholarship Amber** (`#feb700`): affordability, scholarship, upgrade, and value
  moments. Do not use it as generic decoration.

### Tertiary
- **Ready Green** (`#3b6934`): ready states, aid-friendly signals, and positive
  progress. Pair with text labels or icons; never rely on color alone.

### Neutral
- **Workspace Surface** (`#fdf9f5`): default background.
- **Panel Surface** (`#f1ede9`): soft grouped areas and inactive panels.
- **Raised Surface** (`#e5e2de`): denser rails and status containers.
- **Ink** (`#1c1c19`): body, labels, borders, and shadows.
- **Muted Ink** (`#5a413f`): secondary text that still passes contrast.

### Named Rules

**The Evidence Before Accent Rule.** A colored chip or highlight must correspond to
real status, recommendation evidence, scholarship priority, or action urgency.

## 3. Typography

**Display Font:** Epilogue with ui-sans-serif fallback.
**Body Font:** Be Vietnam Pro with ui-sans-serif fallback.
**Label Font:** Geist with ui-sans-serif fallback.

**Character:** The type system is product-forward: confident headings, readable body
copy, and precise labels. It should not become a display-heavy landing page inside
the app.

### Hierarchy
- **Display** (700, 3rem to 4.5rem, tight tracking): landing and major onboarding
  moments only.
- **Headline** (600-700, 1.25rem to 2rem): cockpit modules, route titles, target
  detail headings.
- **Body** (400-600, 0.875rem to 1.125rem): guidance, reasons, blockers, evidence
  explanations. Keep long prose around 65-75ch.
- **Label** (500-700, 0.75rem to 1rem): buttons, chips, status labels, sidebar
  navigation, and table-like metadata.

### Named Rules

**The No Generic Chat Wall Rule.** Agent output must be structured into headings,
status, evidence, and next actions, not rendered as an undifferentiated chat block.

## 4. Elevation

QuestCampus uses a hybrid of tonal surfaces and hard shadows. Cards and controls can
feel tangible, but shadows should be short, crisp, and stateful. Avoid soft ghost-card
shadows paired with 1px borders.

### Shadow Vocabulary
- **Hard Shadow** (`4px 4px 0 0 var(--color-on-surface)`): primary tactile cards and
  important controls.
- **Primary Hard Shadow** (`5px 5px 0 0 var(--color-primary)`): rare emphasis on
  top-priority modules.
- **Small Hard Shadow** (`2px 2px 0 0 var(--color-on-surface)`): compact buttons and
  navigation controls.

### Named Rules

**The Tactile State Rule.** A shadow should communicate clickability, elevation, or
priority. Do not add shadows to decorate inactive content.

## 5. Components

### Buttons
- **Shape:** compact rounded rectangles (8px) or pills only for tiny tags.
- **Primary:** coral background, white text, dark border, hard shadow, clear hover
  offset.
- **Secondary:** surface background, dark ink text, dark border, small hard shadow.
- **Focus:** use the coral focus ring already defined in `src/styles.css`.

### Chips
- **Style:** semantic tinted containers with dark readable text.
- **State:** chip color must map to a real category: readiness, reach/target/safety,
  scholarship, error, warning, or evidence confidence.

### Cards / Containers
- **Corner Style:** 8px for product cards, 12px for larger cockpit modules.
- **Background:** warm surface layers; avoid nested cards.
- **Border:** firm dark or tonal border when the card is actionable; subtle tonal
  borders for passive panels.
- **Internal Padding:** 16-24px for modules, tighter for list rows.

### Inputs / Fields
- **Style:** surface background, dark readable text, clear label, 8px radius.
- **Focus:** coral focus ring and visible outline.
- **Error / Disabled:** explicit text, icon, and color; color alone is forbidden.

### Navigation
- **Style:** app-shell sidebar with compact labels, lucide icons, active route state,
  and collapsible desktop rail. Mobile uses a drawer with obvious close control.

### Agent Cockpit
- **Style:** first-screen operational dashboard. Use status rails, evidence drawers,
  progress streams, and dense target rows instead of generic hero copy.
- **State:** loading streams real agent events; empty states teach the next action.

## 6. Do's and Don'ts

### Do:
- **Do** show readiness, evidence, scholarship priority, and extension sync as first
  class product states.
- **Do** keep CTAs specific: "Finish NYU transcript upload" beats "Continue".
- **Do** use the existing coral/amber/green/ink system and OKLCH/Tailwind tokens.
- **Do** expose low-confidence or stale data instead of hiding uncertainty.
- **Do** keep interactive states keyboard-visible and reduced-motion friendly.

### Don't:
- **Don't** bury the autonomous agent inside a generic chatbot surface.
- **Don't** return generic tips like "improve your essays" or "look for scholarships".
- **Don't** imply an application is submitted before human review/submission.
- **Don't** attempt unknown-portal autofill without readiness and coverage.
- **Don't** use gradient text, glass cards, decorative grid backgrounds, or side-stripe
  card borders as default scaffolding.
