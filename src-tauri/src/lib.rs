use std::{
    sync::atomic::{AtomicU64, Ordering},
    sync::{Arc, Mutex},
    time::{Duration, SystemTime, UNIX_EPOCH},
};

use serde::{Deserialize, Serialize};
use tempo_core::{Mode, PomodoroConfig, PomodoroState, Snapshot};

use tauri::{
    menu::{MenuBuilder, MenuItemBuilder},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager, PhysicalPosition, WindowEvent,
};

#[derive(Default)]
struct TrayInteraction {
    focus_generation: Arc<AtomicU64>,
}

#[derive(Default)]
struct TempoState {
    state: Mutex<PomodoroState>,
    config: Mutex<PomodoroConfig>,
}

#[derive(Deserialize, Serialize)]
struct PersistedTempo {
    state: PomodoroState,
    config: PomodoroConfig,
}

fn now_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64
}

fn tempo_snapshot(state: &TempoState) -> Snapshot {
    let mut timer = state.state.lock().expect("tempo state poisoned");
    let config = state.config.lock().expect("tempo config poisoned");
    let now = now_ms();
    timer.complete_if_elapsed(&config, now);
    timer.advance_if_ready(&config, now);
    timer.snapshot(&config, now)
}

#[tauri::command]
fn tempo_status(state: tauri::State<'_, TempoState>) -> Snapshot {
    tempo_snapshot(&state)
}

fn mutate_tempo(
    app: &tauri::AppHandle,
    state: &TempoState,
    action: impl FnOnce(&mut PomodoroState, &PomodoroConfig) -> Result<(), String>,
) -> Result<Snapshot, String> {
    let mut timer = state
        .state
        .lock()
        .map_err(|_| "tempo state poisoned".to_string())?;
    let config = state
        .config
        .lock()
        .map_err(|_| "tempo config poisoned".to_string())?;
    let now = now_ms();
    timer.complete_if_elapsed(&config, now);
    timer.advance_if_ready(&config, now);
    action(&mut timer, &config)?;
    let snapshot = timer.snapshot(&config, now_ms());
    persist_tempo(app, &timer, &config)?;
    Ok(snapshot)
}

fn persist_tempo(
    app: &tauri::AppHandle,
    state: &PomodoroState,
    config: &PomodoroConfig,
) -> Result<(), String> {
    let directory = app.path().app_data_dir().map_err(|e| e.to_string())?;
    std::fs::create_dir_all(&directory).map_err(|e| e.to_string())?;
    let value = PersistedTempo {
        state: state.clone(),
        config: config.clone(),
    };
    let bytes = serde_json::to_vec_pretty(&value).map_err(|e| e.to_string())?;
    let path = directory.join("tempo.json");
    let temporary_path = directory.join("tempo.json.tmp");
    std::fs::write(&temporary_path, bytes).map_err(|e| e.to_string())?;
    replace_persisted_file(&temporary_path, &path)
}

#[cfg(windows)]
fn replace_persisted_file(
    temporary_path: &std::path::Path,
    path: &std::path::Path,
) -> Result<(), String> {
    use std::os::windows::ffi::OsStrExt;
    use windows_sys::Win32::Storage::FileSystem::{MoveFileExW, MOVEFILE_REPLACE_EXISTING};

    let source = temporary_path
        .as_os_str()
        .encode_wide()
        .chain(std::iter::once(0))
        .collect::<Vec<_>>();
    let destination = path
        .as_os_str()
        .encode_wide()
        .chain(std::iter::once(0))
        .collect::<Vec<_>>();

    if unsafe {
        MoveFileExW(
            source.as_ptr(),
            destination.as_ptr(),
            MOVEFILE_REPLACE_EXISTING,
        )
    } == 0
    {
        return Err(std::io::Error::last_os_error().to_string());
    }
    Ok(())
}

#[cfg(not(windows))]
fn replace_persisted_file(
    temporary_path: &std::path::Path,
    path: &std::path::Path,
) -> Result<(), String> {
    std::fs::rename(temporary_path, path).map_err(|e| e.to_string())
}

fn load_persisted_tempo(app: &tauri::AppHandle) -> Option<PersistedTempo> {
    let path = app.path().app_data_dir().ok()?.join("tempo.json");
    let bytes = std::fs::read(path).ok()?;
    serde_json::from_slice(&bytes).ok()
}

#[tauri::command]
fn tempo_start(
    app: tauri::AppHandle,
    state: tauri::State<'_, TempoState>,
) -> Result<Snapshot, String> {
    mutate_tempo(&app, &state, |timer, _| {
        timer.start(now_ms()).map_err(|e| e.to_string())
    })
}
#[tauri::command]
fn tempo_pause(
    app: tauri::AppHandle,
    state: tauri::State<'_, TempoState>,
) -> Result<Snapshot, String> {
    mutate_tempo(&app, &state, |timer, _| {
        timer.pause(now_ms()).map_err(|e| e.to_string())
    })
}
#[tauri::command]
fn tempo_resume(
    app: tauri::AppHandle,
    state: tauri::State<'_, TempoState>,
) -> Result<Snapshot, String> {
    mutate_tempo(&app, &state, |timer, _| {
        timer.resume(now_ms()).map_err(|e| e.to_string())
    })
}
#[tauri::command]
fn tempo_toggle(
    app: tauri::AppHandle,
    state: tauri::State<'_, TempoState>,
) -> Result<Snapshot, String> {
    mutate_tempo(&app, &state, |timer, _| {
        timer.toggle(now_ms()).map_err(|e| e.to_string())
    })
}
#[tauri::command]
fn tempo_skip(
    app: tauri::AppHandle,
    state: tauri::State<'_, TempoState>,
) -> Result<Snapshot, String> {
    mutate_tempo(&app, &state, |timer, config| {
        timer.skip(config);
        Ok(())
    })
}
#[tauri::command]
fn tempo_stop(
    app: tauri::AppHandle,
    state: tauri::State<'_, TempoState>,
) -> Result<Snapshot, String> {
    mutate_tempo(&app, &state, |timer, _| {
        timer.stop();
        Ok(())
    })
}
#[tauri::command]
fn tempo_reset(
    app: tauri::AppHandle,
    state: tauri::State<'_, TempoState>,
) -> Result<Snapshot, String> {
    mutate_tempo(&app, &state, |timer, _| {
        timer.reset();
        Ok(())
    })
}
#[tauri::command]
fn tempo_set_mode(
    app: tauri::AppHandle,
    state: tauri::State<'_, TempoState>,
    mode: Mode,
) -> Result<Snapshot, String> {
    mutate_tempo(&app, &state, |timer, _| {
        timer.set_mode(mode);
        Ok(())
    })
}
#[tauri::command]
fn tempo_set_config(
    app: tauri::AppHandle,
    state: tauri::State<'_, TempoState>,
    config: PomodoroConfig,
) -> Result<Snapshot, String> {
    let mut timer = state
        .state
        .lock()
        .map_err(|_| "tempo state poisoned".to_string())?;
    let mut value = state
        .config
        .lock()
        .map_err(|_| "tempo config poisoned".to_string())?;
    *value = config.clone();
    let now = now_ms();
    timer.complete_if_elapsed(&config, now);
    timer.advance_if_ready(&config, now);
    persist_tempo(&app, &timer, &config)?;
    Ok(timer.snapshot(&config, now))
}

#[cfg(target_os = "windows")]
fn taskbar_height() -> i32 {
    use std::ptr::null;
    use windows_sys::Win32::Foundation::RECT;
    use windows_sys::Win32::UI::WindowsAndMessaging::{FindWindowW, GetWindowRect};

    let class_name: Vec<u16> = "Shell_TrayWnd".encode_utf16().chain([0]).collect();
    let taskbar = unsafe { FindWindowW(class_name.as_ptr(), null()) };
    if taskbar.is_null() {
        return 0;
    }

    let mut rect = RECT {
        left: 0,
        top: 0,
        right: 0,
        bottom: 0,
    };
    if unsafe { GetWindowRect(taskbar, &mut rect) } == 0 {
        return 0;
    }

    (rect.bottom - rect.top).max(0)
}

#[cfg(not(target_os = "windows"))]
fn taskbar_height() -> i32 {
    0
}

fn position_near_system_tray(window: &tauri::WebviewWindow) {
    let Ok(Some(monitor)) = window.current_monitor() else {
        return;
    };

    let Ok(window_size) = window.outer_size() else {
        return;
    };

    let monitor_position = monitor.position();
    let monitor_size = monitor.size();
    let taskbar_height = taskbar_height();
    // Keep the popup above the taskbar while preserving a small visual gap.
    let edge_margin = 8;
    let x = monitor_position.x + monitor_size.width as i32 - window_size.width as i32 - edge_margin;
    let y = monitor_position.y + monitor_size.height as i32
        - window_size.height as i32
        - edge_margin
        - taskbar_height;

    let _ = window.set_position(PhysicalPosition::new(
        x.max(monitor_position.x),
        y.max(monitor_position.y),
    ));
}

fn show_main_window(app: &tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        position_near_system_tray(&window);
        let _ = window.unminimize();
        let _ = window.show();
        let _ = window.set_focus();
    }
}

fn hide_main_window(app: &tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.hide();
    }
}

#[tauri::command]
fn play_completion_sound() -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        use windows_sys::Win32::Media::Audio::{PlaySoundW, SND_ASYNC, SND_MEMORY};

        static SOUND: &[u8] = include_bytes!("../sounds/tempo-complete.wav");
        let played = unsafe {
            PlaySoundW(
                SOUND.as_ptr() as windows_sys::core::PCWSTR,
                std::ptr::null_mut(),
                SND_ASYNC | SND_MEMORY,
            )
        };
        if played == 0 {
            return Err("Windows could not play Tempo's completion sound".to_string());
        }
        return Ok(());
    }

    #[cfg(not(target_os = "windows"))]
    Err("Native completion sound is not available on this platform".to_string())
}

#[tauri::command]
fn tempo_show(app: tauri::AppHandle) -> Result<(), String> {
    show_main_window(&app);
    Ok(())
}

fn toggle_main_window(app: &tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        if window.is_visible().unwrap_or(false) {
            let _ = window.hide();
        } else {
            show_main_window(app);
        }
    }
}

fn mark_tray_interaction(app: &tauri::AppHandle) {
    let interaction = app.state::<TrayInteraction>();
    interaction.focus_generation.fetch_add(1, Ordering::SeqCst);
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(TrayInteraction::default())
        .manage(TempoState::default())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_notification::init())
        .invoke_handler(tauri::generate_handler![
            play_completion_sound,
            tempo_show,
            tempo_status,
            tempo_start,
            tempo_pause,
            tempo_resume,
            tempo_toggle,
            tempo_skip,
            tempo_stop,
            tempo_reset,
            tempo_set_mode,
            tempo_set_config
        ])
        .setup(|app| {
            let app_handle = app.handle().clone();
            if let Some(saved) = load_persisted_tempo(&app_handle) {
                let state = app.state::<TempoState>();
                *state
                    .state
                    .lock()
                    .map_err(|_| std::io::Error::other("tempo state poisoned"))? = saved.state;
                *state
                    .config
                    .lock()
                    .map_err(|_| std::io::Error::other("tempo config poisoned"))? = saved.config;
            }
            {
                let state = app.state::<TempoState>();
                let timer = state
                    .state
                    .lock()
                    .map_err(|_| std::io::Error::other("tempo state poisoned"))?;
                let config = state
                    .config
                    .lock()
                    .map_err(|_| std::io::Error::other("tempo config poisoned"))?;
                persist_tempo(&app_handle, &timer, &config).map_err(std::io::Error::other)?;
            }
            let open_item = MenuItemBuilder::with_id("open", "Open").build(app)?;
            let quit_item = MenuItemBuilder::with_id("quit", "Quit").build(app)?;
            let menu = MenuBuilder::new(app)
                .items(&[&open_item, &quit_item])
                .build()?;

            TrayIconBuilder::with_id("tempo-tray")
                .icon(app.default_window_icon().unwrap().clone())
                .tooltip("Tempo")
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id().as_ref() {
                    "open" => {
                        mark_tray_interaction(app);
                        show_main_window(app);
                    }
                    "quit" => app.exit(0),
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Down,
                        ..
                    } = event
                    {
                        mark_tray_interaction(tray.app_handle());
                        return;
                    }

                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        toggle_main_window(tray.app_handle());
                    }
                })
                .build(app)?;

            hide_main_window(&app.handle().clone());
            Ok(())
        })
        .on_window_event(|window, event| match event {
            WindowEvent::Focused(false) => {
                let app = window.app_handle().clone();
                let interaction = app.state::<TrayInteraction>();
                let generation = interaction.focus_generation.load(Ordering::SeqCst);
                let focus_generation = interaction.focus_generation.clone();

                std::thread::spawn(move || {
                    std::thread::sleep(Duration::from_millis(120));
                    if focus_generation.load(Ordering::SeqCst) != generation {
                        return;
                    }

                    if let Some(window) = app.get_webview_window("main") {
                        if !window.is_focused().unwrap_or(false) {
                            let _ = window.hide();
                        }
                    }
                });
            }
            WindowEvent::CloseRequested { api, .. } => {
                api.prevent_close();
                let app = window.app_handle();
                hide_main_window(&app);
            }
            _ => {}
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
