using System.Text.Json;
using System.Text.Json.Serialization;

namespace Jellyfin.Plugin.JellyseerrBridge.Models;

/// <summary>
/// Client-visible plugin status.
/// </summary>
public sealed class BridgeStatus
{
    /// <summary>
    /// Gets or sets a value indicating whether Jellyseerr is configured.
    /// </summary>
    [JsonPropertyName("isConfigured")]
    public bool IsConfigured { get; set; }

    /// <summary>
    /// Gets or sets a value indicating whether request submission is enabled.
    /// </summary>
    [JsonPropertyName("requestSubmissionEnabled")]
    public bool RequestSubmissionEnabled { get; set; }

    /// <summary>
    /// Gets or sets the configured Jellyseerr base URL host.
    /// </summary>
    [JsonPropertyName("jellyseerrHost")]
    public string? JellyseerrHost { get; set; }
}

/// <summary>
/// Request submission body accepted by this plugin.
/// </summary>
public sealed class BridgeRequest
{
    /// <summary>
    /// Gets or sets the media type. Must be movie or tv.
    /// </summary>
    public string MediaType { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the TMDB media ID.
    /// </summary>
    public int MediaId { get; set; }

    /// <summary>
    /// Gets or sets a value indicating whether this is a 4K request.
    /// </summary>
    [JsonPropertyName("is4k")]
    public bool Is4K { get; set; }

    /// <summary>
    /// Gets or sets requested TV seasons. Supports "all" or an array of season numbers.
    /// </summary>
    public JsonElement? Seasons { get; set; }
}

/// <summary>
/// Sanitized Jellyseerr service defaults.
/// </summary>
public sealed class ServiceDefaults
{
    /// <summary>
    /// Gets or sets the service ID.
    /// </summary>
    public int? ServerId { get; set; }

    /// <summary>
    /// Gets or sets the quality profile ID.
    /// </summary>
    public int? ProfileId { get; set; }

    /// <summary>
    /// Gets or sets the root folder.
    /// </summary>
    public string? RootFolder { get; set; }

    /// <summary>
    /// Gets or sets tags.
    /// </summary>
    public JsonElement? Tags { get; set; }

    /// <summary>
    /// Gets or sets the language profile ID.
    /// </summary>
    public int? LanguageProfileId { get; set; }
}
