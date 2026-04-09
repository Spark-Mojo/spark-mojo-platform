model: model-alpha
test: 06-code-review
run: A
date: 2026-04-09

# Code Review Report: Spark Mojo Platform Violations

## File 1: `platform/apps/mojo_frontend/src/mojos/settings/VocabularySettings.jsx`

---

### Violation 1: TypeScript Import

| Field | Detail |
|-------|--------|
| **Violation Type** | TypeScript usage in frontend file |
| **File & Line** | `VocabularySettings.jsx`, Line 2 |
| **Why It's a Violation** | Platform Rule: "No TypeScript in any frontend file (.tsx, import type, etc.)". The `import type` syntax is TypeScript-specific. |
| **Correct Implementation** | Remove the type import entirely. If the type definition is needed for documentation, convert it to a JSDoc comment or a plain JavaScript constant. |

```jsx
// REMOVE THIS LINE:
import type { VocabularyEntry } from '../../types/vocabulary';

// If shape documentation is needed, use JSDoc:
/**
 * @typedef {Object} VocabularyEntry
 * @property {string} key
 * @property {string} value
 */
```

---

### Violation 2: React Calling Frappe Directly

| Field | Detail |
|-------|--------|
| **Violation Type** | Frontend bypassing Mojo Abstraction Layer |
| **File & Line** | `VocabularySettings.jsx`, Lines 14-17 |
| **Why It's a Violation** | Architecture Immutable #1: "React NEVER calls Frappe directly. All React calls go through `/api/modules/[capability]/[action]` on the Mojo Abstraction Layer." The `window.frappe.call()` is a direct Frappe invocation. |
| **Correct Implementation** | Replace with a fetch call to the MAL endpoint. |

```jsx
// BEFORE (VIOLATION):
const result = await window.frappe.call({
  method: 'sm_widgets.api.vocabulary.get_site_vocabulary',
  args: { site: subdomain }
});
setVocab(result.message || {});

// AFTER (CORRECT):
const response = await fetch(`/api/modules/admin/vocabulary/${subdomain}`, {
  method: 'GET',
  headers: { 'Content-Type': 'application/json' }
});
const result = await response.json();
setVocab(result.vocabulary || {});
```

---

### Violation 3: Hardcoded Hex Color `#F9FAFB`

| Field | Detail |
|-------|--------|
| **Violation Type** | Hardcoded hex color |
| **File & Line** | `VocabularySettings.jsx`, Line 41 |
| **Why It's a Violation** | Architecture Immutable #5: "No hardcoded hex colors. Use `var(--sm-*)` semantic tokens only." The background color is hardcoded. |
| **Correct Implementation** | Use the appropriate `var(--sm-*)` CSS variable. |

```jsx
// BEFORE (VIOLATION):
<div style={{ background: '#F9FAFB', padding: '24px' }}>

// AFTER (CORRECT):
<div style={{ background: 'var(--sm-surface-primary)', padding: '24px' }}>
```

---

### Violation 4: Hardcoded Hex Color `#111827`

| Field | Detail |
|-------|--------|
| **Violation Type** | Hardcoded hex color |
| **File & Line** | `VocabularySettings.jsx`, Line 42 |
| **Why It's a Violation** | Architecture Immutable #5: "No hardcoded hex colors. Use `var(--sm-*)` semantic tokens only." The heading color is hardcoded. |
| **Correct Implementation** | Use the appropriate `var(--sm-*)` CSS variable. |

```jsx
// BEFORE (VIOLATION):
<h2 style={{ color: '#111827' }}>Vocabulary Settings</h2>

// AFTER (CORRECT):
<h2 style={{ color: 'var(--sm-text-primary)' }}>Vocabulary Settings</h2>
```

---

### Violation 5: Hardcoded Hex Color `#6B7280`

| Field | Detail |
|-------|--------|
| **Violation Type** | Hardcoded hex color |
| **File & Line** | `VocabularySettings.jsx`, Line 46 |
| **Why It's a Violation** | Architecture Immutable #5: "No hardcoded hex colors. Use `var(--sm-*)` semantic tokens only." The label color is hardcoded. |
| **Correct Implementation** | Use the appropriate `var(--sm-*)` CSS variable. |

```jsx
// BEFORE (VIOLATION):
<label style={{ color: '#6B7280' }}>{key.replace('_', ' ')}</label>

// AFTER (CORRECT):
<label style={{ color: 'var(--sm-text-secondary)' }}>{key.replace('_', ' ')}</label>
```

---

## File 2: `platform/apps/sm_widgets/sm_widgets/doctype/vocabulary_config/vocabulary_config.py`

---

### Violation 6: DocType Not Prefixed with "SM"

| Field | Detail |
|-------|--------|
| **Violation Type** | Custom DocType naming convention |
| **File & Line** | `vocabulary_config.py`, Line 4 (class definition) |
| **Why It's a Violation** | Architecture Immutable #3: "SM DocTypes are prefixed `SM`. No exceptions." The DocType `Vocabulary Config` lacks the required prefix. |
| **Correct Implementation** | The DocType must be renamed to `SM Vocabulary Config`. This requires changes to the DocType JSON definition file, the Python class, and all references. |

```python
# BEFORE (VIOLATION):
class VocabularyConfig(frappe.model.document.Document):

# AFTER (CORRECT):
class SMVocabularyConfig(frappe.model.document.Document):
```

> **Note:** The corresponding DocType JSON file at `vocabulary_config/vocabulary_config.json` must also be updated so the `name` field reads `"SM Vocabulary Config"`. The folder structure should become `sm_vocabulary_config/sm_vocabulary_config.py`.

---

### Violation 7: Frappe Controller Making External HTTP Call

| Field | Detail |
|-------|--------|
| **Violation Type** | Frappe controller calling external system directly |
| **File & Line** | `vocabulary_config.py`, Lines 16-23 |
| **Why It's a Violation** | Architecture Immutable #7: "The workflow engine NEVER calls external systems. n8n handles ALL cross-system operations." The `on_submit` hook makes an HTTP POST to an external logging service using `requests.post()`. Frappe controllers must never make external HTTP calls. |
| **Correct Implementation** | Remove the `on_submit` method entirely. The external logging notification should be handled by an n8n workflow triggered by the document submission event. n8n should subscribe to the `SM Vocabulary Config` submit event and make the HTTP call to the logging service. |

```python
# BEFORE (VIOLATION):
def on_submit(self):
    """Notify external logging service when vocabulary is committed."""
    try:
        requests.post(
            'https://logs.sparkmojo.internal/vocabulary-change',
            json={
                'site': self.site_name,
                'changed_by': frappe.session.user,
                'timestamp': str(frappe.utils.now())
            },
            timeout=5
        )
    except Exception:
        pass  # Non-blocking

# AFTER (CORRECT):
# Remove this entire method.
# n8n workflow "Notify Vocabulary Change" should:
#   - Trigger: SM Vocabulary Config on_submit
#   - Action: HTTP POST to https://logs.sparkmojo.internal/vocabulary-change
#   - Payload: { site, changed_by, timestamp } from document fields
```

---

### Violation 8: Unnecessary `requests` Import

| Field | Detail |
|-------|--------|
| **Violation Type** | Import for prohibited external HTTP call |
| **File & Line** | `vocabulary_config.py`, Line 2 |
| **Why It's a Violation** | The `requests` module is imported solely to support the prohibited external HTTP call in `on_submit`. Since Frappe controllers must never make external HTTP calls, this import should not exist in any SM DocType controller. |
| **Correct Implementation** | Remove the `import requests` line entirely. |

```python
# BEFORE (VIOLATION):
import frappe
import requests

# AFTER (CORRECT):
import frappe
# requests import removed — n8n handles all external HTTP calls
```

---

## Summary Table

| # | Violation | File | Line | Rule Violated |
|---|-----------|------|------|---------------|
| 1 | TypeScript `import type` | `VocabularySettings.jsx` | 2 | No TypeScript in frontend |
| 2 | Direct `window.frappe.call()` | `VocabularySettings.jsx` | 14-17 | React never calls Frappe directly |
| 3 | Hardcoded hex `#F9FAFB` | `VocabularySettings.jsx` | 41 | No hardcoded hex colors |
| 4 | Hardcoded hex `#111827` | `VocabularySettings.jsx` | 42 | No hardcoded hex colors |
| 5 | Hardcoded hex `#6B7280` | `VocabularySettings.jsx` | 46 | No hardcoded hex colors |
| 6 | DocType missing `SM` prefix | `vocabulary_config.py` | 4 | SM DocTypes must be prefixed |
| 7 | External HTTP call in controller | `vocabulary_config.py` | 16-23 | n8n handles all cross-system ops |
| 8 | `requests` import for external call | `vocabulary_config.py` | 2 | n8n handles all cross-system ops |

**Total Violations: 8**