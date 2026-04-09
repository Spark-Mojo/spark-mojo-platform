model: model-zeta
test: 01-story-decomposition
run: C
date: 2026-04-09

```markdown
# STORIES.md
# Knowledge Base Wiki (KB/Wiki Mojo) — Build Stories
# Generated: Story Decomposition for Spark Mojo Build Factory
---

## Phase 1: Foundation (DocTypes)

### WIKI-001: SM Wiki Category DocType
**Title:** SM Wiki Category DocType Creation  
**Category:** BACKEND  
**Size:** S  
**Description:** Create the SM Wiki Category DocType with fields for name, parent_category (self-referential, 2-level hierarchy), slug, description, default_visibility (internal|client), and is_active flag.  
**Dependencies:** None  

**Spec Gates:**
- **Workflow:** Category Management workflow — enables practices to organize wiki articles into a browsable hierarchy.
- **CRM Timeline:** N/A — category management is internal administrative configuration, not a customer-facing interaction.
- **Right Level:** Universal — category hierarchies serve documentation needs across all verticals.

---

### WIKI-002: SM Article DocType
**Title:** SM Article DocType Creation  
**Category:** BACKEND  
**Size:** S  
**Description:** Create the SM Article DocType with fields for title, slug, body_html (rich text), category (link to SM Wiki Category), visibility (internal|client), status (draft|under_review|published|archived), author, reviewer, rejection_notes, and last_published_at timestamp.  
**Dependencies:** WIKI-001  

**Spec Gates:**
- **Workflow:** Article Creation workflow (initial draft creation) and Article Status Lifecycle management.
- **CRM Timeline:** N/A — draft creation is internal documentation work, not logged to customer timeline.
- **Right Level:** Universal — articles support SOPs and help content for all verticals.

---

### WIKI-003: SM Article Version DocType
**Title:** SM Article Version DocType Creation  
**Category:** BACKEND  
**Size:** S  
**Description:** Create the SM Article Version DocType to store immutable version snapshots with article_id (link), version_number (incremental integer), body_html (content at time of save), saved_by, saved_at timestamp, and computed word_count.  
**Dependencies:** WIKI-002  

**Spec Gates:**
- **Workflow:** Version History workflow — creates audit trail every time article body is saved.
- **CRM Timeline:** N/A — version storage is internal audit trail, not customer activity.
- **Right Level:** Universal — versioning supports compliance and content governance across all verticals.

---

## Phase 2: Core APIs (Category & Article CRUD)

### WIKI-004: Category Create API
**Title:** Wiki Category Create Endpoint  
**Category:** BACKEND  
**Size:** XS  
**Description:** Build POST /api/modules/wiki/category/create endpoint with slug auto-generation (from name), parent validation (enforcing 2-level max depth), and default_visibility enforcement.  
**Dependencies:** WIKI-001  

**Spec Gates:**
- **Workflow:** Category Management workflow — administrative category creation.
- **CRM Timeline:** N/A — back-office configuration action with no customer impact.
- **Right Level:** Universal — category infrastructure supports all verticals.

---

### WIKI-005: Category Update and List API
**Title:** Wiki Category Update and List Endpoints  
**Category:** BACKEND  
**Size:** S  
**Description:** Build PUT /api/modules/wiki/category/{id}/update (modify name, description, default_visibility, parent) and GET /api/modules/wiki/categories (retrieve full hierarchy with article counts).  
**Dependencies:** WIKI-001  

**Spec Gates:**
- **Workflow:** Category Management workflow — administrative maintenance and tree browsing.
- **CRM Timeline:** N/A — administrative category maintenance.
- **Right Level:** Universal — shared category infrastructure.

---

### WIKI-006: Article Create and Get API
**Title:** Wiki Article Create and Get Endpoints  
**Category:** BACKEND  
**Size:** S  
**Description:** Build POST /api/modules/wiki/article/create (initializes as Draft with author, validates category) and GET /api/modules/wiki/article/{id} (retrieve article with role-aware permissions).  
**Dependencies:** WIKI-002, WIKI-001  

**Spec Gates:**
- **Workflow:** Article Creation workflow — staff creates new documentation entry.
- **CRM Timeline:** N/A — draft creation is preparatory internal work.
- **Right Level:** Universal — article CRUD serves all practices.

---

### WIKI-007: Article Update API
**Title:** Wiki Article Update Endpoint  
**Category:** BACKEND  
**Size:** S  
**Description:** Build PUT /api/modules/wiki/article/{id}/update endpoint to modify title, body_html, and metadata; triggers automatic creation of SM Article Version record on every save.  
**Dependencies:** WIKI-002, WIKI-003  

**Spec Gates:**
- **Workflow:** Article Creation workflow (editing drafts) and Version History workflow (snapshot creation).
- **CRM Timeline:** N/A — editing drafts and saving versions is internal content preparation.
- **Right Level:** Universal — content editing supports all documentation use cases.

---

## Phase 3: Workflow APIs (Status Transitions)

### WIKI-008: Article Submit for Review API
**Title:** Wiki Article Submit for Review Endpoint  
**Category:** BACKEND  
**Size:** XS  
**Description:** Build PUT /api/modules/wiki/article/{id}/submit-for-review endpoint transitioning client-facing articles from Draft to Under Review status; internal articles skip this step (return 400).  
**Dependencies:** WIKI-002  

**Spec Gates:**
- **Workflow:** Article Publishing (Client-Facing) workflow — submission for admin approval.
- **CRM Timeline:** N/A — internal workflow step with no customer exposure.
- **Right Level:** Universal — approval workflow applies to all verticals with client-facing content.

---

### WIKI-009: Article Publish API
**Title:** Wiki Article Publish Endpoint  
**Category:** BACKEND  
**Size:** S  
**Description:** Build PUT /api/modules/wiki/article/{id}/publish endpoint allowing admin publish for internal articles (Draft→Published) or client-facing articles (Under Review→Published); updates last_published_at and writes practice-level activity log if first-time client-facing publish.  
**Dependencies:** WIKI-002  

**Spec Gates:**
- **Workflow:** Article Publishing workflow (both internal and client-facing paths) — making content available.
- **CRM Timeline:** Practice-level activity log entry ONLY if first-time publish of a client-facing article; per research summary exception clause (not client-specific timeline entry).
- **Right Level:** Universal — publishing applies to all documentation types across verticals.

---

### WIKI-010: Article Reject API
**Title:** Wiki Article Reject Endpoint  
**Category:** BACKEND  
**Size:** XS  
**Description:** Build PUT /api/modules/wiki/article/{id}/reject endpoint to transition client-facing articles from Under Review back to Draft with required rejection_notes; validates reviewer permissions.  
**Dependencies:** WIKI-002  

**Spec Gates:**
- **Workflow:** Article Publishing (Client-Facing) workflow — rejection path with feedback.
- **CRM Timeline:** N/A — internal workflow rejection to author.
- **Right Level:** Universal — editorial rejection applies to all client-facing content.

---

### WIKI-011: Article Archive API
**Title:** Wiki Article Archive Endpoint  
**Category:** BACKEND  
**Size:** XS  
**Description:** Build PUT /api/modules/wiki/article/{id}/archive endpoint transitioning Published articles to Archived status; removes from search/browse but preserves direct link access for authorized staff.  
**Dependencies:** WIKI-002  

**Spec Gates:**
- **Workflow:** Article Archiving workflow — content deprecation and retention.
- **CRM Timeline:** N/A — archival is internal maintenance action.
- **Right Level:** Universal — content lifecycle applies to all verticals.

---

## Phase 4: Supporting APIs (Versions & Search)

### WIKI-012: Article Version History and Restore API
**Title:** Wiki Article Version History and Restore Endpoints  
**Category:** BACKEND  
**Size:** S  
**Description:** Build GET /api/modules/wiki/article/{id}/versions (chronological list with metadata) and POST /api/modules/wiki/article/{id}/restore/{version_number} (creates new version copying old body_html, does not delete history).  
**Dependencies:** WIKI-003, WIKI-002  

**Spec Gates:**
- **Workflow:** Version History workflow — audit and rollback capabilities.
- **CRM Timeline:** N/A — version management is internal audit function.
- **Right Level:** Universal — version control supports all documentation governance.

---

### WIKI-013: Article List and Search API
**Title:** Wiki Article List and Search Endpoint  
**Category:** BACKEND  
**Size:** S  
**Description:** Build GET /api/modules/wiki/articles endpoint with query filters (category, visibility, status), full-text search across title and body_html, and role-aware results (staff see internal+client, clients see only client-facing published).  
**Dependencies:** WIKI-002  

**Spec Gates:**
- **Workflow:** Full-Text Search workflow — content discovery and retrieval.
- **CRM Timeline:** N/A — search queries are navigation, not customer activity.
- **Right Level:** Universal — search supports all documentation browsing needs.

---

## Phase 5: Frontend Components

### WIKI-014: ArticleEditor Component
**Title:** Wiki ArticleEditor React Component  
**Category:** FRONTEND  
**Size:** S  
**Description:** Build React ArticleEditor component with rich text editor (Tiptap/Quill), title input, category dropdown (WIKI-004), visibility toggle (internal/client), Save Draft button (WIKI-007), and Submit for Review button (WIKI-008); all calls route through MAL.  
**Dependencies:** WIKI-006, WIKI-007, WIKI-004, WIKI-008  

**Spec Gates:**
- **Workflow:** Article Creation workflow (staff authoring interface).
- **CRM Timeline:** N/A — frontend delegates timeline writing to backend API (WIKI-009).
- **Right Level:** Universal — editor serves content authors in all verticals.

---

### WIKI-015: ArticleViewer Component
**Title:** Wiki ArticleViewer React Component  
**Category:** FRONTEND  
**Size:** S  
**Description:** Build React ArticleViewer component to render sanitized body_html, display metadata (author, reviewer, last_published_at), show version notice if viewing restored content, and enforce role-based visibility (hide if internal-only for client users).  
**Dependencies:** WIKI-006, WIKI-012  

**Spec Gates:**
- **Workflow:** Article Publishing workflow (reading interface) and Client Portal Surface workflow.
- **CRM Timeline:** N/A — viewing content is navigation, not activity logging.
- **Right Level:** Universal — article display supports all help content use cases.

---

### WIKI-016: ArticleList Component
**Title:** Wiki ArticleList React Component  
**Category:** FRONTEND  
**Size:** S  
**Description:** Build React ArticleList component with search input, category filter dropdown (WIKI-005), status badges, sortable columns (title, updated_at), and pagination; shows role-appropriate articles only via WIKI-013 API.  
**Dependencies:** WIKI-013, WIKI-005  

**Spec Gates:**
- **Workflow:** Full-Text Search workflow (staff browse and discovery).
- **CRM Timeline:** N/A — browsing list is navigation, not timeline event.
- **Right Level:** Universal — article discovery supports all practices.

---

### WIKI-017: CategoryTree Component
**Title:** Wiki CategoryTree React Component  
**Category:** FRONTEND  
**Size:** S  
**Description:** Build React CategoryTree component displaying collapsible two-level hierarchy (parent/child), article counts per category, and click-to-filter interaction updating ArticleList filter state; consumes WIKI-005 categories endpoint.  
**Dependencies:** WIKI-005  

**Spec Gates:**
- **Workflow:** Category Management workflow (navigational browsing).
- **CRM Timeline:** N/A — category navigation is structural UI, not customer activity.
- **Right Level:** Universal — category browsing supports all documentation organization.

---

### WIKI-018: VersionHistoryPanel Component
**Title:** Wiki VersionHistoryPanel React Component  
**Category:** FRONTEND  
**Size:** S  
**Description:** Build React VersionHistoryPanel component showing chronological version list (saved_by avatar, saved_at timestamp, word_count diff), preview modal for comparing versions, and Restore button calling WIKI-012 restore endpoint (creates new version).  
**Dependencies:** WIKI-012, WIKI-007  

**Spec Gates:**
- **Workflow:** Version History workflow (staff audit and rollback interface).
- **CRM Timeline:** N/A — version browsing is internal audit function.
- **Right Level:** Universal — version control UI supports all content governance.

---

## Phase 6: Integration Workflows (n8n)

### WIKI-019: n8n Notify Author on Review Decision
**Title:** n8n Author Notification on Article Review  
**Category:** INTEGRATION  
**Size:** XS  
**Description:** Build n8n workflow triggered by status transitions to Published (approved) or rejection to Draft (rejected), sending notification to article author with decision outcome and rejection_notes if applicable.  
**Dependencies:** WIKI-009, WIKI-010  

**Spec Gates:**
- **Workflow:** Article Publishing (Client-Facing) workflow — author feedback loop.
- **CRM Timeline:** N/A — notification sent via external channels (email/SMS per n8n config), not CRM timeline entry.
- **Right Level:** Universal — editorial notifications apply to all practices.

---

### WIKI-020: n8n Notify Admin on Client Article Publish
**Title:** n8n Admin Notification on Client Article Publication  
**Category:** INTEGRATION  
**Size:** XS  
**Description:** Build n8n workflow triggered when any client-facing article reaches Published status, notifying designated admin/QA team for awareness of public content changes.  
**Dependencies:** WIKI-009  

**Spec Gates:**
- **Workflow:** Article Publishing (Client-Facing) workflow — QA awareness step.
- **CRM Timeline:** N/A — administrative notification, not customer-facing activity.
- **Right Level:** Universal — QA oversight applies to all client-facing documentation.

---

### WIKI-021: n8n Notify SOP Mojo on Article Status Change
**Title:** n8n SOP Mojo Status Change Notification  
**Category:** INTEGRATION  
**Size:** XS  
**Description:** Build n8n workflow triggered when client-facing articles change status (publish, reject, archive), sending notification to SOP Mojo to flag linked SOPs for review; implements boundary rule: Wiki never calls SOP Mojo directly, n8n handles cross-system notification.  
**Dependencies:** WIKI-009, WIKI-010, WIKI-011  

**Spec Gates:**
- **Workflow:** SOP Connection workflow (boundary rule compliance) — passive notification only, no write-back to Wiki.
- **CRM Timeline:** N/A — system-to-system coordination signal, not customer activity.
- **Right Level:** Universal — SOP linkage pattern applies to all verticals with SOP requirements.

---

# END OF STORIES.md
```

```markdown
# DEPENDENCY-GRAPH.md
# Knowledge Base Wiki Build Order & Parallel Groups
---

## Build Phases

### Phase 1: Foundation (DocTypes)
**Sequential (must complete in order):**
1. **WIKI-001** → SM Wiki Category DocType (no deps)
2. **WIKI-002** → SM Article DocType (dep: 001)
3. **WIKI-003** → SM Article Version DocType (dep: 002)

*Gate: Phase 1 complete when all DocTypes exist with proper field definitions and parent/child relationships.*

---

### Phase 2: Core API Infrastructure
**Parallel Groups:**

**Group A (Category APIs):**
- **WIKI-004** → Category Create API (dep: 001)
- **WIKI-005** → Category Update and List API (dep: 001)

**Group B (Article CRUD APIs):**
- **WIKI-006** → Article Create and Get API (dep: 002, 001)
- **WIKI-007** → Article Update API (dep: 002, 003)

*Gate: Phase 2 complete when articles can be created, updated, and categories managed.*

---

### Phase 3: Workflow Transition APIs
**Parallel (all depend on Phase 1, can run with Phase 2):**
- **WIKI-008** → Submit for Review API (dep: 002)
- **WIKI-009** → Publish API (dep: 002)
- **WIKI-010** → Reject API (dep: 002)
- **WIKI-011** → Archive API (dep: 002)

*Gate: Phase 3 complete when full Article Status Lifecycle is executable via API.*

---

### Phase 4: Supporting Functionality APIs
**Parallel:**
- **WIKI-012** → Version History and Restore API (dep: 003, 002)
- **WIKI-013** → List and Search API (dep: 002)

*Note: WIKI-012 requires WIKI-003 (Version DocType), while others in Phase 3 only needed WIKI-002.*

*Gate: Phase 4 complete when search and version history are functional.*

---

### Phase 5: Frontend Components
**Parallel Groups (all depend on Phase 2,3,4 completion):**

**Group A (Content Management UI):**
- **WIKI-014** → ArticleEditor (dep: 006, 007, 004, 008)
- **WIKI-017** → CategoryTree (dep: 005)

**Group B (Content Discovery UI):**
- **WIKI-016** → ArticleList (dep: 013, 005)
- **WIKI-015** → ArticleViewer (dep: 006, 012)

**Group C (Audit UI):**
- **WIKI-018** → VersionHistoryPanel (dep: 012, 007)

*Gate: Phase 5 complete when staff can author, browse, and manage wiki content.*

---

### Phase 6: Integration Workflows
**Parallel (depends on Phase 3 workflow APIs):**
- **WIKI-020** → Notify Admin on Publish (dep: 009)
- **WIKI-019** → Notify Author on Review (dep: 009, 010)
- **WIKI-021** → Notify SOP Mojo on Change (dep: 009, 010, 011)

*Note: Phase 6 can start as soon as WIKI-009 (Publish) and WIKI-010 (Reject) are complete; WIKI-011 only needed for 021.*

*Gate: Phase 6 complete when all notification workflows trigger correctly.*

---

## Execution Summary

| Phase | Stories | Can Parallelize |
|-------|---------|-----------------|
| 1 | 3 | No – sequential |
| 2 | 4 | Yes – Groups A and B parallel |
| 3 | 4 | Yes – all 4 parallel |
| 4 | 2 | Yes – both parallel |
| 5 | 5 | Yes – Groups A, B, C parallel |
| 6 | 3 | Yes – all 3 parallel |

**Critical Path:** 1 → 2 → 3 → 5 (frontend usable by end of Phase 5)
**Integration Path:** 1 → 2 → 3 → 6 (n8n workflows active after Phase 6)

**Total Stories:** 21 (3 DocType + 10 Backend + 5 Frontend + 3 Integration)

**Estimated Total Build Iterations:** 84-168 (assuming 4-8 iterations per story)
```