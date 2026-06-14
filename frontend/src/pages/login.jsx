/**
 * @fileoverview Login page component (Minimalist theme).
 * @module pages/login
 */

import React, { useState } from 'react';
import { useAuth } from '../hooks/use-auth';
import { LogIn, Loader2, KeyRound, Mail, Camera } from 'lucide-react';
import { DiagnosticConsole } from '../components/diagnostic-console';


export function Login() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all credentials.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await signIn(email, password);
    } catch (err) {
      console.error('Login failure:', err);
      setError(err.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen px-4 bg-black">
      <div className="w-full max-w-md glass-panel rounded-2xl p-8 relative overflow-hidden animate-fade-in border border-zinc-800">
        
        {/* Header Icon */}
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="h-12 w-12 bg-white text-black rounded-lg flex items-center justify-center shadow-lg shadow-white/5 mb-4">
            <Camera className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-bold text-white tracking-widest uppercase font-mono">WebScanner B2B</h1>
          <p className="text-xs text-zinc-400 mt-2">
            Secure enterprise scanning and document workflow
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-zinc-900 border border-zinc-700 text-white text-xs font-mono animate-pulse-slow">
            ERROR: {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Email field */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 font-mono">
              Email Address
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-500 pointer-events-none">
                <Mail className="h-4 w-4" />
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="w-full pl-10 pr-4 py-3 rounded-xl glass-input text-xs font-mono"
                disabled={loading}
              />
            </div>
          </div>

          {/* Password field */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 font-mono">
              Password
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-500 pointer-events-none">
                <KeyRound className="h-4 w-4" />
              </span>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-3 rounded-xl glass-input text-xs font-mono"
                disabled={loading}
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-xl bg-white hover:bg-zinc-200 text-black font-bold text-xs uppercase tracking-wider transition-all duration-200 flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-95"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Verifying...</span>
              </>
            ) : (
              <>
                <LogIn className="h-4 w-4" />
                <span>Log In</span>
              </>
            )}
          </button>
        </form>

        {/* Footer info */}
        <div className="mt-8 text-center text-[10px] text-zinc-600 font-mono">
          SECURE WORKSPACE. UNAUTHORIZED ACCESS PROHIBITED.
        </div>
      </div>
      
      {/* Diagnostics Console Panel for pre-login and connection issues */}
      <DiagnosticConsole />
    </div>
  );
}

