# Test 01: Story Decomposition — Run C (Knowledge Base Wiki)

**Task type:** Architectural reasoning
**Evaluates:** Can the model break a content-management capability into atomic stories, correctly handling dual-audience visibility, version history, and the SOP Mojo boundary?

**This is Run C. Run A uses CRM Client Identity. Run B uses Scheduling Mojo.**

---

## Input Files

Provide as context (rules reference only):
- `factory/guardrails/PLATFORM-GUARDRAILS.md`

The research context is embedded in the prompt below. No additional files needed.

---

## Prompt (give this to the model, nothing else)
```
You are the Story Decomposer for the Spark Mojo build factory. Read the Knowledge Base Wiki research summary below. Break this capability into atomic, independently testable stories for the build factory.
--- KNOWLEDGE BASE WIKI RESEARCH SUMMARY ---
CAPABILITY: Knowledge Base Wiki (KB/Wiki Mojo) VERTICAL: Universal (all verticals) CORE PURPOSE: Allows practices to maintain internal operational documentation (SOPs, policies, training reference) and optionally expose curated articles to clients via the patient portal Help section.
WORKFLOWS:
1. Article Creation: Staff member creates article with title, rich text body, category, and visibility setting (internal or client-facing). Saved as Draft initially.
2. Article Publishing (Internal): Internal articles can be self-published by author or any admin. Status moves directly Draft → Published.
3. Article Publishing (Client-Facing): Client-facing articles require admin approval. Status path: Draft → Under Review → Published. Reviewer can reject back to Draft with comments.
4. Version History: Every time an article body is saved, a version snapshot is created. Admin can view version history and restore any previous version. Restoring creates a new version (does not delete history).
5. Category Management: Admin creates and manages a category hierarchy (up to 2 levels deep). Articles belong to exactly one category. Categories have a default visibility setting.
6. Full-Text Search: Staff can search across all published articles they have access to. Clients see only client-facing published articles. Search is role-aware.
7. Article Archiving: Published articles can be archived by admin. Archived articles are not returned in search or category browse. Accessible via direct link to authorized staff only.
8. Client Portal Surface: Client-facing published articles appear in the patient portal Help section. Read-only for clients. Filtered by the site's article category configuration.
9. SOP Connection (boundary rule): SOP Mojo owns the relationship between operational SOPs and Wiki articles. An SOP may reference Wiki articles, but the Wiki does not trigger, drive, or write to SOPs. When a client-facing article changes status, n8n may notify SOP Mojo to flag linked SOPs for review. The Wiki never calls SOP Mojo directly.
ARTICLE STATUS LIFECYCLE: Draft → Published (internal articles, direct) Draft → Under Review → Published (client-facing articles) Draft → Under Review → Draft (rejected, with comments) Published → Archived Archived is terminal for display purposes (but not for history).
DOCTYPE REQUIREMENTS:
* SM Article: main record (title, slug, body_html, category, visibility: internal|client, status: draft|under_review|published|archived, author, reviewer, rejection_notes, last_published_at)
* SM Article Version: version history (article_id, version_number, body_html, saved_by, saved_at, word_count)
* SM Wiki Category: category (name, parent_category, slug, description, default_visibility, is_active)
ABSTRACTION LAYER ENDPOINTS NEEDED:
* POST /api/modules/wiki/article/create
* GET /api/modules/wiki/article/{id}
* PUT /api/modules/wiki/article/{id}/update (body + metadata, creates new version)
* PUT /api/modules/wiki/article/{id}/submit-for-review
* PUT /api/modules/wiki/article/{id}/publish
* PUT /api/modules/wiki/article/{id}/reject (with rejection_notes)
* PUT /api/modules/wiki/article/{id}/archive
* GET /api/modules/wiki/article/{id}/versions
* POST /api/modules/wiki/article/{id}/restore/{version_number}
* GET /api/modules/wiki/articles (list with filters: category, visibility, status, search)
* POST /api/modules/wiki/category/create
* PUT /api/modules/wiki/category/{id}/update
* GET /api/modules/wiki/categories
FRONTEND COMPONENTS NEEDED:
* ArticleEditor: rich text editor with title, category selector, visibility toggle, save and submit controls
* ArticleViewer: renders published article with metadata (last updated, reviewer, version info)
* ArticleList: searchable and filterable article list with status badges
* CategoryTree: collapsible category hierarchy browser
* VersionHistoryPanel: version list with restore button
INTEGRATIONS (all via n8n):
* Notify author when client-facing article is approved or rejected
* Notify admin when any client-facing article is published (QA awareness)
* Notify SOP Mojo when a client-facing article changes status (passive flag, no write-back)
CRM TIMELINE:
* N/A for individual article actions. Exception: if a client-facing article is published for the first time, write a practice-level activity log entry (not a client-specific CRM timeline entry).
--- END RESEARCH SUMMARY ---
ATOMIC means:
* ONE endpoint, OR one React component, OR one n8n workflow, OR one DocType. Never multiple.
* Completable in 3-8 build iterations.
* Independently testable. Tests can run without other stories being complete.
* Self-contained spec. The implementing agent needs only this story's file.
SPLIT rules:
* More than 3 files to create: split it.
* More than 2 API endpoints: split it.
* Both backend AND frontend work: split into two stories.
* Both a DocType change AND an n8n workflow: split it.
CATEGORIES: BACKEND, FRONTEND, INTEGRATION, AI, CONFIG, GLUE
Every story must answer these three Spec Gates:
1. Workflow: What workflow does this story serve?
2. CRM Timeline: What does this story write to the CRM timeline? (N/A is valid with explanation)
3. Right Level: Universal, vertical, client, or role level?
Output a STORIES.md file with:
* Story ID (WIKI-001, WIKI-002, etc.), title, category, size (S or XS only)
* One-sentence description
* Dependencies (IDs or None)
* Spec Gate answers (one line each)
Then output a DEPENDENCY-GRAPH.md showing build order and parallel execution groups.
```

---

## Scoring Rubric

### Category A: Atomicity (0-5)
- 5: All stories are size S or XS or M, no story has both backend and frontend, no story has more than 2 endpoints
- 4: 3-4 stories slightly over-scoped but splittable
- 3: All stories are too large
- 2: Feature-sized, not work-item-sized
- 1: Monolithic; not usable

### Category B: Completeness (0-5)
- 5: All 13 endpoints have stories; all 3 DocTypes have creation stories; all 3 n8n integrations have INTEGRATION stories; version history is a distinct story set (not bundled with article update)
- 4: 1-2 endpoints or integrations missing
- 3: Significant gaps
- 2: Major sections unaddressed
- 1: Incomplete

### Category C: Spec Gate Compliance (0-5)
- 5: All three gates answered; CRM timeline correctly identified as N/A for most actions with the one exception (first publish of client-facing article) correctly noted
- 4: Gates present; 3-4 thin answers
- 3: Spec gates present but several are placeholder answers
- 2: Inconsistently applied
- 1: Absent or ignored

### Category D: Guardrail Awareness (0-5)
- 5: SOP Mojo notification correctly identified as n8n INTEGRATION (not direct call); client portal surface correctly identified as a GLUE story; version restore does not delete history (correctly specified)
- 4: One minor miss
- 3: 1-2 violations
- 2: Multiple violations
- 1: Fundamental violations throughout

### Category E: Dependency Graph Quality (0-5)
- 5: Valid DAG; DocTypes before endpoints; version history stories correctly depend on article CRUD endpoints; INTEGRATION stories depend on lifecycle endpoints; frontend depends on backend
- 4: Valid DAG but parallel groups not well identified
- 3: Mostly valid but some ordering issues
- 2: Circular dependencies or ordering errors
- 1: No dependency graph or completely wrong

**Maximum score: 25**
**Pass threshold: 18/25**

---

## What Good Looks Like

A passing submission will produce 20-35 atomic stories.
It will correctly identify version history as a distinct story set (create version on save, list versions, restore version) rather than bundling into the article update endpoint.
It will correctly classify the SOP Mojo notification as an n8n INTEGRATION story with a clear one-way dependency, never as a direct call from the Wiki.
The article approval workflow should produce multiple BACKEND stories (one per status transition), not one large "article lifecycle" story.
