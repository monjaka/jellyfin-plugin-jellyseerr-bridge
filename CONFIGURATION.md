# Configuration

## Jellyseerr Base URL

Use the address Jellyfin can reach from the server side. This does not need to be the public Jellyseerr URL.

Examples:

```text
http://192.168.9.10:5055
http://jellyseerr:5055
https://jellyseerr.example.com
```

## Jellyseerr API Key

Create or copy the API key from Jellyseerr Settings. The key is stored in Jellyfin's plugin configuration and is only used server-side.

Browsers call the Jellyfin plugin endpoints. They do not receive the Jellyseerr API key.

## Request Submission

Requests are disabled by default. Enable `Enable Request Submission` after confirming the Jellyseerr URL and API key are correct.

## 4K Requests

4K requests are disabled unless `Enable 4K Requests` is enabled.

## Allowed Jellyfin User IDs

Leave this field empty to allow any authenticated Jellyfin user to submit requests.

To restrict request submission, add one Jellyfin user ID per line. Users not listed can still open the request page, but request submission will be rejected.

## Jellyseerr Availability

The request page uses Jellyseerr's media status for availability and request state. Jellyfin libraries are not scanned by this plugin for availability.

If an item appears available or requested unexpectedly, check the media status in Jellyseerr first.
