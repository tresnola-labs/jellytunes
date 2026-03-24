# JellyTunes Sync Module Documentation

## Overview

This module provides a **testable, UI-agnostic synchronization core** for JellyTunes. It handles all operations related to syncing music from a Jellyfin server to a local destination (USB drive, external HDD, etc.).

## Architecture

```
src/sync/
├── index.ts           # Public API exports
├── types.ts           # TypeScript interfaces
├── sync-core.ts       # Main orchestration (SyncCore)
├── sync-config.ts     # Configuration validation
├── sync-api.ts        # Jellyfin API client
├── sync-files.ts      # Filesystem operations
├── sync-progress.ts   # Progress events & cancellation
└── sync.test.ts       # Unit tests
```

## Design Principles

### 1. **Dependency Injection**
All external dependencies (API client, filesystem, converter) are injected, making unit testing trivial:

```typescript
const mockApi = createMockApiClient({ ... });
const mockFs = createMockFileSystem();
const mockConverter = createMockConverter();

const core = createTestSyncCore(config, {
  api: mockApi,
  fs: mockFs,
  converter: mockConverter,
});
```

### 2. **Pure Functions for Configuration**
Config validation and normalization use pure functions with no side effects:

```typescript
const result = validateSyncConfig({ serverUrl, apiKey, userId });
if (!result.valid) {
  console.error(result.errors);
}
```

### 3. **Event-Driven Progress**
Progress updates are emitted through a callback pattern, decoupling UI from sync logic:

```typescript
const result = await syncCore.sync(input, (progress) => {
  console.log(`${progress.phase}: ${progress.current}/${progress.total}`);
});
```

### 4. **Cancellable Operations**
Long-running operations can be cancelled:

```typescript
// In UI component
const handleCancel = () => syncCore.cancel();

// Sync will throw SyncCancelledError and return partial result
```

## Usage Examples

### Basic Sync

```typescript
import { createSyncCore, SyncConfig } from './sync';

const config: SyncConfig = {
  serverUrl: 'https://jellyfin.example.com',
  apiKey: 'your-api-key-here',
  userId: 'user-id-here',
};

const syncCore = createSyncCore(config);

// Build item types map from UI selection
const itemTypes = new Map([
  ['album-id-1', 'album'],
  ['album-id-2', 'album'],
  ['playlist-id-1', 'playlist'],
]);

const result = await syncCore.sync({
  itemIds: ['album-id-1', 'album-id-2', 'playlist-id-1'],
  itemTypes,
  destinationPath: '/Volumes/USB/music',
  options: {
    convertToMp3: true,
    bitrate: '192k',
    skipExisting: true,
    preserveStructure: true,
  }
}, (progress) => {
  console.log(progress);
});

if (result.success) {
  console.log(`Synced ${result.tracksCopied} tracks`);
} else {
  console.error('Errors:', result.errors);
}
```

### With Progress in React

```typescript
import { useState, useCallback } from 'react';
import { createSyncCore, SyncProgress } from './sync';

function SyncComponent({ config, selectedItems, destinationPath }) {
  const [progress, setProgress] = useState<SyncProgress | null>(null);
  const [syncCore] = useState(() => createSyncCore(config));
  
  const handleSync = useCallback(async () => {
    const itemTypes = new Map(
      selectedItems.map(item => [item.id, item.type])
    );
    
    const result = await syncCore.sync(
      {
        itemIds: selectedItems.map(i => i.id),
        itemTypes,
        destinationPath,
        options: { convertToMp3: true },
      },
      setProgress // React setState is a valid callback
    );
    
    if (result.success) {
      alert(`Sync complete: ${result.tracksCopied} tracks`);
    }
  }, [syncCore, selectedItems, destinationPath]);
  
  return (
    <div>
      {progress && (
        <div>
          <p>Phase: {progress.phase}</p>
          <p>Progress: {progress.current}/{progress.total}</p>
          {progress.currentTrack && <p>Track: {progress.currentTrack}</p>}
        </div>
      )}
      <button onClick={handleSync}>Start Sync</button>
    </div>
  );
}
```

### Estimating Sync Size

```typescript
const itemTypes = new Map(selectedItems.map(i => [i.id, i.type]));
const estimate = await syncCore.estimateSize(
  selectedItems.map(i => i.id),
  itemTypes
);

console.log(`Will sync ${estimate.trackCount} tracks`);
console.log(`Total size: ${formatSize(estimate.totalBytes)}`);
console.log('By format:', Object.fromEntries(estimate.formatBreakdown));
```

### Validating Destination

```typescript
const validation = await syncCore.validateDestination('/Volumes/USB');

if (!validation.valid) {
  console.error('Invalid destination:', validation.errors);
}

if (validation.freeSpace !== undefined) {
  console.log(`Free space: ${formatSize(validation.freeSpace)}`);
}
```

## Testing

The module is designed for **100% unit test coverage** without requiring:

- Running Jellyfin server
- Real filesystem access
- FFmpeg installation

### Running Tests

```bash
# Run all tests
pnpm test:unit

# Run with coverage
pnpm test:unit --coverage

# Watch mode
pnpm test:unit --watch
```

### Test Structure

```typescript
import { describe, it, expect, vi } from 'vitest';
import { createTestSyncCore } from './sync-core';
import { createMockApiClient } from './sync-api';
import { createMockFileSystem } from './sync-files';
import { createMockConverter } from './sync-files';

describe('Sync Feature', () => {
  it('should do something', async () => {
    // Arrange
    const mockApi = createMockApiClient({
      getAlbumTracks: async () => [{ id: '1', name: 'Track', ... }],
    });
    
    const core = createTestSyncCore(config, {
      api: mockApi,
      fs: createMockFileSystem(),
      converter: createMockConverter(),
    });
    
    // Act
    const result = await core.sync({ ... });
    
    // Assert
    expect(result.success).toBe(true);
  });
});
```

## Module Reference

### `types.ts`

All public interfaces and types:

- `SyncConfig` - Server configuration
- `SyncInput` - Sync operation input
- `SyncOptions` - Optional sync settings
- `SyncProgress` - Progress event data
- `SyncResult` - Sync operation result
- `ItemType` - 'artist' | 'album' | 'playlist'
- `TrackInfo` - Individual track information

### `sync-core.ts`

Main orchestration module:

- `createSyncCore(config, dependencies?)` - Create sync instance
- `SyncCore.sync(input, onProgress?)` - Execute sync
- `SyncCore.validateDestination(path)` - Check destination validity
- `SyncCore.estimateSize(itemIds, itemTypes)` - Calculate sync size

### `sync-config.ts`

Configuration utilities:

- `validateSyncConfig(config)` - Validate configuration
- `normalizeServerUrl(url)` - Clean up server URL
- `resolveSyncOptions(options?)` - Merge with defaults

### `sync-api.ts`

Jellyfin API client:

- `createApiClient(config)` - Production client
- `createMockApiClient(overrides?)` - Test client

### `sync-files.ts`

Filesystem operations:

- `createNodeFileSystem()` - Production FS
- `createMockFileSystem()` - Test FS
- `createFFmpegConverter()` - Production converter
- `createMockConverter()` - Test converter
- `validateDestination(path, fs)` - Check path validity

### `sync-progress.ts`

Progress & cancellation:

- `createProgressEmitter()` - Event emitter
- `createCancellationController()` - Cancellation token
- `PhaseManager` - Phase transition helper

## Implementation Checklist for GizmoDev

### Phase 1: Core Module (COMPLETED)
- [x] Define TypeScript interfaces (`types.ts`)
- [x] Implement configuration validation (`sync-config.ts`)
- [x] Create Jellyfin API client (`sync-api.ts`)
- [x] Create filesystem abstraction (`sync-files.ts`)
- [x] Create progress system (`sync-progress.ts`)
- [x] Create main orchestration (`sync-core.ts`)
- [x] Write comprehensive tests (`sync.test.ts`)

### Phase 2: UI Integration
- [ ] Replace inline sync logic in `App.tsx` with `SyncCore`
- [ ] Use progress callbacks for UI updates
- [ ] Integrate cancellation with UI button

### Phase 3: Error Handling
- [ ] Add error boundary in React components
- [ ] Display user-friendly error messages
- [ ] Add retry mechanism for network failures

### Phase 4: Performance
- [ ] Add parallel file copying
- [ ] Implement batch API requests
- [ ] Add disk space pre-check

### Phase 5: Features
- [ ] Add sync history/persistence
- [ ] Add incremental sync (checksums)
- [ ] Add playlist preservation
- [ ] Add sync profiles

## Example Integration in Current Codebase

### Before (inline in App.tsx)

```typescript
// Scattered throughout App.tsx
async function fetchTracksForSync(ids: string[]) { ... }
async function syncTracks(options) { ... }
function handleStartSync() { ... }
```

### After (using SyncCore)

```typescript
// App.tsx
import { createSyncCore } from './sync';

function App() {
  const [syncCore] = useState(() => createSyncCore({
    serverUrl: config.url,
    apiKey: config.apiKey,
    userId: config.userId,
  }));
  
  const handleStartSync = async () => {
    const result = await syncCore.sync({
      itemIds: Array.from(selectedTracks),
      itemTypes: getItemTypesFromIndex(itemTypeIndex),
      destinationPath: syncFolder,
      options: { convertToMp3, bitrate: mp3Bitrate },
    }, (progress) => {
      setSyncProgress(progress);
    });
    
    if (result.success) {
      showToast(`${result.tracksCopied} tracks synced`);
    } else {
      showToast(result.errors.join('\n'));
    }
  };
}
```

## Migration Notes

The sync module is **backward compatible** with the existing codebase. You can:

1. **Hybrid approach**: Use the module for new features while keeping existing logic
2. **Gradual replacement**: Migrate one sync function at a time
3. **Full replacement**: Remove all inline sync logic and use only the module

The module does **not** modify:
- React state management
- UI rendering
- LocalStorage
- Electron IPC

It only handles:
- Jellyfin API communication
- File operations
- Progress reporting
- Error handling