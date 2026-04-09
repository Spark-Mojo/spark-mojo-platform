model: model-zeta
test: 06-code-review
run: B
date: 2026-04-09

## Code Review Report — Architecture Violations Found

### File 1: `platform/apps/mojo_frontend/src/mojos/scheduling/AppointmentBookingForm.jsx`

**Violation 1: TypeScript Interface in JSX File**
- **Location:** Line 5
- **Code:** `interface TimeSlot { ... }`
- **Why:** Platform Rule #4 prohibits TypeScript in any frontend file. The file uses `.jsx` extension but contains a TypeScript interface declaration.
- **Correct:** Remove the interface. Use JSDoc comments if type documentation is needed, or simply rely on object shapes without explicit typing.

**Violation 2: React Calling Frappe Directly**
- **Location:** Line 20
- **Code:** `fetch(`http://localhost:8000/api/method/sm_scheduling.api.get_providers?site=${subdomain}`)`
- **Why:** Platform Rule #1 states React NEVER calls Frappe directly. All calls must route through the Mojo Abstraction Layer at `/api/modules/[capability]/[action]`. This line calls the Frappe REST API directly using the `/api/method/` pattern.
- **Correct:** `fetch(`/api/modules/scheduling/providers?site=${subdomain}`)`

**Violation 3: Hardcoded Hex Color**
- **Location:** Line 64
- **Code:** `color: '#6B7280'`
- **Why:** Platform Rule #3 prohibits hardcoded hex colors. All styling must use `var(--sm-*)` CSS variables.
- **Correct:** Replace with an appropriate semantic token such as `var(--sm-text-secondary)` or `var(--sm-text-muted)`.

---

### File 2: `platform/apps/sm_scheduling/sm_scheduling/doctype/sm_appointment/sm_appointment.py`

**Violation 4: Frappe Controller Making External Email Calls**
- **Location:** Lines 23–39 (method `_send_confirmation_email`)
- **Code:** Direct `smtplib` usage with `smtp.sendgrid.net` connection and `server.send_message(msg)`
- **Why:** Platform Rule #5 mandates that n8n handles ALL cross-system operations including notifications and emails. Frappe controllers must never make external calls directly. This method establishes an SMTP connection to SendGrid from within the document controller.
- **Correct:** Remove the SMTP logic. Instead, enqueue an n8n webhook trigger or insert a queue document that n8n polls to send the confirmation email. The Frappe controller should only create a record indicating an email needs to be sent, not send it.

**Violation 5: DocType Missing "SM " Prefix**
- **Location:** Line 18
- **Code:** `frappe.db.exists("Appointment Type", self.appointment_type)`
- **Why:** Platform Rule #4 requires all custom DocTypes to be prefixed "SM ". The string "Appointment Type" should be "SM Appointment Type". The platform rules explicitly use this as the example of incorrect naming.
- **Correct:** `frappe.db.exists("SM Appointment Type", self.appointment_type)`

**Additional Note:** Lines 2–3 (`import smtplib`, `from email.mime...`) should be removed as they support the Violation #4 functionality and are unnecessary when n8n handles email operations.