use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Arc;
use std::time::Duration;

use tauri::menu::{MenuBuilder, MenuItemBuilder};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{Manager, PhysicalPosition, WindowEvent};
use tauri_plugin_autostart::ManagerExt;

#[derive(Default)]
struct TrayInteraction {
    focus_generation: Arc<AtomicU64>,
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
    let edge_margin = 8;
    let x = monitor_position.x + monitor_size.width as i32 - window_size.width as i32 - edge_margin;
    let y = monitor_position.y + monitor_size.height as i32
        - window_size.height as i32
        - edge_margin
        - taskbar_height();
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
fn tempo_show(app: tauri::AppHandle) -> Result<(), String> {
    show_main_window(&app);
    Ok(())
}

#[tauri::command]
fn set_autostart(app: tauri::AppHandle, enabled: bool) -> Result<(), String> {
    if enabled {
        app.autolaunch().enable()
    } else {
        app.autolaunch().disable()
    }
    .map_err(|error| error.to_string())
}

#[tauri::command]
fn load_legacy_tempo(app: tauri::AppHandle) -> Result<Option<serde_json::Value>, String> {
    let path = app
        .path()
        .app_data_dir()
        .map_err(|error| error.to_string())?
        .join("tempo.json");
    match std::fs::read_to_string(path) {
        Ok(contents) => serde_json::from_str(&contents)
            .map(Some)
            .map_err(|error| error.to_string()),
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(None),
        Err(error) => Err(error.to_string()),
    }
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
    app.state::<TrayInteraction>()
        .focus_generation
        .fetch_add(1, Ordering::SeqCst);
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(TrayInteraction::default())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            None,
        ))
        .plugin(tauri_plugin_notification::init())
        .invoke_handler(tauri::generate_handler![
            tempo_show,
            set_autostart,
            load_legacy_tempo
        ])
        .setup(|app| {
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
                hide_main_window(&window.app_handle());
            }
            _ => {}
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
