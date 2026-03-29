# Spark Mojo Component Inventory

**Status:** Draft — derived from OnboardingMojo and WorkboardMojo audit
**Last Updated:** 2026-03-27
**Related:** [ADR: Design System](./ADR-design-system.md)

This document catalogs every shared UI component in the Spark Mojo design system. Claude Code MUST consult this inventory before creating any new UI element. If a component exists here, use it. If a pattern is needed that doesn't exist here, add it to this inventory BEFORE implementing.

**Visual North Star:** Ein UI (https://ui.eindev.ir/) — all surface components (cards, drawers, modals, panels) use liquid glass treatment: `backdrop-blur`, translucent backgrounds via `var(--sm-glass-bg)`, soft luminous borders via `var(--sm-glass-border)`, and layered depth via blur tiers. **Light mode is the default working environment** — glass surfaces are frosted white floating over a light canvas (`--sm-offwhite`). Drawers and modals get the dramatic glass depth effect via dimmed backdrop overlays. Dark mode (opt-in toggle) swaps tokens to unlock the full Ein UI showcase aesthetic. All glass values MUST use token variables, never hardcoded rgba — this is what makes the light/dark mode swap work.

---

## Layer 1: Base Components (shadcn/ui)

These are standard shadcn/ui components installed into `src/components/ui/`. They use Spark Mojo design tokens but otherwise follow shadcn/ui defaults. Full docs at [ui.shadcn.com](https://ui.shadcn.com).

### Install List (Phase 1)

| Component | shadcn name | Primary Usage |
|-----------|------------|---------------|
| Button | `button` | All clickable actions (+ New Task, View, Complete, filters) |
| Card | `card` | Stats cards, kanban cards, content containers |
| Dialog | `dialog` | New Task modal, confirmation dialogs |
| Drawer | `drawer` | Task detail panel (slides from right) |
| Tabs | `tabs` | Queue/My Tasks/History, List/Kanban toggles |
| Badge | `badge` | Type badges, status badges, priority indicators |
| Table | `table` | Task list view, data tables |
| Select | `select` | Source system filter, role dropdown, form dropdowns |
| Input | `input` | Text fields in forms and search |
| Avatar | `avatar` | Initials avatar (teal circle, white text, 28px) |
| Tooltip | `tooltip` | Hover context on truncated text, icons |
| Popover | `popover` | User combobox dropdown in AssignmentField |
| Command | `command` | Searchable dropdown (user selection combobox) |
| Separator | `separator` | Section dividers in drawers and forms |
| Skeleton | `skeleton` | Loading states for all data-dependent views |
| Toast | `sonner` | Error messages, success confirmations |
| Scroll Area | `scroll-area` | Kanban columns, long task lists |
| Toggle Group | `toggle-group` | Assignment mode selector (Person/Role/Unassigned) |

### Install List (Phase 2 — when data viz mojos begin)

| Component | shadcn name | Primary Usage |
|-----------|------------|---------------|
| Chart (Area) | `chart` | Time-series metrics |
| Chart (Bar) | `chart` | Comparison dashboards |
| Chart (Line) | `chart` | Trend visualization |
| Chart (Pie) | `chart` | Distribution views |
| Chart (Radar) | `chart` | Multi-axis comparison |

---

## Layer 2: Mojo Pattern Components

These are Spark Mojo-specific composite components built from Layer 1 primitives. They live in `src/components/mojo-patterns/` and encode the standard patterns every mojo uses.

---

### MojoHeader

**File:** `src/components/mojo-patterns/MojoHeader.jsx`
**Used by:** Every mojo

The standard header for all mojo views. Includes mojo icon, title, subtitle, and right-side action area.

**Props:**

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `icon` | `ReactNode` | Yes | Mojo icon (e.g., clipboard for Onboarding, checkmark-circle for Workboard) |
| `title` | `string` | Yes | Mojo name displayed in Montserrat 600 |
| `subtitle` | `string` | No | Description text in Nunito Sans (e.g., "Tasks assigned to your team") |
| `actions` | `ReactNode` | No | Right-side content: view toggles, action buttons |

**Visual spec:**
- Title: Montserrat, 600 weight, `var(--sm-slate)`
- Subtitle: Nunito Sans, 400, gray-500
- Icon: 24px, `var(--sm-teal)`
- Animated entrance on mount (fade + slight upward slide)
- Actions area right-aligned, vertically centered

---

### StatsCardRow

**File:** `src/components/mojo-patterns/StatsCardRow.jsx`
**Used by:** OnboardingMojo, WorkboardMojo

The 4-card summary strip showing key metrics for the current view.

**Props:**

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `cards` | `StatsCard[]` | Yes | Array of card definitions |

**StatsCard shape:**

```js
{
  label: string,       // e.g., "Active Queue", "Urgent", "Pending Insurance"
  value: number,       // The big number
  icon: ReactNode,     // Optional icon (people icon, warning triangle, etc.)
  color: string,       // Token reference: "teal", "coral", "gold", "green"
  active: boolean,     // Whether this card is currently selected/highlighted
  onClick: () => void  // Filter action when card is clicked
}
```

**Visual spec:**
- Cards: liquid glass surface (`backdrop-blur-md`, `bg-white/70`, `border border-white/18`), rounded-lg, soft shadow
- Active card: teal left border (3px) + teal-tinted glass background (`bg-teal-50/60`)
- Number: 28px, font-weight 700, color matches `color` prop token
- Label: 13px, gray-500, Inter
- Responsive: 4 columns on desktop, 2x2 on tablet, stack on mobile

---

### FilterTabBar

**File:** `src/components/mojo-patterns/FilterTabBar.jsx`
**Used by:** OnboardingMojo, WorkboardMojo

Pill-style filter tabs with active state indication.

**Props:**

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `tabs` | `FilterTab[]` | Yes | Array of tab definitions |
| `activeTab` | `string` | Yes | Currently selected tab key |
| `onTabChange` | `(key: string) => void` | Yes | Callback when tab is selected |
| `rightContent` | `ReactNode` | No | Right-side content (search bar, source filter dropdown) |

**FilterTab shape:**

```js
{
  key: string,    // Unique identifier
  label: string,  // Display text
  count: number   // Optional badge count
}
```

**Visual spec:**
- Active tab: solid fill `var(--sm-teal)`, white text, border-radius 9999px (full pill)
- Inactive tab: white/transparent background, `var(--sm-teal)` text, teal border on hover
- Height: 32px, Inter 13px font
- Right content area (search, dropdowns) separated by flex spacer

---

### StatusBadge

**File:** `src/components/mojo-patterns/StatusBadge.jsx`
**Used by:** OnboardingMojo, WorkboardMojo, any future task-based mojo

Color-coded badge for task type, status, or priority.

**Props:**

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `variant` | `"type" \| "status" \| "priority"` | Yes | Determines color mapping |
| `value` | `string` | Yes | The value to display and color-map |

**Color mappings:**

Type badges:
- Action → teal background
- Review → gold background
- Approval → coral background

Status badges:
- New → gray
- Ready → teal
- In Progress → blue
- Waiting → gold
- Blocked → coral
- Completed → green
- Canceled → muted gray

Priority (used as left border stripe, not badge):
- Urgent → `#E53935` (red)
- High → `var(--sm-coral)`
- Medium → `var(--sm-gold)`
- Low → `#B0BEC5` (gray)

**Visual spec:**
- Soft background (10% opacity of color), text in full color
- Pill shape, 11px Inter uppercase, letter-spacing 0.5px
- Priority variant renders as 4px left border on parent row, not a badge

---

### KanbanBoard

**File:** `src/components/mojo-patterns/KanbanBoard.jsx`
**Used by:** WorkboardMojo, OnboardingMojo (if kanban view added)

Column-based card layout for task visualization.

**Props:**

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `columns` | `KanbanColumn[]` | Yes | Column definitions with items |
| `onCardClick` | `(item) => void` | No | Callback when a card is clicked |
| `onCardMove` | `(item, fromCol, toCol) => void` | No | Callback for drag-and-drop (future) |
| `renderCard` | `(item) => ReactNode` | No | Custom card renderer (default uses standard card layout) |

**KanbanColumn shape:**

```js
{
  key: string,
  title: string,
  items: any[],
  color: string  // Header accent color token
}
```

**Visual spec:**
- Columns: equal width, flex layout, scroll-area for overflow
- Column header: title + item count badge
- Cards: liquid glass surface (`backdrop-blur-md`, `bg-white/70`, `border border-white/18`), rounded-lg, soft shadow, 12px padding
- Unassigned cards: coral top border with pulse animation (keyframes: coral ↔ gold)
- Drag handle indicator on hover (future — CSS only for now)

---

### TaskDetailDrawer

**File:** `src/components/mojo-patterns/TaskDetailDrawer.jsx`
**Used by:** WorkboardMojo, future task-based mojos

Slide-out detail panel for viewing and editing a single task.

**Props:**

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `open` | `boolean` | Yes | Whether drawer is visible |
| `onClose` | `() => void` | Yes | Close callback |
| `task` | `object` | Yes | Task data to display |
| `sections` | `DrawerSection[]` | No | Custom section definitions (default: details + comments) |
| `actions` | `ReactNode` | No | Action buttons (Complete, Edit, etc.) |

**Visual spec:**
- Slides from right edge, overlay backdrop (`bg-black/20 backdrop-blur-sm`)
- Drawer surface: liquid glass (`backdrop-blur-xl`, `bg-white/75`, `border-l border-white/18`), shadow-drawer
- Width: 480px (desktop), full width (mobile)
- Header: task subject + close button
- Body: scrollable sections separated by dividers
- Footer: sticky action buttons on frosted glass strip

---

### DataTable

**File:** `src/components/mojo-patterns/DataTable.jsx`
**Used by:** WorkboardMojo, OnboardingMojo

Sortable, filterable table with priority stripes and row actions.

**Props:**

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `columns` | `ColumnDef[]` | Yes | Column definitions (header, accessor, sortable, width) |
| `data` | `any[]` | Yes | Row data |
| `onRowClick` | `(row) => void` | No | Row click handler (opens detail drawer) |
| `priorityField` | `string` | No | Field name for left border priority stripe |
| `emptyState` | `ReactNode` | No | Content shown when data is empty |
| `loading` | `boolean` | No | Show skeleton loading state |

**ColumnDef shape:**

```js
{
  key: string,
  header: string,         // Uppercase header text
  accessor: string | fn,  // Field name or accessor function
  sortable: boolean,
  width: string,          // CSS width (flex basis)
  render: (value, row) => ReactNode  // Custom cell renderer
}
```

**Visual spec:**
- Headers: 11px Inter, uppercase, bold, gray-500, sort arrow (teal when active)
- Rows: 52px height, hover = light teal background
- Priority stripe: 4px left border, color from StatusBadge priority mapping
- Unassigned rows: pulsing coral/gold background animation + 8px animated border
- Row actions: right-aligned "View" button (teal outline, 28px height)

---

### AssignmentField

**File:** `src/components/mojo-patterns/AssignmentField.jsx` (already exists in `components/ui/`, move here)
**Used by:** WorkboardMojo (new task modal + detail drawer)

Segmented toggle for assignment mode with user combobox and role dropdown.

**Props:**

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `value` | `{ mode, userId, roleId }` | Yes | Current assignment state |
| `onChange` | `(value) => void` | Yes | Assignment change callback |
| `users` | `User[]` | Yes | Available users list |
| `roles` | `Role[]` | Yes | Available roles list |

**Modes:**
- 👤 Assign to Person → shows searchable user combobox
- 👥 Assign to Role Queue → shows role dropdown
- — Leave Unassigned → clears both fields

**Visual spec:**
- Toggle: pill group, 32px height, border-radius 9999px, Inter 13px
- User combobox: text input + absolute dropdown (z-50, max-h-240px), shows avatar + name + email
- Role dropdown: standard select, alphabetically sorted

---

## Layer 3: Animation Accents (Magic UI)

These are selectively applied. They live in `src/components/magicui/` and are never required — they enhance existing patterns.

| Component | Source | Usage |
|-----------|--------|-------|
| AnimatedBorder | Magic UI | Subtle border glow on active/focused cards |
| ShimmerButton | Magic UI | Primary CTA buttons (+ New Task, Save) — optional upgrade from base Button |
| SpotlightCard | Magic UI | Hover spotlight effect on stats cards |
| TextAnimate | Magic UI | Mojo title entrance animation |

**Rule:** Magic UI components are accent only. Every view must work perfectly without them. They add polish, not function.

---

## Unassigned Indicator Pattern

This pattern is shared across List and Kanban views and deserves explicit documentation because it's a key UX differentiator.

**List view (DataTable):**
- Row background: pulsing animation (coral 10% → gold 10%, 2s cycle)
- Left border: 8px animated (coral → gold, 2s cycle)
- Badge: `⚠ Unassigned` in coral

**Kanban view (KanbanBoard):**
- Card top border: 3px, pulsing coral → gold
- Badge: `⚠ Unassigned` in coral

**CSS keyframes (shared):**
```css
@keyframes pulse-unassigned-bg {
  0%, 100% { background-color: rgba(255, 111, 97, 0.08); }
  50% { background-color: rgba(255, 179, 0, 0.08); }
}

@keyframes pulse-unassigned-border {
  0%, 100% { border-color: var(--sm-coral); }
  50% { border-color: var(--sm-gold); }
}
```

---

## Adding New Components

When a new mojo needs a UI pattern that doesn't exist in this inventory:

1. **Check if it's a variant** of an existing component. If so, extend the existing component with a new prop/variant rather than creating a new one.
2. **If genuinely new**, add it to this inventory FIRST with props, visual spec, and usage notes.
3. **Get the pattern approved** (via PR review or James review) before implementing.
4. **Build it from Layer 1 primitives.** Never bypass shadcn/ui base components.
5. **Add it to CLAUDE.md** rule set so future build sessions know it exists.

---

## Appendix: Token Quick Reference

```css
/* Colors */
--sm-teal: #006666;
--sm-coral: #FF6F61;
--sm-gold: #FFB300;
--sm-offwhite: #F8F9FA;
--sm-slate: #34424A;

/* Priority Colors */
--sm-priority-urgent: #E53935;
--sm-priority-high: var(--sm-coral);
--sm-priority-medium: var(--sm-gold);
--sm-priority-low: #B0BEC5;

/* Status Colors */
--sm-status-new: #9E9E9E;
--sm-status-ready: var(--sm-teal);
--sm-status-inprogress: #1E88E5;
--sm-status-waiting: var(--sm-gold);
--sm-status-blocked: var(--sm-coral);
--sm-status-completed: #43A047;
--sm-status-canceled: #BDBDBD;

/* Typography */
--sm-font-display: 'Montserrat', sans-serif;
--sm-font-body: 'Nunito Sans', sans-serif;
--sm-font-ui: 'Inter', sans-serif;

/* Spacing (base 4px) */
--sm-space-1: 4px;
--sm-space-2: 8px;
--sm-space-3: 12px;
--sm-space-4: 16px;
--sm-space-6: 24px;
--sm-space-8: 32px;

/* Radius */
--sm-radius-sm: 4px;
--sm-radius-md: 8px;
--sm-radius-lg: 12px;
--sm-radius-pill: 9999px;

/* Shadows */
--sm-shadow-card: 0 1px 3px rgba(0,0,0,0.08);
--sm-shadow-drawer: -4px 0 24px rgba(0,0,0,0.12);
--sm-shadow-modal: 0 8px 32px rgba(0,0,0,0.16);

/* Liquid Glass Surfaces (reference: ui.eindev.ir) */
--sm-glass-bg: rgba(255, 255, 255, 0.70);
--sm-glass-bg-hover: rgba(255, 255, 255, 0.80);
--sm-glass-bg-active: rgba(255, 255, 255, 0.90);
--sm-glass-border: rgba(255, 255, 255, 0.18);
--sm-glass-border-strong: rgba(255, 255, 255, 0.30);
--sm-glass-blur-sm: 8px;
--sm-glass-blur-md: 16px;
--sm-glass-blur-lg: 24px;
--sm-glass-blur-xl: 40px;

/* Glass surface tints (for colored glass panels) */
--sm-glass-teal: rgba(0, 102, 102, 0.06);
--sm-glass-coral: rgba(255, 111, 97, 0.06);
--sm-glass-gold: rgba(255, 179, 0, 0.06);

/* Overlay backdrops */
--sm-overlay-drawer: rgba(0, 0, 0, 0.20);
--sm-overlay-modal: rgba(0, 0, 0, 0.30);
--sm-overlay-blur: 4px;
```
