import { useState, useCallback } from 'react'

interface DeviceState {
  selectedItems: Set<string>
  syncedItems: Set<string>
}

const EMPTY: DeviceState = { selectedItems: new Set(), syncedItems: new Set() }

export function useDeviceSelections() {
  const [deviceStates, setDeviceStates] = useState<Map<string, DeviceState>>(new Map())
  const [activeDevicePath, setActiveDevicePath] = useState<string | null>(null)

  const activeState = activeDevicePath
    ? (deviceStates.get(activeDevicePath) ?? EMPTY)
    : EMPTY

  // Activate a device: load its synced items and init selection on first visit
  const activateDevice = useCallback(async (path: string) => {
    setActiveDevicePath(path)
    setDeviceStates(prev => {
      if (prev.has(path)) return prev
      // Placeholder while loading
      return new Map(prev).set(path, { selectedItems: new Set(), syncedItems: new Set() })
    })
    try {
      const ids = await window.api.getSyncedItems(path)
      const syncedSet = new Set(ids)
      setDeviceStates(prev => {
        const existing = prev.get(path)
        // Only init selectedItems if this is the first load
        const selectedItems = existing && existing.syncedItems.size === 0 && existing.selectedItems.size === 0
          ? new Set(syncedSet)
          : (existing?.selectedItems ?? new Set(syncedSet))
        return new Map(prev).set(path, { selectedItems, syncedItems: syncedSet })
      })
    } catch { /* ignore */ }
  }, [])

  // Refresh synced items for a device after sync completes
  const updateSyncedItems = useCallback((path: string, ids: Set<string>) => {
    setDeviceStates(prev => {
      const state = prev.get(path) ?? EMPTY
      return new Map(prev).set(path, { ...state, syncedItems: ids })
    })
  }, [])

  // Remove device state (on disconnect or remove)
  const removeDevice = useCallback((path: string) => {
    setDeviceStates(prev => {
      const next = new Map(prev)
      next.delete(path)
      return next
    })
    setActiveDevicePath(prev => prev === path ? null : prev)
  }, [])

  const toggleItem = useCallback((id: string) => {
    setActiveDevicePath(path => {
      if (!path) return path
      setDeviceStates(prev => {
        const state = prev.get(path) ?? EMPTY
        const next = new Set(state.selectedItems)
        if (next.has(id)) next.delete(id)
        else next.add(id)
        return new Map(prev).set(path, { ...state, selectedItems: next })
      })
      return path
    })
  }, [])

  const selectItems = useCallback((items: Array<{ Id: string }>) => {
    setActiveDevicePath(path => {
      if (!path) return path
      setDeviceStates(prev => {
        const state = prev.get(path) ?? EMPTY
        const next = new Set(state.selectedItems)
        items.forEach(i => next.add(i.Id))
        return new Map(prev).set(path, { ...state, selectedItems: next })
      })
      return path
    })
  }, [])

  const clearSelection = useCallback(() => {
    setActiveDevicePath(path => {
      if (!path) return path
      setDeviceStates(prev => {
        const state = prev.get(path) ?? EMPTY
        return new Map(prev).set(path, { ...state, selectedItems: new Set() })
      })
      return path
    })
  }, [])

  return {
    activeDevicePath,
    selectedTracks: activeState.selectedItems,
    previouslySyncedItems: activeState.syncedItems,
    activateDevice,
    updateSyncedItems,
    removeDevice,
    toggleItem,
    selectItems,
    clearSelection,
  }
}
