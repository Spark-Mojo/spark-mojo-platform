model: model-epsilon
test: 06-code-review
run: C
date: 2026-04-09

# Code Review: Platform Architecture Violations

## Summary

I found **5 violations** across the two files. One file passes all checks; the other has multiple critical architecture violations.

---

## File 1: `PayerManagement.jsx`

**Status:** ❌ **4 Violations Found**

---

### Violation 1: Direct Frappe API Call

| Property | Value |
|----------|-------|
| **Type** | Architecture — React calling Frappe directly |
| **File** | `platform/apps/mojo_frontend/src/mojos/billing/PayerManagement.jsx` |
| **Lines** | 21-25 |
| **Violation** | `axios.get('http://internal.frappe:8000/api/method/sm_billing.api.list_payers', ...)` bypasses the abstraction layer entirely |
| **Why** | Platform rule 1 states: *"React NEVER calls Frappe directly. All React calls go through `/api/modules/[capability]/[action]` on the Mojo Abstraction Layer."* |
| **Correct** | ```js\naxios.get(`/api/modules/billing/payer/list`, { params: { site: subdomain }})\n``` |

---

### Violation 2: TypeScript Annotation in JSX

| Property | Value |
|----------|-------|
| **Type** | Language violation — TypeScript in JSX file |
| **File** | `PayerManagement.jsx` |
| **Line** | 13 |
| **Violation** | `function formatPayerId(id: string)` |
| **Why** | Platform rule 4 states: *"No TypeScript. All frontend files are `.jsx`."* Type annotations in function parameters are TypeScript syntax. |
| **Correct** | ```js\nfunction formatPayerId(id) {\n  return `PAYER-${id.toUpperCase()}`;\n}\n``` |

---

### Violation 3: Hardcoded Hex Color

| Property | Value |
|----------|-------|
| **Type** | Styling violation — hardcoded hex color |
| **File** | `PayerManagement.jsx` |
| **Line** | 8 |
| **Violation** | `header: { background: '#F3F4F6', fontWeight: 600, padding: '12px 16px' }` |
| **Why** | Platform rule 5 states: *"No hardcoded hex colors. Use `var(--sm-*)` CSS variables only."* |
| **Correct** | ```js\nheader: { background: 'var(--sm-muted-bg)', fontWeight: 600, padding: '12px 16px' }\n``` |

---

### Violation 4: Direct Frappe API Call (Partial Redo Check)

| Property | Value |
|----------|-------|
| **Type** | Architecture — React calling Frappe directly |
| **File** | `PayerManagement.jsx` |
| **Line** | 30 |
| **Violation** | The `handleDeactivate` function correctly uses the abstraction layer, but this code path is **dead** because the initial `useEffect` fails to load data, so users cannot reach the deactivate button. However, if the initial load were fixed, the deactivate call is correct. |

---

## File 2: `sm_payer.py`

**Status:** ❌ **1 Critical Architecture Violation**

---

### Violation 1: External Call from Frappe Controller

| Property | Value |
|----------|-------|
| **Type** | Architecture — external call in Frappe controller |
| **File** | `platform/apps/sm_billing/sm_billing/doctype/sm_payer/sm_payer.py` |
| **Lines** | 23-31 |
| **Violation** | `_sync_to_clearinghouse()` executes `subprocess.run(["stedi-cli", ...])` directly |
| **Why** | Platform rule 6 states: *"n8n handles ALL cross-system operations including external API calls, CLI tools, webhooks, and notifications. Frappe controllers never make external calls directly."* Also: *"n8n manages cross-system actions triggered by state changes. The workflow engine NEVER calls external systems."* |
| **Correct** | The `on_update` hook should emit an event or queue a workflow message. n8n should be listening for `sm_payer.updated` events and executing the Stedi CLI sync. |

```python
# Correct implementation:
def on_update(self):
    # Emit event for n8n to handle external sync
    frappe.publish_realtime(
        event="sm_payer_updated",
        message={"payer_id": self.payer_id, "action": "sync_clearinghouse"},
        after_commit=True
    )
```

---

### Bonus Finding: DocType Reference Without SM Prefix

| Property | Value |
|----------|-------|
| **Type** | Naming convention violation |
| **File** | `sm_payer.py` |
| **Line** | 37 |
| **Violation** | `frappe.get_doc("Payer", self.payer_id)` |
| **Why** | Platform rule 3 states: *"All custom DocTypes must be prefixed 'SM ' (e.g., 'SM Payer', not 'Payer')"* |
| **Correct** | ```python\nfrappe.get_doc("SM Payer", self.payer_id)\n``` |

> **Note:** This assumes "Payer" is a custom SM DocType. If it's a legitimate external reference (e.g., external payer ID system), this may be acceptable, but the naming suggests it's intended to be an SM DocType.

---

## Corrected Code Snippets

### File 1: `PayerManagement.jsx` (key fixes)

```jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useSiteConfig } from '../../hooks/useSiteConfig';

const PAYER_TABLE_STYLES = {
  table: { width: '100%', borderCollapse: 'collapse' },
  header: { background: 'var(--sm-muted-bg)', fontWeight: 600, padding: '12px 16px' },
  cell: { padding: '12px 16px', borderBottom: '1px solid var(--sm-border)' }
};

function formatPayerId(id) {
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
    // FIX: Use abstraction layer, not direct Frappe call
    axios.get('/api/modules/billing/payer/list', {
      params: { site: subdomain }
    })
      .then(response => { setPayers(response.data.message || []); setLoading(false); })
      .catch(() => { setError('Failed to load payers'); setLoading(false); });
  }, [subdomain]);
  
  // ... rest of component
```

### File 2: `sm_payer.py` (key fix)

```python
def on_update(self):
    # FIX: Emit event for n8n, don't call external system directly
    frappe.publish_realtime(
        event="sm_payer_updated",
        message={
            "doctype": "SM Payer",
            "name": self.name,
            "payer_id": self.payer_id,
            "action": "sync_clearinghouse"
        },
        after_commit=True
    )

# Remove _sync_to_clearinghouse() from this file entirely
# That logic belongs in an n8n workflow
```

---

## Violation Summary Table

| # | File | Line(s) | Rule Violated | Severity |
|---|------|---------|---------------|----------|
| 1 | `PayerManagement.jsx` | 21-25 | React → Frappe direct call | **Critical** |
| 2 | `PayerManagement.jsx` | 13 | TypeScript annotation | Medium |
| 3 | `PayerManagement.jsx` | 8 | Hardcoded hex color | Low |
| 4 | `sm_payer.py` | 23-31 | External call from Frappe | **Critical** |
| 5 | `sm_payer.py` | 37 | Missing SM prefix | Medium |