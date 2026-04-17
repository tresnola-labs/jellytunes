# Changelog

## [0.3.0] — 2026-04-17

### Added
- **Sync preview modal** — before starting a sync, a modal shows a full breakdown of tracks to add, update, and remove, with color-coded rows (violet/yellow/green/red) and total size.
- **Out-of-sync detection** — the engine now detects tracks that have changed on the server since the last sync and marks them as "will update", not just new.
- **Storage bar redesign** — new visual indicator breaks down device space into synced music / selected / other files / free. Turns red when over capacity.
- **Estimated sizes with `~` prefix** — when MP3 conversion is active, sizes in the storage bar and preview modal are marked as approximate (`~120 MB (estimated)`).
- **Format-aware bitrate fallback** — size estimation picks a sensible default bitrate depending on the source format (FLAC vs existing MP3).
- **Persistent convert settings per destination** — the MP3 toggle and bitrate choice are saved per device and restored on next activation.
- **Preferences module** — durable settings storage wired into the main process.
- **Anonymous opt-in analytics** — lightweight usage metrics routed through a Cloudflare Worker proxy; can be toggled in the About modal.
- **Event-based USB watcher** — device detection rebuilt with OS events, retry logic, and a polling fallback; more reliable on all platforms.
- **Animated Selected size** — the "selected" size indicator animates during track loading so the user sees progress immediately.
- **Phase-aware sync progress** — the sticky footer progress bar now tracks individual sync phases (fetching / copying / converting / validating) with byte-level progress.

### Fixed
- Fixed FFmpeg argument order when embedding cover art into converted MP3s.
- Fixed stale closure in MP3 convert/bitrate handler — settings now captured correctly.
- Fixed negative sign on "will remove" count in sync preview modal.
- Fixed UI lockout during sync — Cancel is correctly the only blocked interaction; rest of the UI remains accessible.
- Fixed device storage size showing 0 on activation (itemTracks now populated from DB).
- Fixed skeleton flash when navigating library → sync tab and on device re-activation.
- Fixed selected size and preview track count for newly selected items on activation.
- Fixed track loading: tracks are now fetched eagerly on device activation, not lazily at sync time.
- Fixed About modal analytics toggle not matching the sync panel toggle style.
- Fixed `addDestination` returning a stale closure instead of the fresh destination object.

### Changed
- Migrated to Material Design 3 design tokens and typography scale.
- Sync preview modal and storage bar share a unified color language: violet = new, yellow = will-update, green = already-synced, red = will-remove.
- Folder removal redesigned with inline confirmation (no extra modal).
- Sync button shows a loading state while the preview is being computed.
- About modal now links to the privacy policy.
- `handleStartSync` no longer re-fetches tracks or calls `analyzeDiff` — data is pre-loaded at activation time.

### Internal
- Strict TypeScript configuration enabled across the project.
- `synced_tracks` DB schema improved; `columnExists` helper added; audio-format constants extracted.
- Vitest renderer infrastructure added; component and hook unit tests wired up.
- GitHub Actions CI/CD workflows updated.
