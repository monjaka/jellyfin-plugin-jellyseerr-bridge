using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Text.RegularExpressions;
using System.Text.Json.Nodes;
using Jellyfin.Plugin.JellyseerrBridge.Configuration;
using MediaBrowser.Common.Configuration;
using MediaBrowser.Common.Plugins;
using MediaBrowser.Model.Plugins;
using MediaBrowser.Model.Serialization;

namespace Jellyfin.Plugin.JellyseerrBridge;

/// <summary>
/// Jellyseerr Bridge plugin entry point.
/// </summary>
public sealed class Plugin : BasePlugin<PluginConfiguration>, IHasWebPages
{
    private const string WebLoaderPluginAttribute = "Jellyseerr Bridge";
    private const string PluginPagesId = "Jellyfin.Plugin.JellyseerrBridge.RequestPage";
    private readonly IApplicationPaths _applicationPaths;

    /// <summary>
    /// Initializes a new instance of the <see cref="Plugin"/> class.
    /// </summary>
    /// <param name="applicationPaths">Application paths.</param>
    /// <param name="xmlSerializer">XML serializer.</param>
    public Plugin(IApplicationPaths applicationPaths, IXmlSerializer xmlSerializer)
        : base(applicationPaths, xmlSerializer)
    {
        _applicationPaths = applicationPaths;
        Instance = this;
        UpdateIndexHtml(inject: true);
        UpdatePluginPagesConfig(inject: true);
    }

    /// <inheritdoc />
    public override string Name => "Jellyseerr Bridge";

    /// <inheritdoc />
    public override Guid Id => Guid.Parse("d2fcf9c8-c3c7-47e8-9dd6-8de9867e36bb");

    private string IndexHtmlPath => Path.Combine(_applicationPaths.WebPath, "index.html");

    /// <summary>
    /// Gets the plugin singleton instance.
    /// </summary>
    public static Plugin? Instance { get; private set; }

    /// <inheritdoc />
    public override void OnUninstalling()
    {
        UpdateIndexHtml(inject: false);
        UpdatePluginPagesConfig(inject: false);
        base.OnUninstalling();
    }

    /// <inheritdoc />
    public IEnumerable<PluginPageInfo> GetPages()
    {
        return
        [
            new PluginPageInfo
            {
                Name = "JellyseerrBridge",
                EmbeddedResourcePath = string.Format(
                    CultureInfo.InvariantCulture,
                    "{0}.Configuration.configPage.html",
                    GetType().Namespace)
            }
        ];
    }

    private void UpdateIndexHtml(bool inject)
    {
        try
        {
            var indexPath = FindIndexHtmlPath();
            if (!File.Exists(indexPath))
            {
                return;
            }

            var content = File.ReadAllText(indexPath);
            var regex = new Regex(
                $"<script[^>]*plugin=[\"']{Regex.Escape(WebLoaderPluginAttribute)}[\"'][^>]*>\\s*</script>\\n?",
                RegexOptions.IgnoreCase | RegexOptions.CultureInvariant);

            content = regex.Replace(content, string.Empty);

            if (inject)
            {
                var dllTimestamp = new FileInfo(typeof(Plugin).Assembly.Location).LastWriteTimeUtc.Ticks;
                var cacheKey = string.Format(CultureInfo.InvariantCulture, "{0}-{1}", Version, dllTimestamp);
                var scriptTag = string.Format(
                    CultureInfo.InvariantCulture,
                    "<script plugin=\"{0}\" version=\"{1}\" src=\"/JellyseerrBridge/Assets/request-entry.js?v={1}\" defer></script>",
                    WebLoaderPluginAttribute,
                    cacheKey);

                const string ClosingBodyTag = "</body>";
                if (!content.Contains(ClosingBodyTag, StringComparison.OrdinalIgnoreCase))
                {
                    return;
                }

                content = Regex.Replace(
                    content,
                    ClosingBodyTag,
                    scriptTag + Environment.NewLine + ClosingBodyTag,
                    RegexOptions.IgnoreCase | RegexOptions.CultureInvariant);
            }

            File.WriteAllText(indexPath, content);
        }
        catch
        {
            // Jellyfin may run with a read-only web root. In that case the direct
            // request page and manual loader remain available.
        }
    }

    private string FindIndexHtmlPath()
    {
        var candidates = new[]
        {
            IndexHtmlPath,
            "/usr/share/jellyfin/web/index.html",
            "/usr/lib/jellyfin/bin/jellyfin-web/index.html",
            "/usr/share/jellyfin-web/index.html",
            "/var/lib/jellyfin/wwwroot/index.html"
        };

        return candidates.FirstOrDefault(File.Exists) ?? IndexHtmlPath;
    }

    private void UpdatePluginPagesConfig(bool inject)
    {
        try
        {
            var configPath = Path.Combine(
                _applicationPaths.PluginConfigurationsPath,
                "Jellyfin.Plugin.PluginPages",
                "config.json");

            var configDirectory = Path.GetDirectoryName(configPath);
            if (string.IsNullOrWhiteSpace(configDirectory))
            {
                return;
            }

            Directory.CreateDirectory(configDirectory);

            JsonObject root;
            if (File.Exists(configPath))
            {
                root = JsonNode.Parse(File.ReadAllText(configPath)) as JsonObject ?? new JsonObject();
            }
            else
            {
                root = new JsonObject();
            }

            var pages = root["pages"] as JsonArray;
            if (pages is null)
            {
                pages = new JsonArray();
                root["pages"] = pages;
            }

            for (var index = pages.Count - 1; index >= 0; index--)
            {
                if (pages[index]?["Id"]?.GetValue<string>() == PluginPagesId)
                {
                    pages.RemoveAt(index);
                }
            }

            if (inject)
            {
                pages.Add(new JsonObject
                {
                    ["Id"] = PluginPagesId,
                    ["Url"] = "/JellyseerrBridge/Page",
                    ["DisplayText"] = "Request",
                    ["Icon"] = "add_circle_outline",
                    ["Version"] = 1
                });
            }

            File.WriteAllText(configPath, root.ToJsonString(new System.Text.Json.JsonSerializerOptions
            {
                WriteIndented = true
            }));
        }
        catch
        {
            // Plugin Pages is optional. If it is absent or unwritable, the
            // direct page and web-loader fallback remain available.
        }
    }
}
