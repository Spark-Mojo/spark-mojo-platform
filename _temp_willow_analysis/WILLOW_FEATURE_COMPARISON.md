# Willow Center Ops → Spark Mojo Platform: Feature Comparison Analysis

**Date:** March 23, 2026
**Analyst:** Claude Code (Session willow-feature-comparison)
**Source:** Complete code review of both codebases

---

## Executive Summary

Willow Center Ops (willow-center-ops) is a **production React app** with 28 components,
a Google Sheets data layer, and Google OAuth. It covers **6 operational modules** with
real CRUD, drag-and-drop, charting, and file upload.

Spark Mojo Platform has a working **Onboarding Mojo POC** (1 of 6 modules), a functional
**abstraction layer** (FastAPI), and a complete **desktop paradigm** (canvas + widgets).
The Frappe apps are empty scaffolds.

**Bottom line:** The POC proves the architecture works. But the Willow app has grown
significantly beyond what the POC covers. Porting requires building out 5 additional
modules, replacing Google Sheets with Frappe DocTypes, and migrating Google OAuth to
Frappe session auth.

---

## Module-by-Module Comparison

### Legend
- ✅ = Exists and functional in Spark Mojo Platform
- 🟡 = Partially built or scaffolded
- ❌ = Not yet built
- N/A = Not applicable (architectural difference)

---

## 1. ONBOARDING MODULE

| Feature | Willow (Google Sheets) | Spark Mojo (Frappe) | Gap |
|---------|----------------------|--------------------|----|
| **Queue View** — sortable client table | ✅ Full: 7 columns, all sortable, urgent-first default | ✅ Built in OnboardingMojo.jsx | Spark version lacks column sorting UI (status filter only) |
| **KPI Cards** — Active, Urgent, Pending Ins, Appts This Week | ✅ 4 cards, clickable to filter | ✅ 5 cards (New, Paperwork, Insurance, Verified, Ready) | Different KPI breakdown — Spark uses status counts, Willow uses operational counts. Spark missing "Appts This Week" |
| **Filter Chips** — All/Urgent/Pending/Needs Paperwork/Ready | ✅ Full chip bar | ✅ Status filter buttons | Equivalent |
| **Search** — client name + clinician real-time filter | ✅ Both fields | ✅ Client name search | ❌ Spark missing clinician search |
| **Client Drawer** — slide-in detail panel | ✅ 5 tabs: Checklist, Outreach, Notes, Details, Edit | ✅ 4 tabs: Checklist, Details, Timeline, Notes | ❌ Spark missing Edit tab |
| **Animated Progress Bar** — 0→actual with easing | ✅ Full: 600ms ease-out, count-up number, re-triggers on toggle | ✅ Basic progress display | ❌ Spark missing animation, count-up, re-trigger |
| **Stage Indicator** — Scheduled→Paperwork→Insurance→Verified→Ready | ✅ 5-stage dots with done/current/future styling | ❌ Not built | ❌ Gap |
| **Checklist Tab** — toggle items, conditional visibility | ✅ 7 items, self-pay/minor logic, Required/Optional badges | ✅ Toggles with optimistic updates | 🟡 Spark has toggle but may lack conditional visibility (self-pay hides insurance items, minor shows custody) |
| **Outreach Tab** — timeline + log form | ✅ Full: combined inline (5 slots) + extended log, configurable methods | ✅ Timeline + inline form | 🟡 Spark logs to Frappe outreach child table. Willow has dual-write (inline cols + Outreach_Log tab) |
| **Notes Tab** — threaded display + append | ✅ Parsed format `[INITIALS] DATE: TEXT`, newest first | ✅ Auto-saving notes field | 🟡 Spark uses single text field with debounce. Willow has structured threaded display |
| **Details Tab** — client info + SP sync | ✅ DOB, employer, insurance, member ID, clinician history, SP toggles | ✅ Editable fields for core client data | ❌ Spark missing clinician history and SP sync toggles |
| **Edit Tab** — bulk field editing | ✅ 9 editable fields, change tracking, save-on-diff | ❌ Not built (Details tab handles some edits) | ❌ Gap — Spark combines view+edit in Details tab |
| **Kanban View** — drag-and-drop board | ✅ 4 columns (Paperwork, Insurance, Ready, Urgent), @dnd-kit, boolean field updates on drag | ❌ Not built | ❌ Major gap |
| **My Tasks View** — auto-generated tasks | ✅ 4 task types auto-generated from client data, staff filter, clinician filter, grouped by overdue/today/upcoming | ✅ Basic grouped task list | 🟡 Spark has My Tasks but task generation is hardcoded to "JI" staff. Willow generates dynamically per staff |
| **Add Client Modal** — new client form | ✅ 8 fields, self-pay checkbox, staff dropdown, validation | ❌ Not built | ❌ Gap |
| **Historical View** — completed + archived clients | ✅ Year filter, status filter, clinician filter, search, reactivate button | ❌ Not built | ❌ Gap |
| **Archive Flow** — move to cancellation with reason | ✅ 6 preset reasons + Other, moves row between tabs | ❌ Not built | ❌ Gap |
| **Reactivate Flow** — restore archived client | ✅ Confirmation modal, restores from Cancellation tab | ❌ Not built | ❌ Gap |
| **Complete Flow** — move to completed on all-done | ✅ Moves row to Completed tab | ❌ Not built | ❌ Gap |
| **Outreach Popover** — quick log from queue row | ✅ Context menu with method buttons + notes | ❌ Not built (must open drawer) | ❌ Gap |
| **Age-18 Banner** — minor approaching 18 | ✅ Amber banner in drawer, configurable threshold | ❌ Not built | ❌ Gap |
| **Urgency Dot** — visual indicator per row | ✅ Red dot + red name text for urgent clients | ✅ Urgency level color coding | Equivalent |
| **Appt Date Color** — red ≤2 days, amber ≤7 | ✅ IBM Plex Mono, 3-tier color | ❌ Not implemented | ❌ Gap |

**Onboarding Summary:** Spark has ~40% of Willow's onboarding features. Core list+drawer works.
Missing: Kanban, Add Client, Historical, Archive/Reactivate, Edit tab, stage indicator, animations.

---

## 2. BILLING / REVENUE CYCLE MODULE

| Feature | Willow | Spark Mojo | Gap |
|---------|--------|-----------|-----|
| **AR Dashboard** — aging analysis with charts | ✅ 4 KPIs, aging bar chart (recharts), filter bar, claim table | ❌ Not built | ❌ Major gap |
| **AR Aging Chart** — bar visualization | ✅ 5 buckets (0-30 through 120+), color-coded | ❌ | ❌ |
| **Claim Table** — sortable, filterable | ✅ 10 columns, 4 filters (clinician, insurance, client status, insurance status), date range | ❌ | ❌ |
| **Claim Drawer** — detail + actions | ✅ Status management, outreach timeline, 5 action buttons (Mark Submitted, Add Note, Resubmit, Write Off, Block) | ❌ | ❌ |
| **Unbilled Worklist** — claims needing submission | ✅ 2 KPIs, clinician/payer filters, card grid, claim drawer integration | ❌ | ❌ |
| **Client Balance Worklist** — collections | ✅ Client cards, nested drawer, 7 resolution statuses, outreach logging | ❌ | ❌ |
| **Billing Data Service** — parsing + calculations | ✅ parseUnpaidClaims, parseUnbilledClaims, AR aging buckets, KPI calc, multi-filter | ❌ | ❌ |
| **Billing Context** — shared state | ✅ BillingDataProvider with fetch, upload, local updates | ❌ | ❌ |

**Billing Summary:** Spark has 0% of Willow's billing features. This is a complete build-from-scratch.
However, the SM Invoice DocType and billing endpoints are planned in the architecture.

---

## 3. VOICEMAIL MODULE

| Feature | Willow | Spark Mojo | Gap |
|---------|--------|-----------|-----|
| **Voicemail View** — triage dashboard | ✅ 4 KPIs, 4 filters, card grid, drawer integration | ❌ Not built | ❌ |
| **Voicemail Drawer** — detail + status management | ✅ 10 status options, outreach timeline, 4 log methods, notes, staff assignment | ❌ | ❌ |
| **Status Derivation** — from action/forwarded/calledBack fields | ✅ Multi-condition logic in sheets.js | ❌ | ❌ |
| **Sheet Integration** — read/write VM tab | ✅ Full CRUD: read VM tab, update status, log outreach, write notes | ❌ | ❌ |

**Voicemail Summary:** 0% coverage in Spark. Needs DocType design + abstraction layer routes + frontend Mojo.

---

## 4. TASK MANAGEMENT MODULE

| Feature | Willow | Spark Mojo | Gap |
|---------|--------|-----------|-----|
| **Task Board** — Kanban + List views | ✅ Dual view, 9 category tabs, assignee filter, dnd-kit drag | ❌ Not built as standalone | ❌ |
| **Task Form** — create/edit tasks | ✅ 8 fields, category-aware status options, priority levels | ❌ | ❌ |
| **Task Categories** — 9 types | ✅ General, Onboarding, Billing, Claims, Operations, Clinical, Compliance, Voicemail | ❌ | ❌ |
| **Seed Tasks** — diagnostic open questions | ✅ 12 pre-seeded tasks for Willow Center diagnostic | N/A | N/A — Willow-specific content |
| **Task Sheet CRUD** — read/write Tasks tab | ✅ create, update, bulk reassign | ❌ | ❌ |

**Task Summary:** Spark's CLAUDE.md references ERPNext Task (extended), but no Task Mojo UI exists.
The abstraction layer's generic CRUD could handle Task DocType, but the frontend is missing.

---

## 5. REPORTING MODULE

| Feature | Willow | Spark Mojo | Gap |
|---------|--------|-----------|-----|
| **Onboarding Reports** — analytics | ✅ Built (component exists) | ❌ | ❌ |
| **Billing Reports** — revenue analytics | ✅ 5 KPIs, 4 chart types (AR aging, collections rate by payer, revenue by clinician, billing code donut), expandable charts | ❌ | ❌ |

**Reports Summary:** 0% coverage. Requires data aggregation endpoints in abstraction layer + chart components.

---

## 6. ADMIN MODULE

| Feature | Willow | Spark Mojo | Gap |
|---------|--------|-----------|-----|
| **Manage Staff** — CRUD, activate/deactivate | ✅ Table view, add/edit modal, deactivation with auto-task generation, NPI seeding | ❌ | ❌ |
| **Reassign Tasks** — bulk from→to | ✅ Staff dropdowns, preview count, batch update | ❌ | ❌ |
| **Automation Config** — thresholds + methods | ✅ 5 configurable settings, reorderable outreach method list | ❌ | ❌ |
| **Spreadsheet Upload** — file import | ✅ Drag-drop, xlsx validation, tab-specific parsing | N/A | N/A — Frappe has built-in data import |
| **Staff Registry** — Clinician NPIs | ✅ Org info card, NPI table, add/edit, supervisor tracking | ❌ | ❌ |

**Admin Summary:** 0% coverage. Frappe has built-in user/role management, but the Willow-specific
staff workflows (initials mapping, NPI tracking, task reassignment) need custom implementation.

---

## 7. SHELL & NAVIGATION

| Feature | Willow | Spark Mojo | Gap |
|---------|--------|-----------|-----|
| **Sidebar** — module navigation | ✅ Logo, 5 nav items, expandable sections, badges, user footer, logout | ✅ Desktop paradigm (no sidebar — uses taskbar + widget launcher) | Architectural difference — Spark uses desktop metaphor instead of sidebar nav |
| **Top Bar** — context controls | ✅ Route-aware title, view switcher, search, add client | ✅ Part of Desktop.jsx (each Mojo has its own header) | Different pattern — each Mojo manages its own header |
| **Toast Notifications** — non-blocking feedback | ✅ Success (green border) + Error (red), 3s auto-dismiss | ✅ Available via integrations | Equivalent |
| **Login Page** — Google OAuth | ✅ Logo animation, botanical particles, Google sign-in | ✅ Frappe session login form | Different auth — Frappe cookie vs Google OAuth |

**Shell Summary:** Fundamentally different UI paradigm. Willow = sidebar+page layout.
Spark = desktop canvas with draggable windows. This is intentional and correct per architecture.

---

## 8. DATA LAYER COMPARISON

| Aspect | Willow | Spark Mojo | Migration Notes |
|--------|--------|-----------|-----------------|
| **Data store** | Google Sheets API v4 | Frappe/ERPNext DocTypes | Complete rewrite of data layer |
| **Auth** | Google OAuth 2.0 access token | Frappe session cookie | Different mechanism, both session-based |
| **Client record** | Row in "Need to Check" tab, 29+ columns | SM Client DocType (10 new fields added in POC) | Field mapping doc exists (WILLOW_FIELD_MAPPING.md) |
| **Outreach** | Inline columns (5 slots) + Outreach_Log tab | SM Outreach Attempt child table | Cleaner in Frappe — single child table |
| **Tasks** | Tasks tab in Google Sheet | ERPNext Task (extended with SM custom fields) | ERPNext Task is more powerful (linking, workflows) |
| **Billing** | Separate billing spreadsheet, multi-tab | SM Invoice (Sales Invoice custom fields) | Needs n8n SP export → Frappe sync workflow |
| **Voicemail** | VM tab in onboarding sheet | No DocType designed yet | ❌ Needs SM Voicemail DocType design |
| **Staff** | Staff tab in sheet | Frappe User + custom fields | Can leverage Frappe User management |
| **Config** | Config tab (key/value pairs) | SM Tenant Config DocType | Designed but not built |
| **Audit log** | Audit_Log tab in sheet | Frappe has built-in audit trail | Frappe handles this natively |
| **Status** | Derived from booleans (never stored) | Derived server-side in abstraction layer | Same pattern, different location |
| **Realtime** | Manual refresh only | Could add Frappe socketio | Upgrade opportunity |

---

## 9. MISSING DOCTYPE DESIGNS

These Willow features need DocType designs before they can be ported:

| DocType Needed | Source Feature | Priority |
|---------------|---------------|----------|
| SM Voicemail | Voicemail View + Drawer | High — active module |
| SM Billing Claim (or extend SM Invoice) | AR Dashboard, Unbilled/Collections worklists | High — revenue module |
| SM Task extensions | Task Board categories, auto-generation rules | Medium — ERPNext Task exists |
| SM Staff (or extend User) | Staff registry, NPI tracking, initials mapping | Medium — needed for all modules |
| SM Outreach Method | Configurable outreach methods | Low — could be SM Tenant Config child table |
| SM Archive Record | Archive reasons, reactivation history | Low — could be fields on SM Client |

---

## 10. WHAT SPARK MOJO HAS THAT WILLOW DOESN'T

| Feature | Spark Mojo | Willow | Notes |
|---------|-----------|--------|-------|
| **Desktop paradigm** — draggable/resizable windows | ✅ Full canvas with minimize, maximize, folders | ❌ Traditional sidebar+page | Spark's differentiator |
| **Multi-tenant architecture** | ✅ Site-per-client, SM Tenant Config | ❌ Single-tenant | Platform advantage |
| **Abstraction layer** | ✅ FastAPI middleware, connector registry | ❌ Direct Google Sheets calls | Spark has proper separation |
| **Multiple backend connectors** | ✅ Scaffolded: Frappe, SimplePractice, Valant, Plane | ❌ Google Sheets only | Future-proof |
| **Utility widgets** | ✅ 11 widgets (clock, calculator, notes, weather, etc.) | ❌ | Desktop UX enhancement |
| **Mojo registration system** | ✅ Dynamic from API, Desktop.jsx auto-loads | ❌ | Plugin architecture |
| **Frappe native auth** | ✅ Session cookie, role-based | ❌ Google OAuth only | Enterprise-grade |

---

## 11. EFFORT ESTIMATE (T-Shirt Sizing)

| Work Item | Size | Notes |
|-----------|------|-------|
| Complete Onboarding Mojo (missing features) | **L** | Kanban, Add Client, Historical, Archive, Edit tab, animations |
| Build Billing Mojo from scratch | **XL** | AR Dashboard, 2 worklists, claim drawer, charts, data service |
| Build Voicemail Mojo | **L** | DocType design + triage view + drawer + status management |
| Build Task Mojo | **M** | ERPNext Task exists, need Kanban UI + category system |
| Build Admin screens | **M** | Staff mgmt, config, reassign — can leverage Frappe admin |
| Build Reports Mojo | **L** | 2 report views with 4+ chart types each |
| Build Staff Registry | **S** | NPI table + CRUD — straightforward |
| Build missing Frappe DocTypes | **L** | SM Voicemail, billing extensions, staff extensions |
| Wire n8n billing sync | **M** | SP export → Frappe Sales Invoice pipeline |
| Port design system (colors, fonts, animations) | **S** | CSS variables already in Willow, map to SM tokens |

**Total estimated effort:** ~6-8 weeks of focused development to reach feature parity.

---

## 12. RECOMMENDED MIGRATION ORDER

1. **Complete Onboarding Mojo** — Highest ROI, POC already proves the pattern
2. **Build missing Frappe DocTypes** — Unblocks everything else
3. **Build Admin screens** — Staff/Config needed by all modules
4. **Build Task Mojo** — Cross-cutting, used by all modules
5. **Build Billing Mojo** — Revenue-critical, most complex
6. **Build Voicemail Mojo** — Independent module, can parallelize
7. **Build Reports** — Last, after data flows are stable
8. **Wire n8n integrations** — Can happen in parallel with UI work

---

## 13. KEY ARCHITECTURAL DIFFERENCES TO PRESERVE

When porting Willow features to Spark Mojo, these differences are **intentional and must be maintained:**

1. **Desktop paradigm** — Don't recreate Willow's sidebar+page layout. Each module becomes a Mojo window.
2. **Abstraction layer** — All Frappe calls go through `/api/modules/`. Never call Frappe directly from React.
3. **Multi-tenant** — Tenant branding via CSS variables. No hardcoded Willow colors.
4. **Session auth** — Frappe cookies, not Google OAuth. No signUp() function.
5. **Status derivation** — Server-side in abstraction layer, not client-side.

---

*Analysis complete — March 23, 2026*
*Source: Full code review of willow-center-ops (28 components, 52 JS/JSX files) + spark-mojo-platform (OnboardingMojo, abstraction layer, Desktop.jsx)*
