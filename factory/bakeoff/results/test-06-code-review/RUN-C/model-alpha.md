model: model-alpha
test: 06-code-review
run: C
date: 2026-04-09

#Code Review Report — Spark Mojo Platform Guardrails Violations

---

## File 1: `platform/apps/mojo_frontend/src/mojos/billing/PayerManagement.jsx`

### Violation 1: React Calling Frappe Directly

| Field | Detail |
|-------|--------|
| **Violation Type** | Architecture Immutable #1 — React NEVER calls Frappe directly |
| **File & Line** | `PayerManagement.jsx`, lines 20–24 (inside `useEffect`) |
| **Code** | `axios.get('http://internal.frappe:8000/api/method/sm_billing.api.list_payers', { params: { site: subdomain } })` |
| **Why** | This is a direct Frappe API call from a React component. The platform mandates that all React-to-backend communication go through the Mojo Abstraction Layer at `/api/modules/[capability]/[action]`. The current code bypasses the abstraction layer entirely. |
| **Correct Implementation** | ```jsx axios.get(`/api/modules/billing/payer/list`, { params: { site: subdomain } }) .then(response => { setPayers(response.data || []); setLoading(false); }) .catch(() => { setError('Failed to load payers'); setLoading(false); }); ``` |

---

### Violation 2: Hardcoded Hex Color

| Field | Detail |
|-------|--------|
| **Violation Type** | Architecture Immutable #5 — No hardcoded hex colors |
| **File & Line** | `PayerManagement.jsx`, line 10 (inside `PAYER_TABLE_STYLES`) |
| **Code** | `header: { background: '#F3F4F6', fontWeight: 600, padding: '12px 16px' }` |
| **Why** | The value `#F3F4F6` is a hardcoded hex color. The platform requires all colors to use `var(--sm-*)` semantic CSS variables exclusively. |
| **Correct Implementation** | ```jsx header: { background: 'var(--sm-surface-secondary)', fontWeight: 600, padding: '12px 16px' } ``` |

---

### Violation 3: TypeScript Type Annotation

| Field | Detail |
|-------|--------|
| **Violation Type** | Architecture Immutable #4 — No TypeScript |
| **File & Line** | `PayerManagement.jsx`, line 14 |
| **Code** | `function formatPayerId(id: string) {` |
| **Why** | The `: string` is a TypeScript type annotation. The platform prohibits all TypeScript syntax in frontend files, including type annotations in function parameters. React components live in `.jsx` files only, with no TypeScript features. |
| **Correct Implementation** | ```jsx function formatPayerId(id) { return `PAYER-${id.toUpperCase()}`; } ``` |

---

## File 2: `platform/apps/sm_billing/sm_billing/doctype/sm_payer/sm_payer.py`

### Violation 4: Frappe Controller Making External Call via CLI Tool

| Field | Detail |
|-------|--------|
| **Violation Type** | Architecture Immutable #7 — Frappe workflow engine NEVER calls external systems; n8n handles ALL cross-system operations |
| **File & Line** | `sm_payer.py`, lines 24–36 (the `_sync_to_clearinghouse` method, specifically the `subprocess.run` call on lines 30–33) |
| **Code** | ```python subprocess.run( ["stedi-cli", "enrollment", "sync-payer", "--payer-id", self.payer_id, "--data", payer_data], check=True, capture_output=True, timeout=15 ) ``` |
| **Why** | This is a Frappe controller directly invoking an external CLI tool (`stedi-cli`) to sync data with the Stedi clearinghouse. The platform's most locked rule states: **Frappe manages internal document state. n8n manages cross-system actions. The workflow engine NEVER calls external systems.** CLI tools, external API calls, webhooks, and notifications all belong to n8n exclusively. |
| **Correct Implementation** | Remove the entire `_sync_to_clearinghouse` method and the `on_update` hook that calls it. Instead, the Frappe Workflow or `on_update` should set a canonical state that triggers an n8n webhook. The n8n workflow then executes the Stedi CLI sync. ```python class SMPayer(frappe.model.document.Document): def validate(self): if not self.payer_id: frappe.throw("Payer ID is required") if not self.payer_name: frappe.throw("Payer name is required") duplicates = frappe.get_all( "SM Payer", filters={"payer_id": self.payer_id, "name": ["!=", self.name]}, limit=1 ) if duplicates: frappe.throw(f"Payer ID {self.payer_id} already exists on this site") def on_update(self): # n8n webhook is triggered by Frappe Workflow state change # or by a webhook subscription on SM Payer doctype pass # _sync_to_clearinghouse method removed entirely — # that responsibility belongs to n8n ``` The corresponding n8n workflow would: 1. Listen for `SM Payer` update events 2. Fetch the payer document data 3. Execute the `stedi-cli enrollment sync-payer` command 4. Log success/failure back to Frappe if needed |

---

### Violation 5: DocType Reference Without SM Prefix

| Field | Detail |
|-------|--------|
| **Violation Type** | Architecture Immutable #3 — SM DocTypes are prefixed `SM`. No exceptions. |
| **File & Line** | `sm_payer.py`, line 39 (inside `get_enrollment_details`) |
| **Code** | `canonical = frappe.get_doc("Payer", self.payer_id)` |
| **Why** | The DocType name `"Payer"` is missing the required `"SM "` prefix. All custom DocTypes on this platform must be prefixed with `SM `. The correct DocType name is `"SM Payer"`. This also suggests a potential data architecture issue — if a separate `"Payer"` DocType exists, it violates the naming rule as well. |
| **Correct Implementation** | ```python def get_enrollment_details(self): canonical = frappe.get_doc("SM Payer", self.payer_id) enrolled_sites = frappe.get_all( "SM Payer Enrollment", filters={"payer_id": self.payer_id, "status": "enrolled"}, fields=["site_name", "enrollment_date", "enrollment_id"] ) return { "canonical_name": canonical.payer_name, "enrolled_sites": enrolled_sites } ``` |

---

## Summary

| # | Violation | File | Severity |
|---|-----------|------|----------|
| 1 | React calling Frappe directly | `PayerManagement.jsx:20-24` | **Critical** — Bypasses abstraction layer |
| 2 | Hardcoded hex color `#F3F4F6` | `PayerManagement.jsx:10` | Medium — Style system violation |
| 3 | TypeScript type annotation `: string` | `PayerManagement.jsx:14` | High — Language rule violation |
| 4 | Frappe controller calling external CLI tool | `sm_payer.py:24-36` | **Critical** — Violates most locked boundary rule |
| 5 | DocType `"Payer"` missing SM prefix | `sm_payer.py:39` | High — Naming convention violation |

**Two Critical violations found** — both represent fundamental architecture breaches that must be resolved before this code can proceed.