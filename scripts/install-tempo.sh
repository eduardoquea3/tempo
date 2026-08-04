#!/usr/bin/env sh
set -eu

PREFIX="${TEMPO_PREFIX:-$HOME/.local}"
ARCHIVE=""
ENABLE_DAEMON=0
TEMP_DIR=""

usage() {
  cat <<'EOF'
Usage: install-tempo.sh [ARCHIVE_OR_URL] [--enable-daemon] [--prefix DIR]

Install the Tempo Linux CLI into PREFIX/bin.

Examples:
  ./install-tempo.sh tempo-linux.tar.gz
  ./install-tempo.sh https://example.com/tempo-linux.tar.gz --enable-daemon
EOF
}

cleanup() {
  if [ -n "$TEMP_DIR" ]; then
    rm -rf "$TEMP_DIR"
  fi
}
trap cleanup EXIT INT TERM

while [ "$#" -gt 0 ]; do
  case "$1" in
    --enable-daemon)
      ENABLE_DAEMON=1
      ;;
    --prefix)
      shift
      [ "$#" -gt 0 ] || { usage >&2; exit 2; }
      PREFIX="$1"
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    -* )
      usage >&2
      exit 2
      ;;
    '' )
      ;;
    * )
      [ -z "$ARCHIVE" ] || { usage >&2; exit 2; }
      ARCHIVE="$1"
      ;;
  esac
  shift
done

[ -n "$ARCHIVE" ] || ARCHIVE="tempo-linux.tar.gz"
TEMP_DIR="$(mktemp -d)"

case "$ARCHIVE" in
  http://*|https://*)
    if command -v curl >/dev/null 2>&1; then
      curl --fail --location --silent --show-error "$ARCHIVE" --output "$TEMP_DIR/tempo-linux.tar.gz"
    elif command -v wget >/dev/null 2>&1; then
      wget --quiet --output-document="$TEMP_DIR/tempo-linux.tar.gz" "$ARCHIVE"
    else
      printf '%s\n' 'Error: curl or wget is required to download the archive.' >&2
      exit 1
    fi
    ARCHIVE="$TEMP_DIR/tempo-linux.tar.gz"
    ;;
esac

[ -f "$ARCHIVE" ] || {
  printf 'Error: archive not found: %s\n' "$ARCHIVE" >&2
  exit 1
}

EXTRACT_DIR="$TEMP_DIR/extracted"
mkdir -p "$EXTRACT_DIR"
tar -xzf "$ARCHIVE" -C "$EXTRACT_DIR"

BINARY="$EXTRACT_DIR/tempo/tempo"
[ -x "$BINARY" ] || {
  printf '%s\n' 'Error: archive does not contain an executable tempo/tempo.' >&2
  exit 1
}

mkdir -p "$PREFIX/bin"
install -m 0755 "$BINARY" "$PREFIX/bin/tempo"
printf 'Installed Tempo CLI at %s\n' "$PREFIX/bin/tempo"

if [ "$ENABLE_DAEMON" -eq 1 ]; then
  UNIT_DIR="${XDG_CONFIG_HOME:-$HOME/.config}/systemd/user"
  mkdir -p "$UNIT_DIR"
  cat > "$UNIT_DIR/tempo.service" <<EOF
[Unit]
Description=Tempo Pomodoro daemon
After=graphical-session.target

[Service]
ExecStart=$PREFIX/bin/tempo daemon
Restart=on-failure
RestartSec=2

[Install]
WantedBy=default.target
EOF

  if command -v systemctl >/dev/null 2>&1 && systemctl --user daemon-reload >/dev/null 2>&1; then
    systemctl --user enable --now tempo.service
    printf '%s\n' 'Tempo daemon enabled for the current user session.'
  else
    printf '%s\n' 'Installed the systemd user unit; enable it with: systemctl --user enable --now tempo.service'
  fi
fi
