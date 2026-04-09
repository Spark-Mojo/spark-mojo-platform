# Test 06: Adversarial Code Review

**Task type:** Code review / bug detection
**Evaluates:** Can the model catch all 5 planted violations without being told
how many there are?

**Scoring is binary per bug: caught or not caught.**

---

## DO NOT SHOW THE MODEL: Answer Key

The 5 planted violations are:

1. **[REACT-FRAPPE] React calls Frappe directly** - Line in JSX calls `window.frappe.call()` instead of the abstraction layer
2. **[TYPESCRIPT] TypeScript import** - File imports a TypeScript type using `import type`
3. **[HEX-COLOR] Hardcoded hex color** - A color value is hardcoded as a hex string instead of using `var(--sm-*)`
4. **[SM-PREFIX] Missing SM prefix on DocType** - A new DocType is named "Vocabulary Config" instead of "SM Vocabulary Config"
5. **[N8N-BOUNDARY] Frappe controller making external HTTP call** - A Frappe `on_submit` hook directly calls an external API instead of routing through n8n

---

## Input: Buggy Implementation

Provide ONLY this code to the model. Do not hint at how many bugs exist.

### File 1: `platform/apps/mojo_frontend/src/mojos/settings/VocabularySettings.jsx`

```jsx
import React, { useState, useEffect } from 'react';
import type { VocabularyEntry } from '../../types/vocabulary';
import { useSiteConfig } from '../../hooks/useSiteConfig';

const VOCAB_KEYS = [
  'person', 'service_record', 'service_provider', 'lead_inquiry',
  'intake_process', 'schedule_entry', 'invoice', 'task'
];

export default function VocabularySettings() {
  const { subdomain } = useSiteConfig();
  const [vocab, setVocab] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadVocab() {
      const result = await window.frappe.call({
        method: 'sm_widgets.api.vocabulary.get_site_vocabulary',
        args: { site: subdomain }
      });
      setVocab(result.message || {});
    }
    loadVocab();
  }, [subdomain]);

  async function handleSave() {
    setSaving(true);
    await fetch(`/api/modules/admin/vocabulary/${subdomain}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vocabulary: vocab })
    });
    setSaving(false);
  }

  return (
    <div style={{ background: '#F9FAFB', padding: '24px' }}>
      <h2 style={{ color: '#111827' }}>Vocabulary Settings</h2>
      {VOCAB_KEYS.map(key => (
        <div key={key} style={{ marginBottom: '12px' }}>
          <label style={{ color: '#6B7280' }}>{key.replace('_', ' ')}</label>
          <input
            value={vocab[key] || ''}
            onChange={e => setVocab({ ...vocab, [key]: e.target.value })}
            style={{ borderColor: 'var(--sm-border)', padding: '8px' }}
          />
        </div>
      ))}
      <button onClick={handleSave} disabled={saving}>
        {saving ? 'Saving...' : 'Save Changes'}
      </button>
    </div>
  );
}
```

### File 2: `platform/apps/sm_widgets/sm_widgets/doctype/vocabulary_config/vocabulary_config.py`

```python
import frappe
import requests

class VocabularyConfig(frappe.model.document.Document):
    
    def validate(self):
        if not self.site_name:
            frappe.throw("Site name is required")
        if not self.vocabulary_json:
            self.vocabulary_json = '{}'
    
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
    
    def get_resolved_vocabulary(self, site_name: str) -> dict:
        """Return the resolved vocabulary for a site."""
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

---

## Prompt (give this to the model)

```
You are the Primary Code Reviewer for the Spark Mojo build factory.
Review the following two files for any violations of the platform's architecture rules and coding standards. For each issue found, state:
1. The violation type
2. The exact file and line
3. Why it is a violation
4. What the correct implementation should be
Platform rules summary:
* React NEVER calls Frappe directly. All frontend API calls go through the abstraction layer at /api/modules/[capability]/[action]
* No TypeScript in any frontend file (.tsx, import type, etc.)
* No hardcoded hex colors. Use var(--sm-*) CSS variables only.
* All custom DocTypes must be prefixed "SM " (e.g., "SM Vocabulary Config")
* n8n handles ALL cross-system operations. Frappe controllers never make external HTTP calls directly.
* React components live in .jsx files only
Be thorough. Review every line.
```

---

## Scoring (Binary per violation)

| Violation | Caught (1) | Missed (0) |
|-----------|-----------|------------|
| [REACT-FRAPPE] window.frappe.call in JSX file | | |
| [TYPESCRIPT] import type statement | | |
| [HEX-COLOR] #F9FAFB or #111827 or #6B7280 hardcoded | | |
| [SM-PREFIX] DocType named "VocabularyConfig" without SM prefix | | |
| [N8N-BOUNDARY] requests.post in Frappe on_submit | | |

**Score: {caught}/5**
**Pass threshold: 4/5**

Note: The model should NOT be penalized for flagging other stylistic issues
(e.g., replace-only-first-underscore bug in the JSX). Score only the 5 planted violations.
