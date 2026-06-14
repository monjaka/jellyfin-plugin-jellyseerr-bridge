# Jellyfin Web Loader Helper

Jellyfin server plugins do not have a stable public API for adding permanent Jellyfin Web navigation items.

The plugin itself serves the navigation entry script at:

```text
/JellyseerrBridge/Assets/request-entry.js
```

Loading that plugin asset from Jellyfin Web adds a `Request` tab and a side-menu `Requests` entry that open:

```text
/JellyseerrBridge/Page
```

This folder keeps a copy of the script as a helper for admins who want to inspect or adapt the loader behavior. The deployed version should come from the plugin asset endpoint so updates travel with the plugin package.
