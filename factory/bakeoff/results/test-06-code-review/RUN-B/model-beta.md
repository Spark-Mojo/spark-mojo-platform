model: model-beta
test: 06-code-review
run: B
date: 2026-04-09

# Spark Mojo Code Review — Scheduling Capability

**Reviewer:** Primary Code Reviewer
**Date:** April 9, 2026
**Files Under Review:** 2
**Violations Found:** 5

---

## File 1: `AppointmentBookingForm.jsx`

### Violation 1 — TypeScript in `.jsx` File

| Field | Detail |
|---|---|
| **Type** | Architecture Immutable §4 — No TypeScript |
| **Location** | `platform/apps/mojo_frontend/src/mojos/scheduling/AppointmentBookingForm.jsx`, **lines 4–9** |
| **Code** | `interface TimeSlot { start: string; end: string; ... }` |

**Why it's a violation:** The `interface` keyword is a TypeScript construct. The platform rules explicitly prohibit TypeScript in any frontend file, including `interface` declarations. This file will not parse as valid JSX.

**Correct implementation:** Remove the interface entirely. If shape documentation is needed, use a JSDoc comment:

```jsx
/**
 * @typedef {Object} TimeSlot
 * @property {string} start
 * @property {string} end
 * @property {string} provider_id
 * @property {boolean} available
 */
```

---

### Violation 2 — React Calling Frappe Directly

| Field | Detail |
|---|---|
| **Type** | Architecture Immutable §1 — React NEVER calls Frappe directly |
| **Location** | `platform/apps/mojo_frontend/src/mojos/scheduling/AppointmentBookingForm.jsx`, **line 23** |
| **Code** | `fetch(\`http://localhost:8000/api/method/sm_scheduling.api.get_providers?site=${subdomain}\`)` |

**Why it's a violation:** This call hits the Frappe API directly (`/api/method/sm_scheduling.api.*`). All React calls must go through the Mojo Abstraction Layer at `/api/modules/[capability]/[action]`. This also contains a hardcoded `localhost:8000` origin, which would fail in any deployed environment.

**Correct implementation:**

```jsx
fetch(`/api/modules/scheduling/providers?subdomain=${subdomain}`)
  .then(r => r.json())
  .then(data => setProviders(data.providers || []));
```

---

### Violation 3 — Hardcoded Hex Color

| Field | Detail |
|---|---|
| **Type** | Architecture Immutable §5 — No hardcoded hex colors |
| **Location** | `platform/apps/mojo_frontend/src/mojos/scheduling/AppointmentBookingForm.jsx`, **line 62** |
| **Code** | `color: '#6B7280'` |

**Why it's a violation:** `#6B7280` is a hardcoded hex value. All colors must use `var(--sm-*)` semantic CSS tokens. Other labels in this same file correctly use `var(--sm-text-secondary)`, making this an inconsistency as well.

**Correct implementation:**

```jsx
<label style={{ color: 'var(--sm-text-secondary)', display: 'block', marginBottom: '4px' }}>
```

---

## File 2: `sm_appointment.py`

### Violation 4 — Frappe Controller Making External Calls Directly

| Field | Detail |
|---|---|
| **Type** | Architecture Immutable §6 and §7 — n8n handles ALL cross-system operations; the workflow engine NEVER calls external systems |
| **Location** | `platform/apps/sm_scheduling/sm_scheduling/doctype/sm_appointment/sm_appointment.py`, **lines 2–4** (imports) and **lines 23–40** (`_send_confirmation_email` method) |
| **Code** | Direct SMTP connection to `smtp.sendgrid.net` via `smtplib` |

**Why it's a violation:** This is one of the most severe violations possible on this platform. The guardrails state: *"The workflow engine NEVER calls external systems. This boundary is the most locked rule in the platform. No exceptions."* This method opens a direct SMTP socket to SendGrid from inside a Frappe controller, making the Frappe backend responsible for email delivery, error handling, and credential management for an external service. Additionally, `frappe.conf.get('sendgrid_api_key')` stores an API credential in site config rather than behind a vault reference (§13).

**Correct implementation:** Remove the entire `_send_confirmation_email` method and all three SMTP-related imports. The `after_insert` hook should only handle internal state (the CRM timeline write is correct). Email confirmation is a cross-system action triggered by the state change — n8n listens for the appointment creation event and handles email delivery:

```python
import frappe


class SMAppointment(frappe.model.document.Document):

    def validate(self):
        # ... validation stays the same (with the fix from Violation 5) ...

    def after_insert(self):
        # CRM timeline write is internal state — correct to keep here
        self._write_crm_timeline_event("appointment_created")
        # n8n webhook picks up the appointment.created event
        # and handles confirmation email via SendGrid

    # _send_confirmation_email is DELETED entirely

    def _write_crm_timeline_event(self, event_type):
        # ... unchanged ...
```

An n8n workflow (`scheduling-appointment-confirmation`) should subscribe to the `SM Appointment` `after_insert` doc event and handle the SendGrid API call with credentials sourced from vault.

---

### Violation 5 — Unprefixed DocType Reference

| Field | Detail |
|---|---|
| **Type** | Architecture Immutable §3 — All custom DocTypes must be prefixed "SM " |
| **Location** | `platform/apps/sm_scheduling/sm_scheduling/doctype/sm_appointment/sm_appointment.py`, **line 17** |
| **Code** | `frappe.db.exists("Appointment Type", self.appointment_type)` |

**Why it's a violation:** The reference is to `"Appointment Type"` — an unprefixed DocType name. All custom DocTypes on this platform must use the `SM ` prefix. The guardrails give this exact example: *"e.g., 'SM Appointment Type', not 'Appointment Type'"*.

**Correct implementation:**

```python
if not frappe.db.exists("SM Appointment Type", self.appointment_type):
    frappe.throw(f"Appointment type '{self.appointment_type}' does not exist")
```

---

## Summary

| # | File | Line(s) | Violation | Severity |
|---|------|---------|-----------|----------|
| 1 | `AppointmentBookingForm.jsx` | 4–9 | TypeScript `interface` in `.jsx` file | 🔴 Will not compile |
| 2 | `AppointmentBookingForm.jsx` | 23 | Direct Frappe API call bypassing MAL | 🔴 Architecture breach |
| 3 | `AppointmentBookingForm.jsx` | 62 | Hardcoded hex color `#6B7280` | 🟡 Standards violation |
| 4 | `sm_appointment.py` | 2–4, 23–40 | Direct SMTP from Frappe controller | 🔴 **Most locked rule** breach |
| 5 | `sm_appointment.py` | 17 | Unprefixed DocType `"Appointment Type"` | 🔴 Naming convention breach |

**Verdict:** ❌ **Changes requested.** Two of these violations (2 and 4) breach the platform's hardest architectural boundaries. Violation 4 in particular crosses what the guardrails call *"the most locked rule in the platform."* This code must not merge in its current state.