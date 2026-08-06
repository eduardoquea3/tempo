use serde::{Deserialize, Serialize};
use thiserror::Error;

pub const DEFAULT_FOCUS_SECONDS: u64 = 25 * 60;
pub const DEFAULT_SHORT_BREAK_SECONDS: u64 = 5 * 60;
pub const DEFAULT_LONG_BREAK_SECONDS: u64 = 15 * 60;
pub const COMPLETION_GRACE_MS: u64 = 5_200;

#[derive(Clone, Copy, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum Mode {
    Focus,
    ShortBreak,
    LongBreak,
}

#[derive(Clone, Copy, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum Status {
    Idle,
    Running,
    Paused,
    Completed,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DurationConfig {
    pub focus_seconds: u64,
    pub short_break_seconds: u64,
    pub long_break_seconds: u64,
}

impl Default for DurationConfig {
    fn default() -> Self {
        Self {
            focus_seconds: DEFAULT_FOCUS_SECONDS,
            short_break_seconds: DEFAULT_SHORT_BREAK_SECONDS,
            long_break_seconds: DEFAULT_LONG_BREAK_SECONDS,
        }
    }
}

impl DurationConfig {
    pub fn for_mode(&self, mode: Mode) -> u64 {
        match mode {
            Mode::Focus => self.focus_seconds,
            Mode::ShortBreak => self.short_break_seconds,
            Mode::LongBreak => self.long_break_seconds,
        }
    }
}

#[derive(Clone, Debug, Deserialize, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PomodoroConfig {
    pub durations: DurationConfig,
    pub sessions_before_long_break: u32,
    pub auto_advance: bool,
    pub sound_enabled: bool,
    #[serde(default)]
    pub start_on_login: bool,
}

impl Default for PomodoroConfig {
    fn default() -> Self {
        Self {
            durations: DurationConfig::default(),
            sessions_before_long_break: 4,
            auto_advance: true,
            sound_enabled: true,
            start_on_login: false,
        }
    }
}

#[derive(Clone, Debug, Deserialize, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PomodoroState {
    pub mode: Mode,
    pub status: Status,
    pub session: u32,
    pub elapsed_before_start_ms: u64,
    pub started_at_ms: Option<u64>,
    #[serde(default)]
    pub completed_at_ms: Option<u64>,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Snapshot {
    pub state: PomodoroState,
    pub config: PomodoroConfig,
    pub duration_seconds: u64,
    pub remaining_seconds: u64,
    pub timestamp_ms: u64,
}

#[derive(Debug, Error, PartialEq)]
pub enum CoreError {
    #[error("timer is already running")]
    AlreadyRunning,
    #[error("timer is not running")]
    NotRunning,
}

impl Default for PomodoroState {
    fn default() -> Self {
        Self {
            mode: Mode::Focus,
            status: Status::Idle,
            session: 1,
            elapsed_before_start_ms: 0,
            started_at_ms: None,
            completed_at_ms: None,
        }
    }
}

impl PomodoroState {
    pub fn duration_seconds(&self, config: &PomodoroConfig) -> u64 {
        config.durations.for_mode(self.mode)
    }

    pub fn remaining_seconds_at(&self, config: &PomodoroConfig, now_ms: u64) -> u64 {
        let elapsed = self.elapsed_before_start_ms.saturating_add(
            self.started_at_ms
                .map(|start| now_ms.saturating_sub(start))
                .unwrap_or(0),
        );
        self.duration_seconds(config).saturating_sub(elapsed / 1000)
    }

    pub fn snapshot(&self, config: &PomodoroConfig, now_ms: u64) -> Snapshot {
        Snapshot {
            state: self.clone(),
            config: config.clone(),
            duration_seconds: self.duration_seconds(config),
            remaining_seconds: self.remaining_seconds_at(config, now_ms),
            timestamp_ms: now_ms,
        }
    }

    pub fn complete_if_elapsed(&mut self, config: &PomodoroConfig, now_ms: u64) {
        if self.status != Status::Running {
            return;
        }

        let elapsed_ms = self.elapsed_before_start_ms.saturating_add(
            self.started_at_ms
                .map(|start| now_ms.saturating_sub(start))
                .unwrap_or(0),
        );

        let duration_ms = self.duration_seconds(config).saturating_mul(1000).max(1);
        if elapsed_ms < duration_ms {
            self.elapsed_before_start_ms = 0;
            self.started_at_ms = Some(now_ms.saturating_sub(elapsed_ms));
            return;
        }

        self.elapsed_before_start_ms = duration_ms;
        self.started_at_ms = None;
        self.status = Status::Completed;
        self.completed_at_ms = Some(now_ms.saturating_sub(elapsed_ms - duration_ms));
    }

    pub fn advance_if_ready(&mut self, config: &PomodoroConfig, now_ms: u64) {
        if !config.auto_advance || self.status != Status::Completed {
            return;
        }
        let Some(completed_at_ms) = self.completed_at_ms else {
            return;
        };
        if now_ms.saturating_sub(completed_at_ms) < COMPLETION_GRACE_MS {
            return;
        }

        let completed_mode = self.mode;
        self.mode = next_mode(self.mode, self.session, config.sessions_before_long_break);
        if completed_mode == Mode::LongBreak {
            self.session = 1;
        } else if self.mode == Mode::Focus {
            self.session = self.session.saturating_add(1);
        }
        self.status = Status::Running;
        self.elapsed_before_start_ms = 0;
        self.started_at_ms = Some(now_ms);
        self.completed_at_ms = None;
    }

    pub fn start(&mut self, now_ms: u64) -> Result<(), CoreError> {
        if self.status == Status::Running {
            return Err(CoreError::AlreadyRunning);
        }
        if self.status == Status::Completed {
            self.elapsed_before_start_ms = 0;
            self.completed_at_ms = None;
            if self.mode == Mode::LongBreak {
                self.session = 1;
            }
        }
        self.status = Status::Running;
        self.started_at_ms = Some(now_ms);
        Ok(())
    }
    pub fn pause(&mut self, now_ms: u64) -> Result<(), CoreError> {
        if self.status != Status::Running {
            return Err(CoreError::NotRunning);
        }
        self.elapsed_before_start_ms = self
            .elapsed_before_start_ms
            .saturating_add(now_ms.saturating_sub(self.started_at_ms.unwrap_or(now_ms)));
        self.started_at_ms = None;
        self.status = Status::Paused;
        Ok(())
    }
    pub fn resume(&mut self, now_ms: u64) -> Result<(), CoreError> {
        if self.status == Status::Running {
            return Err(CoreError::AlreadyRunning);
        }
        if self.status == Status::Completed {
            self.elapsed_before_start_ms = 0;
            self.completed_at_ms = None;
            if self.mode == Mode::LongBreak {
                self.session = 1;
            }
        }
        self.status = Status::Running;
        self.started_at_ms = Some(now_ms);
        Ok(())
    }
    pub fn toggle(&mut self, now_ms: u64) -> Result<(), CoreError> {
        if self.status == Status::Running {
            self.pause(now_ms)
        } else {
            self.resume(now_ms)
        }
    }
    pub fn skip(&mut self, config: &PomodoroConfig) {
        let completed_mode = self.mode;
        self.mode = next_mode(self.mode, self.session, config.sessions_before_long_break);
        if completed_mode == Mode::LongBreak {
            self.session = 1;
        } else if self.mode == Mode::Focus {
            self.session = self.session.saturating_add(1);
        }
        self.reset_clock(Status::Idle);
    }
    pub fn stop(&mut self) {
        self.reset_clock(Status::Idle);
    }
    pub fn reset(&mut self) {
        self.reset_clock(Status::Idle);
    }
    pub fn set_mode(&mut self, mode: Mode) {
        self.mode = mode;
        self.reset_clock(Status::Idle);
    }
    fn reset_clock(&mut self, status: Status) {
        self.status = status;
        self.elapsed_before_start_ms = 0;
        self.started_at_ms = None;
        self.completed_at_ms = None;
    }
}

fn next_mode(mode: Mode, session: u32, before_long: u32) -> Mode {
    if mode == Mode::Focus {
        if session % before_long.max(1) == 0 {
            Mode::LongBreak
        } else {
            Mode::ShortBreak
        }
    } else {
        Mode::Focus
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn remaining_uses_timestamp_not_ticks() {
        let mut state = PomodoroState::default();
        let config = PomodoroConfig::default();
        state.start(1_000).unwrap();
        assert_eq!(state.remaining_seconds_at(&config, 6_000), 1_495);
        assert_eq!(state.remaining_seconds_at(&config, 61_000), 1_440);
    }
    #[test]
    fn pause_and_resume_preserve_elapsed_time() {
        let mut state = PomodoroState::default();
        let config = PomodoroConfig::default();
        state.start(0).unwrap();
        state.pause(10_000).unwrap();
        state.resume(100_000).unwrap();
        assert_eq!(state.remaining_seconds_at(&config, 105_000), 1_485);
    }
    #[test]
    fn transitions_change_modes_and_reset_clock() {
        let mut state = PomodoroState::default();
        let config = PomodoroConfig::default();
        state.skip(&config);
        assert_eq!(state.mode, Mode::ShortBreak);
        state.skip(&config);
        assert_eq!(state.mode, Mode::Focus);
        assert_eq!(state.status, Status::Idle);
    }
    #[test]
    fn snapshot_is_json_serializable() {
        let snapshot = PomodoroState::default().snapshot(&PomodoroConfig::default(), 42);
        let json = serde_json::to_string(&snapshot).unwrap();
        assert!(json.contains("remainingSeconds"));
    }

    #[test]
    fn elapsed_timer_becomes_completed_without_ticks() {
        let mut state = PomodoroState::default();
        let mut config = PomodoroConfig::default();
        config.auto_advance = false;
        state.start(0).unwrap();
        state.complete_if_elapsed(&config, DEFAULT_FOCUS_SECONDS * 1000);
        assert_eq!(state.status, Status::Completed);
        assert_eq!(
            state.remaining_seconds_at(&config, DEFAULT_FOCUS_SECONDS * 1000),
            0
        );
    }

    #[test]
    fn completion_waits_for_grace_before_auto_advance() {
        let mut state = PomodoroState::default();
        let mut config = PomodoroConfig::default();
        config.auto_advance = true;
        config.durations = DurationConfig {
            focus_seconds: 10,
            short_break_seconds: 3,
            long_break_seconds: 5,
        };
        config.sessions_before_long_break = 4;

        state.start(0).unwrap();
        state.complete_if_elapsed(&config, 10_000);

        assert_eq!(state.mode, Mode::Focus);
        assert_eq!(state.session, 1);
        assert_eq!(state.status, Status::Completed);
        assert_eq!(state.completed_at_ms, Some(10_000));
        state.advance_if_ready(&config, 15_199);
        assert_eq!(state.status, Status::Completed);
        state.advance_if_ready(&config, 15_200);
        assert_eq!(state.mode, Mode::ShortBreak);
        assert_eq!(state.session, 1);
        assert_eq!(state.status, Status::Running);
        assert_eq!(state.elapsed_before_start_ms, 0);
        assert_eq!(state.started_at_ms, Some(15_200));
    }

    #[test]
    fn auto_advance_false_remains_completed() {
        let mut state = PomodoroState::default();
        let mut config = PomodoroConfig::default();
        config.auto_advance = false;
        state.start(0).unwrap();
        state.complete_if_elapsed(&config, DEFAULT_FOCUS_SECONDS * 1000);
        state.advance_if_ready(&config, DEFAULT_FOCUS_SECONDS * 1000 + COMPLETION_GRACE_MS);
        assert_eq!(state.status, Status::Completed);
        assert_eq!(state.mode, Mode::Focus);
    }

    #[test]
    fn older_persisted_state_defaults_completed_timestamp() {
        let state: PomodoroState = serde_json::from_str(
            r#"{"mode":"focus","status":"completed","session":1,"elapsedBeforeStartMs":1500000,"startedAtMs":null}"#,
        )
        .unwrap();
        assert_eq!(state.completed_at_ms, None);
    }

    #[test]
    fn completed_session_can_be_started_again_as_a_fresh_session() {
        let mut state = PomodoroState::default();
        let mut config = PomodoroConfig::default();
        config.auto_advance = false;

        state.start(0).unwrap();
        state.complete_if_elapsed(&config, DEFAULT_FOCUS_SECONDS * 1000);
        state.toggle(DEFAULT_FOCUS_SECONDS * 1000 + 1).unwrap();

        assert_eq!(state.status, Status::Running);
        assert_eq!(state.elapsed_before_start_ms, 0);
        assert_eq!(
            state.remaining_seconds_at(&config, DEFAULT_FOCUS_SECONDS * 1000 + 1),
            DEFAULT_FOCUS_SECONDS
        );
    }

    #[test]
    fn long_break_resets_session_for_the_next_cycle() {
        let mut state = PomodoroState {
            mode: Mode::LongBreak,
            session: 4,
            status: Status::Completed,
            completed_at_ms: Some(0),
            ..PomodoroState::default()
        };
        let config = PomodoroConfig::default();

        state.advance_if_ready(&config, COMPLETION_GRACE_MS);

        assert_eq!(state.mode, Mode::Focus);
        assert_eq!(state.session, 1);
        assert_eq!(state.status, Status::Running);
    }

    #[test]
    fn skipping_long_break_resets_session_for_the_next_cycle() {
        let mut state = PomodoroState {
            mode: Mode::LongBreak,
            session: 4,
            ..PomodoroState::default()
        };
        let config = PomodoroConfig::default();

        state.skip(&config);

        assert_eq!(state.mode, Mode::Focus);
        assert_eq!(state.session, 1);
    }
}
