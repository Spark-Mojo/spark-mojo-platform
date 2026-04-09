model: model-epsilon
test: 06-code-review
run: B
date: 2026-04-09

# Code Review: Spark Mojo Platform Guardrails Compliance

I've completed a thorough line-by-line review of both files. Below are the violations found.

---

## File 1: `AppointmentBookingForm.jsx`

<details>
<summary><strong>View File Analysis</strong></summary>

| Line | Violation Type | Issue |
|------|---------------|-------|
| 4–8 | TypeScript in JSX file | `interface TimeSlot` declaration |
| 26 | Direct Frappe API call | `fetch('http://localhost:8000/api/method/...')` |
| 57 | Hardcoded hex color | `color: '#6B7280'` |

</details>

### Violation 1: TypeScript Interface Declaration

**Location:** Lines 4–8

**Violation:** The file contains a TypeScript `interface TimeSlot` declaration. The platform rules explicitly state: *"No TypeScript in any frontend file (.tsx, import type, interface declarations, etc.)"*

**Why it matters:** TypeScript compiles to JavaScript and adds type checking overhead. The platform standardizes on plain JavaScript JSX for consistency and simplicity across all frontend files.

**Correct implementation:**
```javascript
// Remove the interface entirely, or use JSDoc type comments if type hints are needed
// Example with JSDoc:
/**
 * @typedef {Object} TimeSlot
 * @property {string} start
 * @property {string} end
 * @property {string} provider_id
 * @property {boolean} available
 */

// Or simply remove typing and rely on runtime checks
const [slots, setSlots] = useState([]);
```

---

### Violation 2: Direct Frappe API Call

**Location:** Line 26

**Violation:** React is calling Frappe directly via `/api/method/`:
```javascript
fetch(`http://localhost:8000/api/method/sm_scheduling.api.get_providers?site=${subdomain}`)
```

**Why it matters:** Platform rule #1: *"React NEVER calls Frappe directly. All frontend API calls go through the abstraction layer at /api/modules/[capability]/[action]"*. Additionally, hardcoding `localhost:8000` is a security and deployment anti-pattern.

**Correct implementation:**
```javascript
// Use the Mojo Abstraction Layer path
fetch(`/api/modules/scheduling/providers?subdomain=${subdomain}`)
  .then(r => r.json())
  .then(data => setProviders(data.message || []));
```

---

### Violation 3: Hardcoded Hex Color

**Location:** Line 57

**Violation:**
```jsx
<label style={{ color: '#6B7280', display: 'block', marginBottom: '4px' }}>
```

**Why it matters:** Platform rule #3: *"No hardcoded hex colors. Use var(--sm-*) CSS variables only."* Hardcoded colors bypass the design token system and create maintenance issues when theming changes.

**Correct implementation:**
```jsx
<label style={{ color: 'var(--sm-text-secondary)', display: 'block', marginBottom: '4px' }}>
```

---

## File 2: `sm_appointment.py`

<details>
<summary><strong>View File Analysis</strong></summary>

| Line | Violation Type | Issue |
|------|---------------|-------|
| 1–3 | External API call from controller | Direct SMTP/SendGrid connection |
| 10 | Non-SM-prefixed DocType | `"Appointment Type"` should be `"SM Appointment Type"` |
| 20, 41 | Bare except clauses | `except Exception:` catches all errors silently |

</details>

### Violation 1: External Call from Frappe Controller (CRITICAL)

**Location:** Lines 1–3, 17–38

**Violation:** The `_send_confirmation_email()` method directly connects to SendGrid's SMTP server:
```python
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
# ...
with smtplib.SMTP('smtp.sendgrid.net', 587) as server:
    server.starttls()
    server.login('apikey', frappe.conf.get('sendgrid_api_key', ''))
    server.send_message(msg)
```

**Why it matters:** Platform rule #5: *"n8n handles ALL cross-system operations including notifications, emails, and external API calls. Frappe controllers never make external calls directly."* This is one of the most locked rules in the platform architecture. The Frappe workflow engine should only manage internal document state; n8n must handle all external communications.

**Correct implementation:**
```python
def _send_confirmation_email(self):
    """Queue email to be sent via n8n workflow."""
    frappe.publish_realtime(
        event='sm_appointment_confirmation_requested',
        message={
            'appointment_name': self.name,
            'patient_id': self.patient_id,
            'start_datetime': self.start_datetime
        },
        after_commit=True
    )
    # n8n webhook at /api/webhooks/sm-appointment-email
    # handles the actual SendGrid call
```

Then configure an n8n workflow triggered by this event to send the email via SendGrid.

---

### Violation 2: Non-SM-Prefixed DocType Reference

**Location:** Line 10

**Violation:**
```python
if not frappe.db.exists("Appointment Type", self.appointment_type):
```

**Why it matters:** Platform rule #4: *"All custom DocTypes must be prefixed 'SM ' (e.g., 'SM Appointment Type', not 'Appointment Type')"*. If `Appointment Type` is a custom DocType, it violates the naming convention.

**Correct implementation:**
```python
# If "Appointment Type" is a custom DocType, use:
if not frappe.db.exists("SM Appointment Type", self.appointment_type):
    frappe.throw(f"Appointment type '{self.appointment_type}' does not exist")
```

*Note: If `Appointment Type` is a standard Frappe/ERPNext DocType (not custom), this may be acceptable. However, given this is in the `sm_scheduling` app, assume custom unless confirmed otherwise.*

---

### Violation 3: Bare Except Clauses

**Location:** Lines 20, 41

**Violation:**
```python
except Exception:
    frappe.log_error("Failed to send appointment confirmation email")
```

**Why it matters:** Bare `except Exception:` catches all exceptions including system-exiting exceptions (`SystemExit`, `KeyboardInterrupt`) and can mask bugs. This is a Python anti-pattern and poor error handling practice.

**Correct implementation:**
```python
except Exception as e:
    frappe.log_error(
        "Failed to send appointment confirmation email",
        message=str(e),
        frappe.get_traceback()
    )
```

---

## Summary Table

| File | Severity | Violation | Line(s) |
|------|----------|-----------|---------|
| `.jsx` | 🔴 High | TypeScript interface in JSX file | 4–8 |
| `.jsx` | 🔴 High | Direct Frappe API call from React | 26 |
| `.jsx` | 🟡 Medium | Hardcoded hex color `#6B7280` | 57 |
| `.py` | 🔴 **CRITICAL** | External SMTP call from controller | 17–38 |
| `.py` | 🟡 Medium | Non-SM-prefixed DocType reference | 10 |
| `.py` | 🟡 Medium | Bare `except Exception:` clauses | 20, 41 |

---

## Blockers Before Merge

The **external SMTP call in `sm_appointment.py`** is the highest-priority violation. Per platform rule #7: *"Frappe Workflow / transition_state() manages internal document state. n8n manages cross-system actions triggered by state changes. The workflow engine NEVER calls external systems."* This is described as *"the most locked rule in the platform. No exceptions."*