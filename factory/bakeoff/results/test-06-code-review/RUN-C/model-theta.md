model: model-theta
test: 06-code-review
run: C
date: 2026-04-09

# Spark Mojo Platform Architecture Violation Report

## File 1: `platform/apps/mojo_frontend/src/mojos/billing/PayerManagement.jsx`

### Violation 1: Direct Frappe API Call
**Violation Type:** Architecture Rule Violation  
**File & Line:** `PayerManagement.jsx`, line 19 (axios.get call)  
**Why:** React is calling Frappe directly at `http://internal.frappe:8000/api/method/sm_billing.api.list_payers`, bypassing the Mojo Abstraction Layer (MAL). This violates the immutable rule: "React NEVER calls Frappe directly. All React calls go through `/api/modules/[capability]/[action]` on the Mojo Abstraction Layer."  
**Correct Implementation:**  
```jsx
axios.get('/api/modules/billing/payers', {
  params: { site: subdomain }
})
```
The MAL should route to the appropriate Frappe method internally.

### Violation 2: TypeScript Syntax in JSX File
**Violation Type:** Coding Standard Violation  
**File & Line:** `PayerManagement.jsx`, line 9 (`function formatPayerId(id: string)`)  
**Why:** TypeScript type annotation `: string` is used in a `.jsx` file. Platform rules explicitly forbid TypeScript: "No TypeScript in any frontend file (.tsx, import type, interface declarations, type annotations in function parameters, etc.)"  
**Correct Implementation:**  
```jsx
function formatPayerId(id) {
  return `PAYER-${id.toUpperCase()}`;
}
```

### Violation 3: Hardcoded Hex Color
**Violation Type:** Coding Standard Violation  
**File & Line:** `PayerManagement.jsx`, line 6 (`background: '#F3F4F6'`)  
**Why:** Hardcoded hex color `#F3F4F6` instead of using semantic CSS variables. Platform rules state: "No hardcoded hex colors. Use `var(--sm-*)` semantic tokens only."  
**Correct Implementation:**  
```jsx
header: { 
  background: 'var(--sm-background-secondary)', 
  fontWeight: 600, 
  padding: '12px 16px' 
}
```

## File 2: `platform/apps/sm_billing/sm_billing/doctype/sm_payer/sm_payer.py`

### Violation 4: Non-Prefixed DocType Reference
**Violation Type:** Architecture Rule Violation  
**File & Line:** `sm_payer.py`, line 36 (`canonical = frappe.get_doc("Payer", self.payer_id)`)  
**Why:** References DocType "Payer" without the "SM " prefix. Platform rules state: "SM DocTypes are prefixed `SM`. No exceptions." and "All custom DocTypes must be prefixed 'SM ' (e.g., 'SM Payer', not 'Payer')".  
**Correct Implementation:**  
```python
canonical = frappe.get_doc("SM Payer", self.payer_id)
```
If this is intended to reference a different DocType, it must still follow the prefix rule if it's a custom DocType.

### Violation 5: Direct External System Call from Frappe Controller
**Violation Type:** Architecture Rule Violation  
**File & Line:** `sm_payer.py`, lines 25-33 (`subprocess.run(["stedi-cli", ...`) in `_sync_to_clearinghouse()` method  
**Why:** Frappe controller is making an external system call via CLI tool directly. Platform rules state: "n8n handles ALL cross-system operations including external API calls, CLI tools, webhooks, and notifications. Frappe controllers never make external calls directly." and "The workflow engine NEVER calls external systems. n8n manages cross-system actions triggered by state changes."  
**Correct Implementation:**  
Remove the `subprocess.run` call and implement one of these patterns:
1. **Event-driven:** Trigger an n8n webhook from `on_update()` via Frappe event system
2. **Polling:** Have n8n poll for SM Payer changes and execute the Stedi sync
3. **Queue-based:** Add a job to a queue that n8n consumes

Example pattern using Frappe event:
```python
def on_update(self):
    frappe.publish_realtime('sm_payer_updated', {
        'payer_id': self.payer_id,
        'payer_name': self.payer_name,
        'is_active': bool(self.is_active),
        'edi_format': self.edi_format or "837P",
        'enrollment_npi': self.enrollment_npi
    })
```
Then configure n8n to listen for this event and execute the Stedi CLI sync.

### Violation 6: Boundary Violation Between Frappe and n8n
**Violation Type:** Architecture Rule Violation  
**File & Line:** `sm_payer.py`, line 18 (`def on_update(self): self._sync_to_clearinghouse()`)  
**Why:** Frappe's `on_update()` hook directly triggers external system synchronization, violating the locked boundary: "Frappe Workflow / transition_state() manages internal document state. n8n manages cross-system actions triggered by state changes. The workflow engine NEVER calls external systems. n8n NEVER modifies document state."  
**Correct Implementation:**  
Separate the concerns: Frappe should only manage internal state changes. External actions should be triggered via n8n listening to Frappe events or polling for state changes.

## Summary of Critical Issuesdetails>
<summary><strong>🔴 High Severity Architecture Violations</strong></summary>

1. **Direct Frappe calls from React** - Breaks the MAL abstraction layer pattern
2. **External system calls from Frappe** - Violates the n8n boundary, creates tight coupling
3. **TypeScript in JSX files** - Contradicts platform technology stack decisions
</detailsdetails>
<summary><strong>🟡 Medium Severity Standards Violations</strong></summary>

1. **Non-prefixed DocTypes** - Breaks naming convention for custom DocTypes
2. **Hardcoded hex colors** - Undermines design system consistencydetails>

## Recommended Actions

1. **Immediate fix:** Remove the direct Frappe API call from React and route through MAL
2. **High priority:** Refactor `_sync_to_clearinghouse()` to trigger n8n workflow instead of direct CLI call
3. **Quick fixes:** Remove TypeScript annotation and replace hardcoded colors with CSS variables
4. **Documentation:** Update the DocType reference to use proper "SM " prefix

**Note:** These violations contradict multiple locked decisions in Section 4 (Architecture Immutables) and Section 7 (Locked Decisions) of the Platform Guardrails document.