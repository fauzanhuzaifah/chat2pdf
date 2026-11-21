// PoC Fase 4A — render payload Markdown aplikasi di Typst.
// Input: payload-uji.json (salinan persis payload uji Fase 3, test-artifacts/pdf-payload.json)
// Jalur: Markdown (cmarker) + LaTeX math (mitex) -> Typst -> PDF
// TIDAK menyentuh server/src/services/pdfService.js (PoC terpisah).
#import "@preview/cmarker:0.1.7": render
#import "@preview/mitex:0.2.6": mitex

#set page(paper: "a4", margin: 20mm)
#set text(size: 11pt, lang: "id")
#set par(justify: true, leading: 0.9em, spacing: 1em)

// Gaya meniru template PDF aplikasi (pdfService.js)
#show heading.where(level: 1): it => text(fill: rgb("#065f46"), size: 18pt, weight: 700, it)
#show heading.where(level: 2): it => text(fill: rgb("#065f46"), size: 14pt, weight: 700, it)
#show heading.where(level: 3): it => text(fill: rgb("#065f46"), size: 12pt, weight: 700, it)
#show quote.where(block: true): set block(fill: none, stroke: (left: 4pt + rgb("#065f46")), inset: (left: 10pt, top: 4pt, bottom: 4pt), spacing: 1em)
// Tabel: border tipis + header hijau muda seperti template aplikasi (set rules,
// tanpa rebuild table — show rule yang membangun table lagi akan rekursi tak terbatas)
#show table: set table(stroke: 0.5pt + rgb("#e5e7eb"), inset: 8pt)
#show table: set text(size: 10pt)
#show table.cell.where(y: 0): set table.cell(fill: rgb("#f0fdf4"))
#show table.cell.where(y: 0): set text(fill: rgb("#166534"), weight: 600)
#show strong: set text(weight: 600)

// Header dokumen seperti aplikasi (Judul + Penulis + garis)
#text(fill: rgb("#065f46"), size: 18pt, weight: 700, font: "Libertinus Serif")[#sys.inputs.title]
#v(4pt)
#text(fill: rgb("#6b7280"), size: 10pt)[Oleh: #sys.inputs.author]
#v(10pt)
#line(length: 100%, stroke: 0.5pt + rgb("#e5e7eb"))
#v(10pt)

#render(str(read("work/payload.md")), math: mitex)
