import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { daysBetween, isMinor, daysUntil18, formatApptDate } from '../dates.js'

describe('daysBetween', () => {
  it('returns 0 for the same date', () => {
    expect(daysBetween('2025-01-15', '2025-01-15')).toBe(0)
  })

  it('returns positive number when b is after a', () => {
    expect(daysBetween('2025-01-01', '2025-01-11')).toBe(10)
  })

  it('returns negative number when b is before a', () => {
    expect(daysBetween('2025-01-11', '2025-01-01')).toBe(-10)
  })

  it('handles Date objects', () => {
    const a = new Date('2025-06-01')
    const b = new Date('2025-06-08')
    expect(daysBetween(a, b)).toBe(7)
  })

  it('handles large spans', () => {
    expect(daysBetween('2020-01-01', '2025-01-01')).toBe(1827)
  })
})

describe('isMinor', () => {
  let now

  beforeEach(() => {
    now = new Date('2026-03-13T12:00:00Z')
    vi.useFakeTimers()
    vi.setSystemTime(now)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns null for null/undefined/empty/n/a', () => {
    expect(isMinor(null)).toBeNull()
    expect(isMinor(undefined)).toBeNull()
    expect(isMinor('')).toBeNull()
    expect(isMinor('n/a')).toBeNull()
  })

  it('returns true for a child DOB', () => {
    // 10 years old
    expect(isMinor('2016-03-13')).toBe(true)
  })

  it('returns false for an adult DOB', () => {
    // 30 years old
    expect(isMinor('1996-03-13')).toBe(false)
  })

  it('returns true for someone just under 18', () => {
    // 17 years, 364 days old
    expect(isMinor('2008-03-14')).toBe(true)
  })

  it('returns false for someone exactly 18 (approximately)', () => {
    // Born 18 years ago today — should be false (>= 18)
    expect(isMinor('2008-03-13')).toBe(false)
  })
})

describe('daysUntil18', () => {
  let now

  beforeEach(() => {
    now = new Date('2026-03-13T12:00:00Z')
    vi.useFakeTimers()
    vi.setSystemTime(now)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns null for null/undefined/empty/n/a', () => {
    expect(daysUntil18(null)).toBeNull()
    expect(daysUntil18(undefined)).toBeNull()
    expect(daysUntil18('')).toBeNull()
    expect(daysUntil18('n/a')).toBeNull()
  })

  it('returns positive days for a minor turning 18 in the future', () => {
    // Born 2010-03-13 → turns 18 on 2028-03-13 → ~730 days from now
    const result = daysUntil18('2010-03-13')
    expect(result).toBeGreaterThan(700)
    expect(result).toBeLessThan(740)
  })

  it('returns negative days for someone already 18+', () => {
    // Born 2005-03-13 → turned 18 on 2023-03-13 → ~1096 days ago
    const result = daysUntil18('2005-03-13')
    expect(result).toBeLessThan(0)
  })

  it('returns approximately 0 for someone turning 18 today', () => {
    // Born 2008-03-13 → turns 18 today (rounding may produce -0)
    const result = daysUntil18('2008-03-13')
    expect(Math.abs(result)).toBeLessThanOrEqual(1)
  })
})

describe('formatApptDate', () => {
  it('returns empty string for falsy input', () => {
    expect(formatApptDate(null)).toBe('')
    expect(formatApptDate(undefined)).toBe('')
    expect(formatApptDate('')).toBe('')
  })

  it('formats a valid date string', () => {
    // Use a date that won't shift across timezone boundaries
    const result = formatApptDate('2025-06-15T12:00:00')
    expect(result).toContain('Jun')
    expect(result).toContain('15')
    expect(result).toContain('2025')
  })

  it('returns original string for unparseable input', () => {
    expect(formatApptDate('not a date')).toBe('not a date')
  })
})
