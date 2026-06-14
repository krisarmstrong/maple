#!/usr/bin/env bash
set -euo pipefail

usage() {
  echo "usage: $0 <os> <name> <version> <arch> <archive-ext>" >&2
}

if [[ "$#" -ne 5 ]]; then
  usage
  exit 2
fi

os="$1"
name="$2"
version="$3"
arch="$4"
archive_ext="$5"

require_file() {
  local path="$1"
  if [[ ! -s "$path" ]]; then
    echo "missing or empty release artifact: $path" >&2
    exit 1
  fi
}

require_glob() {
  local pattern="$1"
  local matches=()
  shopt -s nullglob
  matches=($pattern)
  shopt -u nullglob
  if [[ "${#matches[@]}" -eq 0 ]]; then
    echo "missing release artifact matching: $pattern" >&2
    exit 1
  fi
  for path in "${matches[@]}"; do
    require_file "$path"
  done
}

require_windows_app_exe() {
  local matches=()
  shopt -s nullglob
  matches=(build/bin/*.exe)
  shopt -u nullglob
  for path in "${matches[@]}"; do
    if [[ "$path" != *-installer.exe ]]; then
      require_file "$path"
      return
    fi
  done
  echo "missing Windows app executable under build/bin" >&2
  exit 1
}

require_file "dist/maple-${name}.${archive_ext}"
require_file "dist/maple-${name}-SHA256SUMS.txt"

case "$os" in
  macos)
    require_glob "build/bin/"*.app
    require_file "dist/maple-macos-${arch}-${version}.pkg"
    ;;
  linux)
    require_file "build/bin/maple"
    require_glob "dist/"*.deb
    require_glob "dist/"*.rpm
    ;;
  windows)
    require_windows_app_exe
    require_glob "build/bin/"*-installer.exe
    ;;
  *)
    echo "unsupported release artifact os: $os" >&2
    exit 2
    ;;
esac
