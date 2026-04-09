model: model-delta
test: 01-story-decomposition
run: C
date: 2026-04-09
JAMES NOTE: THIS MODEL DID NOT PRODUCE THE FILES ON THE FIRST TRY. IT REASONED FOR 20 MIN+ THEN SAID "PRODUCING MD FILES" AND STOPPED. TRIED ON SEVERAL PROVIDERS TO SEE IF IT WAS A PROVIDER ISSUE BUT SAME RESULTS. PROMPTED IT AGAIN EXPLICITLY SAYING TO PRODUCE THE OUTPUT IN THE CHAT WINDOW AND AFTER 4 MORE TRIES, IT COMPLETED THE TASK. 

# STORIES.md — Knowledge Base Wiki (KB/Wiki Mojo)

---

## Story Index

| ID | Title | Category | Size |
|---|---|---|---|
| WIKI-001 | SM Wiki Category DocType | BACKEND | XS |
| WIKI-002 | SM Article DocType | BACKEND | S |
| WIKI-003 | SM Article Version DocType | BACKEND | XS |
| WIKI-004 | SM Article Status Lifecycle — Frappe Workflow Configuration | CONFIG | XS |
| WIKI-005 | Create Article Endpoint | BACKEND | S |
| WIKI-006 | Get Article Endpoint | BACKEND | XS |
| WIKI-007 | Update Article Endpoint | BACKEND | S |
| WIKI-008 | Submit Article for Review Endpoint | BACKEND | XS |
| WIKI-009 | Publish Article Endpoint | BACKEND | S |
| WIKI-010 | Reject Article Endpoint | BACKEND | XS |
| WIKI-011 | Archive Article Endpoint | BACKEND | XS |
| WIKI-012 | Get Article Version History Endpoint | BACKEND | XS |
| WIKI-013 | Restore Article Version Endpoint | BACKEND | S |
| WIKI-014 | List and Search Articles Endpoint | BACKEND | S |
| WIKI-015 | Create Category Endpoint | BACKEND | XS |
| WIKI-016 | Update Category Endpoint | BACKEND | XS |
| WIKI-017 | List Categories Endpoint | BACKEND | XS |
| WIKI-018 | ArticleEditor React Component | FRONTEND | S |
| WIKI-019 | ArticleViewer React Component | FRONTEND | S |
| WIKI-020 | ArticleList React Component | FRONTEND | S |
| WIKI-021 | CategoryTree React Component | FRONTEND | S |
| WIKI-022 | VersionHistoryPanel React Component | FRONTEND | S |
| WIKI-023 | Client Portal Help Section Surface | GLUE | XS |
| WIKI-024 | n8n — Author Notification on Article Approval or Rejection | INTEGRATION | XS |
| WIKI-025 | n8n — Admin Notification on Client-Facing Article Publish | INTEGRATION | XS |
| WIKI-026 | n8n — SOP Mojo Status Change Notification | INTEGRATION | XS |
| WIKI-027 | n8n — Practice-Level CRM Activity Log on First Client Article Publish | INTEGRATION | XS |

---

## Full Story Specifications

---

### WIKI-001 — SM Wiki Category DocType

**Category:** BACKEND | **Size:** XS

**Description:** Define and register the `SM Wiki Category` DocType with all required fields: `name` (Data), `parent_category` (Link → SM Wiki Category, optional, enables 2-level hierarchy via self-referential link), `slug` (Data, auto-generated, unique), `description` (Text), `default_visibility` (Select: internal|client), `is_active` (Check, default true). Field naming and prefix follow SM conventions. No more than 2 levels of nesting are enforced by field validation.

**Dependencies:** None

**Spec Gates:**
- **Workflow:** Serves Category Management (Workflow 5). Categories are the organizational backbone for all articles and must exist before any article can be created.
- **CRM Timeline:** N/A — Category creation is internal operational configuration. No client record or customer interaction is involved at any point.
- **Right Level:** Universal. Any vertical using the Wiki Mojo requires category organization. No vertical-specific fields exist at this layer.

---

### WIKI-002 — SM Article DocType

**Category:** BACKEND | **Size:** S

**Description:** Define and register the `SM Article` DocType with all required fields: `title` (Data), `slug` (Data, auto-generated from title, unique), `body_html` (Long Text), `category` (Link → SM Wiki Category, required), `visibility` (Select: internal|client), `status` (Select: draft|under_review|published|archived, default draft), `author` (Link → User, set on create), `reviewer` (Link → User, nullable), `rejection_notes` (Text, nullable), `last_published_at` (Datetime, nullable). Includes field-level permissions: `rejection_notes` writable by admin only; `reviewer` set by workflow. All naming follows SM prefix and Frappe field conventions.

**Dependencies:** WIKI-001

**Spec Gates:**
- **Workflow:** Serves Article Creation (Workflow 1) and every downstream lifecycle workflow. This is the primary record for the entire capability — all other stories read from or write to it.
- **CRM Timeline:** N/A — The article is an internal operational record, not a client record. The one CRM write in this capability (first-publish event) is handled by WIKI-027 via n8n, not at the DocType layer.
- **Right Level:** Universal. All verticals using the Wiki Mojo share this schema without modification. Visibility and category settings are the configuration levers.

---

### WIKI-003 — SM Article Version DocType

**Category:** BACKEND | **Size:** XS

**Description:** Define and register the `SM Article Version` DocType with fields: `article` (Link → SM Article, required), `version_number` (Int, required), `body_html` (Long Text, required), `saved_by` (Link → User), `saved_at` (Datetime), `word_count` (Int, computed on save). This DocType is append-only: no role is granted update or delete permissions. Records are created programmatically on every article body save.

**Dependencies:** WIKI-002

**Spec Gates:**
- **Workflow:** Serves Version History (Workflow 4). Every body save on SM Article produces one SM Article Version record. The restore workflow reads from this DocType.
- **CRM Timeline:** N/A — Version snapshots are internal audit history. No client interaction is captured here.
- **Right Level:** Universal. Version tracking behavior is identical across all verticals.

---

### WIKI-004 — SM Article Status Lifecycle — Frappe Workflow Configuration

**Category:** CONFIG | **Size:** XS

**Description:** Configure the Frappe Workflow on `SM Article` implementing the full state machine per the spec lifecycle. Transitions: (A) `draft` → `published` for internal articles — permitted by author and admin roles; (B) `draft` → `under_review` for client-facing articles — permitted by author; (C) `under_review` → `published` — permitted by admin only; (D) `under_review` → `draft` (rejection) — permitted by admin only; (E) `published` → `archived` — permitted by admin only. Sets `status` as the workflow state field. All transitions managed via Frappe's `transition_state()`. No external system calls from within the workflow — n8n handles all external actions triggered by state changes per platform boundary rule.

**Dependencies:** WIKI-002

**Spec Gates:**
- **Workflow:** Serves Article Publishing — Internal (Workflow 2), Article Publishing — Client-Facing (Workflow 3), and Article Archiving (Workflow 7). This configuration IS the state machine that all lifecycle endpoint stories call into.
- **CRM Timeline:** N/A — This is internal Frappe state configuration. External actions triggered by state changes are handled by dedicated n8n integration stories (WIKI-024 through WIKI-027).
- **Right Level:** Universal. The lifecycle logic and permitted transitions are identical across all business verticals using the Wiki Mojo.

---

### WIKI-005 — Create Article Endpoint

**Category:** BACKEND | **Size:** S

**Description:** Implement `POST /api/modules/wiki/article/create` on the Mojo Abstraction Layer. Accepts: `title` (required), `body_html` (required), `category` (required, Link → SM Wiki Category), `visibility` (required: internal|client). Creates `SM Article` with `status: draft` and `author` set to the calling user. Immediately creates the first `SM Article Version` record with `version_number: 1`, `body_html`, `saved_by`, `saved_at`, and computed `word_count`. Returns: new article `id`, `slug`, `status`, `version_number`. Rejects if category does not exist or is inactive.

**Dependencies:** WIKI-002, WIKI-003

**Spec Gates:**
- **Workflow:** Serves Article Creation (Workflow 1). This is the sole entry point for all new knowledge base content.
- **CRM Timeline:** N/A — Draft creation is an internal staff action. No client-facing event occurs at article creation time.
- **Right Level:** Universal. Any vertical's staff can create articles; the visibility setting controls all client-facing exposure without vertical-specific code.

---

### WIKI-006 — Get Article Endpoint

**Category:** BACKEND | **Size:** XS

**Description:** Implement `GET /api/modules/wiki/article/{id}` on the Mojo Abstraction Layer. Returns full article record: `title`, `slug`, `body_html`, `category`, `visibility`, `status`, `author`, `reviewer`, `rejection_notes`, `last_published_at`, and current `version_number` (derived from most recent SM Article Version record). Role-aware access control: callers with the client role may only retrieve articles with `status: published` AND `visibility: client`. Staff callers may retrieve any article they have access to, including drafts they authored. Returns 403 for unauthorized access attempts.

**Dependencies:** WIKI-002

**Spec Gates:**
- **Workflow:** Serves Article Creation (read-back after save), the review workflow (load article for reviewer), and Client Portal Surface (Workflow 8, article render).
- **CRM Timeline:** N/A — Read-only retrieval. No event is generated by a read operation.
- **Right Level:** Universal. Role-aware filtering is enforced at the MAL layer with no vertical-specific logic.

---

### WIKI-007 — Update Article Endpoint

**Category:** BACKEND | **Size:** S

**Description:** Implement `PUT /api/modules/wiki/article/{id}/update` on the Mojo Abstraction Layer. Accepts: `body_html` (optional), `title` (optional), `category` (optional), `visibility` (optional). Validates article is in `draft` or `under_review` status — published and archived articles cannot be edited via this endpoint. Saves changes to `SM Article`. If `body_html` is included in the payload, creates a new `SM Article Version` record (auto-incremented `version_number`, captures `body_html`, `saved_by`, `saved_at`, `word_count`). Metadata-only updates (title, category, visibility) do not create a new version. Returns updated article and new `version_number` if a version was created.

**Dependencies:** WIKI-002, WIKI-003

**Spec Gates:**
- **Workflow:** Serves Article Creation edit cycle (Workflow 1) and Version History snapshot-on-save (Workflow 4).
- **CRM Timeline:** N/A — Internal edit action with no client-facing event. Version history is captured in SM Article Version, not the CRM timeline.
- **Right Level:** Universal. Save-and-version logic is identical across all verticals.

---

### WIKI-008 — Submit Article for Review Endpoint

**Category:** BACKEND | **Size:** XS

**Description:** Implement `PUT /api/modules/wiki/article/{id}/submit-for-review` on the Mojo Abstraction Layer. Validates: (1) article `status` is `draft`; (2) article `visibility` is `client` — internal articles cannot and must never enter the review queue. Calls `transition_state()` to move `status` from `draft` → `under_review`. Returns updated article. Returns 422 with clear error message if called on an internal-visibility article.

**Dependencies:** WIKI-002, WIKI-004

**Spec Gates:**
- **Workflow:** Serves Article Publishing — Client-Facing (Workflow 3). This is the mandatory first step any client-visible article must pass through before it can be published.
- **CRM Timeline:** N/A — Submission to review is a staff-to-admin internal handoff. No client interaction.
- **Right Level:** Universal. All verticals with client-facing knowledge content enforce the same review gate without vertical-specific logic.

---

### WIKI-009 — Publish Article Endpoint

**Category:** BACKEND | **Size:** S

**Description:** Implement `PUT /api/modules/wiki/article/{id}/publish` on the Mojo Abstraction Layer. Admin role only. Handles two valid paths: (A) internal articles in `draft` status — publishes directly; (B) client-facing articles in `under_review` status — requires admin role and sets `reviewer` to calling user. Calls `transition_state()` to move `status` → `published`. Sets `last_published_at` to current datetime. If `last_published_at` was null before this call (first-ever publish), sets `is_first_publish: true` in the response payload — this flag is the trigger signal for WIKI-027. Clears `rejection_notes`. Returns updated article including `is_first_publish` boolean.

**Dependencies:** WIKI-002, WIKI-004

**Spec Gates:**
- **Workflow:** Serves Article Publishing — Internal (Workflow 2) and Article Publishing — Client-Facing (Workflow 3). This endpoint closes both publishing paths.
- **CRM Timeline:** N/A directly from this endpoint. On first publish of a client-facing article, WIKI-027 (n8n) writes the practice-level CRM activity log. The `is_first_publish` flag in this response payload is the detection mechanism for that workflow.
- **Right Level:** Universal. Dual-path logic is role-aware and visibility-aware, not vertical-aware.

---

### WIKI-010 — Reject Article Endpoint

**Category:** BACKEND | **Size:** XS

**Description:** Implement `PUT /api/modules/wiki/article/{id}/reject` on the Mojo Abstraction Layer. Admin role only. Accepts: `rejection_notes` (required, must be non-empty string). Validates article is in `under_review` status. Calls `transition_state()` to move `status` from `under_review` → `draft`. Writes `rejection_notes` to the article record. Returns updated article with populated `rejection_notes`. Returns 422 if `rejection_notes` is missing or blank.

**Dependencies:** WIKI-002, WIKI-004

**Spec Gates:**
- **Workflow:** Serves Article Publishing — Client-Facing (Workflow 3), specifically the rejection branch: Under Review → Draft with mandatory comments.
- **CRM Timeline:** N/A — Article rejection is a staff-to-staff internal action. No client involvement at any stage of this transition.
- **Right Level:** Universal. Rejection behavior and the mandatory notes requirement are identical across all verticals.

---

### WIKI-011 — Archive Article Endpoint

**Category:** BACKEND | **Size:** XS

**Description:** Implement `PUT /api/modules/wiki/article/{id}/archive` on the Mojo Abstraction Layer. Admin role only. Validates article is in `published` status — only published articles can be archived. Calls `transition_state()` to move `status` → `archived`. Returns updated article. Archived articles are excluded from all search and category browse responses. Archived articles remain retrievable via direct `GET /api/modules/wiki/article/{id}` call for authorized staff. `archived` is a terminal display state; version history is fully preserved.

**Dependencies:** WIKI-002, WIKI-004

**Spec Gates:**
- **Workflow:** Serves Article Archiving (Workflow 7). Removes stale content from active surfaces without destroying history.
- **CRM Timeline:** N/A — Article archiving is internal operational maintenance with no client-facing event.
- **Right Level:** Universal. Archive behavior is identical across all verticals.

---

### WIKI-012 — Get Article Version History Endpoint

**Category:** BACKEND | **Size:** XS

**Description:** Implement `GET /api/modules/wiki/article/{id}/versions` on the Mojo Abstraction Layer. Staff access only — client-role callers receive 403. Returns an ordered list (descending by `version_number`) of all `SM Article Version` records for the given article. Each item includes: `version_number`, `saved_by` (user display name), `saved_at`, `word_count`. `body_html` is excluded from the list response for performance. Admin-role callers receive an additional `can_restore: true` boolean per version item to drive the VersionHistoryPanel UI affordance.

**Dependencies:** WIKI-003

**Spec Gates:**
- **Workflow:** Serves Version History (Workflow 4). Provides the version list that enables the restore decision.
- **CRM Timeline:** N/A — Read-only history retrieval. No event is generated by a read operation.
- **Right Level:** Universal. Version history is internal operational tooling with no vertical-specific behavior.

---

### WIKI-013 — Restore Article Version Endpoint

**Category:** BACKEND | **Size:** S

**Description:** Implement `POST /api/modules/wiki/article/{id}/restore/{version_number}` on the Mojo Abstraction Layer. Admin role only. Fetches `body_html` from the specified `SM Article Version` record. Validates the version belongs to the given article. Writes the fetched `body_html` to the current `SM Article.body_html`, which triggers the update path and creates a new `SM Article Version` record (the restore event is itself a new version in history — existing version history is never deleted or modified). Returns the updated article and the new `version_number` created by the restore operation.

**Dependencies:** WIKI-002, WIKI-003

**Spec Gates:**
- **Workflow:** Serves Version History (Workflow 4). This is the restore action that closes the version history workflow loop. Per spec: restoring creates a new version; it does not delete history.
- **CRM Timeline:** N/A — Restoring a version is an internal admin action. No client-facing event.
- **Right Level:** Universal. Version restore logic is identical across all verticals.

---

### WIKI-014 — List and Search Articles Endpoint

**Category:** BACKEND | **Size:** S

**Description:** Implement `GET /api/modules/wiki/articles` on the Mojo Abstraction Layer. Accepts query parameters: `category` (slug, optional), `visibility` (internal|client, optional), `status` (draft|under_review|published|archived, optional), `search` (full-text string against `title` and `body_html`, optional), `page` and `page_size` for pagination. Role-aware filtering enforced at MAL: staff see all published articles they have access to plus their own drafts in any status; client-role callers are restricted to `status: published` AND `visibility: client` regardless of query parameters. Archived articles are excluded by default unless `status=archived` is explicitly passed by a staff caller. Returns paginated list of article summaries (no `body_html` in list items).

**Dependencies:** WIKI-002

**Spec Gates:**
- **Workflow:** Serves Full-Text Search (Workflow 6), Category Browse (Workflow 5 read path), and Client Portal Surface (Workflow 8). This is the primary discovery and search endpoint for the entire capability.
- **CRM Timeline:** N/A — Search and list operations are reads. No CRM event is generated.
- **Right Level:** Universal. Role-aware filtering is enforced at the MAL layer. No vertical-specific filter logic exists.

---

### WIKI-015 — Create Category Endpoint

**Category:** BACKEND | **Size:** XS

**Description:** Implement `POST /api/modules/wiki/category/create` on the Mojo Abstraction Layer. Admin role only. Accepts: `name` (required), `parent_category` (optional Link → SM Wiki Category slug; if provided, validates that the parent has no parent of its own, enforcing 2-level maximum depth), `description` (optional), `default_visibility` (required: internal|client). Auto-generates `slug` from `name`. Creates `SM Wiki Category` with `is_active: true`. Returns created category including generated `slug`.

**Dependencies:** WIKI-001

**Spec Gates:**
- **Workflow:** Serves Category Management (Workflow 5). Categories must exist and be correctly configured before articles can be organized and surfaced.
- **CRM Timeline:** N/A — Category creation is internal operational configuration. No client record is involved.
- **Right Level:** Universal. Category management is a universal organizational construct across all verticals.

---

### WIKI-016 — Update Category Endpoint

**Category:** BACKEND | **Size:** XS

**Description:** Implement `PUT /api/modules/wiki/category/{id}/update` on the Mojo Abstraction Layer. Admin role only. Accepts: `name` (optional), `description` (optional), `default_visibility` (optional: internal|client), `is_active` (optional boolean). Parent category reassignment is not permitted via this endpoint — hierarchy is structure-on-create only. Before setting `is_active: false`, validates that no active `SM Article` records are assigned to this category; returns 422 with count of blocking articles if validation fails. Returns updated category.

**Dependencies:** WIKI-001

**Spec Gates:**
- **Workflow:** Serves Category Management (Workflow 5). Allows admins to maintain, rename, and deactivate categories as the knowledge base evolves.
- **CRM Timeline:** N/A — Internal operational configuration update. No client interaction.
- **Right Level:** Universal. Update logic and the no-orphan validation are identical across all verticals.

---

### WIKI-017 — List Categories Endpoint

**Category:** BACKEND | **Size:** XS

**Description:** Implement `GET /api/modules/wiki/categories` on the Mojo Abstraction Layer. Returns the full category hierarchy as a nested tree: root-level categories with a `children` array containing their child categories, up to 2 levels deep. Active categories only by default. Staff callers may pass `?include_inactive=true` to include inactive categories (admin management view). Role-aware: client-role callers receive only categories where at least one `SM Article` with `status: published` and `visibility: client` exists.

**Dependencies:** WIKI-001

**Spec Gates:**
- **Workflow:** Serves Category Management (Workflow 5, browse navigation), Full-Text Search (Workflow 6, category filter), and Client Portal Surface (Workflow 8, Help section navigation tree).
- **CRM Timeline:** N/A — Read-only retrieval. No event is generated.
- **Right Level:** Universal. Nested tree structure and role-aware filtering are consistent across all verticals.

---

### WIKI-018 — ArticleEditor React Component

**Category:** FRONTEND | **Size:** S

**Description:** Build `ArticleEditor.jsx`. Features: `title` input field; rich text `body_html` editor with SM-standard toolbar (bold, italic, headings, lists, links, code blocks); `category` selector (tree-dropdown populated by calling WIKI-017, displays hierarchy); `visibility` toggle (internal|client); action controls — "Save Draft" (calls WIKI-005 on new article, WIKI-007 on existing), "Submit for Review" (calls WIKI-008, visible only when `visibility` is `client` and `status` is `draft`). If article arrives with non-empty `rejection_notes` in `draft` status, displays a dismissible rejection notes banner above the editor. All colors via `var(--sm-*)` semantic tokens. All files `.jsx`, no TypeScript.

**Dependencies:** WIKI-005, WIKI-006, WIKI-007, WIKI-008, WIKI-017

**Spec Gates:**
- **Workflow:** Serves Article Creation (Workflow 1) and the submission step of Article Publishing — Client-Facing (Workflow 3).
- **CRM Timeline:** N/A — The editor is a staff-facing UI tool. CRM events are triggered at the backend state-change level, not at the UI component level.
- **Right Level:** Universal. The editor is identical for all verticals; category and visibility configuration drives any content differences.

---

### WIKI-019 — ArticleViewer React Component

**Category:** FRONTEND | **Size:** S

**Description:** Build `ArticleViewer.jsx`. Receives article data as props (does not fetch independently — parent is responsible for calling WIKI-006). Renders: article `title`; sanitized `body_html` (XSS-safe render); metadata bar showing `category` name, `last_published_at` formatted date, `reviewer` display name (if set), current `version_number`. Shows a `status` badge (draft/under_review/published/archived) for staff views; badge is hidden for client-role renders. All layout and color via `var(--sm-*)` tokens. No edit controls — viewer is strictly read-only.

**Dependencies:** WIKI-006

**Spec Gates:**
- **Workflow:** Serves Client Portal Surface (Workflow 8) as the primary article render component, and provides the read view for internal staff article consumption.
- **CRM Timeline:** N/A — Rendering an article is a read event. No CRM entry is generated for a page view.
- **Right Level:** Universal. Role-conditioned metadata display (badge shown/hidden) handles both staff and client views from one component via props.

---

### WIKI-020 — ArticleList React Component

**Category:** FRONTEND | **Size:** S

**Description:** Build `ArticleList.jsx`. Features: debounced search input (calls WIKI-014 with `search` param on 300ms debounce); category filter (pill group or dropdown, passes `category` slug to WIKI-014); status filter (staff only — hidden entirely for client-role renders via prop); paginated results list where each row shows `title`, `category` name, `last_published_at`, and a `status` badge using `var(--sm-*)` color tokens; empty state with copy; loading skeleton. Row click emits `onArticleSelect(id)` to parent — does not navigate internally. Pagination controls call WIKI-014 with `page` param.

**Dependencies:** WIKI-014

**Spec Gates:**
- **Workflow:** Serves Full-Text Search (Workflow 6), Category Browse (Workflow 5 read path), and Client Portal Surface (Workflow 8).
- **CRM Timeline:** N/A — List and search are read operations. No CRM event is generated.
- **Right Level:** Universal. Status filter visibility is toggled by a `isClientView` prop; no vertical-specific logic exists in the component.

---

### WIKI-021 — CategoryTree React Component

**Category:** FRONTEND | **Size:** S

**Description:** Build `CategoryTree.jsx`. Fetches from WIKI-017 on mount (or accepts categories as props for server-rendered contexts). Renders a collapsible two-level category hierarchy: parent nodes expand/collapse on click; child nodes are indented. Clicking any node emits `onCategorySelect(slug)` to parent for filtering purposes. Active/selected node is visually indicated using `var(--sm-*)` highlight token. For admin-role renders (controlled by `isAdmin` prop): each node shows an edit icon that opens a category management modal (modal spec is out of scope for this component — emits `onEditCategory(id)`); a root-level "Add Category" affordance emits `onAddCategory()`. Client-role renders show no admin affordances.

**Dependencies:** WIKI-017

**Spec Gates:**
- **Workflow:** Serves Category Management (Workflow 5, browse navigation), Full-Text Search (Workflow 6, category filter), and Client Portal Surface (Workflow 8, Help section navigation).
- **CRM Timeline:** N/A — Navigation component. No CRM event is generated by category browsing.
- **Right Level:** Universal. Admin affordances are gated by a prop; the component works for all verticals without modification.

---

### WIKI-022 — VersionHistoryPanel React Component

**Category:** FRONTEND | **Size:** S

**Description:** Build `VersionHistoryPanel.jsx`. Fetches version list from WIKI-012 on mount. Renders: ordered list (descending) of versions, each showing `version_number`, `saved_by` display name, `saved_at` formatted datetime, and `word_count`. Row click fetches and renders a read-only preview of that version's `body_html` in an adjacent preview pane (preview data included in a detail fetch or fetched inline). For admin-role renders (`can_restore: true` from WIKI-012 response): each row shows a "Restore this version" button that calls WIKI-013, then refreshes the article in the parent context via an `onRestoreComplete(newVersionNumber)` callback. Non-destructive: no version entries are removed from the list after a restore.

**Dependencies:** WIKI-012, WIKI-013

**Spec Gates:**
- **Workflow:** Serves Version History (Workflow 4). This component surfaces the full browse-and-restore workflow for admins.
- **CRM Timeline:** N/A — Version history browsing and restore are internal admin actions with no client-facing event.
- **Right Level:** Universal. Version history tooling is identical across all verticals.

---

### WIKI-023 — Client Portal Help Section Surface

**Category:** GLUE | **Size:** XS

**Description:** Wire `CategoryTree.jsx`, `ArticleList.jsx`, and `ArticleViewer.jsx` into the patient portal Help section page. The page shell calls WIKI-017 (categories, client-filtered) and initializes WIKI-014 (articles with `visibility=client&status=published`). `CategoryTree` renders on the left rail in client-role mode (no admin affordances). `ArticleList` renders client-filtered results in the main content area. Selecting an article renders `ArticleViewer` with the full article (calls WIKI-006). All staff-facing controls, status badges, and admin affordances are suppressed via `isClientView` props throughout. Uses the existing patient portal page shell and routing conventions — no new shell is built.

**Dependencies:** WIKI-019, WIKI-020, WIKI-021

**Spec Gates:**
- **Workflow:** Serves Client Portal Surface (Workflow 8). This is the only client-facing surface in the entire KB/Wiki capability.
- **CRM Timeline:** N/A — Reading help articles does not generate a client-specific CRM event. The portal surface is informational; individual article reads are not logged per the capability spec ("not a client-specific CRM timeline entry").
- **Right Level:** Universal. Any vertical's client portal uses the identical Help section surface. Content differences are driven by category configuration, not by code changes.

---

### WIKI-024 — n8n: Author Notification on Article Approval or Rejection

**Category:** INTEGRATION | **Size:** XS

**Description:** Build the n8n workflow triggered by a Frappe webhook on `SM Article` `after_save` when `status` transitions out of `under_review`. Two notification paths: (A) if new status is `published` — send approval notification to `author` user including article title and portal URL; (B) if new status is `draft` (rejection branch) — send rejection notification to `author` including article title and the full `rejection_notes` text. n8n reads the article record to determine which path applies. Does not modify any Frappe document. Does not call the Wiki MAL or any endpoint directly.

**Dependencies:** WIKI-009, WIKI-010

**Spec Gates:**
- **Workflow:** Serves Article Publishing — Client-Facing (Workflow 3). Closes the feedback loop to the article author on the admin's review decision.
- **CRM Timeline:** N/A — Author-to-author internal notification. No client is involved and no client CRM record is touched.
- **Right Level:** Universal. Notification logic is identical across all verticals. Message copy may be configured per practice via n8n template variables.

---

### WIKI-025 — n8n: Admin Notification on Client-Facing Article Publish

**Category:** INTEGRATION | **Size:** XS

**Description:** Build the n8n workflow triggered by a Frappe webhook on `SM Article` `after_save` when `status` transitions to `published` AND `visibility` is `client`. Sends a QA-awareness notification to all users holding the admin role for the practice. Notification includes: article title, category name, reviewer (approving admin) display name, publish timestamp, and a direct staff-side link to the article. Does not modify any Frappe document. Distinct from WIKI-024 (that story notifies the author; this story notifies all admins for QA awareness).

**Dependencies:** WIKI-009

**Spec Gates:**
- **Workflow:** Serves Article Publishing — Client-Facing (Workflow 3). QA awareness step ensuring all admins know when client-facing content goes live.
- **CRM Timeline:** N/A — Internal admin-to-admin notification. No client interaction is involved.
- **Right Level:** Universal. Admin notification behavior is consistent across all verticals without modification.

---

### WIKI-026 — n8n: SOP Mojo Status Change Notification

**Category:** INTEGRATION | **Size:** XS

**Description:** Build the n8n workflow triggered by a Frappe webhook on `SM Article` `after_save` when `visibility` is `client` and `status` has changed (any transition: draft→under_review, under_review→published, under_review→draft, published→archived). Sends a passive notification payload to SOP Mojo's internal notification channel containing: `article_id`, `article_title`, `old_status`, `new_status`, `changed_at`. SOP Mojo uses this signal to surface linked SOPs for human review on its own schedule. The Wiki never calls SOP Mojo directly — n8n is the sole intermediary per the SOP Connection boundary rule. Does not modify any Frappe document and does not write back to the Wiki in any form.

**Dependencies:** WIKI-008, WIKI-009, WIKI-010

**Spec Gates:**
- **Workflow:** Serves the SOP Connection boundary rule (Workflow 9 in the spec). This is a passive notification only — the Wiki owns zero SOP logic and has no awareness of what SOP Mojo does with the signal.
- **CRM Timeline:** N/A — System-to-system integration signal between two Mojo modules. No client interaction is involved at any point.
- **Right Level:** Universal. The boundary rule between Wiki and SOP Mojo is a platform-level architectural governance decision, not vertical-specific.

---

### WIKI-027 — n8n: Practice-Level CRM Activity Log on First Client Article Publish

**Category:** INTEGRATION | **Size:** XS

**Description:** Build the n8n workflow triggered by a Frappe webhook on `SM Article` `after_save` when `status` transitions to `published`, `visibility` is `client`, AND the article response data includes `is_first_publish: true` (the flag set by WIKI-009 when `last_published_at` transitions from null to a datetime value). On trigger, writes a practice-level activity log entry to the CRM with event type `wiki_article_first_published`, including: `article_title`, `category_name`, `author` display name, `published_at`. This is a practice-level log entry — it is written against the practice/tenant record, NOT against any individual client's CRM timeline. Does not modify the `SM Article` document.

**Dependencies:** WIKI-009

**Spec Gates:**
- **Workflow:** Serves Article Publishing — Client-Facing (Workflow 3), specifically the first-publication milestone event.
- **CRM Timeline:** Writes one practice-level `wiki_article_first_published` activity log entry on the first publish of any client-facing article. This is the sole CRM write in the entire KB/Wiki capability and satisfies the platform's mandatory CRM timeline contract. Per the research spec and platform guardrail: this is a practice-level operational log, not a client-specific CRM timeline entry. Subsequent publishes of the same article do not generate additional CRM entries.
- **Right Level:** Universal. The CRM activity log contract and its practice-level scope apply equally to all verticals using the Wiki Mojo.

---
---

# DEPENDENCY-GRAPH.md — Knowledge Base Wiki (KB/Wiki Mojo)

## Build Order: 5 Parallel Execution Waves

Stories within each wave have no dependencies on one another and may be built simultaneously. A wave may not begin until all stories in the preceding wave are complete.

---

### Wave 1 — Foundation
*No dependencies. Unblocks all downstream work.*

```
WIKI-001   SM Wiki Category DocType
```

---

### Wave 2 — Core Schema
*Requires Wave 1 complete. All four run in parallel.*

```
WIKI-002   SM Article DocType                   ← WIKI-001
WIKI-015   Create Category Endpoint             ← WIKI-001
WIKI-016   Update Category Endpoint             ← WIKI-001
WIKI-017   List Categories Endpoint             ← WIKI-001
```

---

### Wave 3 — Versioning, Lifecycle Config, Read Path, and Category UI
*Requires Wave 2 complete. All five run in parallel.*

```
WIKI-003   SM Article Version DocType           ← WIKI-002
WIKI-004   Frappe Workflow Configuration        ← WIKI-002
WIKI-006   Get Article Endpoint                 ← WIKI-002
WIKI-014   List and Search Articles Endpoint    ← WIKI-002
WIKI-021   CategoryTree React Component         ← WIKI-017
```

> **Note:** WIKI-021 (CategoryTree) can enter Wave 3 as soon as WIKI-017 (Wave 2) is done, even while other Wave 2 items are still in flight, since it has no dependency on WIKI-002.

---

### Wave 4 — Article Operations + Core Frontend Components
*Requires Wave 3 complete. All ten run in parallel.*

```
WIKI-005   Create Article Endpoint              ← WIKI-002, WIKI-003
WIKI-007   Update Article Endpoint              ← WIKI-002, WIKI-003
WIKI-008   Submit for Review Endpoint           ← WIKI-002, WIKI-004
WIKI-009   Publish Article Endpoint             ← WIKI-002, WIKI-004
WIKI-010   Reject Article Endpoint              ← WIKI-002, WIKI-004
WIKI-011   Archive Article Endpoint             ← WIKI-002, WIKI-004
WIKI-012   Get Version History Endpoint         ← WIKI-003
WIKI-013   Restore Article Version Endpoint     ← WIKI-002, WIKI-003
WIKI-019   ArticleViewer React Component        ← WIKI-006
WIKI-020   ArticleList React Component          ← WIKI-014
```

---

### Wave 5 — Frontend Assembly + All Integrations
*Requires Wave 4 complete. All seven run in parallel.*

```
WIKI-018   ArticleEditor React Component        ← WIKI-005, WIKI-006, WIKI-007, WIKI-008, WIKI-017
WIKI-022   VersionHistoryPanel React Component  ← WIKI-012, WIKI-013
WIKI-023   Client Portal Help Section Surface   ← WIKI-019, WIKI-020, WIKI-021
WIKI-024   n8n Author Notification              ← WIKI-009, WIKI-010
WIKI-025   n8n Admin Notification on Publish    ← WIKI-009
WIKI-026   n8n SOP Mojo Notification            ← WIKI-008, WIKI-009, WIKI-010
WIKI-027   n8n CRM Activity Log First Publish   ← WIKI-009
```

---

## Full Dependency Map (Flat Reference)

| Story | Depends On |
|---|---|
| WIKI-001 | None |
| WIKI-002 | WIKI-001 |
| WIKI-003 | WIKI-002 |
| WIKI-004 | WIKI-002 |
| WIKI-005 | WIKI-002, WIKI-003 |
| WIKI-006 | WIKI-002 |
| WIKI-007 | WIKI-002, WIKI-003 |
| WIKI-008 | WIKI-002, WIKI-004 |
| WIKI-009 | WIKI-002, WIKI-004 |
| WIKI-010 | WIKI-002, WIKI-004 |
| WIKI-011 | WIKI-002, WIKI-004 |
| WIKI-012 | WIKI-003 |
| WIKI-013 | WIKI-002, WIKI-003 |
| WIKI-014 | WIKI-002 |
| WIKI-015 | WIKI-001 |
| WIKI-016 | WIKI-001 |
| WIKI-017 | WIKI-001 |
| WIKI-018 | WIKI-005, WIKI-006, WIKI-007, WIKI-008, WIKI-017 |
| WIKI-019 | WIKI-006 |
| WIKI-020 | WIKI-014 |
| WIKI-021 | WIKI-017 |
| WIKI-022 | WIKI-012, WIKI-013 |
| WIKI-023 | WIKI-019, WIKI-020, WIKI-021 |
| WIKI-024 | WIKI-009, WIKI-010 |
| WIKI-025 | WIKI-009 |
| WIKI-026 | WIKI-008, WIKI-009, WIKI-010 |
| WIKI-027 | WIKI-009 |

---

## Summary

| Wave | Stories | Parallel Count | Blockers Until Next Wave |
|---|---|---|---|
| Wave 1 | WIKI-001 | 1 | WIKI-001 |
| Wave 2 | WIKI-002, 015, 016, 017 | 4 | WIKI-002 |
| Wave 3 | WIKI-003, 004, 006, 014, 021 | 5 | WIKI-003, WIKI-004 |
| Wave 4 | WIKI-005, 007, 008, 009, 010, 011, 012, 013, 019, 020 | 10 | WIKI-009 (integration hub) |
| Wave 5 | WIKI-018, 022, 023, 024, 025, 026, 027 | 7 | — |

**Total Stories:** 27
**Critical Path:** WIKI-001 → WIKI-002 → WIKI-004 → WIKI-009 → WIKI-027
**Longest parallel fan-out:** Wave 4 (10 stories simultaneously)