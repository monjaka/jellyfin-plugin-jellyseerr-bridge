# Changelog

## 0.1.0.2

Aligns the plugin DLL assembly version with the Jellyfin package version.

Fixes:

- Jellyfin no longer reports the loaded plugin assembly as `1.0.0.0`.

## 0.1.0.1

Adds a built-in Jellyfin main-menu `Request` page using Jellyfin's plugin page system.

Fixes:

- Main-menu access no longer requires editing Jellyfin Web's `index.html`.
- Release tooling now emits Jellyfin-compatible MD5 package checksums.

## 0.1.0.0

Initial preview release.

Features:

- Jellyfin-hosted Jellyseerr request page.
- Search and discover media from Jellyseerr.
- Movie and TV detail pages.
- Per-season request buttons for TV.
- Jellyseerr-provided availability and request state.
- Filters for rating, release date, and major streaming providers.
- Sorting by release date, title, and rating.
- Infinite scroll for request results.
- Plugin-served Jellyfin Web navigation entry script.
- Server-side Jellyseerr API forwarding without exposing the API key to browsers.
