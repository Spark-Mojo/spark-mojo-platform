import { useState, useRef, useMemo, useEffect, useCallback } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { ToastContext } from './hooks/useToast'
import { useSheets } from './hooks/useSheets'
import { AuthContext, useAuth } from './contexts/auth'
import { BillingDataProvider } from './contexts/billing.jsx'
import LoginPage from './components/LoginPage'
import Sidebar from './components/shell/Sidebar'
import TopBar from './components/shell/TopBar'
import Toast from './components/shell/Toast'
import QueueView from './components/onboarding/QueueView'
import ClientDrawer from './components/onboarding/ClientDrawer'
import AddClientModal from './components/onboarding/AddClientModal'
import HistoricalView from './components/onboarding/HistoricalView'
import KanbanView from './components/onboarding/KanbanView'
import ManageStaff from './components/admin/ManageStaff'
import ReassignTasks from './components/admin/ReassignTasks'
import AutomationConfig from './components/admin/AutomationConfig'
import SpreadsheetUpload from './components/admin/SpreadsheetUpload'
import HomeDashboard from './components/dashboard/HomeDashboard'
import ARDashboard from './components/billing/ARDashboard'
import UnbilledWorklist from './components/billing/UnbilledWorklist'
import ClientBalanceWorklist from './components/billing/ClientBalanceWorklist'
import VoicemailView from './components/voicemail/VoicemailView'
import OnboardingReports from './components/reports/OnboardingReports'
import BillingReports from './components/reports/BillingReports'
import TaskBoard from './components/tasks/TaskBoard'
import StaffRegistry from './components/staff/StaffRegistry'

function OnboardingModule({ clients, config, staff, accessToken, user, refresh, setClients, activeView, searchQuery, addClientRef }) {
  const [selectedClientId, setSelectedClientId] = useState(null)
  const [showAddClient, setShowAddClient] = useState(false)
  const [showHistorical, setShowHistorical] = useState(false)
  const [historicalClient, setHistoricalClient] = useState(null)

  // Expose addClient trigger to parent via ref
  useEffect(() => {
    addClientRef.current = () => setShowAddClient(true)
    return () => { addClientRef.current = null }
  }, [addClientRef])

  const selectedClient = useMemo(
    () => selectedClientId ? clients.find(c => c.id === selectedClientId) || null : null,
    [clients, selectedClientId]
  )

  const refreshKeepDrawer = useCallback(() => refresh(), [refresh])

  const handleClientFieldUpdate = useCallback((clientId, field, value) => {
    setClients(prev => prev.map(c =>
      c.id === clientId ? { ...c, [field]: value } : c
    ))
  }, [setClients])

  return (
    <>
      <main className="flex-1 p-6">
        {activeView === 'Queue' && !showHistorical && (
          <>
            <div className="flex justify-end mb-2">
              <button
                onClick={() => setShowHistorical(true)}
                className="text-xs font-medium px-3 py-1.5 rounded-lg"
                style={{ color: 'var(--accent)', backgroundColor: 'var(--accent-light)' }}
              >
                View Historical
              </button>
            </div>
            <QueueView
              clients={clients}
              config={config}
              searchQuery={searchQuery}
              onClientClick={(client) => setSelectedClientId(client.id)}
              accessToken={accessToken}
              userEmail={user.email}
              onRefresh={refresh}
            />
          </>
        )}
        {activeView === 'Queue' && showHistorical && (
          <HistoricalView
            accessToken={accessToken}
            config={config}
            userEmail={user.email}
            onBack={() => setShowHistorical(false)}
            onRefresh={refresh}
            onClientClick={(client) => setHistoricalClient(client)}
          />
        )}
        {activeView === 'Kanban' && (
          <KanbanView
            clients={clients}
            config={config}
            accessToken={accessToken}
            userEmail={user.email}
            onClientClick={(client) => setSelectedClientId(client.id)}
            onRefresh={refresh}
          />
        )}
      </main>

      {showAddClient && (
        <AddClientModal
          staff={staff}
          clients={clients}
          accessToken={accessToken}
          userEmail={user.email}
          onClose={() => setShowAddClient(false)}
          onSaved={refresh}
        />
      )}

      {selectedClient && (
        <ClientDrawer
          client={selectedClient}
          config={config}
          staff={staff}
          clients={clients}
          onClose={() => setSelectedClientId(null)}
          onUpdate={refreshKeepDrawer}
          onFieldUpdate={handleClientFieldUpdate}
          accessToken={accessToken}
          userEmail={user.email}
        />
      )}

      {historicalClient && (
        <ClientDrawer
          client={historicalClient}
          config={config}
          staff={staff}
          onClose={() => setHistoricalClient(null)}
          accessToken={accessToken}
          userEmail={user.email}
          readOnly
        />
      )}
    </>
  )
}

function AppShell() {
  const { user, logout, accessToken } = useAuth()
  const { clients, setClients, staff, setStaff, config, voicemails, setVoicemails, tasks, setTasks, loading, error: sheetsError, refresh, authExpired } = useSheets(accessToken)
  const location = useLocation()

  // Onboarding view state lifted here so TopBar can control it
  const [activeView, setActiveView] = useState('Queue')
  const [searchQuery, setSearchQuery] = useState('')
  const addClientRef = useRef(null)

  useEffect(() => {
    if (authExpired) logout()
  }, [authExpired, logout])

  const sidebarUser = {
    name: user.name,
    email: user.email,
    role: 'Staff',
    onLogout: logout,
  }

  const TERMINAL_STATUSES = new Set(['Done', 'Resolved', 'Closed', 'Ready', 'Written Off'])
  const myTaskCount = tasks.filter(t => !TERMINAL_STATUSES.has(t.status) && t.assignedTo === user.email).length
  const isOnboarding = location.pathname === '/onboarding'

  const onboardingProps = isOnboarding ? {
    activeView,
    setActiveView,
    searchQuery,
    setSearchQuery,
    onAddClient: () => addClientRef.current?.(),
  } : null

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--bg)' }}>
      <Sidebar
        clientCount={clients.length}
        user={sidebarUser}
      />
      <div className="flex-1 flex flex-col">
        <TopBar taskCount={myTaskCount} onboarding={onboardingProps} />
        {sheetsError && (
          <div className="mx-6 mt-4 px-4 py-3 rounded-lg text-sm" style={{ backgroundColor: '#FCEAEA', color: '#A32D2D', border: '1px solid #E24B4A' }}>
            <strong>Error:</strong> {sheetsError}
          </div>
        )}
        {isOnboarding && loading && (
          <div className="text-center py-20" style={{ color: 'var(--muted)' }}>Loading...</div>
        )}
        <Routes>
          <Route path="/" element={<HomeDashboard clients={clients} config={config} voicemails={voicemails} />} />
          <Route
            path="/onboarding"
            element={
              !loading ? (
                <OnboardingModule
                  clients={clients}
                  config={config}
                  staff={staff}
                  accessToken={accessToken}
                  user={user}
                  refresh={refresh}
                  setClients={setClients}
                  activeView={activeView}
                  searchQuery={searchQuery}
                  addClientRef={addClientRef}
                />
              ) : null
            }
          />
          <Route path="/billing" element={<ARDashboard />} />
          <Route path="/billing/unbilled" element={<UnbilledWorklist />} />
          <Route path="/billing/collections" element={<ClientBalanceWorklist />} />
          <Route path="/voicemail" element={<VoicemailView voicemails={voicemails} accessToken={accessToken} userEmail={user.email} staff={staff} setVoicemails={setVoicemails} />} />
          <Route path="/staff" element={<StaffRegistry />} />
          <Route path="/reports/onboarding" element={<OnboardingReports accessToken={accessToken} clients={clients} />} />
          <Route path="/reports/billing" element={<BillingReports />} />
          <Route path="/tasks" element={<TaskBoard tasks={tasks} setTasks={setTasks} staff={staff} userEmail={user.email} />} />
          <Route
            path="/admin/staff"
            element={<ManageStaff accessToken={accessToken} userEmail={user.email} onRefresh={refresh} staff={staff} setStaff={setStaff} />}
          />
          <Route
            path="/admin/reassign"
            element={<ReassignTasks accessToken={accessToken} userEmail={user.email} onRefresh={refresh} />}
          />
          <Route
            path="/admin/config"
            element={
              <main className="flex-1 p-6 space-y-8">
                <AutomationConfig accessToken={accessToken} userEmail={user.email} onRefresh={refresh} />
                <div className="max-w-lg">
                  <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--text)' }}>Spreadsheet Upload</h2>
                  <SpreadsheetUpload />
                </div>
              </main>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </div>
  )
}

const AUTH_STORAGE_KEY = 'willow_ops_auth'

function loadSavedAuth() {
  try {
    const saved = localStorage.getItem(AUTH_STORAGE_KEY)
    return saved ? JSON.parse(saved) : null
  } catch {
    return null
  }
}

function App() {
  const [user, setUser] = useState(loadSavedAuth)
  const [toasts, setToasts] = useState([])

  const toast = useMemo(() => ({
    success: (msg) => {
      const id = Date.now()
      setToasts(prev => [...prev, { id, message: msg, type: 'success' }])
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000)
    },
    error: (msg) => {
      const id = Date.now()
      setToasts(prev => [...prev, { id, message: msg, type: 'error' }])
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000)
    },
  }), [])

  const handleLogin = (userData, error) => {
    if (error) {
      toast.error(error)
      return
    }
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(userData))
    setUser(userData)
  }

  const logout = () => {
    localStorage.removeItem(AUTH_STORAGE_KEY)
    setUser(null)
  }

  const authValue = useMemo(() => ({
    user, logout, accessToken: user?.accessToken
  }), [user])

  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''

  return (
    <GoogleOAuthProvider clientId={clientId}>
      <ToastContext.Provider value={{ toasts, toast }}>
        <AuthContext.Provider value={authValue}>
          <BillingDataProvider>
            <BrowserRouter>
              {user ? <AppShell /> : <LoginPage onLogin={handleLogin} />}
            </BrowserRouter>
          </BillingDataProvider>
        </AuthContext.Provider>
        <Toast />
      </ToastContext.Provider>
    </GoogleOAuthProvider>
  )
}

export default App
