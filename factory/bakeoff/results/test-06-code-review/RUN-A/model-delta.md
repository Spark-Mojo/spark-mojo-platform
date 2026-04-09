model: model-delta
test: 06-code-review
run: A
date: 2026-04-09

I'll conduct a thorough line-by-line review of both files against the Spark Mojo Platform Guardrails.

---

# Code Review: Spark Mojo Build Factory

**Reviewer:** Primary Code Reviewer
**Files:** `VocabularySettings.jsx`, `vocabulary_config.py`
**Guardrails Authority:** Spark Mojo Platform Guardrails (Section 4: Architecture Immutables)

---

## File 1: `platform/apps/mojo_frontend/src/mojos/settings/VocabularySettings.jsx`

### 🔴 VIOLATION 1 — TypeScript Import in a JSX File

| Field | Detail |
|---|---|
| **Violation Type** | No TypeScript in frontend files (Immutable Rule #4) |
| **File & Line** | `VocabularySettings.jsx`, Line 2 |
| **Exact Code** | `import type { VocabularyEntry } from '../../types/vocabulary';` |

**Why it's a violation:**
`import type` is TypeScript syntax. Rule 4 is unambiguous: *"No TypeScript. All frontend files are `.jsx`."* This is a TypeScript-only construct — it does not exist in plain JavaScript. Its presence also implies a `types/vocabulary` module almost certainly written in `.ts` or `.d.ts`, which compounds the violation. The fact that the file is named `.jsx` does not make TypeScript syntax inside it acceptable.

**Correct implementation:**
Remove the import entirely. `VocabularyEntry` is not used anywhere in the component body — it was decorative type annotation. If runtime shape validation is needed, use a plain JS object or a PropTypes check:

```jsx
// Remove line 2 entirely. If prop validation is needed:
import PropTypes from 'prop-types';
```

---

### 🔴 VIOLATION 2 — Direct Frappe Call from React

| Field | Detail |
|---|---|
| **Violation Type** | React calling Frappe directly (Immutable Rule #1) |
| **File & Line** | `VocabularySettings.jsx`, Lines 17–22 |
| **Exact Code** | `await window.frappe.call({ method: 'sm_widgets.api.vocabulary.get_site_vocabulary', ... })` |

**Why it's a violation:**
Rule 1 states: *"React NEVER calls Frappe directly. All React calls go through `/api/modules/[capability]/[action]` on the Mojo Abstraction Layer."* This is reiterated in Section 7 Locked Decisions: *"React calls MAL only. Never Frappe directly."* Using `window.frappe.call` bypasses the MAL entirely, creates a direct coupling between the React frontend and Frappe internals, and is explicitly forbidden with no exceptions.

**Correct implementation:**
Route the read through the MAL, consistent with how the save is already implemented:

```jsx
useEffect(() => {
  async function loadVocab() {
    const result = await fetch(`/api/modules/admin/vocabulary/${subdomain}`);
    const data = await result.json();
    setVocab(data.vocabulary || {});
  }
  loadVocab();
}, [subdomain]);
```

---

### 🔴 VIOLATION 3 — Hardcoded Hex Color: `#F9FAFB`

| Field | Detail |
|---|---|
| **Violation Type** | Hardcoded hex color (Immutable Rule #5) |
| **File & Line** | `VocabularySettings.jsx`, Line 37 |
| **Exact Code** | `<div style={{ background: '#F9FAFB', padding: '24px' }}>` |

**Why it's a violation:**
Rule 5 states: *"No hardcoded hex colors. Use `var(--sm-*)` semantic tokens only."* `#F9FAFB` is a raw hex value. Hardcoded colors bypass the design token system, break theming, and make global color changes impossible.

**Correct implementation:**
```jsx
<div style={{ background: 'var(--sm-bg-subtle)', padding: '24px' }}>
```
The exact token name (`--sm-bg-subtle` or equivalent) should be confirmed against the platform's CSS variable definitions, but it must be a `var(--sm-*)` token — not a hex value.

---

### 🔴 VIOLATION 4 — Hardcoded Hex Color: `#111827`

| Field | Detail |
|---|---|
| **Violation Type** | Hardcoded hex color (Immutable Rule #5) |
| **File & Line** | `VocabularySettings.jsx`, Line 38 |
| **Exact Code** | `<h2 style={{ color: '#111827' }}>Vocabulary Settings</h2>` |

**Why it's a violation:**
Same rule as Violation 3. `#111827` is a raw hex value.

**Correct implementation:**
```jsx
<h2 style={{ color: 'var(--sm-text-primary)' }}>Vocabulary Settings</h2>
```

---

### 🔴 VIOLATION 5 — Hardcoded Hex Color: `#6B7280`

| Field | Detail |
|---|---|
| **Violation Type** | Hardcoded hex color (Immutable Rule #5) |
| **File & Line** | `VocabularySettings.jsx`, Line 41 |
| **Exact Code** | `<label style={{ color: '#6B7280' }}>{key.replace('_', ' ')}</label>` |

**Why it's a violation:**
Same rule as Violations 3 and 4. `#6B7280` is a raw hex value.

**Correct implementation:**
```jsx
<label style={{ color: 'var(--sm-text-secondary)' }}>{key.replace('_', ' ')}</label>
```

---

### ⚠️ ADVISORY — `replace('_', ' ')` Only Replaces the First Underscore

| Field | Detail |
|---|---|
| **Violation Type** | Logic defect (not a guardrails violation, but a correctness issue) |
| **File & Line** | `VocabularySettings.jsx`, Line 41 |
| **Exact Code** | `key.replace('_', ' ')` |

**Why it's a problem:**
`String.prototype.replace` with a string argument only replaces the **first** occurrence. Keys like `service_record` and `service_provider` will render as `"service record"` and `"service provider"` correctly, but `intake_process` and `schedule_entry` will also render correctly by coincidence (single underscore). However, this is a latent defect — any future key with multiple underscores will silently display incorrectly.

**Correct implementation:**
```jsx
key.replaceAll('_', ' ')
// or
key.replace(/_/g, ' ')
```

---

## File 2: `platform/apps/sm_widgets/sm_widgets/doctype/vocabulary_config/vocabulary_config.py`

### 🔴 VIOLATION 6 — Frappe Controller Making a Direct External HTTP Call

| Field | Detail |
|---|---|
| **Violation Type** | Frappe controller calling an external system directly (Immutable Rules #6 and #7) |
| **File & Line** | `vocabulary_config.py`, Lines 13–27 |
| **Exact Code** | `requests.post('https://logs.sparkmojo.internal/vocabulary-change', ...)` inside `on_submit()` |

**Why it's a violation:**
This is the most serious violation in the review. Rule 7 is explicitly flagged as *"the most locked rule in the platform. No exceptions"*:

> *"The workflow engine NEVER calls external systems. n8n NEVER modifies document state. This boundary is the most locked rule in the platform. No exceptions."*

Rule 6 reinforces this: *"n8n handles ALL cross-system operations."* The `on_submit` hook is a Frappe document lifecycle event — it is part of the workflow engine. Placing a `requests.post` call inside it violates the hard architectural boundary between Frappe (internal state management) and n8n (external actions). The `except: pass` block does not mitigate the violation — it just makes the violation silent. The logging concern is valid, but it must be handled by n8n, triggered by the document state change.

**Correct implementation:**
Remove `import requests` and the entire `requests.post` block from `on_submit`. The correct pattern is to emit a Frappe event or use a webhook that n8n is subscribed to:

```python
def on_submit(self):
    """State change is complete. n8n handles downstream notifications via webhook."""
    # Frappe's webhook system will fire the configured n8n trigger.
    # No direct external calls here. See: platform/decisions/ for Workflow/n8n boundary.
    pass
```

The n8n workflow subscribed to the `VocabularyConfig` submit webhook then posts to `logs.sparkmojo.internal`. Frappe never touches the external endpoint.

---

### 🔴 VIOLATION 7 — DocType Class Name Is Not Prefixed "SM"

| Field | Detail |
|---|---|
| **Violation Type** | Custom DocType not prefixed "SM" (Immutable Rule #3) |
| **File & Line** | `vocabulary_config.py`, Line 5 |
| **Exact Code** | `class VocabularyConfig(frappe.model.document.Document):` |

**Why it's a violation:**
Rule 3 states: *"SM DocTypes are prefixed `SM`. No exceptions."* The guardrails example is explicit: `"SM Vocabulary Config"`. The Python class name for a Frappe DocType is derived directly from the DocType name (spaces removed, title-cased). A class named `VocabularyConfig` corresponds to a DocType named `Vocabulary Config` — missing the `SM ` prefix. The file path `doctype/vocabulary_config/` also confirms the DocType name lacks the prefix.

**Correct implementation:**
The DocType must be renamed to `SM Vocabulary Config`. This cascades to:

```python
class SMVocabularyConfig(frappe.model.document.Document):
```

The directory must be renamed to `sm_vocabulary_config/`, and all `frappe.get_doc`, `frappe.get_list`, and `frappe.qb` references to this DocType across the codebase must be updated to `"SM Vocabulary Config"`.

---

### ⚠️ ADVISORY — Python Type Annotations in Method Signature

| Field | Detail |
|---|---|
| **Violation Type** | Minor style note — not a stated platform rule violation, flagged for consistency |
| **File & Line** | `vocabulary_config.py`, Line 30 |
| **Exact Code** | `def get_resolved_vocabulary(self, site_name: str) -> dict:` |

**Why it's flagged:**
The platform rules prohibit TypeScript on the frontend but do not explicitly ban Python type hints on the backend — Python type hints are standard modern Python. This is **not a rule violation**. It is flagged only because the `site_name` parameter is accepted but **never used** inside the method body — the method reads entirely from `self.vocabulary_json`. This is a dead parameter, which is a logic defect independent of typing.

**Correct implementation:**
Either remove the unused parameter or implement it to actually query by `site_name`:

```python
def get_resolved_vocabulary(self) -> dict:
    # site_name is available as self.site_name; no parameter needed
```

---

## Summary Table

| # | File | Line(s) | Severity | Rule | Violation |
|---|------|---------|----------|------|-----------|
| 1 | `VocabularySettings.jsx` | 2 | 🔴 Hard Block | Rule #4 | `import type` — TypeScript syntax in JSX file |
| 2 | `VocabularySettings.jsx` | 17–22 | 🔴 Hard Block | Rule #1 | `window.frappe.call` — React calling Frappe directly |
| 3 | `VocabularySettings.jsx` | 37 | 🔴 Hard Block | Rule #5 | Hardcoded hex `#F9FAFB` |
| 4 | `VocabularySettings.jsx` | 38 | 🔴 Hard Block | Rule #5 | Hardcoded hex `#111827` |
| 5 | `VocabularySettings.jsx` | 41 | 🔴 Hard Block | Rule #5 | Hardcoded hex `#6B7280` |
| 6 | `vocabulary_config.py` | 13–27 | 🔴 Hard Block | Rules #6, #7 | `requests.post` in `on_submit` — controller calling external system directly |
| 7 | `vocabulary_config.py` | 5 | 🔴 Hard Block | Rule #3 | DocType class `VocabularyConfig` missing `SM ` prefix |
| A | `VocabularySettings.jsx` | 41 | ⚠️ Advisory | Logic defect | `replace('_', ' ')` only replaces first underscore |
| B | `vocabulary_config.py` | 30 | ⚠️ Advisory | Logic defect | `site_name` parameter declared but never used |

---

**Both files are blocked from merge.** Neither file may proceed until all 7 hard violations are resolved. Violation 6 in `vocabulary_config.py` is the highest priority — it violates the platform's single most locked architectural rule and must be reviewed with the team lead before any rework begins.