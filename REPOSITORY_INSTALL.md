# Plugin Repository Install

Jellyfin can install this plugin from a plugin repository URL after you publish:

- `manifest.json` in the GitHub repository
- `JellyseerrBridge_0.1.0.2.zip` as a GitHub release asset

## User Install Steps

After the repository is published, users install it like this:

1. Open Jellyfin Dashboard.
2. Go to Plugins -> Repositories.
3. Add a repository:

   ```text
   Name: Jellyseerr Bridge
   URL: https://raw.githubusercontent.com/monjaka/jellyfin-plugin-jellyseerr-bridge/main/manifest.json
   ```

4. Go to Plugins -> Catalog.
5. Find `Jellyseerr Bridge`.
6. Install it.
7. Restart Jellyfin.
8. Configure the plugin in Dashboard -> Plugins -> Jellyseerr Bridge.

## Publisher Setup

Build the release zip:

```bash
./scripts/package-release.sh 0.1.0.2
```

Create a GitHub release:

```text
v0.1.2
```

Upload:

```text
dist/JellyseerrBridge_0.1.0.2.zip
```

Generate `manifest.json`:

```bash
./scripts/generate-manifest.sh monjaka jellyfin-plugin-jellyseerr-bridge 0.1.0.2 v0.1.2 dist/JellyseerrBridge_0.1.0.2.zip > manifest.json
```

Commit and push:

```bash
git add manifest.json
git commit -m "Add Jellyfin plugin repository manifest"
git push
```

## Why This Is Needed

Jellyfin plugin repository installation works from a manifest URL. The manifest must include:

- plugin ID
- plugin name
- Jellyfin target ABI
- release zip download URL in `sourceUrl`
- MD5 checksum for the release zip

The plugin cannot be installed from only a source repository. Jellyfin needs the compiled plugin zip referenced by the manifest. In Jellyfin's manifest format, `sourceUrl` must point to the release zip, not the GitHub repository page.
