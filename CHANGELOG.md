# Changelog

## 0.1.0.4

Adds a Jellyfin Plugin Pages home-menu entry, matching the integration style used by Jellyfin Enhanced.

Fixes:

- Restores the plugin settings page as the only Jellyfin dashboard plugin page.
- Adds `Request` to Plugin Pages configuration when that integration is installed.
- Keeps Jellyfin Web `index.html` injection as a fallback when the web root is writable.

## 0.1.0.3

Restores the dashboard settings page and moves the user-facing navigation to the Jellyfin Web loader.

Fixes:

- The plugin `Settings` button opens settings again instead of the request page.
- The request entry is injected into Jellyfin Web on plugin startup, similar to Jellyfin Enhanced.
- The dashboard-only `Request` plugin page from `0.1.0.1` and `0.1.0.2` has been removed.

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
