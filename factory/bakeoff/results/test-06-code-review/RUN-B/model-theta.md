model: model-theta
test: 06-code-review
run: B
date: 2026-04-09

# Spark Mojo — Primary Code Review: Appointment Booking Files

## Executive Summary

**CRITICAL VIOLATIONS DETECTED** — Both files contain multiple violations of platform architecture rules. File 1 has 3 violations; File 2 has 4 violations. Most concerning are direct Frappe API calls, TypeScript usage, and email sending directly from Frappe controllers.

---

## File 1: `AppointmentBookingForm.jsx` Review

### Violation 1: TypeScript Interface Declaration
**Violation Type:** TypeScript usage in frontend file  
**File & Line:** `AppointmentBookingForm.jsx`, line 4  
**Why it's a violation:** Platform rule: "No TypeScript in any frontend file (.tsx, import type, interface declarations, etc.)"  
**Correct Implementation:** Remove the TypeScript interface. Use JSDoc comments or plain JavaScript objects:
```jsx
// JSDoc alternative
/**
 * @typedef {Object} TimeSlot
 * @property {string} start
 * @property {string} end
 * @property {string} provider_id
 * @property {boolean} available
 */
```

### Violation 2: Direct Frappe API Call
**Violation Type:** React calling Frappe directly  
**File & Line:** `AppointmentBookingForm.jsx`, line 20  
**Why it's a violation:** Platform rule: "React NEVER calls Frappe directly. All frontend API calls go through the abstraction layer at `/api/modules/[capability]/[action]`"  
**Correct Implementation:** Route through the Mojo Abstraction Layer:
```jsx
useEffect(() => {
  fetch(`/api/modules/scheduling/providers?subdomain=${subdomain}`)
    .then(r => r.json())
    .then(data => setProviders(data.providers || []));
}, [subdomain]);
```

### Violation 3: Hardcoded Hex Color
**Violation Type:** Hardcoded CSS color value  
**File & Line:** `AppointmentBookingForm.jsx`, line 67  
**Why it's a violation:** Platform rule: "No hardcoded hex colors. Use `var(--sm-*)` CSS variables only"  
**Correct Implementation:** Use semantic CSS variable:
```jsx
label style={{ color: 'var(--sm-text-muted)', display: 'block', marginBottom: '4px' }}>
```

---

## File 2: `sm_appointment.py` Review

### Violation 1: Direct External Email Sending
**Violation Type:** Frappe controller making external API calls  
**File & Line:** `sm_appointment.py`, lines 16, 19-38  
**Why it's a violation:** Platform rule: "n8n handles ALL cross-system operations including notifications, emails, and external API calls. Frappe controllers never make external calls directly"  
**Correct Implementation:** Fire a Frappe event and let n8n handle email sending:
```python
def after_insert(self):
    # Trigger n8n workflow via Frappe event
    frappe.publish_realtime(
        event='sm_appointment_created',
        message={
            'appointment_name': self.name,
            'patient_id': self.patient_id,
            'start_datetime': self.start_datetime,
            'end_datetime': self.end_datetime
        }
    )
    self._write_crm_timeline_event("appointment_created")
```

### Violation 2: Hardcoded API Credentials
**Violation Type:** Admin API credentials in code  
**File & Line:** `sm_appointment.py`, line 32  
**Why it's a violation:** Platform rule: "Admin API credentials are NEVER stored or displayed in any Mojo. Only vault reference strings (e.g., `vault:willow/stedi`) are managed"  
**Correct Implementation:** Remove credential handling entirely. Email sending should be configured in n8n with vault references.

### Violation 3: DocType Reference Without SM Prefix
**Violation Type:** Custom DocType missing SM prefix  
**File & Line:** `sm_appointment.py`, line 13  
**Why it's a violation:** Platform rule: "All custom DocTypes must be prefixed 'SM ' (e.g., 'SM Appointment Type', not 'Appointment Type')"  
**Correct Implementation:** Use the correctly prefixed DocType:
```python
if not frappe.db.exists("SM Appointment Type", self.appointment_type):
    frappe.throw(f"Appointment type '{self.appointment_type}' does not exist")
```

### Violation 4: Direct SMTP Integration
**Violation Type:** Cross-system operation in Frappe controller  
**File & Line:** `sm_appointment.py`, lines 19-38 (entire `_send_confirmation_email` method)  
**Why it's a violation:** Violates the locked workflow/n8n boundary: "Frappe Workflow manages internal document state. n8n manages cross-system actions triggered by state changes. The workflow engine NEVER calls external systems."  
**Correct Implementation:** Delete the entire `_send_confirmation_email` method. Email sending should be configured as an n8n workflow triggered by the `sm_appointment_created` event.

---

## Additional Observations (Non-Violations)

### File 1 Positive Aspects:
- ✅ Uses `.jsx` file extension (correct)
- ✅ Correctly uses abstraction layer for `/api/modules/scheduling/slots` and `/api/modules/scheduling/appointment/create`
- ✅ Uses CSS variables (`var(--sm-*)`) for most styling
- ✅ Properly structured React component

### File 2 Positive Aspects:
- ✅ DocType class name `SMAppointment` follows SM prefix convention
- ✅ CRM timeline integration in `_write_crm_timeline_event` aligns with Leg 2 requirement
- ✅ Proper validation logic
- ✅ Error logging with `frappe.log_error`

---

## Recommended Refactoring Steps

### Immediate Actions (Blocking):
1. **Remove TypeScript interface** from File 1
2. **Replace direct Frappe API call** with MAL endpoint in File 1
3. **Delete email sending logic** entirely from File 2
4. **Fix DocType reference** to use SM prefix in File 2

### Architectural Changes:
1. **Create MAL endpoints** for scheduling providers if not existing:
   - `/api/modules/scheduling/providers`
   - `/api/modules/scheduling/slots` (already used correctly)
   - `/api/modules/scheduling/appointment/create` (already used correctly)

2. **Create n8n workflow** for appointment confirmation emails:
   - Trigger: Frappe event `sm_appointment_created`
   - Actions: Fetch patient email, compose message, send via SendGrid
   - CRM logging: Write email_sent event to timeline

3. **Update validation** to check for `SM Appointment Type` DocType

---

## Platform Architecture Compliance Score

| File | Compliance Score | Critical Violations |
|------|-----------------|---------------------|
| `AppointmentBookingForm.jsx` | 60% | 3 |
| `sm_appointment.py` | 50% | 4 |

**Overall Assessment:** **FAIL** — Both files require significant refactoring to comply with platform architecture rules. The most critical issues are the direct Frappe API call and email sending from Frappe controller, which violate core platform boundaries.

**Next Steps:** Block further development on these files until violations are addressed. Create BLOCKED-SCHEDULING-ARCH.md to document the required architectural changes.