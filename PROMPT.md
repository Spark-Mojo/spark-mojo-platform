# Spark Mojo — ERPNext Mega Agent Run
# Overnight Evaluation Queue — MEGA-001 through MEGA-018

## Purpose

This is a RESEARCH AND CLASSIFICATION run. Not a build run.

The sole deliverable is: `sparkmojo-internal/platform/architecture/ERPNEXT_APP_EVALUATION.md`

Do NOT:
- Write any React code
- Create any abstraction layer endpoints
- Modify any Mojo files
- Touch Willow or SM Internal sites
- Create feature branches

DO:
- Read DocTypes and data models via bench and Frappe REST API
- Count records, understand data structure, test API connectivity
- Write clear classification verdicts with evidence
- Note everything relevant to the behavioral health vertical

---

## Site Under Evaluation

**Site:** `poc-dev.sparkmojo.com`  
**Container:** `frappe-poc-backend-1`  
**SSH:** `ssh sparkmojo`  
**Frappe REST base URL:** `https://poc-dev.sparkmojo.com`

Do not touch any other site.

---

## Evaluation Queue

Evaluate in this order. 4–5 items per night. Stop when time runs out — do not rush.
Each evaluation is a story. Mark complete with MEGA-NNN-COMPLETE file.

### Group A: ERPNext Built-in Modules (part of erpnext app)

| Story | Module | Capability Library Link |
|-------|--------|------------------------|
| MEGA-001 | Frappe CRM | CRM / Client Identity (KERNEL) |
| MEGA-002 | ERPNext Accounting | Billing & Payments (CORE) |
| MEGA-003 | Frappe HR (hrms) | HR & Staff Management (CORE) |
| MEGA-004 | ERPNext Projects | Task & Workboard / Project Management |
| MEGA-005 | ERPNext Buying + Selling | Purchasing / Sales operations |
| MEGA-006 | ERPNext Stock + Manufacturing | Inventory / Manufacturing |
| MEGA-007 | ERPNext Assets | Asset Management |
| MEGA-008 | ERPNext Quality | Quality Management |

### Group B: Separate Installed Apps

| Story | App | Capability Library Link |
|-------|-----|------------------------|
| MEGA-009 | Frappe Wiki | Knowledge Base (CORE) |
| MEGA-010 | Frappe Learning (LMS) | Training / LMS (CORE) |
| MEGA-011 | Frappe Helpdesk | Support / Helpdesk (CORE) |
| MEGA-012 | Frappe Payments | Billing & Payments (CORE) |
| MEGA-013 | Marley Health | Clinical Documentation / Healthcare (INDUSTRY) |

### Group C: ERPNext Supporting Modules

| Story | Module | Notes |
|-------|--------|-------|
| MEGA-014 | ERPNext Subcontracting | Likely defer for most verticals |
| MEGA-015 | ERPNext Regional | Tax/compliance modules |
| MEGA-016 | ERPNext Integrations | Third-party integration hooks |
| MEGA-017 | ERPNext Website | Web presence tools |
| MEGA-018 | ERPNext Workflow Engine | Native workflow system — critical for WorkflowMojo design |

---

## Per-Story Evaluation Protocol

For each story, complete ALL of these steps before marking COMPLETE.

### Step 1: Confirm Module is Live

```bash
# Verify module is accessible
curl -s "https://poc-dev.sparkmojo.com/api/method/frappe.desk.moduleview.get_desktop_icons" \
  -H "Cookie: $FRAPPE_SESSION" | python3 -c \
  "import sys,json; icons=[i['module_name'] for i in json.load(sys.stdin).get('message',[])]; print('\n'.join(icons))"
```

Note whether the module appears. If not found, check via bench:
```bash
ssh sparkmojo "docker exec frappe-poc-backend-1 \
  bench --site poc-dev.sparkmojo.com list-apps"
```

### Step 2: Enumerate Key DocTypes

```bash
# List all DocTypes belonging to this module
ssh sparkmojo "docker exec frappe-poc-backend-1 bench --site poc-dev.sparkmojo.com execute \
  \"import frappe; doctypes = frappe.get_all('DocType', filters={'module': '[MODULE_NAME]'}, pluck='name'); print('\\n'.join(doctypes))\""
```

For each key DocType:
- What fields does it have? (`bench execute frappe.get_meta('[DocType]')` — look at `fields`)
- Is it linked to other DocTypes? (look at Link fields)
- Does it have child tables? (look at Table fields)
- Are there existing records? (`frappe.db.count('[DocType]')`)

### Step 3: Test REST API Connectivity

```bash
# Test basic list endpoint
curl -s "https://poc-dev.sparkmojo.com/api/resource/[KEY_DOCTYPE]?limit=3" \
  -H "Cookie: $FRAPPE_SESSION" | python3 -m json.tool | head -30
```

Note: Does the API return data cleanly? Any permission issues? What fields come back by default?

### Step 4: Assess Behavioral Health Relevance

For each module, answer these questions explicitly:

1. **Does a therapy practice need this?** (Yes / No / Optionally)
2. **If yes, what specifically would they use it for?**
3. **Does it conflict with anything we're building custom?** (e.g., does ERPNext HR conflict with our SM Task approach?)
4. **Does the data model fit, or does it need heavy customization to be useful?**
5. **Is the Frappe Desk UI acceptable for Willow's staff, or must we build a React Mojo?**

### Step 5: Write Classification Entry

Append to `sparkmojo-internal/platform/architecture/ERPNEXT_APP_EVALUATION.md`:

```markdown
## [Module Name] (MEGA-NNN)

**App:** [erpnext / crm / hrms / etc.]
**Evaluated:** [date]
**Evaluated on:** poc-dev.sparkmojo.com

### What It Does
[2-4 sentences describing what this module provides]

### Key DocTypes
| DocType | Purpose | Fields of Note |
|---------|---------|----------------|
| [name] | [what it does] | [key fields] |

### API Connectivity
[Does it work cleanly via REST? Any issues? Example endpoint that works.]

### Behavioral Health Relevance
[Direct answers to the 5 questions from Step 4]

### Verdict
**[USE-AS-IS / CONFIGURE-AND-SURFACE / REPLACE-WITH-BEST-OF-BREED / DEFER / EXCLUDE]**

Reasoning: [2-4 sentences explaining the verdict]

### Capability Library Impact
[Which CAPABILITY_LIBRARY.md entries does this affect? What should change?]

### Notes for James
[Anything surprising, concerning, or worth a conversation before the next design session]
```

---

## Verdict Definitions

| Verdict | Meaning |
|---------|--------|
| **USE-AS-IS** | Frappe Desk UI is acceptable. No React Mojo needed. Surface via navigation as-is. |
| **CONFIGURE-AND-SURFACE** | Good data model, but needs a React Mojo to be usable. Queue for feature build. |
| **REPLACE-WITH-BEST-OF-BREED** | ERPNext module is too generic or too complex. Use a dedicated tool (connector) instead. |
| **DEFER** | Not needed for behavioral health vertical right now. Revisit when relevant. |
| **EXCLUDE** | Not applicable to this platform at any stage. |

---

## Credentials

Get a Frappe session for API testing:
```bash
# Login to get session cookie
RESP=$(curl -s -c /tmp/frappe-cookies.txt -X POST \
  https://poc-dev.sparkmojo.com/api/method/login \
  -d "usr=Administrator&pwd=${SM_POCDEV_SITE_PASSWORD}")
echo $RESP
# Then use: -b /tmp/frappe-cookies.txt in subsequent curl calls
# Or set: FRAPPE_SESSION=$(cat /tmp/frappe-cookies.txt | grep sid | awk '{print "sid="$7}')
```

`SM_POCDEV_SITE_PASSWORD` must be exported in the terminal before running:
```bash
source ~/.sparkmojo-secrets
```

---

## Output Document Location

**Governance repo (local):** `/Users/jamesilsley/GitHub/sparkmojo-internal/platform/architecture/ERPNEXT_APP_EVALUATION.md`

Create this file on first run with the header below. Append one entry per evaluated module.
Commit and push to sparkmojo-internal after each night's run.

```markdown
# ERPNext / Frappe App Evaluation

**Authority:** DECISION-016 (Step 4)  
**Evaluator:** Claude Code (Ralph Orchestrator)  
**Site:** poc-dev.sparkmojo.com  
**Started:** [date]  
**Status:** In Progress

This document classifies every ERPNext module and installed Frappe app on the POC/Dev site.
Verdicts gate all subsequent CRM, billing, and workflow feature design sessions.

---

## Summary Table

| Module | Story | Verdict | Capability Impact |
|--------|-------|---------|------------------|
| [filled in as each module is evaluated] |

---
```

---

## Nightly Run Discipline

- Complete 4–5 modules per night. Do not rush.
- Each module evaluation should take 30–60 minutes of thorough research.
- If a module is installed but broken: write BLOCKED-MEGA-NNN.md and continue.
- At end of each night: commit ERPNEXT_APP_EVALUATION.md to sparkmojo-internal, write QUEUE-STATUS.md at platform repo root summarising what was completed and what remains.
- Do NOT wait until all 18 modules are done to commit. Commit after every night.

---

## Completion

When all 18 stories have COMPLETE or BLOCKED markers:
1. Ensure summary table in ERPNEXT_APP_EVALUATION.md is filled in for all modules
2. Write a final "Evaluation Complete" section at the end of the document with:
   - Total modules: USE-AS-IS count, CONFIGURE-AND-SURFACE count, etc.
   - Top 3 most impactful findings
   - Recommended next design session order based on findings
3. Write MEGA-RUN-COMPLETE at platform repo root
4. Print: LOOP_COMPLETE
