# ADR: Spark Mojo Design System

**Status:** Proposed
**Date:** 2026-03-27
**Author:** James Ilsley
**Scope:** Frontend architecture, all mojos, all future UI work

---

## Context

Spark Mojo has two production mojos (Onboarding and Workboard) that are functionally similar — both are task-based queue views with list/kanban layouts, filter tabs, status cards, and detail drawers. Despite this similarity, autonomous Claude Code build sessions produced slightly different implementations for the same UI patterns because no shared component contract existed. James unified them manually, but the root cause remains: without a formalized design system, every new mojo reinvents the wheel and every Claude Code session makes independent design choices.

This problem compounds with scale. At two mojos it's a manual fix. At ten mojos it's a multi-sprint refactor. At twenty it requires a rewrite. Additionally, Spark Mojo will need system-wide visual updates, per-client theming, and heavy data visualization as the platform grows. All of these require centralized, tokenized UI components — not scattered inline implementations.

## Decision

Adopt a layered design system architecture:

**Layer 1 — shadcn/ui (Component Skeleton)**
Copy-paste Tailwind-native components built on Radix UI primitives. 70+ base components plus 53+ chart components (via Recharts). Code-owned, not dependency-managed — every component lives in our repo and can be freely modified. This is the structural foundation for every mojo.

**Layer 2 — Magic UI (Motion & Personality)**
Copy-paste animation and motion components (also Tailwind-native, also code-owned). Provides the animated borders, spotlight effects, shimmer interactions, and visual flourishes that make Spark Mojo feel distinctive rather than generic. Used selectively as accent, not as foundation.

**Layer 3 — Spark Mojo Design Tokens + Liquid Glass Visual Layer (Identity)**
CSS custom properties defining colors, typography, spacing, radius, shadows, and animation timing. These tokens are the single source of truth for the Spark Mojo visual identity. Per-client theming (future) is achieved by swapping this token layer.

**Visual North Star: Ein UI (https://ui.eindev.ir/)**
The Spark Mojo visual identity draws from Ein UI's liquid glass design language — frosted/translucent surfaces, backdrop-blur depth layering, subtle glass refraction, and soft luminous edges. This is not a dependency; Ein UI is a reference for how surfaces, cards, buttons, and inputs should feel. Every shared component should be styled to evoke this glassy, layered depth rather than flat/minimal defaults. The UI is a core product differentiator — it should be immediately recognizable as Spark Mojo.

**Light-Mode-First Glass Strategy:**
Full liquid glass effects look dramatic on dark backgrounds, but Spark Mojo is a daily-driver work tool — practice admins use it 8+ hours a day. Dark backgrounds cause eye fatigue in extended use. The approach:

- **Light mode is the default working environment.** Page backgrounds stay light (`--sm-offwhite`). Glass treatment applies to *surfaces that sit on top* — cards, drawers, modals, sidebar panels. Frosted white glass (`bg-white/70`, `backdrop-blur-md`) creates subtle depth against the light canvas through blur and luminous borders, not dramatic dark/light contrast.
- **The sidebar carries slightly more depth** (`--sm-slate` at ~85% opacity with blur), giving the main content area's glass cards something to contrast against at edges and transitions.
- **Drawers and modals are where the Ein UI drama lives.** These temporary overlays use a dimmed backdrop (`bg-black/20 backdrop-blur-sm`), creating the full glass depth effect for focused interactions that the user opens, completes, and closes.
- **Dark mode is the premium showcase — opt-in, not default.** Built as a toggle (`[data-theme="dark"]`) that swaps the token layer. Glass tokens shift from white-on-light to white-on-dark, unlocking the full Ein UI visual impact. Ideal for demos, marketing screenshots, and users who prefer it. Same components, dramatically different feel.

This gives us the best of both worlds: a productive, eye-friendly light environment for daily work, with the full liquid glass showcase available as an option.

**Brand Tokens (current):**

| Token | Value | Usage |
|-------|-------|-------|
| `--sm-teal` | `#006666` | Primary actions, active states, avatars |
| `--sm-coral` | `#FF6F61` | Warnings, urgent states, unassigned alerts |
| `--sm-gold` | `#FFB300` | Medium priority, pending states, review badges |
| `--sm-offwhite` | `#F8F9FA` | Page backgrounds |
| `--sm-slate` | `#34424A` | Text, headers |
| `--sm-font-display` | `Montserrat` | Mojo titles, headers (600 weight) |
| `--sm-font-body` | `Nunito Sans` | Body text, descriptions |
| `--sm-font-ui` | `Inter` | Controls, buttons, badges, table text |

## Alternatives Considered

**1. Ein UI / Glin UI / liquid-glass-react (glassmorphism libraries)**
Rejected. These are visually interesting but immature (0.1.0 versions, <100 stars), have no data visualization components, and limited browser support. None are suitable as a production foundation for a SaaS platform that needs heavy charting and long-term stability.

**2. MUI / Chakra UI (opinionated component libraries)**
Rejected. These impose their own design language, making it harder to create a distinctive Spark Mojo identity. They're npm dependencies (not code-owned), which means fighting upstream decisions when customizing. MUI in particular adds significant bundle weight.

**3. HeroUI (formerly NextUI)**
Considered. Beautiful out of box, modern glassmorphic aesthetic. However: npm dependency model (not copy-paste), limited built-in charting (would need separate library), and less community adoption for customization patterns. shadcn/ui's code-ownership model better fits our agent-driven workflow where Claude Code needs to modify components directly.

**4. Tremor (dashboard-focused library)**
Considered as a supplement for data viz. May still be adopted later for analytics-heavy mojos. Not selected as primary foundation because it's dashboard-centric and weaker for form-heavy workflow UIs. shadcn/ui's Recharts integration covers our charting needs without a second library.

**5. No design system (continue as-is)**
Rejected. The current approach guarantees divergence with every new mojo and every Claude Code session. System-wide visual updates would require hunting through every component file. Unacceptable tech debt trajectory.

## Architecture

```
src/
├── components/
│   ├── ui/                    ← shadcn/ui base components (Button, Card, Dialog, etc.)
│   ├── charts/                ← shadcn/ui chart components (BarChart, LineChart, etc.)
│   ├── magicui/               ← Magic UI animation components (selective use)
│   ├── mojo-patterns/         ← Spark Mojo composite patterns (see Component Inventory)
│   │   ├── MojoHeader.jsx
│   │   ├── StatsCardRow.jsx
│   │   ├── FilterTabBar.jsx
│   │   ├── KanbanBoard.jsx
│   │   ├── TaskDetailDrawer.jsx
│   │   ├── DataTable.jsx
│   │   └── StatusBadge.jsx
│   └── mojos/                 ← Individual mojo implementations (assemble from above)
│       ├── OnboardingMojo.jsx
│       └── WorkboardMojo.jsx
├── styles/
│   └── tokens.css             ← Design tokens (CSS custom properties)
└── lib/
    └── utils.ts               ← shadcn/ui utility functions (cn, etc.)
```

### Rules (enforced via CLAUDE.md)

1. **All mojos MUST import from `components/ui/`, `components/charts/`, or `components/mojo-patterns/`.** Never create custom implementations of components that exist in the shared library.
2. **All colors MUST reference design tokens** (`var(--sm-teal)`), never raw hex values in component files.
3. **All typography MUST use the token font stack.** Montserrat for display, Nunito Sans for body, Inter for UI controls.
4. **New shared components require a pattern entry** in the Component Inventory before implementation.
5. **Magic UI components are accent only.** They enhance existing patterns, never replace base components.
6. **All surfaces MUST follow the liquid glass visual direction.** Cards, drawers, modals, and panels use frosted glass treatment (backdrop-blur, translucent backgrounds, soft borders). Reference Ein UI (ui.eindev.ir) for visual guidance. No flat/opaque surfaces unless explicitly specified.
7. **React never calls Frappe directly.** Always via `/api/modules/[capability]/[action]`. (Existing rule, restated for completeness.)

### Theming Architecture (future-ready)

```css
/* tokens.css — default Spark Mojo theme (light mode) */
:root {
  --sm-teal: #006666;
  --sm-coral: #FF6F61;
  --sm-gold: #FFB300;
  --sm-offwhite: #F8F9FA;
  --sm-slate: #34424A;
  --sm-glass-bg: rgba(255, 255, 255, 0.70);
  --sm-glass-border: rgba(255, 255, 255, 0.18);
  --sm-glass-blur: 16px;
  /* ... spacing, radius, shadow tokens ... */
}

/* Dark mode — full Ein UI glass showcase */
[data-theme="dark"] {
  --sm-offwhite: #0f1117;
  --sm-slate: #e8eaed;
  --sm-glass-bg: rgba(255, 255, 255, 0.06);
  --sm-glass-border: rgba(255, 255, 255, 0.10);
  --sm-glass-blur: 24px;
  /* brand colors stay the same — they pop on dark */
}

/* Per-client override example (future) */
[data-theme="willow-center"] {
  --sm-teal: #2E7D6F;
  /* override only what differs */
}
```

Theming is layered: `data-theme` on the root element selects the mode (light/dark) and optionally the client brand. Modes and brands compose — `data-theme="dark willow-center"` gives dark mode with Willow Center brand colors. No component code changes needed.

## Consequences

**Positive:**
- Every mojo assembles from the same building blocks — visual consistency is structural, not manual
- Claude Code sessions follow explicit rules in CLAUDE.md — no more independent design choices
- System-wide visual updates are a token change, not a codebase-wide search-and-replace
- Per-client theming is a future token swap, not a redesign
- Heavy data visualization is covered by shadcn/ui charts (Recharts) from day one
- Code-owned components mean zero dependency conflicts and unlimited customization

**Negative:**
- ~2-3 day upfront investment to extract shared components from existing mojos
- Existing OnboardingMojo and WorkboardMojo need refactoring to import from shared library
- Claude Code CLAUDE.md rules need updating before next build session
- Team (and agents) must learn component API for shared patterns

**Risks:**
- Over-engineering the component library before we know all future mojo patterns. Mitigated by extracting only what we've already built twice (rule of two), not speculating.
- Magic UI animations adding visual noise. Mitigated by "accent only" rule — never structural.

## Component Buildout Strategy

**Question:** Should we install and theme the full shadcn/ui component library upfront, or add components as needed?

**Decision: Install the full base library, theme it once, add mojo-patterns progressively.**

The reasoning splits into two layers because they have different economics:

**Layer 1 (shadcn/ui base components) — install all ~70 upfront.** These are atomic primitives: Button, Card, Input, Select, Dialog, Table, etc. Each one is a single file (~50-150 lines) with no business logic. The cost of installing and theming all of them in one pass is maybe half a day of Claude Code work. The cost of NOT doing it is that every future mojo build session has to stop, install the component it needs, theme it to match the glass system, and hope it matches what the last session did. That's exactly the inconsistency problem we're solving. Install them all, apply the Spark Mojo glass tokens to each one, and they're ready for any mojo to grab.

Think of it like stocking a workshop. You don't buy a drill bit only when you need a hole — you buy the set and they're ready when you need them. The base components are cheap, small, and universal.

**Layer 2 (mojo-patterns) — build progressively, rule of two.** These are composite patterns like MojoHeader, StatsCardRow, KanbanBoard. They encode business-level design decisions and they're more expensive to build. The rule: extract a mojo-pattern when the second mojo needs it. We already hit that threshold for everything in the current inventory (Onboarding and Workboard both need them). Future patterns get added to the Component Inventory spec first, then built when a mojo needs them.

**Layer 3 (Magic UI accents) — install on demand.** These are decorative. Only add them when a specific mojo calls for a specific effect.

**The buildout sequence for a Ralph overnight session:**

```
1. npx shadcn@latest init                     (scaffolds config)
2. npx shadcn@latest add --all                (installs every base component)
3. Apply Spark Mojo glass tokens to each       (one-pass theming)
4. Extract mojo-patterns from existing mojos   (the Phase 2 work)
5. Refactor OnboardingMojo + WorkboardMojo     (the Phase 3 work)
```

Step 2 is the key insight — `shadcn add --all` gives you every primitive in one command. Then the theming pass is systematic: for every surface component (Card, Dialog, Drawer, Popover, Sheet, etc.), apply the glass token variables. For every interactive component (Button, Select, Input, etc.), apply the brand color tokens and font tokens. One pass, done. Every future mojo inherits the full themed library automatically.

**Governance for ongoing additions:**
- Base components: already complete after initial install. If shadcn/ui adds new ones, Claude Code can install them ad-hoc.
- Mojo-patterns: require a Component Inventory entry + ADR review before implementation. Story files reference patterns by name.
- Charts: install from shadcn/ui chart library when the first data-viz mojo begins. Same theming pass applies.



**Phase 1 — Foundation (Day 1)**
- Install shadcn/ui CLI, initialize with Spark Mojo tokens
- Create `styles/tokens.css` with all brand tokens as CSS custom properties
- Set up `components/ui/` directory structure
- Add initial shadcn/ui components: Button, Card, Dialog, Drawer, Tabs, Badge, Table, Select, Input, Avatar

**Phase 2 — Mojo Patterns (Day 1-2)**
- Extract `MojoHeader` from OnboardingMojo (icon + title + subtitle + tab toggles)
- Extract `StatsCardRow` (the 4-card summary strip)
- Extract `FilterTabBar` (pill-style filter tabs with active state)
- Extract `StatusBadge` (color-coded type/status/priority badges)
- Extract `KanbanBoard` (column-based card layout)
- Extract `TaskDetailDrawer` (slide-out detail panel)
- Extract `DataTable` (sortable table with priority stripe, row actions)

**Phase 3 — Refactor Mojos (Day 2-3)**
- Rewrite OnboardingMojo to import from shared components
- Rewrite WorkboardMojo to import from shared components
- Verify visual parity with current production
- Run existing test suite, update tests for new component imports

**Phase 4 — Governance (Day 3)**
- Update CLAUDE.md with design system rules
- Update story file template to reference pattern names
- Add Component Inventory to platform/README.md navigation
- Commit decision doc to platform/decisions/

---

## Related Documents

- [Component Inventory](./COMPONENT_INVENTORY.md) — detailed component catalog with props and usage
- CLAUDE.md — build-time rules (to be updated)
- platform/README.md — master navigation (to be updated)
