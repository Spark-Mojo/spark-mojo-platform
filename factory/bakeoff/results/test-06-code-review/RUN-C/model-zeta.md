model: model-zeta
test: 06-code-review
run: C
date: 2026-04-09

 ## Code Review Report: Spark Mojo Platform Guardrails

### File 1: `platform/apps/mojo_frontend/src/mojos/billing/PayerManagement.jsx`

#### Violation 1: TypeScript Type Annotation in JSX File
- **Type**: TypeScript Usage
- **Location**: Function declaration `function formatPayerId(id: string) {`
- **Why**: Architecture Immutables #4 states: "No TypeScript. All frontend files are .jsx." Type annotations in function parameters (e.g., `id: string`) are explicitly prohibited in frontend files.
- **Correct Implementation**: Remove the TypeScript annotation. Use standard JSDoc if documentation is necessary:
  ```javascript
  function formatPayerId(id) {
    return `PAYER-${id.toUpperCase()}`;
  }
  ```

#### Violation 2: Hardcoded Hex Color
- **Type**: Styling / Design System
- **Location**: `PAYER_TABLE_STYLES` object declaration: `header: { background: '#F3F4F6', ... }`
- **Why**: Platform rules mandate: "No hardcoded hex colors. Use var(--sm-*) CSS variables only."
- **Correct Implementation**: Replace the hardcoded hex with a semantic CSS variable (e.g., `background: 'var(--sm-surface-secondary)'` or `'var(--sm-bg-muted)'`). If the specific token doesn't exist, add it to the design system rather than hardcoding.

#### Violation 3: Direct Frappe API Call from React (Abstraction Layer Bypass)
- **Type**: Architecture / API Contract
- **Location**: `axios.get('http://internal.frappe:8000/api/method/sm_billing.api.list_payers', ...)` inside `useEffect`
- **Why**: Architecture Immutables #1: "React NEVER calls Frappe directly. All React calls go through `/api/modules/[capability]/[action]` on the Mojo Abstraction Layer." This exposes internal infrastructure details (hostname `internal.frappe:8000`) to the frontend and bypasses the MAL security and routing layer.
- **Correct Implementation**: Route through the Mojo Abstraction Layer:
  ```javascript
  axios.get('/api/modules/billing/payers', { params: { site: subdomain } })
  ```

#### Violation 4: Exposure of Frappe-Specific Headers to Frontend
- **Type**: Architecture / Information Leakage
- **Location**: `handleDeactivate` function: `headers: { 'Content-Type': 'application/json', 'X-Frappe-Site-Name': subdomain }`
- **Why**: While the endpoint URL correctly uses the abstraction layer pattern (`/api/modules/...`), exposing Frappe-specific headers (`X-Frappe-Site-Name`) to the React layer violates the abstraction boundary. The MAL should determine the target Frappe site from the request context (subdomain) or authentication token, not from frontend-exposed headers.
- **Correct Implementation**: Remove the `X-Frappe-Site-Name` header. The MAL should infer the site internally based on the requesting subdomain or authenticated session context.

---

### File 2: `platform/apps/sm_billing/sm_billing/doctype/sm_payer/sm_payer.py`

#### Violation 5: Frappe Controller Making External System Calls (n8n Boundary Violation)
- **Type**: Cross-System Integration / CLI Execution
- **Location**: `import subprocess` and `_sync_to_clearinghouse` method containing `subprocess.run(["stedi-cli", "enrollment", "sync-payer", ...], ...)`
- **Why**: Platform rules state: "n8n handles ALL cross-system operations including external API calls, CLI tools, webhooks, and notifications. Frappe controllers never make external calls directly." This also violates Architecture Immutables #6 and #7 regarding the hard boundary between Frappe (internal state) and n8n (external actions).
- **Correct Implementation**: Remove subprocess execution from the controller. Instead:
  1. Use Frappe Workflow to transition the document to a "Pending Sync" state
  2. Emit a webhook to n8n from `on_update` (fire-and-forget) to trigger the Stedi synchronization
  3. n8n executes the `stedi-cli` command and updates Frappe with the sync result via the MAL

#### Violation 6: Missing "SM " Prefix in DocType Reference
- **Type**: DocType Naming Convention
- **Location**: `get_enrollment_details` method: `canonical = frappe.get_doc("Payer", self.payer_id)`
- **Why**: Platform rule: "All custom DocTypes must be prefixed 'SM ' (e.g., 'SM Payer', not 'Payer')." While `frappe.get_all` correctly references `"SM Payer"`, `frappe.get_doc` references `"Payer"` without the required prefix. (Note: If this references an ERPNext core DocType, it requires renaming to include the prefix as all custom DocTypes must use the prefix.)
- **Correct Implementation**: Change to `frappe.get_doc("SM Payer", self.payer_id)`. If this represents a separate canonical/master payer entity, rename that DocType to "SM Canonical Payer" or similar with the mandatory prefix.

#### Violation 7: Workflow Engine Boundary Violation
- **Type**: State Management Architecture
- **Location**: `on_update` hook triggering `_sync_to_clearinghouse`
- **Why**: Architecture Immutables #7: "Frappe Workflow / transition_state() manages internal document state. n8n manages cross-system actions triggered by state changes." Using `on_update` to directly trigger external CLI calls blurs this boundary. The controller should not orchestrate cross-system operations or execute external CLI tools.
- **Correct Implementation**: Implement Frappe Workflow states for the payer lifecycle (e.g., Draft → Active → Pending Enrollment → Enrolled). The `on_update` hook may create a log entry or emit a webhook, but n8n must handle the actual execution of the Stedi CLI tool based on state transitions. Frappe owns the state; n8n owns the external side effects.