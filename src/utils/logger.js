/**
 * Structured Logger for IronLogic
 * Tracks session and user context for debugging finalization issues.
 */

const getContext = () => {
  const user = JSON.parse(localStorage.getItem('user')) || {};
  return {
    userId: user.id || 'anonymous',
    email: user.email || 'N/A',
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    online: navigator.onLine
  };
};

export const logEvent = (level, message, data = {}) => {
  const context = getContext();
  const logEntry = {
    level,
    message,
    ...context,
    ...data
  };

  console.log(`[${level.toUpperCase()}] ${message}`, logEntry);

  // In a real production app, we would send this to a logging service or Firestore
  // For now, we'll keep it in console but structured.
  if (level === 'error') {
    // We could potentially write to a 'logs' collection here if needed
  }
};

export const logger = {
  info: (msg, data) => logEvent('info', msg, data),
  warn: (msg, data) => logEvent('warn', msg, data),
  error: (msg, data) => logEvent('error', msg, data),
  debug: (msg, data) => logEvent('debug', msg, data)
};
