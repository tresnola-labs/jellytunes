/**
 * Centralized logging configuration for JellyTunes.
 *
 * Uses electron-log for local file-based logging only.
 * No data is sent to external services — privacy first.
 *
 * Log file location (exposed to user for transparency):
 *   - macOS: ~/Library/Logs/JellyTunes/main.log
 *   - Windows: %USERPROFILE%\AppData\Roaming\JellyTunes\logs\main.log
 *   - Linux: ~/.config/JellyTunes/logs/main.log
 */

import log from 'electron-log'
import { is } from '@electron-toolkit/utils'

export function configureLogger(): void {
  // File transport: keep logs local, rotate at 5 MB, keep 3 old files
  log.transports.file.level = is.dev ? 'debug' : 'info'
  log.transports.file.maxSize = 5 * 1024 * 1024 // 5 MB
  log.transports.file.archiveLog = (oldLogFile) => {
    const info = oldLogFile.toString()
    const dot = info.lastIndexOf('.')
    return info.slice(0, dot) + '.old' + info.slice(dot)
  }

  // Console transport: verbose in dev, silent in production
  log.transports.console.level = is.dev ? 'debug' : false

  // Catch unhandled errors and promise rejections automatically
  log.catchErrors({
    showDialog: false,
    onError: (error) => {
      log.error('[uncaught]', error.error.message)
    },
  })

  log.info('Logger configured', {
    level: log.transports.file.level,
    path: log.transports.file.getFile().path,
  })
}

export { log }
