// tests/unit/renderer/renderer-utils.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('Renderer utilities', () => {
  describe('Duration formatting', () => {
    const formatDuration = (seconds: number): string => {
      const hrs = Math.floor(seconds / 3600)
      const mins = Math.floor((seconds % 3600) / 60)
      const secs = Math.floor(seconds % 60)
      
      if (hrs > 0) {
        return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
      }
      return `${mins}:${secs.toString().padStart(2, '0')}`
    }

    it('should format seconds only', () => {
      expect(formatDuration(45)).toBe('0:45')
      expect(formatDuration(59)).toBe('0:59')
    })

    it('should format minutes and seconds', () => {
      expect(formatDuration(60)).toBe('1:00')
      expect(formatDuration(125)).toBe('2:05')
      expect(formatDuration(3599)).toBe('59:59')
    })

    it('should format hours', () => {
      expect(formatDuration(3600)).toBe('1:00:00')
      expect(formatDuration(3661)).toBe('1:01:01')
      expect(formatDuration(7200)).toBe('2:00:00')
    })
  })

  describe('Track selection utilities', () => {
    interface Track {
      Id: string
      Name: string
      Artists: string[]
    }

    const toggleTrackSelection = (
      trackId: string,
      currentSelection: Set<string>
    ): Set<string> => {
      const newSelection = new Set(currentSelection)
      if (newSelection.has(trackId)) {
        newSelection.delete(trackId)
      } else {
        newSelection.add(trackId)
      }
      return newSelection
    }

    const selectAllTracks = (tracks: Track[]): Set<string> => {
      return new Set(tracks.map(t => t.Id))
    }

    const deselectAllTracks = (): Set<string> => {
      return new Set()
    }

    it('should toggle track selection on', () => {
      const selection = new Set<string>()
      const result = toggleTrackSelection('track-1', selection)
      expect(result.has('track-1')).toBe(true)
    })

    it('should toggle track selection off', () => {
      const selection = new Set<string>(['track-1', 'track-2'])
      const result = toggleTrackSelection('track-1', selection)
      expect(result.has('track-1')).toBe(false)
      expect(result.has('track-2')).toBe(true)
    })

    it('should select all tracks', () => {
      const tracks: Track[] = [
        { Id: '1', Name: 'Track 1', Artists: ['Artist A'] },
        { Id: '2', Name: 'Track 2', Artists: ['Artist B'] },
        { Id: '3', Name: 'Track 3', Artists: ['Artist A'] },
      ]
      const result = selectAllTracks(tracks)
      expect(result.size).toBe(3)
      expect(result.has('1')).toBe(true)
      expect(result.has('2')).toBe(true)
      expect(result.has('3')).toBe(true)
    })

    it('should deselect all tracks', () => {
      const selection = new Set<string>(['1', '2', '3'])
      const result = deselectAllTracks()
      expect(result.size).toBe(0)
    })
  })

  describe('Search filtering', () => {
    interface Item {
      Name: string
      Artists?: string[]
      AlbumName?: string
    }

    const filterBySearch = (items: Item[], query: string): Item[] => {
      const normalizedQuery = query.toLowerCase().trim()
      if (!normalizedQuery) return items
      
      return items.filter(item => {
        const nameMatch = item.Name.toLowerCase().includes(normalizedQuery)
        const artistMatch = item.Artists?.some(a => a.toLowerCase().includes(normalizedQuery))
        const albumMatch = item.AlbumName?.toLowerCase().includes(normalizedQuery)
        return nameMatch || artistMatch || albumMatch
      })
    }

    it('should return all items for empty query', () => {
      const items = [{ Name: 'Song 1' }, { Name: 'Song 2' }]
      expect(filterBySearch(items, '')).toHaveLength(2)
    })

    it('should filter by name', () => {
      const items = [
        { Name: 'Bohemian Rhapsody' },
        { Name: 'Stairway to Heaven' },
        { Name: 'Hotel California' },
      ]
      const result = filterBySearch(items, 'hotel')
      expect(result).toHaveLength(1)
      expect(result[0].Name).toBe('Hotel California')
    })

    it('should filter by artist', () => {
      const items = [
        { Name: 'Song 1', Artists: ['Queen'] },
        { Name: 'Song 2', Artists: ['Led Zeppelin'] },
        { Name: 'Song 3', Artists: ['Queen'] },
      ]
      const result = filterBySearch(items, 'queen')
      expect(result).toHaveLength(2)
    })

    it('should be case insensitive', () => {
      const items = [{ Name: 'THE SONG' }]
      const result = filterBySearch(items, 'the')
      expect(result).toHaveLength(1)
    })
  })

  describe('API utilities', () => {
    const buildApiUrl = (baseUrl: string, endpoint: string, params?: Record<string, string>): string => {
      const normalizedBase = baseUrl.replace(/\/$/, '')
      let url = `${normalizedBase}${endpoint}`
      
      if (params && Object.keys(params).length > 0) {
        const searchParams = new URLSearchParams(params)
        url += `?${searchParams.toString()}`
      }
      
      return url
    }

    it('should build simple API URL', () => {
      const url = buildApiUrl('https://jellyfin.com', '/System/Info')
      expect(url).toBe('https://jellyfin.com/System/Info')
    })

    it('should build API URL with params', () => {
      const url = buildApiUrl('https://jellyfin.com', '/Artists', { Limit: '10', SortBy: 'Name' })
      expect(url).toBe('https://jellyfin.com/Artists?Limit=10&SortBy=Name')
    })

    it('should handle trailing slash in base URL', () => {
      const url = buildApiUrl('https://jellyfin.com/', '/Artists')
      expect(url).toBe('https://jellyfin.com/Artists')
    })
  })
})