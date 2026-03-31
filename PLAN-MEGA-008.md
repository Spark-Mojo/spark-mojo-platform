# PLAN-MEGA-008: ERPNext Quality Management

## Story
**ID:** MEGA-008
**Module:** Quality Management
**App:** erpnext
**Capability:** Quality Management

## Module Overview

ERPNext Quality Management provides ISO 9001-style quality management tools:
goals, procedures, reviews, actions, meetings, feedback, and non-conformance tracking.

**16 DocTypes total**, all with **0 existing records** — completely unused on POC.

## Key DocTypes to Investigate

| DocType | Purpose | Priority |
|---------|---------|----------|
| Quality Goal | Measurable quality objectives with targets | High |
| Quality Procedure | Documented SOPs with process steps | High |
| Quality Review | Periodic quality reviews | Medium |
| Quality Action | Corrective/preventive actions (CAPA) | High |
| Quality Meeting | Meeting minutes with agenda items | Low |
| Quality Feedback | Customer/internal feedback collection | Medium |
| Quality Feedback Template | Reusable feedback form templates | Medium |
| Non Conformance | Non-conformance reports (NCRs) | High |

### Child Tables (6)
- Quality Feedback Parameter
- Quality Feedback Template Parameter
- Quality Meeting Agenda
- Quality Meeting Minutes
- Quality Action Resolution
- Quality Review Objective
- Quality Goal Objective
- Quality Procedure Process

## Behavioral Health Relevance Questions

1. **Does a therapy practice need this?** — Consider: clinical quality measures (CQMs), CARF/Joint Commission accreditation, incident reporting, patient satisfaction surveys, SOP documentation for clinical protocols
2. **If yes, what specifically?** — Non Conformance → incident reports; Quality Feedback → patient satisfaction; Quality Procedure → clinical SOPs; Quality Goal → accreditation KPIs
3. **Does it conflict with custom builds?** — Check overlap with SM Task for corrective actions; check if Quality Feedback overlaps with any planned patient feedback Mojo
4. **Does the data model fit?** — Likely too generic/manufacturing-oriented for clinical quality measures; check if fields map to healthcare quality terminology
5. **Is Frappe Desk UI acceptable?** — For admin-only quality tracking, Desk may suffice; for clinician-facing feedback, a Mojo would be needed

## API Endpoints to Test

```
GET /api/resource/Quality Goal?limit=3
GET /api/resource/Quality Procedure?limit=3
GET /api/resource/Quality Action?limit=3
GET /api/resource/Quality Feedback?limit=3
GET /api/resource/Non Conformance?limit=3
```

## Expected Verdict Range

**DEFER** or **EXCLUDE** — Most small behavioral health practices don't have formal QMS requirements unless pursuing accreditation (CARF, Joint Commission). The module is ISO 9001-oriented, designed for manufacturing/enterprise QMS. However, Non Conformance and Quality Procedure could have niche value for accredited facilities.

## Investigation Strategy

1. Confirm module is accessible via REST API
2. Examine field structure of Quality Goal, Quality Action, Non Conformance, Quality Feedback
3. Check for Healthcare module links (patient, practitioner fields)
4. Assess whether Quality Procedure could serve as clinical SOP documentation
5. Determine if Non Conformance maps to clinical incident reporting
6. Write classification entry
