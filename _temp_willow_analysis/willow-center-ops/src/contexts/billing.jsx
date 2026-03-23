import { useState, useMemo, useCallback } from 'react'
import { BillingDataContext } from './billingContext'
import { fetchBillingFromSheet } from '../services/sheets'
import { parseUnpaidClaims, parseUnbilledClaims } from '../services/billing'

export function BillingDataProvider({ children }) {
  const [unpaidClaims, setUnpaidClaims] = useState([])
  const [unbilledClaims, setUnbilledClaims] = useState([])
  const [isLoaded, setIsLoaded] = useState(false)
  const [uploadTimestamp, setUploadTimestamp] = useState(null)
  const [fileName, setFileName] = useState(null)
  const [onboardingUpload, setOnboardingUpload] = useState(null)
  const [clientBalanceOverrides, setClientBalanceOverrides] = useState({})

  const fetchFromSheet = useCallback(async (accessToken) => {
    const { unpaid, unbilled } = await fetchBillingFromSheet(accessToken)
    const parsedUnpaid = parseUnpaidClaims(unpaid)
    const parsedUnbilled = parseUnbilledClaims(unbilled)
    setUnpaidClaims(parsedUnpaid)
    setUnbilledClaims(parsedUnbilled)
    setIsLoaded(true)
    setUploadTimestamp(new Date().toISOString())
    setFileName('Google Sheets')
    setClientBalanceOverrides({})
  }, [])

  const value = useMemo(() => ({
    unpaidClaims,
    unbilledClaims,
    isLoaded,
    uploadTimestamp,
    fileName,
    onboardingUpload,
    clientBalanceOverrides,
    fetchFromSheet,
    loadBillingData: (unpaid, unbilled, name) => {
      setUnpaidClaims(unpaid)
      setUnbilledClaims(unbilled)
      setIsLoaded(true)
      setUploadTimestamp(new Date().toISOString())
      setFileName(name)
      setClientBalanceOverrides({})
    },
    loadOnboardingUpload: (info) => {
      setOnboardingUpload(info)
    },
    updateUnbilledClaim: (claimId, updates) => {
      setUnbilledClaims(prev =>
        prev.map(c => c.id === claimId ? { ...c, ...updates } : c)
      )
    },
    updateClientBalance: (clientKey, updates) => {
      setClientBalanceOverrides(prev => ({
        ...prev,
        [clientKey]: { ...(prev[clientKey] || {}), ...updates },
      }))
    },
  }), [unpaidClaims, unbilledClaims, isLoaded, uploadTimestamp, fileName, onboardingUpload, clientBalanceOverrides, fetchFromSheet])

  return (
    <BillingDataContext.Provider value={value}>
      {children}
    </BillingDataContext.Provider>
  )
}
