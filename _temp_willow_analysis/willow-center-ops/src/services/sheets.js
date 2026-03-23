const ONBOARDING_SHEET_ID = import.meta.env.VITE_ONBOARDING_SHEET_ID
const BILLING_SHEET_ID = import.meta.env.VITE_BILLING_SHEET_ID

// ── Auth Error ──

export class AuthExpiredError extends Error {
  constructor(msg = 'Session expired — please sign in again') {
    super(msg)
    this.name = 'AuthExpiredError'
  }
}

// ── Helpers ──

function checkAuth(res) {
  if (res.status === 401) throw new AuthExpiredError()
}

async function sheetsGet(token, sheetId, range) {
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}`,
    { headers: { Authorization: `Bearer ${token}` } }
  )
  checkAuth(res)
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error?.message || `Sheets API error ${res.status}`)
  }
  return res.json()
}

async function sheetsPut(token, sheetId, range, values) {
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ values }),
    }
  )
  checkAuth(res)
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error?.message || `Sheets API error ${res.status}`)
  }
  return res.json()
}

async function sheetsAppend(token, sheetId, range, values) {
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ values }),
    }
  )
  checkAuth(res)
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error?.message || `Sheets API error ${res.status}`)
  }
  return res.json()
}

async function getSheetTabs(token, sheetId) {
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?fields=sheets.properties.title`,
    { headers: { Authorization: `Bearer ${token}` } }
  )
  checkAuth(res)
  if (!res.ok) throw new Error('Failed to fetch sheet tabs')
  const data = await res.json()
  return data.sheets.map(s => s.properties.title)
}

async function createTab(token, sheetId, title, headers) {
  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}:batchUpdate`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requests: [{ addSheet: { properties: { title } } }],
      }),
    }
  )
  if (headers?.length) {
    await sheetsPut(token, sheetId, `${title}!A1`, [headers])
  }
}

async function ensureTab(token, sheetId, tabName, headers) {
  try {
    const tabs = await getSheetTabs(token, sheetId)
    if (!tabs.includes(tabName)) {
      await createTab(token, sheetId, tabName, headers)
    }
  } catch (err) {
    console.warn(`[ensureTab] Could not ensure tab "${tabName}":`, err.message)
  }
}

// ── Column mapping ──

function buildColumnMap(headerRow) {
  const map = {}
  headerRow.forEach((h, i) => {
    if (h) {
      // Normalize: trim whitespace and newlines
      const key = String(h).replace(/\n/g, ' ').trim()
      // Only store first occurrence (handles duplicate "Date" headers in outreach columns)
      if (!(key in map)) map[key] = i
    }
  })
  return map
}

function colLetter(index) {
  let s = ''
  let n = index
  while (n >= 0) {
    s = String.fromCharCode(65 + (n % 26)) + s
    n = Math.floor(n / 26) - 1
  }
  return s
}

function toBool(val) {
  if (!val) return false
  const v = String(val).toLowerCase().trim()
  return v === 'true' || v === 'yes' || v === '1' || v === 'x' || v === '✓'
}

// Detect divider/section rows — rows that aren't real clients
function isDividerRow(row) {
  const name = (row[2] || '').trim() // Full Client Name is col C (index 2)
  if (!name) return true
  if (name.startsWith('^^^') || name.startsWith('---')) return true
  return false
}

// ── Read: Onboarding Clients ──
// Actual sheet headers (Need to Check tab):
// [0]  Date
// [1]  Initials
// [2]  Full Client Name
// [3]  Clinician
// [4]  First Appt (DATE & TIME)
// [5]  Custody Agreement
// [6]  GFE Sent (Self pay only)
// [7]  Paperwork Completed
// [8]  Insurance card uploaded
// [9]  Primary Insurance
// [10] Secondary Insurance
// [11] Updated Insurance
// [12] Member ID(s)
// [13] Date of Birth
// [14] Employer
// [15] Verified
// [16] Notes
// [17] SP Note Added
// [18] Insurance Updated
// [19] Date        (outreach attempt 1 date)
// [20] Attempt 1   (outreach attempt 1 method)
// [21] Date        (outreach attempt 2 date)
// [22] Attempt 2   (outreach attempt 2 method)
// [23] Date        (outreach attempt 3 date)
// [24] Attempt 3
// [25] Date        (outreach attempt 4 date)
// [26] Attempt 4
// [27] Date        (outreach attempt 5 date)
// [28] Attempt 5
// [29] Notes       (second notes col — ignored)

function mapRowToClient(row, colMap, rowIndex) {
  const g = (key) => {
    const idx = colMap[key]
    return idx !== undefined ? (row[idx] || '') : ''
  }
  // Direct index access for columns with duplicate header names
  const ri = (idx) => row[idx] || ''

  // Outreach attempts — use fixed positions since "Date" header repeats
  const outreachAttempts = []
  const outreachPositions = [
    [19, 20], [21, 22], [23, 24], [25, 26], [27, 28]
  ]
  for (const [dateIdx, methodIdx] of outreachPositions) {
    const date = ri(dateIdx)
    const method = ri(methodIdx)
    if (date || method) {
      outreachAttempts.push({ date, method })
    }
  }

  return {
    // Composite ID: name + date added
    id: `${ri(2)}|${ri(0)}`,
    rowIndex: rowIndex + 2, // 1-indexed, +1 for header row
    dateAdded: ri(0),
    staffInitials: ri(1),
    clientName: ri(2),
    clinician: ri(3),
    firstAppt: ri(4),
    custodyAgreement: toBool(ri(5)),
    gfeSent: toBool(ri(6)),
    paperworkComplete: toBool(ri(7)),
    insuranceCard: toBool(ri(8)),
    primaryInsurance: g('Primary Insurance') || ri(9),
    secondaryInsurance: g('Secondary Insurance') || ri(10),
    updatedInsurance: g('Updated Insurance') || ri(11),
    memberId: ri(12),
    dob: ri(13),
    employer: ri(14),
    verified: toBool(ri(15)),
    notes: ri(16),
    spNoteAdded: toBool(ri(17)),
    insuranceUpdated: toBool(ri(18)),
    outreachAttempts,
    // New columns (may not exist yet — fall back to empty)
    urgentOverride: toBool(g('urgent_override')),
    archiveReason: g('archive_reason'),
    archiveDate: g('archive_date'),
    archivedBy: g('archived_by'),
    clinicianHistory: g('Clinician_History'),
  }
}

export async function getOnboardingClients(token) {
  const data = await sheetsGet(token, ONBOARDING_SHEET_ID, 'Need to Check')
  if (!data.values || data.values.length < 2) return []
  const [headerRow, ...rows] = data.values
  const colMap = buildColumnMap(headerRow)
  return rows
    .filter(row => !isDividerRow(row))
    .map((row, i) => mapRowToClient(row, colMap, i))
    .filter(c => c.clientName) // extra safety — skip anything still nameless
}

// ── Read: Staff ──

const STAFF_HEADERS = ['Name', 'Initials', 'Email', 'Role', 'Status', 'NPI', 'Supervisor', 'Supervisor_NPI', 'Supervision_Notes']

export async function getStaff(token) {
  await ensureTab(token, ONBOARDING_SHEET_ID, 'Staff', STAFF_HEADERS)
  const data = await sheetsGet(token, ONBOARDING_SHEET_ID, 'Staff')
  if (!data.values || data.values.length < 2) return []
  const [headerRow, ...rows] = data.values
  const colMap = buildColumnMap(headerRow)
  return rows.map((row, i) => ({
    rowIndex: i + 2,
    name: row[colMap['Name']] || '',
    initials: row[colMap['Initials']] || '',
    email: row[colMap['Email']] || '',
    role: row[colMap['Role']] || '',
    status: row[colMap['Status']] || 'Active',
    npi: row[colMap['NPI']] || '',
    supervisor: row[colMap['Supervisor']] || '',
    supervisorNpi: row[colMap['Supervisor_NPI']] || '',
    supervisionNotes: row[colMap['Supervision_Notes']] || '',
  }))
}

// ── Read: Clinician NPIs tab ──

export async function fetchClinicianNPIs(token) {
  try {
    const data = await sheetsGet(token, ONBOARDING_SHEET_ID, 'Clinician NPIs')
    if (!data.values || data.values.length < 2) return []
    const [, ...rows] = data.values
    // FIXED POSITIONAL INDICES — actual tab headers are:
    // [0] Clinician name  [1] Individual NPI  [2] Supervisor name  [3] Supervisor NPI  [4] Notes
    // Header name lookup fails because "Clinician name" != "Clinician", "Name", or "Provider"
    return rows
      .filter(row => row && row.some(cell => cell && String(cell).trim()))
      .map((row, i) => ({
        rowIndex: i + 2, // 1-indexed + header row
        name:             String(row[0] || '').trim(),
        npi:              String(row[1] || '').trim(),
        supervisor:       String(row[2] || '').trim(),
        supervisorNpi:    String(row[3] || '').trim(),
        supervisionNotes: String(row[4] || '').trim(),
      }))
      .filter(r => r.name)
  } catch (err) {
    throw new Error(err.message || 'Failed to fetch Clinician NPIs')
  }
}

// ── Seed Staff from Clinician NPIs ──

export async function seedStaffFromNPIs(token, staffEmail) {
  await ensureTab(token, ONBOARDING_SHEET_ID, 'Staff', STAFF_HEADERS)
  const existingStaff = await getStaff(token)
  if (existingStaff.length > 0) return existingStaff

  const npiData = await fetchClinicianNPIs(token)
  if (npiData.length === 0) return []

  const rows = npiData.map(r => [
    r.name,
    r.name.split(' ').map(w => w[0]?.toUpperCase() || '').join(''), // auto-initials
    '', // email unknown
    'Clinician',
    'Active',
    r.npi,
    r.supervisor,
    r.supervisorNpi,
    r.supervisionNotes,
  ])
  await sheetsAppend(token, ONBOARDING_SHEET_ID, 'Staff!A:I', rows)
  await appendAuditLog(token, staffEmail, 'staff_seeded_from_npis', 'Staff', `Seeded ${rows.length} staff from Clinician NPIs tab`)
  return getStaff(token)
}

// ── Read: Config ──

const CONFIG_HEADERS = ['Key', 'Value', 'Description']
const DEFAULT_CONFIG = {
  outreach_followup_days: { value: '3', description: 'Days between outreach follow-ups' },
  urgent_threshold_days: { value: '2', description: 'Days before appt to mark as urgent' },
  admin_default_assignee: { value: '', description: 'Default staff initials for new clients' },
  age18_warning_days: { value: '90', description: 'Days before 18th birthday to show warning' },
  age18_task_due_days: { value: '30', description: 'Days before 18th birthday for task due date' },
  outreach_methods: { value: 'SP Reminders,Google Text,LVM,EMW,Final Reminder', description: 'Comma-separated outreach method labels' },
}

export async function getConfig(token) {
  await ensureTab(token, ONBOARDING_SHEET_ID, 'Config', CONFIG_HEADERS)
  const data = await sheetsGet(token, ONBOARDING_SHEET_ID, 'Config')

  const config = {}
  for (const [key, def] of Object.entries(DEFAULT_CONFIG)) {
    config[key] = def.value
  }

  if (data.values && data.values.length > 1) {
    const [, ...rows] = data.values
    for (const row of rows) {
      if (row[0]) config[row[0]] = row[1] || ''
    }
  } else {
    const rows = Object.entries(DEFAULT_CONFIG).map(([key, def]) => [key, def.value, def.description])
    await sheetsAppend(token, ONBOARDING_SHEET_ID, 'Config!A:C', rows)
  }

  return config
}

// ── Read: Billing ──

export async function getBillingRows(token) {
  if (!BILLING_SHEET_ID) return []
  const data = await sheetsGet(token, BILLING_SHEET_ID, 'Sheet1')
  if (!data.values || data.values.length < 2) return []
  const [headerRow, ...rows] = data.values
  const colMap = buildColumnMap(headerRow)
  return rows.map(row => {
    const obj = {}
    for (const [key, idx] of Object.entries(colMap)) {
      obj[key] = row[idx] || ''
    }
    return obj
  })
}

/**
 * Fetch billing data from Google Sheets — reads 'unpaid at 350pm' and 'ins unbilled' tabs.
 * Returns { unpaid: { headers, rows }, unbilled: { headers, rows } } in the format
 * expected by parseUnpaidClaims / parseUnbilledClaims from billing.js.
 */
export async function fetchBillingFromSheet(token, sheetId) {
  const billingSheetId = sheetId || BILLING_SHEET_ID
  if (!billingSheetId) throw new Error('No billing sheet ID configured')

  const [unpaidData, unbilledData] = await Promise.all([
    sheetsGet(token, billingSheetId, 'unpaid at 350pm'),
    sheetsGet(token, billingSheetId, 'ins unbilled'),
  ])

  const parseTab = (data) => {
    if (!data.values || data.values.length < 2) return { headers: [], rows: [] }
    const [headers, ...rows] = data.values
    return { headers, rows }
  }

  return {
    unpaid: parseTab(unpaidData),
    unbilled: parseTab(unbilledData),
  }
}

// ── Read: Outreach Log (extended) ──

const OUTREACH_LOG_HEADERS = ['Timestamp', 'Client_ID', 'Method', 'Context', 'Staff_Email']

export async function getOutreachLog(token, clientId) {
  await ensureTab(token, ONBOARDING_SHEET_ID, 'Outreach_Log', OUTREACH_LOG_HEADERS)
  const data = await sheetsGet(token, ONBOARDING_SHEET_ID, 'Outreach_Log')
  if (!data.values || data.values.length < 2) return []
  const [headerRow, ...rows] = data.values
  const colMap = buildColumnMap(headerRow)
  return rows
    .filter(row => !clientId || (row[colMap['Client_ID']] || '') === clientId)
    .map(row => ({
      timestamp: row[colMap['Timestamp']] || '',
      clientId: row[colMap['Client_ID']] || '',
      method: row[colMap['Method']] || '',
      context: row[colMap['Context']] || '',
      staffEmail: row[colMap['Staff_Email']] || '',
    }))
}

// ── Read: Completed / Archived clients ──

export async function getCompletedClients(token, year) {
  const tabName = `Completed ${year}`
  try {
    const data = await sheetsGet(token, ONBOARDING_SHEET_ID, tabName)
    if (!data.values || data.values.length < 2) return []
    const [headerRow, ...rows] = data.values
    const colMap = buildColumnMap(headerRow)
    return rows
      .filter(row => !isDividerRow(row))
      .map((row, i) => ({ ...mapRowToClient(row, colMap, i), _source: 'completed' }))
      .filter(c => c.clientName)
  } catch {
    return []
  }
}

export async function getArchivedClients(token, year) {
  const tabName = `Cancellation ${year}`
  try {
    const data = await sheetsGet(token, ONBOARDING_SHEET_ID, tabName)
    if (!data.values || data.values.length < 2) return []
    const [headerRow, ...rows] = data.values
    const colMap = buildColumnMap(headerRow)
    return rows
      .filter(row => !isDividerRow(row))
      .map((row, i) => ({ ...mapRowToClient(row, colMap, i), _source: 'archived' }))
      .filter(c => c.clientName)
  } catch {
    return []
  }
}

// ── Read: Voicemails (VM tab) ──
// VM tab columns (0-indexed):
// [0] Date, [1] Time, [2] Number, [3] Name, [4] About The Message,
// [5] TYPE, [6] ACTION, [7] Notes, [8] Location, [9] Insurance,
// [10] Task Complete, [11-20] Outreach Date/Method pairs x5,
// [21] Notes (second), [22] FWD, [23] Called Back

function deriveVoicemailStatus(vm) {
  if (vm.taskComplete) return 'Closed'
  if (vm.forwarded) return 'Forwarded to Clinician'
  if (vm.calledBack) return 'Called Back — Reached'
  const action = (vm.action || '').toLowerCase()
  if (action.includes('called back') || action.includes('call back')) return 'Called Back — Reached'
  if (action.includes('left vm') || action.includes('left voicemail')) return 'Called Back — Left VM'
  if (action.includes('text') || action.includes('sent text')) return 'Sent Text'
  if (action.includes('forward') || action.includes('fwd')) return 'Forwarded to Clinician'
  if (action.includes('follow') || action.includes('f/u')) return 'Needs Followup'
  if (action.includes('in progress') || action.includes('working')) return 'In Progress'
  return 'New / Unreviewed'
}

function shiftDateToRecent(dateStr) {
  if (!dateStr) return ''
  const parsed = new Date(dateStr)
  if (isNaN(parsed.getTime())) return dateStr
  const now = new Date()
  // Find day-of-week offset to place within last 7 days
  const dayOfWeek = parsed.getDay()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const todayDow = today.getDay()
  let diff = todayDow - dayOfWeek
  if (diff < 0) diff += 7
  if (diff === 0) diff = 0 // same day of week = today
  const shifted = new Date(today)
  shifted.setDate(shifted.getDate() - diff)
  const m = shifted.getMonth() + 1
  const d = shifted.getDate()
  const y = shifted.getFullYear()
  return `${m}/${d}/${y}`
}

export async function fetchVoicemails(token) {
  let data
  try {
    data = await sheetsGet(token, ONBOARDING_SHEET_ID, 'VM')
  } catch {
    // VM tab may not exist
    return []
  }
  if (!data.values || data.values.length < 2) return []
  const [, ...rows] = data.values // skip header row

  return rows
    .filter(row => {
      const name = (row[3] || '').trim()
      return name && !name.startsWith('^^^') && !name.startsWith('---')
    })
    .map((row, i) => {
      const ri = (idx) => row[idx] || ''

      // Outreach attempts from cols 11-20 (5 pairs)
      const outreachAttempts = []
      for (let p = 0; p < 5; p++) {
        const dateIdx = 11 + p * 2
        const methodIdx = 12 + p * 2
        const date = ri(dateIdx)
        const method = ri(methodIdx)
        if (date || method) {
          outreachAttempts.push({ date, method })
        }
      }

      const originalDate = ri(0)
      const shiftedDate = shiftDateToRecent(originalDate)

      const vm = {
        id: `${(ri(3) || '').trim()}|${originalDate}|${ri(1)}`,
        rowIndex: i + 2, // 1-indexed + header
        date: shiftedDate,
        originalDate,
        time: ri(1),
        number: ri(2),
        name: ri(3).trim(),
        aboutMessage: ri(4),
        type: ri(5),
        action: ri(6),
        notes: ri(7),
        location: ri(8),
        insurance: ri(9),
        taskComplete: toBool(ri(10)),
        outreachAttempts,
        secondNotes: ri(21),
        forwarded: toBool(ri(22)),
        calledBack: toBool(ri(23)),
      }

      vm.status = deriveVoicemailStatus(vm)
      return vm
    })
}

// ── Write: Voicemail status update ──
// Maps status changes back to actual VM tab columns:
// [6] ACTION, [7] Notes, [10] Task Complete, [22] FWD, [23] Called Back
// Outreach attempts: [11-20] Date/Method pairs x5

const AUDIT_LOG_HEADERS = ['Timestamp', 'Staff_Email', 'Action', 'Client_ID', 'Detail']

async function appendAuditLog(token, staffEmail, action, clientId, detail) {
  try {
    await ensureTab(token, ONBOARDING_SHEET_ID, 'Audit_Log', AUDIT_LOG_HEADERS)
    const timestamp = new Date().toISOString()
    await sheetsAppend(token, ONBOARDING_SHEET_ID, 'Audit_Log!A:E', [
      [timestamp, staffEmail, action, clientId, detail],
    ])
  } catch (err) {
    console.warn('[appendAuditLog] Failed:', err.message)
  }
}

export async function updateVoicemailInSheet(token, rowIndex, updates, staffEmail) {
  const tabRange = (col) => `VM!${col}${rowIndex}`

  // Write ACTION column (col G = index 6)
  if (updates.action !== undefined) {
    await sheetsPut(token, ONBOARDING_SHEET_ID, tabRange('G'), [[updates.action]])
  }

  // Write Notes column (col H = index 7)
  if (updates.notes !== undefined) {
    await sheetsPut(token, ONBOARDING_SHEET_ID, tabRange('H'), [[updates.notes]])
  }

  // Write Task Complete (col K = index 10)
  if (updates.taskComplete !== undefined) {
    await sheetsPut(token, ONBOARDING_SHEET_ID, tabRange('K'), [[updates.taskComplete ? 'TRUE' : 'FALSE']])
  }

  // Write FWD (col W = index 22)
  if (updates.forwarded !== undefined) {
    await sheetsPut(token, ONBOARDING_SHEET_ID, tabRange('W'), [[updates.forwarded ? 'TRUE' : 'FALSE']])
  }

  // Write Called Back (col X = index 23)
  if (updates.calledBack !== undefined) {
    await sheetsPut(token, ONBOARDING_SHEET_ID, tabRange('X'), [[updates.calledBack ? 'TRUE' : 'FALSE']])
  }

  // Write outreach attempts (cols L-U = indices 11-20)
  if (updates.outreachAttempts) {
    const row = []
    for (let i = 0; i < 5; i++) {
      const attempt = updates.outreachAttempts[i]
      row.push(attempt?.date || '')
      row.push(attempt?.method || '')
    }
    await sheetsPut(token, ONBOARDING_SHEET_ID, `VM!L${rowIndex}:U${rowIndex}`, [row])
  }

  // Audit log
  const vmId = `VM-row-${rowIndex}`
  const detail = Object.keys(updates).filter(k => k !== 'outreachAttempts').map(k => `${k}=${updates[k]}`).join(', ')
  await appendAuditLog(token, staffEmail, 'voicemail_update', vmId, detail || 'outreach logged')
}

// ── Read/Write: Tasks ──

const TASK_HEADERS = ['ID', 'Title', 'Description', 'Assigned_To', 'Due_Date', 'Priority', 'Category', 'Status', 'Linked_Record', 'Created_By', 'Created_At']

export async function fetchTasks(token) {
  await ensureTab(token, ONBOARDING_SHEET_ID, 'Tasks', TASK_HEADERS)
  const data = await sheetsGet(token, ONBOARDING_SHEET_ID, 'Tasks')
  if (!data.values || data.values.length < 2) return []
  const [headerRow, ...rows] = data.values
  const colMap = buildColumnMap(headerRow)
  return rows
    .filter(row => row[colMap['ID']])
    .map((row, i) => ({
      id: row[colMap['ID']] || '',
      rowIndex: i + 2,
      title: row[colMap['Title']] || '',
      description: row[colMap['Description']] || '',
      assignedTo: row[colMap['Assigned_To']] || '',
      dueDate: row[colMap['Due_Date']] || '',
      priority: row[colMap['Priority']] || 'Medium',
      category: row[colMap['Category']] || 'General',
      status: row[colMap['Status']] || 'To Do',
      linkedRecord: row[colMap['Linked_Record']] || '',
      createdBy: row[colMap['Created_By']] || '',
      createdAt: row[colMap['Created_At']] || '',
    }))
}

export async function createTask(token, task, staffEmail) {
  await ensureTab(token, ONBOARDING_SHEET_ID, 'Tasks', TASK_HEADERS)
  const id = `TASK-${Date.now()}`
  const createdAt = new Date().toISOString()
  const row = [
    id,
    task.title || '',
    task.description || '',
    task.assignedTo || '',
    task.dueDate || '',
    task.priority || 'Medium',
    task.category || 'General',
    task.status || 'To Do',
    task.linkedRecord || '',
    staffEmail || '',
    createdAt,
  ]
  await sheetsAppend(token, ONBOARDING_SHEET_ID, 'Tasks!A:K', [row])
  await appendAuditLog(token, staffEmail, 'task_created', id, task.title)
  return { ...task, id, createdBy: staffEmail, createdAt, rowIndex: -1 }
}

export async function updateTaskInSheet(token, task, staffEmail) {
  if (!task.rowIndex || task.rowIndex < 2) return
  const row = [
    task.id,
    task.title || '',
    task.description || '',
    task.assignedTo || '',
    task.dueDate || '',
    task.priority || 'Medium',
    task.category || 'General',
    task.status || 'To Do',
    task.linkedRecord || '',
    task.createdBy || '',
    task.createdAt || '',
  ]
  await sheetsPut(token, ONBOARDING_SHEET_ID, `Tasks!A${task.rowIndex}:K${task.rowIndex}`, [row])
  await appendAuditLog(token, staffEmail, 'task_updated', task.id, `status=${task.status}`)
}

// ── Seed Tasks (in-memory only — no sheet writes) ──

const SEED_TASKS = [
  { title: 'Define unified balance threshold across all service lines', assignedTo: 'Erin', category: 'Billing', description: 'Need a standard dollar threshold for when client balances trigger collection outreach across all service lines.' },
  { title: 'Clarify deductible billing decision logic — who pays what, when', assignedTo: 'Erin + Kate', category: 'Billing', description: 'Handle deductible-phase billing correctly — client owes full rate until deductible is met, then copay/coinsurance. Document the decision tree.' },
  { title: 'Define write-off authorization criteria and approval chain', assignedTo: 'Erin', category: 'Billing', description: 'Write-offs above a threshold need manager authorization. Define criteria, threshold, and the approval workflow.' },
  { title: 'Confirm secondary insurance audit scope and assign owner', assignedTo: 'Erin + Lisa', category: 'Claims', description: 'Audit all clients for secondary insurance coverage that may be billable. Many secondaries are going unbilled. Assign owner and define scope.' },
  { title: "Resolve Sarah's clearinghouse access — is this an ESI contract issue?", assignedTo: 'Erin + Sarah', category: 'Operations', description: 'Sarah needs direct clearinghouse portal access to check real-time claim status. Determine if this is blocked by the ESI contract.' },
  { title: 'Define supervisor co-sign SLA — 48 hours non-negotiable?', assignedTo: 'Lisa', category: 'Clinical', description: 'Supervisors must co-sign notes within 48 hours. Confirm this SLA is firm and define enforcement mechanism.' },
  { title: 'Configure SimplePractice inquiry form — 15-minute fix, assign owner', assignedTo: 'Sarah', category: 'Operations', description: 'SP contact form needs configuration so new inquiries flow into the onboarding queue. Quick fix — just needs an owner.' },
  { title: 'Clarify FMLA billing — patient-pay, not insurance', assignedTo: 'Julia / Erin', category: 'Billing', description: 'FMLA-related sessions are patient-pay, not insurance-billable. Document this rule and ensure billing workflow reflects it.' },
  { title: 'Confirm Google Workspace BAA scope — which services are covered', assignedTo: 'Erin', category: 'Compliance', description: 'Verify which Google Workspace services are covered under the BAA for PHI handling. Document covered vs. not covered.' },
  { title: 'Define Julia transition timeline and billing handoff plan', assignedTo: 'Erin', category: 'Operations', description: "Julia's role is transitioning. Define the timeline and plan for handing off billing responsibilities." },
  { title: 'Discovery: custody agreement workflow — documents, custody types, who reviews', assignedTo: 'Lisa', category: 'Clinical', description: 'Clarify custody agreement requirements — when is it needed, what document types are acceptable, who reviews and approves.' },
  { title: 'Discovery: age-18 transition — which documents require re-execution at 18', assignedTo: 'Lisa', category: 'Clinical', description: 'When a minor client turns 18, which consent and authorization documents need to be re-signed? Document the full list.' },
]

const CATEGORY_DEFAULT_STATUS = {
  Billing: 'Unbilled',
  Claims: 'Unbilled',
  Voicemail: 'New',
  Onboarding: 'Urgent',
  General: 'To Do',
  Operations: 'To Do',
  Clinical: 'To Do',
  Compliance: 'To Do',
}

export function getSeedTasks() {
  const createdAt = new Date().toISOString()
  return SEED_TASKS.map((t, i) => ({
    id: `SEED-${i + 1}`,
    rowIndex: -1,
    title: t.title,
    description: t.description,
    assignedTo: t.assignedTo || '',
    dueDate: '',
    priority: 'High',
    category: t.category,
    status: CATEGORY_DEFAULT_STATUS[t.category] || 'To Do',
    linkedRecord: '',
    createdBy: 'system',
    createdAt,
  }))
}

// ── Exports used by write functions ──
export {
  sheetsGet, sheetsPut, sheetsAppend, ensureTab, createTab,
  getSheetTabs, buildColumnMap, colLetter, toBool,
  ONBOARDING_SHEET_ID, BILLING_SHEET_ID,
  STAFF_HEADERS, CONFIG_HEADERS, OUTREACH_LOG_HEADERS, TASK_HEADERS,
}
