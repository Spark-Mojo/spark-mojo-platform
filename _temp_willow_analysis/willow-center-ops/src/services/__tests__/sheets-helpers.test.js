import { describe, it, expect } from 'vitest'
import { buildColumnMap, colLetter, toBool } from '../sheets.js'

// ── buildColumnMap ──

describe('buildColumnMap', () => {
  it('maps header names to indices', () => {
    const headers = ['Name', 'Email', 'Role']
    const map = buildColumnMap(headers)
    expect(map['Name']).toBe(0)
    expect(map['Email']).toBe(1)
    expect(map['Role']).toBe(2)
  })

  it('trims whitespace and newlines from headers', () => {
    const headers = ['  Name  ', 'Email\nAddress', 'Role\n']
    const map = buildColumnMap(headers)
    expect(map['Name']).toBe(0)
    expect(map['Email Address']).toBe(1)
    expect(map['Role']).toBe(2)
  })

  it('keeps only the first occurrence of duplicate headers', () => {
    const headers = ['Date', 'Name', 'Date', 'Amount']
    const map = buildColumnMap(headers)
    expect(map['Date']).toBe(0) // first occurrence, NOT 2
    expect(map['Name']).toBe(1)
    expect(map['Amount']).toBe(3)
  })

  it('skips falsy headers', () => {
    const headers = ['Name', '', null, undefined, 'Email']
    const map = buildColumnMap(headers)
    expect(Object.keys(map)).toEqual(['Name', 'Email'])
    expect(map['Name']).toBe(0)
    expect(map['Email']).toBe(4)
  })

  it('returns empty object for empty header row', () => {
    expect(buildColumnMap([])).toEqual({})
  })
})

// ── colLetter ──

describe('colLetter', () => {
  it('converts 0 to A', () => {
    expect(colLetter(0)).toBe('A')
  })

  it('converts 25 to Z', () => {
    expect(colLetter(25)).toBe('Z')
  })

  it('converts 26 to AA', () => {
    expect(colLetter(26)).toBe('AA')
  })

  it('converts 27 to AB', () => {
    expect(colLetter(27)).toBe('AB')
  })

  it('converts 51 to AZ', () => {
    expect(colLetter(51)).toBe('AZ')
  })

  it('converts 52 to BA', () => {
    expect(colLetter(52)).toBe('BA')
  })
})

// ── toBool ──

describe('toBool', () => {
  it('returns false for falsy values', () => {
    expect(toBool(null)).toBe(false)
    expect(toBool(undefined)).toBe(false)
    expect(toBool('')).toBe(false)
    expect(toBool(0)).toBe(false)
    expect(toBool(false)).toBe(false)
  })

  it('returns true for "true" (case-insensitive)', () => {
    expect(toBool('true')).toBe(true)
    expect(toBool('TRUE')).toBe(true)
    expect(toBool('True')).toBe(true)
  })

  it('returns true for "yes"', () => {
    expect(toBool('yes')).toBe(true)
    expect(toBool('YES')).toBe(true)
  })

  it('returns true for "1"', () => {
    expect(toBool('1')).toBe(true)
  })

  it('returns true for "x"', () => {
    expect(toBool('x')).toBe(true)
    expect(toBool('X')).toBe(true)
  })

  it('returns true for checkmark "✓"', () => {
    expect(toBool('✓')).toBe(true)
  })

  it('returns false for arbitrary strings', () => {
    expect(toBool('no')).toBe(false)
    expect(toBool('false')).toBe(false)
    expect(toBool('maybe')).toBe(false)
    expect(toBool('2')).toBe(false)
  })

  it('trims whitespace', () => {
    expect(toBool('  true  ')).toBe(true)
    expect(toBool(' x ')).toBe(true)
  })
})
