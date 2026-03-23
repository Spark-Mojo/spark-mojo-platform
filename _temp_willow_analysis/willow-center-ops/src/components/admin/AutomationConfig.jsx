import { useState, useEffect, useContext } from 'react'
import { GripVertical, X, Plus, Save } from 'lucide-react'
import { getConfig } from '../../services/sheets'
import { updateConfig } from '../../services/sheetsWrite'
import { ToastContext } from '../../hooks/useToast'

const SETTINGS = [
  { key: 'outreach_followup_days', label: 'Outreach Follow-up Days', type: 'number' },
  { key: 'urgent_threshold_days', label: 'Urgent Threshold Days', type: 'number' },
  { key: 'admin_default_assignee', label: 'Default Assignee (Initials)', type: 'text' },
  { key: 'age18_warning_days', label: 'Age-18 Warning Days', type: 'number' },
  { key: 'age18_task_due_days', label: 'Age-18 Task Due Days', type: 'number' },
]

export default function AutomationConfig({ accessToken, userEmail, onRefresh }) {
  const ctx = useContext(ToastContext)
  const toast = ctx?.toast
  const [config, setConfig] = useState({})
  const [methods, setMethods] = useState([])
  const [newMethod, setNewMethod] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getConfig(accessToken).then(cfg => {
      setConfig(cfg)
      setMethods((cfg.outreach_methods || '').split(',').map(m => m.trim()).filter(Boolean))
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [accessToken])

  const handleSave = async () => {
    setSaving(true)
    try {
      for (const setting of SETTINGS) {
        if (config[setting.key] !== undefined) {
          await updateConfig(accessToken, setting.key, config[setting.key], userEmail)
        }
      }
      await updateConfig(accessToken, 'outreach_methods', methods.join(','), userEmail)
      toast?.success('Settings saved')
      onRefresh?.()
    } catch (err) {
      toast?.error(`Failed to save: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  const addMethod = () => {
    if (!newMethod.trim()) return
    setMethods(prev => [...prev, newMethod.trim()])
    setNewMethod('')
  }

  const removeMethod = (index) => {
    setMethods(prev => prev.filter((_, i) => i !== index))
  }

  const moveMethod = (from, to) => {
    setMethods(prev => {
      const arr = [...prev]
      const [item] = arr.splice(from, 1)
      arr.splice(to, 0, item)
      return arr
    })
  }

  if (loading) return <div className="text-center py-20" style={{ color: 'var(--muted)' }}>Loading...</div>

  return (
    <div className="max-w-lg">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold" style={{ color: 'var(--text)' }}>Automation Config</h2>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50"
          style={{ backgroundColor: 'var(--accent)' }}
        >
          <Save size={14} /> {saving ? 'Saving...' : 'Save'}
        </button>
      </div>

      {/* Settings */}
      <div className="rounded-xl p-4 mb-6" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
        <h3 className="text-xs font-medium uppercase tracking-wider mb-4" style={{ color: 'var(--muted)' }}>
          Timing Settings
        </h3>
        <div className="space-y-3">
          {SETTINGS.map(setting => (
            <div key={setting.key} className="flex items-center justify-between">
              <label className="text-sm" style={{ color: 'var(--text)' }}>{setting.label}</label>
              <input
                type={setting.type}
                value={config[setting.key] || ''}
                onChange={(e) => setConfig(prev => ({ ...prev, [setting.key]: e.target.value }))}
                className="w-24 px-3 py-1.5 rounded-lg border text-sm text-right"
                style={{ borderColor: 'var(--border)', color: 'var(--text)', fontFamily: "'IBM Plex Mono', monospace" }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Outreach Methods */}
      <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
        <h3 className="text-xs font-medium uppercase tracking-wider mb-4" style={{ color: 'var(--muted)' }}>
          Outreach Methods
        </h3>
        <div className="space-y-1 mb-3">
          {methods.map((method, i) => (
            <div key={`${method}-${i}`} className="flex items-center gap-2 py-1.5 px-2 rounded-lg" style={{ backgroundColor: 'var(--bg)' }}>
              <div className="flex flex-col gap-0.5">
                {i > 0 && (
                  <button onClick={() => moveMethod(i, i - 1)} className="text-xs" style={{ color: 'var(--muted)' }}>▲</button>
                )}
                {i < methods.length - 1 && (
                  <button onClick={() => moveMethod(i, i + 1)} className="text-xs" style={{ color: 'var(--muted)' }}>▼</button>
                )}
              </div>
              <span className="flex-1 text-sm" style={{ color: 'var(--text)' }}>{method}</span>
              <button onClick={() => removeMethod(i)} className="p-1" style={{ color: 'var(--red)' }}>
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={newMethod}
            onChange={(e) => setNewMethod(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addMethod()}
            placeholder="New method..."
            className="flex-1 px-3 py-2 rounded-lg border text-sm"
            style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
          />
          <button
            onClick={addMethod}
            className="px-3 py-2 rounded-lg text-sm font-medium text-white"
            style={{ backgroundColor: 'var(--accent)' }}
          >
            <Plus size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}
