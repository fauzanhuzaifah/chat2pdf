// Template PDF produksi — Fase 4B (engine Typst, menggantikan Puppeteer/Chromium).
// Parameter dikirim dari server/src/services/typstService.js via --input:
//   title, author, margin-mm, alignment, include-toc, md-path
// Gaya meniru CSS template lama (pdfService.js generateHTMLTemplate).
#import "@preview/cmarker:0.1.7": render
#import "@preview/mitex:0.2.6": mitex

#let doc-title = sys.inputs.title
#let doc-author = sys.inputs.author
#let margin-mm = int(sys.inputs.margin-mm)
#let alignment = sys.inputs.alignment
#let with-toc = sys.inputs.include-toc == "true"

// Halaman & teks dasar (A4, margin dari settings, Inter 11pt, line-height 1.7)
#set page(paper: "a4", margin: margin-mm * 1mm)
#set text(font: "Inter", size: 11pt, fill: rgb("#1f2937"), lang: "id")
#set par(leading: 0.7em, spacing: 1em, justify: alignment == "justify")

// Heading: Merriweather hijau, ukuran 18/14/12pt, jarak seperti CSS
#show heading: set text(font: "Merriweather", fill: rgb("#065f46"), weight: 700)
#show heading.where(level: 1): set text(size: 18pt)
#show heading.where(level: 2): set text(size: 14pt)
#show heading.where(level: 3): set text(size: 12pt)
#show heading: set block(above: 1.5em, below: 0.9em)
// Nomor heading hanya saat dokumen punya Daftar Isi (dipakai outline()).
// Fungsi kustom: buang level induk yang bernilai 0 agar dokumen yang mulai
// dari "##" tidak tampil "0.1" (jadinya "1", sub-headingnya "1.1").
#let heading-numbering(..nums) = {
  let n = nums.pos()
  let i = 0
  while i < n.len() and n.at(i) == 0 { i += 1 }
  let m = n.slice(i)
  if m.len() == 0 { none } else { m.map(str).join(".") }
}
#let heading-numbering-value = if with-toc { heading-numbering } else { none }
#set heading(numbering: heading-numbering-value)

// Blockquote: element quote bawaan Typst diganti blok bergaya sendiri via callback
// blockquote cmarker (elemen quote menambahkan tanda/kolom kedua yang tak ada di baseline)
#let app-blockquote(body) = block(
  fill: none,
  stroke: (left: 4pt + rgb("#065f46")),
  inset: (left: 10pt, top: 4pt, bottom: 4pt),
  width: 100%,
  text(style: "italic", fill: rgb("#4b5563"), body),
)

// Tabel: 10pt, border tipis, header hijau muda, sel rata tengah
#show table: set text(size: 10pt)
#show table: set table(stroke: 0.5pt + rgb("#e5e7eb"), inset: 8pt)
#show table.cell.where(y: 0): set table.cell(fill: rgb("#f0fdf4"))
#show table.cell.where(y: 0): set text(fill: rgb("#166534"), weight: 600)
#show table.cell: set align(center)

// Gambar: tanpa nomor "Gambar N", caption italic kecil abu-abu, rata tengah
#show figure: set figure(numbering: none)
#show figure: set align(center)
#show figure.caption: set text(size: 9pt, style: "italic", fill: rgb("#6b7280"))

// Header dokumen (Judul + Penulis + garis) seperti template lama
#if doc-title != "" [
  #text(fill: rgb("#065f46"), size: 18pt, font: "Merriweather", weight: 700)[#doc-title]
  #v(6pt)
]
#if doc-author != "" [
  #text(fill: rgb("#6b7280"), size: 10pt)[Oleh: #doc-author]
  #v(6pt)
]
#if doc-title != "" or doc-author != "" [
  #line(length: 100%, stroke: 0.5pt + rgb("#e5e7eb"))
  #v(1.5em)
]

// Daftar Isi: outline() bawaan Typst menggantikan dua-pass manual di pdfService.js
#if with-toc [
  #outline(
    title: text(fill: rgb("#065f46"), size: 16pt, font: "Merriweather", weight: 700)[Daftar Isi],
    depth: 3,
  )
  #pagebreak()
]

// Konten Markdown dari typstService.js — math LaTeX dirender mitex.
// app-figure diinjeksi lewat scope cmarker: raw-typst di dalam eval cmarker
// menyelesaikan path terhadap root PAKET, bukan --root — jadi gambar dimuat
// lewat fungsi yang didefinisikan di main.typ (path di-resolve di sini).
#let app-figure(path, width-pct, caption: none) = figure(
  image(path, width: width-pct * 1%),
  caption: caption,
)

#if alignment == "justify" [
  #render(
    str(read(sys.inputs.md-path)),
    math: mitex,
    blockquote: app-blockquote,
    scope: (app-figure: app-figure),
  )
] else [
  #align(alignment)[#render(
    str(read(sys.inputs.md-path)),
    math: mitex,
    blockquote: app-blockquote,
    scope: (app-figure: app-figure),
  )]
]
