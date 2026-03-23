import { useEffect, useState } from 'react'
import { useGoogleLogin } from '@react-oauth/google'

// Pre-compute random leaf particle values outside render
const LEAF_PARTICLES = Array.from({ length: 12 }, () => ({
  size: 6 + Math.random() * 8,
  opacity: 0.15 + Math.random() * 0.25,
  left: 45 + Math.random() * 10,
  top: 40 + Math.random() * 10,
  duration: 2 + Math.random() * 3,
}))

export default function LoginPage({ onLogin }) {
  const [animStage, setAnimStage] = useState(0) // 0=hidden, 1=logo, 2=name, 3=button

  useEffect(() => {
    const t1 = setTimeout(() => setAnimStage(1), 100)
    const t2 = setTimeout(() => setAnimStage(2), 800)
    const t3 = setTimeout(() => setAnimStage(3), 1200)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [])

  const login = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
        })
        const userInfo = await res.json()

        // Domain + email allowlist
        // VITE_ALLOWED_DOMAINS = comma-separated Google Workspace domains (e.g. "sparkmojo.com,willowcenter.com")
        // VITE_ALLOWED_EMAILS  = comma-separated specific emails for personal Gmail accounts
        // If neither is set, login is open to anyone with a Google account.
        const allowedDomains = (import.meta.env.VITE_ALLOWED_DOMAINS || import.meta.env.VITE_ALLOWED_DOMAIN || '')
          .split(',').map(d => d.trim()).filter(Boolean)
        const allowedEmails = (import.meta.env.VITE_ALLOWED_EMAILS || '')
          .split(',').map(e => e.trim().toLowerCase()).filter(Boolean)

        if (allowedDomains.length > 0 || allowedEmails.length > 0) {
          const domainOk = allowedDomains.length > 0 && allowedDomains.includes(userInfo.hd)
          const emailOk  = allowedEmails.length > 0 && allowedEmails.includes((userInfo.email || '').toLowerCase())
          if (!domainOk && !emailOk) {
            onLogin(null, 'Your account doesn\'t have access. Contact your administrator.')
            return
          }
        }

        onLogin({
          name: userInfo.name,
          email: userInfo.email,
          picture: userInfo.picture,
          accessToken: tokenResponse.access_token,
        })
      } catch {
        onLogin(null, 'Failed to verify account')
      }
    },
    onError: () => onLogin(null, 'Google login failed'),
    scope: 'https://www.googleapis.com/auth/spreadsheets',
  })

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden"
      style={{ background: '#161D2E' }}
    >
      {/* Leaf particles */}
      <div className="absolute inset-0 pointer-events-none">
        {animStage >= 1 && LEAF_PARTICLES.map((p, i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              width: p.size,
              height: p.size,
              backgroundColor: `rgba(42, 122, 101, ${p.opacity})`,
              left: `${p.left}%`,
              top: `${p.top}%`,
              animation: `leafFloat${i % 4} ${p.duration}s ease-out forwards`,
            }}
          />
        ))}
      </div>

      {/* Logo */}
      <div
        className="transition-all duration-700 ease-out"
        style={{
          opacity: animStage >= 1 ? 1 : 0,
          transform: animStage >= 1 ? 'scale(1)' : 'scale(0.8)',
        }}
      >
        <img
          src="/assets/willow-center-logo.png"
          alt="Willow Center"
          className="h-32 mx-auto"
        />
      </div>

      {/* App name */}
      <h1
        className="text-3xl font-semibold mt-4 transition-all duration-500 ease-out"
        style={{
          color: '#FFFFFF',
          opacity: animStage >= 2 ? 1 : 0,
          transform: animStage >= 2 ? 'translateY(0)' : 'translateY(12px)',
        }}
      >
        Willow Ops
      </h1>

      {/* Sign in button */}
      <button
        onClick={() => login()}
        className="mt-8 flex items-center gap-3 px-6 py-3 rounded-lg text-sm font-medium shadow-md transition-all duration-300"
        style={{
          backgroundColor: '#FFFFFF',
          color: '#1A1A1A',
          border: '1px solid #E4E1D8',
          opacity: animStage >= 3 ? 1 : 0,
          transform: animStage >= 3 ? 'translateY(0)' : 'translateY(8px)',
        }}
      >
        <svg width="18" height="18" viewBox="0 0 18 18">
          <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
          <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z"/>
          <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.997 8.997 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
          <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 6.29C4.672 4.163 6.656 2.58 9 3.58z"/>
        </svg>
        Sign in with Google
      </button>

      <style>{`
        @keyframes leafFloat0 { to { transform: translate(-80px, -120px) rotate(45deg); opacity: 0; } }
        @keyframes leafFloat1 { to { transform: translate(90px, -100px) rotate(-30deg); opacity: 0; } }
        @keyframes leafFloat2 { to { transform: translate(-60px, 80px) rotate(60deg); opacity: 0; } }
        @keyframes leafFloat3 { to { transform: translate(70px, 90px) rotate(-45deg); opacity: 0; } }
      `}</style>
    </div>
  )
}
