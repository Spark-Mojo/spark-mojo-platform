model: model-alpha
test: 01-story-decomposition
run: C
date: 2026-04-09

# STORIES.md

## Knowledge Base Wiki (KB/Wiki Mojo) — Atomic Stories

---

### WIKI-001: SM Wiki Category DocType
**Category:** BACKEND | **Size:** XS  
**Description:** Create the SM Wiki Category DocType with fields for name, parent_category, slug, description, default_visibility, and is_active.  
**Dependencies:** None  
**Spec Gates:**
- Workflow: Serves Category Management workflow - categories organize articles into a 2-level hierarchy.
- CRM Timeline: N/A - categories are internal operational structure, not customer interactions.
- Right Level: Universal - all practices need category organization for documentation.

---

### WIKI-002: SM Article DocType
**Category:** BACKEND | **Size:** S  
**Description:** Create the SM Article DocType with title, slug, body_html, category (link to SM Wiki Category), visibility (internal|client), status (draft|under_review|published|archived), author, reviewer, rejection_notes, and last_published_at fields.  
**Dependencies:** WIKI-001  
**Spec Gates:**
- Workflow: Serves Article Creation, Publishing, and Archiving workflows - the core document record for all wiki operations.
- CRM Timeline: N/A - articles are operational documentation, not direct customer interactions.
- Right Level: Universal - all practices manage internal documentation.

---

### WIKI-003: SM Article Version DocType
**Category:** BACKEND | **Size:** XS  
**Description:** Create the SM Article Version DocType with article_id (link to SM Article), version_number, body_html, saved_by, saved_at, and word_count fields.  
**Dependencies:** WIKI-002  
**Spec Gates:**
- Workflow: Serves Version History workflow - every body save creates a version snapshot for audit and restore.
- CRM Timeline: N/A - version history is operational audit data, not a customer interaction.
- Right Level: Universal - all practices benefit from version control of documentation.

---

### WIKI-004: Category Create and Update APIs
**Category:** BACKEND | **Size:** S  
**Description:** Implement POST /api/modules/wiki/category/create and PUT /api/modules/wiki/category/{id}/update endpoints for admin category management with 2-level depth validation.  
**Dependencies:** WIKI-001  
**Spec Gates:**
- Workflow: Serves Category Management workflow - admins create and maintain category hierarchy.
- CRM Timeline: N/A - category management is internal operational structure.
- Right Level: Universal - category structure is universal across practices.

---

### WIKI-005: Category List API
**Category:** BACKEND | **Size:** XS  
**Description:** Implement GET /api/modules/wiki/categories endpoint returning active categories in tree structure for use by article editors and category browsers.  
**Dependencies:** WIKI-001  
**Spec Gates:**
- Workflow: Serves Category Management and Article Creation workflows - category selection when creating/editing articles.
- CRM Timeline: N/A - reading categories is an internal operational action.
- Right Level: Universal - category browsing is universal.

---

### WIKI-006: Article Create and Read APIs
**Category:** BACKEND | **Size:** S  
**Description:** Implement POST /api/modules/wiki/article/create (saves as Draft initially) and GET /api/modules/wiki/article/{id} endpoints with role-based access control for internal vs. client-facing articles.  
**Dependencies:** WIKI-001, WIKI-002  
**Spec Gates:**
- Workflow: Serves Article Creation workflow - staff creates articles saved initially as Draft.
- CRM Timeline: N/A - creating and reading articles are internal operations.
- Right Level: Universal - all practices need article creation capability.

---

### WIKI-007: Article Update API
**Category:** BACKEND | **Size:** S  
**Description:** Implement PUT /api/modules/wiki/article/{id}/update endpoint that updates article metadata and body, automatically creating a new SM Article Version record on each body save.  
**Dependencies:** WIKI-002, WIKI-003  
**Spec Gates:**
- Workflow: Serves Article Creation (saving drafts) and Version History workflows - updates trigger version snapshots.
- CRM Timeline: N/A - article updates are internal operational actions.
- Right Level: Universal - version-controlled updates are universal.

---

### WIKI-008: Article Submit for Review and Publish APIs
**Category:** BACKEND | **Size:** S  
**Description:** Implement PUT /api/modules/wiki/article/{id}/submit-for-review (Draft→Under Review for client-facing) and PUT /api/modules/wiki/article/{id}/publish (Draft→Published for internal, Under Review→Published for client-facing) endpoints with role-based validation.  
**Dependencies:** WIKI-002  
**Spec Gates:**
- Workflow: Serves Article Publishing (Internal) and Article Publishing (Client-Facing) workflows - state transitions with role checks.
- CRM Timeline: N/A - state transitions are internal workflow steps; CRM activity is triggered separately via n8n.
- Right Level: Universal - publishing workflows are universal.

---

### WIKI-009: Article Reject and Archive APIs
**Category:** BACKEND | **Size:** S  
**Description:** Implement PUT /api/modules/wiki/article/{id}/reject (Under Review→Draft with rejection_notes) and PUT /api/modules/wiki/article/{id}/archive (Published→Archived, admin-only) endpoints.  
**Dependencies:** WIKI-002  
**Spec Gates:**
- Workflow: Serves Article Publishing (Client-Facing) rejection path and Article Archiving workflow.
- CRM Timeline: N/A - these are internal state transitions; notification workflows handle downstream effects.
- Right Level: Universal - rejection and archiving are universal operations.

---

### WIKI-010: Article List API with Filters and Search
**Category:** BACKEND | **Size:** S  
**Description:** Implement GET /api/modules/wiki/articles endpoint with filters for category, visibility, status, and full-text search across title and body; results are role-aware (staff see all accessible, clients see only client-facing published).  
**Dependencies:** WIKI-001, WIKI-002  
**Spec Gates:**
- Workflow: Serves Full-Text Search workflow and Category Management browsing - staff search across all accessible articles.
- CRM Timeline: N/A - searching articles is an internal operational action.
- Right Level: Universal - search and filtering are universal capabilities.

---

### WIKI-011: Article Version History APIs
**Category:** BACKEND | **Size:** S  
**Description:** Implement GET /api/modules/wiki/article/{id}/versions (list version history) and POST /api/modules/wiki/article/{id}/restore/{version_number} (restore creates new version, does not delete history) endpoints.  
**Dependencies:** WIKI-002, WIKI-003  
**Spec Gates:**
- Workflow: Serves Version History workflow - admins view and restore previous article versions.
- CRM Timeline: N/A - version history is operational audit data.
- Right Level: Universal - version history is a universal documentation feature.

---

### WIKI-012: CategoryTree Component
**Category:** FRONTEND | **Size:** S  
**Description:** Build collapsible category hierarchy browser React component (JSX) displaying up to 2-level category tree, used in article editors and portal help sections.  
**Dependencies:** WIKI-005  
**Spec Gates:**
- Workflow: Serves Category Management and Article Creation workflows - provides category selection interface.
- CRM Timeline: N/A - UI component, no CRM interaction.
- Right Level: Universal - category browsing is universal.

---

### WIKI-013: ArticleEditor Component
**Category:** FRONTEND | **Size:** S  
**Description:** Build rich text article editor React component (JSX) with title field, category selector, visibility toggle (internal|client), save/submit controls, and auto-versioning on body save.  
**Dependencies:** WIKI-004, WIKI-005, WIKI-006, WIKI-007, WIKI-008, WIKI-009  
**Spec Gates:**
- Workflow: Serves Article Creation and Article Publishing workflows - primary article authoring interface.
- CRM Timeline: N/A - editor is UI surface, no direct CRM writes.
- Right Level: Universal - article editing is universal.

---

### WIKI-014: ArticleViewer Component
**Category:** FRONTEND | **Size:** S  
**Description:** Build article display React component (JSX) rendering published article body with metadata (last updated, reviewer, version info), used in both staff view and client portal.  
**Dependencies:** WIKI-006  
**Spec Gates:**
- Workflow: Serves Client Portal Surface workflow - displays client-facing published articles to patients.
- CRM Timeline: N/A - read-only display component.
- Right Level: Universal - article viewing is universal.

---

### WIKI-015: ArticleList Component
**Category:** FRONTEND | **Size:** S  
**Description:** Build searchable, filterable article list React component (JSX) with status badges, category filters, and role-aware visibility (staff see drafts, clients see only published client-facing articles).  
**Dependencies:** WIKI-010  
**Spec Gates:**
- Workflow: Serves Full-Text Search and Category Management workflows - primary article discovery interface.
- CRM Timeline: N/A - list component, no CRM interaction.
- Right Level: Universal - article browsing is universal.

---

### WIKI-016: VersionHistoryPanel Component
**Category:** FRONTEND | **Size:** S  
**Description:** Build version history panel React component (JSX) displaying version list with metadata (saved_by, saved_at, word_count) and restore action button for each version.  
**Dependencies:** WIKI-011  
**Spec Gates:**
- Workflow: Serves Version History workflow - admin interface for viewing and restoring article versions.
- CRM Timeline: N/A - version history is operational data.
- Right Level: Universal - version management is universal.

---

### WIKI-017: Author Review Decision Notification Workflow
**Category:** INTEGRATION | **Size:** S  
**Description:** n8n workflow triggered when client-facing article is approved or rejected; sends notification to article author with decision and any rejection comments.  
**Dependencies:** WIKI-008, WIKI-009  
**Spec Gates:**
- Workflow: Serves Article Publishing (Client-Facing) workflow - notifies authors of review outcomes.
- CRM Timeline: N/A - notifications are operational, not customer interactions.
- Right Level: Universal - author notifications are universal.

---

### WIKI-018: Admin Client-Facing Publish Notification Workflow
**Category:** INTEGRATION | **Size:** XS  
**Description:** n8n workflow triggered when any client-facing article is published; sends notification to admin team for QA awareness.  
**Dependencies:** WIKI-008  
**Spec Gates:**
- Workflow: Serves Article Publishing (Client-Facing) workflow - admin QA awareness of published client-facing content.
- CRM Timeline: N/A - internal notification, not a customer interaction.
- Right Level: Universal - QA awareness is universal.

---

### WIKI-019: SOP Mojo Status Change Notification Workflow
**Category:** INTEGRATION | **Size:** S  
**Description:** n8n workflow triggered when client-facing article changes status (published, archived); notifies SOP Mojo via webhook to flag linked SOPs for review; Wiki never calls SOP Mojo directly (boundary rule).  
**Dependencies:** WIKI-008, WIKI-009  
**Spec Gates:**
- Workflow: Serves SOP Connection boundary rule - passive flag to SOP Mojo when client-facing articles change status.
- CRM Timeline: N/A - cross-system notification, not a customer interaction.
- Right Level: Universal - SOP connection is a universal integration boundary.

---

### WIKI-020: First Client-Facing Publish Practice Activity Log
**Category:** INTEGRATION | **Size:** XS  
**Description:** n8n workflow triggered when client-facing article is published for first time; writes practice-level activity log entry to CRM (not client-specific timeline entry).  
**Dependencies:** WIKI-008  
**Spec Gates:**
- Workflow: Serves Article Publishing (Client-Facing) workflow - records first publish milestone.
- CRM Timeline: Writes practice-level activity log entry when client-facing article is published for the first time.
- Right Level: Universal - activity logging is universal.

---

# DEPENDENCY-GRAPH.md

## Build Order and Parallel Execution Groups

```
┌─────────────────────────────────────────────────────────────────────┐
│ GROUP 1 — Foundation DocTypes (Parallel Safe)                       │
│ Can build simultaneously, no cross-dependencies                    │
├─────────────────────────────────────────────────────────────────────┤
│  WIKI-001: SM Wiki Category DocType                                │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│ GROUP 2 — Core Article DocType + Category Read API (Parallel Safe) │
├─────────────────────────────────────────────────────────────────────┤
│  WIKI-002: SM Article DocType          [depends: WIKI-001]        │
│  WIKI-005: Category List API           [depends: WIKI-001]        │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│ GROUP 3 — Version DocType + Core Article APIs (Parallel Safe)      │
├─────────────────────────────────────────────────────────────────────┤
│  WIKI-003: SM Article Version DocType  [depends: WIKI-002]        │
│  WIKI-004: Category Create/Update APIs [depends: WIKI-001]        │
│  WIKI-006: Article Create/Read APIs    [depends: WIKI-001, -002]  │
│  WIKI-010: Article List API            [depends: WIKI-001, -002]  │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│ GROUP 4 — Update, Lifecycle, and Version APIs (Parallel Safe)      │
├─────────────────────────────────────────────────────────────────────┤
│  WIKI-007: Article Update API          [depends: WIKI-002, -003]  │
│  WIKI-008: Article Submit/Publish APIs [depends: WIKI-002]        │
│  WIKI-011: Version History APIs        [depends: WIKI-002, -003]  │
│  WIKI-012: CategoryTree Component      [depends: WIKI-005]        │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│ GROUP 5 — Remaining APIs + Frontend Components (Parallel Safe)     │
├─────────────────────────────────────────────────────────────────────┤
│  WIKI-009: Article Reject/Archive APIs [depends: WIKI-002]        │
│  WIKI-014: ArticleViewer Component     [depends: WIKI-006]        │
│  WIKI-015: ArticleList Component       [depends: WIKI-010]        │
│  WIKI-016: VersionHistoryPanel Comp    [depends: WIKI-011]        │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│ GROUP 6 — ArticleEditor Component (Requires Multiple APIs)          │
├─────────────────────────────────────────────────────────────────────┤
│  WIKI-013: ArticleEditor Component    [depends: -004,-005,-006,  │
│                                        -007,-008,-009]              │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│ GROUP 7 — Integration Workflows (Parallel Safe)                    │
├─────────────────────────────────────────────────────────────────────┤
│  WIKI-017: Author Notification        [depends: WIKI-008, -009]   │
│  WIKI-018: Admin QA Notification       [depends: WIKI-008]        │
│  WIKI-019: SOP Mojo Notification       [depends: WIKI-008, -009] │
│  WIKI-020: Practice Activity Log       [depends: WIKI-008]        │
└─────────────────────────────────────────────────────────────────────┘
```

## Dependency Chain Summary

| Story | Depends On | Blocks |
|-------|------------|--------|
| WIKI-001 | None | WIKI-002, -004, -005, -006, -010 |
| WIKI-002 | WIKI-001 | WIKI-003, -006, -007, -008, -009, -010, -011 |
| WIKI-003 | WIKI-002 | WIKI-007, -011 |
| WIKI-004 | WIKI-001 | WIKI-013 |
| WIKI-005 | WIKI-001 | WIKI-012, -013 |
| WIKI-006 | WIKI-001, -002 | WIKI-013, -014 |
| WIKI-007 | WIKI-002, -003 | WIKI-013 |
| WIKI-008 | WIKI-002 | WIKI-013, -017, -018, -019, -020 |
| WIKI-009 | WIKI-002 | WIKI-013, -017, -019 |
| WIKI-010 | WIKI-001, -002 | WIKI-015 |
| WIKI-011 | WIKI-002, -003 | WIKI-016 |
| WIKI-012 | WIKI-005 | None |
| WIKI-013 | WIKI-004, -005, -006, -007, -008, -009 | None |
| WIKI-014 | WIKI-006 | None |
| WIKI-015 | WIKI-010 | None |
| WIKI-016 | WIKI-011 | None |
| WIKI-017 | WIKI-008, -009 | None |
| WIKI-018 | WIKI-008 | None |
| WIKI-019 | WIKI-008, -009 | None |
| WIKI-020 | WIKI-008 | None |

## Critical Path

```
WIKI-001 → WIKI-002 → WIKI-008 → WIKI-013 (ArticleEditor - longest dependency chain)
                  ↘
                   → WIKI-003 → WIKI-007 ↗
```

**Critical Path Length:** 5 stories (WIKI-001 → WIKI-002 → WIKI-003 → WIKI-007 → WIKI-013)

**Total Stories:** 20  
**Estimated Parallel Groups:** 7  
**Fastest Theoretical Build:** 7 iterations (if all stories within a group complete in same iteration)