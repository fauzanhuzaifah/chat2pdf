// Fase 5D — asser TOC pada PDF hasil /api/generate-pdf (includeToc: true).
// Pakai: node check-toc.mjs <file.pdf>  (pdfjs-dist@4 harus ter-install di dir ini)
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs'
import fs from 'node:fs'

const file = process.argv[2]
if (!file) { console.error('pakai: node check-toc.mjs <file.pdf>'); process.exit(2) }

const data = new Uint8Array(fs.readFileSync(file))
const doc = await getDocument({ data, isEvalSupported: false, useSystemFonts: false }).promise
let text = ''
for (let p = 1; p <= Math.min(doc.numPages, 3); p++) {
  const page = await doc.getPage(p)
  const c = await page.getTextContent()
  text += c.items.map(i => i.str).join(' ') + '\n'
}
const hasTitle = /daftar\s+isi/i.test(text)
const leaders = (text.match(/…|\.{3,}/g) || []).length
console.log(`pages=${doc.numPages} hasDaftarIsi=${hasTitle} leaderDots=${leaders}`)
if (!hasTitle) { console.error('GAGAL: teks "Daftar Isi" tidak ditemukan di PDF'); process.exit(1) }
if (leaders < 3) { console.error(`GAGAL: baris TOC terlalu sedikit (leaderDots=${leaders})`); process.exit(1) }
console.log('TOC OK — judul "Daftar Isi" + entri leader dots terdeteksi')
