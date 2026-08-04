dev:
  npm run tauri dev

build:
  npm run tauri build

test:
  cargo test --workspace

build-cli:
  cargo build -p tempo-cli --release

build-gui:
  npm run tauri build
