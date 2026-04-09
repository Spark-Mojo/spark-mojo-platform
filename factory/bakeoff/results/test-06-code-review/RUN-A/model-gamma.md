model: model-gamma
test: 06-code-review
run: A
date: 2026-04-09

Here is the formal code review against the Spark Mojo Platform Guardrails.

### 📁 File 1: `platform/apps/mojo_frontend/src/mojos/settings/VocabularySettings.jsx`

#### 🔴 Issue 1: TypeScript Syntax in Frontend
1. **Violation Type:** Type Safety / Language Constraint
2. **File & Line:** `VocabularySettings.jsx`, Line 2 (`import type { VocabularyEntry } from...`)
3. **Why it is a violation:** The platform explicitly bans TypeScript in all frontend files. The `import type` statement is a TypeScript-only compiler directive. Spark Mojo enforces a strict `.jsx` + JS-only frontend to eliminate build-step friction.
4. **Correct Implementation:** Remove the `type` keyword and the import entirely. If JSDoc type annotations are needed for IDE intellisense, use `/** @type { ... } */` at the usage site. Remove any reference to `.ts` or `.d.ts` files.

#### 🟠 Issue 2: Direct Frappe Call from React
1. **Violation Type:** Architecture Boundary Violation
2. **File & Line:** `VocabularySettings.jsx`, Lines 17-20 (`window.frappe.call({ ... })`)
3. **Why it is a violation:** React is **never** permitted to call Frappe directly. All client-server communication must be routed through the Mojo Abstraction Layer (MAL) at `/api/modules/[capability]/[action]`. Direct Frappe calls bypass the centralized routing, auth, and telemetry layers.
4. **Correct Implementation:** Replace the `frappe.call` with a standard `fetch` to the MAL:
```javascript
const response = await fetch('/api/modules/admin/vocabulary/fetch', {
  method: 'POST', // or GET with query params
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ site: subdomain })
});
const data = await response.json();
setVocab(data.vocabulary || {});
```

#### 🔴 Issue 3: Hardcoded Hex Colors
1. **Violation Type:** Styling Standard Violation
2. **File & Line:** Lines 33 (`#F9FAFB`), 34 (`#111827`), and 37 (`#6B7280`)
3. **Why it is a violation:** Spark Mojo mandates the exclusive use of `var(--sm-*)` semantic CSS variables. Hardcoded hex values break theming, accessibility overrides, and design system consistency.
4. **Correct Implementation:** Replace hex codes with semantic tokens:
   - `#F9FAFB` → `var(--sm-surface)` or `var(--sm-bg-tertiary)`
   - `#111827` → `var(--sm-text-primary)`
   - `#6B7280` → `var(--sm-text-secondary)`

---

### 📁 File 2: `platform/apps/sm_widgets/sm_widgets/doctype/vocabulary_config/vocabulary_config.py`

#### 🔴 Issue 4: External HTTP Call in Frappe Controller
1. **Violation Type:** Integration Architecture Violation
2. **File & Line:** `vocabulary_config.py`, Lines 13-19 (`requests.post(...)`)
3. **Why it is a violation:** Frappe controllers **never** make direct external HTTP calls. The guardrails state: *"n8n handles ALL cross-system operations."* Blocking or non-blocking direct HTTP requests in the controller layer violate the strict boundary between internal state management and external system automation.
4. **Correct Implementation:** Remove `requests.post` and the `import requests` statement. Instead, use Frappe's event system to signal a state change, which n8n will poll or listen to:
```python
def on_submit(self):
    """Trigger local event for n8n to handle external logging."""
    frappe.publish_realtime('vocabulary_submitted', {
        'site': self.site_name,
        'changed_by': frappe.session.user,
        'timestamp': str(frappe.utils.now())
    })
    # n8n listens to the realtime channel or polls an SM Sync Log table to trigger the external POST.
```

#### 🟠 Issue 5: Missing "SM " Prefix on Custom DocType
1. **Violation Type:** Naming Convention Violation
2. **File & Line:** `vocabulary_config.py`, Line 4 (`class VocabularyConfig...`) and directory `vocabulary_config`
3. **Why it is a violation:** All custom DocTypes **must** be prefixed with `"SM "` (e.g., `"SM Vocabulary Config"`). This prevents namespace collisions with core Frappe modules, third-party apps, and clarifies ownership of custom logic.
4. **Correct Implementation:** 
   - Rename the directory to `sm_vocabulary_config`.
   - Update the DocType's `vocabulary_config.json` metadata to name the DocType `SM Vocabulary Config`.
   - Update the Python class definition to match: `class SMVocabularyConfig(frappe.model.document.Document):`

---

### 📋 Review Summary
| File | Issues Found | Severity |
|:---|:---:|:---|
| `VocabularySettings.jsx` | 3 (TypeScript, Frappe Call, Hex Colors) | 🔴 🟠 |
| `vocabulary_config.py` | 2 (HTTP Call, Naming Prefix) | 🔴 🟠 |

**🛑 Gate Status:** `BLOCKED`
The component cannot be merged until the direct Frappe API call and TypeScript imports are removed, hex values are swapped for CSS variables, the external HTTP request is offloaded to n8n, and the DocType is properly prefixed. Please refactor and resubmit for a second pass.