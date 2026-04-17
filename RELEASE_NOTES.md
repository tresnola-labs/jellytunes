## JellyTunes 0.3.0 — Know before you sync

This release is all about confidence and clarity. You'll always know what's about to
happen, how much space it'll take, and whether your device can handle it — before
pressing Sync.

### See exactly what will sync, before it starts
A new **Sync Preview** shows a full breakdown of every track that will be added,
updated, or removed — color-coded so it's instant to read. No more surprises.

### Your library stays in sync, not just up to date
JellyTunes now detects when a track you already synced has **changed on the server**
(edited tags, re-encoded, etc.) and automatically queues it for a refresh. Your
device stays a true mirror of your Jellyfin library.

### A smarter storage bar
The redesigned storage bar breaks down your device space in real time: synced music,
your current selection, other files, and free space — all at a glance. If your
selection is too large, the bar turns red and warns you before you even hit Sync.
When MP3 conversion is on, sizes are shown as estimates (`~`) so you always have a
realistic picture.

### Settings that stick
Convert to MP3? 192k? JellyTunes now **remembers your preferences per device**. Plug
in the same drive next week and everything is already configured the way you left it.

### A redesigned interface that feels intentional
The UI has been rebuilt on a proper **Material Design 3** foundation — consistent
typography scale, coherent color tokens, and a visual language that holds together
across every screen. This isn't a cosmetic refresh; it's the difference between an
app that looks assembled and one that looks designed.

Every piece of information now has a clear visual weight: active states, size
indicators, sync status rows, and progress phases all communicate through color and
hierarchy rather than raw text.

### A more polished experience throughout
- Cleaner folder removal with inline confirmation (no extra modal)
- Sync button shows a loading indicator while the preview loads
- Smoother animations when loading track sizes
- More reliable device detection on all platforms

---

Full technical changelog: [CHANGELOG.md](CHANGELOG.md)
