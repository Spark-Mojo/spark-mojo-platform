export function daysBetween(a, b) {
  const msPerDay = 1000 * 60 * 60 * 24
  const d1 = new Date(a)
  const d2 = new Date(b)
  return Math.round((d2 - d1) / msPerDay)
}

export function isMinor(dob) {
  if (!dob || dob === 'n/a' || dob === '') return null
  const ageYears = daysBetween(new Date(dob), new Date()) / 365.25
  return ageYears < 18
}

export function daysUntil18(dob) {
  if (!dob || dob === 'n/a' || dob === '') return null
  const birthDate = new Date(dob)
  const eighteenth = new Date(birthDate)
  eighteenth.setFullYear(eighteenth.getFullYear() + 18)
  return daysBetween(new Date(), eighteenth)
}

export function formatApptDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (isNaN(d)) return dateStr
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
