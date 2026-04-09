model: model-beta
test: 01-story-decomposition
run: C
date: 2026-04-09

# STORIES.md

```markdown
# Knowledge Base Wiki (KB/Wiki Mojo) — Story Decomposition

**Capability:** Knowledge Base Wiki
**Vertical:** Universal (all verticals)
**Total Stories:** 21
**Generated:** 2026-04-09

---

## WIKI-001 · SM Wiki Category DocType
**Category:** BACKEND · **Size:** XS
**Description:** Create the `SM Wiki Category` DocType with fields for name, parent_category (self-link, max 2 levels), slug, description, default_visibility (internal|client), and is_active flag.
**Dependencies:** None

| Spec Gate | Answer |
|-----------|--------|
| **Workflow** | Category Management — provides the organizational hierarchy that all articles belong to. |
| **CRM Timeline** | N/A — category management is an internal structural operation with no customer interaction. |
| **Right Level** | Universal — categories are a platform-level concept usable by any vertical. |

---

## WIKI-002 · SM Article DocType
**Category:** BACKEND · **Size:** S
**Description:** Create the `SM Article` DocType with fields for title, slug, body_html, category (link to SM Wiki Category), visibility (internal|client), status (draft|under_review|published|archived), author, reviewer, rejection_notes, and last_published_at; configure Frappe Workflow for the article status lifecycle.
**Dependencies:** WIKI-001

| Spec Gate | Answer |
|-----------|--------|
| **Workflow** | Article Creation, Publishing (Internal), Publishing (Client-Facing), Archiving — this DocType holds the state for all article lifecycle workflows. |
| **CRM Timeline** | N/A — the DocType itself writes nothing; the publish endpoint (WIKI-009) handles the CRM write. |
| **Right Level** | Universal — articles are a platform-level concept usable by any vertical. |

---

## WIKI-003 · SM Article Version DocType
**Category:** BACKEND · **Size:** XS
**Description:** Create the `SM Article Version` DocType with fields for article_id (link to SM Article), version_number (int), body_html, saved_by, saved_at, and word_count.
**Dependencies:** WIKI-002

| Spec Gate | Answer |
|-----------|--------|
| **Workflow** | Version History — stores immutable snapshots of article body on each save. |
| **CRM Timeline** | N/A — version records are internal audit artifacts with no customer interaction. |
| **Right Level** | Universal. |

---

## WIKI-004 · Create and List Categories API
**Category:** BACKEND · **Size:** S
**Description:** Implement `POST /api/modules/wiki/category/create` (validates 2-level depth constraint, generates slug, sets default_visibility) and `GET /api/modules/wiki/categories` (returns active categories as a tree structure) on the Mojo Abstraction Layer.
**Dependencies:** WIKI-001

| Spec Gate | Answer |
|-----------|--------|
| **Workflow** | Category Management — enables admins to create the organizational structure and staff/frontend to retrieve it. |
| **CRM Timeline** | N/A — category CRUD is internal structural configuration. |
| **Right Level** | Universal. |

---

## WIKI-005 · Update Category API
**Category:** BACKEND · **Size:** XS
**Description:** Implement `PUT /api/modules/wiki/category/{id}/update` on the MAL; supports renaming, re-parenting (enforcing 2-level depth), toggling default_visibility, and deactivating a category (blocks if articles still assigned).
**Dependencies:** WIKI-001

| Spec Gate | Answer |
|-----------|--------|
| **Workflow** | Category Management — enables admins to maintain and reorganize the category hierarchy over time. |
| **CRM Timeline** | N/A — category updates are internal structural operations. |
| **Right Level** | Universal. |

---

## WIKI-006 · Create and Get Article API
**Category:** BACKEND · **Size:** S
**Description:** Implement `POST /api/modules/wiki/article/create` (accepts title, body_html, category, visibility; saves as Draft; generates slug; creates initial version record) and `GET /api/modules/wiki/article/{id}` (returns article with metadata; enforces role-based visibility) on the MAL.
**Dependencies:** WIKI-002

| Spec Gate | Answer |
|-----------|--------|
| **Workflow** | Article Creation — the entry point for all article content. |
| **CRM Timeline** | N/A — creating a draft article has no customer-facing effect. |
| **Right Level** | Universal. |

---

## WIKI-007 · Update Article API
**Category:** BACKEND · **Size:** S
**Description:** Implement `PUT /api/modules/wiki/article/{id}/update` on the MAL; accepts body_html and metadata changes, creates a new `SM Article Version` snapshot (increments version_number, calculates word_count) before applying the update; only allowed on Draft or Under Review articles.
**Dependencies:** WIKI-002, WIKI-003

| Spec Gate | Answer |
|-----------|--------|
| **Workflow** | Article Creation / Version History — every save creates an immutable version snapshot. |
| **CRM Timeline** | N/A — editing a draft/review article has no customer-facing effect. |
| **Right Level** | Universal. |

---

## WIKI-008 · Submit for Review and Reject Article API
**Category:** BACKEND · **Size:** S
**Description:** Implement `PUT /api/modules/wiki/article/{id}/submit-for-review` (transitions Draft → Under Review; validates visibility=client; records submission timestamp) and `PUT /api/modules/wiki/article/{id}/reject` (transitions Under Review → Draft; requires rejection_notes; records reviewer) on the MAL.
**Dependencies:** WIKI-002

| Spec Gate | Answer |
|-----------|--------|
| **Workflow** | Article Publishing (Client-Facing) — the approval gate ensuring client-facing content is reviewed before publication. |
| **CRM Timeline** | N/A — review workflow is internal staff process with no customer interaction. |
| **Right Level** | Universal. |

---

## WIKI-009 · Publish Article API
**Category:** BACKEND · **Size:** S
**Description:** Implement `PUT /api/modules/wiki/article/{id}/publish` on the MAL; handles two paths: internal articles (Draft → Published, any author or admin) and client-facing articles (Under Review → Published, admin only); sets last_published_at; on first client-facing publish, writes a practice-level activity log entry to the CRM.
**Dependencies:** WIKI-002

| Spec Gate | Answer |
|-----------|--------|
| **Workflow** | Article Publishing (Internal) and Article Publishing (Client-Facing) — the terminal approval action that makes content visible. |
| **CRM Timeline** | First-time client-facing publish writes a practice-level activity log entry (not client-specific). Subsequent publishes do not write. Internal-only articles write nothing. |
| **Right Level** | Universal. |

---

## WIKI-010 · Archive Article API
**Category:** BACKEND · **Size:** XS
**Description:** Implement `PUT /api/modules/wiki/article/{id}/archive` on the MAL; transitions Published → Archived (admin only); archived articles are excluded from search and category browse but remain accessible via direct link to authorized staff.
**Dependencies:** WIKI-002

| Spec Gate | Answer |
|-----------|--------|
| **Workflow** | Article Archiving — removes outdated content from active surfaces without deleting history. |
| **CRM Timeline** | N/A — archiving is an internal content management action. |
| **Right Level** | Universal. |

---

## WIKI-011 · Get Version History and Restore Version API
**Category:** BACKEND · **Size:** S
**Description:** Implement `GET /api/modules/wiki/article/{id}/versions` (returns ordered list of version snapshots with metadata) and `POST /api/modules/wiki/article/{id}/restore/{version_number}` (copies the target version's body_html into a new version record and updates the article; does not delete any history) on the MAL.
**Dependencies:** WIKI-003

| Spec Gate | Answer |
|-----------|--------|
| **Workflow** | Version History — enables admins to audit changes and recover previous content without data loss. |
| **CRM Timeline** | N/A — version management is internal content operations. |
| **Right Level** | Universal. |

---

## WIKI-012 · List and Search Articles API
**Category:** BACKEND · **Size:** S
**Description:** Implement `GET /api/modules/wiki/articles` on the MAL with filters for category, visibility, status, and a full-text search parameter; results are role-aware (staff see articles matching their access; client-context requests see only client-facing published articles); supports pagination.
**Dependencies:** WIKI-002, WIKI-001

| Spec Gate | Answer |
|-----------|--------|
| **Workflow** | Full-Text Search — the primary discovery mechanism for both staff and client-portal surfaces. |
| **CRM Timeline** | N/A — search and listing are read-only operations. |
| **Right Level** | Universal. |

---

## WIKI-013 · ArticleEditor Component
**Category:** FRONTEND · **Size:** S
**Description:** Build the `ArticleEditor` React component with rich text editor (title, body), category selector dropdown (from categories API), visibility toggle (internal/client), Save Draft button, and Submit for Review button (visible only when visibility=client and status=draft); supports both create and edit modes.
**Dependencies:** WIKI-006, WIKI-007, WIKI-004, WIKI-008

| Spec Gate | Answer |
|-----------|--------|
| **Workflow** | Article Creation / Article Publishing (Client-Facing) — the authoring surface for all article content. |
| **CRM Timeline** | N/A — frontend component; CRM writes are handled by backend endpoints. |
| **Right Level** | Universal. |

---

## WIKI-014 · ArticleViewer Component
**Category:** FRONTEND · **Size:** S
**Description:** Build the `ArticleViewer` React component that renders a published article's HTML body with metadata sidebar (category, last updated date, author, reviewer if client-facing, current version number); includes action buttons for Publish (internal drafts), Approve/Reject (under-review articles), and Archive (published articles) based on user role and article status.
**Dependencies:** WIKI-006

| Spec Gate | Answer |
|-----------|--------|
| **Workflow** | Article Publishing (Internal), Article Publishing (Client-Facing), Article Archiving — the read and action surface for individual articles. |
| **CRM Timeline** | N/A — frontend component; CRM writes are handled by backend endpoints. |
| **Right Level** | Universal. |

---

## WIKI-015 · ArticleList Component
**Category:** FRONTEND · **Size:** S
**Description:** Build the `ArticleList` React component with search input, category filter dropdown, visibility filter, status filter, and paginated results table showing title, category, status badge (color-coded by status), author, and last-updated date; clicking a row navigates to the ArticleViewer.
**Dependencies:** WIKI-012

| Spec Gate | Answer |
|-----------|--------|
| **Workflow** | Full-Text Search — the primary staff-facing browse and search interface for the knowledge base. |
| **CRM Timeline** | N/A — frontend component; read-only listing. |
| **Right Level** | Universal. |

---

## WIKI-016 · CategoryTree Component
**Category:** FRONTEND · **Size:** S
**Description:** Build the `CategoryTree` React component that renders the category hierarchy as a collapsible two-level tree; supports selecting a category to filter the ArticleList; includes inline admin controls (add, edit, deactivate) wired to the category API endpoints.
**Dependencies:** WIKI-004

| Spec Gate | Answer |
|-----------|--------|
| **Workflow** | Category Management — the visual interface for browsing and managing the category hierarchy. |
| **CRM Timeline** | N/A — frontend component; category operations have no customer interaction. |
| **Right Level** | Universal. |

---

## WIKI-017 · VersionHistoryPanel Component
**Category:** FRONTEND · **Size:** S
**Description:** Build the `VersionHistoryPanel` React component as a slide-out or expandable panel showing an ordered list of version snapshots (version number, saved_by, saved_at, word_count) with a diff-preview toggle and a Restore button (admin only) that calls the restore endpoint and refreshes the article view.
**Dependencies:** WIKI-011

| Spec Gate | Answer |
|-----------|--------|
| **Workflow** | Version History — the admin interface for auditing and restoring article versions. |
| **CRM Timeline** | N/A — frontend component; version operations are internal. |
| **Right Level** | Universal. |

---

## WIKI-018 · n8n Workflow — Notify Author on Approval or Rejection
**Category:** INTEGRATION · **Size:** XS
**Description:** Create an n8n workflow triggered by SM Article status changes; when a client-facing article transitions to Published (approved) or back to Draft (rejected), sends a notification to the article's author with the article title, new status, and rejection_notes if applicable.
**Dependencies:** WIKI-002

| Spec Gate | Answer |
|-----------|--------|
| **Workflow** | Article Publishing (Client-Facing) — closes the feedback loop so authors know the outcome of their submission. |
| **CRM Timeline** | N/A — internal staff notification; no customer interaction. |
| **Right Level** | Universal. |

---

## WIKI-019 · n8n Workflow — Notify Admin on Client-Facing Publish
**Category:** INTEGRATION · **Size:** XS
**Description:** Create an n8n workflow triggered when any client-facing SM Article transitions to Published; sends a notification to all admin users for QA awareness, including article title, author, and a direct link to the article.
**Dependencies:** WIKI-002

| Spec Gate | Answer |
|-----------|--------|
| **Workflow** | Article Publishing (Client-Facing) — ensures admins have visibility into all client-facing content going live. |
| **CRM Timeline** | N/A — internal admin notification; no customer interaction. |
| **Right Level** | Universal. |

---

## WIKI-020 · n8n Workflow — Notify SOP Mojo on Client-Facing Status Change
**Category:** INTEGRATION · **Size:** XS
**Description:** Create an n8n workflow triggered when a client-facing SM Article changes status (published, archived, or reverted to draft); sends a passive notification to SOP Mojo to flag any linked SOPs for review; the Wiki never writes to SOP Mojo directly — this is a one-way event notification only.
**Dependencies:** WIKI-002

| Spec Gate | Answer |
|-----------|--------|
| **Workflow** | SOP Connection (boundary rule) — maintains SOP-Wiki consistency without coupling the two systems. |
| **CRM Timeline** | N/A — cross-system notification; no customer interaction. SOP Mojo owns any SOP-side CRM effects. |
| **Right Level** | Universal. |

---

## WIKI-021 · Client Portal Help Section Glue
**Category:** GLUE · **Size:** S
**Description:** Wire the ArticleList and ArticleViewer components into the patient portal Help section with a client-facing context: filter to visibility=client and status=published only, hide internal metadata (reviewer, status badges), apply read-only mode, and filter categories by the site's configured article category set.
**Dependencies:** WIKI-014, WIKI-015

| Spec Gate | Answer |
|-----------|--------|
| **Workflow** | Client Portal Surface — surfaces curated help content to patients/clients in a read-only format. |
| **CRM Timeline** | N/A — client reading a help article is a passive, anonymous interaction; no individual client record is involved. |
| **Right Level** | Universal — all verticals can expose help articles to their clients. |
```

---

# DEPENDENCY-GRAPH.md

```markdown
# Knowledge Base Wiki — Dependency Graph & Build Order

## Legend

- **→** = "depends on"
- Stories within the same group can be built **in parallel**
- Each group must complete before the next group begins

---

## Build Order

### Group 1 — Foundation DocType
> No dependencies. Start here.

| Story | Title | Size |
|-------|-------|------|
| WIKI-001 | SM Wiki Category DocType | XS |

---

### Group 2 — Core DocType + Category API
> Depends on: Group 1

| Story | Title | Size | Depends On |
|-------|-------|------|------------|
| WIKI-002 | SM Article DocType | S | WIKI-001 |
| WIKI-004 | Create + List Categories API | S | WIKI-001 |
| WIKI-005 | Update Category API | XS | WIKI-001 |

---

### Group 3 — Article Endpoints, Version DocType, Integrations, Category Frontend
> Depends on: Groups 1–2

| Story | Title | Size | Depends On |
|-------|-------|------|------------|
| WIKI-003 | SM Article Version DocType | XS | WIKI-002 |
| WIKI-006 | Create + Get Article API | S | WIKI-002 |
| WIKI-008 | Submit for Review + Reject API | S | WIKI-002 |
| WIKI-009 | Publish Article API | S | WIKI-002 |
| WIKI-010 | Archive Article API | XS | WIKI-002 |
| WIKI-012 | List/Search Articles API | S | WIKI-002, WIKI-001 |
| WIKI-016 | CategoryTree Component | S | WIKI-004 |
| WIKI-018 | n8n — Author Notification | XS | WIKI-002 |
| WIKI-019 | n8n — Admin Publish Notification | XS | WIKI-002 |
| WIKI-020 | n8n — SOP Mojo Notification | XS | WIKI-002 |

---

### Group 4 — Version APIs + Core Frontend
> Depends on: Groups 1–3

| Story | Title | Size | Depends On |
|-------|-------|------|------------|
| WIKI-007 | Update Article API | S | WIKI-002, WIKI-003 |
| WIKI-011 | Version History + Restore API | S | WIKI-003 |
| WIKI-014 | ArticleViewer Component | S | WIKI-006 |
| WIKI-015 | ArticleList Component | S | WIKI-012 |

---

### Group 5 — Composite Frontend + Glue
> Depends on: Groups 1–4

| Story | Title | Size | Depends On |
|-------|-------|------|------------|
| WIKI-013 | ArticleEditor Component | S | WIKI-006, WIKI-007, WIKI-004, WIKI-008 |
| WIKI-017 | VersionHistoryPanel Component | S | WIKI-011 |
| WIKI-021 | Client Portal Help Section Glue | S | WIKI-014, WIKI-015 |

---

## Visual Dependency Graph

```
WIKI-001 (SM Wiki Category)
├──→ WIKI-002 (SM Article)
│    ├──→ WIKI-003 (SM Article Version)
│    │    ├──→ WIKI-007 (Update Article API)
│    │    │    └──→ WIKI-013 (ArticleEditor) ←── WIKI-006, WIKI-004, WIKI-008
│    │    └──→ WIKI-011 (Versions + Restore API)
│    │         └──→ WIKI-017 (VersionHistoryPanel)
│    ├──→ WIKI-006 (Create + Get Article API)
│    │    └──→ WIKI-014 (ArticleViewer)
│    │         └──→ WIKI-021 (Client Portal Help) ←── WIKI-015
│    ├──→ WIKI-008 (Submit + Reject API)
│    ├──→ WIKI-009 (Publish API + CRM write)
│    ├──→ WIKI-010 (Archive API)
│    ├──→ WIKI-012 (List/Search API) ←── WIKI-001
│    │    └──→ WIKI-015 (ArticleList)
│    ├──→ WIKI-018 (n8n Author Notify)
│    ├──→ WIKI-019 (n8n Admin Notify)
│    └──→ WIKI-020 (n8n SOP Notify)
├──→ WIKI-004 (Create + List Categories API)
│    └──→ WIKI-016 (CategoryTree)
└──→ WIKI-005 (Update Category API)
```

---

## Summary

| Metric | Value |
|--------|-------|
| Total stories | 21 |
| Parallel groups | 5 |
| BACKEND stories | 12 |
| FRONTEND stories | 5 |
| INTEGRATION stories | 3 |
| GLUE stories | 1 |
| XS stories | 6 |
| S stories | 15 |
| Critical path length | 5 groups (WIKI-001 → 002 → 003 → 007 → 013) |
| Max parallelism | 10 stories (Group 3) |
```