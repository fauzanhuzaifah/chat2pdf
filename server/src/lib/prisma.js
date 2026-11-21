// Import default + destructure: named-import ESM dari paket CJS (@prisma/client)
// tidak terdeteksi cjs-module-lexer di dalam snapshot pkg/SEA.
import prismaPkg from '@prisma/client'
import { ensureDatabaseUrl, findPrismaEngine, isPkg } from './runtime-paths.js'

// Fase 5B: env Prisma dibaca saat `new PrismaClient()` (bukan saat import), jadi
// menyetingnya di sini — sebelum instansiasi — cukup dan aman terhadap hoisting.
ensureDatabaseUrl()
if (isPkg) {
  const engine = findPrismaEngine()
  if (engine) process.env.PRISMA_QUERY_ENGINE_LIBRARY = engine
  else console.warn('[sidecar] libquery engine tidak ditemukan di samping binary — Prisma akan gagal query')
}

const { PrismaClient } = prismaPkg
const prisma = new PrismaClient()

export default prisma
