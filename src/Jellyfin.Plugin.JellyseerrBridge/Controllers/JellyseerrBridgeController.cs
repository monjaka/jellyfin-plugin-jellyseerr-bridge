using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Jellyfin.Plugin.JellyseerrBridge.Configuration;
using Jellyfin.Plugin.JellyseerrBridge.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.StaticFiles;

namespace Jellyfin.Plugin.JellyseerrBridge.Controllers;

/// <summary>
/// Server-side bridge from Jellyfin to Jellyseerr.
/// </summary>
[ApiController]
[Authorize]
[Route("JellyseerrBridge")]
public sealed class JellyseerrBridgeController : ControllerBase
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    /// <summary>
    /// Gets client-visible bridge status without exposing secrets.
    /// </summary>
    /// <returns>Bridge status.</returns>
    [HttpGet("Status")]
    [AllowAnonymous]
    public ActionResult<BridgeStatus> Status()
    {
        var config = GetConfig();
        var baseUri = TryCreateBaseUri(config);
        return new BridgeStatus
        {
            IsConfigured = baseUri is not null && !string.IsNullOrWhiteSpace(config.JellyseerrApiKey),
            RequestSubmissionEnabled = config.EnableRequestSubmission,
            JellyseerrHost = baseUri?.Host
        };
    }

    /// <summary>
    /// Serves the standalone request page.
    /// </summary>
    /// <returns>HTML page.</returns>
    [HttpGet("Page")]
    [AllowAnonymous]
    public IActionResult Page()
    {
        return EmbeddedFile("Web.request-page.html", "text/html; charset=utf-8");
    }

    /// <summary>
    /// Serves plugin web assets.
    /// </summary>
    /// <param name="assetName">Asset name.</param>
    /// <returns>Asset response.</returns>
    [HttpGet("Assets/{assetName}")]
    [AllowAnonymous]
    public IActionResult Asset(string assetName)
    {
        var resourceName = assetName switch
        {
            "request-page.js" => "Web.request-page.js",
            "request-entry.js" => "Web.request-entry.js",
            _ => null
        };

        return resourceName is null
            ? NotFound()
            : EmbeddedFile(resourceName, "application/javascript; charset=utf-8");
    }

    /// <summary>
    /// Proxies a Jellyseerr search request.
    /// </summary>
    /// <param name="query">Search query.</param>
    /// <param name="page">Page number.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Jellyseerr response.</returns>
    [HttpGet("Search")]
    public Task<IActionResult> Search([FromQuery] string query, [FromQuery] int page = 1, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(query))
        {
            return Task.FromResult<IActionResult>(BadRequest(new { message = "Query is required." }));
        }

        return ForwardGetAsync("/api/v1/search", new Dictionary<string, string?>
        {
            ["query"] = query,
            ["page"] = Math.Max(page, 1).ToString(CultureInfo.InvariantCulture)
        }, cancellationToken);
    }

    /// <summary>
    /// Proxies an allow-listed Jellyseerr discover category.
    /// </summary>
    /// <param name="category">Category ID.</param>
    /// <param name="page">Page number.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Jellyseerr response.</returns>
    [HttpGet("Discover/{category}")]
    public Task<IActionResult> Discover(string category, [FromQuery] int page = 1, CancellationToken cancellationToken = default)
    {
        var endpoint = category.ToLowerInvariant() switch
        {
            "trending" => "/api/v1/discover/trending",
            "movies" => "/api/v1/discover/movies",
            "upcoming-movies" => "/api/v1/discover/movies/upcoming",
            "tv" or "shows" => "/api/v1/discover/tv",
            "upcoming-tv" or "upcoming-shows" => "/api/v1/discover/tv/upcoming",
            _ => null
        };

        if (endpoint is null)
        {
            return Task.FromResult<IActionResult>(BadRequest(new { message = "Unknown discover category." }));
        }

        var query = new Dictionary<string, string?>
        {
            ["page"] = Math.Max(page, 1).ToString(CultureInfo.InvariantCulture)
        };

        if (!endpoint.Equals("/api/v1/discover/trending", StringComparison.Ordinal))
        {
            AddAllowedDiscoverFilters(query);
        }

        return ForwardGetAsync(endpoint, query, cancellationToken);
    }

    private void AddAllowedDiscoverFilters(IDictionary<string, string?> query)
    {
        var allowed = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            "sortBy",
            "primaryReleaseDateGte",
            "primaryReleaseDateLte",
            "firstAirDateGte",
            "firstAirDateLte",
            "voteAverageGte",
            "voteAverageLte",
            "watchRegion",
            "watchProviders"
        };

        foreach (var pair in ControllerContext.HttpContext.Request.Query)
        {
            if (!allowed.Contains(pair.Key))
            {
                continue;
            }

            var value = pair.Value.ToString();
            if (!string.IsNullOrWhiteSpace(value))
            {
                query[pair.Key] = value;
            }
        }
    }

    /// <summary>
    /// Proxies Jellyseerr movie details.
    /// </summary>
    /// <param name="tmdbId">TMDB movie ID.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Jellyseerr response.</returns>
    [HttpGet("Movie/{tmdbId:int}")]
    public Task<IActionResult> Movie(int tmdbId, CancellationToken cancellationToken)
    {
        return ForwardGetAsync($"/api/v1/movie/{tmdbId}", new Dictionary<string, string?>(), cancellationToken);
    }

    /// <summary>
    /// Proxies Jellyseerr TV details.
    /// </summary>
    /// <param name="tmdbId">TMDB TV ID.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Jellyseerr response.</returns>
    [HttpGet("Tv/{tmdbId:int}")]
    public Task<IActionResult> Tv(int tmdbId, CancellationToken cancellationToken)
    {
        return ForwardGetAsync($"/api/v1/tv/{tmdbId}", new Dictionary<string, string?>(), cancellationToken);
    }

    /// <summary>
    /// Submits a sanitized request to Jellyseerr.
    /// </summary>
    /// <param name="request">Request body.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Jellyseerr response.</returns>
    [HttpPost("Request")]
    public async Task<IActionResult> SubmitRequest([FromBody] BridgeRequest request, CancellationToken cancellationToken)
    {
        var config = GetConfig();
        if (!config.EnableRequestSubmission)
        {
            return StatusCode(403, new { message = "Request submission is disabled by the Jellyfin administrator." });
        }

        if (!IsUserAllowed(config))
        {
            return Forbid();
        }

        var validation = ValidateRequest(request, config);
        if (validation is not null)
        {
            return validation;
        }

        var payload = await BuildJellyseerrRequestPayloadAsync(request, cancellationToken).ConfigureAwait(false);
        return await ForwardPostAsync("/api/v1/request", payload, cancellationToken).ConfigureAwait(false);
    }

    private static PluginConfiguration GetConfig()
    {
        return Plugin.Instance?.Configuration ?? new PluginConfiguration();
    }

    private static Uri? TryCreateBaseUri(PluginConfiguration config)
    {
        if (!Uri.TryCreate(config.JellyseerrBaseUrl, UriKind.Absolute, out var uri))
        {
            return null;
        }

        if (uri.Scheme != Uri.UriSchemeHttp && uri.Scheme != Uri.UriSchemeHttps)
        {
            return null;
        }

        return uri;
    }

    private HttpClient CreateClient()
    {
        var config = GetConfig();
        var baseUri = TryCreateBaseUri(config) ?? throw new InvalidOperationException("Jellyseerr base URL is not configured.");
        if (string.IsNullOrWhiteSpace(config.JellyseerrApiKey))
        {
            throw new InvalidOperationException("Jellyseerr API key is not configured.");
        }

        var client = new HttpClient();
        client.BaseAddress = baseUri;
        client.Timeout = TimeSpan.FromSeconds(30);
        client.DefaultRequestHeaders.Remove("X-Api-Key");
        client.DefaultRequestHeaders.Add("X-Api-Key", config.JellyseerrApiKey);
        client.DefaultRequestHeaders.Accept.Clear();
        client.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
        return client;
    }

    private async Task<IActionResult> ForwardGetAsync(string path, IReadOnlyDictionary<string, string?> query, CancellationToken cancellationToken)
    {
        try
        {
            using var client = CreateClient();
            var url = BuildRelativeUrl(path, query);
            using var response = await client.GetAsync(url, cancellationToken).ConfigureAwait(false);
            return await ProxyResponseAsync(response, cancellationToken).ConfigureAwait(false);
        }
        catch (Exception ex) when (ex is InvalidOperationException or HttpRequestException or TaskCanceledException)
        {
            return StatusCode(502, new { message = ex.Message });
        }
    }

    private async Task<IActionResult> ForwardPostAsync(string path, JsonElement payload, CancellationToken cancellationToken)
    {
        try
        {
            using var client = CreateClient();
            using var content = new StringContent(payload.GetRawText(), Encoding.UTF8, "application/json");
            using var response = await client.PostAsync(path, content, cancellationToken).ConfigureAwait(false);
            return await ProxyResponseAsync(response, cancellationToken).ConfigureAwait(false);
        }
        catch (Exception ex) when (ex is InvalidOperationException or HttpRequestException or TaskCanceledException)
        {
            return StatusCode(502, new { message = ex.Message });
        }
    }

    private static async Task<IActionResult> ProxyResponseAsync(HttpResponseMessage response, CancellationToken cancellationToken)
    {
        var body = await response.Content.ReadAsStringAsync(cancellationToken).ConfigureAwait(false);
        return new ContentResult
        {
            StatusCode = (int)response.StatusCode,
            Content = body,
            ContentType = response.Content.Headers.ContentType?.ToString() ?? "application/json"
        };
    }

    private static string BuildRelativeUrl(string path, IReadOnlyDictionary<string, string?> query)
    {
        if (query.Count == 0)
        {
            return path;
        }

        var queryString = string.Join(
            "&",
            query.Where(pair => !string.IsNullOrWhiteSpace(pair.Value))
                .Select(pair => $"{Uri.EscapeDataString(pair.Key)}={Uri.EscapeDataString(pair.Value!)}"));
        return string.IsNullOrEmpty(queryString) ? path : $"{path}?{queryString}";
    }

    private IActionResult? ValidateRequest(BridgeRequest request, PluginConfiguration config)
    {
        var mediaType = request.MediaType.ToLowerInvariant();
        if (mediaType is not ("movie" or "tv"))
        {
            return BadRequest(new { message = "mediaType must be movie or tv." });
        }

        if (request.MediaId <= 0)
        {
            return BadRequest(new { message = "mediaId must be a positive TMDB ID." });
        }

        if (request.Is4K && !config.Enable4KRequests)
        {
            return StatusCode(403, new { message = "4K requests are disabled." });
        }

        if (mediaType == "movie")
        {
            return null;
        }

        if (request.Seasons is null)
        {
            return null;
        }

        var seasons = request.Seasons.Value;
        if (seasons.ValueKind == JsonValueKind.String && seasons.GetString() == "all")
        {
            return null;
        }

        if (seasons.ValueKind == JsonValueKind.Array && seasons.EnumerateArray().All(item => item.ValueKind == JsonValueKind.Number && item.TryGetInt32(out var season) && season >= 0))
        {
            return null;
        }

        return BadRequest(new { message = "TV seasons must be omitted, \"all\", or an array of non-negative season numbers." });
    }

    private bool IsUserAllowed(PluginConfiguration config)
    {
        if (config.AllowedUserIds.Length == 0)
        {
            return true;
        }

        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue("sub")
            ?? User.FindFirstValue("jellyfin:userId")
            ?? User.FindFirstValue("Jellyfin-UserId");
        return userId is not null && config.AllowedUserIds.Contains(userId, StringComparer.OrdinalIgnoreCase);
    }

    private async Task<JsonElement> BuildJellyseerrRequestPayloadAsync(BridgeRequest request, CancellationToken cancellationToken)
    {
        var mediaType = request.MediaType.ToLowerInvariant() == "tv" ? "tv" : "movie";
        var payload = new Dictionary<string, object?>
        {
            ["mediaType"] = mediaType,
            ["mediaId"] = request.MediaId,
            ["is4k"] = request.Is4K
        };

        if (mediaType == "tv")
        {
            payload["seasons"] = request.Seasons is null ? "all" : JsonSerializer.Deserialize<object>(request.Seasons.Value.GetRawText(), JsonOptions);
        }

        var defaults = await GetServiceDefaultsAsync(mediaType, request.Is4K, cancellationToken).ConfigureAwait(false);
        if (defaults is not null)
        {
            if (defaults.ServerId is not null)
            {
                payload["serverId"] = defaults.ServerId;
            }

            if (defaults.ProfileId is not null)
            {
                payload["profileId"] = defaults.ProfileId;
            }

            if (!string.IsNullOrWhiteSpace(defaults.RootFolder))
            {
                payload["rootFolder"] = defaults.RootFolder;
            }

            if (defaults.Tags is not null)
            {
                payload["tags"] = JsonSerializer.Deserialize<object>(defaults.Tags.Value.GetRawText(), JsonOptions);
            }

            if (mediaType == "tv" && defaults.LanguageProfileId is not null)
            {
                payload["languageProfileId"] = defaults.LanguageProfileId;
            }
        }

        return JsonSerializer.SerializeToElement(payload, JsonOptions);
    }

    private async Task<ServiceDefaults?> GetServiceDefaultsAsync(string mediaType, bool is4K, CancellationToken cancellationToken)
    {
        var endpoint = mediaType == "movie" ? "/api/v1/settings/radarr" : "/api/v1/settings/sonarr";
        using var client = CreateClient();
        using var response = await client.GetAsync(endpoint, cancellationToken).ConfigureAwait(false);
        if (!response.IsSuccessStatusCode)
        {
            return null;
        }

        await using var stream = await response.Content.ReadAsStreamAsync(cancellationToken).ConfigureAwait(false);
        using var document = await JsonDocument.ParseAsync(stream, cancellationToken: cancellationToken).ConfigureAwait(false);
        if (document.RootElement.ValueKind != JsonValueKind.Array)
        {
            return null;
        }

        foreach (var server in document.RootElement.EnumerateArray())
        {
            var serverIs4K = server.TryGetProperty("is4k", out var is4KElement) && is4KElement.GetBoolean();
            var isDefault = server.TryGetProperty("isDefault", out var defaultElement) && defaultElement.GetBoolean();
            if (serverIs4K != is4K || !isDefault)
            {
                continue;
            }

            return new ServiceDefaults
            {
                ServerId = ReadInt(server, "id"),
                ProfileId = ReadInt(server, "activeProfileId"),
                RootFolder = ReadString(server, "activeDirectory"),
                Tags = server.TryGetProperty("tags", out var tags) ? tags.Clone() : null,
                LanguageProfileId = ReadInt(server, "activeLanguageProfileId")
            };
        }

        return null;
    }

    private static int? ReadInt(JsonElement element, string property)
    {
        if (!element.TryGetProperty(property, out var value) || value.ValueKind != JsonValueKind.Number)
        {
            return null;
        }

        return value.TryGetInt32(out var result) ? result : null;
    }

    private static string? ReadString(JsonElement element, string property)
    {
        return element.TryGetProperty(property, out var value) && value.ValueKind == JsonValueKind.String
            ? value.GetString()
            : null;
    }

    private IActionResult EmbeddedFile(string resourceSuffix, string contentType)
    {
        Response.Headers.CacheControl = "no-store, max-age=0";
        Response.Headers.Pragma = "no-cache";
        Response.Headers.Expires = "0";

        var assembly = typeof(JellyseerrBridgeController).Assembly;
        var resource = assembly.GetManifestResourceNames()
            .FirstOrDefault(name => name.EndsWith(resourceSuffix, StringComparison.Ordinal));
        if (resource is null)
        {
            return NotFound();
        }

        using var stream = assembly.GetManifestResourceStream(resource);
        if (stream is null)
        {
            return NotFound();
        }

        using var reader = new StreamReader(stream);
        return Content(reader.ReadToEnd(), contentType);
    }
}
