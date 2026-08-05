use serde::{Deserialize, Serialize};
use tempo_core::{Mode, PomodoroConfig, Snapshot};
use thiserror::Error;

pub const PROTOCOL_VERSION: u8 = 1;

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum Request {
    Start,
    Pause,
    Resume,
    Toggle,
    Skip,
    Stop,
    Reset,
    Status,
    Remaining,
    SetMode { mode: Mode },
    SetConfig { config: PomodoroConfig },
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Envelope<T> {
    pub version: u8,
    pub payload: T,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Response {
    pub version: u8,
    pub ok: bool,
    pub snapshot: Option<Snapshot>,
    pub error: Option<String>,
}

impl Response {
    pub fn success(snapshot: Snapshot) -> Self {
        Self {
            version: PROTOCOL_VERSION,
            ok: true,
            snapshot: Some(snapshot),
            error: None,
        }
    }
    pub fn error(message: impl Into<String>) -> Self {
        Self {
            version: PROTOCOL_VERSION,
            ok: false,
            snapshot: None,
            error: Some(message.into()),
        }
    }
}

#[derive(Debug, Error)]
pub enum IpcError {
    #[error("unsupported platform: Unix Domain Sockets are unavailable on Windows")]
    UnsupportedPlatform,
    #[error("socket error: {0}")]
    Io(#[from] std::io::Error),
    #[error("protocol error: {0}")]
    Protocol(#[from] serde_json::Error),
    #[error("daemon error: {0}")]
    Remote(String),
    #[error("tempo daemon is already running")]
    AlreadyRunning,
}

#[cfg(unix)]
pub mod unix {
    use super::*;
    use std::io::{BufRead, BufReader, Write};
    use std::os::unix::net::{UnixListener, UnixStream};
    use std::path::Path;
    pub fn send(path: &Path, request: Request) -> Result<Response, IpcError> {
        let mut stream = UnixStream::connect(path)?;
        let envelope = Envelope {
            version: PROTOCOL_VERSION,
            payload: request,
        };
        writeln!(stream, "{}", serde_json::to_string(&envelope)?)?;
        let mut line = String::new();
        BufReader::new(stream).read_line(&mut line)?;
        let response: Response = serde_json::from_str(&line)?;
        if response.version != PROTOCOL_VERSION {
            return Err(IpcError::Remote(format!(
                "unsupported protocol version {}",
                response.version
            )));
        }
        if response.ok {
            Ok(response)
        } else {
            Err(IpcError::Remote(
                response
                    .error
                    .unwrap_or_else(|| "unknown daemon error".into()),
            ))
        }
    }
    pub fn bind(path: &Path) -> Result<UnixListener, IpcError> {
        if path.exists() {
            if probe_existing(path)? {
                return Err(IpcError::AlreadyRunning);
            }
            std::fs::remove_file(path)?;
        }
        Ok(UnixListener::bind(path)?)
    }

    fn probe_existing(path: &Path) -> Result<bool, IpcError> {
        match UnixStream::connect(path) {
            Ok(_) => Ok(true),
            Err(_) => return Ok(false),
        }
    }

    #[cfg(test)]
    mod tests {
        use super::*;
        use std::os::unix::net::UnixListener;
        use std::thread;

        #[test]
        fn bind_rejects_a_responsive_existing_daemon() {
            let path = std::env::temp_dir().join(format!("tempo-ipc-{}.sock", std::process::id()));
            let _ = std::fs::remove_file(&path);
            let listener = UnixListener::bind(&path).unwrap();
            let worker = thread::spawn(move || listener.accept().unwrap());

            assert!(matches!(bind(&path), Err(IpcError::AlreadyRunning)));
            worker.join().unwrap();
            let _ = std::fs::remove_file(path);
        }
    }
    pub fn read_request(stream: &UnixStream) -> Result<Envelope<Request>, IpcError> {
        let mut line = String::new();
        BufReader::new(stream).read_line(&mut line)?;
        Ok(serde_json::from_str(&line)?)
    }
    pub fn write_response(mut stream: &UnixStream, response: Response) -> Result<(), IpcError> {
        writeln!(stream, "{}", serde_json::to_string(&response)?)?;
        Ok(())
    }
}

#[cfg(windows)]
pub mod unix {
    use super::*;
    use std::path::Path;
    pub fn send(_: &Path, _: Request) -> Result<Response, IpcError> {
        Err(IpcError::UnsupportedPlatform)
    }
}
