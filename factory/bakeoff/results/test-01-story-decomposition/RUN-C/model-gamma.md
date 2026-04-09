model: model-gamma
test: 01-story-decomposition
run: C
date: 2026-04-09

```markdown
# Knowledge Base Wiki — Atomic Stories

## Stories

### WIKI-001
| Field | Value |
|-------|-------|
| **Title** | SM Article DocType |
| **Category** | BACKEND |
| **Size** | S |
| **Description** | Create `SM Article` DocType with all fields for article lifecycle, visibility, and metadata tracking. |
| **Dependencies** | None |
| **Workflow** | Article lifecycle workflow (Draft → Published/Archived, Draft → Under Review → Published/Rejected) |
| **CRM Timeline** | N/A — Internal document management with no customer interaction. |
| **Right Level** | Universal — available to all verticals. |

### WIKI-002
| Field | Value |
|-------|-------|
| **Title** | SM Article Version DocType |
| **Category** | BACKEND |
| **Size** | XS |
| **Description** | Create `SM Article Version` DocType for version-history snapshots with article_id, version_number, body_html, saved_by, saved_at, word_count. |
| **Dependencies** | WIKI-001 |
| **Workflow** | Version history workflow — every body save creates a snapshot; restore creates new version without deleting history. |
| **CRM Timeline** | N/A — internal audit trail for document integrity, not a customer interaction. |
| **Right Level** | Universal. |

### WIKI-003
| Field | Value |
|-------|-------|
| **Title** | SM Wiki Category DocType |
| **Category** | BACKEND |
| **Size** | XS |
| **Description** | Create `SM Wiki Category` DocType with hierarchy (up to 2 levels), default_visibility, slug, description, is_active. |
| **Dependencies** | None |
| **Workflow** | Category management workflow — admins create/manage category hierarchy; articles belong to exactly one category. |
| **CRM Timeline** | N/A — structural taxonomy, not a customer interaction. |
| **Right Level** | Universal. |

### WIKI-004
| Field | Value |
|-------|-------|
| **Title** | Article Create & Read API Endpoints |
| **Category** | BACKEND |
| **Size** | S |
| **Description** | `POST /api/modules/wiki/article/create` (saves as Draft) and `GET /api/modules/wiki/article/{id}`. |
| **Dependencies** | WIKI-001, WIKI-003 |
| **Workflow** | Article creation — staff creates a Draft article; later reads it back for editing. |
| **CRM Timeline** | N/A — Draft creation is internal authoring work, not a customer-facing event. |
| **Right Level** | Universal. |

### WIKI-005
| Field | Value |
|-------|-------|
| **Title** | Article Update API Endpoint (with Version Creation) |
| **Category** | BACKEND |
| **Size** | S |
| **Description** | `PUT /api/modules/wiki/article/{id}/update` — updates body and metadata, automatically creates a new `SM Article Version` snapshot. |
| **Dependencies** | WIKI-001, WIKI-002, WIKI-004 |
| **Workflow** | Article editing workflow — each save preserves a versioned snapshot for audit and restore. |
| **CRM Timeline** | N/A — editing internal documentation, not a customer interaction. |
| **Right Level** | Universal. |

### WIKI-006
| Field | Value |
|-------|-------|
| **Title** | Submit-for-Review API Endpoint |
| **Category** | BACKEND |
| **Size** | XS |
| **Description** | `PUT /api/modules/wiki/article/{id}/submit-for-review` — transitions client-facing Draft → Under Review, records submitted_at. |
| **Dependencies** | WIKI-001, WIKI-004 |
| **Workflow** | Client-facing article approval workflow — moves article into admin review queue. |
| **CRM Timeline** | N/A — administrative workflow event, not customer interaction. |
| **Right Level** | Universal. |

### WIKI-007
| Field | Value |
|-------|-------|
| **Title** | Article Approve/Publish API Endpoint |
| **Category** | BACKEND |
| **Size** | S |
| **Description** | `PUT /api/modules/wiki/article/{id}/publish` — for client-facing: Under Review → Published (sets last_published_at, reviewer); for internal: Draft → Published (self-publish). Only admins can execute. |
| **Dependencies** | WIKI-001, WIKI-004, WIKI-006 |
| **Workflow** | Publishing workflow — admin publishes approved client-facing articles or self-publishes internal ones. |
| **CRM Timeline** | For first-time publish of a client-facing article: write a practice-level activity log entry (not client-specific). N/A for subsequent publishes and internal articles. |
| **Right Level** | Universal. |

### WIKI-008
| Field | Value |
|-------|-------|
| **Title** | Article Reject API Endpoint |
| **Category** | BACKEND |
| **Size** | XS |
| **Description** | `PUT /api/modules/wiki/article/{id}/reject` — transitions Under Review → Draft, captures rejection_notes, requires admin role. |
| **Dependencies** | WIKI-001, WIKI-004, WIKI-006 |
| **Workflow** | Article review rejection — admin sends client-facing article back to Draft with feedback. |
| **CRM Timeline** | N/A — internal review action, not customer interaction. |
| **Right Level** | Universal. |

### WIKI-009
| Field | Value |
|-------|-------|
| **Title** | Article Archive API Endpoint |
| **Category** | BACKEND |
| **Size** | XS |
| **Description** | `PUT /api/modules/wiki/article/{id}/archive` — transitions Published → Archived; archived articles excluded from search/browse but accessible via direct link to authorized staff. |
| **Dependencies** | WIKI-001, WIKI-004, WIKI-007 |
| **Workflow** | Article archiving — admin removes published article from active circulation; terminal state for display. |
| **CRM Timeline** | N/A — lifecycle event, not customer interaction. |
| **Right Level** | Universal. |

### WIKI-010
| Field | Value |
|-------|-------|
| **Title** | Article Version History & Restore Endpoints |
| **Category** | BACKEND |
| **Size** | S |
| **Description** | `GET /api/modules/wiki/article/{id}/versions` and `POST /api/modules/wiki/article/{id}/restore/{version_number}` — list versions and restore (creates new version, preserves history). |
| **Dependencies** | WIKI-001, WIKI-002, WIKI-004, WIKI-005 |
| **Workflow** | Version history workflow — admin views snapshots and restores prior content, creating a new version. |
| **CRM Timeline** | N/A — historical audit operation, not customer interaction. |
| **Right Level** | Universal. |

### WIKI-011
| Field | Value |
|-------|-------|
| **Title** | Article List & Search API Endpoint |
| **Category** | BACKEND |
| **Size** | S |
| **Description** | `GET /api/modules/wiki/articles` — paginated list with filters (category, visibility, status, full-text search); role-aware filtering (staff see internal + client-facing; clients see client-facing only). |
| **Dependencies** | WIKI-001, WIKI-003 |
| **Workflow** | Article discovery — staff and clients search and browse articles they're permitted to see. |
| **CRM Timeline** | N/A — read-only access, creates no side effects. |
| **Right Level** | Universal. |

### WIKI-012
| Field | Value |
|-------|-------|
| **Title** | Category Create API Endpoint |
| **Category** | BACKEND |
| **Size** | XS |
| **Description** | `POST /api/modules/wiki/category/create` — creates a category with name, parent, slug, description, default_visibility, is_active; validates ≤2 levels deep. |
| **Dependencies** | WIKI-003 |
| **Workflow** | Category creation — admin builds taxonomy hierarchy for article organization. |
| **CRM Timeline** | N/A — structural operation, not customer interaction. |
| **Right Level** | Universal. |

### WIKI-013
| Field | Value |
|-------|-------|
| **Title** | Category Update API Endpoint |
| **Category** | BACKEND |
| **Size** | XS |
| **Description** | `PUT /api/modules/wiki/category/{id}/update` — edits name, parent, description, default_visibility, is_active; validates hierarchy constraints. |
| **Dependencies** | WIKI-003, WIKI-012 |
| **Workflow** | Category maintenance — admin modifies existing taxonomy nodes. |
| **CRM Timeline** | N/A — structural operation. |
| **Right Level** | Universal. |

### WIKI-014
| Field | Value |
|-------|-------|
| **Title** | Category List API Endpoint |
| **Category** | BACKEND |
| **Size** | XS |
| **Description** | `GET /api/modules/wiki/categories` — returns full category tree as hierarchical structure for UI rendering. |
| **Dependencies** | WIKI-003 |
| **Workflow** | Category browsing — enables navigation and filtering by category. |
| **CRM Timeline** | N/A — read-only query. |
| **Right Level** | Universal. |

### WIKI-015
| Field | Value |
|-------|-------|
| **Title** | ArticleEditor Frontend Component |
| **Category** | FRONTEND |
| **Size** | S |
| **Description** | React JSX component — rich text editor with title input, category selector, visibility toggle (internal/client), and Save Draft + Submit for Review controls; calls WIKI-004 and WIKI-005. |
| **Dependencies** | WIKI-004, WIKI-005, WIKI-011 |
| **Workflow** | Article authoring — staff member composes and saves articles as Drafts. |
| **CRM Timeline** | N/A — UI component only; backend handles timeline writes. |
| **Right Level** | Universal. |

### WIKI-016
| Field | Value |
|-------|-------|
| **Title** | ArticleViewer Frontend Component |
| **Category** | FRONTEND |
| **Size** | XS |
| **Description** | React JSX component — renders a published article with metadata (author, last_published_at, reviewer, version info); read-only surface for clients and staff. |
| **Dependencies** | WIKI-004, WIKI-010 |
| **Workflow** | Article consumption — clients view client-facing articles in Help section; staff view any published article. |
| **CRM Timeline** | N/A — read-only display does not generate timeline entries. |
| **Right Level** | Universal (rendered in client portal Help section for client-level context). |

### WIKI-017
| Field | Value |
|-------|-------|
| **Title** | ArticleList Frontend Component |
| **Category** | FRONTEND |
| **Size** | S |
| **Description** | React JSX component — searchable, filterable article list with status badges (Draft/Under Review/Published/Archived), category filter, and visibility toggle. |
| **Dependencies** | WIKI-011, WIKI-014 |
| **Workflow** | Article discovery and management — staff browse, search, and manage article status at a glance. |
| **CRM Timeline** | N/A — UI component only. |
| **Right Level** | Universal. |

### WIKI-018
| Field | Value |
|-------|-------|
| **Title** | CategoryTree Frontend Component |
| **Category** | FRONTEND |
| **Size** | XS |
| **Description** | React JSX component — collapsible 2-level category hierarchy browser used in editor, list, and portal surfaces. |
| **Dependencies** | WIKI-014 |
| **Workflow** | Category navigation — provides browse-by-category capability across all Wiki surfaces. |
| **CRM Timeline** | N/A — UI component only. |
| **Right Level** | Universal. |

### WIKI-019
| Field | Value |
|-------|-------|
| **Title** | VersionHistoryPanel Frontend Component |
| **Category** | FRONTEND |
| **Size** | XS |
| **Description** | React JSX component — side panel listing article versions with saved_by, saved_at, word_count diff, and Restore button; calls WIKI-010. Admin-only. |
| **Dependencies** | WIKI-010, WIKI-004 |
| **Workflow** | Version audit & restore — admin reviews change history and reverts to prior versions. |
| **CRM Timeline** | N/A — UI component only. |
| **Right Level** | Universal. |

### WIKI-020
| Field | Value |
|-------|-------|
| **Title** | n8n: Article Approval/Rejection Notification |
| **Category** | INTEGRATION |
| **Size** | S |
| **Description** | n8n workflow triggered by status change on client-facing articles — sends notification to author on approval or rejection; uses platform notification channel. |
| **Dependencies** | WIKI-007, WIKI-008, WIKI-001 |
| **Workflow** | Author feedback loop — author learns outcome of their client-facing article submission. |
| **CRM Timeline** | N/A — n8n sends notifications; the publish endpoint (WIKI-007) handles any CRM timeline writes per its gate. |
| **Right Level** | Universal. |

### WIKI-021
| Field | Value |
|-------|-------|
| **Title** | n8n: Admin Notification on Client-Facing Article Publish |
| **Category** | INTEGRATION |
| **Size** | XS |
| **Description** | n8n workflow triggered when client-facing article transitions to Published — notifies all admins for QA awareness. |
| **Dependencies** | WIKI-007, WIKI-001 |
| **Workflow** | QA awareness workflow — admins monitor what client-facing content is live. |
| **CRM Timeline** | N/A — notification workflow; CRM activity log entry written by WIKI-007 on first publish. |
| **Right Level** | Universal. |

### WIKI-022
| Field | Value |
|-------|-------|
| **Title** | n8n: SOP Mojo Status-Change Flag |
| **Category** | INTEGRATION |
| **Size** | XS |
| **Description** | n8n workflow triggered on client-facing article status change — sends passive flag to SOP Mojo via n8n webhook; never writes to SOPs. |
| **Dependencies** | WIKI-006, WIKI-007, WIKI-008, SOP-MOJO-webhook-defined |
| **Workflow** | SOP linkage awareness — SOP Mojo flagged for linked-article review when status changes. Wiki never calls SOP directly. |
| **CRM Timeline** | N/A — cross-system flag, not customer interaction. |
| **Right Level** | Universal. |
```

```markdown
# Knowledge Base Wiki — Dependency Graph

## Build Order & Parallel Groups

```
GROUP 0 (Foundation — parallel)
├─ WIKI-001  SM Article DocType
├─ WIKI-002  SM Article Version DocType          (depends on WIKI-001)
├─ WIKI-003  SM Wiki Category DocType

GROUP 1 (Core Backend — parallel after G0)
├─ WIKI-004  Article Create & Read Endpoints      (→ WIKI-001, WIKI-003)
├─ WIKI-011  Article List & Search Endpoint        (→ WIKI-001, WIKI-003)
├─ WIKI-012  Category Create Endpoint              (→ WIKI-003)
├─ WIKI-013  Category Update Endpoint              (→ WIKI-003, WIKI-012)
├─ WIKI-014  Category List Endpoint                (→ WIKI-003)

GROUP 2 (Workflow Backend — depends on G1)
├─ WIKI-005  Article Update (with Version)         (→ WIKI-001, WIKI-002, WIKI-004)
├─ WIKI-006  Submit-for-Review Endpoint            (→ WIKI-001, WIKI-004)
├─ WIKI-007  Approve/Publish Endpoint              (→ WIKI-001, WIKI-004, WIKI-006)
├─ WIKI-008  Reject Endpoint                       (→ WIKI-001, WIKI-004, WIKI-006)
├─ WIKI-009  Archive Endpoint                      (→ WIKI-001, WIKI-004, WIKI-007)
├─ WIKI-010  Version History & Restore             (→ WIKI-001, WIKI-002, WIKI-004, WIKI-005)

GROUP 3 (Frontend — depends on G1 + G2)
├─ WIKI-015  ArticleEditor                        (→ WIKI-004, WIKI-005, WIKI-011)
├─ WIKI-016  ArticleViewer                        (→ WIKI-004, WIKI-010)
├─ WIKI-017  ArticleList                          (→ WIKI-011, WIKI-014)
├─ WIKI-018  CategoryTree                         (→ WIKI-014)
├─ WIKI-019  VersionHistoryPanel                  (→ WIKI-010, WIKI-004)

GROUP 4 (n8n Integrations — depends on G2)
├─ WIKI-020  Author Approval/Rejection Notification (→ WIKI-007, WIKI-008, WIKI-001)
├─ WIKI-021  Admin Publish Notification            (→ WIKI-007, WIKI-001)
├─ WIKI-022  SOP Mojo Status-Change Flag           (→ WIKI-006, WIKI-007, WIKI-008, SOP-MOJO-webhook-defined)
```

## Execution Notes

- **GROUP 0** must complete before any other group. WIKI-001, WIKI-002, and WIKI-003 can build in parallel once the DocType specs are written.
- **GROUP 1** unlocks all REST routes that do not require state transitions. All five can build in parallel.
- **GROUP 2** implements the state-machine transitions. WIKI-007 and WIKI-008 both depend on WIKI-006 (submit-for-review must exist before approve/reject can transition from Under Review). WIKI-010 depends on WIKI-005 because restoring versions requires the version-snapshot mechanism.
- **GROUP 3** frontend components are all parallelizable once their endpoint dependencies land. No component depends on another component.
- **GROUP 4** n8n workflows are all parallelizable; each reacts to state changes produced by GROUP 2 endpoints. WIKI-022 requires SOP Mojo's inbound webhook to be defined first (document as `SOP-MOJO-webhook-defined` dependency).
- All groups respect the platform rule: **Frappe `transition_state()` manages internal document state; n8n manages cross-system actions triggered by state changes.** No endpoint calls n8n directly; n8n workflows poll/listen for DocType state changes.
```