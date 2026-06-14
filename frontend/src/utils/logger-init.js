/**
 * @fileoverview Early logging interceptor for mobile debugging.
 * Overrides console methods and listens to global error handlers to record logs.
 */

window.__logs = window.__logs || [];
window.__onLogAdded = window.__onLogAdded || null;

const originalLog = console.log;
const originalWarn = console.warn;
const originalError = console.error;

function addLog(type, ...args) {
  const message = args
    .map(arg => {
      if (arg instanceof Error) {
        return `${arg.message}\n${arg.stack || ''}`;
      }
      if (typeof arg === 'object') {
        try {
          return JSON.stringify(arg, null, 2);
        } catch (e) {
          return String(arg);
        }
      }
      return String(arg);
    })
    .join(' ');

  const logEntry = {
    type,
    message,
    timestamp: new Date().toLocaleTimeString(),
    id: Math.random().toString(36).substring(2, 9)
  };

  window.__logs.push(logEntry);
  
  // Cap at 200 logs to prevent memory leaks
  if (window.__logs.length > 200) {
    window.__logs.shift();
  }

  // Trigger callback if registered
  if (typeof window.__onLogAdded === 'function') {
    try {
      window.__onLogAdded(logEntry);
    } catch (e) {
      originalError('Error in log listener callback:', e);
    }
  }
}

// Intercept console calls
console.log = function(...args) {
  originalLog.apply(console, args);
  addLog('log', ...args);
};

console.warn = function(...args) {
  originalWarn.apply(console, args);
  addLog('warn', ...args);
};

console.error = function(...args) {
  originalError.apply(console, args);
  addLog('error', ...args);
};

// Capture global uncaught runtime errors
window.addEventListener('error', (event) => {
  const errorMsg = event.error 
    ? `${event.message}\nStack: ${event.error.stack}` 
    : event.message;
  addLog('error', `[Uncaught Error] ${errorMsg}`);
});

// Capture unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason;
  const reasonMsg = reason instanceof Error 
    ? `${reason.message}\nStack: ${reason.stack}` 
    : typeof reason === 'object' 
      ? JSON.stringify(reason) 
      : String(reason);
  addLog('error', `[Unhandled Rejection] ${reasonMsg}`);
});

addLog('log', 'Mobile logger initialized successfully.');
