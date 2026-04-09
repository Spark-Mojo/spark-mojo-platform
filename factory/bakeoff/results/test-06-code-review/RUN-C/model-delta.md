model: model-delta
test: 06-code-review
run: C
date: 2026-04-09

I'll now perform a thorough line-by-line review of both files against the platform guardrails.

---

# Spark Mojo Code Review Report

**Reviewer:** Primary Code Reviewer
**Date:** April 9, 2026
**Files Reviewed:**
- `platform/apps/mojo_frontend/src/mojos/billing/PayerManagement.jsx`
- `platform/apps/sm_billing/sm_billing/doctype/sm_payer/sm_payer.py`

---

## File 1: `PayerManagement.jsx`

### 🔴 Violation 1 — Direct Frappe API Call (Architecture Immutable §4, Rule 1)

| | |
|---|---|
| **File** | `PayerManagement.jsx` |
| **Line** | `axios.get('http://internal.frappe:8000/api/method/sm_billing.api.list_payers', ...)` (inside `useEffect`) |
| **Type** | React calling Frappe directly |

**Why it's a violation:** PLATFORM-GUARDRAILS.md Section 4, Rule 1 is unambiguous: *"React NEVER calls Frappe directly. All React calls go through `/api/modules/[capability]/[action]` on the Mojo Abstraction Layer."* This call bypasses the MAL entirely and hits the Frappe backend directly via its internal hostname and port.

**Correct implementation:**
```jsx
axios.get('/api/modules/billing/payers', {
  params: { site: subdomain }
})
```

---

### 🔴 Violation 2 — TypeScript Type Annotation in `.jsx` File (Architecture Immutable §4, Rule 4)

| | |
|---|---|
| **File** | `PayerManagement.jsx` |
| **Line** | `function formatPayerId(id: string) {` |
| **Type** | TypeScript type annotation in a `.jsx` file |

**Why it's a violation:** PLATFORM-GUARDRAILS.md Section 4, Rule 4 states: *"No TypeScript. All frontend files are `.jsx`."* The `: string` parameter type annotation is TypeScript syntax. This is invalid in a `.jsx` file and will cause a parse/runtime error in a standard React/Babel pipeline that does not include the TypeScript transform. The guardrails forbid it categorically regardless of tooling.

**Correct implementation:**
```jsx
function formatPayerId(id) {
  return `PAYER-${id.toUpperCase()}`;
}
```

---

### 🔴 Violation 3 — Hardcoded Hex Color (Architecture Immutable §4, Rule 5)

| | |
|---|---|
| **File** | `PayerManagement.jsx` |
| **Line** | `header: { background: '#F3F4F6', fontWeight: 600, padding: '12px 16px' }` (inside `PAYER_TABLE_STYLES`) |
| **Type** | Hardcoded hex color value |

**Why it's a violation:** PLATFORM-GUARDRAILS.md Section 4, Rule 5 states: *"No hardcoded hex colors. Use `var(--sm-*)` semantic tokens only."* `#F3F4F6` is a raw hex color. It bypasses the design token system, breaks theme consistency, and cannot be updated globally via CSS variables.

**Correct implementation:**
```jsx
header: { background: 'var(--sm-table-header-bg)', fontWeight: 600, padding: '12px 16px' },
```
> Use whichever `var(--sm-*)` token maps to a neutral/muted header background per the design token registry. If the correct token does not yet exist, it must be added to the token registry — **not** worked around with a hardcoded hex.

---

### ⚠️ Advisory — `axios` Used for Fetch in `useEffect`, Native `fetch` Used in `handleDeactivate`

| | |
|---|---|
| **File** | `PayerManagement.jsx` |
| **Lines** | `useEffect` block (axios) vs. `handleDeactivate` (fetch) |
| **Type** | Inconsistent HTTP client usage |

**Why it's flagged:** This is not a guardrail violation per se, but mixing `axios` and the native `fetch` API in the same component is an internal consistency problem. The platform should standardise on one HTTP client for all MAL calls. If `axios` is the platform standard, `handleDeactivate` should use it. If `fetch` is preferred (no dependency), the `useEffect` block should be migrated and the `axios` import removed.

---

## File 2: `sm_payer.py`

### 🔴 Violation 4 — Frappe Controller Making an External CLI/API Call (Architecture Immutable §4, Rules 6 & 7)

| | |
|---|---|
| **File** | `sm_payer.py` |
| **Lines** | `import subprocess` (line 2), entire `_sync_to_clearinghouse()` method, and `on_update()` which calls it |
| **Type** | Frappe controller making a direct external system call via `subprocess` |

**Why it's a violation:** This is the single most critical violation in this review. PLATFORM-GUARDRAILS.md Section 4, Rule 7 states — and marks as *"the most locked rule in the platform"*:

> *"The workflow engine NEVER calls external systems. n8n NEVER modifies document state. This boundary is the most locked rule in the platform. No exceptions."*

Rule 6 reinforces this: *"n8n handles ALL cross-system operations."* The `_sync_to_clearinghouse()` method uses `subprocess.run` to invoke `stedi-cli` — a CLI tool that performs an external call to Stedi (the clearinghouse). This is precisely the category of operation that must be owned entirely by n8n. The Frappe controller's `on_update` hook must not execute external calls, shell processes, or integrations of any kind.

**Correct implementation:**

`on_update` should enqueue a Frappe background job (or use a Frappe hook) that publishes an internal event — and n8n's webhook/polling trigger picks that up and executes the Stedi sync:

```python
def on_update(self):
    frappe.enqueue(
        "sm_billing.events.emit_payer_updated",
        payer_name=self.name,
        queue="default",
        enqueue_after_commit=True
    )
```

The `emit_payer_updated` function publishes to the internal event bus (e.g., a `SM Payer Sync Queue` DocType, a Frappe realtime event, or a lightweight outbox record). n8n polls or subscribes to that event and executes the `stedi-cli` call or Stedi API call from within the n8n workflow. The `subprocess` import and the entire `_sync_to_clearinghouse()` method must be deleted from this file.

---

### 🔴 Violation 5 — Reference to Unprefixed DocType `"Payer"` (Architecture Immutable §4, Rule 3)

| | |
|---|---|
| **File** | `sm_payer.py` |
| **Line** | `canonical = frappe.get_doc("Payer", self.payer_id)` (inside `get_enrollment_details()`) |
| **Type** | Reference to a DocType that violates the `SM ` prefix convention |

**Why it's a violation:** PLATFORM-GUARDRAILS.md Section 4, Rule 3 states: *"SM DocTypes are prefixed `SM`. No exceptions."* The string `"Payer"` either (a) references a non-existent DocType because the correct name is `"SM Payer"`, causing a runtime error, or (b) references a DocType that itself violates the naming convention and should be renamed. Neither is acceptable.

**Correct implementation:**
```python
canonical = frappe.get_doc("SM Payer", self.payer_id)
```

If a separate canonical registry DocType is intended (distinct from `SM Payer`), it must still be named with the `SM ` prefix — e.g., `"SM Payer Registry"` — and created as a properly prefixed DocType.

---

## Summary Table

| # | Severity | File | Violation Type | Rule |
|---|---|---|---|---|
| 1 | 🔴 Critical | `PayerManagement.jsx` | React calling Frappe directly, bypassing MAL | §4 Rule 1 |
| 2 | 🔴 Critical | `PayerManagement.jsx` | TypeScript annotation (`: string`) in `.jsx` file | §4 Rule 4 |
| 3 | 🔴 Critical | `PayerManagement.jsx` | Hardcoded hex color `#F3F4F6` | §4 Rule 5 |
| 4 | 🔴 Critical | `sm_payer.py` | Frappe controller calling external system via `subprocess` / `stedi-cli` | §4 Rules 6 & 7 |
| 5 | 🔴 Critical | `sm_payer.py` | Reference to unprefixed DocType `"Payer"` | §4 Rule 3 |
| — | ⚠️ Advisory | `PayerManagement.jsx` | Mixed HTTP clients (`axios` + `fetch`) in same component | Consistency |

**Both files are blocked from merge.** All five critical violations must be resolved before either file is re-submitted for review.