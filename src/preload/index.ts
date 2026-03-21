import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

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

interface TrackInfo {
  id: string
  name: string
  path: string
  size: number
  format: string
}

interface SyncOptions {
  tracks: TrackInfo[]
  targetPath: string
  convertToMp3: boolean
  mp3Bitrate: string
}

interface SyncResult {
  success: boolean
  errors: string[]
  syncedFiles: number
}

interface SyncProgress {
  current: number
  total: number
  currentFile: string
  status: 'syncing' | 'completed' | 'cancelled'
}

const api = {
  listUsbDevices: (): Promise<UsbDevice[]> =>
    ipcRenderer.invoke('usb:list'),
  
  getDeviceInfo: (devicePath: string): Promise<DeviceInfo> =>
    ipcRenderer.invoke('usb:getDeviceInfo', devicePath),

  getFilesystem: (devicePath: string): Promise<string> =>
    ipcRenderer.invoke('device:getFilesystem', devicePath),
  
  getTrackSize: (trackPath: string): Promise<number> =>
    ipcRenderer.invoke('usb:getTrackSize', trackPath),
  
  getTrackFormat: (trackPath: string): Promise<string> =>
    ipcRenderer.invoke('usb:getTrackFormat', trackPath),
  
  onUsbAttach: (callback: () => void) => {
    ipcRenderer.on('usb:attach', () => callback())
    return () => ipcRenderer.removeAllListeners('usb:attach')
  },
  
  onUsbDetach: (callback: () => void) => {
    ipcRenderer.on('usb:detach', () => callback())
    return () => ipcRenderer.removeAllListeners('usb:detach')
  },

  startSync: (options: SyncOptions): Promise<SyncResult> =>
    ipcRenderer.invoke('sync:start', options),
  
  // New sync with itemIds + itemTypes (uses new sync module)
  startSync2: (options: {
    serverUrl: string;
    apiKey: string;
    userId: string;
    itemIds: string[];
    itemTypes: Record<string, 'artist' | 'album' | 'playlist'>;
    destinationPath: string;
    options?: {
      convertToMp3?: boolean;
      bitrate?: '128k' | '192k' | '320k';
    };
  }): Promise<{ success: boolean; tracksCopied: number; tracksFailed: string[]; errors: string[]; totalSizeBytes?: number }> =>
    ipcRenderer.invoke('sync:start2', options),
  
  cancelSync: (): Promise<{ cancelled: boolean }> =>
    ipcRenderer.invoke('sync:cancel'),
  
  onSyncProgress: (callback: (progress: SyncProgress) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, progress: SyncProgress) => callback(progress)
    ipcRenderer.on('sync:progress', handler)
    return () => ipcRenderer.removeListener('sync:progress', handler)
  },

  isFfmpegAvailable: (): Promise<boolean> =>
    ipcRenderer.invoke('ffmpeg:isAvailable'),
  
  getVersion: (): Promise<string> => ipcRenderer.invoke('app:version'),
  
  selectFolder: (): Promise<string | null> =>
    ipcRenderer.invoke('dialog:selectFolder'),
  
  getFolderStats: (folderPath: string): Promise<{exists: boolean, isDirectory?: boolean, size?: number, modified?: string, error?: string}> =>
    ipcRenderer.invoke('fs:getFolderStats', folderPath),

  estimateSize: (options: {
    serverUrl: string; apiKey: string; userId: string
    itemIds: string[]; itemTypes: Record<string, 'artist' | 'album' | 'playlist'>
  }): Promise<{ trackCount: number; totalBytes: number; formatBreakdown: Record<string, number> }> =>
    ipcRenderer.invoke('sync:estimateSize', options),

  getDeviceSyncInfo: (mountPoint: string): Promise<{
    lastSync: string | null; totalTracks: number; totalBytes: number; syncCount: number
  } | null> =>
    ipcRenderer.invoke('sync:getDeviceInfo', mountPoint),

  getSyncHistory: (): Promise<Array<{
    id: number; deviceMountPoint: string; startedAt: string; completedAt: string | null
    tracksSynced: number; bytesTransferred: number; status: string
  }>> =>
    ipcRenderer.invoke('sync:getHistory'),

  getSyncedItems: (mountPoint: string): Promise<string[]> =>
    ipcRenderer.invoke('sync:getSyncedItems', mountPoint),

  removeItems: (options: {
    serverUrl: string; apiKey: string; userId: string
    itemIds: string[]; itemTypes: Record<string, 'artist' | 'album' | 'playlist'>
    destinationPath: string
  }): Promise<{ removed: number; errors: string[] }> =>
    ipcRenderer.invoke('sync:removeItems', options),
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore
  window.electron = electronAPI
  // @ts-ignore
  window.api = api
}
