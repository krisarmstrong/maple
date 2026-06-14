#!/usr/bin/env bash
set -euo pipefail

version="${1:-0.1.0}"
arch="${2:-arm64}"
app_path="$(find build/bin -maxdepth 1 -type d -name "*.app" -print -quit)"

if [[ -z "${app_path}" ]]; then
  echo "No Wails .app bundle found under build/bin. Run make package-macos first." >&2
  exit 1
fi

mkdir -p dist
pkgbuild \
  --component "${app_path}" \
  --install-location /Applications \
  "dist/maple-macos-${arch}-${version}.pkg"
