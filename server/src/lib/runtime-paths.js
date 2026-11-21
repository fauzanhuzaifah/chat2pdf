// Runtime path resolution — Fase 5B: menjaga server tetap bekerja di tiga mode:
//   1. dev repo (npm start)         — path relatif sumber
//   2. binary standalone (pkg)      — resource di sebelah binary (execDir atau execDir/resources)
//   3. sidecar Tauri                — env TAURI_* yang di-set Rust (TAURI_ASSETS_DIR, TAURI_EXE_DIR)
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const moduleDir = path.dirname(fileURLToPath(import.meta.url))
export const isPkg = typeof process.pkg !== 'undefined'
export const execDir = isPkg ? path.dirname(process.execPath) : null

// Kandidat root resource, urut prioritas
export function resourceCandidates() {
  const cands = []
  if (process.env.TAURI_ASSETS_DIR) {
    cands.push(process.env.TAURI_ASSETS_DIR)
    // Fase 5D: bundler Tauri menaruh resources dengan struktur asli di bawah dir exe
    // → $INSTDIR\resources\... (resource_dir() pada Windows = dir exe)
    cands.push(`${process.env.TAURI_ASSETS_DIR}/resources`)
  }
  if (isPkg) {
    cands.push(path.join(execDir, 'resources'))
    cands.push(execDir)
  }
  cands.push(path.join(moduleDir, '../..')) // root repo server (dev)
  return cands
}

// Dir aset Typst: kandidat pertama yang berisi main.typ.
// Layout: dev = server/typst; binary = <execDir>/resources/typst-assets (Tauri) atau <execDir>/typst-assets
export function findTypstAssetsDir() {
  const roots = [
    process.env.TYPST_ASSETS_DIR,
    process.env.TAURI_ASSETS_DIR && path.join(process.env.TAURI_ASSETS_DIR, 'typst-assets'),
    process.env.TAURI_ASSETS_DIR && path.join(process.env.TAURI_ASSETS_DIR, 'resources', 'typst-assets'),
    process.env.TAURI_ASSETS_DIR,
    isPkg && path.join(execDir, 'resources', 'typst-assets'),
    ...resourceCandidates(),
    isPkg && path.join(execDir, 'typst-assets'),
  ].filter(Boolean)
  for (const c of roots) {
    if (fs.existsSync(path.join(c, 'main.typ'))) return c
  }
  return path.join(moduleDir, '../..', 'typst')
}

// Binary Typst: env → samping binary (sidecar Tauri) → resources/binaries → path dev
export function findTypstBinary() {
  const exeName = process.platform === 'win32' ? 'typst.exe' : 'typst'
  const cands = [
    process.env.TYPST_BIN,
    process.env.TAURI_TYPST_BIN,
    isPkg && path.join(execDir, exeName),
    isPkg && path.join(execDir, 'resources', 'binaries', exeName),
    process.env.TAURI_EXE_DIR && path.join(process.env.TAURI_EXE_DIR, exeName),
  ].filter(Boolean)
  for (const c of cands) {
    if (fs.existsSync(c)) return c
  }
  return '/home/z/my-project/tools/typst/typst' // path dev sandbox
}

// client/dist: env → resource → repo dev
export function findClientDist() {
  const cands = [
    process.env.CLIENT_DIST_DIR,
    isPkg && path.join(execDir, 'resources', 'client-dist'),
    process.env.TAURI_ASSETS_DIR && path.join(process.env.TAURI_ASSETS_DIR, 'client-dist'),
    process.env.TAURI_ASSETS_DIR && path.join(process.env.TAURI_ASSETS_DIR, 'resources', 'client-dist'),
    path.join(moduleDir, '../../..', 'client/dist'),
  ].filter(Boolean)
  for (const c of cands) {
    if (fs.existsSync(c)) return c
  }
  return path.join(moduleDir, '../../..', 'client/dist')
}

// DATABASE_URL fallback untuk mode binary (dev memakai .env)
export function ensureDatabaseUrl() {
  if (process.env.DATABASE_URL) return
  for (const root of resourceCandidates()) {
    const db = path.join(root, 'prisma', 'dev.db')
    if (root && fs.existsSync(db)) {
      process.env.DATABASE_URL = `file:${db}`
      return
    }
  }
}

// Cari file libquery engine Prisma yang REAL di disk (tidak bisa dlopen dari snapshot pkg)
export function findPrismaEngine() {
  const dirs = resourceCandidates().map((root) => path.join(root, 'prisma'))
  if (isPkg) {
    dirs.push(path.join(execDir, 'resources', 'prisma'))
  }
  for (const dir of dirs) {
    if (!dir || !fs.existsSync(dir)) continue
    const found = fs.readdirSync(dir).find((f) => f.startsWith('libquery_engine') || f === 'query-engine.dll.node' || f === 'query_engine.dll.node')
    if (found) return path.join(dir, found)
  }
  return null
}
