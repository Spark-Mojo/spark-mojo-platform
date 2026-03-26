import './App.css'
import Pages from "@/pages/index.jsx"
import { Toaster } from "@/components/ui/toaster"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { FrappeProvider } from "frappe-react-sdk"

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
})

function App() {
  return (
    <FrappeProvider
      url={import.meta.env.VITE_FRAPPE_URL || ''}
      socketPort={import.meta.env.VITE_SOCKET_PORT || undefined}
    >
      <QueryClientProvider client={queryClient}>
        <Pages />
        <Toaster />
      </QueryClientProvider>
    </FrappeProvider>
  )
}

export default App 