model: model-zeta
test: 06-code-review
run: A
date: 2026-04-09

## Code Review Report: Vocabulary Module

**Status: ❌ REJECTED** — Multiple critical violations found across both files.

---

### File 1: `platform/apps/mojo_frontend/src/mojos/settings/VocabularySettings.jsx`

#### Violation 1: TypeScript in JSX File
- **Line:** 2
- **Violation:** `import type { VocabularyEntry } from '../../types/vocabulary';`
- **Why:** Platform immutable rule #4: "No TypeScript. All frontend files are `.jsx`." The `import type` syntax is TypeScript-specific and is forbidden in all frontend code.
- **Correct:** Remove the type import. If types are needed for documentation, use JSDoc comments (`/** @type {Object} */`) or PropTypes, but never TypeScript syntax.

#### Violation 2: React Calls Frappe Directly
- **Line:** 13-18
- **Violation:** 
  ```jsx
  const result = await window.frappe.call({
    method: 'sm_widgets.api.vocabulary.get_site_vocabulary',
    args: { site: subdomain }
  });
  ```
- **Why:** Platform immutable rule #1: "React NEVER calls Frappe directly. All React calls go through `/api/modules/[capability]/[action]` on the Mojo Abstraction Layer." Calling `window.frappe.call()` bypasses the abstraction layer entirely.
- **Correct:** Route this call through the MAL endpoint. Since `handleSave` shows the correct pattern, the load should be:
  ```jsx
  const result = await fetch(`/api/modules/admin/vocabulary/${subdomain}`).then(r => r.json());
  ```

#### Violation 3: Hardcoded Hex Color (Background)
- **Line:** 34
- **Violation:** `style={{ background: '#F9FAFB', padding: '24px' }}`
- **Why:** Platform immutable rule #5: "No hardcoded hex colors. Use `var(--sm-*)` semantic tokens only." Hardcoded colors break theming and white-label capabilities.
- **Correct:** Replace with semantic variable: `style={{ background: 'var(--sm-surface-secondary)', padding: '24px' }}` (or appropriate `--sm-*` token).

#### Violation 4: Hardcoded Hex Color (Heading)
- **Line:** 35
- **Violation:** `style={{ color: '#111827' }}`
- **Why:** Hardcoded hex colors violate platform theming standards.
- **Correct:** Use `var(--sm-text-primary)` or appropriate semantic color token.

#### Violation 5: Hardcoded Hex Color (Label)
- **Line:** 38
- **Violation:** `style={{ color: '#6B7280' }}`
- **Why:** Hardcoded hex colors violate platform theming standards.
- **Correct:** Use `var(--sm-text-secondary)` or appropriate semantic color token.

---

### File 2: `platform/apps/sm_widgets/sm_widgets/doctype/vocabulary_config/vocabulary_config.py`

#### Violation 6: DocType Missing "SM " Prefix
- **Line:** 5 (implied by filename and class name)
- **Violation:** `class VocabularyConfig(frappe.model.document.Document):` defines a DocType named "Vocabulary Config"
- **Why:** Platform immutable rule #3: "All custom DocTypes must be prefixed 'SM ' (e.g., 'SM Vocabulary Config')" and "SM DocTypes are prefixed `SM`. No exceptions." The file path suggests this is registered as "Vocabulary Config" without the mandatory prefix.
- **Correct:** Rename DocType to **"SM Vocabulary Config"** (class becomes `class SMVocabularyConfig`, filename becomes `sm_vocabulary_config.py`, directory renamed accordingly).

#### Violation 7: Frappe Controller Makes External HTTP Call
- **Line:** 17-25
- **Violation:** 
  ```python
  requests.post(
      'https://logs.sparkmojo.internal/vocabulary-change',
      json={...},
      timeout=5
  )
  ```
- **Why:** Platform immutable rule #6: "n8n handles ALL cross-system operations. Frappe controllers never make external HTTP calls directly." This is also reinforced by rule #7 regarding the workflow/n8n boundary. External logging notifications are cross-system operations and must not be performed by document controllers.
- **Correct:** Remove the `requests` import and the `on_submit` hook entirely. If external logging is required, implement a Frappe Workflow state transition that triggers an n8n webhook. n8n then posts to the logging service. The workflow engine handles internal state; n8n handles external actions.

---

### Summary of Required Actions

| File | Action Required |
|------|----------------|
| `VocabularySettings.jsx` | Remove TypeScript import; replace `window.frappe.call` with MAL fetch; replace all 3 hex colors with CSS variables |
| `vocabulary_config.py` | Rename DocType to "SM Vocabulary Config"; remove `requests` logic and migrate external logging trigger to n8n via workflow state transition |

**Blocked:** Neither file may be merged until all violations are resolved.