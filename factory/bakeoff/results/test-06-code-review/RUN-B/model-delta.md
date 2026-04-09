model: model-delta
test: 06-code-review
run: B
date: 2026-04-09

I'll review both files thoroughly against every platform rule in the guardrails document.

---

# Spark Mojo Code Review — Primary Code Reviewer Report

**Reviewer:** Primary Code Reviewer
**Date:** April 9, 2026
**Files Reviewed:**
- `platform/apps/mojo_frontend/src/mojos/scheduling/AppointmentBookingForm.jsx`
- `platform/apps/sm_scheduling/sm_scheduling/doctype/sm_appointment/sm_appointment.py`

---

## Summary Table

| # | File | Line(s) | Rule Violated | Severity |
|---|------|---------|---------------|----------|
| V-01 | `.jsx` | 4–7 | No TypeScript — `interface` declaration | 🔴 Critical |
| V-02 | `.jsx` | 27 | React never calls Frappe directly | 🔴 Critical |
| V-03 | `.jsx` | 66 | Hardcoded hex color | 🔴 Critical |
| V-04 | `.py` | 2–4 | Frappe controller makes external call (SMTP) | 🔴 Critical |
| V-05 | `.py` | 16 | DocType not prefixed "SM " | 🔴 Critical |
| V-06 | `.py` | 23–40 | `_send_confirmation_email` — n8n must handle all cross-system operations | 🔴 Critical |

**Total violations: 6**
**Critical: 6 / Warning: 0**

---

## Detailed Violations

---

<details open>
<summary><strong>V-01 🔴 — TypeScript <code>interface</code> declaration in a <code>.jsx</code> file</strong></summary>

**Violation Type:** No TypeScript in any frontend file

**File & Lines:** `AppointmentBookingForm.jsx`, lines 4–7

```jsx
interface TimeSlot {
  start: string;
  end: string;
  provider_id: string;
  available: boolean;
}
```

**Why it is a violation:**
Guardrail Section 4, Rule 4 states: *"No TypeScript. All frontend files are `.jsx`."* An `interface` declaration is TypeScript syntax. It is not valid JavaScript/JSX. This file carries a `.jsx` extension, which is correct, but the content violates the no-TypeScript rule regardless of file extension. The interface is also entirely unused at runtime — JavaScript has no type enforcement — making it dead code in addition to being a rule violation.

**Correct Implementation:**
Delete the block entirely. If slot shape documentation is desired, use a JSDoc comment:

```jsx
/**
 * @typedef {Object} TimeSlot
 * @property {string} start
 * @property {string} end
 * @property {string} provider_id
 * @property {boolean} available
 */
```

</details>

---

<details open>
<summary><strong>V-02 🔴 — React calls Frappe directly, bypassing the Mojo Abstraction Layer</strong></summary>

**Violation Type:** React NEVER calls Frappe directly

**File & Lines:** `AppointmentBookingForm.jsx`, lines 25–28

```jsx
fetch(`http://localhost:8000/api/method/sm_scheduling.api.get_providers?site=${subdomain}`)
  .then(r => r.json())
  .then(data => setProviders(data.message || []));
```

**Why it is a violation:**
Guardrail Section 4, Rule 1 states: *"React NEVER calls Frappe directly. All React calls go through `/api/modules/[capability]/[action]` on the Mojo Abstraction Layer."* This fetch call hits a raw Frappe whitelisted method (`/api/method/sm_scheduling.api.get_providers`) directly, including a hardcoded `localhost:8000` origin. This violates the MAL contract on two counts: (1) it is a direct Frappe call, and (2) the hardcoded localhost URL means it is broken in every non-local environment. Section 7 locked decisions confirm: *"React calls MAL only. Never Frappe directly."*

The `loadAvailableSlots` call on lines 31–35 and the `handleBook` call on lines 39–49 are **compliant** — they correctly route through `/api/modules/scheduling/...`.

**Correct Implementation:**

```jsx
useEffect(() => {
  fetch(`/api/modules/scheduling/providers?subdomain=${subdomain}`)
    .then(r => r.json())
    .then(data => setProviders(data.providers || []));
}, [subdomain]);
```

The MAL route `/api/modules/scheduling/providers` is responsible for calling Frappe internally.

</details>

---

<details open>
<summary><strong>V-03 🔴 — Hardcoded hex color</strong></summary>

**Violation Type:** No hardcoded hex colors

**File & Lines:** `AppointmentBookingForm.jsx`, line 66

```jsx
<label style={{ color: '#6B7280', display: 'block', marginBottom: '4px' }}>
```

**Why it is a violation:**
Guardrail Section 4, Rule 5 states: *"No hardcoded hex colors. Use `var(--sm-*)` semantic tokens only."* The value `#6B7280` is a raw hex color. The rest of the file is compliant — all other color references correctly use `var(--sm-*)` tokens such as `var(--sm-text-primary)`, `var(--sm-bg)`, etc. This one label was missed.

**Correct Implementation:**
The color `#6B7280` is a muted/secondary text color. The semantically correct token already used elsewhere in this same file is `var(--sm-text-secondary)`:

```jsx
<label style={{ color: 'var(--sm-text-secondary)', display: 'block', marginBottom: '4px' }}>
```

</details>

---

<details open>
<summary><strong>V-04 🔴 — Frappe controller imports and uses <code>smtplib</code> to make a direct external network call</strong></summary>

**Violation Type:** Frappe controllers never make external calls directly; n8n handles ALL cross-system operations

**File & Lines:** `sm_appointment.py`, lines 2–4 (imports) and lines 23–40 (`_send_confirmation_email` method body)

```python
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
```

```python
with smtplib.SMTP('smtp.sendgrid.net', 587) as server:
    server.starttls()
    server.login('apikey', frappe.conf.get('sendgrid_api_key', ''))
    server.send_message(msg)
```

**Why it is a violation:**
Guardrail Section 4, Rule 6 states: *"n8n handles ALL cross-system operations."* Rule 7 — identified as *"the most locked rule in the platform"* — states: *"The workflow engine NEVER calls external systems."* This controller is opening a live TCP connection to `smtp.sendgrid.net:587` inside a Frappe document lifecycle hook. This is a direct external call from the Frappe layer and is an absolute violation of the architectural boundary. Additionally, `frappe.conf.get('sendgrid_api_key', '')` retrieves a credential inline, which conflicts with the vault-reference model described in Rule 13.

**Correct Implementation:**
Delete `_send_confirmation_email` entirely, including all three SMTP imports. The `after_insert` hook should emit a signal to n8n — not send email itself. The correct pattern is to enqueue an n8n webhook trigger:

```python
# sm_appointment.py

import frappe
import requests  # only if triggering n8n directly; prefer frappe.enqueue

class SMAppointment(frappe.model.document.Document):

    def after_insert(self):
        self._trigger_n8n_workflow("appointment_created")
        self._write_crm_timeline_event("appointment_created")

    def _trigger_n8n_workflow(self, event_type):
        frappe.enqueue(
            "sm_scheduling.utils.n8n.trigger_webhook",
            queue="short",
            event_type=event_type,
            doctype="SM Appointment",
            docname=self.name,
        )
```

The n8n webhook handler (`sm_scheduling/utils/n8n.py`) calls the n8n webhook URL. n8n's workflow handles the SendGrid call, the template, and any retry logic. The Frappe controller's only job is to fire the event.

</details>

---

<details open>
<summary><strong>V-05 🔴 — DocType reference is not prefixed "SM "</strong></summary>

**Violation Type:** All custom DocTypes must be prefixed "SM "

**File & Lines:** `sm_appointment.py`, line 16

```python
if not frappe.db.exists("Appointment Type", self.appointment_type):
    frappe.throw(f"Appointment type '{self.appointment_type}' does not exist")
```

**Why it is a violation:**
Guardrail Section 4, Rule 3 states: *"SM DocTypes are prefixed `SM`. No exceptions."* The DocType being checked here is `"Appointment Type"`. Either this DocType is being referenced under the wrong name, or it was created without the required prefix. The guardrails give the example *"SM Appointment Type"* explicitly. No custom DocType may exist on this platform without the `SM ` prefix.

**Correct Implementation:**

```python
if not frappe.db.exists("SM Appointment Type", self.appointment_type):
    frappe.throw(f"Appointment type '{self.appointment_type}' does not exist")
```

If the underlying DocType was created as `"Appointment Type"`, it must be renamed to `"SM Appointment Type"` and a bench migrate run. The reference here and in any linked fields must be updated to match.

</details>

---

<details open>
<summary><strong>V-06 🔴 — <code>_send_confirmation_email</code> is an entire method whose existence violates the n8n boundary</strong></summary>

**Violation Type:** n8n handles ALL cross-system operations including notifications and emails; Frappe controllers never make external calls

**File & Lines:** `sm_appointment.py`, lines 23–40 (full method), and line 22 (`after_insert` call to it)

```python
def after_insert(self):
    self._send_confirmation_email()   # <-- this call
    ...

def _send_confirmation_email(self):  # <-- this entire method
    ...
```

**Why it is a violation:**
This is the corollary violation to V-04. V-04 covers the mechanical facts (SMTP import, TCP connection, credential access). V-06 covers the architectural fact: the method itself should not exist. Section 4, Rule 7 is described as *"the most locked rule in the platform. No exceptions."* Sending a confirmation email is a cross-system operation (Frappe → SendGrid). It does not matter how the call is structured — whether via `smtplib`, `requests`, or `frappe.sendmail`. Any mechanism by which a Frappe controller delivers that email is a violation of this boundary. The correct owner of all email-sending logic is n8n.

**Correct Implementation:**
The method `_send_confirmation_email` must be deleted in its entirety. `after_insert` must call only `_trigger_n8n_workflow` (see V-04 correct implementation) and `_write_crm_timeline_event`. n8n receives the event and owns all downstream notification logic, including: patient lookup, template rendering, SendGrid API call, delivery confirmation, and retry handling.

</details>

---

## Clean Corrected Files

<details>
<summary><strong>AppointmentBookingForm.jsx — corrected</strong></summary>

```jsx
import React, { useState, useEffect } from 'react';
import { useSiteConfig } from '../../hooks/useSiteConfig';

// V-01 fix: TypeScript interface removed entirely.
// V-03 note: #6B7280 replaced with var(--sm-text-secondary) on the Provider label.

const APPOINTMENT_TYPES = ['Individual Therapy', 'Group Therapy', 'Intake', 'Telehealth'];

export default function AppointmentBookingForm({ patientId, onSuccess }) {
  const { subdomain } = useSiteConfig();
  const [providers, setProviders] = useState([]);
  const [selectedProvider, setSelectedProvider] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [slots, setSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // V-02 fix: routes through MAL, no hardcoded localhost Frappe URL.
  useEffect(() => {
    fetch(`/api/modules/scheduling/providers?subdomain=${subdomain}`)
      .then(r => r.json())
      .then(data => setProviders(data.providers || []));
  }, [subdomain]);

  async function loadAvailableSlots(providerId, type) {
    const res = await fetch(
      `/api/modules/scheduling/slots?provider=${providerId}&type=${type}&subdomain=${subdomain}`
    );
    const data = await res.json();
    setSlots(data.slots || []);
  }

  async function handleBook() {
    if (!selectedSlot || !patientId) return;
    setSubmitting(true);
    await fetch('/api/modules/scheduling/appointment/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Frappe-Site-Name': subdomain },
      body: JSON.stringify({
        patient_id: patientId,
        provider_id: selectedProvider,
        appointment_type: selectedType,
        start_datetime: selectedSlot.start,
        end_datetime: selectedSlot.end
      })
    });
    setSubmitting(false);
    onSuccess?.();
  }

  return (
    <div style={{ padding: '24px', background: 'var(--sm-bg)' }}>
      <h2 style={{ color: 'var(--sm-text-primary)', marginBottom: '16px' }}>
        Book Appointment
      </h2>

      <div style={{ marginBottom: '16px' }}>
        {/* V-03 fix: was color: '#6B7280', now uses semantic token */}
        <label style={{ color: 'var(--sm-text-secondary)', display: 'block', marginBottom: '4px' }}>
          Provider
        </label>
        <select
          value={selectedProvider}
          onChange={e => {
            setSelectedProvider(e.target.value);
            if (e.target.value && selectedType) loadAvailableSlots(e.target.value, selectedType);
          }}
          style={{ width: '100%', padding: '8px', border: '1px solid var(--sm-border)' }}
        >
          <option value="">Select provider...</option>
          {providers.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      <div style={{ marginBottom: '16px' }}>
        <label style={{ color: 'var(--sm-text-secondary)', display: 'block', marginBottom: '4px' }}>
          Appointment Type
        </label>
        <select
          value={selectedType}
          onChange={e => {
            setSelectedType(e.target.value);
            if (selectedProvider && e.target.value) loadAvailableSlots(selectedProvider, e.target.value);
          }}
          style={{ width: '100%', padding: '8px', border: '1px solid var(--sm-border)' }}
        >
          <option value="">Select type...</option>
          {APPOINTMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      <div style={{ marginBottom: '24px' }}>
        {slots.map((slot, i) => (
          <button
            key={i}
            onClick={() => setSelectedSlot(slot)}
            style={{
              margin: '4px', padding: '8px 14px',
              background: selectedSlot === slot ? 'var(--sm-primary)' : 'var(--sm-surface)',
              color: selectedSlot === slot ? 'var(--sm-text-inverse)' : 'var(--sm-text-primary)',
              border: '1px solid var(--sm-border)', borderRadius: '6px', cursor: 'pointer'
            }}
          >
            {slot.start}
          </button>
        ))}
      </div>

      <button
        onClick={handleBook}
        disabled={!selectedSlot || submitting}
        style={{
          background: 'var(--sm-primary)', color: 'var(--sm-text-inverse)',
          padding: '10px 24px', border: 'none', borderRadius: '6px', cursor: 'pointer'
        }}
      >
        {submitting ? 'Booking...' : 'Confirm Booking'}
      </button>
    </div>
  );
}
```

</details>

<details>
<summary><strong>sm_appointment.py — corrected</strong></summary>

```python
import frappe


class SMAppointment(frappe.model.document.Document):

    def validate(self):
        if not self.provider_id:
            frappe.throw("Provider is required")
        if not self.start_datetime or not self.end_datetime:
            frappe.throw("Start and end time are required")
        if self.start_datetime >= self.end_datetime:
            frappe.throw("End time must be after start time")
        # V-05 fix: DocType reference corrected from "Appointment Type" to "SM Appointment Type"
        if not frappe.db.exists("SM Appointment Type", self.appointment_type):
            frappe.throw(f"Appointment type '{self.appointment_type}' does not exist")

    def after_insert(self):
        # V-04 / V-06 fix: _send_confirmation_email removed entirely.
        # n8n owns all email and cross-system operations.
        # Enqueue triggers the n8n webhook without blocking the UI request path.
        self._trigger_n8n_workflow("appointment_created")
        self._write_crm_timeline_event("appointment_created")

    def _trigger_n8n_workflow(self, event_type):
        """
        Enqueue an async n8n webhook trigger. The Frappe layer fires the event.
        n8n owns all downstream actions: confirmation email, external API calls, etc.
        """
        frappe.enqueue(
            "sm_scheduling.utils.n8n.trigger_webhook",
            queue="short",
            event_type=event_type,
            doctype="SM Appointment",
            docname=self.name,
        )

    def _write_crm_timeline_event(self, event_type):
        frappe.get_doc({
            "doctype": "SM CRM Timeline Event",
            "patient_id": self.patient_id,
            "event_type": event_type,
            "reference_doctype": "SM Appointment",
            "reference_name": self.name,
            "timestamp": frappe.utils.now()
        }).insert(ignore_permissions=True)

    def on_status_change(self, new_status):
        self._trigger_n8n_workflow(f"appointment_{new_status.lower()}")
        self._write_crm_timeline_event(f"appointment_{new_status.lower()}")
```

</details>

---

## Reviewer Notes

Two violations in the Python file (`V-04` and `V-06`) describe different dimensions of the same root mistake, but they are recorded separately because they represent distinct rule violations: one mechanical (SMTP usage), one architectural (the method's existence). Both must be remediated independently — removing the SMTP calls while keeping a `_send_confirmation_email` method that calls `frappe.sendmail` would fix V-04 while leaving V-06 fully intact.

The `on_status_change` method in the corrected Python file has been updated to also call `_trigger_n8n_workflow`, since status changes are state transitions that n8n should be informed of for any cross-system follow-up (just as `after_insert` does). The original file only wrote a CRM event on status change, which would leave n8n uninformed of transitions — a likely oversight rather than a deliberate design choice, but worth flagging to the author.