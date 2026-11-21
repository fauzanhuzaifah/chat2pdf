import './lib/env.js'
import express from 'express'
import cors from 'cors'
import path from 'node:path'
import { findClientDist } from './lib/runtime-paths.js'
import { generatePDFHandler } from './controllers/pdfController.js'
import { verifyLicenseHandler } from './controllers/licenseController.js'

// Prisma env (DATABASE_URL + engine path di mode binary) diset di lib/prisma.js
// sebelum instansiasi client — aman terhadap import hoisting ESM.
const clientDist = findClientDist()

const app = express()
// PORT=0 → OS pilih port bebas (dipakai Tauri); port aktual diumumkan lewat READY_PORT
const PORT = parseInt(process.env.PORT || '5000', 10)

app.use(cors())
app.use(express.json({ limit: '10mb' }))

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Chat-to-PDF API is running' })
})

app.post('/api/generate-pdf', generatePDFHandler)

app.post('/api/license/verify', verifyLicenseHandler)

// 404 JSON untuk /api/* yang tidak dikenal — jangan sampai ditangkap SPA fallback
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found' })
})

// Satu server: melayani frontend hasil build (client/dist) + API di /api
app.use(express.static(clientDist))
app.get('*', (req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'), (err) => {
    if (err) {
      res.status(500).send('Frontend build tidak ditemukan. Jalankan "npm run build" di folder client/ terlebih dahulu.')
    }
  })
})

// Bind 127.0.0.1: desktop app lokal, tidak perlu terekspos ke jaringan
const server = app.listen(PORT, '127.0.0.1', () => {
  const actualPort = server.address().port
  console.log(`Server running on http://localhost:${actualPort}`)
  // Baris mesin-terbaca yang diparse Tauri (Fase 5C) untuk membuka WebView ke port dinamis
  console.log(`READY_PORT=${actualPort}`)
})
