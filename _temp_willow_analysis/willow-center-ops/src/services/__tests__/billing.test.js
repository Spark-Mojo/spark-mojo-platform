import { describe, it, expect } from 'vitest'
import {
  parseUnpaidClaims,
  parseUnbilledClaims,
  calcARAgingBuckets,
  calcKPIs,
  filterClaims,
} from '../billing.js'

// ── parseUnpaidClaims ──

describe('parseUnpaidClaims', () => {
  it('returns empty array for missing rows', () => {
    expect(parseUnpaidClaims({ rows: null })).toEqual([])
    expect(parseUnpaidClaims({ rows: undefined })).toEqual([])
    expect(parseUnpaidClaims({})).toEqual([])
  })

  it('skips empty rows', () => {
    const result = parseUnpaidClaims({
      rows: [
        [undefined, undefined, undefined],
        ['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
      ],
    })
    expect(result).toHaveLength(0)
  })

  it('parses a valid row with correct field mapping', () => {
    const row = [
      '2025-01-15',   // [0] dateOfService
      'Jane Doe',     // [1] client
      'Dr. Smith',    // [2] clinician
      '90837',        // [3] billingCode
      'Aetna',        // [4] primaryInsurance
      'MetLife',      // [5] secondaryInsurance
      '$150.00',      // [6] ratePerUnit
      '1',            // [7] units
      '$150.00',      // [8] totalFee / billedAmount
      'UNPAID',       // [9] clientPaymentStatus
      '$150.00',      // [10] clientCharge
      '$0.00',        // [11] clientUninvoiced
      '$0.00',        // [12] clientPaid
      '$150.00',      // [13] clientUnpaid
      'UNPAID',       // [14] insurancePaymentStatus
      '$150.00',      // [15] insuranceCharge
      '$0.00',        // [16] insurancePaid
      '$0.00',        // [17] writeOff
      '$150.00',      // [18] totalUnpaid
    ]
    const [claim] = parseUnpaidClaims({ rows: [row] })

    expect(claim.client).toBe('Jane Doe')
    expect(claim.clinician).toBe('Dr. Smith')
    expect(claim.billingCode).toBe('90837')
    expect(claim.primaryInsurance).toBe('Aetna')
    expect(claim.totalFee).toBe(150)
    expect(claim.billedAmount).toBe(150)
    expect(claim.clientPaymentStatus).toBe('UNPAID')
    expect(claim.insurancePaymentStatus).toBe('UNPAID')
    expect(claim.totalUnpaid).toBe(150)
    expect(claim.clientUnpaid).toBe(150)
    expect(claim.id).toBe('unpaid-0')
  })

  it('handles dollar amounts with commas', () => {
    const row = new Array(19).fill('')
    row[8] = '$1,234.56'
    row[18] = '$2,500.00'
    const [claim] = parseUnpaidClaims({ rows: [row] })
    expect(claim.billedAmount).toBe(1234.56)
    expect(claim.totalUnpaid).toBe(2500)
  })

  it('handles missing/empty dollar values as 0', () => {
    const row = new Array(19).fill('')
    row[1] = 'Client Name' // need at least one non-empty cell
    const [claim] = parseUnpaidClaims({ rows: [row] })
    expect(claim.totalFee).toBe(0)
    expect(claim.totalUnpaid).toBe(0)
  })

  it('parses Excel serial date numbers', () => {
    const row = new Array(19).fill('')
    row[0] = 45672 // Excel serial date for ~2025-01-15
    row[1] = 'Test Client'
    const [claim] = parseUnpaidClaims({ rows: [row] })
    expect(claim.dateOfService).toBeInstanceOf(Date)
    expect(claim.dateOfService.getFullYear()).toBe(2025)
  })
})

// ── parseUnbilledClaims ──

describe('parseUnbilledClaims', () => {
  it('returns empty array for missing headers or rows', () => {
    expect(parseUnbilledClaims({})).toEqual([])
    expect(parseUnbilledClaims({ headers: null, rows: null })).toEqual([])
  })

  it('parses rows using header name lookup', () => {
    const headers = ['Date of Service', 'Client', 'Clinician', 'Billing Code', 'Primary Insurance', 'Total Fee', 'Notes']
    const rows = [
      ['2025-02-01', 'John Doe', 'Dr. Lee', '90834', 'UHC', '$200.00', 'Follow up needed'],
    ]
    const [claim] = parseUnbilledClaims({ headers, rows })

    expect(claim.client).toBe('John Doe')
    expect(claim.clinician).toBe('Dr. Lee')
    expect(claim.payer).toBe('UHC')
    expect(claim.amountOwed).toBe(200)
    expect(claim.status).toBe('Unbilled')
    expect(claim.notes).toBe('Follow up needed')
  })

  it('falls back to Payer header if Primary Insurance missing', () => {
    const headers = ['Date of Service', 'Client', 'Clinician', 'Billing Code', 'Payer', 'Total Fee']
    const rows = [['2025-02-01', 'Jane', 'Dr. A', '90837', 'Cigna', '$100']]
    const [claim] = parseUnbilledClaims({ headers, rows })
    expect(claim.payer).toBe('Cigna')
  })

  it('falls back to Amount Owed header if Total Fee missing', () => {
    const headers = ['Date of Service', 'Client', 'Clinician', 'Billing Code', 'Primary Insurance', 'Amount Owed']
    const rows = [['2025-02-01', 'Jane', 'Dr. A', '90837', 'Aetna', '$300']]
    const [claim] = parseUnbilledClaims({ headers, rows })
    expect(claim.amountOwed).toBe(300)
  })
})

// ── calcKPIs ──

describe('calcKPIs', () => {
  it('returns zeros for empty array', () => {
    const kpis = calcKPIs([])
    expect(kpis.totalUnpaid).toBe(0)
    expect(kpis.insuranceUnpaidCount).toBe(0)
    expect(kpis.clientUnpaidCount).toBe(0)
    expect(kpis.unbilledCount).toBe(0)
  })

  it('sums totalUnpaid for UNPAID insurance claims', () => {
    const claims = [
      { insurancePaymentStatus: 'UNPAID', totalUnpaid: 100, clientPaymentStatus: 'PAID' },
      { insurancePaymentStatus: 'UNPAID', totalUnpaid: 200, clientPaymentStatus: 'UNPAID' },
      { insurancePaymentStatus: 'PAID', totalUnpaid: 50, clientPaymentStatus: 'PAID' },
    ]
    const kpis = calcKPIs(claims)
    expect(kpis.totalUnpaid).toBe(300)
    expect(kpis.insuranceUnpaidCount).toBe(2)
    expect(kpis.clientUnpaidCount).toBe(1)
  })

  it('counts UNBILLED claims separately', () => {
    const claims = [
      { insurancePaymentStatus: 'UNBILLED', totalUnpaid: 0, clientPaymentStatus: '' },
      { insurancePaymentStatus: 'UNBILLED', totalUnpaid: 0, clientPaymentStatus: '' },
    ]
    expect(calcKPIs(claims).unbilledCount).toBe(2)
  })

  it('is case-insensitive for status matching', () => {
    const claims = [
      { insurancePaymentStatus: 'unpaid', totalUnpaid: 100, clientPaymentStatus: 'Unpaid' },
    ]
    const kpis = calcKPIs(claims)
    expect(kpis.totalUnpaid).toBe(100)
    expect(kpis.insuranceUnpaidCount).toBe(1)
    expect(kpis.clientUnpaidCount).toBe(1)
  })

  it('handles null/missing insurancePaymentStatus', () => {
    const claims = [
      { insurancePaymentStatus: null, totalUnpaid: 100, clientPaymentStatus: null },
    ]
    const kpis = calcKPIs(claims)
    expect(kpis.totalUnpaid).toBe(0)
    expect(kpis.insuranceUnpaidCount).toBe(0)
  })
})

// ── calcARAgingBuckets ──

describe('calcARAgingBuckets', () => {
  it('returns 5 empty buckets for empty claims', () => {
    const buckets = calcARAgingBuckets([])
    expect(buckets).toHaveLength(5)
    buckets.forEach(b => {
      expect(b.total).toBe(0)
      expect(b.count).toBe(0)
    })
  })

  it('puts a recent UNPAID claim in the 0-30 bucket', () => {
    const now = new Date()
    const dos = new Date(now)
    dos.setDate(dos.getDate() - 10) // 10 days ago
    const claims = [{
      dateOfService: dos,
      insurancePaymentStatus: 'UNPAID',
      totalUnpaid: 500,
    }]
    const buckets = calcARAgingBuckets(claims)
    expect(buckets[0].bucket).toBe('0-30')
    expect(buckets[0].total).toBe(500)
    expect(buckets[0].count).toBe(1)
  })

  it('ignores non-UNPAID claims', () => {
    const dos = new Date()
    dos.setDate(dos.getDate() - 5)
    const claims = [
      { dateOfService: dos, insurancePaymentStatus: 'PAID', totalUnpaid: 100 },
      { dateOfService: dos, insurancePaymentStatus: 'UNBILLED', totalUnpaid: 200 },
    ]
    const buckets = calcARAgingBuckets(claims)
    buckets.forEach(b => expect(b.count).toBe(0))
  })

  it('ignores claims with no dateOfService', () => {
    const claims = [
      { dateOfService: null, insurancePaymentStatus: 'UNPAID', totalUnpaid: 100 },
    ]
    const buckets = calcARAgingBuckets(claims)
    buckets.forEach(b => expect(b.count).toBe(0))
  })

  it('distributes claims across multiple buckets', () => {
    const now = new Date()
    const makeDos = (daysAgo) => {
      const d = new Date(now)
      d.setDate(d.getDate() - daysAgo)
      return d
    }
    const claims = [
      { dateOfService: makeDos(15), insurancePaymentStatus: 'UNPAID', totalUnpaid: 100 },
      { dateOfService: makeDos(45), insurancePaymentStatus: 'UNPAID', totalUnpaid: 200 },
      { dateOfService: makeDos(75), insurancePaymentStatus: 'UNPAID', totalUnpaid: 300 },
      { dateOfService: makeDos(100), insurancePaymentStatus: 'UNPAID', totalUnpaid: 400 },
      { dateOfService: makeDos(150), insurancePaymentStatus: 'UNPAID', totalUnpaid: 500 },
    ]
    const buckets = calcARAgingBuckets(claims)
    expect(buckets[0].total).toBe(100)  // 0-30
    expect(buckets[1].total).toBe(200)  // 31-60
    expect(buckets[2].total).toBe(300)  // 61-90
    expect(buckets[3].total).toBe(400)  // 91-120
    expect(buckets[4].total).toBe(500)  // 120+
  })
})

// ── filterClaims ──

describe('filterClaims', () => {
  const claims = [
    { clinician: 'Dr. Smith', primaryInsurance: 'Aetna', payer: 'Aetna', clientPaymentStatus: 'UNPAID', insurancePaymentStatus: 'UNPAID', dateOfService: new Date('2025-06-15') },
    { clinician: 'Dr. Lee', primaryInsurance: 'UHC', payer: 'UHC', clientPaymentStatus: 'PAID', insurancePaymentStatus: 'PAID', dateOfService: new Date('2025-07-01') },
    { clinician: 'Dr. Smith', primaryInsurance: 'Cigna', payer: 'Cigna', clientPaymentStatus: 'UNPAID', insurancePaymentStatus: 'UNBILLED', dateOfService: new Date('2025-08-20') },
  ]

  it('returns all claims with no filters', () => {
    expect(filterClaims(claims)).toHaveLength(3)
    expect(filterClaims(claims, {})).toHaveLength(3)
  })

  it('filters by clinician', () => {
    expect(filterClaims(claims, { clinician: 'Dr. Smith' })).toHaveLength(2)
    expect(filterClaims(claims, { clinician: 'Dr. Lee' })).toHaveLength(1)
  })

  it('filters by primaryInsurance', () => {
    expect(filterClaims(claims, { primaryInsurance: 'Aetna' })).toHaveLength(1)
  })

  it('filters by insurancePaymentStatus', () => {
    expect(filterClaims(claims, { insurancePaymentStatus: 'UNPAID' })).toHaveLength(1)
  })

  it('filters by date range', () => {
    const result = filterClaims(claims, { dateFrom: '2025-07-01', dateTo: '2025-08-31' })
    expect(result).toHaveLength(2)
  })

  it('applies multiple filters with AND logic', () => {
    const result = filterClaims(claims, {
      clinician: 'Dr. Smith',
      insurancePaymentStatus: 'UNPAID',
    })
    expect(result).toHaveLength(1)
    expect(result[0].primaryInsurance).toBe('Aetna')
  })
})
