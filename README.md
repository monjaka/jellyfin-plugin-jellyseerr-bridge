# Jellyseerr Bridge for Jellyfin

Jellyseerr Bridge adds a Jellyseerr-powered request page to Jellyfin without exposing the Jellyseerr API key to browsers.

The plugin provides:

- A Jellyfin-hosted request page for search, discovery categories, and media requests.
- Movie and series detail views, including per-season request buttons for series.
- Discovery filters for rating, release date, and major streaming providers.
- Sorting by release date, title, and rating.
- Jellyseerr-provided availability and request status drives request buttons.
- Server-side forwarding to Jellyseerr using a configured Jellyseerr URL and API key.
- A narrow request API that validates input instead of acting as an open proxy.
- A plugin-served Jellyfin Web entry script for a `Request` tab and side-menu `Requests` entry.
- Automatic Plugin Pages home-menu registration when Jellyfin Plugin Pages is installed.
- Jellyfin Web loader injection fallback on plugin startup, with cleanup on uninstall.

## Quick Start

1. Build the plugin:

   ```bash
   dotnet restore
   dotnet build -c Release
   ```

2. Copy the files from `src/Jellyfin.Plugin.JellyseerrBridge/bin/Release/net9.0/` into a Jellyfin plugin folder, for example:

   ```text
   /var/lib/jellyfin/plugins/JellyseerrBridge_0.1.0.4/
   ```

3. Restart Jellyfin.

4. In Jellyfin Dashboard -> Plugins -> Jellyseerr Bridge, configure:

   - Jellyseerr Base URL
   - Jellyseerr API Key
   - Enable Request Submission

5. Open:

   ```text
   https://your-jellyfin-domain/JellyseerrBridge/Page
   ```

For the full walkthrough, see [INSTALL.md](INSTALL.md).

## Repository Install

Once the GitHub release and `manifest.json` are published, users can install from a Jellyfin plugin repository URL:

```text
https://raw.githubusercontent.com/monjaka/jellyfin-plugin-jellyseerr-bridge/main/manifest.json
```

See [REPOSITORY_INSTALL.md](REPOSITORY_INSTALL.md).

After Jellyfin restarts, the plugin registers a `Request` entry with Jellyfin Plugin Pages when available. The manual loader script is only a fallback:

```bash
curl -fsSLO https://raw.githubusercontent.com/monjaka/jellyfin-plugin-jellyseerr-bridge/main/scripts/install-web-loader.sh
less install-web-loader.sh
sudo bash install-web-loader.sh
sudo systemctl restart jellyfin
```

The loader installer backs up `index.html` before editing it and does nothing if the loader is already present.

## Security Model

The Jellyseerr API key is stored only in the Jellyfin plugin configuration and is used server-side by the plugin.

Browsers call Jellyfin plugin endpoints. They never receive the Jellyseerr API key.

Request submission is disabled by default. After installation, an administrator must explicitly enable it in plugin configuration.

The request endpoint accepts only:

- `mediaType`: `movie` or `tv`
- `mediaId`: TMDB ID
- `is4k`: optional boolean
- `seasons`: optional `"all"` or a list of season numbers for TV

It does not forward arbitrary request bodies to Jellyseerr.

## Jellyfin Web Integration

Jellyfin server plugins can provide backend APIs and admin configuration pages. To add a home-page side-menu entry, Jellyseerr Bridge writes a small Plugin Pages config entry, similar to Jellyfin Enhanced. It also attempts Jellyfin Web loader injection as a fallback.

For a stable plugin install, use:

```text
https://your-jellyfin-domain/JellyseerrBridge/Page
```

The plugin serves this entry script:

```text
/JellyseerrBridge/Assets/request-entry.js
```

Loading that script from Jellyfin Web adds a `Request` tab and side-menu `Requests` entry that point at the plugin-served request page. Jellyfin Web updates may replace `index.html`; the plugin attempts to re-inject the loader on the next Jellyfin restart.

Use [WEB_LOADER.md](WEB_LOADER.md) for the helper script and manual install options.

## Configuration

In Jellyfin Dashboard -> Plugins -> Jellyseerr Bridge:

- `Jellyseerr Base URL`: Example `http://192.168.9.10:5055`
- `Jellyseerr API Key`: From Jellyseerr settings
- `Enable Request Submission`: Must be enabled before users can submit requests
- `Allowed Jellyfin User IDs`: Optional allow-list. Empty means any authenticated Jellyfin user can use the request endpoint.

## Build

Install the .NET SDK required by the target Jellyfin version, then:

```bash
dotnet restore
dotnet build -c Release
```

The plugin DLL will be under:

```text
src/Jellyfin.Plugin.JellyseerrBridge/bin/Release/
```

## Install

Copy the built plugin output into Jellyfin's plugin directory, commonly:

```text
/var/lib/jellyfin/plugins/JellyseerrBridge/
```

Restart Jellyfin.

## Plugin Repository Manifest

This repo includes `manifest.template.json`. Release automation should replace the GitHub username, checksum, timestamp, target ABI, and download URL with real release values. See [RELEASE.md](RELEASE.md).

## Status

This is an initial shareable plugin scaffold based on a working local prototype. It still needs compilation against the exact Jellyfin server package versions you intend to support.
