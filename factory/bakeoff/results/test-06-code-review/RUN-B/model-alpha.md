model: model-alpha
test: 06-code-review
run: B
date: 2026-04-09

# Code Review Report: Spark Mojo Platform Violations

---

## File 1: `platform/apps/mojo_frontend/src/mojos/scheduling/AppointmentBookingForm.jsx`

### Violation 1: TypeScript Interface Declaration
- **Violation Type:** No TypeScript in frontend files
- **Location:** `AppointmentBookingForm.jsx`, Lines 8-13
- **Why:** The code declares a TypeScript `interface TimeSlot`. Platform rule states: "No TypeScript in any frontend file (.tsx, import type, interface declarations, etc.)"
- **Correct Implementation:** Remove the interface entirely. Use JSDoc comments or inline documentation if type hints are needed for developer experience.

```jsx
// REMOVE THESE LINES:
interface TimeSlot {
  start: string;
  end: string;
  provider_id: string;
  available: boolean;
}

// NO REPLACEMENT NEEDED - JavaScript does not require interface declarations
```

---

### Violation 2: Direct Frappe API Call
- **Violation Type:** React calling Frappe directly
- **Location:** `AppointmentBookingForm.jsx`, Line 25
- **Why:** The `useEffect` hook calls `http://localhost:8000/api/method/sm_scheduling.api.get_providers`. Platform rule states: "React NEVER calls Frappe directly. All frontend API calls go through the abstraction layer at `/api/modules/[capability]/[action]`"
- **Correct Implementation:** Route all API calls through the Mojo Abstraction Layer path.

```jsx
// INCORRECT:
useEffect(() => {
  fetch(`http://localhost:8000/api/method/sm_scheduling.api.get_providers?site=${subdomain}`)
    .then(r => r.json())
    .then(data => setProviders(data.message || []));
}, [subdomain]);

// CORRECT:
useEffect(() => {
  fetch(`/api/modules/scheduling/providers?subdomain=${subdomain}`)
    .then(r => r.json())
    .then(data => setProviders(data.providers || []));
}, [subdomain]);
```

---

### Violation 3: Hardcoded Hex Color
- **Violation Type:** Hardcoded color value
- **Location:** `AppointmentBookingForm.jsx`, Line 64
- **Why:** The label style contains `color: '#6B7280'`. Platform rule states: "No hardcoded hex colors. Use `var(--sm-*)` CSS variables only."
- **Correct Implementation:** Replace with the appropriate semantic CSS variable.

```jsx
// INCORRECT:
<label style={{ color: '#6B7280', display: 'block', marginBottom: '4px' }}>

// CORRECT:
<label style={{ color: 'var(--sm-text-secondary)', display: 'block', marginBottom: '4px' }}>
```

---

## File 2: `platform/apps/sm_scheduling/sm_scheduling/doctype/sm_appointment/sm_appointment.py`

### Violation 4: Direct External API Call (Email Sending)
- **Violation Type:** Frappe controller making external calls directly
- **Location:** `sm_appointment.py`, Lines 2-4 (imports) and Lines 25-46 (`_send_confirmation_email` method)
- **Why:** The code uses `smtplib` to send emails directly via SendGrid. Platform rule states: "n8n handles ALL cross-system operations including notifications, emails, and external API calls. Frappe controllers never make external calls directly." Additionally, the Guardrails document Section 4, Rule 7 states: "The workflow engine NEVER calls external systems. n8n NEVER modifies document state. This boundary is the most locked rule in the platform."
- **Correct Implementation:** Remove the direct email sending logic. Instead, trigger an n8n workflow through Frappe's event system or a webhook. n8n handles the email delivery.

```python
# REMOVE THESE IMPORTS:
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

# INCORRECT METHOD - REMOVE ENTIRELY:
def _send_confirmation_email(self):
    try:
        patient = frappe.get_doc("SM Patient", self.patient_id)
        if not patient.email:
            return
        msg = MIMEMultipart()
        msg['Subject'] = 'Appointment Confirmation'
        msg['From'] = 'appointments@sparkmojo.com'
        msg['To'] = patient.email
        body = MIMEText(
            f"Your appointment is confirmed for {self.start_datetime}. "
            f"Please contact us if you need to reschedule.", 'plain'
        )
        msg.attach(body)
        with smtplib.SMTP('smtp.sendgrid.net', 587) as server:
            server.starttls()
            server.login('apikey', frappe.conf.get('sendgrid_api_key', ''))
            server.send_message(msg)
    except Exception:
        frappe.log_error("Failed to send appointment confirmation email")

# CORRECT APPROACH:
# Option A: Use Frappe's built-in notification system which n8n can subscribe to
def after_insert(self):
    # The appointment creation event will be picked up by n8n
    # via Frappe's event stream or webhook
    self._write_crm_timeline_event("appointment_created")
    # Optionally, create a notification record that n8n processes
    frappe.get_doc({
        "doctype": "SM Notification Queue",
        "event_type": "appointment_confirmation",
        "reference_doctype": "SM Appointment",
        "reference_name": self.name,
        "recipient": self.patient_id,
        "status": "Pending"
    }).insert(ignore_permissions=True)

# Option B: Trigger n8n webhook directly (if permitted by architecture)
# This should still go through an abstraction, but is better than direct SMTP
```

---

### Violation 5: DocType Missing "SM " Prefix
- **Violation Type:** Custom DocType not prefixed
- **Location:** `sm_appointment.py`, Line 17
- **Why:** The code checks for the existence of `"Appointment Type"` without the required "SM " prefix. Platform rule states: "All custom DocTypes must be prefixed 'SM ' (e.g., 'SM Appointment Type', not 'Appointment Type')"
- **Correct Implementation:** Change the DocType reference to include the "SM " prefix.

```python
# INCORRECT:
if not frappe.db.exists("Appointment Type", self.appointment_type):
    frappe.throw(f"Appointment type '{self.appointment_type}' does not exist")

# CORRECT:
if not frappe.db.exists("SM Appointment Type", self.appointment_type):
    frappe.throw(f"Appointment type '{self.appointment_type}' does not exist")
```

---

## Summary of Violations

| # | File | Line | Violation Type | Severity |
|---|------|------|----------------|----------|
| 1 | `AppointmentBookingForm.jsx` | 8-13 | TypeScript interface | Medium |
| 2 | `AppointmentBookingForm.jsx` | 25 | Direct Frappe API call | **Critical** |
| 3 | `AppointmentBookingForm.jsx` | 64 | Hardcoded hex color | Low |
| 4 | `sm_appointment.py` | 2-4, 25-46 | Direct external API call (SMTP) | **Critical** |
| 5 | `sm_appointment.py` | 17 | DocType missing "SM " prefix | High |

**Critical violations (2, 4) must be fixed before merge.** Violation 2 breaks the frontend-backend abstraction contract, and Violation 4 violates the most locked architectural boundary in the platform (Frappe/n8n separation).