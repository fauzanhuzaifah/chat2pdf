// Pipeline render bersama (Markdown + LaTeX) untuk preview client dan PDF server.
// Satu-satunya implementasi — sebelumnya terduplikasi di
// server/src/services/pdfService.js (parseContent) dan
// client/src/utils/latexParser.js + LivePreview.vue.
//
// Aturan versi: marked & katex wajib sama persis di root (dipin exact untuk
// modul ini), server, dan client — jangan menaikkan salah satunya sendirian.
import { marked } from 'marked'
import katex from 'katex'

// Markdown + LaTeX -> HTML. Port persis dari pipeline server (baseline PDF):
// blok $$...$$ dulu, lalu inline $...$, terakhir marked.parse tanpa opsi khusus.
export function renderToHtml(markdown) {
  let html = markdown

  html = html.replace(/\$\$([\s\S]*?)\$\$/g, (match, latex) => {
    try {
      return katex.renderToString(latex.trim(), {
        displayMode: true,
        throwOnError: false
      })
    } catch (e) {
      return match
    }
  })

  html = html.replace(/\$([^\$]+?)\$/g, (match, latex) => {
    try {
      return katex.renderToString(latex.trim(), {
        displayMode: false,
        throwOnError: false
      })
    } catch (e) {
      return match
    }
  })

  return marked.parse(html)
}
