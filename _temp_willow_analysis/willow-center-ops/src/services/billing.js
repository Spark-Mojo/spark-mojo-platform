/**
 * Billing data service — parse Google Sheets billing data into structured records.
 *
 * COLUMN LAYOUT — 'unpaid at 350pm' tab (0-indexed, use fixed positions):
 * [0]  Date of Service
 * [1]  Client
 * [2]  Clinician
 * [3]  Billing Code
 * [4]  Primary Insurance
 * [5]  Secondary Insurance
 * [6]  Rate per Unit
 * [7]  Units
 * [8]  Total Fee
 * [9]  Client Payment Status
 * [10] Charge          ← client charge (duplicate header "Charge")
 * [11] Uninvoiced      ← client uninvoiced
 * [12] Paid            ← client paid (duplicate header "Paid")
 * [13] Unpaid          ← client unpaid
 * [14] Insurance Payment Status
 * [15] Charge          ← insurance charge (second "Charge" — lost by name lookup)
 * [16] Paid            ← insurance paid   (second "Paid"   — lost by name lookup)
 * [17] Write Off
 * [18] Total Unpaid
 *
 * IMPORTANT: Never use header-name lookup on this tab — duplicate headers will silently
 * return the wrong column. Always use fixed positional index access (row[N]).
 */

function parseDollar(val) {
  if (val === undefined || val === null || val === '') return 0
  if (typeof val === 'number') return val
  const cleaned = String(val).replace(/[$,]/g, '').trim()
  const num = parseFloat(cleaned)
  return isNaN(num) ? 0 : num
}

function parseDate(val) {
  if (!val) return null
  if (val instanceof Date) return val
  if (typeof val === 'number') {
    const epoch = new Date(1899, 11, 30)
    const d = new Date(epoch.getTime() + val * 86400000)
    return isNaN(d.getTime()) ? null : d
  }
  const d = new Date(val)
  return isNaN(d.getTime()) ? null : d
}

/**
 * Parse 'unpaid at 350pm' tab rows into structured claim objects.
 * Uses FIXED POSITIONAL INDICES — do not use header name lookup.
 * @param {{ headers: string[], rows: any[][] }} sheetData
 * @returns {object[]}
 */
export function parseUnpaidClaims(sheetData) {
  const { rows } = sheetData
  if (!rows) return []

  return rows
    .filter(row => row && row.some(cell => cell !== undefined && cell !== ''))
    .map((row, i) => {
      const ri = (idx) => (row[idx] !== undefined && row[idx] !== null) ? row[idx] : ''
      return {
        id: `unpaid-${i}`,
        dateOfService:          parseDate(ri(0)),
        client:                 String(ri(1)).trim(),
        clinician:              String(ri(2)).trim(),
        billingCode:            String(ri(3)).trim(),
        primaryInsurance:       String(ri(4)).trim(),
        secondaryInsurance:     String(ri(5)).trim(),
        ratePerUnit:            parseDollar(ri(6)),
        units:                  parseDollar(ri(7)),
        totalFee:               parseDollar(ri(8)),
        billedAmount:           parseDollar(ri(8)),  // alias — same as totalFee
        clientPaymentStatus:    String(ri(9)).trim(),
        clientCharge:           parseDollar(ri(10)),
        clientUninvoiced:       parseDollar(ri(11)),
        clientPaid:             parseDollar(ri(12)),
        clientUnpaid:           parseDollar(ri(13)), // what client owes
        insurancePaymentStatus: String(ri(14)).trim(),
        insuranceCharge:        parseDollar(ri(15)), // col 15 — second "Charge"
        insurancePaid:          parseDollar(ri(16)), // col 16 — second "Paid"
        writeOff:               parseDollar(ri(17)),
        totalUnpaid:            parseDollar(ri(18)),
      }
    })
}

/**
 * Parse 'ins unbilled' tab rows into structured claim objects.
 * Uses header-name lookup (no duplicate headers in this tab).
 * @param {{ headers: string[], rows: any[][] }} sheetData
 * @returns {object[]}
 */
export function parseUnbilledClaims(sheetData) {
  const { headers, rows } = sheetData
  if (!headers || !rows) return []

  // Build a simple index map for this tab (no duplicates expected)
  const colMap = {}
  headers.forEach((h, i) => {
    if (h && !(h in colMap)) colMap[String(h).trim()] = i
  })
  const g = (row, name) => {
    const idx = colMap[name]
    return (idx !== undefined && idx < row.length) ? (row[idx] || '') : ''
  }

  return rows
    .filter(row => row && row.some(cell => cell !== undefined && cell !== ''))
    .map((row, i) => ({
      id: `unbilled-${i}`,
      dateOfService: parseDate(g(row, 'Date of Service')),
      client:        String(g(row, 'Client')).trim(),
      clinician:     String(g(row, 'Clinician')).trim(),
      billingCode:   String(g(row, 'Billing Code')).trim(),
      payer:         String(g(row, 'Primary Insurance') || g(row, 'Payer')).trim(),
      amountOwed:    parseDollar(g(row, 'Total Fee') || g(row, 'Amount Owed')),
      status:        'Unbilled',
      outreachAttempts: [],
      notes:         String(g(row, 'Notes')).trim(),
    }))
}

/**
 * Group claims into AR aging buckets by Date of Service.
 * Uses totalUnpaid (col 18) for UNPAID insurance claims only.
 */
export function calcARAgingBuckets(claims) {
  const now = new Date()
  const buckets = [
    { bucket: '0-30',   min: 0,   max: 30,       total: 0, count: 0 },
    { bucket: '31-60',  min: 31,  max: 60,        total: 0, count: 0 },
    { bucket: '61-90',  min: 61,  max: 90,        total: 0, count: 0 },
    { bucket: '91-120', min: 91,  max: 120,       total: 0, count: 0 },
    { bucket: '120+',   min: 121, max: Infinity,  total: 0, count: 0 },
  ]

  for (const claim of claims) {
    if (!claim.dateOfService) continue
    if (claim.insurancePaymentStatus?.toUpperCase() !== 'UNPAID') continue
    const days = Math.floor((now - claim.dateOfService) / 86400000)
    const b = buckets.find(b => days >= b.min && days <= b.max)
    if (b) {
      b.total += claim.totalUnpaid || 0
      b.count++
    }
  }

  return buckets
}

/**
 * Calculate summary KPIs from unpaid claims.
 */
export function calcKPIs(claims) {
  let totalUnpaid = 0
  let insuranceUnpaidCount = 0
  let clientUnpaidCount = 0
  let unbilledCount = 0

  for (const c of claims) {
    if (c.insurancePaymentStatus?.toUpperCase() === 'UNPAID') {
      totalUnpaid += c.totalUnpaid || 0
      insuranceUnpaidCount++
    }
    if (c.clientPaymentStatus?.toUpperCase() === 'UNPAID') clientUnpaidCount++
    if (c.insurancePaymentStatus?.toUpperCase() === 'UNBILLED') unbilledCount++
  }

  return { totalUnpaid, insuranceUnpaidCount, clientUnpaidCount, unbilledCount }
}

/**
 * Filter claims by multiple criteria (AND logic).
 */
export function filterClaims(claims, filters = {}) {
  return claims.filter(c => {
    if (filters.clinician && c.clinician !== filters.clinician) return false
    if (filters.primaryInsurance && c.primaryInsurance !== filters.primaryInsurance) return false
    if (filters.payer && c.payer !== filters.payer) return false
    if (filters.clientPaymentStatus && c.clientPaymentStatus !== filters.clientPaymentStatus) return false
    if (filters.insurancePaymentStatus && c.insurancePaymentStatus !== filters.insurancePaymentStatus) return false
    if (filters.dateFrom && c.dateOfService && c.dateOfService < new Date(filters.dateFrom)) return false
    if (filters.dateTo && c.dateOfService && c.dateOfService > new Date(filters.dateTo)) return false
    return true
  })
}
