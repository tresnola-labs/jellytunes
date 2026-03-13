// tests/unit/utils/helpers.test.ts

import { describe, it, expect } from 'vitest'

describe('Helper functions', () => {
  it('should format bytes correctly', () => {
    const formatBytes = (bytes: number): string => {
      if (bytes === 0) return '0 B'
      const k = 1024
      const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
      const i = Math.floor(Math.log(bytes) / Math.log(k))
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
    }

    expect(formatBytes(0)).toBe('0 B')
    expect(formatBytes(1024)).toBe('1 KB')
    expect(formatBytes(1048576)).toBe('1 MB')
    expect(formatBytes(1073741824)).toBe('1 GB')
  })

  it('should validate URL correctly', () => {
    const isValidUrl = (url: string): boolean => {
      try {
        new URL(url)
        return true
      } catch {
        return false
      }
    }

    expect(isValidUrl('https://jellyfin.example.com')).toBe(true)
    expect(isValidUrl('http://localhost:8096')).toBe(true)
    expect(isValidUrl('invalid-url')).toBe(false)
    expect(isValidUrl('')).toBe(false)
  })

  it('should generate random ID correctly', () => {
    const generateId = (): string => {
      return Math.random().toString(36).substring(2, 15) +
             Math.random().toString(36).substring(2, 15)
    }

    const id1 = generateId()
    const id2 = generateId()

    expect(typeof id1).toBe('string')
    expect(id1.length).toBeGreaterThan(10)
    expect(id1).not.toBe(id2)
  })

  it('should truncate string correctly', () => {
    const truncate = (str: string, maxLength: number): string => {
      if (str.length <= maxLength) return str
      return str.substring(0, maxLength - 3) + '...'
    }

    expect(truncate('hello', 10)).toBe('hello')
    expect(truncate('hello world', 8)).toBe('hello...')
    expect(truncate('a', 5)).toBe('a')
  })
})