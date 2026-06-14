# Contributing

## Development Setup

Install the .NET 9 SDK, then run:

```bash
dotnet restore
dotnet build -c Release
```

## Project Layout

- `src/Jellyfin.Plugin.JellyseerrBridge/Controllers`: Jellyfin-hosted bridge endpoints.
- `src/Jellyfin.Plugin.JellyseerrBridge/Configuration`: plugin configuration page and model.
- `src/Jellyfin.Plugin.JellyseerrBridge/Web`: request page and Jellyfin Web entry script.
- `web-injector`: readable copy of the Jellyfin Web loader helper.

## Pull Requests

Keep changes focused. Include:

- what changed
- how it was tested
- any Jellyfin or Jellyseerr version assumptions

Do not commit real API keys, tokens, server URLs, or user-specific configuration.
