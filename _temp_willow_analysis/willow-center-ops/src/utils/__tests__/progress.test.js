import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { calcProgress, isComplete } from '../progress.js'

// Fix time so isMinor is deterministic
beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-03-13T12:00:00Z'))
})
afterEach(() => vi.useRealTimers())

function makeClient(overrides = {}) {
  return {
    primaryInsurance: 'Aetna',
    dob: '1990-01-01', // adult
    paperworkComplete: false,
    insuranceCard: false,
    verified: false,
    custodyAgreement: false,
    gfeSent: false,
    spNoteAdded: false,
    insuranceUpdated: false,
    ...overrides,
  }
}

describe('calcProgress — insured adult', () => {
  it('returns 0% when nothing is complete', () => {
    const { pct, requiredItems } = calcProgress(makeClient())
    expect(pct).toBe(0)
    // Required: paperwork, insurance card, insurance verified, SP note = 4
    expect(requiredItems).toHaveLength(4)
  })

  it('returns 100% when all required items complete', () => {
    const { pct } = calcProgress(makeClient({
      paperworkComplete: true,
      insuranceCard: true,
      verified: true,
      spNoteAdded: true,
    }))
    expect(pct).toBe(100)
  })

  it('returns 50% when 2 of 4 required items complete', () => {
    const { pct } = calcProgress(makeClient({
      paperworkComplete: true,
      spNoteAdded: true,
    }))
    expect(pct).toBe(50)
  })

  it('does not include GFE for insured clients', () => {
    const { requiredItems } = calcProgress(makeClient())
    expect(requiredItems).not.toContain('Good Faith Estimate sent')
  })

  it('does not include custody for adults without custody field', () => {
    const { requiredItems } = calcProgress(makeClient())
    expect(requiredItems).not.toContain('Custody agreement')
  })
})

describe('calcProgress — self-pay adult', () => {
  it('includes GFE instead of insurance items', () => {
    const client = makeClient({ primaryInsurance: 'Self Pay' })
    const { requiredItems } = calcProgress(client)
    expect(requiredItems).toContain('Good Faith Estimate sent')
    expect(requiredItems).not.toContain('Insurance card uploaded')
    expect(requiredItems).not.toContain('Insurance verified')
  })

  it('requires paperwork, GFE, SP note for self-pay adult = 3 items', () => {
    const client = makeClient({ primaryInsurance: 'Self Pay' })
    const { requiredItems } = calcProgress(client)
    expect(requiredItems).toHaveLength(3)
  })

  it('returns 100% when all self-pay items complete', () => {
    const { pct } = calcProgress(makeClient({
      primaryInsurance: 'Self Pay',
      paperworkComplete: true,
      gfeSent: true,
      spNoteAdded: true,
    }))
    expect(pct).toBe(100)
  })

  it('handles case-insensitive "self pay"', () => {
    const { requiredItems } = calcProgress(makeClient({ primaryInsurance: 'self pay' }))
    expect(requiredItems).toContain('Good Faith Estimate sent')
    expect(requiredItems).not.toContain('Insurance card uploaded')
  })
})

describe('calcProgress — minor (custody required)', () => {
  it('includes custody agreement for a minor', () => {
    // 10-year-old
    const client = makeClient({ dob: '2016-03-13' })
    const { requiredItems } = calcProgress(client)
    expect(requiredItems).toContain('Custody agreement')
  })

  it('includes custody agreement when custodyAgreement field is truthy even for adults', () => {
    const client = makeClient({ dob: '1990-01-01', custodyAgreement: true })
    const { requiredItems } = calcProgress(client)
    expect(requiredItems).toContain('Custody agreement')
  })

  it('has 5 required items for insured minor', () => {
    const client = makeClient({ dob: '2016-03-13' })
    const { requiredItems } = calcProgress(client)
    // paperwork + insurance card + insurance verified + custody + SP note
    expect(requiredItems).toHaveLength(5)
  })
})

describe('calcProgress — unknown DOB', () => {
  it('skips custody when DOB is null and no custody field', () => {
    const client = makeClient({ dob: null })
    const { requiredItems } = calcProgress(client)
    expect(requiredItems).not.toContain('Custody agreement')
  })

  it('skips custody when DOB is n/a and no custody field', () => {
    const client = makeClient({ dob: 'n/a' })
    const { requiredItems } = calcProgress(client)
    expect(requiredItems).not.toContain('Custody agreement')
  })
})

describe('isComplete', () => {
  it('returns false when progress < 100%', () => {
    expect(isComplete(makeClient())).toBe(false)
  })

  it('returns true when progress = 100%', () => {
    expect(isComplete(makeClient({
      paperworkComplete: true,
      insuranceCard: true,
      verified: true,
      spNoteAdded: true,
    }))).toBe(true)
  })
})
