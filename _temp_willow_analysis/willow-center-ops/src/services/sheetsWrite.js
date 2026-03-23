import {
  sheetsGet, sheetsPut, sheetsAppend, ensureTab,
  buildColumnMap, colLetter, ONBOARDING_SHEET_ID, OUTREACH_LOG_HEADERS,
} from './sheets.js'

// ── Audit Log ──

const AUDIT_LOG_HEADERS = ['Timestamp', 'Staff_Email', 'Action', 'Client_ID', 'Detail']

async function appendAuditLog(token, staffEmail, action, clientId, detail) {
  await ensureTab(token, ONBOARDING_SHEET_ID, 'Audit_Log', AUDIT_LOG_HEADERS)
  await sheetsAppend(token, ONBOARDING_SHEET_ID, 'Audit_Log!A:E', [
    [new Date().toISOString(), staffEmail, action, clientId, detail],
  ])
}

// ── Helpers ──

async function getHeadersAndRows(token, tabName) {
  const data = await sheetsGet(token, ONBOARDING_SHEET_ID, tabName)
  if (!data.values || data.values.length < 1) return { headers: [], rows: [], colMap: {} }
  const [headers, ...rows] = data.values
  return { headers, rows, colMap: buildColumnMap(headers) }
}

// Actual sheet column names (Need to Check tab):
// Col A = "Date"             (date added)
// Col C = "Full Client Name"
// These differ from the internal field names used in client objects.

function findClientRow(rows, clientId) {
  // clientId format: "Full Client Name|Date"
  // Both values stored at fixed column indices: name=2, date=0
  const [name, dateAdded] = clientId.split('|')
  for (let i = 0; i < rows.length; i++) {
    const rowName = (rows[i][2] || '').trim()
    const rowDate = (rows[i][0] || '').trim()
    if (rowName === name && rowDate === dateAdded) {
      return i + 2 // 1-indexed, skip header row
    }
  }
  throw new Error(`Client not found: ${clientId}`)
}

// ── Write: Update Client Field ──
// fieldColIndex: the 0-based column index in the sheet (use fixed indices from sheets.js comments)

const FIELD_TO_COL_INDEX = {
  paperworkComplete:  7,  // Paperwork Completed
  insuranceCard:      8,  // Insurance card uploaded
  verified:          15,  // Verified
  spNoteAdded:       17,  // SP Note Added
  insuranceUpdated:  18,  // Insurance Updated
  gfeSent:            6,  // GFE Sent (Self pay only)
  custodyAgreement:   5,  // Custody Agreement
  staffInitials:      1,  // Initials
  clinician:          3,  // Clinician
  urgentOverride:    null, // new col — fall back to name lookup
  archive_reason:    null,
  archive_date:      null,
  archived_by:       null,
}

export async function updateClientField(token, clientId, field, value, staffEmail) {
  const { rows, colMap } = await getHeadersAndRows(token, 'Need to Check')
  const rowNum = findClientRow(rows, clientId)

  // Use fixed index if known, otherwise look up by column name
  let colIdx = FIELD_TO_COL_INDEX[field]
  if (colIdx === undefined || colIdx === null) {
    colIdx = colMap[field]
  }
  if (colIdx === undefined || colIdx === null) {
    throw new Error(`Column not found: ${field}`)
  }

  const cellRef = `Need to Check!${colLetter(colIdx)}${rowNum}`
  await sheetsPut(token, ONBOARDING_SHEET_ID, cellRef, [[value]])
  await appendAuditLog(token, staffEmail || '', 'update_field', clientId, `${field} = ${value}`)
}

// ── Write: Append Outreach Attempt ──
// Outreach columns at fixed positions (duplicate "Date" headers):
// [19]=date1, [20]=method1, [21]=date2, [22]=method2, ...

const OUTREACH_SLOTS = [
  [19, 20], [21, 22], [23, 24], [25, 26], [27, 28]
]

export async function appendOutreachAttempt(token, clientId, method, context, staffEmail) {
  const { rows } = await getHeadersAndRows(token, 'Need to Check')
  const rowNum = findClientRow(rows, clientId)
  const rowData = rows[rowNum - 2]

  let slotUsed = false
  for (const [dateIdx, methodIdx] of OUTREACH_SLOTS) {
    if (!rowData[dateIdx]) {
      const dateRef = `Need to Check!${colLetter(dateIdx)}${rowNum}`
      const methodRef = `Need to Check!${colLetter(methodIdx)}${rowNum}`
      await sheetsPut(token, ONBOARDING_SHEET_ID, dateRef, [[new Date().toLocaleDateString('en-US')]])
      await sheetsPut(token, ONBOARDING_SHEET_ID, methodRef, [[method]])
      slotUsed = true
      break
    }
  }

  // Attempts 6+ (or if context provided) go to Outreach_Log
  if (!slotUsed || context) {
    await ensureTab(token, ONBOARDING_SHEET_ID, 'Outreach_Log', OUTREACH_LOG_HEADERS)
    await sheetsAppend(token, ONBOARDING_SHEET_ID, 'Outreach_Log!A:E', [
      [new Date().toISOString(), clientId, method, context || '', staffEmail],
    ])
  }

  await appendAuditLog(token, staffEmail, 'outreach_attempt', clientId, `Method: ${method}`)
}

// ── Write: Append Note ──

export async function appendNote(token, clientId, note, staffInitials, staffEmail) {
  const { rows } = await getHeadersAndRows(token, 'Need to Check')
  const rowNum = findClientRow(rows, clientId)
  const rowData = rows[rowNum - 2]
  const notesIdx = 16 // Notes column
  const existing = rowData[notesIdx] || ''
  const timestamp = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  const newEntry = `[${staffInitials}] ${timestamp}: ${note}`
  const updated = existing ? `${existing} | ${newEntry}` : newEntry
  const cellRef = `Need to Check!${colLetter(notesIdx)}${rowNum}`
  await sheetsPut(token, ONBOARDING_SHEET_ID, cellRef, [[updated]])
  await appendAuditLog(token, staffEmail || '', 'add_note', clientId, note.slice(0, 100))
}

// ── Write: Move to Archive ──

export async function moveClientToArchive(token, clientId, reason, staffEmail) {
  const { headers, rows, colMap } = await getHeadersAndRows(token, 'Need to Check')
  const rowIdx = findClientRow(rows, clientId) - 2
  const sheetRowNum = rowIdx + 2

  // Write archive fields if columns exist
  const now = new Date().toISOString()
  if (colMap['archive_reason'] !== undefined)
    await sheetsPut(token, ONBOARDING_SHEET_ID, `Need to Check!${colLetter(colMap['archive_reason'])}${sheetRowNum}`, [[reason]])
  if (colMap['archive_date'] !== undefined)
    await sheetsPut(token, ONBOARDING_SHEET_ID, `Need to Check!${colLetter(colMap['archive_date'])}${sheetRowNum}`, [[now]])
  if (colMap['archived_by'] !== undefined)
    await sheetsPut(token, ONBOARDING_SHEET_ID, `Need to Check!${colLetter(colMap['archived_by'])}${sheetRowNum}`, [[staffEmail]])

  const year = new Date().getFullYear()
  const cancelTab = `Cancellation ${year}`
  await ensureTab(token, ONBOARDING_SHEET_ID, cancelTab, headers)

  const updatedData = await sheetsGet(token, ONBOARDING_SHEET_ID, `Need to Check!A${sheetRowNum}:${colLetter(headers.length - 1)}${sheetRowNum}`)
  const updatedRow = updatedData.values?.[0] || rows[rowIdx]
  await sheetsAppend(token, ONBOARDING_SHEET_ID, `${cancelTab}!A:${colLetter(headers.length - 1)}`, [updatedRow])
  await deleteRow(token, ONBOARDING_SHEET_ID, 'Need to Check', sheetRowNum)
  await appendAuditLog(token, staffEmail, 'archive_client', clientId, `Reason: ${reason}`)
}

// ── Write: Reactivate Client ──

export async function reactivateClient(token, clientId, staffEmail) {
  const year = new Date().getFullYear()
  for (const y of [year, year - 1]) {
    const cancelTab = `Cancellation ${y}`
    try {
      const { headers, rows } = await getHeadersAndRows(token, cancelTab)
      const rowIdx = findClientRow(rows, clientId) - 2
      const rowData = [...rows[rowIdx]]
      const sheetRowNum = rowIdx + 2

      // Clear archive fields by column name if they exist
      const colMap = buildColumnMap(headers)
      if (colMap['archive_reason'] !== undefined) rowData[colMap['archive_reason']] = ''
      if (colMap['archive_date'] !== undefined) rowData[colMap['archive_date']] = ''
      if (colMap['archived_by'] !== undefined) rowData[colMap['archived_by']] = ''

      await sheetsAppend(token, ONBOARDING_SHEET_ID, `Need to Check!A:${colLetter(headers.length - 1)}`, [rowData])
      await deleteRow(token, ONBOARDING_SHEET_ID, cancelTab, sheetRowNum)
      await appendAuditLog(token, staffEmail, 'reactivate_client', clientId, `From ${cancelTab}`)
      return
    } catch {
      continue
    }
  }
  throw new Error(`Archived client not found: ${clientId}`)
}

// ── Write: Move to Completed ──

export async function moveClientToCompleted(token, clientId, staffEmail) {
  const { headers, rows } = await getHeadersAndRows(token, 'Need to Check')
  const rowIdx = findClientRow(rows, clientId) - 2
  const rowData = rows[rowIdx]
  const sheetRowNum = rowIdx + 2

  const year = new Date().getFullYear()
  const completedTab = `Completed ${year}`
  await ensureTab(token, ONBOARDING_SHEET_ID, completedTab, headers)
  await sheetsAppend(token, ONBOARDING_SHEET_ID, `${completedTab}!A:${colLetter(headers.length - 1)}`, [rowData])
  await deleteRow(token, ONBOARDING_SHEET_ID, 'Need to Check', sheetRowNum)
  await appendAuditLog(token, staffEmail || '', 'complete_client', clientId, '')
}

// ── Write: Add Client ──

export async function addClient(token, clientData, staffEmail) {
  const { headers } = await getHeadersAndRows(token, 'Need to Check')
  const colMap = buildColumnMap(headers)
  const newRow = new Array(headers.length).fill('')

  const today = new Date().toLocaleDateString('en-US')

  // Map to actual sheet column names
  const fieldMap = {
    'Full Client Name': clientData.clientName,
    'Clinician': clientData.clinician,
    'First Appt (DATE & TIME)': clientData.firstAppt,
    'Primary Insurance': clientData.primaryInsurance,
    'Date': today,
    'Date of Birth': clientData.dob || '',
    'Member ID(s)': clientData.memberId || '',
    'Employer': clientData.employer || '',
    'Initials': clientData.staffInitials || '',
  }

  for (const [col, val] of Object.entries(fieldMap)) {
    if (colMap[col] !== undefined) newRow[colMap[col]] = val
  }

  await sheetsAppend(token, ONBOARDING_SHEET_ID, `Need to Check!A:${colLetter(headers.length - 1)}`, [newRow])
  const clientId = `${clientData.clientName}|${today}`
  await appendAuditLog(token, staffEmail || '', 'add_client', clientId, clientData.clientName)
}

// ── Write: Staff ──

const STAFF_HEADERS_FULL = ['Name', 'Initials', 'Email', 'Role', 'Status', 'NPI', 'Supervisor', 'Supervisor_NPI', 'Supervision_Notes']

export async function addStaff(token, staffData, staffEmail) {
  await ensureTab(token, ONBOARDING_SHEET_ID, 'Staff', STAFF_HEADERS_FULL)
  await sheetsAppend(token, ONBOARDING_SHEET_ID, 'Staff!A:I', [
    [staffData.name, staffData.initials, staffData.email, staffData.role, 'Active', staffData.npi || '', staffData.supervisor || '', staffData.supervisorNpi || '', staffData.supervisionNotes || ''],
  ])
  await appendAuditLog(token, staffEmail || '', 'add_staff', staffData.initials, staffData.name)
}

export async function updateStaffRecord(token, rowIndex, staffData, staffEmail) {
  if (!rowIndex || rowIndex < 2) throw new Error('Invalid staff row index')
  const row = [
    staffData.name || '',
    staffData.initials || '',
    staffData.email || '',
    staffData.role || '',
    staffData.status || 'Active',
    staffData.npi || '',
    staffData.supervisor || '',
    staffData.supervisorNpi || '',
    staffData.supervisionNotes || '',
  ]
  await sheetsPut(token, ONBOARDING_SHEET_ID, `Staff!A${rowIndex}:I${rowIndex}`, [row])
  await appendAuditLog(token, staffEmail || '', 'update_staff', staffData.initials || staffData.name, `Updated staff record`)
}

export async function deactivateStaff(token, staffInitials, staffEmail) {
  const { rows, colMap } = await getHeadersAndRows(token, 'Staff')
  const initialsIdx = colMap['Initials']
  const statusIdx = colMap['Status']
  for (let i = 0; i < rows.length; i++) {
    if ((rows[i][initialsIdx] || '') === staffInitials) {
      const rowNum = i + 2
      await sheetsPut(token, ONBOARDING_SHEET_ID, `Staff!${colLetter(statusIdx)}${rowNum}`, [['Inactive']])
      await appendAuditLog(token, staffEmail || '', 'deactivate_staff', staffInitials, '')
      return
    }
  }
  throw new Error(`Staff not found: ${staffInitials}`)
}

// ── Write: Config ──

export async function updateConfig(token, key, value, staffEmail) {
  const data = await sheetsGet(token, ONBOARDING_SHEET_ID, 'Config')
  if (data.values) {
    for (let i = 1; i < data.values.length; i++) {
      if (data.values[i][0] === key) {
        await sheetsPut(token, ONBOARDING_SHEET_ID, `Config!B${i + 1}`, [[value]])
        await appendAuditLog(token, staffEmail || '', 'update_config', key, `${key} = ${value}`)
        return
      }
    }
  }
  await sheetsAppend(token, ONBOARDING_SHEET_ID, 'Config!A:C', [[key, value, '']])
  await appendAuditLog(token, staffEmail || '', 'update_config', key, `${key} = ${value}`)
}

// ── Write: Tasks ──

const TASKS_HEADERS = ['Task_ID', 'Type', 'Client_ID', 'Assigned_To', 'Due_Date', 'Status', 'Description', 'Created_At']

export async function createTask(token, taskData, staffEmail) {
  await ensureTab(token, ONBOARDING_SHEET_ID, 'Tasks', TASKS_HEADERS)
  const taskId = `T-${Date.now()}`
  await sheetsAppend(token, ONBOARDING_SHEET_ID, 'Tasks!A:H', [
    [taskId, taskData.type, taskData.clientId || '', taskData.assignedTo, taskData.dueDate || '', 'open', taskData.description, new Date().toISOString()],
  ])
  await appendAuditLog(token, staffEmail || '', 'create_task', taskId, taskData.description)
  return taskId
}

export async function updateTask(token, taskId, field, value, staffEmail) {
  await ensureTab(token, ONBOARDING_SHEET_ID, 'Tasks', TASKS_HEADERS)
  const { rows, colMap } = await getHeadersAndRows(token, 'Tasks')
  const idIdx = colMap['Task_ID']
  const fieldIdx = colMap[field]
  if (fieldIdx === undefined) throw new Error(`Task field not found: ${field}`)
  for (let i = 0; i < rows.length; i++) {
    if ((rows[i][idIdx] || '') === taskId) {
      const rowNum = i + 2
      await sheetsPut(token, ONBOARDING_SHEET_ID, `Tasks!${colLetter(fieldIdx)}${rowNum}`, [[value]])
      await appendAuditLog(token, staffEmail || '', 'update_task', taskId, `${field} = ${value}`)
      return
    }
  }
  throw new Error(`Task not found: ${taskId}`)
}

// ── Write: Bulk Reassign ──

export async function bulkReassignTasks(token, fromInitials, toInitials, staffEmail) {
  await ensureTab(token, ONBOARDING_SHEET_ID, 'Tasks', TASKS_HEADERS)
  const { rows: taskRows, colMap: taskColMap } = await getHeadersAndRows(token, 'Tasks')
  const assignIdx = taskColMap['Assigned_To']
  let taskCount = 0
  for (let i = 0; i < taskRows.length; i++) {
    if ((taskRows[i][assignIdx] || '') === fromInitials) {
      await sheetsPut(token, ONBOARDING_SHEET_ID, `Tasks!${colLetter(assignIdx)}${i + 2}`, [[toInitials]])
      taskCount++
    }
  }

  const { rows: clientRows } = await getHeadersAndRows(token, 'Need to Check')
  let clientCount = 0
  for (let i = 0; i < clientRows.length; i++) {
    if ((clientRows[i][1] || '') === fromInitials) { // Initials = col index 1
      await sheetsPut(token, ONBOARDING_SHEET_ID, `Need to Check!B${i + 2}`, [[toInitials]])
      clientCount++
    }
  }

  await appendAuditLog(token, staffEmail || '', 'bulk_reassign', `${fromInitials}->${toInitials}`, `${taskCount} tasks, ${clientCount} clients`)
  return { taskCount, clientCount }
}

// ── Write: Clinician NPIs ──

const CLINICIAN_NPI_HEADERS = ['Name', 'Individual NPI', 'Supervisor', 'Supervisor NPI', 'Notes']

export async function addClinicianNPI(token, data, staffEmail) {
  await ensureTab(token, ONBOARDING_SHEET_ID, 'Clinician NPIs', CLINICIAN_NPI_HEADERS)
  const row = [data.name || '', data.npi || '', data.supervisor || '', data.supervisorNpi || '', data.supervisionNotes || '']
  await sheetsAppend(token, ONBOARDING_SHEET_ID, 'Clinician NPIs!A:E', [row])
  await appendAuditLog(token, staffEmail || '', 'add_clinician_npi', data.name, `Added clinician NPI record`)
}

export async function updateClinicianNPI(token, rowIndex, data, staffEmail) {
  const row = [data.name || '', data.npi || '', data.supervisor || '', data.supervisorNpi || '', data.supervisionNotes || '']
  await sheetsPut(token, ONBOARDING_SHEET_ID, `Clinician NPIs!A${rowIndex}:E${rowIndex}`, [row])
  await appendAuditLog(token, staffEmail || '', 'update_clinician_npi', data.name, `Updated clinician NPI record`)
}

// ── Delete Row Helper ──

async function deleteRow(token, sheetId, tabName, rowNumber) {
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?fields=sheets.properties`,
    { headers: { Authorization: `Bearer ${token}` } }
  )
  const spreadsheet = await res.json()
  const sheet = spreadsheet.sheets.find(s => s.properties.title === tabName)
  if (!sheet) throw new Error(`Tab not found: ${tabName}`)

  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}:batchUpdate`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requests: [{
          deleteDimension: {
            range: {
              sheetId: sheet.properties.sheetId,
              dimension: 'ROWS',
              startIndex: rowNumber - 1,
              endIndex: rowNumber,
            },
          },
        }],
      }),
    }
  )
}
