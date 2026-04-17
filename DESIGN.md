# Design System Document: The Sonic Architect

## 1. Overview & Creative North Star
### The Creative North Star: "Technical Sophistication"
This design system is built for the "Technical Curator"—someone who values the precision of a media server with the fluid elegance of a high-end editorial spread. It moves beyond the generic "dark mode" by utilizing a deep, atmospheric palette and precise typography that maximizes data density without sacrificing readability.

We break the "template" look through **Tonal Layering**. Instead of using rigid borders to define space, we use shifts in light and depth. The layout is unapologetically technical, featuring high-contrast status indicators and rhythmic list-based structures that feel like a professional audio workstation.

---

## 2. Colors
The color palette is anchored in a deep charcoal-navy, providing a silent stage for vibrant purple accents that denote action and progress.

### Token Table

| Token | Hex | Role |
|---|---|---|
| `primary` | #cdbdff | High-visibility text on dark surfaces, focus rings |
| `primary_container` | #7c4dff | Active states, CTAs, checked toggles |
| `secondary_container` | #4e3b8c | CTA gradient endpoint |
| `tertiary_container` | #b55800 | Projected storage indicator |
| `surface` | #12121e | Main app background (Level 0) |
| `surface_container_low` | #1a1a27 | Sidebar, main content panels (Level 1) |
| `surface_container_high` | #252335 | Cards, hovered list items (Level 2) |
| `surface_container_highest` | #343341 | Tooltips, context menus, modal backdrops (Level 3) |
| `surface_bright` | #383845 | Rim-light highlights on container top edges |
| `on_surface` | #e5e0ef | Primary body text |
| `on_surface_variant` | #cac3d8 | Metadata text, secondary labels |
| `on_primary_container` | #ffffff | Text on primary_container backgrounds |
| `outline_variant` | #494455 | Structural borders (full opacity); ghost borders (50% opacity) |
| `error` | #cf6679 | Error text and borders |
| `error_container` | #3d1a22 | Error message backgrounds |
| `warning` | #e8a328 | Warning text |
| `warning_container` | #2e2006 | Warning message backgrounds |
| `success` | #4caf82 | Free space indicator, success states |

### The "No-Decorative-Border" Rule
**Explicit Instruction:** Solid borders for purely decorative sectioning are prohibited. Separation between panels and containers must be achieved through background color shifts. **Exception:** list items in views with more than ~30 rows may use a hairline divider at `outline_variant` 30% opacity — this preserves the editorial quality while giving the eye a consistent anchor in dense data.

Structural borders (sidebar edge, footer edge) and interactive borders (input fields, focus rings) are always permitted.

### The "Glass & Gradient" Rule
Floating non-task elements — search modals, context menus, tooltips — may use **Glassmorphism**: semi-transparent `surface_container_highest` with `backdrop-filter: blur(20px)`. Use only on elements that float over static content. **Do not apply to the sync progress bar** — it overlays active content and blur would impair legibility during a critical operation.

Main CTAs use a subtle linear gradient from `primary_container` (#7c4dff) to `secondary_container` (#4e3b8c).

---

## 3. Typography
We use **Inter** across the entire system. Inter is a wide humanist sans-serif optimized for screen legibility, with excellent tabular numeral support via `font-variant-numeric: tabular-nums` (critical for track counts, file sizes, and progress fractions). To achieve density on long titles, use `letter-spacing: -0.01em` and `text-overflow: ellipsis` — not a condensed variant.

| Token | Size | Usage |
|---|---|---|
| `headline-lg` | 1.5rem | Main panel headers (Library, Sync Configuration) |
| `headline-md` | 1.25rem | Sub-panel headers, modal titles |
| `title-md` | 1.125rem | Track titles, item names |
| `body-sm` | 0.8125rem | Metadata: artist, album, subtitle lines |
| `label-md` | 0.6875rem | Status badges, section labels (all-caps, heavy weight) |

* **Headlines** use negative letter-spacing (-0.02em) to feel authoritative.
* **`label-md`** all-caps is for static short labels (badges: "SYNCED", "NEW", section headers: "LIBRARY"). Do not use all-caps on dynamic CTA strings like "Sync to [Device Name]" — mixed case is required for readability on variable-length labels.
* **Metadata** (`body-sm`) uses `on_surface_variant` (#cac3d8) to create clear visual hierarchy.

---

## 4. Elevation & Depth
Hierarchy is achieved through **Tonal Layering**. Five depth levels cover all app contexts:

| Level | Token | Context |
|---|---|---|
| 0 | `surface` (#12121e) | Main app background |
| 1 | `surface_container_low` (#1a1a27) | Sidebar, main content area |
| 2 | `surface_container_high` (#252335) | Cards, hovered list items, storage bar |
| 3 | `surface_container_highest` (#343341) | Modal overlays, context menus |
| 4 | (glassmorphism) | Floating non-task elements (search modals) |

* **Ambient Shadows:** Floating elements (Level 3+) use a shadow: `0px 4px 32px 0px rgba(229, 224, 239, 0.08)`. X/Y offset of 0/4px gives directional depth without a "box shadow" appearance.
* **The "Ghost Border":** For input fields, use `outline_variant` (#494455) at **50% opacity minimum** to meet WCAG 1.4.11 non-text contrast (3:1). Full-opacity `outline_variant` is preferred. The 20% opacity variant is not accessible.
* **Focus Ring:** All interactive elements must show a `focus-visible` ring: 2px solid `primary` (#cdbdff), 2px offset. Never suppress focus rings.

---

## 5. Components

### Buttons
* **Primary:** Gradient background (`primary_container` → `secondary_container`), `md` (0.75rem) roundedness. Text: `on_primary_container`. Disabled: flat `surface_container_highest` background, `on_surface_variant` text at 50% opacity.
* **Secondary/Tertiary:** Transparent background, transparent border (turns to `ghost-border` on hover). `primary` text. The transparent default border must be declared explicitly (`border border-transparent`) so the element does not shift size on hover.
* **Focus:** `focus-visible` ring as defined in §4.

### Progress — Sync Operation
The sync progress component is distinct from the storage bar. It must expose the full `SyncProgress` state:

* **Phase label:** Text indicator of current phase — `fetching` / `copying` / `converting` / `validating` / `complete` / `error`. Use `label-md` all-caps.
* **Item counter:** `current / total` (e.g., "247 / 1,200") in `on_surface` text.
* **Current filename:** Truncated track name being processed, `body-sm` in `on_surface_variant`.
* **Progress bar:** Filled portion gradient of `primary_container`; unfilled portion `surface_container_highest`. Indeterminate (fetching phase): animated shimmer between `surface_container_high` and `surface_container_highest`.
* **Bytes transferred:** `bytesProcessed / totalBytes` displayed as human-readable sizes when available.
* **Cancelling state:** When cancel is requested but a conversion is in progress, show "Cancelling…" phase label until the current file finishes.
* **Failed tracks:** If `tracksFailed > 0`, show an inline warning badge during and after the operation.

### Progress — Storage Bar
Separate from sync operation progress. Shows device space at a glance. Three segments in order:

* **Other** (non-audio used space — least important): `secondary_container` (#4e3b8c) fill. Dark purple; clearly distinguishable from the unfilled background but less prominent than the audio segment.
* **Audio** (synced or estimated music — most important): `primary_container` (#7c4dff) fill. Brand purple; creates clear contrast against the green Free segment. Must have a minimum rendered width of 1% so it remains visible when the synced library is small relative to total device capacity.
* **Free Space:** `success` (#4caf82) fill.
* **Unfilled:** `surface_container_highest`.

Must include text labels for each segment (WCAG 1.4.1 — do not rely on color alone).

### List Items
* **Structure:** In views with fewer than ~30 items, use `0.5rem` vertical gap between items with no divider. In views with 30+ items (artist/album/playlist lists), use a hairline divider: `border-b` at `outline_variant` 30% opacity.
* **States:**
  - Default: `surface_container_low` background
  - Hover: background transitions to `surface_container_high` (150ms ease)
  - Selected: `primary` left-accent bar (4px wide) + `surface_container_high` background
  - Disabled: `on_surface_variant` at 50% opacity, no hover effect
  - Focus: `focus-visible` ring (see §4)

### Toggle Switches
* **Unchecked:** `surface_container_highest` track, `outline_variant` thumb.
* **Checked:** `primary_container` track, `on_primary_container` thumb.
* **Transition:** 150ms ease-out.
* **Disabled:** Both states at 50% opacity, `cursor-not-allowed`.

### Input Fields
* Background: `surface_container_low`. Corner radius: 0.5rem.
* Border: `outline_variant` (#494455) full opacity by default; `primary` on focus.
* Placeholder: `on_surface_variant` at 50% opacity.
* Error state: `error` (#cf6679) border, `error_container` background tint.
* Focus: `focus-visible` ring (see §4).

### Empty States
Each distinct empty scenario requires its own treatment — never show a blank panel:

* **No items selected for sync:** Icon + "Select artists, albums, or playlists from the library to get started."
* **No search results:** "No results for '[query]'."
* **No devices connected:** Sidebar shows "Add folder…" as the only destination option; no error message needed.
* **Initial / disconnected:** Handled by LoginScreen and ConnectingScreen — not an empty state.

### Error & Warning States
Use semantic tokens, not improvised opacity variants:

* **Error container:** `error_container` (#3d1a22) background, `error` (#cf6679) border and text.
* **Warning container:** `warning_container` (#2e2006) background, `warning` (#e8a328) border and text.
* Critical sync errors that require user action should use `on_surface` white text, not softened `on_surface_variant` — urgency must not be dampened by the palette rule.

### Loading / Skeleton States
* **Inline skeleton:** Pulsing block alternating between `surface_container_low` and `surface_container_high` (600ms ease-in-out). Use for library lists during initial load and pagination.
* **Spinner:** `primary` colored `Loader2` icon (24px) for triggered actions (refresh, sync start).
* **Storage bar loading:** Pulse on the bar track while device info is fetched.

---

## 6. Spacing
Base unit: **4px** (Tailwind default — spacing token `1` = 0.25rem = 4px).

Common values:
* `1` (4px) — icon-to-label gap, badge padding
* `2` (8px) — internal component padding (compact)
* `3` (12px) — internal component padding (standard)
* `4` (16px) — section margins, panel padding
* `5` (20px) — between major sections
* `6` (24px) — panel-level padding

Consistent spacing replaces decorative borders for section breathing room.

---

## 7. Do's and Don'ts

### Do
* **Do** use `surface_bright` (#383845) for subtle rim-light highlights on the top edge of elevated containers.
* **Do** prioritize high-contrast typography for critical status updates (e.g., "47 tracks failed").
* **Do** declare `focus-visible` rings on every interactive element — never suppress them.
* **Do** include text labels alongside color-coded indicators (storage bar, error states) to satisfy WCAG 1.4.1.
* **Do** use `font-variant-numeric: tabular-nums` on numeric displays (counters, file sizes, progress fractions).

### Don't
* **Don't** use pure black (#000000) or pure white (#FFFFFF) for decorative text. Use `surface` and `on_surface` tokens. Exception: critical error messages may use `on_primary_container` (#ffffff) for maximum urgency.
* **Don't** use standard box shadows. Shadows should look like ambient occlusion — low opacity, large blur, minimal spread.
* **Don't** suppress `border-r` or `border-t` on structural panel edges (sidebar, footer). Tonal separation alone is insufficient when adjacent panels have similar lightness values on uncalibrated displays.
* **Don't** apply glassmorphism (`backdrop-filter: blur`) to the sync progress component — it overlays an active list and the blur impairs legibility during a time-sensitive operation.
* **Don't** use all-caps on dynamic CTA strings. Reserve all-caps for static short labels (badges, section headers).
* **Don't** set ghost borders below 50% opacity on interactive elements — the 20% opacity variant fails WCAG 1.4.11.
