use clap::{Parser, Subcommand};
#[cfg(unix)]
use std::sync::{Arc, Mutex};
#[cfg(unix)]
use std::{
    fs,
    path::Path,
    time::{SystemTime, UNIX_EPOCH},
};
use std::{io::Write, path::PathBuf, time::Duration};
use tempo_core::{Mode, Snapshot, Status};
#[cfg(unix)]
use tempo_core::{PomodoroConfig, PomodoroState};
use tempo_ipc::{unix, Request, PROTOCOL_VERSION};
#[cfg(unix)]
use tempo_ipc::{Envelope, Response};

#[derive(serde::Serialize)]
#[serde(rename_all = "snake_case")]
struct CliStatusDto {
    version: u8,
    mode: String,
    status: String,
    remaining_seconds: u64,
    duration_seconds: u64,
    progress: f64,
    session: u32,
    sessions_before_long_break: u32,
}

#[cfg(unix)]
#[derive(serde::Deserialize, serde::Serialize)]
struct PersistedTempo {
    state: PomodoroState,
    config: PomodoroConfig,
}

fn status_dto(snapshot: &Snapshot) -> CliStatusDto {
    let progress = if snapshot.duration_seconds == 0 {
        0.0
    } else {
        (snapshot
            .duration_seconds
            .saturating_sub(snapshot.remaining_seconds) as f64)
            / snapshot.duration_seconds as f64
    };
    CliStatusDto {
        version: PROTOCOL_VERSION,
        mode: public_mode(snapshot.state.mode),
        status: public_status(snapshot.state.status),
        remaining_seconds: snapshot.remaining_seconds,
        duration_seconds: snapshot.duration_seconds,
        progress,
        session: snapshot.state.session,
        sessions_before_long_break: snapshot.config.sessions_before_long_break,
    }
}

fn public_mode(mode: Mode) -> String {
    match mode {
        Mode::Focus => "focus",
        Mode::ShortBreak => "short_break",
        Mode::LongBreak => "long_break",
    }
    .to_string()
}

fn public_status(status: Status) -> String {
    match status {
        Status::Idle => "idle",
        Status::Running => "running",
        Status::Paused => "paused",
        Status::Completed => "completed",
    }
    .to_string()
}

#[derive(Parser)]
#[command(name = "tempo", version, about = "A background-first Pomodoro timer")]
struct Cli {
    #[command(subcommand)]
    command: Command,
}
#[derive(Subcommand)]
enum Command {
    Start,
    Pause,
    Resume,
    Toggle,
    Skip,
    Stop,
    Reset,
    Status {
        #[arg(long)]
        json: bool,
    },
    Remaining,
    Watch,
    Daemon,
}

#[cfg(unix)]
fn now_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64
}
fn config_dir() -> PathBuf {
    if cfg!(target_os = "linux") {
        std::env::var_os("XDG_CONFIG_HOME")
            .map(PathBuf::from)
            .or_else(|| std::env::var_os("HOME").map(|h| PathBuf::from(h).join(".config")))
            .unwrap_or_else(|| PathBuf::from("."))
            .join("tempo")
    } else {
        std::env::var_os("APPDATA")
            .map(PathBuf::from)
            .or_else(|| std::env::var_os("HOME").map(|h| PathBuf::from(h).join(".tempo")))
            .unwrap_or_else(|| PathBuf::from("."))
    }
}
fn state_dir() -> PathBuf {
    if cfg!(target_os = "linux") {
        std::env::var_os("XDG_STATE_HOME")
            .map(PathBuf::from)
            .or_else(|| std::env::var_os("HOME").map(|h| PathBuf::from(h).join(".local/state")))
            .unwrap_or_else(|| PathBuf::from("."))
            .join("tempo")
    } else {
        config_dir()
    }
}
fn socket_path() -> PathBuf {
    std::env::var_os("TEMPO_SOCKET")
        .map(PathBuf::from)
        .unwrap_or_else(|| state_dir().join("tempo.sock"))
}
#[cfg(unix)]
fn read_json<T: serde::de::DeserializeOwned>(path: &Path) -> Option<T> {
    fs::read_to_string(path)
        .ok()
        .and_then(|s| serde_json::from_str(&s).ok())
}
#[cfg(unix)]
fn write_json<T: serde::Serialize>(path: &Path, value: &T) -> std::io::Result<()> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)?;
    }
    let temporary_path = path.with_extension("tmp");
    fs::write(&temporary_path, serde_json::to_vec_pretty(value).unwrap())?;
    fs::rename(temporary_path, path)
}
#[cfg(unix)]
fn load_persisted() -> PersistedTempo {
    read_json(&state_dir().join("tempo.json")).unwrap_or_else(|| PersistedTempo {
        state: read_json(&state_dir().join("state.json")).unwrap_or_default(),
        config: read_json(&config_dir().join("config.json")).unwrap_or_default(),
    })
}
#[cfg(unix)]
fn persist(state: &PomodoroState, config: &PomodoroConfig) -> std::io::Result<()> {
    write_json(
        &state_dir().join("tempo.json"),
        &PersistedTempo {
            state: state.clone(),
            config: config.clone(),
        },
    )
}

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let cli = Cli::parse();
    match cli.command {
        Command::Daemon => daemon(),
        Command::Watch => watch(),
        Command::Status { json } => command(Request::Status, json),
        Command::Remaining => command(Request::Remaining, false),
        Command::Start => command(Request::Start, false),
        Command::Pause => command(Request::Pause, false),
        Command::Resume => command(Request::Resume, false),
        Command::Toggle => command(Request::Toggle, false),
        Command::Skip => command(Request::Skip, false),
        Command::Stop => command(Request::Stop, false),
        Command::Reset => command(Request::Reset, false),
    }
}

fn command(request: Request, json: bool) -> Result<(), Box<dyn std::error::Error>> {
    let remaining = matches!(request, Request::Remaining);
    let response = unix::send(&socket_path(), request)?;
    let snapshot = response.snapshot.ok_or("daemon returned no snapshot")?;
    if json {
        println!("{}", serde_json::to_string(&status_dto(&snapshot))?);
    } else if remaining {
        println!(
            "{:02}:{:02}",
            snapshot.remaining_seconds / 60,
            snapshot.remaining_seconds % 60
        );
    } else {
        print_snapshot(&snapshot);
    }
    Ok(())
}
fn print_snapshot(snapshot: &Snapshot) {
    println!(
        "{:02}:{:02} {:?} {:?} (session {})",
        snapshot.remaining_seconds / 60,
        snapshot.remaining_seconds % 60,
        snapshot.state.mode,
        snapshot.state.status,
        snapshot.state.session
    );
}

fn watch() -> Result<(), Box<dyn std::error::Error>> {
    loop {
        let response = unix::send(&socket_path(), Request::Status)?;
        let snapshot = response.snapshot.ok_or("daemon returned no snapshot")?;
        let dto = status_dto(&snapshot);
        let payload = serde_json::json!({
            "text": format!("{:02}:{:02}", dto.remaining_seconds / 60, dto.remaining_seconds % 60),
            "class": format!("{} {}", dto.mode, dto.status),
            "tooltip": format!("{} - {} (session {})", dto.mode, dto.status, dto.session),
            "percentage": (dto.progress * 100.0).round(),
        });
        println!("{}", serde_json::to_string(&payload)?);
        std::io::stdout().flush()?;
        std::thread::sleep(Duration::from_secs(1));
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn cli_status_json_has_stable_top_level_shape() {
        let snapshot = Snapshot {
            state: tempo_core::PomodoroState::default(),
            config: tempo_core::PomodoroConfig::default(),
            duration_seconds: 1500,
            remaining_seconds: 1122,
            timestamp_ms: 0,
        };
        let value: serde_json::Value = serde_json::to_value(status_dto(&snapshot)).unwrap();
        let object = value.as_object().unwrap();
        let keys: std::collections::BTreeSet<_> = object.keys().cloned().collect();
        assert_eq!(
            keys,
            [
                "version",
                "mode",
                "status",
                "remaining_seconds",
                "duration_seconds",
                "progress",
                "session",
                "sessions_before_long_break"
            ]
            .into_iter()
            .map(String::from)
            .collect()
        );
        assert_eq!(value["mode"], "focus");
        assert_eq!(value["status"], "idle");
    }
}

fn daemon() -> Result<(), Box<dyn std::error::Error>> {
    #[cfg(windows)]
    {
        return Err("daemon is unsupported on Windows: Unix Domain Sockets are unavailable".into());
    }
    #[cfg(unix)]
    {
        let persisted = load_persisted();
        let config = Arc::new(Mutex::new(persisted.config));
        let state = Arc::new(Mutex::new(persisted.state));
        let path = socket_path();
        {
            let state = state.lock().unwrap();
            let config = config.lock().unwrap();
            persist(&state, &config)?;
        }
        let listener = unix::bind(&path)?;
        eprintln!("tempo daemon listening on {}", path.display());
        for stream in listener.incoming() {
            match stream {
                Ok(stream) => {
                    let state = Arc::clone(&state);
                    let config = Arc::clone(&config);
                    std::thread::spawn(move || {
                        if let Err(error) = handle(stream, state, config) {
                            eprintln!("tempo client: {error}");
                        }
                    });
                }
                Err(error) => eprintln!("tempo accept: {error}"),
            }
        }
        Ok(())
    }
}

#[cfg(unix)]
fn handle(
    stream: std::os::unix::net::UnixStream,
    state: Arc<Mutex<PomodoroState>>,
    config: Arc<Mutex<PomodoroConfig>>,
) -> Result<(), Box<dyn std::error::Error>> {
    let envelope: Envelope<Request> = unix::read_request(&stream)?;
    if envelope.version != PROTOCOL_VERSION {
        unix::write_response(&stream, Response::error("unsupported protocol version"))?;
        return Ok(());
    }
    let mut state = state.lock().unwrap();
    let mut config = config.lock().unwrap();
    let now = now_ms();
    state.complete_if_elapsed(&config, now);
    state.advance_if_ready(&config, now);
    let result = match envelope.payload {
        Request::Start => state.start(now_ms()),
        Request::Pause => state.pause(now_ms()),
        Request::Resume => state.resume(now_ms()),
        Request::Toggle => state.toggle(now_ms()),
        Request::Skip => {
            state.skip(&config);
            Ok(())
        }
        Request::Stop => {
            state.stop();
            Ok(())
        }
        Request::Reset => {
            state.reset();
            Ok(())
        }
        Request::SetMode { mode } => {
            state.set_mode(mode);
            Ok(())
        }
        Request::SetConfig { config: next } => {
            *config = next;
            Ok(())
        }
        Request::Status | Request::Remaining => Ok(()),
    };
    if let Err(error) = result {
        unix::write_response(&stream, Response::error(error.to_string()))?;
        return Ok(());
    }
    persist(&state, &config)?;
    unix::write_response(
        &stream,
        Response::success(state.snapshot(&config, now_ms())),
    )?;
    Ok(())
}
