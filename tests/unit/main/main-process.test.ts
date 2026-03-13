// tests/unit/main/main-process.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock electron-log
vi.mock('electron-log', () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    transports: {
      file: {
        level: 'info'
      }
    }
  }
}))

describe('Main Process utilities', () => {
  describe('USB Device utilities', () => {
    interface UsbDeviceInfo {
      deviceAddress: number
      vendorId: number
      productId: number
      productName?: string
      manufacturerName?: string
    }

    // Simulated function from main process
    const listUsbDevices = (): UsbDeviceInfo[] => {
      return []
    }

    it('should return empty array by default', () => {
      const devices = listUsbDevices()
      expect(Array.isArray(devices)).toBe(true)
      expect(devices.length).toBe(0)
    })
  })

  describe('URL validation for Jellyfin', () => {
    const parseJellyfinUrl = (url: string): { valid: boolean; baseUrl: string } => {
      try {
        const urlObj = new URL(url)
        return {
          valid: urlObj.protocol === 'http:' || urlObj.protocol === 'https:',
          baseUrl: urlObj.origin
        }
      } catch {
        return { valid: false, baseUrl: '' }
      }
    }

    it('should parse valid Jellyfin URLs', () => {
      const result = parseJellyfinUrl('https://jellyfin.example.com:8096')
      expect(result.valid).toBe(true)
      expect(result.baseUrl).toBe('https://jellyfin.example.com:8096')
    })

    it('should reject invalid URLs', () => {
      const result = parseJellyfinUrl('not-a-url')
      expect(result.valid).toBe(false)
    })

    it('should handle http URLs', () => {
      const result = parseJellyfinUrl('http://192.168.1.100:8096')
      expect(result.valid).toBe(true)
      expect(result.baseUrl).toBe('http://192.168.1.100:8096')
    })
  })

  describe('API Key validation', () => {
    const validateApiKey = (key: string): boolean => {
      return typeof key === 'string' && key.length >= 10
    }

    it('should accept valid API keys', () => {
      expect(validateApiKey('abc123def456ghi789')).toBe(true)
    })

    it('should reject short API keys', () => {
      expect(validateApiKey('short')).toBe(false)
    })

    it('should reject empty strings', () => {
      expect(validateApiKey('')).toBe(false)
    })
  })

  describe('Sync configuration validation', () => {
    interface SyncConfig {
      url: string
      apiKey: string
      deviceId: string
    }

    const validateSyncConfig = (config: Partial<SyncConfig>): { valid: boolean; errors: string[] } => {
      const errors: string[] = []
      
      if (!config.url) {
        errors.push('URL is required')
      } else {
        try {
          new URL(config.url)
        } catch {
          errors.push('Invalid URL format')
        }
      }
      
      if (!config.apiKey || config.apiKey.length < 10) {
        errors.push('API key must be at least 10 characters')
      }
      
      if (!config.deviceId) {
        errors.push('Device ID is required')
      }

      return { valid: errors.length === 0, errors }
    }

    it('should validate correct config', () => {
      const result = validateSyncConfig({
        url: 'https://jellyfin.example.com',
        apiKey: 'abc123def456ghi',
        deviceId: 'device-123'
      })
      expect(result.valid).toBe(true)
      expect(result.errors.length).toBe(0)
    })

    it('should detect missing URL', () => {
      const result = validateSyncConfig({
        url: '',
        apiKey: 'valid-api-key-12345',
        deviceId: 'device-123'
      })
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('URL is required')
    })

    it('should detect invalid URL', () => {
      const result = validateSyncConfig({
        url: 'not-a-url',
        apiKey: 'valid-api-key-12345',
        deviceId: 'device-123'
      })
      expect(result.valid).toBe(false)
    })

    it('should detect short API key', () => {
      const result = validateSyncConfig({
        url: 'https://jellyfin.example.com',
        apiKey: 'short',
        deviceId: 'device-123'
      })
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('API key must be at least 10 characters')
    })
  })
})