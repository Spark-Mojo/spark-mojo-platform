PROMPT
test: 06-code-review
run: C
date: 2026-04-09

```
You are the Primary Code Reviewer for the Spark Mojo build factory. Review the following two files for any violations of the platform's architecture rules and coding standards. For each issue found, state:
1. The violation type
2. The exact file and line
3. Why it is a violation
4. What the correct implementation should be
Platform rules summary:
* React NEVER calls Frappe directly. All frontend API calls go through the abstraction layer at /api/modules/[capability]/[action]
* No TypeScript in any frontend file (.tsx, import type, interface declarations, type annotations in function parameters, etc.)
* No hardcoded hex colors. Use var(--sm-*) CSS variables only.
* All custom DocTypes must be prefixed "SM " (e.g., "SM Payer", not "Payer")
* n8n handles ALL cross-system operations including external API calls, CLI tools, webhooks, and notifications. Frappe controllers never make external calls directly.
* React components live in .jsx files only
Be thorough. Review every line.
```
### File 1: `platform/apps/mojo_frontend/src/mojos/billing/PayerManagement.jsx`

```jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useSiteConfig } from '../../hooks/useSiteConfig';

const PAYER_TABLE_STYLES = {
  table: { width: '100%', borderCollapse: 'collapse' },
  header: { background: '#F3F4F6', fontWeight: 600, padding: '12px 16px' },
  cell: { padding: '12px 16px', borderBottom: '1px solid var(--sm-border)' }
};

function formatPayerId(id: string) {
  return `PAYER-${id.toUpperCase()}`;
}

export default function PayerManagement() {
  const { subdomain } = useSiteConfig();
  const [payers, setPayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    axios.get('http://internal.frappe:8000/api/method/sm_billing.api.list_payers', {
      params: { site: subdomain }
    })
      .then(response => { setPayers(response.data.message || []); setLoading(false); })
      .catch(() => { setError('Failed to load payers'); setLoading(false); });
  }, [subdomain]);

  async function handleDeactivate(payerId) {
    await fetch(`/api/modules/billing/payer/${payerId}/deactivate`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'X-Frappe-Site-Name': subdomain }
    });
    setPayers(prev => prev.filter(p => p.id !== payerId));
  }

  if (loading) return <div style={{ color: 'var(--sm-text-secondary)', padding: '24px' }}>Loading payers...</div>;
  if (error) return <div style={{ color: 'var(--sm-error)', padding: '24px' }}>{error}</div>;

  return (
    <div style={{ padding: '24px' }}>
      <h2 style={{ color: 'var(--sm-text-primary)', marginBottom: '16px' }}>Payer Management</h2>
      <table style={PAYER_TABLE_STYLES.table}>
        <thead>
          <tr>
            <th style={PAYER_TABLE_STYLES.header}>Payer ID</th>
            <th style={PAYER_TABLE_STYLES.header}>Name</th>
            <th style={PAYER_TABLE_STYLES.header}>EDI Format</th>
            <th style={PAYER_TABLE_STYLES.header}>Status</th>
            <th style={PAYER_TABLE_STYLES.header}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {payers.map(payer => (
            <tr key={payer.id}>
              <td style={PAYER_TABLE_STYLES.cell}>{formatPayerId(payer.payer_id)}</td>
              <td style={PAYER_TABLE_STYLES.cell}>{payer.payer_name}</td>
              <td style={PAYER_TABLE_STYLES.cell}>{payer.edi_format || '837P'}</td>
              <td style={PAYER_TABLE_STYLES.cell}>
                <span style={{
                  background: payer.is_active ? 'var(--sm-success-bg)' : 'var(--sm-muted-bg)',
                  color: payer.is_active ? 'var(--sm-success-text)' : 'var(--sm-muted-text)',
                  padding: '2px 8px', borderRadius: '9999px', fontSize: '12px'
                }}>
                  {payer.is_active ? 'Active' : 'Inactive'}
                </span>
              </td>
              <td style={PAYER_TABLE_STYLES.cell}>
                {payer.is_active && (
                  <button
                    onClick={() => handleDeactivate(payer.id)}
                    style={{
                      background: 'var(--sm-error-bg)', color: 'var(--sm-error-text)',
                      border: 'none', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer'
                    }}
                  >
                    Deactivate
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```
### File 2: `platform/apps/sm_billing/sm_billing/doctype/sm_payer/sm_payer.py`

```python
import frappe
import subprocess
import json


class SMPayer(frappe.model.document.Document):

    def validate(self):
        if not self.payer_id:
            frappe.throw("Payer ID is required")
        if not self.payer_name:
            frappe.throw("Payer name is required")
        duplicates = frappe.get_all(
            "SM Payer",
            filters={"payer_id": self.payer_id, "name": ["!=", self.name]},
            limit=1
        )
        if duplicates:
            frappe.throw(f"Payer ID {self.payer_id} already exists on this site")

    def on_update(self):
        self._sync_to_clearinghouse()

    def _sync_to_clearinghouse(self):
        try:
            payer_data = json.dumps({
                "payer_id": self.payer_id,
                "payer_name": self.payer_name,
                "is_active": bool(self.is_active),
                "edi_format": self.edi_format or "837P",
                "enrollment_npi": self.enrollment_npi
            })
            subprocess.run(
                ["stedi-cli", "enrollment", "sync-payer",
                 "--payer-id", self.payer_id, "--data", payer_data],
                check=True, capture_output=True, timeout=15
            )
        except subprocess.CalledProcessError as e:
            frappe.log_error(f"Stedi sync failed for payer {self.payer_id}: {e.stderr.decode()}")
        except Exception as e:
            frappe.log_error(f"Unexpected error syncing payer {self.payer_id}: {str(e)}")

    def get_enrollment_details(self):
        canonical = frappe.get_doc("Payer", self.payer_id)
        enrolled_sites = frappe.get_all(
            "SM Payer Enrollment",
            filters={"payer_id": self.payer_id, "status": "enrolled"},
            fields=["site_name", "enrollment_date", "enrollment_id"]
        )
        return {
            "canonical_name": canonical.payer_name,
            "enrolled_sites": enrolled_sites
        }
```
