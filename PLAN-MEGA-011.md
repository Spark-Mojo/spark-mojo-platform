# PLAN-MEGA-011: Frappe Helpdesk

**Story:** MEGA-011
**Module:** Frappe Helpdesk (helpdesk app, v1.21.3, develop branch)
**Capability:** Support / Helpdesk (CORE)

---

## Module Overview

Frappe Helpdesk is a standalone ticketing/support app with 40 DocTypes in the "Helpdesk" module.
It has its own web frontend (not Frappe Desk) and a dedicated data model prefixed "HD".

**Current data state on poc-dev.sparkmojo.com:**
- 1 HD Ticket (test/seed data)
- 2 HD Teams
- 4 HD Ticket Types, 4 HD Ticket Priorities, 4 HD Ticket Statuses (seed data)
- 1 HD Article + 1 HD Article Category (knowledge base seed)
- 1 HD Service Level Agreement
- 1 HD Ticket Template
- 0 HD Agents, 0 HD Customers, 0 HD Organizations, 0 HD Escalation Rules

---

## Key DocTypes to Investigate

### Core Ticketing
| DocType | Purpose | Priority |
|---------|---------|----------|
| HD Ticket | Main ticket entity — fields, workflow, status model | HIGH |
| HD Ticket Status | Status enum values | HIGH |
| HD Ticket Priority | Priority levels | HIGH |
| HD Ticket Type | Ticket categorization | MEDIUM |
| HD Ticket Template | Pre-defined ticket forms | MEDIUM |
| HD Ticket Activity | Activity/audit log per ticket | MEDIUM |
| HD Ticket Comment | Comments/replies on tickets | HIGH |

### Agents & Teams
| DocType | Purpose | Priority |
|---------|---------|----------|
| HD Agent | Support agent profiles | HIGH |
| HD Team | Agent grouping/assignment | HIGH |
| HD Team Member | Child table for team membership | MEDIUM |

### Customers & Organizations
| DocType | Purpose | Priority |
|---------|---------|----------|
| HD Customer | Customer identity for tickets | HIGH |
| HD Organization | Customer organization grouping | MEDIUM |
| HD Organization Contact Item | Contact child table | LOW |

### SLA & Escalation
| DocType | Purpose | Priority |
|---------|---------|----------|
| HD Service Level Agreement | SLA definitions | HIGH |
| HD Escalation Rule | Auto-escalation rules | MEDIUM |
| HD Service Holiday List | Holiday exceptions for SLA | LOW |

### Knowledge Base
| DocType | Purpose | Priority |
|---------|---------|----------|
| HD Article | Knowledge base articles | HIGH |
| HD Article Category | Article categorization | MEDIUM |
| HD Article Feedback | Article rating/feedback | LOW |

### Configuration
| DocType | Purpose | Priority |
|---------|---------|----------|
| HD Settings | App configuration | HIGH |
| HD Notification | Notification rules | MEDIUM |
| HD Saved Reply | Canned responses | MEDIUM |
| HD Field Layout | Custom field layouts | LOW |

---

## API Endpoints to Test

1. `GET /api/resource/HD Ticket?limit=3` — ticket list with default fields
2. `GET /api/resource/HD Ticket/<name>` — single ticket with full field set
3. `GET /api/resource/HD Agent?limit=3` — agent list
4. `GET /api/resource/HD Team?limit=3` — team list
5. `GET /api/resource/HD Article?limit=3` — knowledge base articles
6. `GET /api/resource/HD Service Level Agreement?limit=3` — SLA definitions
7. `GET /api/resource/HD Ticket Status?limit=10` — status values
8. `GET /api/resource/HD Ticket Priority?limit=10` — priority values
9. `GET /api/resource/HD Ticket Type?limit=10` — type values
10. `GET /api/resource/HD Settings` — settings singleton

---

## Behavioral Health Relevance Questions

1. **Does a therapy practice need this?** — Evaluate for: patient support requests, IT helpdesk for staff, facility maintenance requests, insurance inquiry tracking
2. **If yes, what specifically would they use it for?** — Internal IT support? Patient-facing support portal? Facility/equipment maintenance requests?
3. **Does it conflict with anything we're building custom?** — Check overlap with SM Task / Workboard (MEGA-004). Is there a clear boundary between "support ticket" and "task"?
4. **Does the data model fit, or does it need heavy customization?** — HD Ticket vs SM Task: complementary or redundant? HD Customer vs Frappe Customer (CRM): duplicate identity?
5. **Is the Frappe Desk UI acceptable, or must we build a React Mojo?** — Helpdesk has its own web portal at `/helpdesk` — evaluate that UI separately from Frappe Desk

---

## Key Investigation Areas

- **HD Ticket field model:** What fields exist? Link to Customer/Contact? Assignment model? SLA tracking fields?
- **Helpdesk web portal:** Does `/helpdesk` render? Is it a standalone SPA? What does the agent UI look like?
- **HD Customer vs Frappe Customer:** Are these linked or independent identity models? Potential for data duplication?
- **HD Agent vs User/Employee:** How are agents identified? Link to User? Link to Employee?
- **SLA engine:** How does HD Service Level Agreement work? Response time, resolution time, business hours?
- **Knowledge base:** Is HD Article a viable self-service knowledge base? Or does Wiki (MEGA-009) supersede it?
- **Notification system:** HD Notification — email? webhooks? How does it compare to Frappe's built-in notifications?
- **Portal signup:** HD Portal Signup Request + HD Desk Account Request — self-service customer portal?

---

## Expected Verdict Range

- **CONFIGURE-AND-SURFACE** if: Helpdesk is useful for internal IT/facility support and the web portal UI is decent
- **DEFER** if: behavioral health practices don't need formal ticketing beyond what SM Task provides
- **EXCLUDE** if: completely redundant with SM Task/Workboard and adds confusion
