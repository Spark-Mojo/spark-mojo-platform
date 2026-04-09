model: model-beta
test: 06-code-review
run: A
date: 2026-04-09

# Code Review: `VocabularySettings.jsx` & `vocabulary_config.py`

**Verdict: 🔴 7 violations found (5 in File 1, 2 in File 2). Neither file is merge-ready.**

---

## File 1: `VocabularySettings.jsx`

### Violation 1 — TypeScript in Frontend File

| | |
|---|---|
| **Type** | Architecture Immutable §4, Rule 4 |
| **Location** | `VocabularySettings.jsx`, **Line 2** |
| **Code** | `import type { VocabularyEntry } from '../../types/vocabulary';` |

**Why it violates:** `import type` is TypeScript syntax. The platform rules state: *"No TypeScript. All frontend files are `.jsx`."* This line would also fail at runtime in a plain JSX/Babel pipeline since `import type` is not valid JavaScript.

**Note:** The imported type `VocabularyEntry` is also never used anywhere in the component, making this both a violation and dead code.

**Correct implementation:** Remove the line entirely. If runtime shape validation is needed, use PropTypes or a plain JS default object.

```jsx
// DELETE line 2 entirely. No replacement needed.
```

---

### Violation 2 — React Calling Frappe Directly

| | |
|---|---|
| **Type** | Architecture Immutable §4, Rule 1 (the MAL rule) |
| **Location** | `VocabularySettings.jsx`, **Lines 17–21** |
| **Code** | `await window.frappe.call({ method: 'sm_widgets.api.vocabulary.get_site_vocabulary', ... })` |

**Why it violates:** *"React NEVER calls Frappe directly. All React calls go through `/api/modules/[capability]/[action]` on the Mojo Abstraction Layer."* This is a direct RPC call to a Frappe whitelisted method via `window.frappe.call`. The `handleSave` function on line 26 already correctly uses the MAL endpoint — the load path must do the same.

**Correct implementation:**

```jsx
useEffect(() => {
  async function loadVocab() {
    const res = await fetch(`/api/modules/admin/vocabulary/${subdomain}`);
    const data = await res.json();
    setVocab(data.vocabulary || {});
  }
  loadVocab();
}, [subdomain]);
```

---

### Violation 3 — Hardcoded Hex Color `#F9FAFB`

| | |
|---|---|
| **Type** | Architecture Immutable §4, Rule 5 |
| **Location** | `VocabularySettings.jsx`, **Line 34** |
| **Code** | `style={{ background: '#F9FAFB', padding: '24px' }}` |

**Correct implementation:**

```jsx
style={{ background: 'var(--sm-surface)', padding: '24px' }}
```

---

### Violation 4 — Hardcoded Hex Color `#111827`

| | |
|---|---|
| **Type** | Architecture Immutable §4, Rule 5 |
| **Location** | `VocabularySettings.jsx`, **Line 35** |
| **Code** | `style={{ color: '#111827' }}` |

**Correct implementation:**

```jsx
style={{ color: 'var(--sm-text-primary)' }}
```

---

### Violation 5 — Hardcoded Hex Color `#6B7280`

| | |
|---|---|
| **Type** | Architecture Immutable §4, Rule 5 |
| **Location** | `VocabularySettings.jsx`, **Line 38** |
| **Code** | `style={{ color: '#6B7280' }}` |

**Correct implementation:**

```jsx
style={{ color: 'var(--sm-text-secondary)' }}
```

---

## File 2: `vocabulary_config.py`

### Violation 6 — DocType Not Prefixed `SM `

| | |
|---|---|
| **Type** | Architecture Immutable §4, Rule 3 |
| **Location** | `vocabulary_config.py`, **entire file** (class name, file path, directory) |
| **Code** | DocType is named `Vocabulary Config` (path: `doctype/vocabulary_config/`) |

**Why it violates:** *"SM DocTypes are prefixed `SM`. No exceptions."* The DocType must be named **`SM Vocabulary Config`**, which means the directory structure, filename, JSON definition, and class name must all reflect this.

**Correct implementation:**

- Rename directory: `doctype/sm_vocabulary_config/`
- Rename file: `sm_vocabulary_config.py`
- Rename class:

```python
class SMVocabularyConfig(frappe.model.document.Document):
```

- Update the corresponding DocType JSON `name` field to `"SM Vocabulary Config"`.

---

### Violation 7 — Frappe Controller Making External HTTP Call

| | |
|---|---|
| **Type** | Architecture Immutable §4, Rule 6 & Rule 7 |
| **Location** | `vocabulary_config.py`, **Lines 14–23** (`on_submit` method) |
| **Code** | `requests.post('https://logs.sparkmojo.internal/vocabulary-change', ...)` |

**Why it violates:** Two rules are broken simultaneously:

1. *"n8n handles ALL cross-system operations."* An HTTP call to an external logging service is a cross-system operation.
2. *"The workflow engine NEVER calls external systems. … This boundary is the most locked rule in the platform. No exceptions."*

The `# Non-blocking` comment and bare `except Exception: pass` also silently swallows errors, meaning vocabulary submissions could fail to log indefinitely with zero observability.

**Correct implementation:** The `on_submit` hook should only update internal Frappe state. The external notification must be handled by an n8n workflow triggered by the document's state change (e.g., via a Frappe webhook on `SM Vocabulary Config` submit).

```python
def on_submit(self):
    """Internal state handling only.
    External logging is handled by n8n workflow:
    SM Vocabulary Config submit → n8n → logs.sparkmojo.internal
    """
    frappe.publish_realtime(
        'vocabulary_committed',
        {'site': self.site_name},
        doctype=self.doctype,
        docname=self.name
    )
```

Then configure an n8n workflow:

> **Trigger:** Frappe webhook on `SM Vocabulary Config` → on_submit
> **Action:** HTTP POST to `https://logs.sparkmojo.internal/vocabulary-change`

The `import requests` on **line 2** should also be removed since it is no longer needed and was only there to support the violating call.

---

## Summary

| # | File | Line(s) | Violation | Severity |
|---|------|---------|-----------|----------|
| 1 | `VocabularySettings.jsx` | 2 | TypeScript `import type` in JSX | 🔴 Build-breaking |
| 2 | `VocabularySettings.jsx` | 17–21 | React calls `window.frappe.call()` directly | 🔴 Architecture breach |
| 3 | `VocabularySettings.jsx` | 34 | Hardcoded hex `#F9FAFB` | 🟡 Standards violation |
| 4 | `VocabularySettings.jsx` | 35 | Hardcoded hex `#111827` | 🟡 Standards violation |
| 5 | `VocabularySettings.jsx` | 38 | Hardcoded hex `#6B7280` | 🟡 Standards violation |
| 6 | `vocabulary_config.py` | All | DocType missing `SM ` prefix | 🔴 Architecture breach |
| 7 | `vocabulary_config.py` | 14–23 | Frappe controller makes external HTTP call | 🔴 Most-locked-rule breach |

**Violations 2, 6, and 7 are breaches of immutable architecture rules and must be fixed before any further review. Violation 7 specifically breaks what the guardrails call *"the most locked rule in the platform."***