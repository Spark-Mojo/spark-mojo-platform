model: model-gamma
test: 06-code-review
run: C
date: 2026-04-09

## Code Review Report: Spark Mojo Architecture & Standards Violations

### File 1: `platform/apps/mojo_frontend/src/mojos/billing/PayerManagement.jsx`

<details>
<summary><strong>🔴 Violation 1: Direct Frappe API Call</strong></summary>

1. **Violation Type:** Bypasses Mojo Abstraction Layer (MAL)
2. **Exact File & Line:** `PayerManagement.jsx`, Line 24
3. **Why it is a violation:** The component calls `http://internal.frappe:8000/api/method/sm_billing.api.list_payers` directly. Platform Rule 1 explicitly states: *React NEVER calls Frappe directly. All frontend API calls go through the abstraction layer at `/api/modules/[capability]/[action]`*.
4. **Correct Implementation:** Route the request through the MAL. Replace with:
   ```jsx
   axios.get('/api/modules/billing/payers/list', { params: { site: subdomain } })
   ```
</details>

<details>
<summary><strong>🔴 Violation 2: TypeScript Type Annotation</strong></summary>

1. **Violation Type:** Frontend TypeScript Syntax
2. **Exact File & Line:** `PayerManagement.jsx`, Line 11
3. **Why it is a violation:** The function parameter uses `(id: string)`. Platform rules strictly forbid *TypeScript in any frontend file*, explicitly listing *type annotations in function parameters* as a violation.
4. **Correct Implementation:** Remove the type hint to use standard JavaScript:
   ```jsx
   function formatPayerId(id) {
   ```
</details>

<details>
<summary><strong>🔴 Violation 3: Hardcoded Hex Color</strong></summary>

1. **Violation Type:** Non-Semantic Color Token
2. **Exact File & Line:** `PayerManagement.jsx`, Line 7
3. **Why it is a violation:** Uses `'#F3F4F6'` for the table header background. Platform rules mandate *No hardcoded hex colors. Use `var(--sm-*)` CSS variables only.*
4. **Correct Implementation:** Replace with the appropriate semantic design token:
   ```jsx
   header: { background: 'var(--sm-surface-secondary)', fontWeight: 600, padding: '12px 16px' },
   ```
</details>

---

### File 2: `platform/apps/sm_billing/sm_billing/doctype/sm_payer/sm_payer.py`

<details>
<summary><strong>🔴 Violation 4: Frappe Controller Making External System Calls</strong></summary>

1. **Violation Type:** Bypasses n8n Cross-System Boundary
2. **Exact File & Line:** `sm_payer.py`, Lines 24–41 (`_sync_to_clearinghouse` method, specifically `subprocess.run` on Line 33)
3. **Why it is a violation:** The controller directly invokes the `stedi-cli` tool via Python's `subprocess` module. Platform Rule 5 states: *n8n handles ALL cross-system operations including external API calls, CLI tools... Frappe controllers never make external calls directly.* Synchronous CLI execution in a controller also blocks the Frappe worker thread, violating the platform's async workflow philosophy.
4. **Correct Implementation:** 
   - Remove `import subprocess` and the `_sync_to_clearinghouse` method.
   - In `on_update`, create an event record in a queue DocType (e.g., `SM Sync Request`) or trigger a webhook.
   - n8n should listen for this event/webhook and execute the `stedi-cli` command asynchronously, updating Frappe via MAL upon completion.
</details>

<details>
<summary><strong>🔴 Violation 5: Unprefixed DocType Reference</strong></summary>

1. **Violation Type:** Non-Compliant DocType Naming
2. **Exact File & Line:** `sm_payer.py`, Line 44
3. **Why it is a violation:** `frappe.get_doc("Payer", ...)` references a DocType without the required prefix. Platform rules state: *All custom DocTypes must be prefixed "SM " (e.g., "SM Payer", not "Payer")*.
4. **Correct Implementation:** Use the properly prefixed DocType name:
   ```python
   canonical = frappe.get_doc("SM Payer", self.payer_id)
   ```
</details>

---

### Summary of Required Actions
| Priority | Action |
|:---:|:---|
| 🚨 P0 | Refactor `on_update` in `sm_payer.py` to emit an event/webhook instead of calling `stedi-cli`. Create corresponding n8n workflow. |
| 🚨 P0 | Replace direct Frappe URL in `PayerManagement.jsx` with MAL route `/api/modules/billing/payers/list`. |
| ⚠️ P1 | Remove `string` type annotation in JSX utility function. |
| ⚠️ P2 | Replace `#F3F4F6` with `var(--sm-surface-secondary)` (or equivalent token). |
| ⚠️ P2 | Update `"Payer"` DocType reference to `"SM Payer"`. |