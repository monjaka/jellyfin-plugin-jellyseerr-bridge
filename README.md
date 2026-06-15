# Jellyseerr Bridge for Jellyfin

Jellyseerr Bridge adds a Jellyseerr-powered request page to Jellyfin without exposing the Jellyseerr API key to browsers.

## Standard Install

1. In Jellyfin, open Dashboard -> Plugins -> Repositories.
2. Add this repository:

   ```text
   Name: Jellyseerr Bridge
   URL: https://raw.githubusercontent.com/monjaka/jellyfin-plugin-jellyseerr-bridge/main/manifest.json
   ```

3. Open Dashboard -> Plugins -> Catalog.
4. Install `Jellyseerr Bridge`.
5. Restart Jellyfin.
6. Open Dashboard -> Plugins -> Jellyseerr Bridge and configure:

   - Jellyseerr Base URL
   - Jellyseerr API Key
   - Enable Request Submission

7. Install the Jellyfin Web navigation button:

   ```bash
   curl -fsSLO https://raw.githubusercontent.com/monjaka/jellyfin-plugin-jellyseerr-bridge/main/scripts/install-web-loader.sh
   sudo bash install-web-loader.sh
   sudo systemctl restart jellyfin
   ```

8. Hard refresh Jellyfin in your browser.

The request page is also available directly:

```text
https://your-jellyfin-domain/JellyseerrBridge/Page
```

## Updating After Jellyfin Updates

Jellyfin updates can replace Jellyfin Web's `index.html`. If the `Request` menu item disappears, rerun:

```bash
curl -fsSLO https://raw.githubusercontent.com/monjaka/jellyfin-plugin-jellyseerr-bridge/main/scripts/install-web-loader.sh
sudo bash install-web-loader.sh
sudo systemctl restart jellyfin
```

## Uninstall

Remove the Jellyfin Web navigation button:

```bash
curl -fsSLO https://raw.githubusercontent.com/monjaka/jellyfin-plugin-jellyseerr-bridge/main/scripts/uninstall-web-loader.sh
less uninstall-web-loader.sh
sudo bash uninstall-web-loader.sh
sudo systemctl restart jellyfin
```

Then uninstall `Jellyseerr Bridge` from Dashboard -> Plugins.

## Features

- Jellyfin-hosted request page for search, discovery categories, and media requests.
- Movie and series detail views, including per-season request buttons for series.
- Discovery filters for rating, release date, and major streaming providers.
- Sorting by release date, title, and rating.
- Jellyseerr-provided availability and request status drives request buttons.
- Server-side forwarding to Jellyseerr using a configured Jellyseerr URL and API key.
- Narrow request API that validates input instead of acting as an open proxy.
- Plugin-served Jellyfin Web entry script for a `Request` tab and side-menu `Requests` entry.

## Security Model

The Jellyseerr API key is stored only in Jellyfin's plugin configuration and is used server-side by the plugin.

Browsers call Jellyfin plugin endpoints. They never receive the Jellyseerr API key.

Request submission is disabled by default. An administrator must explicitly enable it in plugin configuration.

The request endpoint accepts only:

- `mediaType`: `movie` or `tv`
- `mediaId`: TMDB ID
- `is4k`: optional boolean
- `seasons`: optional `"all"` or a list of season numbers for TV

It does not forward arbitrary request bodies to Jellyseerr.

## Build From Source

Install the .NET SDK required by the target Jellyfin version, then:

```bash
dotnet restore
dotnet build -c Release
```

The plugin DLL will be under:

```text
src/Jellyfin.Plugin.JellyseerrBridge/bin/Release/
```

For more detail, see [INSTALL.md](INSTALL.md), [WEB_LOADER.md](WEB_LOADER.md), and [RELEASE.md](RELEASE.md).
