// lib/logger.ts
export const logger = {
  info: (...args: unknown[]) => {
    if (process.env.NODE_ENV === 'development') {
      console.info(...args);
    }
  },
  warn: (...args: unknown[]) => {
    if (process.env.NODE_ENV === 'development') {
      console.warn(...args);
    }
  },
  error: (...args: unknown[]) => {
    console.error(...args);
  },
  log: (...args: unknown[]) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(...args);
    }
  },
  debug: (...args: unknown[]) => { // ✅ Add debug method
    if (process.env.NODE_ENV === 'development') {
      console.debug(...args);
    }
  }
};