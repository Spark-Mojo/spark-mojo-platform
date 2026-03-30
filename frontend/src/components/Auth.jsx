// src/auth/AuthGate.jsx
import React from "react";
import { User as UserEntity } from "@/api/entities";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Briefcase, AlertTriangle, Loader2 } from "lucide-react";

export const AuthContext = React.createContext(null);
export const useAuth = () => React.useContext(AuthContext);

export default function AuthGate({ children }) {
  const [user, setUser] = React.useState(null);
  const [isCheckingAuth, setIsCheckingAuth] = React.useState(true);

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState(null);
  const [isLoading, setIsLoading] = React.useState(false);

  React.useEffect(() => {
    const checkAuth = async () => {
      try {
        const currentUser = await UserEntity.me();
        setUser(currentUser);
      } catch {
        setUser(null);
      }
      setIsCheckingAuth(false);
    };
    checkAuth();

    // Listen for 401 from frappe-client.js
    const handleUnauthorized = () => {
      setUser(null);
    };
    window.addEventListener('frappe-unauthorized', handleUnauthorized);
    return () => window.removeEventListener('frappe-unauthorized', handleUnauthorized);
  }, []);

  const handleLogout = async () => {
    try {
      await UserEntity.logout();
    } catch {}
    setUser(null);
    window.location.href = "/";
  };

  const resetErrors = () => setError(null);

  const submit = async (e) => {
    e.preventDefault();
    resetErrors();

    if (!email || !password) {
      setError("Please fill in all required fields.");
      return;
    }

    try {
      setIsLoading(true);
      await UserEntity.login(email, password);
      const currentUser = await UserEntity.me();
      if (currentUser) {
        setUser(currentUser);
      }
    } catch (err) {
      setError(err?.message || "Invalid credentials. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // While checking, show the spinner
  if (isCheckingAuth) {
    return (
      <div className="flex items-center justify-center pt-32">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-[var(--sm-primary)]" />
          <p className="text-gray-600">Verifying authentication...</p>
        </div>
      </div>
    );
  }

  // If logged in, provide context + render children
  if (user) {
    return (
      <AuthContext.Provider value={{ user, handleLogout }}>
        {children}
      </AuthContext.Provider>
    );
  }

  const handleGoogleLogin = () => {
    UserEntity.login(); // Redirects to Google OAuth via Frappe
  };

  // Login screen — no signUp (user creation is admin-only per CLAUDE.md)
  // Production: Google OAuth button. Dev: email/password fallback.
  const isProduction = import.meta.env.VITE_ENVIRONMENT === 'production';

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-[420px]">

        <div className="bg-white rounded-3xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-gray-100/50 p-8">
          <div className="flex justify-center mb-6">
            {import.meta.env.VITE_APP_LOGO ? (
              <img
                src={import.meta.env.VITE_APP_LOGO}
                alt="Logo"
                className="w-14 h-14 object-contain rounded-2xl"
              />
            ) : (
              <div className="inline-flex items-center justify-center w-14 h-14 bg-[var(--sm-primary)] rounded-2xl shadow-sm">
                <Briefcase className="w-7 h-7 text-white" />
              </div>
            )}
          </div>

          <div className="text-center mb-8">
            <h1 className="text-[28px] font-semibold text-gray-900 mb-4">
              {import.meta.env.VITE_APP_NAME || "Spark Mojo"}
            </h1>
            <h3 className="text-[20px] font-semibold tracking-[-0.5px] text-gray-900 mb-2">
              Welcome back
            </h3>
            <p className="text-[13px] text-gray-500">
              Sign in to continue to your account
            </p>
          </div>

          {error && (
            <div className="mb-6 flex items-start gap-2.5 p-3.5 bg-red-50/80 rounded-2xl border border-red-100">
              <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
              <p className="text-[13px] text-red-700 leading-relaxed">{error}</p>
            </div>
          )}

          {/* Google OAuth button — primary login method */}
          <Button
            type="button"
            onClick={handleGoogleLogin}
            className="w-full h-12 rounded-2xl bg-white hover:bg-gray-50 text-gray-700 text-[15px] font-medium border border-gray-200 shadow-sm hover:shadow transition-all duration-200 flex items-center justify-center gap-3 mb-4"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
              <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.997 8.997 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05"/>
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z" fill="#EA4335"/>
            </svg>
            Sign in with Google
          </Button>

          {/* Dev fallback: email/password form */}
          {!isProduction && (
            <>
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="px-2 bg-white text-gray-400">or sign in with email (dev only)</span>
                </div>
              </div>

              <form onSubmit={submit} className="space-y-4">
                <div>
                  <Input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-12 rounded-2xl bg-gray-50 border-0 text-[15px] placeholder:text-gray-400 focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-0 px-4 transition-all duration-200"
                  />
                </div>

                <div>
                  <Input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-12 rounded-2xl bg-gray-50 border-0 text-[15px] placeholder:text-gray-400 focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-0 px-4 transition-all duration-200"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-12 rounded-2xl bg-[var(--sm-primary)] hover:bg-[var(--sm-primary)]/90 text-white text-[15px] font-medium shadow-sm hover:shadow transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    "Sign in"
                  )}
                </Button>
              </form>
            </>
          )}
        </div>

        <p className="text-center text-[12px] text-gray-400 mt-8 leading-relaxed">
          Powered by Spark Mojo
        </p>
      </div>
    </div>
  );
}
