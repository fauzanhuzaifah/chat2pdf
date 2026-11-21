// Service render PDF produksi — Fase 4B: engine Typst (menggantikan Puppeteer).
// Kontrak API sama dengan pdfService.js lama: generatePDF(content, settings) -> Buffer PDF.
// Pipeline: Markdown (+gambar data-URI) -> praproses JS -> cmarker/math mitex -> typst compile.
// Penempatan aset: server/typst/{main.typ, fonts/, packages/, work/} (work = gitignored).
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { findTypstAssetsDir, findTypstBinary } from '../lib/runtime-paths.js'

const moduleDir = path.dirname(fileURLToPath(import.meta.url))
// Fase 5B: lokasi binary & aset di-resolve antar mode dev/binary-sidecar (lihat lib/runtime-paths.js)
const TYPST_BIN = findTypstBinary()
const ASSETS_DIR = findTypstAssetsDir()
const COMPILE_TIMEOUT_MS = 30000

// Escape teks agar aman sebagai markup Typst di dalam [...]
function typstEscape(text) {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/[[\]]/g, (m) => `\\${m}`)
    .replace(/[#*$@<>`~'"]/g, (m) => `\\${m}`)
}

function decodeHtmlEntities(text) {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
}

function htmlToText(html) {
  return decodeHtmlEntities(html.replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim()
}

// Simpan base64 -> file, kembalikan path relatif terhadap main.typ (root compile)
function saveImage(workImgDir, imgRelPrefix, index, format, base64) {
  const ext = format === 'jpeg' ? 'jpg' : format === 'svg+xml' ? 'svg' : format
  const file = `img-${index}.${ext}`
  fs.writeFileSync(path.join(workImgDir, file), Buffer.from(base64, 'base64'))
  return `${imgRelPrefix}/${file}`
}

// Bangun blok raw-typst (komentar HTML) yang memanggil app-figure dari scope cmarker.
// Path gambar di-resolve dalam konteks main.typ, bukan paket cmarker.
function buildFigure(imagePath, imgAttrs, caption) {
  const wm = /max-width:\s*([\d.]+)%/i.exec(imgAttrs || '')
  const width = wm ? Math.round(Math.min(100, parseFloat(wm[1]))) : 100
  const cap = caption ? `, caption: [${typstEscape(caption)}]` : ''
  return `<!--raw-typst #app-figure("${imagePath}", ${width}${cap}) -->`
}

// Praproses konten: gambar data-URI -> file + figure raw-typst; URL eksternal -> tautan teks
// (Typst tidak mengambil gambar dari jaringan; fallback eksternal dilaporkan sebagai teks)
function prepareContent(content, workImgDir, imgRelPrefix) {
  let index = 0

  // 1) Div gambar dari App.vue (renderedContent): <div><img src="data:..."/><p>caption</p></div>
  let html = content.replace(
    /<div[^>]*>\s*<img\s+src="data:image\/([\w+.-]+);base64,([^"\s]+)"([^>]*)>(?:\s*<p[^>]*>([\s\S]*?)<\/p>)?\s*<\/div>/gi,
    (match, format, base64, imgAttrs, captionHtml) => {
      const imagePath = saveImage(workImgDir, imgRelPrefix, ++index, format.toLowerCase(), base64)
      const caption = captionHtml ? htmlToText(captionHtml) : ''
      return buildFigure(imagePath, imgAttrs, caption)
    }
  )

  // 2) <img> data-URI lepas tanpa wrapper div
  html = html.replace(
    /<img\s+src="data:image\/([\w+.-]+);base64,([^"\s]+)"([^>]*)>/gi,
    (match, format, base64, imgAttrs) => {
      const imagePath = saveImage(workImgDir, imgRelPrefix, ++index, format.toLowerCase(), base64)
      const alt = /alt="([^"]*)"/i.exec(imgAttrs || '')
      return buildFigure(imagePath, imgAttrs, alt ? htmlToText(alt[1]) : '')
    }
  )

  // 3) Markdown data-URI langsung: ![alt](data:image/...;base64,...)
  html = html.replace(
    /!\[([^\]]*)\]\(data:image\/[\w+.-]+;base64,([^)\s]+)\)/g,
    (match, alt, base64) => {
      const imagePath = saveImage(workImgDir, imgRelPrefix, ++index, 'png', base64)
      return buildFigure(imagePath, '', htmlToText(alt))
    }
  )

  // 4) Gambar URL eksternal: Typst tidak bisa fetch -> pertahankan sebagai tautan teks
  html = html.replace(
    /!\[([^\]]*)\]\((https?:\/\/[^)\s]+)\)/g,
    (match, alt, url) => `[Gambar: ${htmlToText(alt) || url}](${url})`
  )

  return html
}

function runTypst(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(TYPST_BIN, args, { stdio: ['ignore', 'ignore', 'pipe'] })
    let stderr = ''
    const timer = setTimeout(() => {
      child.kill('SIGKILL')
      reject(new Error(`typst compile timeout setelah ${COMPILE_TIMEOUT_MS / 1000}s`))
    }, COMPILE_TIMEOUT_MS)
    child.stderr.on('data', (d) => { stderr += d.toString() })
    child.on('error', (err) => { clearTimeout(timer); reject(err) })
    child.on('close', (code) => {
      clearTimeout(timer)
      if (code === 0) resolve()
      else reject(new Error(`typst compile gagal (exit ${code}):\n${stderr.slice(-2000)}`))
    })
  })
}

export async function generatePDF(content, settings = {}) {
  const marginMm = parseInt(settings.margin || '2') * 10
  const alignment = settings.alignment || 'justify'
  // Work dir di tmp (writable di semua mode — resource install bisa read-only):
  // main.typ disalin ke workDir, --root = workDir; fonts/packages lewat CLI path (tanpa root).
  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'typst-render-'))

  try {
    fs.copyFileSync(path.join(ASSETS_DIR, 'main.typ'), path.join(workDir, 'main.typ'))
    const workImgDir = path.join(workDir, 'work-img')
    fs.mkdirSync(workImgDir, { recursive: true })
    const imgRelPrefix = 'work-img'

    const prepared = prepareContent(String(content), workImgDir, imgRelPrefix)
    fs.writeFileSync(path.join(workDir, 'input.md'), prepared)

    const args = [
      'compile',
      '--root', workDir,
      '--package-path', path.join(ASSETS_DIR, 'packages'),
      '--font-path', path.join(ASSETS_DIR, 'fonts'),
      '--input', `title=${settings.title || ''}`,
      '--input', `author=${settings.author || ''}`,
      '--input', `margin-mm=${String(marginMm)}`,
      '--input', `alignment=${alignment}`,
      '--input', `include-toc=${settings.includeToc ? 'true' : 'false'}`,
      '--input', 'md-path=input.md',
      path.join(workDir, 'main.typ'),
      path.join(workDir, 'out.pdf'),
    ]

    await runTypst(args)
    return fs.readFileSync(path.join(workDir, 'out.pdf'))
  } finally {
    fs.rmSync(workDir, { recursive: true, force: true })
  }
}
