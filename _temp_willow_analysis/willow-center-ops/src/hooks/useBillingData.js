import { useContext } from 'react'
import { BillingDataContext } from '../contexts/billingContext'

export function useBillingData() {
  return useContext(BillingDataContext)
}
