import { useState, useEffect, useCallback } from 'react'
import { getOnboardingClients, getStaff, getConfig, fetchVoicemails, fetchTasks, AuthExpiredError } from '../services/sheets'

export function useSheets(accessToken) {
  const [clients, setClients] = useState([])
  const [staff, setStaff] = useState([])
  const [config, setConfig] = useState({})
  const [voicemails, setVoicemails] = useState([])
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [authExpired, setAuthExpired] = useState(false)

  const refresh = useCallback(async () => {
    if (!accessToken) return
    setLoading(true)
    setError(null)
    try {
      const [c, s, cfg, vm, t] = await Promise.allSettled([
        getOnboardingClients(accessToken),
        getStaff(accessToken),
        getConfig(accessToken),
        fetchVoicemails(accessToken),
        fetchTasks(accessToken),
      ])
      // Check for auth expiry in any result
      const authErr = [c, s, cfg, vm, t].find(
        r => r.status === 'rejected' && r.reason instanceof AuthExpiredError
      )
      if (authErr) {
        setAuthExpired(true)
        return
      }
      setClients(c.status === 'fulfilled' ? c.value : [])
      setStaff(s.status === 'fulfilled' ? s.value : [])
      setConfig(cfg.status === 'fulfilled' ? cfg.value : {})
      setVoicemails(vm.status === 'fulfilled' ? vm.value : [])
      setTasks(t.status === 'fulfilled' ? t.value : [])
      const firstError = [c, s, cfg, vm, t].find(r => r.status === 'rejected')
      if (firstError) {
        console.error('Sheets load error:', firstError.reason)
        setError(firstError.reason?.message || 'Failed to load some data')
      }
    } catch (err) {
      if (err instanceof AuthExpiredError) {
        setAuthExpired(true)
        return
      }
      console.error('Sheets hook error:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [accessToken])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { clients, staff, setStaff, config, voicemails, tasks, loading, error, refresh, setClients, setVoicemails, setTasks, authExpired }
}
