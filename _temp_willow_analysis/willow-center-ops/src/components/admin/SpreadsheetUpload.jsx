import { useState, useContext, useRef } from 'react'
import { Upload, FileSpreadsheet, CheckCircle, AlertTriangle, X } from 'lucide-react'
import { read, utils } from 'xlsx'
import { ToastContext } from '../../hooks/useToast'
import { useBillingData } from '../../hooks/useBillingData'
import { parseUnpaidClaims, parseUnbilledClaims } from '../../services/billing'

const BILLING_REQUIRED_TABS = ['unpaid at 350pm', 'ins unbilled']
const ONBOARDING_REQUIRED_TABS = ['Need to Check']

function parseFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const workbook = read(e.target.result, { type: 'array' })
        resolve(workbook)
      } catch (err) {
        reject(new Error(`Failed to parse file: ${err.message}`))
      }
    }
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsArrayBuffer(file)
  })
}

function validateBillingWorkbook(workbook) {
  const errors = []
  const tabNames = workbook.SheetNames.map(n => n.toLowerCase().trim())

  for (const required of BILLING_REQUIRED_TABS) {
    if (!tabNames.includes(required.toLowerCase())) {
      errors.push(`Missing required tab: "${required}"`)
    }
  }
  return errors
}

function validateOnboardingWorkbook(workbook) {
  const errors = []
  const tabNames = workbook.SheetNames.map(n => n.toLowerCase().trim())

  for (const required of ONBOARDING_REQUIRED_TABS) {
    if (!tabNames.includes(required.toLowerCase())) {
      errors.push(`Missing required tab: "${required}"`)
    }
  }
  return errors
}

function getSheetRowCount(workbook, tabName) {
  const match = workbook.SheetNames.find(n => n.toLowerCase().trim() === tabName.toLowerCase())
  if (!match) return 0
  const sheet = workbook.Sheets[match]
  const data = utils.sheet_to_json(sheet, { header: 1 })
  // Subtract header row, filter empty rows
  return data.slice(1).filter(row => row.some(cell => cell !== undefined && cell !== '')).length
}

function getSheetData(workbook, tabName) {
  const match = workbook.SheetNames.find(n => n.toLowerCase().trim() === tabName.toLowerCase())
  if (!match) return []
  const sheet = workbook.Sheets[match]
  return utils.sheet_to_json(sheet, { header: 1 })
}

function UploadZone({ label, description, accept, onFileSelect, uploadInfo, errors }) {
  const inputRef = useRef(null)
  const [dragOver, setDragOver] = useState(false)

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) onFileSelect(file)
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    setDragOver(true)
  }

  return (
    <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
      <h3 className="text-xs font-medium uppercase tracking-wider mb-3" style={{ color: 'var(--muted)' }}>
        {label}
      </h3>
      <p className="text-sm mb-3" style={{ color: 'var(--muted)' }}>{description}</p>

      {errors && errors.length > 0 && (
        <div className="mb-3 p-3 rounded-lg" style={{ backgroundColor: '#FCEAEA', border: '1px solid #E24B4A' }}>
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle size={14} style={{ color: '#A32D2D' }} />
            <span className="text-xs font-medium" style={{ color: '#A32D2D' }}>Validation Errors</span>
          </div>
          {errors.map((err, i) => (
            <p key={i} className="text-xs ml-5" style={{ color: '#A32D2D' }}>{err}</p>
          ))}
        </div>
      )}

      {uploadInfo ? (
        <div className="flex items-center gap-3 p-3 rounded-lg" style={{ backgroundColor: 'var(--accent-light)' }}>
          <CheckCircle size={18} style={{ color: 'var(--accent)' }} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>{uploadInfo.fileName}</p>
            <p className="text-xs" style={{ color: 'var(--muted)', fontFamily: "'IBM Plex Mono', monospace" }}>
              {uploadInfo.rowCount} rows · Uploaded {new Date(uploadInfo.timestamp).toLocaleString()}
            </p>
          </div>
          <button
            onClick={() => inputRef.current?.click()}
            className="text-xs px-3 py-1.5 rounded-lg font-medium"
            style={{ color: 'var(--accent)', backgroundColor: 'var(--surface)' }}
          >
            Replace
          </button>
        </div>
      ) : (
        <div
          onClick={() => inputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={() => setDragOver(false)}
          className="flex flex-col items-center justify-center gap-2 p-6 rounded-lg border-2 border-dashed cursor-pointer transition-colors"
          style={{
            borderColor: dragOver ? 'var(--accent)' : 'var(--border)',
            backgroundColor: dragOver ? 'var(--accent-light)' : 'transparent',
          }}
        >
          <Upload size={24} style={{ color: 'var(--muted)' }} />
          <p className="text-sm" style={{ color: 'var(--muted)' }}>
            Drop an .xlsx file here or <span style={{ color: 'var(--accent)' }} className="font-medium">browse</span>
          </p>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={accept || '.xlsx,.xls'}
        onChange={(e) => {
          const file = e.target.files[0]
          if (file) onFileSelect(file)
          e.target.value = ''
        }}
        className="hidden"
      />
    </div>
  )
}

export default function SpreadsheetUpload() {
  const ctx = useContext(ToastContext)
  const toast = ctx?.toast
  const billingCtx = useBillingData()

  const [billingUpload, setBillingUpload] = useState(null)
  const [billingErrors, setBillingErrors] = useState(null)
  const [onboardingUpload, setOnboardingUpload] = useState(null)
  const [onboardingErrors, setOnboardingErrors] = useState(null)

  const handleBillingFile = async (file) => {
    setBillingErrors(null)
    try {
      const workbook = await parseFile(file)
      const errors = validateBillingWorkbook(workbook)
      if (errors.length > 0) {
        setBillingErrors(errors)
        toast?.error('Billing file validation failed')
        return
      }

      const unpaidData = getSheetData(workbook, 'unpaid at 350pm')
      const unbilledData = getSheetData(workbook, 'ins unbilled')
      const unpaidRows = unpaidData.slice(1).filter(row => row.some(cell => cell !== undefined && cell !== ''))
      const unbilledRows = unbilledData.slice(1).filter(row => row.some(cell => cell !== undefined && cell !== ''))

      // Parse raw rows into structured claim objects
      const parsedUnpaid = parseUnpaidClaims({ headers: unpaidData[0] || [], rows: unpaidRows })
      const parsedUnbilled = parseUnbilledClaims({ headers: unbilledData[0] || [], rows: unbilledRows })

      const totalRows = parsedUnpaid.length + parsedUnbilled.length
      const info = { fileName: file.name, rowCount: totalRows, timestamp: new Date().toISOString() }
      setBillingUpload(info)

      billingCtx?.loadBillingData(parsedUnpaid, parsedUnbilled, file.name)

      toast?.success(`Billing data loaded — ${parsedUnpaid.length} unpaid claims, ${parsedUnbilled.length} unbilled claims`)
    } catch (err) {
      setBillingErrors([err.message])
      toast?.error(err.message)
    }
  }

  const handleOnboardingFile = async (file) => {
    setOnboardingErrors(null)
    try {
      const workbook = await parseFile(file)
      const errors = validateOnboardingWorkbook(workbook)
      if (errors.length > 0) {
        setOnboardingErrors(errors)
        toast?.error('Onboarding file validation failed')
        return
      }

      const rowCount = getSheetRowCount(workbook, 'Need to Check')
      const info = { fileName: file.name, rowCount, timestamp: new Date().toISOString() }
      setOnboardingUpload(info)
      billingCtx?.loadOnboardingUpload(info)
      toast?.success(`Onboarding data loaded — ${rowCount} clients in Need to Check`)
    } catch (err) {
      setOnboardingErrors([err.message])
      toast?.error(err.message)
    }
  }

  return (
    <div className="space-y-4">
      <UploadZone
        label="Onboarding Spreadsheet"
        description="Upload the onboarding .xlsx file. Must contain a 'Need to Check' tab."
        onFileSelect={handleOnboardingFile}
        uploadInfo={onboardingUpload}
        errors={onboardingErrors}
      />
      <UploadZone
        label="Billing Spreadsheet"
        description="Upload the billing .xlsx file. Must contain 'unpaid at 350pm' and 'ins unbilled' tabs."
        onFileSelect={handleBillingFile}
        uploadInfo={billingUpload}
        errors={billingErrors}
      />
    </div>
  )
}
