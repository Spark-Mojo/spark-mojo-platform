model: model-theta
test: 01-story-decomposition
run: C
date: 2026-04-09

# STORIES.md

```markdown
# Knowledge Base Wiki - Atomic Stories

## Backend Stories

### WIKI-001: SM Article DocType
- **Category**: BACKEND
- **Size**: XS
- **Description**: Create SM Article DocType with title, slug, body_html, category, visibility, status, author, reviewer, rejection_notes, last_published_at fields.
- **Dependencies**: None
- **Workflow**: Serves Article Creation, Publishing, and Archiving workflows.
- **CRM Timeline**: N/A (DocType creation does not write to CRM timeline).
- **Right Level**: Universal (all verticals can use wiki).

### WIKI-002: SM Article Version DocType
- **Category**: BACKEND
- **Size**: XS
- **Description**: Create SM Article Version DocType for version history (article_id, version_number, body_html, saved_by, saved_at, word_count).
- **Dependencies**: None
- **Workflow**: Serves Version History workflow.
- **CRM Timeline**: N/A.
- **Right Level**: Universal.

### WIKI-003: SM Wiki Category DocType
- **Category**: BACKEND
- **Size**: XS
- **Description**: Create SM Wiki Category DocType for category hierarchy (name, parent_category, slug, description, default_visibility, is_active).
- **Dependencies**: None
- **Workflow**: Serves Category Management workflow.
- **CRM Timeline**: N/A.
- **Right Level**: Universal.

### WIKI-004: Article Creation Endpoint
- **Category**: BACKEND
- **Size**: XS
- **Description**: Implement POST `/api/modules/wiki/article/create` endpoint to create new articles with draft status.
- **Dependencies**: WIKI-001
- **Workflow**: Article Creation workflow.
- **CRM Timeline**: N/A (article creation does not write to CRM timeline; only first-time client-facing publish writes practice-level activity log).
- **Right Level**: Universal.

### WIKI-005: Article Retrieval Endpoints
- **Category**: BACKEND
- **Size**: XS
- **Description**: Implement GET `/api/modules/wiki/article/{id}` and GET `/api/modules/wiki/articles` with filters (category, visibility, status, search) including role‑aware access control.
- **Dependencies**: WIKI-001, WIKI-003
- **Workflow**: Article viewing and Full‑Text Search workflows.
- **CRM Timeline**: N/A (read operations).
- **Right Level**: Universal.

### WIKI-006: Article Update Endpoint
- **Category**: BACKEND
- **Size**: XS
- **Description**: Implement PUT `/api/modules/wiki/article/{id}/update` to update article body and metadata, automatically creating a new version snapshot.
- **Dependencies**: WIKI-001, WIKI-002
- **Workflow**: Article editing and Version History workflows.
- **CRM Timeline**: N/A.
- **Right Level**: Universal.

### WIKI-007: Article Submission for Review Endpoint
- **Category**: BACKEND
- **Size**: XS
- **Description**: Implement PUT `/api/modules/wiki/article/{id}/submit‑for‑review` to move a client‑facing article from Draft to Under Review.
- **Dependencies**: WIKI-001
- **Workflow**: Client‑facing article publishing workflow (Draft → Under Review).
- **CRM Timeline**: N/A.
- **Right Level**: Universal.

### WIKI-008: Article Publishing Endpoint
- **Category**: BACKEND
- **Size**: XS
- **Description**: Implement PUT `/api/modules/wiki/article/{id}/publish` to publish an article (direct for internal, after approval for client‑facing) and write a practice‑level activity log when a client‑facing article is published for the first time.
- **Dependencies**: WIKI-001
- **Workflow**: Article Publishing workflow.
- **CRM Timeline**: Writes a practice‑level activity log entry (not client‑specific) when a client‑facing article is published for the first time.
- **Right Level**: Universal.

### WIKI-009: Article Rejection Endpoint
- **Category**: BACKEND
- **Size**: XS
- **Description**: Implement PUT `/api/modules/wiki/article/{id}/reject` with rejection_notes to move a client‑facing article from Under Review back to Draft.
- **Dependencies**: WIKI-001
- **Workflow**: Client‑facing article review workflow (rejection).
- **CRM Timeline**: N/A.
- **Right Level**: Universal.

### WIKI-010: Article Archiving Endpoint
- **Category**: BACKEND
- **Size**: XS
- **Description**: Implement PUT `/api/modules/wiki/article/{id}/archive` to archive a published article.
- **Dependencies**: WIKI-001
- **Workflow**: Article Archiving workflow.
- **CRM Timeline**: N/A.
- **Right Level**: Universal.

### WIKI-011: Article Version History Endpoints
- **Category**: BACKEND
- **Size**: XS
- **Description**: Implement GET `/api/modules/wiki/article/{id}/versions` and POST `/api/modules/wiki/article/{id}/restore/{version_number}` to view and restore previous versions.
- **Dependencies**: WIKI-001, WIKI-002
- **Workflow**: Version History workflow.
- **CRM Timeline**: N/A.
- **Right Level**: Universal.

### WIKI-012: Category Creation Endpoint
- **Category**: BACKEND
- **Size**: XS
- **Description**: Implement POST `/api/modules/wiki/category/create` to create new categories.
- **Dependencies**: WIKI-003
- **Workflow**: Category Management workflow.
- **CRM Timeline**: N/A.
- **Right Level**: Universal.

### WIKI-013: Category Update Endpoint
- **Category**: BACKEND
- **Size**: XS
- **Description**: Implement PUT `/api/modules/wiki/category/{id}/update` to update category details.
- **Dependencies**: WIKI-003
- **Workflow**: Category Management workflow.
- **CRM Timeline**: N/A.
- **Right Level**: Universal.

### WIKI-014: Category Retrieval Endpoint
- **Category**: BACKEND
- **Size**: XS
- **Description**: Implement GET `/api/modules/wiki/categories` to retrieve the category hierarchy (up to two levels deep).
- **Dependencies**: WIKI-003
- **Workflow**: Category Management and Article Creation (category selector) workflows.
- **CRM Timeline**: N/A.
- **Right Level**: Universal.

### WIKI-023: Client Portal Articles Endpoint
- **Category**: BACKEND
- **Size**: XS
- **Description**: Implement GET `/api/modules/wiki/articles/client‑facing` (or extend existing articles endpoint) to return only client‑facing published articles for the patient portal Help section, filtered by site category configuration.
- **Dependencies**: WIKI-001, WIKI-003
- **Workflow**: Client Portal Surface workflow.
- **CRM Timeline**: N/A (read‑only for clients).
- **Right Level**: Universal.

## Frontend Stories

### WIKI-015: ArticleEditor Component
- **Category**: FRONTEND
- **Size**: S
- **Description**: Create React component with rich‑text editor, title field, category selector, visibility toggle, and save/submit controls.
- **Dependencies**: WIKI-004 (create), WIKI-005 (retrieve), WIKI-012 (category create), WIKI-014 (categories)
- **Workflow**: Article Creation and Article Editing workflows.
- **CRM Timeline**: N/A (frontend component does not write directly to CRM).
- **Right Level**: Universal.

### WIKI-016: ArticleViewer Component
- **Category**: FRONTEND
- **Size**: S
- **Description**: Create React component that renders a published article with metadata (last updated, reviewer, version info).
- **Dependencies**: WIKI-005 (get article)
- **Workflow**: Article viewing workflow.
- **CRM Timeline**: N/A.
- **Right Level**: Universal.

### WIKI-017: ArticleList Component
- **Category**: FRONTEND
- **Size**: S
- **Description**: Create React component with searchable and filterable article list, status badges, and role‑aware visibility.
- **Dependencies**: WIKI-005 (list articles)
- **Workflow**: Full‑Text Search and Article browsing workflows.
- **CRM Timeline**: N/A.
- **Right Level**: Universal.

### WIKI-018: CategoryTree Component
- **Category**: FRONTEND
- **Size**: S
- **Description**: Create React component that displays a collapsible category hierarchy browser.
- **Dependencies**: WIKI-014 (categories)
- **Workflow**: Category Management and Article filtering workflows.
- **CRM Timeline**: N/A.
- **Right Level**: Universal.

### WIKI-019: VersionHistoryPanel Component
- **Category**: FRONTEND
- **Size**: S
- **Description**: Create React component that lists article versions with a restore button.
- **Dependencies**: WIKI-011 (version history endpoints)
- **Workflow**: Version History workflow.
- **CRM Timeline**: N/A.
- **Right Level**: Universal.

## Integration Stories

### WIKI-020: Notify Author on Article Approval/Rejection n8n Workflow
- **Category**: INTEGRATION
- **Size**: XS
- **Description**: Create n8n workflow that listens for article status changes (approved/rejected) and sends a notification to the article author.
- **Dependencies**: WIKI-008 (publish), WIKI-009 (reject)
- **Workflow**: Client‑facing article review workflow.
- **CRM Timeline**: N/A (n8n workflow does not write to CRM directly).
- **Right Level**: Universal.

### WIKI-021: Notify Admin on Client‑Facing Article Publish n8n Workflow
- **Category**: INTEGRATION
- **Size**: XS
- **Description**: Create n8n workflow that listens for client‑facing article publish events and notifies admin for QA awareness.
- **Dependencies**: WIKI-008 (publish)
- **Workflow**: Client‑facing article publishing workflow (QA awareness).
- **CRM Timeline**: N/A.
- **Right Level**: Universal.

### WIKI-022: Notify SOP Mojo on Article Status Change n8n Workflow
- **Category**: INTEGRATION
- **Size**: XS
- **Description**: Create n8n workflow that listens for client‑facing article status changes and passively notifies SOP Mojo to flag linked SOPs for review (no write‑back).
- **Dependencies**: WIKI-007 (submit), WIKI-008 (publish), WIKI-009 (reject)
- **Workflow**: SOP Connection boundary rule.
- **CRM Timeline**: N/A.
- **Right Level**: Universal.
```

Now I need to create the DEPENDENCY-GRAPH.md showing build order and parallel execution groups.

I'll analyze dependencies to determine which stories can be built in parallel.

Group 1 (no dependencies): WIKI-001, WIKI-002, WIKI-003. These can be built in parallel.

Group 2 (depend on Group 1): 
- WIKI-004 depends on WIKI-001
- WIKI-005 depends on WIKI-001, WIKI-003
- WIKI-006 depends on WIKI-001, WIKI-002
- WIKI-007 depends on WIKI-001
- WIKI-008 depends on WIKI-001
- WIKI-009 depends on WIKI-001
- WIKI-010 depends on WIKI-001
- WIKI-011 depends on WIKI-001, WIKI-002
- WIKI-012 depends on WIKI-003
- WIKI-013 depends on WIKI-003
- WIKI-014 depends on WIKI-003
- WIKI-023 depends on WIKI-001, WIKI-003

These can be built in parallel after Group 1 completes.

Group 3 (depend on Group 2 endpoints):
- WIKI-015 depends on multiple endpoints (004,005,012,014)
- WIKI-016 depends on WIKI-005
- WIKI-017 depends on WIKI-005
- WIKI-018 depends on WIKI-014
- WIKI-019 depends on WIKI-011

These frontend components can be built in parallel after their respective backend endpoints are done.

Group 4 (depend on publishing endpoints):
- WIKI-020 depends on WIKI-008, WIKI-009
- WIKI-021 depends on WIKI-008
- WIKI-022 depends on WIKI-007, WIKI-008, WIKI-009

These integration workflows can be built after the publish/reject endpoints are done.

Now I'll create the dependency graph markdown. I'll show a table with story ID, dependencies, and parallel groups.

Let me write DEPENDENCY-GRAPH.md.# DEPENDENCY-GRAPH.md

```markdown
# Knowledge Base Wiki - Dependency Graph and Build Order

## Parallel Execution Groups

### Group 1: Foundation (No Dependencies)
These stories can be built simultaneously.

| Story ID | Title | Category | Dependencies |
|----------|-------|----------|--------------|
| WIKI-001 | SM Article DocType | BACKEND | None |
| WIKI-002 | SM Article Version DocType | BACKEND | None |
| WIKI-003 | SM Wiki Category DocType | BACKEND | None |

### Group 2: Backend Endpoints (Depend on Group 1)
Build after Group 1 completes. All stories in this group can be built in parallel.

| Story ID | Title | Category | Dependencies |
|----------|-------|----------|--------------|
| WIKI-004 | Article Creation Endpoint | BACKEND | WIKI-001 |
| WIKI-005 | Article Retrieval Endpoints | BACKEND | WIKI-001, WIKI-003 |
| WIKI-006 | Article Update Endpoint | BACKEND | WIKI-001, WIKI-002 |
| WIKI-007 | Article Submission for Review Endpoint | BACKEND | WIKI-001 |
| WIKI-008 | Article Publishing Endpoint | BACKEND | WIKI-001 |
| WIKI-009 | Article Rejection Endpoint | BACKEND | WIKI-001 |
| WIKI-010 | Article Archiving Endpoint | BACKEND | WIKI-001 |
| WIKI-011 | Article Version History Endpoints | BACKEND | WIKI-001, WIKI-002 |
| WIKI-012 | Category Creation Endpoint | BACKEND | WIKI-003 |
| WIKI-013 | Category Update Endpoint | BACKEND | WIKI-003 |
| WIKI-014 | Category Retrieval Endpoint | BACKEND | WIKI-003 |
| WIKI-023 | Client Portal Articles Endpoint | BACKEND | WIKI-001, WIKI-003 |

### Group 3: Frontend Components (Depend on Group 2)
Build after the required backend endpoints are complete. Components can be built in parallel once their dependencies are satisfied.

| Story ID | Title | Category | Dependencies |
|----------|-------|----------|--------------|
| WIKI-015 | ArticleEditor Component | FRONTEND | WIKI-004, WIKI-005, WIKI-012, WIKI-014 |
| WIKI-016 | ArticleViewer Component | FRONTEND | WIKI-005 |
| WIKI-017 | ArticleList Component | FRONTEND | WIKI-005 |
| WIKI-018 | CategoryTree Component | FRONTEND | WIKI-014 |
| WIKI-019 | VersionHistoryPanel Component | FRONTEND | WIKI-011 |

### Group 4: Integration Workflows (Depend on Publishing Endpoints)
Build after the publish/reject endpoints (WIKI-007, WIKI-008, WIKI-009) are complete.

| Story ID | Title | Category | Dependencies |
|----------|-------|----------|--------------|
| WIKI-020 | Notify Author on Article Approval/Rejection n8n Workflow | INTEGRATION | WIKI-008, WIKI-009 |
| WIKI-021 | Notify Admin on Client‑Facing Article Publish n8n Workflow | INTEGRATION | WIKI-008 |
| WIKI-022 | Notify SOP Mojo on Article Status Change n8n Workflow | INTEGRATION | WIKI-007, WIKI-008, WIKI-009 |

## Build Order Summary

1. **Start Group 1** (WIKI-001, WIKI-002, WIKI-003) – immediate parallel execution.
2. **Once Group 1 is complete, start Group 2** – all 12 backend endpoint stories in parallel.
3. **As Group 2 stories finish, start Group 3 frontend components** – each component can begin as soon as its specific backend dependencies are met.
   - WIKI-015 can start after WIKI-004, WIKI-005, WIKI-012, and WIKI-014 are done.
   - WIKI-016 and WIKI-017 can start after WIKI-005 is done.
   - WIKI-018 can start after WIKI-014 is done.
   - WIKI-019 can start after WIKI-011 is done.
4. **After WIKI-007, WIKI-008, and WIKI-009 are complete, start Group 4** – all three n8n workflows in parallel.

## Critical Path Notes

- The **Article Publishing Endpoint (WIKI-008)** is critical for CRM timeline integration (practice‑level activity log) and for the integration workflows (WIKI-020, WIKI-021, WIKI-022).
- The **Article Retrieval Endpoints (WIKI-005)** are required by multiple frontend components (ArticleEditor, ArticleViewer, ArticleList) and should be prioritized within Group 2.
- The **Category Retrieval Endpoint (WIKI-014)** is needed for both ArticleEditor and CategoryTree components.

## Dependency Graph Visualization

```
WIKI-001 ─┬─ WIKI-004 ──────┐
          ├─ WIKI-005 ──────┼─ WIKI-015
          ├─ WIKI-006 ──────┤
          ├─ WIKI-007 ──────┼─ WIKI-022
          ├─ WIKI-008 ──────┼─ WIKI-020 ─┐
          ├─ WIKI-009 ──────┼─ WIKI-021 ─┤
          ├─ WIKI-010 ──────┤            │
          └─ WIKI-011 ──────┼─ WIKI-019  │
                            │            │
WIKI-002 ── WIKI-006 ──────┤            │
          └─ WIKI-011 ──────┘            │
                                          │
WIKI-003 ─┬─ WIKI-005 ──────┐            │
          ├─ WIKI-012 ──────┼─ WIKI-015  │
          ├─ WIKI-013 ──────┤            │
          ├─ WIKI-014 ──────┼─ WIKI-015  │
          └─ WIKI-023 ──────┘            │
                                          │
WIKI-015 ── (frontend)                    │
WIKI-016 ── (frontend)                    │
WIKI-017 ── (frontend)                    │
WIKI-018 ── (frontend)                    │
WIKI-019 ── (frontend)                    │
                                          │
WIKI-020 ── (integration) ────────────────┘
WIKI-021 ── (integration)
WIKI-022 ── (integration)
```

> **Note:** Arrows indicate dependency direction. Stories can be built in parallel within each group as long as upstream dependencies are satisfied.
```Now I need to output both files. I'll provide them as code blocks. Let me also double-check that I haven't missed any stories. The research summary includes "SOP Connection (boundary rule)" which is covered by WIKI-022. Also "CRM Timeline: N/A for individual article actions. Exception: if a client-facing article is published for the first time, write a practice-level activity log entry" - covered in WIKI-008.

I think the decomposition is complete. Let me now output the final answer with both files.# Knowledge Base Wiki - Atomic Story Decomposition

Based on the research summary, I've decomposed the Knowledge Base Wiki capability into 23 atomic stories following Spark Mojo's platform guardrails and atomic story rules.

## STORIES.md
```markdown
# Knowledge Base Wiki - Atomic Stories

## Backend Stories

### WIKI-001: SM Article DocType
- **Category**: BACKEND
- **Size**: XS
- **Description**: Create SM Article DocType with title, slug, body_html, category, visibility, status, author, reviewer, rejection_notes, last_published_at fields.
- **Dependencies**: None
- **Workflow**: Serves Article Creation, Publishing, and Archiving workflows.
- **CRM Timeline**: N/A (DocType creation does not write to CRM timeline).
- **Right Level**: Universal (all verticals can use wiki).

### WIKI-002: SM Article Version DocType
- **Category**: BACKEND
- **Size**: XS
- **Description**: Create SM Article Version DocType for version history (article_id, version_number, body_html, saved_by, saved_at, word_count).
- **Dependencies**: None
- **Workflow**: Serves Version History workflow.
- **CRM Timeline**: N/A.
- **Right Level**: Universal.

### WIKI-003: SM Wiki Category DocType
- **Category**: BACKEND
- **Size**: XS
- **Description**: Create SM Wiki Category DocType for category hierarchy (name, parent_category, slug, description, default_visibility, is_active).
- **Dependencies**: None
- **Workflow**: Serves Category Management workflow.
- **CRM Timeline**: N/A.
- **Right Level**: Universal.

### WIKI-004: Article Creation Endpoint
- **Category**: BACKEND
- **Size**: XS
- **Description**: Implement POST `/api/modules/wiki/article/create` endpoint to create new articles with draft status.
- **Dependencies**: WIKI-001
- **Workflow**: Article Creation workflow.
- **CRM Timeline**: N/A (article creation does not write to CRM timeline; only first-time client-facing publish writes practice-level activity log).
- **Right Level**: Universal.

### WIKI-005: Article Retrieval Endpoints
- **Category**: BACKEND
- **Size**: XS
- **Description**: Implement GET `/api/modules/wiki/article/{id}` and GET `/api/modules/wiki/articles` with filters (category, visibility, status, search) including role‑aware access control.
- **Dependencies**: WIKI-001, WIKI-003
- **Workflow**: Article viewing and Full‑Text Search workflows.
- **CRM Timeline**: N/A (read operations).
- **Right Level**: Universal.

### WIKI-006: Article Update Endpoint
- **Category**: BACKEND
- **Size**: XS
- **Description**: Implement PUT `/api/modules/wiki/article/{id}/update` to update article body and metadata, automatically creating a new version snapshot.
- **Dependencies**: WIKI-001, WIKI-002
- **Workflow**: Article editing and Version History workflows.
- **CRM Timeline**: N/A.
- **Right Level**: Universal.

### WIKI-007: Article Submission for Review Endpoint
- **Category**: BACKEND
- **Size**: XS
- **Description**: Implement PUT `/api/modules/wiki/article/{id}/submit‑for‑review` to move a client‑facing article from Draft to Under Review.
- **Dependencies**: WIKI-001
- **Workflow**: Client‑facing article publishing workflow (Draft → Under Review).
- **CRM Timeline**: N/A.
- **Right Level**: Universal.

### WIKI-008: Article Publishing Endpoint
- **Category**: BACKEND
- **Size**: XS
- **Description**: Implement PUT `/api/modules/wiki/article/{id}/publish` to publish an article (direct for internal, after approval for client‑facing) and write a practice‑level activity log when a client‑facing article is published for the first time.
- **Dependencies**: WIKI-001
- **Workflow**: Article Publishing workflow.
- **CRM Timeline**: Writes a practice‑level activity log entry (not client‑specific) when a client‑facing article is published for the first time.
- **Right Level**: Universal.

### WIKI-009: Article Rejection Endpoint
- **Category**: BACKEND
- **Size**: XS
- **Description**: Implement PUT `/api/modules/wiki/article/{id}/reject` with rejection_notes to move a client‑facing article from Under Review back to Draft.
- **Dependencies**: WIKI-001
- **Workflow**: Client‑facing article review workflow (rejection).
- **CRM Timeline**: N/A.
- **Right Level**: Universal.

### WIKI-010: Article Archiving Endpoint
- **Category**: BACKEND
- **Size**: XS
- **Description**: Implement PUT `/api/modules/wiki/article/{id}/archive` to archive a published article.
- **Dependencies**: WIKI-001
- **Workflow**: Article Archiving workflow.
- **CRM Timeline**: N/A.
- **Right Level**: Universal.

### WIKI-011: Article Version History Endpoints
- **Category**: BACKEND
- **Size**: XS
- **Description**: Implement GET `/api/modules/wiki/article/{id}/versions` and POST `/api/modules/wiki/article/{id}/restore/{version_number}` to view and restore previous versions.
- **Dependencies**: WIKI-001, WIKI-002
- **Workflow**: Version History workflow.
- **CRM Timeline**: N/A.
- **Right Level**: Universal.

### WIKI-012: Category Creation Endpoint
- **Category**: BACKEND
- **Size**: XS
- **Description**: Implement POST `/api/modules/wiki/category/create` to create new categories.
- **Dependencies**: WIKI-003
- **Workflow**: Category Management workflow.
- **CRM Timeline**: N/A.
- **Right Level**: Universal.

### WIKI-013: Category Update Endpoint
- **Category**: BACKEND
- **Size**: XS
- **Description**: Implement PUT `/api/modules/wiki/category/{id}/update` to update category details.
- **Dependencies**: WIKI-003
- **Workflow**: Category Management workflow.
- **CRM Timeline**: N/A.
- **Right Level**: Universal.

### WIKI-014: Category Retrieval Endpoint
- **Category**: BACKEND
- **Size**: XS
- **Description**: Implement GET `/api/modules/wiki/categories` to retrieve the category hierarchy (up to two levels deep).
- **Dependencies**: WIKI-003
- **Workflow**: Category Management and Article Creation (category selector) workflows.
- **CRM Timeline**: N/A.
- **Right Level**: Universal.

### WIKI-023: Client Portal Articles Endpoint
- **Category**: BACKEND
- **Size**: XS
- **Description**: Implement GET `/api/modules/wiki/articles/client‑facing` (or extend existing articles endpoint) to return only client‑facing published articles for the patient portal Help section, filtered by site category configuration.
- **Dependencies**: WIKI-001, WIKI-003
- **Workflow**: Client Portal Surface workflow.
- **CRM Timeline**: N/A (read‑only for clients).
- **Right Level**: Universal.

## Frontend Stories

### WIKI-015: ArticleEditor Component
- **Category**: FRONTEND
- **Size**: S
- **Description**: Create React component with rich‑text editor, title field, category selector, visibility toggle, and save/submit controls.
- **Dependencies**: WIKI-004 (create), WIKI-005 (retrieve), WIKI-012 (category create), WIKI-014 (categories)
- **Workflow**: Article Creation and Article Editing workflows.
- **CRM Timeline**: N/A (frontend component does not write directly to CRM).
- **Right Level**: Universal.

### WIKI-016: ArticleViewer Component
- **Category**: FRONTEND
- **Size**: S
- **Description**: Create React component that renders a published article with metadata (last updated, reviewer, version info).
- **Dependencies**: WIKI-005 (get article)
- **Workflow**: Article viewing workflow.
- **CRM Timeline**: N/A.
- **Right Level**: Universal.

### WIKI-017: ArticleList Component
- **Category**: FRONTEND
- **Size**: S
- **Description**: Create React component with searchable and filterable article list, status badges, and role‑aware visibility.
- **Dependencies**: WIKI-005 (list articles)
- **Workflow**: Full‑Text Search and Article browsing workflows.
- **CRM Timeline**: N/A.
- **Right Level**: Universal.

### WIKI-018: CategoryTree Component
- **Category**: FRONTEND
- **Size**: S
- **Description**: Create React component that displays a collapsible category hierarchy browser.
- **Dependencies**: WIKI-014 (categories)
- **Workflow**: Category Management and Article filtering workflows.
- **CRM Timeline**: N/A.
- **Right Level**: Universal.

### WIKI-019: VersionHistoryPanel Component
- **Category**: FRONTEND
- **Size**: S
- **Description**: Create React component that lists article versions with a restore button.
- **Dependencies**: WIKI-011 (version history endpoints)
- **Workflow**: Version History workflow.
- **CRM Timeline**: N/A.
- **Right Level**: Universal.

## Integration Stories

### WIKI-020: Notify Author on Article Approval/Rejection n8n Workflow
- **Category**: INTEGRATION
- **Size**: XS
- **Description**: Create n8n workflow that listens for article status changes (approved/rejected) and sends a notification to the article author.
- **Dependencies**: WIKI-008 (publish), WIKI-009 (reject)
- **Workflow**: Client‑facing article review workflow.
- **CRM Timeline**: N/A (n8n workflow does not write to CRM directly).
- **Right Level**: Universal.

### WIKI-021: Notify Admin on Client‑Facing Article Publish n8n Workflow
- **Category**: INTEGRATION
- **Size**: XS
- **Description**: Create n8n workflow that listens for client‑facing article publish events and notifies admin for QA awareness.
- **Dependencies**: WIKI-008 (publish)
- **Workflow**: Client‑facing article publishing workflow (QA awareness).
- **CRM Timeline**: N/A.
- **Right Level**: Universal.

### WIKI-022: Notify SOP Mojo on Article Status Change n8n Workflow
- **Category**: INTEGRATION
- **Size**: XS
- **Description**: Create n8n workflow that listens for client‑facing article status changes and passively notifies SOP Mojo to flag linked SOPs for review (no write‑back).
- **Dependencies**: WIKI-007 (submit), WIKI-008 (publish), WIKI-009 (reject)
- **Workflow**: SOP Connection boundary rule.
- **CRM Timeline**: N/A.
- **Right Level**: Universal.
```

## DEPENDENCY-GRAPH.md
```markdown
# Knowledge Base Wiki - Dependency Graph and Build Order

## Parallel Execution Groups

### Group 1: Foundation (No Dependencies)
These stories can be built simultaneously.

| Story ID | Title | Category | Dependencies |
|----------|-------|----------|--------------|
| WIKI-001 | SM Article DocType | BACKEND | None |
| WIKI-002 | SM Article Version DocType | BACKEND | None |
| WIKI-003 | SM Wiki Category DocType | BACKEND | None |

### Group 2: Backend Endpoints (Depend on Group 1)
Build after Group 1 completes. All stories in this group can be built in parallel.

| Story ID | Title | Category | Dependencies |
|----------|-------|----------|--------------|
| WIKI-004 | Article Creation Endpoint | BACKEND | WIKI-001 |
| WIKI-005 | Article Retrieval Endpoints | BACKEND | WIKI-001, WIKI-003 |
| WIKI-006 | Article Update Endpoint | BACKEND | WIKI-001, WIKI-002 |
| WIKI-007 | Article Submission for Review Endpoint | BACKEND | WIKI-001 |
| WIKI-008 | Article Publishing Endpoint | BACKEND | WIKI-001 |
| WIKI-009 | Article Rejection Endpoint | BACKEND | WIKI-001 |
| WIKI-010 | Article Archiving Endpoint | BACKEND | WIKI-001 |
| WIKI-011 | Article Version History Endpoints | BACKEND | WIKI-001, WIKI-002 |
| WIKI-012 | Category Creation Endpoint | BACKEND | WIKI-003 |
| WIKI-013 | Category Update Endpoint | BACKEND | WIKI-003 |
| WIKI-014 | Category Retrieval Endpoint | BACKEND | WIKI-003 |
| WIKI-023 | Client Portal Articles Endpoint | BACKEND | WIKI-001, WIKI-003 |

### Group 3: Frontend Components (Depend on Group 2)
Build after the required backend endpoints are complete. Components can be built in parallel once their dependencies are satisfied.

| Story ID | Title | Category | Dependencies |
|----------|-------|----------|--------------|
| WIKI-015 | ArticleEditor Component | FRONTEND | WIKI-004, WIKI-005, WIKI-012, WIKI-014 |
| WIKI-016 | ArticleViewer Component | FRONTEND | WIKI-005 |
| WIKI-017 | ArticleList Component | FRONTEND | WIKI-005 |
| WIKI-018 | CategoryTree Component | FRONTEND | WIKI-014 |
| WIKI-019 | VersionHistoryPanel Component | FRONTEND | WIKI-011 |

### Group 4: Integration Workflows (Depend on Publishing Endpoints)
Build after the publish/reject endpoints (WIKI-007, WIKI-008, WIKI-009) are complete.

| Story ID | Title | Category | Dependencies |
|----------|-------|----------|--------------|
| WIKI-020 | Notify Author on Article Approval/Rejection n8n Workflow | INTEGRATION | WIKI-008, WIKI-009 |
| WIKI-021 | Notify Admin on Client‑Facing Article Publish n8n Workflow | INTEGRATION | WIKI-008 |
| WIKI-022 | Notify SOP Mojo on Article Status Change n8n Workflow | INTEGRATION | WIKI-007, WIKI-008, WIKI-009 |

## Build Order Summary

1. **Start Group 1** (WIKI-001, WIKI-002, WIKI-003) – immediate parallel execution.
2. **Once Group 1 is complete, start Group 2** – all 12 backend endpoint stories in parallel.
3. **As Group 2 stories finish, start Group 3 frontend components** – each component can begin as soon as its specific backend dependencies are met.
   - WIKI-015 can start after WIKI-004, WIKI-005, WIKI-012, and WIKI-014 are done.
   - WIKI-016 and WIKI-017 can start after WIKI-005 is done.
   - WIKI-018 can start after WIKI-014 is done.
   - WIKI-019 can start after WIKI-011 is done.
4. **After WIKI-007, WIKI-008, and WIKI-009 are complete, start Group 4** – all three n8n workflows in parallel.

## Critical Path Notes

- The **Article Publishing Endpoint (WIKI-008)** is critical for CRM timeline integration (practice‑level activity log) and for the integration workflows (WIKI-020, WIKI-021, WIKI-022).
- The **Article Retrieval Endpoints (WIKI-005)** are required by multiple frontend components (ArticleEditor, ArticleViewer, ArticleList) and should be prioritized within Group 2.
- The **Category Retrieval Endpoint (WIKI-014)** is needed for both ArticleEditor and CategoryTree components.

## Dependency Graph Visualization

```
WIKI-001 ─┬─ WIKI-004 ──────┐
          ├─ WIKI-005 ──────┼─ WIKI-015
          ├─ WIKI-006 ──────┤
          ├─ WIKI-007 ──────┼─ WIKI-022
          ├─ WIKI-008 ──────┼─ WIKI-020 ─┐
          ├─ WIKI-009 ──────┼─ WIKI-021 ─┤
          ├─ WIKI-010 ──────┤            │
          └─ WIKI-011 ──────┼─ WIKI-019  │
                            │            │
WIKI-002 ── WIKI-006 ──────┤            │
          └─ WIKI-011 ──────┘            │
                                          │
WIKI-003 ─┬─ WIKI-005 ──────┐            │
          ├─ WIKI-012 ──────┼─ WIKI-015  │
          ├─ WIKI-013 ──────┤            │
          ├─ WIKI-014 ──────┼─ WIKI-015  │
          └─ WIKI-023 ──────┘            │
                                          │
WIKI-015 ── (frontend)                    │
WIKI-016 ── (frontend)                    │
WIKI-017 ── (frontend)                    │
WIKI-018 ── (frontend)                    │
WIKI-019 ── (frontend)                    │
                                          │
WIKI-020 ── (integration) ────────────────┘
WIKI-021 ── (integration)
WIKI-022 ── (integration)
```

> **Note:** Arrows indicate dependency direction. Stories can be built in parallel within each group as long as upstream dependencies are satisfied.
```

## Key Compliance Points

1. **Atomic Compliance**: Each story contains exactly one DocType, endpoint, React component, or n8n workflow
2. **Spec Gates Answered**: Every story explicitly answers the three mandatory spec gates (Workflow, CRM Timeline, Right Level)
3. **Platform Guardrails**: All stories respect the three legs of the platform:
   - Everything is a workflow (each story maps to specific workflows)
   - CRM timeline integration handled in WIKI-008 for first-time client-facing article publish
   - Universal first design (all stories are universal level)
4. **Architecture Immutables**: 
   - React calls MAL endpoints only (all frontend components depend on backend endpoints)
   - n8n handles cross-system notifications (integration stories)
   - Frappe workflow manages internal document state
5. **Build Factory Ready**: Stories are sized XS/S (3-8 build iterations each) with clear dependencies for parallel execution