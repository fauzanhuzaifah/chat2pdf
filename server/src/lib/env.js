// Muat .env (dev) SEBELUM modul lain dievaluasi — di-import paling atas di app.js.
// Pakai entry utama dotenv: subpath 'dotenv/config' tidak terlacak resolver pkg.
import dotenv from 'dotenv'

dotenv.config()

// Fase 5D: di aplikasi ter-instal Tauri, resources/.env berada di $INSTDIR\resources\
// (resource_dir() = dir exe), bukan di cwd sidecar — muat sebagai fallback tanpa override.
if (process.env.TAURI_ASSETS_DIR) {
  dotenv.config({ path: `${process.env.TAURI_ASSETS_DIR}/resources/.env` })
  dotenv.config({ path: `${process.env.TAURI_ASSETS_DIR}/.env` })
}
