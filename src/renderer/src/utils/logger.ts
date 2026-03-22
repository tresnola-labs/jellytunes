/**
 * Renderer-side logger. Forwards messages to the main process via IPC
 * so they are written to the local log file (electron-log, no external services).
 *
 * Usage:
 *   import { logger } from '@/utils/logger'
 *   logger.error('Something went wrong')
 *   logger.warn('Degraded path taken')
 */

function sanitize(message: unknown): string {
  if (typeof message === 'string') return message
  if (message instanceof Error) return message.message
  try { return String(message) } catch { return '[non-serializable]' }
}

export const logger = {
  error: (message: unknown): void => {
    window.api.logError(sanitize(message))
  },
  warn: (message: unknown): void => {
    window.api.logWarn(sanitize(message))
  },
  info: (message: unknown): void => {
    window.api.logInfo(sanitize(message))
  },
}
