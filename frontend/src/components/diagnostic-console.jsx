/**
 * @fileoverviewCollapsible system diagnostics and console log visualizer for mobile debugging.
 * @module components/diagnostic-console
 */

import React, { useState, useEffect, useRef } from 'react';
import { Terminal, X, Copy, Trash2, Check, RefreshCw } from 'lucide-react';

export function DiagnosticConsole() {
  const [isOpen, setIsOpen] = useState(false);
  const [logs, setLogs] = useState([]);
  const [copied, setCopied] = useState(false);
  const [apiOverride, setApiOverride] = useState('');
  const [savedOverride, setSavedOverride] = useState('');
  const logsEndRef = useRef(null);

  // Load active override from localStorage
  useEffect(() => {
    setLogs([...(window.__logs || [])]);

    // Listen to log additions and force state update
    window.__onLogAdded = (newLog) => {
      setLogs((prev) => [...prev, newLog]);
    };

    const saved = localStorage.getItem('DEBUG_API_URL') || '';
    setSavedOverride(saved);
    setApiOverride(saved);

    return () => {
      window.__onLogAdded = null;
    };
  }, []);

  const getFormattedActiveUrl = () => {
    let url = savedOverride || import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
    if (url && !url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('/')) {
      url = 'https://' + url;
    }
    if (url && !url.endsWith('/api') && !url.endsWith('/api/')) {
      url = url.replace(/\/$/, '') + '/api';
    }
    return url;
  };


  // Auto scroll to bottom of logs when panel is open or logs change
  useEffect(() => {
    if (isOpen && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [isOpen, logs]);

  const handleClear = () => {
    window.__logs = [];
    setLogs([]);
  };

  const handleCopy = () => {
    const systemInfo = `--- DIAGNOSTICS INFO ---
Time: ${new Date().toISOString()}
User Agent: ${navigator.userAgent}
Online: ${navigator.onLine}
VITE_API_URL: ${import.meta.env.VITE_API_URL || 'Not Set'}
VITE_SUPABASE_URL: ${import.meta.env.VITE_SUPABASE_URL || 'Not Set'}
API Override: ${savedOverride || 'None'}
Active API URL: ${getFormattedActiveUrl()}

--- LOGS ---
${logs.map((l) => `[${l.timestamp}] [${l.type.toUpperCase()}] ${l.message}`).join('\n')}
`;

    navigator.clipboard.writeText(systemInfo)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch((err) => {
        alert('Could not copy logs automatically. Please manually copy. Error: ' + err.message);
      });
  };

  const handleSaveOverride = () => {
    let url = apiOverride.trim();
    if (url) {
      // Basic formatting checks
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
      }
      localStorage.setItem('DEBUG_API_URL', url);
      setSavedOverride(url);
      setApiOverride(url);
      console.log(`API URL overridden to: ${url}. Reload the app or proceed testing.`);
      alert(`API URL successfully overridden to: ${url}\nPlease refresh or test uploads now.`);
    } else {
      handleClearOverride();
    }
  };

  const handleClearOverride = () => {
    localStorage.removeItem('DEBUG_API_URL');
    setSavedOverride('');
    setApiOverride('');
    console.log('API URL override removed. Falling back to environment variables.');
    alert('API URL override cleared. Using default environment configuration.');
  };

  return (
    <>
      {/* Floating Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-4 right-4 z-40 h-10 w-10 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-white rounded-full flex items-center justify-center shadow-lg transition-all duration-200 cursor-pointer"
        title="Open Diagnostics Console"
      >
        {isOpen ? <X className="h-4 w-4" /> : <Terminal className="h-4 w-4" />}
      </button>

      {/* Diagnostics Console Panel */}
      {isOpen && (
        <div className="fixed inset-x-0 bottom-0 z-50 h-[80vh] md:h-[60vh] bg-zinc-950/98 border-t border-zinc-800 text-zinc-300 flex flex-col font-mono text-xs shadow-2xl animate-fade-in">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-zinc-900/60">
            <div className="flex items-center gap-2">
              <Terminal className="h-4 w-4 text-white animate-pulse" />
              <span className="font-bold text-white uppercase tracking-wider">Diagnostics Console</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopy}
                className="p-1.5 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded transition-colors flex items-center gap-1 cursor-pointer"
                title="Copy Diagnostics Report"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
              <button
                onClick={handleClear}
                className="p-1.5 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded transition-colors flex items-center gap-1 cursor-pointer"
                title="Clear Log History"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Clear</span>
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Diagnostic Info Section */}
          <div className="p-4 border-b border-zinc-800 bg-zinc-950 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5 border-b md:border-b-0 md:border-r border-zinc-800 pb-4 md:pb-0 md:pr-4">
              <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Client Environment</div>
              <p className="flex justify-between">
                <span>Online Status:</span>
                <span className={navigator.onLine ? 'text-green-400 font-bold' : 'text-red-400 font-bold'}>
                  {navigator.onLine ? 'ONLINE' : 'OFFLINE'}
                </span>
              </p>
              <p className="flex justify-between truncate">
                <span>VITE_API_URL:</span>
                <span className="text-zinc-400">{import.meta.env.VITE_API_URL || 'Not Set'}</span>
              </p>
              <p className="flex justify-between truncate">
                <span>VITE_SUPABASE:</span>
                <span className="text-zinc-400">{import.meta.env.VITE_SUPABASE_URL ? 'Configured' : 'Missing'}</span>
              </p>
              <p className="flex justify-between truncate font-bold text-white">
                <span>Active API URL:</span>
                <span>{getFormattedActiveUrl()}</span>
              </p>
            </div>

            <div className="space-y-2.5">
              <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">API Endpoint Override</div>
              <p className="text-[10px] text-zinc-400">
                Type your active Railway/backend API URL if the env vars didn't build correctly:
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="https://your-backend.up.railway.app/api"
                  value={apiOverride}
                  onChange={(e) => setApiOverride(e.target.value)}
                  className="flex-1 bg-zinc-900 border border-zinc-750 px-2.5 py-1.5 rounded text-white text-xs focus:outline-none focus:border-zinc-500"
                />
                <button
                  onClick={handleSaveOverride}
                  className="px-3 py-1.5 bg-white text-black hover:bg-zinc-200 font-bold rounded text-xs transition-colors cursor-pointer"
                >
                  Save
                </button>
                {savedOverride && (
                  <button
                    onClick={handleClearOverride}
                    className="px-2.5 py-1.5 bg-red-950 border border-red-900 text-red-300 hover:bg-red-900 rounded text-xs transition-colors cursor-pointer"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Logs View */}
          <div className="flex-1 overflow-y-auto p-4 space-y-1 bg-black/40">
            {logs.length === 0 ? (
              <p className="text-zinc-500 italic text-center py-8">No console logs or errors captured yet.</p>
            ) : (
              logs.map((log) => (
                <div
                  key={log.id}
                  className={`p-1.5 rounded select-text text-left break-all font-mono leading-relaxed whitespace-pre-wrap ${
                    log.type === 'error'
                      ? 'bg-red-950/20 text-red-300 border-l-2 border-red-500 pl-2'
                      : log.type === 'warn'
                        ? 'bg-yellow-950/20 text-yellow-300 border-l-2 border-yellow-500 pl-2'
                        : 'text-zinc-350 hover:bg-zinc-900/40 pl-2'
                  }`}
                >
                  <span className="text-zinc-500 mr-2 text-[10px] select-none">[{log.timestamp}]</span>
                  <span>{log.message}</span>
                </div>
              ))
            )}
            <div ref={logsEndRef} />
          </div>
        </div>
      )}
    </>
  );
}
