model: model-beta
test: 06-code-review
run: C
date: 2026-04-09

# Code Review: Platform Guardrail Violations

**Files reviewed:**
1. `platform/apps/mojo_frontend/src/mojos/billing/PayerManagement.jsx`
2. `platform/apps/sm_billing/sm_billing/doctype/sm_payer/sm_payer.py`

**Result: 🔴 5 violations found — both files fail review.**

---

## File 1: `PayerManagement.jsx`

### Violation 1 — Direct Frappe API Call from React

| Field | Detail |
|---|---|
| **Rule** | Architecture Immutable #1: *"React NEVER calls Frappe directly. All React calls go through `/api/modules/[capability]/[action]`."* |
| **File & Line** | `PayerManagement.jsx`, line ~24 |
| **Code** | `axios.get('http://internal.frappe:8000/api/method/sm_billing.api.list_payers', { params: { site: subdomain } })` |
| **Why it violates** | This call hits `internal.frappe:8000/api/method/...` — a raw Frappe whitelisted method endpoint. React is bypassing the Mojo Abstraction Layer entirely. Notably, the `handleDeactivate` function on line ~32 uses the correct pattern (`/api/modules/billing/payer/...`), proving the author knows the rule and simply didn't apply it consistently. |
| **Correct implementation** | Route through the MAL: |

```jsx
// ❌ WRONG
axios.get('http://internal.frappe:8000/api/method/sm_billing.api.list_payers', {
  params: { site: subdomain }
})

// ✅ CORRECT
fetch('/api/modules/billing/payers', {
  headers: { 'X-Frappe-Site-Name': subdomain }
})
```

---

### Violation 2 — Hardcoded Hex Color

| Field | Detail |
|---|---|
| **Rule** | Architecture Immutable #5: *"No hardcoded hex colors. Use `var(--sm-*)` semantic tokens only."* |
| **File & Line** | `PayerManagement.jsx`, line ~8 |
| **Code** | `header: { background: '#F3F4F6', ... }` |
| **Why it violates** | `#F3F4F6` is a hardcoded hex value. All other color references in this file correctly use `var(--sm-*)` tokens (e.g., `var(--sm-border)`, `var(--sm-error)`), making this an isolated miss. |
| **Correct implementation** | |

```jsx
// ❌ WRONG
header: { background: '#F3F4F6', fontWeight: 600, padding: '12px 16px' },

// ✅ CORRECT
header: { background: 'var(--sm-header-bg)', fontWeight: 600, padding: '12px 16px' },
```

---

### Violation 3 — TypeScript Type Annotation in `.jsx` File

| Field | Detail |
|---|---|
| **Rule** | Architecture Immutable #4: *"No TypeScript. All frontend files are `.jsx`."* Also: *"No TypeScript in any frontend file (.tsx, import type, interface declarations, type annotations in function parameters, etc.)"* |
| **File & Line** | `PayerManagement.jsx`, line ~12 |
| **Code** | `function formatPayerId(id: string) {` |
| **Why it violates** | The `: string` parameter type annotation is TypeScript syntax. This will fail to parse in a standard JSX/Babel pipeline that doesn't have the TypeScript plugin enabled. The file extension is `.jsx`, confirming this is not a TypeScript context. |
| **Correct implementation** | |

```jsx
// ❌ WRONG
function formatPayerId(id: string) {
  return `PAYER-${id.toUpperCase()}`;
}

// ✅ CORRECT
function formatPayerId(id) {
  return `PAYER-${id.toUpperCase()}`;
}
```

---

## File 2: `sm_payer.py`

### Violation 4 — Frappe Controller Making External System Call Directly

| Field | Detail |
|---|---|
| **Rule** | Architecture Immutable #6: *"n8n handles ALL cross-system operations including external API calls, CLI tools, webhooks, and notifications."* Also Immutable #7: *"The workflow engine NEVER calls external systems. n8n NEVER modifies document state. This boundary is the most locked rule in the platform. No exceptions."* |
| **File & Lines** | `sm_payer.py`, lines ~23–37 (entire `_sync_to_clearinghouse` method, called from `on_update`) |
| **Code** | `subprocess.run(["stedi-cli", "enrollment", "sync-payer", ...])` |
| **Why it violates** | The Frappe document controller is directly invoking an external CLI tool (`stedi-cli`) via `subprocess.run` to sync data with the Stedi clearinghouse. This is a textbook violation of the n8n boundary. The `on_update` hook should not reach outside Frappe. This also introduces `import subprocess` as a dead-on-arrival import for this codebase. |
| **Correct implementation** | The `on_update` hook should (at most) update internal document state. The external clearinghouse sync must be handled by an n8n workflow triggered by the document state change (e.g., via Frappe webhook or Doc Event): |

```python
# ❌ WRONG — Frappe controller calls external system
def on_update(self):
    self._sync_to_clearinghouse()  # subprocess.run(["stedi-cli", ...])

# ✅ CORRECT — Frappe handles internal state only; n8n handles external sync
def on_update(self):
    # Internal state management only.
    # External Stedi sync is handled by n8n workflow "sm-payer-sync"
    # triggered via Frappe Doc Event webhook on SM Payer update.
    pass
```

The `stedi-cli` call, error handling, and retry logic all belong in an n8n workflow node. Remove `import subprocess` entirely.

---

### Violation 5 — Unprefixed DocType Reference

| Field | Detail |
|---|---|
| **Rule** | Architecture Immutable #3: *"SM DocTypes are prefixed `SM`. No exceptions."* Also from platform rules: *"All custom DocTypes must be prefixed 'SM ' (e.g., 'SM Payer', not 'Payer')."* |
| **File & Line** | `sm_payer.py`, line ~39 |
| **Code** | `canonical = frappe.get_doc("Payer", self.payer_id)` |
| **Why it violates** | References a DocType named `"Payer"` without the `SM ` prefix. There is no core Frappe/ERPNext DocType called "Payer" — this is clearly a custom DocType that should be named `"SM Payer"`. The same file correctly references `"SM Payer"` and `"SM Payer Enrollment"` elsewhere, indicating this is an oversight. |
| **Correct implementation** | |

```python
# ❌ WRONG
canonical = frappe.get_doc("Payer", self.payer_id)

# ✅ CORRECT
canonical = frappe.get_doc("SM Payer", self.payer_id)
```

---

## Summary

| # | Severity | File | Violation | Rule |
|---|----------|------|-----------|------|
| 1 | 🔴 **Critical** | `PayerManagement.jsx:24` | Direct Frappe API call from React | Immutable #1 (MAL) |
| 2 | 🟡 **Standard** | `PayerManagement.jsx:8` | Hardcoded hex color `#F3F4F6` | Immutable #5 |
| 3 | 🟡 **Standard** | `PayerManagement.jsx:12` | TypeScript type annotation in `.jsx` | Immutable #4 |
| 4 | 🔴 **Critical** | `sm_payer.py:23–37` | `subprocess.run` calling `stedi-cli` from Frappe controller | Immutable #6 & #7 |
| 5 | 🟡 **Standard** | `sm_payer.py:39` | Unprefixed DocType `"Payer"` | Immutable #3 |

**Violations 1 and 4 are architectural — they breach the two hardest boundaries on the platform** (MAL abstraction layer and the Frappe/n8n boundary). These are not style issues; they are structural failures that must be resolved before merge.