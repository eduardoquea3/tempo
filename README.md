# Tempo

Tempo is a tray-first Pomodoro timer with a reusable Rust core, a Unix-socket CLI, and a Tauri GUI.

## CLI

On Linux, start the daemon in one terminal and use the client from another:

```sh
tempo daemon
tempo start
tempo status --json
tempo pause
tempo reset
```

`tempo status --json` is a stable public DTO with snake_case fields. `tempo remaining` prints only `MM:SS`. `tempo watch` prints newline-delimited Waybar JSON (`text`, `class`, `tooltip`, and `percentage`). For Waybar:

```json
"custom/tempo": {
  "exec": "tempo watch",
  "return-type": "json",
  "format": "{text}",
  "on-click": "tempo toggle"
}
```

The daemon persists its state and configuration atomically in `${XDG_STATE_HOME:-~/.local/state}/tempo/tempo.json` and reads legacy `state.json`/`config.json` files when the combined file does not exist.
The CLI transport is Unix Domain Sockets in this slice; Windows builds return a clear unsupported-platform error until Named Pipe transport is added.

The Linux CI artifact is `tempo-linux.tar.gz`. Download and extract the artifact, then install the CLI with:

```sh
tar -xzf tempo-linux.tar.gz
./install-tempo.sh tempo-linux.tar.gz --enable-daemon
```

The script installs the binary at `~/.local/bin/tempo` by default. Ensure that directory is on `PATH`. `--enable-daemon` also creates and enables a systemd user service; omit it if you prefer to run `tempo daemon` manually. The Tauri GUI persists its own state and configuration under the platform app-data directory. It uses the same `tempo-core` model, but the GUI and CLI are separate processes and do not currently share one live daemon.

## Development

```sh
just test
just build-cli
just dev
```

The Tauri tray and notification behavior remains owned by `src-tauri`; its commands use the same `tempo-core` state model rather than a second timer implementation.

## Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)
