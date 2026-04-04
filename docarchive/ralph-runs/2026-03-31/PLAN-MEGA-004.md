# PLAN-MEGA-004: ERPNext Projects

## Story ID
MEGA-004

## Module
ERPNext Projects (`Projects` module, `erpnext` app)

## Capability Library Link
Task & Workboard / Project Management

---

## DocTypes to Investigate (15 total)

### Primary (deep dive)
| DocType | Why |
|---------|-----|
| **Project** | Core container — does it overlap with or complement SM Task Workboard? |
| **Task** | CRITICAL: SM Task is a custom DocType (DECISION-014). How does ERPNext Task compare? Do we ignore it entirely or use it for non-clinical project tracking? |
| **Timesheet** | Therapist session hours, billable time — links to Payroll (MEGA-003 found per-session pay support) |
| **Timesheet Detail** | Child table of Timesheet — check billing_hours, billing_rate, billing_amount fields |

### Secondary (field scan + record count)
| DocType | Why |
|---------|-----|
| **Project Template** | Pre-built project structures — useful for onboarding new clients/staff? |
| **Project Template Task** | Child table of Project Template |
| **Task Depends On** | Task dependency tracking — does SM Task need this? |
| **Dependent Task** | Reverse dependency link |
| **Activity Type** | Categories for time tracking (Therapy Session, Supervision, Admin, etc.) |
| **Activity Cost** | Per-activity billing rates — sliding scale potential? |
| **Project Type** | Classification (Clinical, Admin, etc.) |

### Likely Skip (confirm and move on)
| DocType | Why |
|---------|-----|
| **Projects Settings** | Module config — quick scan |
| **Project Update** | Status updates — check if useful or noise |
| **Project User** | Assignment/membership |
| **Task Type** | Task classification |

---

## Behavioral Health Relevance Questions

1. **Does a therapy practice need project management?**
   - Likely yes for: onboarding workflows, group program management, compliance projects
   - Likely no for: individual session scheduling (that's Healthcare/CRM territory)

2. **What specifically would they use it for?**
   - Staff onboarding projects (credentialing, training checklists)
   - Program launches (new group therapy series, insurance panel applications)
   - Facility improvements / compliance audits
   - NOT for individual client treatment plans (that's clinical, not project)

3. **Does it conflict with SM Task?**
   - THIS IS THE KEY QUESTION. DECISION-014 says SM Task is custom.
   - ERPNext Task ≠ SM Task. But do they coexist? Overlap? Confuse users?
   - Check: does ERPNext Task have any Healthcare integration?

4. **Does the data model fit or need heavy customization?**
   - Check Project fields for healthcare-specific needs
   - Check Task dependency model vs SM Task workflow states

5. **Is Frappe Desk UI acceptable or must we build a React Mojo?**
   - Gantt view exists in Frappe — is it good enough for admin projects?
   - SM Task Workboard is the React UI for daily operational tasks
   - Could ERPNext Projects live in Desk while SM Task lives in React?

---

## API Endpoints to Test

```bash
# Project list
curl -s "https://poc-dev.sparkmojo.com/api/resource/Project?limit=5" -b /tmp/frappe-eval-cookies.txt

# Task list
curl -s "https://poc-dev.sparkmojo.com/api/resource/Task?limit=5" -b /tmp/frappe-eval-cookies.txt

# Timesheet list
curl -s "https://poc-dev.sparkmojo.com/api/resource/Timesheet?limit=5" -b /tmp/frappe-eval-cookies.txt

# Activity Type list
curl -s "https://poc-dev.sparkmojo.com/api/resource/Activity%20Type?limit=5" -b /tmp/frappe-eval-cookies.txt

# Project fields
curl -s "https://poc-dev.sparkmojo.com/api/resource/Project?fields=[\"name\",\"project_name\",\"status\",\"percent_complete\"]&limit=3" -b /tmp/frappe-eval-cookies.txt
```

---

## Key Investigation Notes

- **Timesheet ↔ Payroll link**: MEGA-003 found `salary_slip_based_on_timesheet` in Salary Structure. Timesheet is the bridge between Projects and Payroll. This is critical for per-session therapist pay.
- **ERPNext Task vs SM Task**: Must clearly delineate. ERPNext Task = project-level work items. SM Task = operational daily tasks (DECISION-014). Document the boundary.
- **Gantt chart**: Frappe has built-in Gantt for Project/Task. Check if it renders properly — could be acceptable for admin use.
- **Activity Type seed data**: Check what activity types exist by default. Behavioral health needs: Therapy Session, Group Session, Supervision, Documentation, Training, Admin.

---

## Expected Verdict Range
Likely **CONFIGURE-AND-SURFACE** or **DEFER** depending on:
- Whether Timesheet is valuable enough to justify surfacing Projects
- Whether the ERPNext Task / SM Task boundary is clean or confusing
