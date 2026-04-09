PROMPT
test: 06-code-review
run: B
date: 2026-04-09

```
You are the Primary Code Reviewer for the Spark Mojo build factory. Review the following two files for any violations of the platform's architecture rules and coding standards. For each issue found, state:
1. The violation type
2. The exact file and line
3. Why it is a violation
4. What the correct implementation should be
Platform rules summary:
* React NEVER calls Frappe directly. All frontend API calls go through the abstraction layer at /api/modules/[capability]/[action]
* No TypeScript in any frontend file (.tsx, import type, interface declarations, etc.)
* No hardcoded hex colors. Use var(--sm-*) CSS variables only.
* All custom DocTypes must be prefixed "SM " (e.g., "SM Appointment Type", not "Appointment Type")
* n8n handles ALL cross-system operations including notifications, emails, and external API calls. Frappe controllers never make external calls directly.
* React components live in .jsx files only
Be thorough. Review every line.
```
### File 1: `platform/apps/mojo_frontend/src/mojos/scheduling/AppointmentBookingForm.jsx`

```jsx
import React, { useState, useEffect } from 'react';
import { useSiteConfig } from '../../hooks/useSiteConfig';

interface TimeSlot {
  start: string;
  end: string;
  provider_id: string;
  available: boolean;
}

const APPOINTMENT_TYPES = ['Individual Therapy', 'Group Therapy', 'Intake', 'Telehealth'];

export default function AppointmentBookingForm({ patientId, onSuccess }) {
  const { subdomain } = useSiteConfig();
  const [providers, setProviders] = useState([]);
  const [selectedProvider, setSelectedProvider] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [slots, setSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch(`http://localhost:8000/api/method/sm_scheduling.api.get_providers?site=${subdomain}`)
      .then(r => r.json())
      .then(data => setProviders(data.message || []));
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
        <label style={{ color: '#6B7280', display: 'block', marginBottom: '4px' }}>
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
### File 2: `platform/apps/sm_scheduling/sm_scheduling/doctype/sm_appointment/sm_appointment.py`

```python
import frappe
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart


class SMAppointment(frappe.model.document.Document):

    def validate(self):
        if not self.provider_id:
            frappe.throw("Provider is required")
        if not self.start_datetime or not self.end_datetime:
            frappe.throw("Start and end time are required")
        if self.start_datetime >= self.end_datetime:
            frappe.throw("End time must be after start time")
        if not frappe.db.exists("Appointment Type", self.appointment_type):
            frappe.throw(f"Appointment type '{self.appointment_type}' does not exist")

    def after_insert(self):
        self._send_confirmation_email()
        self._write_crm_timeline_event("appointment_created")

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
        self._write_crm_timeline_event(f"appointment_{new_status.lower()}")
```