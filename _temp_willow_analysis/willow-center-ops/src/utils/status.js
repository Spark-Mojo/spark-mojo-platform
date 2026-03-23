import { daysBetween } from './dates.js'
import { isComplete } from './progress.js'

function isValidDate(val) {
  if (!val || val === 'n/a') return false
  const d = new Date(val)
  return !isNaN(d.getTime())
}

export function deriveStatus(client, config) {
  const threshold = config?.urgent_threshold_days ? Number(config.urgent_threshold_days) : 2
  const incomplete = !isComplete(client)
  const hasValidAppt = isValidDate(client.firstAppt)
  const daysUntil = hasValidAppt ? daysBetween(new Date(), new Date(client.firstAppt)) : -1

  if (client.archiveReason) return 'archived'
  if (client.urgentOverride || !hasValidAppt || (daysUntil <= threshold && incomplete)) return 'urgent'
  if (!client.paperworkComplete) return 'needs-paperwork'
  if (!client.verified && (client.primaryInsurance || '').toLowerCase() !== 'self pay') return 'pending-insurance'
  if (isComplete(client)) return 'ready'
  return 'needs-paperwork'
}
