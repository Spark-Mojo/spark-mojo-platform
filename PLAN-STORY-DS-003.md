# PLAN — STORY-DS-003: Refactor OnboardingMojo to Design System

**Branch:** `design-system/ds-003-onboarding-mojo-refactor`
**Type:** Design System — Phase 3 Mojo Refactor
**File:** `frontend/src/pages/OnboardingMojo.jsx` (1655 lines, single-file refactor)

---

## Summary

Replace inline Tailwind color classes and hand-rolled UI components in OnboardingMojo.jsx
with shared mojo-pattern components and `var(--sm-*)` design tokens. Zero functional changes.

---

## Files to Modify

| File | Action | Details |
|------|--------|---------|
| `frontend/src/pages/OnboardingMojo.jsx` | Edit | Main refactor target — all changes below |
| `frontend/src/components/mojo-patterns/StatusBadge.jsx` | Possibly extend | May need onboarding-specific status mappings |
| `frontend/src/components/COMPONENT_INVENTORY.md` | Update | Update OnboardingMojo entry to reflect pattern usage |

---

## Change Plan (by area)

### 1. Add Imports (top of file)
Add imports for mojo-pattern components:
```js
import StatusBadge from '@/components/mojo-patterns/StatusBadge';
import MojoHeader from '@/components/mojo-patterns/MojoHeader';
import StatsCardRow from '@/components/mojo-patterns/StatsCardRow';
import FilterTabBar from '@/components/mojo-patterns/FilterTabBar';
```

### 2. Remove STATUS_COLORS constant (lines 31-38)
Delete the `STATUS_COLORS` object. The shared `StatusBadge` from mojo-patterns uses
`var(--sm-status-*)` tokens.

### 3. Remove local StatusBadge component (lines 43-49)
Delete the local `StatusBadge` function. Replace all usages with the imported version.

**Mapping challenge:** The shared StatusBadge uses a `{ variant, value }` API, not a
`{ status }` API. The onboarding statuses ("New", "Paperwork Pending", "Insurance Pending",
"Verified", "Ready", "Cancelled") don't all exist in the shared StatusBadge's STATUS_COLORS.

**Decision:** Add onboarding-specific status entries to the shared StatusBadge's STATUS_COLORS
map, using semantic tokens:
- `'Paperwork Pending'` → `var(--sm-warning)` (pending state)
- `'Insurance Pending'` → `var(--sm-warning)` (pending state)
- `'Verified'` → `var(--sm-info)` or `var(--sm-primary)` (confirmed intermediate)
- `'Ready'` → `var(--sm-status-completed)` (green, done)
- `'Cancelled'` → `var(--sm-status-canceled)` (existing)
- `'New'` → `var(--sm-status-new)` (existing)

Then replace `<StatusBadge status={x} />` → `<StatusBadge variant="status" value={x} />`.

### 4. Replace Header (lines 1404-1429)
Current: Hand-rolled div with `UserCheck` icon, title, view buttons, refresh button.
Replace with:
```jsx
<MojoHeader
  icon={<UserCheck className="w-5 h-5" />}
  title="Onboarding"
  actions={/* view tabs + refresh button */}
/>
```
The view tab bar (queue/tasks/history) goes in the `actions` slot.

### 5. Replace KPI Cards (lines 1442-1465)
Current: 4 × `<KpiCard>` with `bg-teal-100 text-teal-700` etc.
Replace with `<StatsCardRow>`:
```jsx
<StatsCardRow cards={[
  { label: 'Active Queue', value: activeQueue, icon: <UserCheck />, color: 'primary', active: filter === 'all', onClick: () => setFilter('all') },
  { label: 'Urgent', value: urgentCount, icon: <AlertTriangle />, color: 'danger', active: filter === 'urgent', onClick: () => setFilter('urgent') },
  { label: 'Pending Insurance', value: insurancePending, icon: <Shield />, color: 'warning', active: filter === 'insurance', onClick: () => setFilter('insurance') },
  { label: 'Ready', value: readyThisWeek, icon: <CheckCircle2 />, color: 'green', active: filter === 'ready', onClick: () => setFilter('ready') },
]} />
```
**Note:** StatsCardRow's COLOR_MAP has `primary`, `danger`, `warning`, `green` keys.
Remove the local `KpiCard` component (lines 155-173) after replacement.

### 6. Replace Filter Chips (lines 1468-1488)
Current: Hand-rolled filter buttons with `bg-teal-600 text-white` active state.
Replace with `<FilterTabBar>`:
```jsx
<FilterTabBar
  tabs={[...]}
  activeTab={filter}
  onTabChange={setFilter}
  rightContent={/* search input + add client button */}
/>
```

### 7. Replace Teal Tailwind Classes Throughout
All `bg-teal-*`, `text-teal-*`, `border-teal-*`, `ring-teal-*` references (~30 occurrences)
must be replaced with `var(--sm-primary)` token equivalents:
- `bg-teal-600` → `bg-[var(--sm-primary)]`
- `text-teal-600` → `text-[var(--sm-primary)]`
- `bg-teal-100 text-teal-700` → token-based with `color-mix`
- `bg-teal-50` → `bg-[var(--sm-glass-primary)]` or similar
- `ring-teal-200` → `ring-[color-mix(in_srgb,var(--sm-primary)_20%,transparent)]`
- `border-teal-500` → `border-[var(--sm-primary)]`
- `focus:border-teal-400` → `focus:border-[var(--sm-primary)]`

### 8. Replace Other Hardcoded Color Classes
- `bg-amber-100 text-amber-800` (STATUS_COLORS) → removed with StatusBadge swap
- `bg-amber-500` (progress bars, lines 86, 102) → `bg-[var(--sm-warning)]`
- `bg-purple-500` (METHOD_COLORS line 771) → `bg-[var(--sm-info)]` or similar token
- `bg-emerald-500/600` (progress complete, toast success) → `bg-[var(--sm-success)]` (need to verify token exists)
- `bg-red-600` (toast error, cancel button) → `bg-[var(--sm-danger)]`
- `bg-blue-500/600` (progress mid, toast info) → `bg-[var(--sm-info)]` or `bg-[var(--sm-primary)]`
- `bg-orange-100` (STATUS_COLORS) → removed with StatusBadge swap
- `bg-[#FF6F61]` (line 1503 Add Client button) → `bg-[var(--sm-danger)]` (coral = danger)
- `hover:bg-[#e5635a]` (line 1503) → remove, use opacity or darker mix
- `text-red-500`, `text-amber-500` (AppointmentDate) → `text-[var(--sm-danger)]`, `text-[var(--sm-warning)]`

### 9. Remove Local Components Made Redundant
After swapping to shared patterns, remove:
- `StatusBadge` (local, lines 43-49)
- `KpiCard` (lines 155-173)
- `STATUS_COLORS` (lines 31-38)

Keep these local components (no shared equivalent / too specialized):
- `AnimatedProgressBar` / `ProgressBar` (no shared equivalent)
- `Skeleton`, `Toast` (utility, no shared match)
- `AppointmentDate`, `StageIndicator` (domain-specific)
- `SortHeader` (table-specific)

---

## Tokens to Verify Exist in tokens.css

Before building, check `tokens.css` for these tokens used in the refactor:
- `--sm-primary` ✅ (confirmed in DS-002)
- `--sm-danger` ✅ (confirmed in DS-002)
- `--sm-warning` ✅ (confirmed in DS-002)
- `--sm-success` — need to verify
- `--sm-info` — need to verify
- `--sm-glass-primary` — need to verify
- `--sm-status-new`, `--sm-status-completed`, `--sm-status-canceled` — check shared StatusBadge

---

## Gates

1. `grep -n "STATUS_COLORS" frontend/src/pages/OnboardingMojo.jsx` → 0 matches
2. `grep -n "bg-amber\|bg-purple\|bg-yellow" frontend/src/pages/OnboardingMojo.jsx` → 0 matches
3. `grep -n "from '@/components/mojo-patterns" frontend/src/pages/OnboardingMojo.jsx` → ≥4 matches
4. `cd frontend && pnpm run build` → exit 0
5. Visual: status badges use SM token colors, filter tabs and stats row render correctly

---

## Risk Assessment

- **Low risk** — purely visual layer swap, no functional changes
- **Moderate complexity** — 30+ teal references, 8 color class patterns to replace
- The StatusBadge shared component may need onboarding-specific status entries
- All changes in a single file except possible StatusBadge.jsx extension
- 1655 line file — careful not to break any of the modal/drawer/form logic

---

## Commit Message

`refactor(onboarding): replace inline colors with design system mojo-patterns`
