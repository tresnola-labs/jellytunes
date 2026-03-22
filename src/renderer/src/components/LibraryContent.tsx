import { useRef, useState, useEffect } from 'react'
import { Loader2, X, HardDrive, Folder, Search } from 'lucide-react'
import { LibraryItem } from './LibraryItem'
import type { LibraryTab, Artist, Album, Playlist, PaginationState } from '../appTypes'

type SyncFilter = 'all' | 'selected' | 'unselected'

interface SearchResults {
  artists: Artist[]
  albums: Album[]
  playlists: Playlist[]
}

interface LibraryContentProps {
  activeLibrary: LibraryTab
  artists: Artist[]
  albums: Album[]
  playlists: Playlist[]
  pagination: PaginationState
  selectedTracks: Set<string>
  previouslySyncedItems: Set<string>
  isLoadingMore: boolean
  error: string | null
  onToggle: (id: string) => void
  onSelectAll: () => void
  onClearSelection: () => void
  onClearError: () => void
  onLoadMore: (type: LibraryTab) => void
  selectionSummary: string
  contentScrollRef: React.RefObject<HTMLDivElement>
  activeDeviceName?: string | null
  isUsbDevice?: boolean
  onGoToDevice?: () => void
  serverUrl?: string
  // Search (managed by parent, API-driven)
  searchQuery: string
  onSearchChange: (q: string) => void
  searchResults: SearchResults | null
  isSearching: boolean
  searchError?: string | null
}

export function LibraryContent({
  activeLibrary,
  artists,
  albums,
  playlists,
  pagination,
  selectedTracks,
  previouslySyncedItems,
  isLoadingMore,
  error,
  onToggle,
  onSelectAll,
  onClearSelection,
  onClearError,
  onLoadMore,
  selectionSummary,
  contentScrollRef,
  activeDeviceName,
  isUsbDevice,
  onGoToDevice,
  serverUrl,
  searchQuery,
  onSearchChange,
  searchResults,
  isSearching,
  searchError,
}: LibraryContentProps): JSX.Element {
  const sentinelRef = useRef<HTMLDivElement>(null)
  const [syncFilter, setSyncFilter] = useState<SyncFilter>('all')
  // Snapshot of selectedTracks IDs taken when the filter is applied — prevents items from
  // disappearing live as the user selects/deselects them within the filtered view
  const [filterSnapshot, setFilterSnapshot] = useState<Set<string>>(new Set())
  const [noDeviceHint, setNoDeviceHint] = useState(false)

  const isSearchActive = searchQuery.length >= 2

  // Take a snapshot when filter changes, reset to 'all' when selection is cleared
  useEffect(() => {
    if (selectedTracks.size === 0) { setSyncFilter('all'); return }
  }, [selectedTracks.size])

  const applyFilter = (f: SyncFilter) => {
    setSyncFilter(f)
    setFilterSnapshot(new Set(selectedTracks))
  }

  // Intersection observer — disabled when search active or sync filter applied
  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel || isSearchActive || syncFilter !== 'all') return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting && !isLoadingMore) onLoadMore(activeLibrary) },
      { threshold: 0.1 }
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [activeLibrary, isLoadingMore, isSearchActive, syncFilter, onLoadMore])

  const handleToggle = (id: string) => {
    if (!activeDeviceName) {
      setNoDeviceHint(true)
      setTimeout(() => setNoDeviceHint(false), 2500)
      return
    }
    onToggle(id)
  }

  // Filter uses snapshot so items don't vanish mid-interaction
  const applySyncFilter = <T extends { Id: string }>(items: T[]) => {
    if (syncFilter === 'selected') return items.filter(i => filterSnapshot.has(i.Id))
    if (syncFilter === 'unselected') return items.filter(i => !filterSnapshot.has(i.Id))
    return items
  }

  const displayArtists = isSearchActive ? applySyncFilter(searchResults?.artists ?? []) : applySyncFilter(artists)
  const displayAlbums = isSearchActive ? applySyncFilter(searchResults?.albums ?? []) : applySyncFilter(albums)
  const displayPlaylists = isSearchActive ? applySyncFilter(searchResults?.playlists ?? []) : applySyncFilter(playlists)

  const tabLabel = activeLibrary === 'artists' ? 'artists' : activeLibrary === 'albums' ? 'albums' : 'playlists'
  const currentItems = activeLibrary === 'artists' ? displayArtists : activeLibrary === 'albums' ? displayAlbums : displayPlaylists
  const hasResults = currentItems.length > 0
  const currentPagination = pagination[activeLibrary]

  return (
    <main className="flex-1 flex flex-col overflow-hidden">

      {/* ── Sticky header ─────────────────────────────────── */}
      <div className="flex-shrink-0 border-b border-jf-border relative">

        {/* No-device hint toast */}
        {noDeviceHint && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 px-4 py-2 bg-jf-bg-mid border border-jf-purple/40 rounded-lg text-sm text-jf-purple-light shadow-lg animate-pulse pointer-events-none">
            Select a device in the sidebar first
          </div>
        )}

        {/* Device context banner */}
        {activeDeviceName && (
          <button
            onClick={onGoToDevice}
            className="flex items-center gap-2 w-full px-4 py-2 bg-jf-purple/10 border-b border-jf-purple/20 text-sm text-jf-purple-light hover:bg-jf-purple/15 transition-colors text-left"
          >
            {isUsbDevice
              ? <HardDrive className="w-3.5 h-3.5 flex-shrink-0" />
              : <Folder className="w-3.5 h-3.5 flex-shrink-0" />
            }
            <span>Selecting for <strong>{activeDeviceName}</strong></span>
            <span className="ml-auto text-jf-purple/60 text-xs">View device →</span>
          </button>
        )}

        <div className="px-4 pt-3 pb-2 space-y-2">
          {/* Title + sync filter */}
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold capitalize">{activeLibrary}</h2>
            {selectedTracks.size > 0 && (
              <div className="flex gap-1 text-xs bg-[#1e2836] rounded-lg p-1">
                {(['all', 'selected', 'unselected'] as SyncFilter[]).map(f => (
                  <button
                    key={f}
                    data-testid={`sync-filter-${f}`}
                    onClick={() => applyFilter(f)}
                    className={`px-3 py-1 rounded-md transition-colors ${syncFilter === f ? 'bg-jf-purple/40 text-jf-purple-light' : 'text-zinc-400 hover:text-zinc-200'}`}
                  >
                    {f === 'all' ? 'All' : f === 'selected' ? 'Selected' : 'Not selected'}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
            <input
              data-testid="search-input"
              type="text"
              placeholder={`Search ${tabLabel}...`}
              value={searchQuery}
              onChange={e => onSearchChange(e.target.value)}
              className="w-full bg-[#1a2232] border border-jf-border rounded-lg pl-10 pr-9 py-1.5 text-sm focus:outline-none focus:border-jf-purple"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Selection controls */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-500">
              {selectedTracks.size > 0 ? selectionSummary : 'None selected'}
            </span>
            <div className="flex gap-3">
              {!isSearchActive && (
                <button data-testid="select-all-button" onClick={activeDeviceName ? onSelectAll : () => { setNoDeviceHint(true); setTimeout(() => setNoDeviceHint(false), 2500) }} className="text-xs text-jf-purple hover:text-jf-purple-light">
                  Select all
                </button>
              )}
              {selectedTracks.size > 0 && (
                <button data-testid="clear-selection-button" onClick={onClearSelection} className="text-xs text-zinc-500 hover:text-zinc-300">
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Scrollable list ────────────────────────────────── */}
      <div ref={contentScrollRef} className="flex-1 overflow-auto px-4 py-2">

        {/* Error */}
        {error && (
          <div className="mb-3 p-3 bg-red-900/50 border border-red-700 rounded-lg flex items-center gap-2 text-red-300">
            <X className="w-4 h-4 flex-shrink-0" />
            <span className="text-sm">{error}</span>
            <button onClick={onClearError} className="ml-auto text-xs hover:text-red-200">Dismiss</button>
          </div>
        )}

        {isSearchActive && isSearching ? (
          <div data-testid="library-loading" className="flex items-center gap-2 text-zinc-500 text-sm py-8 justify-center">
            <Loader2 className="w-4 h-4 animate-spin" />
            Searching {tabLabel}...
          </div>
        ) : isSearchActive && searchError ? (
          <p className="text-red-400 text-sm py-8 text-center">
            Search failed: {searchError}
          </p>
        ) : isSearchActive && !hasResults ? (
          <p data-testid="library-empty" className="text-zinc-500 text-sm py-8 text-center">
            No {tabLabel} found for "{searchQuery}"
          </p>
        ) : (
          <div data-testid="library-content" className="grid gap-0.5">
            {activeLibrary === 'artists' && displayArtists.map((artist, idx) => (
              <LibraryItem
                key={artist.Id || `artist-${idx}`}
                item={artist}
                type="artist"
                isSelected={selectedTracks.has(artist.Id)}
                wasSynced={previouslySyncedItems.has(artist.Id)}
                onToggle={handleToggle}
                serverUrl={serverUrl}
              />
            ))}

            {activeLibrary === 'albums' && displayAlbums.map((album, idx) => (
              <LibraryItem
                key={album.Id || `album-${idx}`}
                item={album}
                type="album"
                isSelected={selectedTracks.has(album.Id)}
                wasSynced={previouslySyncedItems.has(album.Id)}
                onToggle={handleToggle}
                serverUrl={serverUrl}
              />
            ))}

            {activeLibrary === 'playlists' && displayPlaylists.map((playlist, idx) => (
              <LibraryItem
                key={playlist.Id || `playlist-${idx}`}
                item={playlist}
                type="playlist"
                isSelected={selectedTracks.has(playlist.Id)}
                wasSynced={previouslySyncedItems.has(playlist.Id)}
                onToggle={handleToggle}
                serverUrl={serverUrl}
              />
            ))}

            {/* Infinite scroll sentinel */}
            {!isSearchActive && (
              <div ref={sentinelRef} className="h-8 flex items-center justify-center">
                {isLoadingMore && (
                  <div className="flex items-center gap-2 text-zinc-500 text-xs">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Loading more...
                  </div>
                )}
                {!isLoadingMore && currentPagination.hasMore && (
                  <div className="text-zinc-700 text-xs">· · ·</div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  )
}
