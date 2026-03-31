# PLAN-MEGA-009: Frappe Wiki

**Story:** MEGA-009
**Module:** Frappe Wiki
**App:** wiki (v2.0.0, develop branch)
**Capability Library Link:** Knowledge Base (CORE)

---

## Pre-Research Findings

- 11 DocTypes in Wiki module: Wiki Page, Wiki Space, Wiki Feedback, Wiki Sidebar, Wiki Page Revision, Wiki Page Revision Item, Wiki Group Item, Wiki Page Patch, Wiki App Switcher List Table, Migrate To Wiki, Wiki Settings
- 1 Wiki Space exists: "Wiki" (route: `/docs`, is_published: 1)
- 0 Wiki Pages — no content created yet
- Wiki Settings table doesn't exist in DB (`tabWiki Settings` missing) — possible incomplete migration
- Wiki Page is simple: title, route, content (Markdown), published flag, allow_guest, meta fields
- Wiki Space supports multi-space architecture with sidebars, navbars, branding (logos, favicon)
- Wiki Page Revision tracks content changes with raised_by (Link→User) — built-in version history
- Wiki Feedback has rating + feedback text + status — built-in feedback collection per page

---

## Key Investigation Areas

### 1. Wiki Settings Table Missing
- `tabWiki Settings` doesn't exist — need to check if `bench migrate` fixes this
- May indicate wiki app was installed but never fully migrated
- Check if wiki routes are accessible at all (`https://poc-dev.sparkmojo.com/docs`)

### 2. Wiki Page Data Model
- How does content rendering work? Markdown Editor → HTML?
- Is there a WYSIWYG editor or just raw Markdown?
- Does it support embedded images/attachments?
- Is there a tree/hierarchy structure for pages, or is it flat with sidebar navigation?

### 3. Wiki Space Architecture
- Multi-space support (different wikis for different purposes)
- App switcher between spaces
- Sidebar configuration (Wiki Sidebar child table)
- Root group concept (Link field on Wiki Space)

### 4. Wiki Page Revision System
- How mature is the revision/diff system?
- Can revisions be rolled back?
- Wiki Page Patch — is this a PR-style review workflow for wiki edits?

### 5. Permission Model
- Who can create/edit pages? All users? Only specific roles?
- `allow_guest` flag on Wiki Page — public knowledge base capability
- Is there per-space permission control?

---

## Behavioral Health Relevance Questions

1. **Does a therapy practice need this?** — Evaluate for: clinical SOPs, employee handbook, policy documentation, training materials
2. **If yes, what specifically would they use it for?** — HIPAA policies, clinical procedures, onboarding docs, insurance billing guides
3. **Does it conflict with anything we're building custom?** — Check overlap with Quality Procedure (MEGA-008) and LMS (MEGA-010)
4. **Does the data model fit, or does it need heavy customization?** — Simple Markdown pages may be sufficient; check if categorization/tagging exists
5. **Is Frappe Desk UI acceptable, or must we build a React Mojo?** — Wiki has its own web frontend (not Desk) — evaluate that UI directly

---

## DocTypes to Investigate in Detail

| DocType | Priority | What to Check |
|---------|----------|---------------|
| Wiki Page | HIGH | Fields, content rendering, hierarchy, existing records |
| Wiki Space | HIGH | Multi-space config, existing "Wiki" space setup |
| Wiki Sidebar | MEDIUM | Navigation structure, how pages are organized |
| Wiki Page Revision | MEDIUM | Version history depth, rollback capability |
| Wiki Page Patch | MEDIUM | Review workflow for edits |
| Wiki Feedback | LOW | Feedback collection mechanism |
| Wiki Settings | LOW | Why table is missing, what it configures |

---

## API Endpoints to Test

```bash
# Wiki Page list
curl -s "https://poc-dev.sparkmojo.com/api/resource/Wiki Page?limit=5" -b /tmp/frappe-cookies.txt

# Wiki Space list
curl -s "https://poc-dev.sparkmojo.com/api/resource/Wiki Space?limit=5" -b /tmp/frappe-cookies.txt

# Wiki Space detail (the existing one)
curl -s "https://poc-dev.sparkmojo.com/api/resource/Wiki Space/rf4ia14jj0" -b /tmp/frappe-cookies.txt

# Wiki frontend route
curl -s -o /dev/null -w "%{http_code}" "https://poc-dev.sparkmojo.com/docs"

# Wiki Page Revision list
curl -s "https://poc-dev.sparkmojo.com/api/resource/Wiki Page Revision?limit=5" -b /tmp/frappe-cookies.txt

# Wiki Feedback list
curl -s "https://poc-dev.sparkmojo.com/api/resource/Wiki Feedback?limit=5" -b /tmp/frappe-cookies.txt
```

---

## Expected Verdict Range

**Most likely: CONFIGURE-AND-SURFACE or USE-AS-IS**

- Wiki has its own web frontend separate from Frappe Desk — may be usable as-is
- If the frontend is clean enough, USE-AS-IS for internal knowledge base
- If it needs a React Mojo wrapper for the desktop OS paradigm, CONFIGURE-AND-SURFACE
- DEFER only if the wiki is too immature or the missing Settings table indicates deeper issues
