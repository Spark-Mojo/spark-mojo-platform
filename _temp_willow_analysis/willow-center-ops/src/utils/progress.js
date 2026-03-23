import { isMinor } from './dates.js'

export function calcProgress(client) {
  const isSelfPay = (client.primaryInsurance || '').toLowerCase() === 'self pay'
  const minor = isMinor(client.dob)
  const showCustody = minor === true || !!client.custodyAgreement

  const requiredItems = []
  const completedItems = []

  // 1. Paperwork completed — always required
  requiredItems.push('Paperwork completed')
  if (client.paperworkComplete) completedItems.push('Paperwork completed')

  // 2. Insurance card uploaded — not self-pay
  if (!isSelfPay) {
    requiredItems.push('Insurance card uploaded')
    if (client.insuranceCard) completedItems.push('Insurance card uploaded')
  }

  // 3. Insurance verified — not self-pay
  if (!isSelfPay) {
    requiredItems.push('Insurance verified')
    if (client.verified) completedItems.push('Insurance verified')
  }

  // 4. Custody agreement — minor or custody field present
  if (showCustody) {
    requiredItems.push('Custody agreement')
    if (client.custodyAgreement) completedItems.push('Custody agreement')
  }

  // 5. GFE sent — self-pay only
  if (isSelfPay) {
    requiredItems.push('Good Faith Estimate sent')
    if (client.gfeSent) completedItems.push('Good Faith Estimate sent')
  }

  // 6. SP note added — always required
  requiredItems.push('SP note added')
  if (client.spNoteAdded) completedItems.push('SP note added')

  // 7. Insurance updated in SP — always shown but optional (not in required count)

  const pct = requiredItems.length > 0
    ? Math.round((completedItems.length / requiredItems.length) * 100)
    : 100

  return { pct, requiredItems, completedItems }
}

export function isComplete(client) {
  const { pct } = calcProgress(client)
  return pct === 100
}
