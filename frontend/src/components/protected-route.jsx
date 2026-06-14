/**
 * @fileoverview Route protection wrapper component (Minimalist theme).
 * @module components/protected-route
 */

import { useAuth } from '../hooks/use-auth';
import { Loader2 } from 'lucide-react';

/**
 * Route protection wrapper component.
 */
export function ProtectedRoute({ children, requireAdmin = false, fallbackRedirect }) {
  const { user, role, loading } = useAuth();

  // Premium loading minimalist page
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white">
        <div className="p-8 rounded-2xl glass-panel flex flex-col items-center space-y-4">
          <Loader2 className="h-10 w-10 text-white animate-spin" />
          <p className="text-xs text-zinc-400 font-mono tracking-widest uppercase">Securing session...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if user is not authenticated
  if (!user) {
    return fallbackRedirect || (
      <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white p-4">
        <div className="p-8 max-w-md w-full rounded-2xl glass-panel text-center space-y-6">
          <h2 className="text-xl font-bold tracking-tight text-white uppercase font-mono">Authentication Required</h2>
          <p className="text-zinc-400 text-sm">
            Please log in with your account to access this workspace.
          </p>
          <a
            href="/"
            className="inline-block w-full py-3 px-4 rounded-xl bg-white hover:bg-zinc-200 text-black font-semibold text-sm transition-all duration-200 shadow-lg shadow-white/5"
          >
            Go to Login
          </a>
        </div>
      </div>
    );
  }

  // Redirect to user dashboard if user is authenticated but tries accessing admin without permissions
  if (requireAdmin && role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white p-4">
        <div className="p-8 max-w-md w-full rounded-2xl glass-panel text-center space-y-6">
          <h2 className="text-xl font-bold tracking-tight text-white uppercase font-mono">Access Denied</h2>
          <p className="text-zinc-400 text-sm">
            You do not have the administrative permissions required to view this panel.
          </p>
          <a
            href="/"
            className="inline-block w-full py-3 px-4 rounded-xl bg-white hover:bg-zinc-200 text-black font-semibold text-sm transition-all duration-200 shadow-lg shadow-white/5"
          >
            Go to Dashboard
          </a>
        </div>
      </div>
    );
  }

  return children;
}
