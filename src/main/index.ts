import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import log from 'electron-log'
import { spawn } from 'child_process'
import * as fs from 'fs'

// Import new sync module
import { createSyncCore, createValidatedConfig, validateDestination, createNodeFileSystem } from '../sync'

log.transports.file.level = 'info'
log.info('Jellysync starting...')

let mainWindow: BrowserWindow | null = null

interface UsbDevice {
  device: string
  displayName: string
  size: number
  mountpoints: Array<{ path: string }>
  isRemovable: boolean
  vendorName?: string
  serialNumber?: string
}

interface DeviceInfo {
  total: number
  free: number
  used: number
}

async function listUsbDevices(): Promise<UsbDevice[]> {
  // drivelist removed - using folder selection instead
  // For USB detection, user selects folder manually
  log.info('USB detection disabled - using folder selection dialog')
  return listMountedVolumesFallback()
}

function listMountedVolumesFallback(): UsbDevice[] {
  const platform = process.platform
  const devices: UsbDevice[] = []
  try {
    if (platform === 'darwin') {
      const volumesPath = '/Volumes'
      if (fs.existsSync(volumesPath)) {
        const volumes = fs.readdirSync(volumesPath)
        for (const vol of volumes) {
          const volPath = join(volumesPath, vol)
          try {
            const stats = fs.statSync(volPath)
            if (stats.isDirectory()) {
              const isRemovable = !['Macintosh HD', 'System'].includes(vol)
              devices.push({
                device: volPath,
                displayName: vol,
                size: 0,
                mountpoints: [{ path: volPath }],
                isRemovable,
                vendorName: isRemovable ? 'External' : 'Internal'
              })
            }
          } catch (e) { /* ignore */ }
        }
      }
    } else if (platform === 'linux') {
      const mountPaths = ['/media', '/mnt', '/run/media']
      for (const mp of mountPaths) {
        if (fs.existsSync(mp)) {
          try {
            const items = fs.readdirSync(mp)
            for (const item of items) {
              const itemPath = join(mp, item)
              try {
                const stats = fs.statSync(itemPath)
                if (stats.isDirectory()) {
                  devices.push({ device: itemPath, displayName: item, size: 0, mountpoints: [{ path: itemPath }], isRemovable: true })
                }
              } catch (e) { /* ignore */ }
            }
          } catch (e) { /* ignore */ }
        }
      }
    } else if (platform === 'win32') {
      try {
        const { execSync } = require('child_process')
        const output = execSync('wmic logicaldisk get caption,size,drivetype /format:csv', { encoding: 'utf8' })
        const lines = output.split('\n').filter((line: string) => line.trim())
        for (const line of lines) {
          const parts = line.split(',')
          if (parts.length >= 3) {
            const driveLetter = parts[1]?.trim()
            const driveType = parts[2]?.trim()
            const sizeStr = parts[3]?.trim()
            if (driveLetter && (driveType === '2' || driveType === '3')) {
              const size = parseInt(sizeStr) || 0
              if (size > 0 || driveType === '2') {
                devices.push({ device: driveLetter + '\\', displayName: driveLetter, size, mountpoints: [{ path: driveLetter + '\\' }], isRemovable: driveType === '2', vendorName: driveType === '2' ? 'Removable' : 'Local' })
              }
            }
          }
        }
      } catch (e) { log.error('Windows drive detection error:', e) }
    }
  } catch (error) { log.error('Fallback volume detection error:', error) }
  log.info(`Fallback: Found ${devices.length} volumes`)
  return devices
}

async function getDeviceInfo(devicePath: string): Promise<DeviceInfo> {
  try {
    const platform = process.platform
    if (platform === 'darwin' || platform === 'linux') {
      const { execSync } = require('child_process')
      const dfOutput = execSync(`df -k "${devicePath}" 2>/dev/null | tail -1`).toString()
      const parts = dfOutput.trim().split(/\s+/)
      if (parts.length >= 4) {
        const total = parseInt(parts[1]) * 1024
        const used = parseInt(parts[2]) * 1024
        const free = parseInt(parts[3]) * 1024
        return { total, free, used }
      }
    } else if (platform === 'win32') {
      const { execSync } = require('child_process')
      const driveLetter = devicePath.charAt(0)
      const output = execSync(`wmic logicaldisk where "caption='${driveLetter}:'" get size,freespace /format:csv`, { encoding: 'utf8' })
      const lines = output.split('\n').filter((line: string) => line.trim() && !line.includes('Node'))
      if (lines.length > 0) {
        const parts = lines[lines.length - 1].split(',')
        const free = parseInt(parts[1]) || 0
        const size = parseInt(parts[2]) || 0
        return { total: size, free, used: size - free }
      }
    }
  } catch (error) { log.error('Error getting device info:', error) }
  return { total: 0, free: 0, used: 0 }
}

function getTrackSize(filePath: string): number {
  try {
    const stats = fs.statSync(filePath)
    return stats.size
  } catch (error) { return 0 }
}

function detectAudioFormat(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase()
  switch (ext) {
    case '.mp3': return 'mp3'
    case '.flac': return 'flac'
    case '.m4a': return 'm4a'
    case '.aac': return 'aac'
    case '.ogg': return 'ogg'
    case '.wav': return 'wav'
    default: return 'unknown'
  }
}

import * as path from 'path'

async function convertTrackToMp3(inputPath: string, outputPath: string, bitrate: string): Promise<boolean> {
  return new Promise<boolean>((resolve: (value: boolean) => void) => {
    try {
      let ffmpegPath: string
      try {
        const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg')
        ffmpegPath = ffmpegInstaller.path
      } catch (e) { ffmpegPath = 'ffmpeg' }
      const args = ['-i', inputPath, '-ab', bitrate, '-ar', '44100', '-ac', '2', '-y', outputPath]
      const ffmpegProcess = spawn(ffmpegPath, args, { stdio: 'ignore' })
      ffmpegProcess.on('error', (err) => { log.error('FFmpeg error:', err); resolve(false) })
      ffmpegProcess.on('close', (code) => { resolve(code === 0) })
    } catch (error) { log.error('Conversion error:', error); resolve(false) }
  })
}

let isSyncCancelled = false

// Helper to download file from Jellyfin server
async function downloadFromJellyfin(trackId: string, outputPath: string, serverUrl: string, apiKey: string): Promise<boolean> {
  try {
    const response = await fetch(`${serverUrl}/Items/${trackId}/Download`, {
      headers: {
        'X-MediaBrowser-Token': apiKey,
        'X-Emby-Token': apiKey
      }
    })
    
    if (!response.ok) {
      throw new Error(`Download failed: ${response.status} ${response.statusText}`)
    }
    
    const buffer = await response.arrayBuffer()
    fs.writeFileSync(outputPath, Buffer.from(buffer))
    return true
  } catch (error) {
    console.error('Download error:', error)
    return false
  }
}

async function syncTracks(options: { tracks: Array<{ id: string; name: string; path: string; size: number; format: string }>; targetPath: string; convertToMp3: boolean; mp3Bitrate: string; serverUrl?: string; apiKey?: string; onProgress: (progress: { current: number; total: number; currentFile: string; status: string }) => void }): Promise<{ success: boolean; errors: string[]; syncedFiles: number }> {
  const { tracks, targetPath, convertToMp3, mp3Bitrate, serverUrl, apiKey, onProgress } = options
  const errors: string[] = []
  let syncedFiles = 0
  isSyncCancelled = false
  if (!fs.existsSync(targetPath)) { fs.mkdirSync(targetPath, { recursive: true }) }
  const total = tracks.length
  
  for (let i = 0; i < tracks.length; i++) {
    if (isSyncCancelled) break
    const track = tracks[i]
    onProgress({ current: i + 1, total, currentFile: track.name, status: 'syncing' })
    try {
      let outputFileName: string
      let outputPathFull: string
      
      // Use Jellyfin download endpoint if serverUrl is provided
      if (serverUrl && apiKey) {
        outputFileName = `${track.name}.${track.format}`
        outputPathFull = join(targetPath, outputFileName)
        
        if (fs.existsSync(outputPathFull)) {
          const existingStats = fs.statSync(outputPathFull)
          if (existingStats.size === track.size) {
            syncedFiles++
            continue
          }
        }
        
        // Download from Jellyfin server
        const downloaded = await downloadFromJellyfin(track.id, outputPathFull, serverUrl, apiKey)
        if (!downloaded) {
          errors.push(`Failed to download: ${track.name}`)
          continue
        }
      } else {
        // Fallback to local copy (for testing)
        outputFileName = path.basename(track.path)
        outputPathFull = join(targetPath, outputFileName)
        if (fs.existsSync(outputPathFull)) {
          const existingStats = fs.statSync(outputPathFull)
          const sourceStats = fs.statSync(track.path)
          if (existingStats.size === sourceStats.size) { syncedFiles++; continue }
        }
        fs.copyFileSync(track.path, outputPathFull)
      }
      
      syncedFiles++
      log.info(`Synced: ${track.name}`)
    } catch (error) {
      const errorMsg = `Failed to sync "${track.name}": ${error instanceof Error ? error.message : String(error)}`
      log.error(errorMsg)
      errors.push(errorMsg)
    }
  }
  onProgress({ current: total, total, currentFile: '', status: isSyncCancelled ? 'cancelled' : 'completed' })
  return { success: errors.length === 0 && !isSyncCancelled, errors, syncedFiles }
}

function cancelSync(): void {
  isSyncCancelled = true
  log.info('Sync cancellation requested')
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200, height: 800, minWidth: 900, minHeight: 600, show: false, autoHideMenuBar: false,
    webPreferences: { preload: join(__dirname, '../preload/index.js'), sandbox: false, contextIsolation: true, nodeIntegration: false }
  })
  mainWindow.on('ready-to-show', () => { mainWindow?.show(); log.info('Window ready') })
  mainWindow.webContents.setWindowOpenHandler((details) => { shell.openExternal(details.url); return { action: 'deny' } })
  const rendererUrl = process.env['ELECTRON_RENDERER_URL']
  if (is.dev && rendererUrl) { mainWindow.loadURL(rendererUrl) } else { mainWindow.loadFile(join(__dirname, '../renderer/index.html')) }
}

ipcMain.handle('usb:list', async () => { try { return await listUsbDevices() } catch (error) { log.error('Error in usb:list handler:', error); return [] } })
ipcMain.handle('usb:getDeviceInfo', async (_event, devicePath: string) => { try { return await getDeviceInfo(devicePath) } catch (error) { log.error('Error getting device info:', error); return { total: 0, free: 0, used: 0 } } })
ipcMain.handle('usb:getTrackSize', async (_event, trackPath: string) => getTrackSize(trackPath))
ipcMain.handle('usb:getTrackFormat', async (_event, trackPath: string) => detectAudioFormat(trackPath))
ipcMain.handle('sync:start', async (event, options) => {
  try {
    log.info(`Starting sync to ${options.targetPath} with ${options.tracks.length} tracks`)
    const result = await syncTracks({
      tracks: options.tracks, 
      targetPath: options.targetPath, 
      convertToMp3: options.convertToMp3, 
      mp3Bitrate: options.mp3Bitrate,
      serverUrl: options.serverUrl,
      apiKey: options.apiKey,
      onProgress: (progress) => { mainWindow?.webContents.send('sync:progress', progress) }
    })
    return result
  } catch (error) { log.error('Sync error:', error); return { success: false, errors: [error instanceof Error ? error.message : String(error)], syncedFiles: 0 } }
})

// New sync:start2 handler - downloads from Jellyfin server
ipcMain.handle('sync:start2', async (event, options) => {
  try {
    const { serverUrl, apiKey, userId, itemIds, itemTypes, destinationPath } = options
    log.info(`Starting sync v2 to ${destinationPath} with ${itemIds.length} items`)
    
    // Validate inputs
    if (!serverUrl || !apiKey || !userId) {
      return { success: false, errors: ['Missing serverUrl, apiKey, or userId'], tracksCopied: 0 }
    }
    
    // Create destination folder if needed
    if (!fs.existsSync(destinationPath)) {
      fs.mkdirSync(destinationPath, { recursive: true })
    }
    
    // Create API client to fetch tracks
    const { createApiClient } = await import('../sync/sync-api.js')
    const api = createApiClient({
      baseUrl: serverUrl.replace(/\/$/, ''),
      apiKey,
      userId,
      timeout: 60000
    })
    
    // Get tracks for items
    const itemTypesMap = itemTypes instanceof Map ? itemTypes : new Map(Object.entries(itemTypes))
    const { tracks, errors: fetchErrors } = await api.getTracksForItems(itemIds, itemTypesMap)
    
    log.info(`Fetched ${tracks.length} tracks, ${fetchErrors.length} errors`)
    
    if (tracks.length === 0) {
      return { success: false, errors: fetchErrors.length > 0 ? fetchErrors : ['No tracks found'], tracksCopied: 0 }
    }
    
    // Download each track
    let tracksCopied = 0
    const syncErrors: string[] = []
    const total = tracks.length
    
    for (let i = 0; i < tracks.length; i++) {
      const track = tracks[i]
      mainWindow?.webContents.send('sync:progress', {
        current: i + 1,
        total,
        currentFile: track.name,
        status: 'syncing'
      })
      
      try {
        const outputFileName = `${track.name}.${track.format}`
        const outputPathFull = join(destinationPath, outputFileName)
        
        // Check if already exists with same size
        if (fs.existsSync(outputPathFull)) {
          const existingStats = fs.statSync(outputPathFull)
          if (existingStats.size === track.size) {
            tracksCopied++
            continue
          }
        }
        
        // Download from Jellyfin
        const downloaded = await downloadFromJellyfin(track.id, outputPathFull, serverUrl.replace(/\/$/, ''), apiKey)
        
        if (downloaded) {
          tracksCopied++
          log.info(`Synced: ${track.name}`)
        } else {
          syncErrors.push(`Failed to download: ${track.name}`)
        }
      } catch (err) {
        syncErrors.push(`Error syncing "${track.name}": ${err instanceof Error ? err.message : String(err)}`)
      }
    }
    
    mainWindow?.webContents.send('sync:progress', {
      current: total,
      total,
      currentFile: '',
      status: 'complete'
    })
    
    log.info(`Sync v2 completed: ${tracksCopied} tracks, ${syncErrors.length} errors`)
    return {
      success: syncErrors.length === 0,
      tracksCopied,
      tracksFailed: syncErrors.map(e => e.split(':')[0]),
      errors: syncErrors,
      totalSizeBytes: tracks.reduce((sum, t) => sum + (t.size || 0), 0)
    }
  } catch (error) { 
    log.error('Sync v2 error:', error); 
    return { success: false, errors: [error instanceof Error ? error.message : String(error)], tracksCopied: 0 } 
  }
})
ipcMain.handle('sync:cancel', () => { cancelSync(); return { cancelled: true } })
ipcMain.handle('app:version', () => app.getVersion())
ipcMain.handle('dialog:selectFolder', async () => { const result = await dialog.showOpenDialog({ properties: ['openDirectory'], title: 'Select sync destination folder' }); return result.canceled ? null : result.filePaths[0] })
ipcMain.handle('fs:getFolderStats', async (_event, folderPath: string) => { try { const stats = fs.statSync(folderPath); return { exists: true, isDirectory: stats.isDirectory(), size: stats.size, modified: stats.mtime.toISOString() } } catch (error) { return { exists: false, error: String(error) } } })
ipcMain.handle('ffmpeg:isAvailable', async () => { try { require('child_process').execSync('ffmpeg -version', { stdio: 'ignore' }); return true } catch (e) { try { require('@ffmpeg-installer/ffmpeg'); return true } catch (e2) { return false } } })

app.whenReady().then(() => {
  log.info('App ready')
  electronApp.setAppUserModelId('com.jellysync.app')
  app.on('browser-window-created', (_, window) => { optimizer.watchWindowShortcuts(window) })
  createWindow()
  app.on('activate', function () { if (BrowserWindow.getAllWindows().length === 0) createWindow() })
})

app.on('window-all-closed', () => { if (process.platform !== 'darwin') { app.quit() } })
log.info('Main process initialized')
