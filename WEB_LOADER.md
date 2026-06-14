# Jellyfin Web Navigation Loader

Jellyfin server plugins can serve backend APIs and plugin configuration pages. Jellyfin Web does not currently provide a stable public plugin API for adding permanent top-level navigation items.

This plugin serves a small entry script:

```text
/JellyseerrBridge/Assets/request-entry.js
```

When loaded by Jellyfin Web, it adds:

- a top `Request` tab beside Home and Favourites
- a side-menu `Requests` item

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
