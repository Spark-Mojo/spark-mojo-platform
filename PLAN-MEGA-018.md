# PLAN-MEGA-018: ERPNext Workflow Engine

**Module:** Workflow (frappe core)
**Story:** MEGA-018
**Capability:** Native workflow system — critical for WorkflowMojo design

---

## Pre-Research Findings

### DocTypes in Workflow Module (9 total)

| DocType | Type | Records | Notes |
|---------|------|---------|-------|
| Workflow | Parent | 0 | Main workflow definition — links to any DocType |
| Workflow State | Parent | 3 | Pending, Approved, Rejected (seed data) |
| Workflow Action | Parent | 0 | Runtime action queue — tracks pending approvals |
| Workflow Action Master | Parent | 3 | Approve, Reject, Review (seed data) |
| Workflow Document State | Child | — | States within a workflow (child of Workflow) |
| Workflow Transition | Child | — | Transitions between states (child of Workflow) |
| Workflow Action Permitted Role | Child | — | Roles allowed for an action |
| Workflow Transition Task | Child | — | Tasks triggered on transition |
| Workflow Transition Tasks | Parent | 0 | Task definitions for transitions |

### Key Field Structures

**Workflow:** workflow_name, document_type (Link→DocType), is_active, override_status, send_email_alert, enable_action_confirmation, states (Table→Workflow Document State), transitions (Table→Workflow Transition)

**Workflow Document State:** state (Link→Workflow State), doc_status (0/1/2), update_field, update_value, is_optional_state, allow_edit (Link→Role), send_email, message, next_action_email_template

**Workflow Transition:** state→action→next_state, allowed (Link→Role), allow_self_approval, condition (Python code), transition_tasks

**Workflow Action:** status (Open/Completed), reference_doctype/reference_name (Dynamic Link), workflow_state, user, completed_by, permitted_roles

### Current State
- 0 active workflows configured
- 3 seed Workflow States: Pending, Approved, Rejected
- 3 seed Workflow Action Masters: Approve, Reject, Review
- No custom states or actions created
- All REST API endpoints return HTTP 200

---

## Investigation Areas

### 1. Behavioral Health Relevance Questions
1. Does a therapy practice need workflow automation? → YES (treatment plan approvals, insurance pre-auth, clinical note sign-off, staff onboarding)
2. What specifically would they use it for? → Clinical note approval chains, treatment plan reviews, insurance claim workflows, leave/PTO approvals
3. Does it conflict with SM Task? → NO — Workflow Engine operates on DocType state transitions, SM Task is a standalone work item. Complementary.
4. Does the data model fit? → Generic by design — applies to ANY DocType. Needs workflow DEFINITIONS created, not schema changes.
5. Is Frappe Desk UI acceptable? → Workflow Builder UI is admin-only (clinical director configures). Staff see workflow actions as buttons on documents. React Mojo needed for workflow visibility/dashboard.

### 2. API Endpoints to Test
- `GET /api/resource/Workflow` — list workflows
- `GET /api/resource/Workflow State` — list states
- `GET /api/resource/Workflow Action` — list pending actions
- `GET /api/resource/Workflow Action Master` — list action types
- `POST /api/resource/Workflow` — can we create a workflow via API?
- `GET /api/method/frappe.model.workflow.get_transitions` — get available transitions for a doc

### 3. Critical Design Questions for WorkflowMojo
- How does Workflow interact with SM Task canonical_state?
- Can Workflow Transition trigger n8n webhooks?
- Does Workflow Action queue support multi-level approval chains?
- Can Python conditions reference custom fields on SM DocTypes?
- How does the Workflow Builder UI compare to what WorkflowMojo needs?

---

## Expected Verdict: CONFIGURE-AND-SURFACE

The Workflow Engine is a generic state machine that can be applied to any DocType. The engine itself is USE-AS-IS (admin configures via Frappe Desk), but a React Mojo is needed to give staff visibility into pending approvals and workflow status across documents.
