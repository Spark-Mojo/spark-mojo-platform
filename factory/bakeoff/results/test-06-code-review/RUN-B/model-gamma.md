model: model-gamma
test: 06-code-review
run: B
date: 2026-04-09

Here is the thorough architecture and standards review of both files:

### File 1: `platform/apps/mojo_frontend/src/mojos/scheduling/AppointmentBookingForm.jsx`

**Issue 1: TypeScript Interface Declaration**
1. **Violation Type:** TypeScript syntax in frontend
2. **Exact File and Line:** `AppointmentBookingForm.jsx`, Lines 4–9
3. **Why it is a violation:** Platform rules explicitly forbid TypeScript in all frontend files, including `interface` declarations. All React components must remain pure JavaScript in `.jsx` files.
4. **Correct Implementation:** Delete the `interface TimeSlot` block entirely. If runtime shape documentation is needed, use JSDoc `@typedef` comments or rely on implicit JavaScript object patterns.

**Issue 2: Direct Frappe API Call**
1. **Violation Type:** React bypassing the Mojo Abstraction Layer (MAL)
2. **Exact File and Line:** `AppointmentBookingForm.jsx`, Line 17
3. **Why it is a violation:** React **NEVER** calls Frappe directly. The code hits Frappe's native REST endpoint (`/api/method/sm_scheduling.api.get_providers`). All frontend-to-backend communication must route through the MAL at `/api/modules/[capability]/[action]`.
4. **Correct Implementation:** Replace the URL with the MAL routing pattern, e.g., `/api/modules/scheduling/providers?subdomain=${subdomain}`. Ensure the corresponding MAL FastAPI route handles the proxying to the underlying Frappé site.

**Issue 3: Hardcoded Hex Color**
1. **Violation Type:** Hardcoded CSS hex value
2. **Exact File and Line:** `AppointmentBookingForm.jsx`, Line 55
3. **Why it is a violation:** The platform enforces zero hardcoded hex colors. All visual styling must exclusively use semantic CSS variables prefixed with `var(--sm-*)`.
4. **Correct Implementation:** Replace `'#6B7280'` with an appropriate semantic token such as `var(--sm-text-secondary)` or `var(--sm-text-muted)`.

---

### File 2: `platform/apps/sm_scheduling/sm_scheduling/doctype/sm_appointment/sm_appointment.py`

**Issue 4: Missing "SM " Prefix on Custom DocType**
1. **Violation Type:** Invalid custom DocType naming convention
2. **Exact File and Line:** `sm_appointment.py`, Line 19
3. **Why it is a violation:** All custom DocTypes on the platform must be prefixed with `"SM "`. `"Appointment Type"` lacks the mandatory namespace.
4. **Correct Implementation:** Change the string literal to `"SM Appointment Type"`. Ensure the DocType JSON file in the Frappe app directory reflects this exact naming.

**Issue 5: Direct External Email Dispatch from Frappe Controller**
1. **Violation Type:** Direct cross-system operation / External API call in Frappe
2. **Exact File and Line:** `sm_appointment.py`, Lines 2–3 (imports), 24 (hook invocation), 23–40 (`_send_confirmation_email` method)
3. **Why it is a violation:** Platform architecture mandates that **n8n handles ALL cross-system operations**, including email dispatch and notifications. Frappe controllers are strictly internal state managers and must never make direct external calls (like opening SMTP sockets).
4. **Correct Implementation:** 
   * Remove `import smtplib`, `MIMEText`, `MIMEMultipart`, and the `_send_confirmation_email` method.
   * Remove `self._send_confirmation_email()` from `after_insert`.
   * Instead, have `after_insert` publish a Frappe event (e.g., `frappe.publish_realtime` or a dedicated event log DocType). Configure an n8n workflow to listen for the `sm_appointment.after_insert` event and handle the SendGrid email dispatch asynchronously. This preserves the hard boundary: Frappe manages internal state, n8n manages external communication.