model: model-epsilon
test: 06-code-review
run: A
date: 2026-04-09

# Platform Guardrails Code Review — Findings

## File 1: `VocabularySettings.jsx`

### 🔴 Violation 1 — TypeScript in Frontend File
| Field | Value |
|-------|-------|
| **Type** | Platform Rule Violation |
| **Location** | `platform/apps/mojo_frontend/src/mojos/settings/VocabularySettings.jsx` — Line 3 |
| **Rule Broken** | `No TypeScript. All frontend files are .jsx` |

**Evidence:**
```jsx
import type { VocabularyEntry } from '../../types/vocabulary';
```

**Why it's a violation:** The `import type` syntax is TypeScript. All frontend files must use `.jsx` with plain JavaScript only.

**Correct implementation:**
```jsx
// Remove the type import entirely, or inline the shape as a JSDoc comment
// e.g., @param {{ person: string, ... }} vocab
```

---

### 🔴 Violation 2 — React Calls Frappe Directly
| Field | Value |
|-------|-------|
| **Type** | Platform Rule Violation |
| **Location** | `VocabularySettings.jsx` — Line 17 |
| **Rule Broken** | `React NEVER calls Frappe directly. All React calls go through /api/modules/[capability]/[action]` |

**Evidence:**
```jsx
const result = await window.frappe.call({
  method: 'sm_widgets.api.vocabulary.get_site_vocabulary',
  args: { site: subdomain }
});
```

**Why it's a violation:** This bypasses the Mojo Abstraction Layer entirely and calls Frappe's `window.frappe.call` directly. The correct path is `/api/modules/[capability]/[action]`.

**Correct implementation:**
```jsx
const result = await fetch(`/api/modules/vocabulary/get_site_vocabulary?site=${subdomain}`);
const data = await result.json();
setVocab(data.vocabulary || {});
```

---

### 🔴 Violation 3 — Inconsistent API Call Pattern
| Field | Value |
|-------|-------|
| **Type** | Platform Rule Violation |
| **Location** | `VocabularySettings.jsx` — Line 24–30 |
| **Rule Broken** | `React NEVER calls Frappe directly. All React calls go through /api/modules/[capability]/[action]` |

**Evidence:**
```jsx
await fetch(`/api/modules/admin/vocabulary/${subdomain}`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ vocabulary: vocab })
});
```

**Why it's a violation:** The `loadVocab()` function uses `window.frappe.call` (bypassing MAL), while `handleSave()` uses `fetch` targeting `/api/modules/admin/vocabulary/`. These are two completely different and incompatible call patterns. Both must go through MAL.

**Correct implementation:**
```jsx
// Both calls should go through the abstraction layer consistently:
await fetch(`/api/modules/vocabulary/save_site_vocabulary`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ site: subdomain, vocabulary: vocab })
});
```

---

### 🔴 Violation 4 — Hardcoded Hex Colors (Multiple Instances)
| Field | Value |
|-------|-------|
| **Type** | Platform Rule Violation |
| **Location** | `VocabularySettings.jsx` — Lines 34, 36, 39 |
| **Rule Broken** | `No hardcoded hex colors. Use var(--sm-*) semantic tokens only` |

**Evidence:**
```jsx
<div style={{ background: '#F9FAFB', padding: '24px' }}>        // Line 34
<h2 style={{ color: '#111827' }}>Vocabulary Settings</h2>     // Line 36
<label style={{ color: '#6B7280' }}>{key.replace('_', ' ')}</label> // Line 39
```

**Why it's a violation:** All three hardcoded hex values (`#F9FAFB`, `#111827`, `#6B7280`) must use CSS custom properties from the design system.

**Correct implementation:**
```jsx
<div style={{ background: 'var(--sm-surface-subtle)', padding: '24px' }}>
<h2 style={{ color: 'var(--sm-text-primary)' }}>Vocabulary Settings</h2>
<label style={{ color: 'var(--sm-text-muted)' }}>{key.replace('_', ' ')}</label>
```

---

### 🟡 Observation — DocType Name Without SM Prefix
| Field | Value |
|-------|-------|
| **Type** | Naming Convention |
| **Location** | Cross-file: `VocabularySettings.jsx` references `sm_widgets.api.vocabulary` |
| **Rule Broken** | `All custom DocTypes must be prefixed "SM "` |

**Note:** The JSX calls `sm_widgets.api.vocabulary.get_site_vocabulary`, but the DocType file is named `vocabulary_config` with class `VocabularyConfig`. If this is a custom DocType, it should be named `SM Vocabulary Config` in Frappe. This affects the API route design — confirm the DocType label in Frappe Desk.

---

## File 2: `vocabulary_config.py`

### 🔴 Violation 5 — DocType Class Name Missing SM Prefix
| Field | Value |
|-------|-------|
| **Type** | Platform Rule Violation |
| **Location** | `vocabulary_config.py` — Line 4 |
| **Rule Broken** | `All custom DocTypes must be prefixed "SM". No exceptions.` |

**Evidence:**
```python
class VocabularyConfig(frappe.model.document.Document):
```

**Why it's a violation:** The DocType file lives in `sm_widgets/doctype/vocabulary_config/`, but the Python class name `VocabularyConfig` is not prefixed with `SM`. If this is a custom DocType (not a Frappe native one), the class must be named `SMVocabularyConfig` to match the naming convention. The directory name should also be `sm_vocabulary_config`.

**Correct implementation:**
```python
class SMVocabularyConfig(frappe.model.document.Document):
```

---

### 🔴 Violation 6 — Frappe Controller Makes External HTTP Call
| Field | Value |
|-------|-------|
| **Type** | Platform Rule Violation |
| **Location** | `vocabulary_config.py` — Lines 13–24 (`on_submit` method) |
| **Rule Broken** | `n8n handles ALL cross-system operations. Frappe controllers never make external HTTP calls directly` |

**Evidence:**
```python
def on_submit(self):
    try:
        requests.post(
            'https://logs.sparkmojo.internal/vocabulary-change',
            json={...},
            timeout=5
        )
    except Exception:
        pass  # Non-blocking
```

**Why it's a violation:** This is a direct HTTP call from a Frappe document controller to an external service (`logs.sparkmojo.internal`). Per the architecture immutables (Rule 7 and Rule 6), cross-system operations must be delegated to n8n. The Frappe workflow engine handles document state transitions; n8n handles actions triggered by those transitions.

**Correct implementation:**
The `on_submit` hook should trigger a Frappe webhook or emit a signal. n8n listens to that event and makes the HTTP call to the logging service. Alternatively, write a `sm_log_entry` record and let n8n poll/subscribe to process it.

```python
def on_submit(self):
    """Signal n8n to log vocabulary change via cross-system workflow."""
    frappe.publish_realtime(
        event='vocabulary_config_submitted',
        message={'docname': self.name, 'site': self.site_name},
        after_commit=True
    )
    # n8n webhook: https://automation.sparkmojo.com/webhook/vocabulary-change
```

---

## Summary Table

| # | Severity | File | Line | Rule Violated |
|---|----------|------|------|---------------|
| 1 | 🔴 Critical | `VocabularySettings.jsx` | 3 | No TypeScript in frontend files |
| 2 | 🔴 Critical | `VocabularySettings.jsx` | 17 | React calls Frappe directly |
| 3 | 🔴 Critical | `VocabularySettings.jsx` | 24–30 | Inconsistent call pattern (both broken) |
| 4 | 🔴 Critical | `VocabularySettings.jsx` | 34, 36, 39 | Hardcoded hex colors |
| 5 | 🔴 Critical | `vocabulary_config.py` | 4 | DocType class missing `SM` prefix |
| 6 | 🔴 Critical | `vocabulary_config.py` | 13–24 | External HTTP call in Frappe controller |

**Total: 6 violations, all critical.**

---

### Recommended Next Steps

1. **Violation 1:** Remove the `import type` and refactor any type-dependent code to plain JS with JSDoc
2. **Violations 2 & 3:** Align all frontend API calls to `/api/modules/vocabulary/*` through MAL
3. **Violation 4:** Replace all hex colors with `var(--sm-*)` tokens (coordinate with the design system owner for exact token names)
4. **Violation 5:** Rename `vocabulary_config.py` → `sm_vocabulary_config.py`, class → `SMVocabularyConfig`, and confirm the Frappe DocType label is `SM Vocabulary Config`
5. **Violation 6:** Remove the `requests.post` from `on_submit` and replace with a `frappe.publish_realtime` event that n8n subscribes to for cross-system notification