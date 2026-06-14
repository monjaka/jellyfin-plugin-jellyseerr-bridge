# Security

## Supported Versions

This preview currently targets Jellyfin 10.11.x.

## API Key Handling

The Jellyseerr API key is stored in Jellyfin plugin configuration and used only by server-side plugin endpoints.

The request page calls Jellyfin-hosted endpoints. The Jellyseerr API key is not sent to browsers.

## Request Proxy Scope

The plugin is not an open proxy. It exposes a narrow request endpoint that validates:

- media type: `movie` or `tv`
- TMDB media ID
- optional 4K flag
- optional TV seasons

Search, discover, movie details, and TV details are forwarded to known Jellyseerr endpoints.

## Reporting A Vulnerability

Open a private security advisory on GitHub if available, or contact the repository owner privately.

Do not publish API keys, Jellyfin tokens, logs with secrets, or public exploit details in an issue.
