import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { deriveStatus } from '../status.js'

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-03-13T12:00:00Z'))
})
afterEach(() => vi.useRealTimers())

function makeClient(overrides = {}) {
  return {
    primaryInsurance: 'Aetna',
    dob: '1990-01-01',
    firstAppt: '2026-04-01', // ~19 days out, well past threshold
    paperworkComplete: false,
    insuranceCard: false,
    verified: false,
    custodyAgreement: false,
    gfeSent: false,
    spNoteAdded: false,
    insuranceUpdated: false,
    urgentOverride: false,
    archiveReason: '',
    ...overrides,
  }
}

describe('deriveStatus', () => {
  it('returns "archived" when archiveReason is present', () => {
    expect(deriveStatus(makeClient({ archiveReason: 'Cancelled' }))).toBe('archived')
  })

  it('returns "urgent" when urgentOverride is true', () => {
    expect(deriveStatus(makeClient({ urgentOverride: true }))).toBe('urgent')
  })

  it('returns "urgent" when firstAppt is missing', () => {
    expect(deriveStatus(makeClient({ firstAppt: '' }))).toBe('urgent')
    expect(deriveStatus(makeClient({ firstAppt: null }))).toBe('urgent')
    expect(deriveStatus(makeClient({ firstAppt: 'n/a' }))).toBe('urgent')
  })

  it('returns "urgent" when firstAppt is unparseable', () => {
    expect(deriveStatus(makeClient({ firstAppt: 'garbage' }))).toBe('urgent')
  })

  it('returns "urgent" when appointment is within threshold and incomplete', () => {
    // 1 day from now, threshold is 2
    const client = makeClient({ firstAppt: '2026-03-14' })
    expect(deriveStatus(client)).toBe('urgent')
  })

  it('returns "needs-paperwork" when paperwork is incomplete and appt is far out', () => {
    expect(deriveStatus(makeClient())).toBe('needs-paperwork')
  })

  it('returns "pending-insurance" when paperwork done but insurance not verified', () => {
    const client = makeClient({
      paperworkComplete: true,
      insuranceCard: true,
      verified: false,
    })
    expect(deriveStatus(client)).toBe('pending-insurance')
  })

  it('returns "needs-paperwork" for self-pay with incomplete paperwork', () => {
    const client = makeClient({ primaryInsurance: 'Self Pay' })
    expect(deriveStatus(client)).toBe('needs-paperwork')
  })

  it('skips pending-insurance for self-pay clients', () => {
    // Self-pay + paperwork done but not verified → should NOT be pending-insurance
    const client = makeClient({
      primaryInsurance: 'Self Pay',
      paperworkComplete: true,
      verified: false,
      spNoteAdded: false,
    })
    expect(deriveStatus(client)).not.toBe('pending-insurance')
  })

  it('returns "ready" when all required items are complete (insured adult)', () => {
    const client = makeClient({
      paperworkComplete: true,
      insuranceCard: true,
      verified: true,
      spNoteAdded: true,
    })
    expect(deriveStatus(client)).toBe('ready')
  })

  it('returns "ready" when all required items are complete (self-pay adult)', () => {
    const client = makeClient({
      primaryInsurance: 'Self Pay',
      paperworkComplete: true,
      gfeSent: true,
      spNoteAdded: true,
    })
    expect(deriveStatus(client)).toBe('ready')
  })

  it('respects custom urgent_threshold_days from config', () => {
    // Appt in 4 days, default threshold is 2 → not urgent
    const client = makeClient({ firstAppt: '2026-03-17' })
    expect(deriveStatus(client)).not.toBe('urgent')

    // But with threshold = 5 → urgent
    expect(deriveStatus(client, { urgent_threshold_days: 5 })).toBe('urgent')
  })

  it('archived takes precedence over urgent', () => {
    const client = makeClient({
      archiveReason: 'No show',
      urgentOverride: true,
      firstAppt: '',
    })
    expect(deriveStatus(client)).toBe('archived')
  })
})
