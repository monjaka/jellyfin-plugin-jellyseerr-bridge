# Release Guide

## Prepare

Update the version in:

- `src/Jellyfin.Plugin.JellyseerrBridge/Plugin.cs`
- `manifest.template.json`
- release notes

Build:

```bash
dotnet restore
dotnet build -c Release
```

Package the build output:

```bash
mkdir -p dist/JellyseerrBridge_0.1.0.0
cp src/Jellyfin.Plugin.JellyseerrBridge/bin/Release/net9.0/* dist/JellyseerrBridge_0.1.0.0/
cd dist
zip -r JellyseerrBridge_0.1.0.0.zip JellyseerrBridge_0.1.0.0
md5sum JellyseerrBridge_0.1.0.0.zip
```

## GitHub Release

Create a GitHub release such as:

```text
v0.1.0
```

Attach:

```text
JellyseerrBridge_0.1.0.0.zip
```

## Manifest

Generate `manifest.json` after the release zip exists:

```bash
./scripts/generate-manifest.sh monjaka jellyfin-plugin-jellyseerr-bridge 0.1.0.0 v0.1.0 dist/JellyseerrBridge_0.1.0.0.zip > manifest.json
```

PowerShell:

```powershell
.\scripts\generate-manifest.ps1 -Owner monjaka -ZipPath dist\JellyseerrBridge_0.1.0.0.zip > manifest.json
```

Commit `manifest.json` so Jellyfin can read it from:

```text
https://raw.githubusercontent.com/monjaka/jellyfin-plugin-jellyseerr-bridge/main/manifest.json
```

Users can add that URL under Jellyfin Dashboard -> Plugins -> Repositories.

Important: Jellyfin downloads the plugin package from the version's `sourceUrl`. That field must point to `JellyseerrBridge_0.1.0.0.zip`, not the GitHub repository page.
