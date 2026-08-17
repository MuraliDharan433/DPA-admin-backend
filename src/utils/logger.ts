/* eslint-disable no-console */
const timestamp = () => new Date().toISOString();

export const logger = {
  log: (message: string, ...meta: unknown[]) =>
    console.log(`[${timestamp()}] LOG   ${message}`, ...meta),
  warn: (message: string, ...meta: unknown[]) =>
    console.warn(`[${timestamp()}] WARN  ${message}`, ...meta),
  error: (message: string, ...meta: unknown[]) =>
    console.error(`[${timestamp()}] ERROR ${message}`, ...meta),
};
