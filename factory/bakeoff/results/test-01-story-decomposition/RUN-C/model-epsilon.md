model: model-epsilon
test: 01-story-decomposition
run: C
date: 2026-04-09

# Spark Mojo Story Decomposition — Knowledge Base Wiki

## Analysis

Analyzing the KB Wiki capability for atomic story decomposition:

**DocTypes identified:** SM Article, SM Article Version, SM Wiki Category (can be grouped)

**Endpoints identified (13 total):**
- Article: create, get, update, submit-for-review, publish, reject, archive (7)
- Version: list versions, restore (2)
- Category: create, update, list (3)
- List/search: 1

**Frontend components identified:** ArticleEditor, ArticleViewer, ArticleList, CategoryTree, VersionHistoryPanel (5)

**n8n integrations identified:** 3 (author notifications, admin notifications, SOP Mojo notifications)

**Applying SPLIT rules:**
- Backend endpoints → grouped by workflow domain (4 stories)
- DocTypes → combined into foundation story (1 story)
- Frontend → 5 components → split into individual stories (5 stories)
- n8n workflows → 3 separate workflows → 3 stories
- CRM activity log for first publish → embedded in publish workflow (not separate)

---

```markdown
# STORIES.md — Knowledge Base Wiki

## Story Index

| ID | Title | Category | Size | Dependencies |
|----|-------|----------|------|--------------|
| WIKI-001 | Wiki DocTypes Foundation | BACKEND | S | None |
| WIKI-002 | Article CRUD Abstraction Layer | BACKEND | S | WIKI-001 |
| WIKI-003 | Article Workflow Actions | BACKEND | S | WIKI-001 |
| WIKI-004 | Version Management | BACKEND | S | WIKI-001 |
| WIKI-005 | Category Management | BACKEND | S | WIKI-001 |
| WIKI-006 | ArticleEditor Component | FRONTEND | S | WIKI-002, WIKI-003 |
| WIKI-007 | ArticleViewer Component | FRONTEND | S | WIKI-002 |
| WIKI-008 | ArticleList Component | FRONTEND | S | WIKI-002 |
| WIKI-009 | CategoryTree Component | FRONTEND | S | WIKI-005 |
| WIKI-010 | VersionHistoryPanel Component | FRONTEND | S | WIKI-004 |
| WIKI-011 | Author Notification Workflow | INTEGRATION | S | WIKI-003 |
| WIKI-012 | Admin Notification Workflow | INTEGRATION | S | WIKI-003 |
| WIKI-013 | SOP Mojo Status Notification | INTEGRATION | S | WIKI-003 |

---

## WIKI-001: Wiki DocTypes Foundation

**Story ID:** WIKI-001  
**Title:** Wiki DocTypes Foundation  
**Category:** BACKEND  
**Size:** S

**One-sentence description:** Create the three DocType schemas for SM Article, SM Article Version, and SM Wiki Category.

**Dependencies:** None

**Spec Gates:**
- **Workflow:** Foundation for all wiki workflows. DocTypes define the data structure for articles, version snapshots, and category hierarchy.
- **CRM Timeline:** N/A — DocType definitions do not write to CRM timeline. CRM activity is handled at the workflow level (see WIKI-003 publish action).
- **Right Level:** Universal — DocTypes apply to all verticals. Category visibility and article status are configurable per practice.

---

## WIKI-002: Article CRUD Abstraction Layer

**Story ID:** WIKI-002  
**Title:** Article CRUD Abstraction Layer  
**Category:** BACKEND  
**Size:** S

**One-sentence description:** Implement article create, read, update, and list/search endpoints with role-aware filtering and version snapshot creation on body save.

**Dependencies:** WIKI-001

**Spec Gates:**
- **Workflow:** Supports Article Creation workflow (POST create), Article Viewing (GET by ID), Article Editing (PUT update), and Full-Text Search (GET list with filters).
- **CRM Timeline:** N/A — Individual article CRUD operations do not write to CRM timeline. First publish triggers activity log (handled in WIKI-003).
- **Right Level:** Universal — All endpoints work for any vertical. Search is role-aware (staff see internal, clients see client-facing published only).

---

## WIKI-003: Article Workflow Actions

**Story ID:** WIKI-003  
**Title:** Article Workflow Actions  
**Category:** BACKEND  
**Size:** S

**One-sentence description:** Implement submit-for-review, publish, reject, and archive endpoints with proper status transitions and rejection note storage.

**Dependencies:** WIKI-001

**Spec Gates:**
- **Workflow:** Core workflow controller. Internal articles: Draft → Published directly. Client-facing articles: Draft → Under Review → Published (or back to Draft with rejection_notes). Published → Archived.
- **CRM Timeline:** Write practice-level activity log entry ONLY on first-time publish of a client-facing article. Subsequent status changes do not write to CRM.
- **Right Level:** Universal — Status transitions apply universally. Visibility setting (internal/client) determines workflow path.

---

## WIKI-004: Version Management

**Story ID:** WIKI-004  
**Title:** Version Management  
**Category:** BACKEND  
**Size:** S

**One-sentence description:** Implement version history listing and restore endpoints. Restore creates a new version (does not delete history).

**Dependencies:** WIKI-001

**Spec Gates:**
- **Workflow:** Supports Version History workflow. GET returns all snapshots for an article. POST restore copies the selected version's body_html to a new version entry.
- **CRM Timeline:** N/A — Version operations are internal maintenance, not customer-facing events.
- **Right Level:** Universal — Version management applies to all articles regardless of vertical.

---

## WIKI-005: Category Management

**Story ID:** WIKI-005  
**Title:** Category Management  
**Category:** BACKEND  
**Size:** S

**One-sentence description:** Implement category CRUD endpoints with 2-level hierarchy support (parent_category) and default_visibility inheritance.

**Dependencies:** WIKI-001

**Spec Gates:**
- **Workflow:** Supports Category Management workflow. Admin creates/edits category hierarchy. Articles inherit default_visibility but can override.
- **CRM Timeline:** N/A — Category management is administrative, not customer-interaction related.
- **Right Level:** Universal — Category hierarchy structure applies to all verticals. Category names are practice-configurable.

---

## WIKI-006: ArticleEditor Component

**Story ID:** WIKI-006  
**Title:** ArticleEditor Component  
**Category:** FRONTEND  
**Size:** S

**One-sentence description:** Build rich text editor with title, body, category selector, visibility toggle, and save/submit controls.

**Dependencies:** WIKI-002, WIKI-003

**Spec Gates:**
- **Workflow:** Supports Article Creation and editing. Author enters title, rich text body, selects category and visibility (internal/client), saves as Draft or submits for review.
- **CRM Timeline:** N/A — Component renders UI only. CRM writes handled by backend endpoints.
- **Right Level:** Universal — Editor applies to all verticals. Category options are populated from WIKI-005 data.

---

## WIKI-007: ArticleViewer Component

**Story ID:** WIKI-007  
**Title:** ArticleViewer Component  
**Category:** FRONTEND  
**Size:** S

**One-sentence description:** Build read-only article renderer with metadata display (last updated, reviewer, version info).

**Dependencies:** WIKI-002

**Spec Gates:**
- **Workflow:** Supports article consumption. Staff and clients view published articles with metadata. Clients access via patient portal Help section.
- **CRM Timeline:** N/A — Component renders read-only content. No data writes.
- **Right Level:** Universal — Viewer works for all verticals. Metadata display adapts based on visibility (clients see less metadata than staff).

---

## WIKI-008: ArticleList Component

**Story ID:** WIKI-008  
**Title:** ArticleList Component  
**Category:** FRONTEND  
**Size:** S

**One-sentence description:** Build filterable article list with search, category filter, status badges, and role-aware visibility.

**Dependencies:** WIKI-002

**Spec Gates:**
- **Workflow:** Supports Full-Text Search and category browsing. Staff see filtered list based on role permissions. Archived articles excluded from list.
- **CRM Timeline:** N/A — Component is display-only. Search/filter logic calls WIKI-002 endpoints.
- **Right Level:** Universal — List component applies to all verticals. Filters adapt to available categories and statuses.

---

## WIKI-009: CategoryTree Component

**Story ID:** WIKI-009  
**Title:** CategoryTree Component  
**Category:** FRONTEND  
**Size:** S

**One-sentence description:** Build collapsible category hierarchy browser for category selection and navigation.

**Dependencies:** WIKI-005

**Spec Gates:**
- **Workflow:** Supports Category browsing and selection. Admin manages hierarchy via this component. Staff/clients browse for navigation.
- **CRM Timeline:** N/A — Component renders hierarchy only. No data mutations.
- **Right Level:** Universal — Category tree structure applies to all verticals.

---

## WIKI-010: VersionHistoryPanel Component

**Story ID:** WIKI-010  
**Title:** VersionHistoryPanel Component  
**Category:** FRONTEND  
**Size:** S

**One-sentence description:** Build version history panel with version list, timestamps, word count, and restore button.

**Dependencies:** WIKI-004

**Spec Gates:**
- **Workflow:** Supports Version History workflow. Admin views all snapshots, sees word count changes, and triggers restore action.
- **CRM Timeline:** N/A — Component is display and action trigger only. Restore action calls WIKI-004 endpoint.
- **Right Level:** Universal — Version panel applies to all verticals.

---

## WIKI-011: Author Notification Workflow

**Story ID:** WIKI-011  
**Title:** Author Notification Workflow  
**Category:** INTEGRATION  
**Size:** S

**One-sentence description:** Build n8n workflow to notify article author when client-facing article is approved (published) or rejected (returned to Draft with comments).

**Dependencies:** WIKI-003

**Spec Gates:**
- **Workflow:** Supports approval/rejection notification. Triggered by publish and reject endpoints. Extracts author email, article title, and rejection_notes (if any). Sends notification.
- **CRM Timeline:** N/A — Notification workflow handles external communication only. Does not write to CRM.
- **Right Level:** Universal — Notification applies to all practice staff using the wiki.

---

## WIKI-012: Admin Notification Workflow

**Story ID:** WIKI-012  
**Title:** Admin Notification Workflow  
**Category:** INTEGRATION  
**Size:** S

**One-sentence description:** Build n8n workflow to notify admin when any client-facing article is published (QA awareness).

**Dependencies:** WIKI-003

**Spec Gates:**
- **Workflow:** Supports QA awareness. Triggered on client-facing article publish. Alerts admin to review newly published content.
- **CRM Timeline:** N/A — Notification is outbound only. Admin awareness is operational, not CRM-tracked.
- **Right Level:** Universal — Notification applies to all practices with wiki enabled.

---

## WIKI-013: SOP Mojo Status Notification

**Story ID:** WIKI-013  
**Title:** SOP Mojo Status Notification  
**Category:** INTEGRATION  
**Size:** S

**One-sentence description:** Build n8n workflow to notify SOP Mojo when a client-facing article changes status (passive flag, no write-back to Wiki).

**Dependencies:** WIKI-003

**Spec Gates:**
- **Workflow:** Supports SOP-Wiki boundary rule. Wiki never calls SOP Mojo directly. n8n receives status change event and passes to SOP Mojo for flagging linked SOPs.
- **CRM Timeline:** N/A — This is cross-system notification, not CRM activity logging.
- **Right Level:** Universal — Notification applies when SOP Mojo is also enabled. SOP Mojo owns the relationship; Wiki is the passive notifier.

---

# DEPENDENCY-GRAPH.md — Knowledge Base Wiki Build Order

## Build Groups

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ PARALLEL GROUP 1 (Foundation - No Dependencies)                            │
├─────────────────────────────────────────────────────────────────────────────┤
│ WIKI-001: Wiki DocTypes Foundation                                          │
│   - SM Article DocType                                                      │
│   - SM Article Version DocType                                             │
│   - SM Wiki Category DocType                                                │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    ▼               ▼               ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ PARALLEL GROUP 2 (Backend Core - After WIKI-001)                           │
├─────────────────────────────────────────────────────────────────────────────┤
│ WIKI-002: Article CRUD Abstraction Layer                                   │
│ WIKI-003: Article Workflow Actions                                         │
│ WIKI-004: Version Management                                                │
│ WIKI-005: Category Management                                               │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┼───────────────┬───────────────┐
                    ▼               ▼               ▼               ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ PARALLEL GROUP 3A (Frontend - After WIKI-002, WIKI-003)                    │
├─────────────────────────────────────────────────────────────────────────────┤
│ WIKI-006: ArticleEditor Component                                          │
│ WIKI-007: ArticleViewer Component                                          │
│ WIKI-008: ArticleList Component                                             │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ PARALLEL GROUP 3B (Frontend - After WIKI-004)                              │
├─────────────────────────────────────────────────────────────────────────────┤
│ WIKI-010: VersionHistoryPanel Component                                     │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ PARALLEL GROUP 3C (Frontend - After WIKI-005)                              │
├─────────────────────────────────────────────────────────────────────────────┤
│ WIKI-009: CategoryTree Component                                            │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ PARALLEL GROUP 4 (Integrations - After WIKI-003)                           │
├─────────────────────────────────────────────────────────────────────────────┤
│ WIKI-011: Author Notification Workflow                                      │
│ WIKI-012: Admin Notification Workflow                                        │
│ WIKI-013: SOP Mojo Status Notification                                      │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Build Order Summary

| Phase | Stories | Build Reason |
|-------|---------|--------------|
| **1** | WIKI-001 | Foundation — all other stories depend on DocTypes |
| **2** | WIKI-002, WIKI-003, WIKI-004, WIKI-005 | Core backend — can build in parallel after DocTypes exist |
| **3A** | WIKI-006, WIKI-007, WIKI-008 | Frontend components consuming Article endpoints |
| **3B** | WIKI-010 | Frontend component consuming Version endpoints |
| **3C** | WIKI-009 | Frontend component consuming Category endpoints |
| **4** | WIKI-011, WIKI-012, WIKI-013 | n8n workflows — build after workflow endpoints stabilize |

## Parallel Execution Guidance

- **Group 1 → Group 2**: Sequential (2 → 5 weeks of build iterations)
- **Groups 3A, 3B, 3C**: Can run in parallel with each other (3 → 3 weeks)
- **Group 4**: Can run in parallel with Group 3 (3 weeks)
- **Total estimated parallel path**: ~8-10 weeks from kickoff to complete

## Boundary Notes

- **WIKI-011/012/013** (n8n) trigger on backend status changes. Build backend first to define webhook payload shapes.
- **Frontend/Backend split** is clean — each component calls MAL endpoints, no direct Frappe coupling.
- **CRM activity log** for first publish is embedded in WIKI-003 backend logic, not a separate story.
- **SOP Connection boundary** is enforced: Wiki never calls SOP Mojo directly. n8n acts as the bridge.

---

## Testability Notes

| Story | Test Boundary | Mock Strategy |
|-------|---------------|---------------|
| WIKI-001 | DocType creation | Schema validation only, no API calls |
| WIKI-002 | MAL endpoints | Mock Frappe responses |
| WIKI-003 | Status transitions | Mock DocType, verify state machine rules |
| WIKI-004 | Version logic | Mock snapshots, verify new version creation |
| WIKI-005 | Category hierarchy | Mock parent/child relationships |
| WIKI-006 to WIKI-010 | React components | Mock API responses, test render/behavior |
| WIKI-011 to WIKI-013 | n8n workflows | Mock trigger payloads, verify notification routing |
```

---

## Summary

| Category | Story Count | Total Size |
|----------|-------------|------------|
| BACKEND | 5 | 5S |
| FRONTEND | 5 | 5S |
| INTEGRATION | 3 | 3S |
| **Total** | **13** | **13S** |

**Atomic breakdown:**
- 13 stories (1 DocType story, 4 API stories, 5 component stories, 3 n8n stories)
- All stories are size S (completable in 3-8 iterations)
- All stories are independently testable
- Split applied: backend/frontend separated, n8n workflows isolated, components individual