// Fase 5C — integrasi Tauri + Express sidecar (Opsi A: single-server tetap Express).
// Siklus: spawn sidecar express-server (PORT=0) → parse baris READY_PORT=<port> dari
// stdout → buka WebView ke http://localhost:<port> → saat app exit, kill sidecar.
// Binary typst ikut sebagai sidecar kedua; path-nya diteruskan ke Express via
// TAURI_ASSETS_DIR / TAURI_EXE_DIR (dibaca lib/runtime-paths.js).
use std::sync::Mutex;
use tauri::{Manager, RunEvent, WebviewUrl, WebviewWindowBuilder};
use tauri_plugin_shell::process::{CommandChild, CommandEvent};
use tauri_plugin_shell::ShellExt;

/// Handle child process Express agar bisa dimatikan saat aplikasi ditutup.
struct ExpressSidecar(Mutex<Option<CommandChild>>);

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(ExpressSidecar(Mutex::new(None)))
        .setup(|app| {
            let handle = app.handle().clone();

            let resources = handle.path().resource_dir()?.into_os_string();
            let exe_dir = handle.path().executable_dir()?.into_os_string();

            let cmd = handle
                .shell()
                .sidecar("express-server")?
                .env("PORT", "0")
                .env("TAURI_ASSETS_DIR", resources)
                .env("TAURI_EXE_DIR", exe_dir);

            let (mut rx, child) = cmd.spawn()?;

            // simpan handle child untuk di-kill saat exit
            *handle.state::<ExpressSidecar>().0.lock().unwrap() = Some(child);

            tauri::async_runtime::spawn(async move {
                while let Some(event) = rx.recv().await {
                    if let CommandEvent::Stdout(line) = event {
                        let text = String::from_utf8_lossy(&line);
                        if let Some(port_str) = text.trim().strip_prefix("READY_PORT=") {
                            if let Ok(port) = port_str.trim().parse::<u16>() {
                                let url = format!("http://localhost:{port}");
                                let parsed = tauri::Url::parse(&url).expect("URL localhost valid");
                                let _ = WebviewWindowBuilder::new(
                                    &handle,
                                    "main",
                                    WebviewUrl::External(parsed),
                                )
                                .title("Chat to PDF")
                                .inner_size(1200.0, 800.0)
                                .build();
                            }
                            break;
                        }
                    }
                }
            });

            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("gagal membangun aplikasi Tauri")
        .run(|app_handle, event| {
            // Pastikan sidecar Express berhenti saat aplikasi ditutup (uji E2E Fase 5C)
            if let RunEvent::Exit = event {
                if let Some(state) = app_handle.try_state::<ExpressSidecar>() {
                    if let Some(child) = state.0.lock().unwrap().take() {
                        let _ = child.kill();
                    }
                }
            }
        });
}
