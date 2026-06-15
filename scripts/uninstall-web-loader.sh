#!/usr/bin/env bash
set -euo pipefail

marker_start="<!-- Jellyseerr Bridge web loader: start -->"
marker_end="<!-- Jellyseerr Bridge web loader: end -->"
loader_src="/JellyseerrBridge/Assets/request-entry.js"

usage() {
  cat <<USAGE
Usage: sudo bash scripts/uninstall-web-loader.sh [index.html path]

Removes the Jellyseerr Bridge navigation loader from Jellyfin Web.
If no path is supplied, common Jellyfin Web locations are checked.
USAGE
}

if [ "${1:-}" = "-h" ] || [ "${1:-}" = "--help" ]; then
  usage
  exit 0
fi

find_index() {
  if [ -n "${1:-}" ]; then
    printf '%s\n' "$1"
    return
  fi

  for candidate in \
    /usr/share/jellyfin/web/index.html \
    /usr/lib/jellyfin/bin/jellyfin-web/index.html \
    /usr/share/jellyfin-web/index.html \
    /var/lib/jellyfin/wwwroot/index.html; do
    if [ -f "$candidate" ]; then
      printf '%s\n' "$candidate"
      return
    fi
  done
}

index_path="$(find_index "${1:-}")"

if [ -z "$index_path" ] || [ ! -f "$index_path" ]; then
  echo "Could not find Jellyfin Web index.html." >&2
  exit 1
fi

if [ ! -w "$index_path" ]; then
  echo "Cannot write to $index_path. Run this script with sudo." >&2
  exit 1
fi

backup_path="${index_path}.bak.jellyseerrbridge-uninstall.$(date -u +%Y%m%d%H%M%S)"
cp -p "$index_path" "$backup_path"

tmp_path="$(mktemp)"
awk -v start="$marker_start" -v end="$marker_end" -v src="$loader_src" '
  index($0, start) { skipping = 1; changed = 1; next }
  index($0, end) { skipping = 0; next }
  skipping == 1 { next }
  index($0, src) { changed = 1; next }
  { print }
' "$index_path" > "$tmp_path"

cat "$tmp_path" > "$index_path"
rm -f "$tmp_path"

echo "Removed Jellyseerr Bridge web loader from $index_path"
echo "Backup saved to $backup_path"
echo "Restart Jellyfin, then hard refresh the browser."
