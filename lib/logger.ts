// Create lib/logger.ts
export const logger = {
  info: (...args: any[]) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(...args);
    }
  },
  error: (...args: any[]) => {
    console.error(...args);
    // Could integrate with error tracking service like Sentry
  }
};