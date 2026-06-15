# Jellyfin Web Navigation Loader

Jellyfin server plugins can serve backend APIs and plugin configuration pages. Jellyfin Web navigation requires adding a small loader tag to Jellyfin Web's `index.html`.

This repository provides installer and uninstaller scripts so users do not need to edit `index.html` by hand.

This plugin serves a small entry script:

```text
/JellyseerrBridge/Assets/request-entry.js
```

When loaded by Jellyfin Web, it adds:

- a top `Request` tab beside Home and Favourites
- a side-menu `Requests` item

## Recommended Install

Run this on the Jellyfin server after installing the Jellyseerr Bridge plugin:

```bash
curl -fsSLO https://raw.githubusercontent.com/monjaka/jellyfin-plugin-jellyseerr-bridge/main/scripts/install-web-loader.sh
less install-web-loader.sh
sudo bash install-web-loader.sh
sudo systemctl restart jellyfin
```

The installer:

- finds common Jellyfin Web `index.html` locations
- backs up `index.html` before editing it
- skips the edit if the loader is already present

To remove the loader:

```bash
curl -fsSLO https://raw.githubusercontent.com/monjaka/jellyfin-plugin-jellyseerr-bridge/main/scripts/uninstall-web-loader.sh
less uninstall-web-loader.sh
sudo bash uninstall-web-loader.sh
sudo systemctl restart jellyfin
```

## Manual Loader Tag

On a standard Linux Jellyfin install, Jellyfin Web is commonly under:

```text
/usr/share/jellyfin/web
```

Back up `index.html`:

```bash
sudo cp /usr/share/jellyfin/web/index.html /usr/share/jellyfin/web/index.html.bak.jellyseerrbridge
```

Add this before `</body>`:

```html
<script defer src="/JellyseerrBridge/Assets/request-entry.js"></script>
```

Restart Jellyfin, then hard refresh the browser.

## Upgrade Note

Jellyfin Web updates can replace `index.html`. If the navigation item disappears after a Jellyfin update, re-add the loader tag.

The actual navigation behavior lives inside the plugin-served script, so plugin updates can change the navigation behavior without manually editing this script.

## Direct Link Fallback

The request page still works without the loader:

```text
https://your-jellyfin-domain/JellyseerrBridge/Page
```
