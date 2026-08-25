// Prevents an additional console window when Windows launches Tempo at login.
#![cfg_attr(windows, windows_subsystem = "windows")]

fn main() {
    tempo_lib::run()
}
