use tauri::{
    PhysicalPosition,
    Manager,
    menu::{MenuBuilder, MenuItemBuilder},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    WindowEvent,
};

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
    let y = monitor_position.y + monitor_size.height as i32 - window_size.height as i32 - edge_margin - taskbar_height;

    let _ = window.set_position(PhysicalPosition::new(x.max(monitor_position.x), y.max(monitor_position.y)));
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let open_item = MenuItemBuilder::with_id("open", "Open").build(app)?;
            let quit_item = MenuItemBuilder::with_id("quit", "Quit").build(app)?;
            let menu = MenuBuilder::new(app).items(&[&open_item, &quit_item]).build()?;

            TrayIconBuilder::with_id("tempo-tray")
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                .show_menu_on_left_click(true)
                .on_menu_event(|app, event| match event.id().as_ref() {
                    "open" => show_main_window(app),
                    "quit" => app.exit(0),
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        show_main_window(tray.app_handle());
                    }
                })
                .build(app)?;

            hide_main_window(&app.handle().clone());
            Ok(())
        })
        .on_window_event(|window, event| match event {
            WindowEvent::CloseRequested { api, .. } => {
                api.prevent_close();
                let app = window.app_handle();
                hide_main_window(&app);
            }
            WindowEvent::Focused(false) => {
                let app = window.app_handle();
                hide_main_window(&app);
            }
            _ => {}
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
