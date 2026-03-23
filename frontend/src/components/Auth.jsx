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
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-sm-teal" />
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

  // Login screen — no signUp (user creation is admin-only per CLAUDE.md)
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
              <div className="inline-flex items-center justify-center w-14 h-14 bg-sm-teal rounded-2xl shadow-sm">
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
              className="w-full h-12 rounded-2xl bg-sm-teal hover:bg-sm-teal/90 text-white text-[15px] font-medium mt-6 shadow-sm hover:shadow transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
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
        </div>

        <p className="text-center text-[12px] text-gray-400 mt-8 leading-relaxed">
          Powered by Spark Mojo
        </p>
      </div>
    </div>
  );
}
