model: model-theta
test: 06-code-review
run: A
date: 2026-04-09

# Spark Mojo Build Factory - Code Review Report

## File 1: `platform/apps/mojo_frontend/src/mojos/settings/VocabularySettings.jsx`

### Violation 1: TypeScript Type Import
**Violation Type:** TypeScript usage in frontend file  
**File & Line:** Line 2: `import type { VocabularyEntry } from '../../types/vocabulary';`  
**Why it's a violation:** Platform rule states "No TypeScript in any frontend file (.tsx, import type, etc.)". This includes TypeScript type imports.  
**Correct Implementation:** Remove the type import or convert it to a regular JavaScript import if `VocabularyEntry` is a runtime value. If it's only for types, remove it entirely.

```jsx
import React, { useState, useEffect } from 'react';
import { useSiteConfig } from '../../hooks/useSiteConfig';
// Remove the type import
```

### Violation 2: Direct Frappe API Call
**Violation Type:** React calling Frappe directly  
**File & Line:** Lines 19-24:
```jsx
const result = await window.frappe.call({
  method: 'sm_widgets.api.vocabulary.get_site_vocabulary',
  args: { site: subdomain }
});
```
**Why it's a violation:** Platform rule states "React NEVER calls Frappe directly. All frontend API calls go through the abstraction layer at `/api/modules/[capability]/[action]`". This is a direct `window.frappe.call()` invocation.  
**Correct Implementation:** Replace with a fetch call to the abstraction layer:

```jsx
useEffect(() => {
  async function loadVocab() {
    const response = await fetch(`/api/modules/admin/vocabulary/${subdomain}`);
    if (response.ok) {
      const data = await response.json();
      setVocab(data.vocabulary || {});
    }
  }
  loadVocab();
}, [subdomain]);
```

### Violation 3: Hardcoded Hex Color `#F9FAFB`
**Violation Type:** Hardcoded hex color  
**File & Line:** Line 37: `style={{ background: '#F9FAFB', padding: '24px' }}`  
**Why it's a violation:** Platform rule states "No hardcoded hex colors. Use `var(--sm-*)` CSS variables only".  
**Correct Implementation:** Replace with appropriate CSS variable:

```jsx
<div style={{ background: 'var(--sm-bg-secondary)', padding: '24px' }}>
```

### Violation 4: Hardcoded Hex Color `#111827`
**Violation Type:** Hardcoded hex color  
**File & Line:** Line 38: `style={{ color: '#111827' }}`  
**Why it's a violation:** Same as above - must use CSS variables.  
**Correct Implementation:** Replace with appropriate CSS variable:

```jsx
<h2 style={{ color: 'var(--sm-text-primary)' }}>Vocabulary Settings</h2>
```

### Violation 5: Hardcoded Hex Color `#6B7280`
**Violation Type:** Hardcoded hex color  
**File & Line:** Line 42: `style={{ color: '#6B7280' }}`  
**Why it's a violation:** Same as above - must use CSS variables.  
**Correct Implementation:** Replace with appropriate CSS variable:

```jsx
<label style={{ color: 'var(--sm-text-secondary)' }}>{key.replace('_', ' 'label>
```

## File 2: `platform/apps/sm_widgets/sm_widgets/doctype/vocabulary_config/vocabulary_config.py`

### Violation 1: Missing "SM " Prefix on DocType
**Violation Type:** DocType naming convention violation  
**File & Line:** Line 4: `class VocabularyConfig(frappe.model.document.Document):`  
**Why it's a violation:** Platform rule states "All custom DocTypes must be prefixed 'SM ' (e.g., 'SM Vocabulary Config')". The class name should reflect the prefix.  
**Correct Implementation:** Rename the class to include the "SM " prefix:

```python
class SMVocabularyConfig(frappe.model.document.Document):
```

**Note:** The DocType name in Frappe should be "SM Vocabulary Config", and the directory/file structure should reflect this naming: `sm_widgets/doctype/sm_vocabulary_config/`

### Violation 2: External HTTP Call from Frappe Controller
**Violation Type:** Frappe making external HTTP calls directly  
**File & Line:** 
- Line 2: `import requests`
- Lines 22-31: `requests.post(...)` call in `on_submit()` method

**Why it's a violation:** Platform rule states "n8n handles ALL cross-system operations. Frappe controllers never make external HTTP calls directly." This code makes a direct HTTP call to an external logging service.  
**Correct Implementation:** Remove the `requests` import and the direct HTTP call. Instead, trigger an n8n workflow. One approach is to create a Frappe event that n8n listens to:

```python
def on_submit(self):
    """Trigger n8n workflow for vocabulary change notification."""
    frappe.publish_realtime(
        event='vocabulary_config_submitted',
        message={
            'site': self.site_name,
            'changed_by': frappe.session.user,
            'timestamp': str(frappe.utils.now()),
            'docname': self.name
        },
        user=frappe.session.user
    )
    
    # Alternatively, create a queue item for n8n to process
    frappe.enqueue(
        'sm_widgets.api.n8n_utils.trigger_vocabulary_change_workflow',
        site=self.site_name,
        changed_by=frappe.session.user,
        queue='long'
    )
```

### Violation 3: Unused Method Parameter
**Note:** While not a platform rule violation, this is a code quality issue worth mentioning.  
**File & Line:** Line 33: `def get_resolved_vocabulary(self, site_name: str) -> dict:`  
**Issue:** The `site_name` parameter is defined but not used in the method body (the method uses `self.site_name` instead).  
**Correct Implementation:** Either use the parameter or remove it:

```python
def get_resolved_vocabulary(self) -> dict:
    """Return the resolved vocabulary for this document's site."""
    import json
    
    PLATFORM_DEFAULTS = {
        'person': 'Client',
        'service_record': 'Service',
        'invoice': 'Invoice',
    }
    
    try:
        overrides = json.loads(self.vocabulary_json or '{}')
    except (json.JSONDecodeError, TypeError):
        overrides = {}
    
    return {**PLATFORM_DEFAULTS, **overrides}
```

## Summary of Required Changes

details>
<summary><strong>File 1: VocabularySettings.jsx - Required Changes</strong></summary>

1. **Remove TypeScript type import** (line 2)
2. **Replace direct Frappe call** with abstraction layer API call (lines 19-24)
3. **Replace all hardcoded hex colors** with CSS variables:
   - `#F9FAFB` → `var(--sm-bg-secondary)` or appropriate variable
   - `#111827` → `var(--sm-text-primary)` or appropriate variable  
   - `#6B7280` → `var(--sm-text-secondary)` or appropriate variable
4. **Consider moving inline styles to CSS classes** for better maintainability
</detailsdetails>
<summary><strong>File 2: vocabulary_config.py - Requiredsummary>

1. **Rename DocType class** to `SMVocabularyConfig` 
2. **Rename directory/file** to follow "SM " prefix convention
3. **Remove `requests` import** and direct HTTP call in `on_submit()`
4. **Implement n8n integration** via Frappe events or queue system
5. **Fix unused parameter** in `get_resolved_vocabulary()` method
</detailsdetails>
<summary><strong>Architecture Compliance Checklist</strong></summary>

- [ ] **Frontend Abstraction Layer:** All React → Frappe calls go through `/api/modules/`
- [ ] **No TypeScript:** Frontend files use only JavaScript (.jsx)
- [ ] **CSS Variables Only:** No hardcoded hex colors in JSX
- [ ] **DocType Prefix:** All custom DocTypes prefixed with "SM "
- [ ] **n8n for Cross-System:** No external HTTP calls from Frappe controllers
- [ ] **React File Extension:** Components use `.jsx` extension only
</details>

**Reviewer's Note:** The save operation in `VocabularySettings.jsx` (lines 28-34) correctly uses the abstraction layer (`/api/modules/admin/vocabulary/${subdomain}`). This pattern should be mirrored for the load operation as well. Consistency in API consumption patterns will improve maintainability and ensure compliance with the platform's architecture.