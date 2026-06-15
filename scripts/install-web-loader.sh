#!/usr/bin/env bash
set -euo pipefail

loader_src="/JellyseerrBridge/Assets/request-entry.js"
marker_start="<!-- Jellyseerr Bridge web loader: start -->"
marker_end="<!-- Jellyseerr Bridge web loader: end -->"

usage() {
  cat <<USAGE
Usage: sudo bash scripts/install-web-loader.sh [index.html path]

Installs the Jellyseerr Bridge navigation loader into Jellyfin Web.
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
  echo "Pass the path explicitly, for example:" >&2
  echo "  sudo bash scripts/install-web-loader.sh /usr/share/jellyfin/web/index.html" >&2
  exit 1
fi

if [ ! -w "$index_path" ]; then
  echo "Cannot write to $index_path. Run this script with sudo." >&2
  exit 1
fi

if grep -Fq "$loader_src" "$index_path"; then
  echo "Jellyseerr Bridge web loader is already installed in $index_path"
  exit 0
fi

backup_path="${index_path}.bak.jellyseerrbridge.$(date -u +%Y%m%d%H%M%S)"
cp -p "$index_path" "$backup_path"

tmp_path="$(mktemp)"
block="${marker_start}
<script defer src=\"${loader_src}\"></script>
${marker_end}"

awk -v block="$block" '
  BEGIN { inserted = 0 }
  /<\/body>/ && inserted == 0 {
    print block
    inserted = 1
  }
  { print }
  END {
    if (inserted == 0) {
      print block
    }
  }
' "$index_path" > "$tmp_path"

cat "$tmp_path" > "$index_path"
rm -f "$tmp_path"

echo "Installed Jellyseerr Bridge web loader in $index_path"
echo "Backup saved to $backup_path"
echo "Restart Jellyfin, then hard refresh the browser."
