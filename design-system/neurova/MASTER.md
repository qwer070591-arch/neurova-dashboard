# NEUROVA Design System

## Product direction

- Product: AI Analytics & Intelligence Platform
- Visual direction: premium dark SaaS, futuristic analytics, restrained glass surfaces.
- Layout: 260px desktop Sidebar, 76px collapsed Sidebar, 72px Header, responsive mobile Drawer.
- Density: compact dashboard rhythm built on a 4px / 8px scale.

## Typography

- UI and numeric text: Inter.
- Traditional Chinese fallback: Noto Sans TC.
- Heading weight: 600–700; body weight: 400–500.
- Base body size: 16px; metadata may use 11–12px with adequate contrast.

## Semantic tokens

| Role | Dark | Light |
| --- | --- | --- |
| App background | `#080B14` | `#F4F7FB` |
| Sidebar | `#0D1220` | `#FFFFFF` |
| Surface | `#151B2C` | `#FFFFFF` |
| Elevated surface | `#1C2436` | `#F8FAFC` |
| Primary | `#6366F1` | `#6366F1` |
| Secondary | `#06B6D4` | `#06B6D4` |
| Primary text | `#F8FAFC` | `#101828` |
| Secondary text | `#94A3B8` | `#475569` |
| Border | `#273247` | `#D9E2EF` |
| Success | `#22C55E` | `#22C55E` |
| Warning | `#F59E0B` | `#F59E0B` |
| Error | `#EF4444` | `#EF4444` |

Components must consume the semantic CSS custom properties declared in `src/styles/tokens.css`; avoid component-level raw colour values except compact logo artwork.

## Interaction and accessibility

- Use Lucide SVG icons only; decorative icons are hidden from assistive technology.
- All controls require a visible `:focus-visible` indicator and at least a 44px hit target where practical.
- Navigation includes text labels, clear active state, keyboard-accessible links and a skip link.
- Use `prefers-reduced-motion` to suppress non-essential transitions.
- Keep normal text at WCAG AA contrast or higher in both themes.
- A closed mobile Drawer must not remain in the focus or accessibility tree.

## Motion

- Use only opacity and transform for non-essential UI transitions.
- Shared timing: 160ms for feedback and 220ms for navigation/layout state changes.
- Avoid autoplaying decorative motion; GSAP will be introduced only in Phase 5.

## Phase 1 boundary

The system contains no operational analytics, charts, requests, users, Mock Data, API calls or CRUD. Those belong to later phases.
