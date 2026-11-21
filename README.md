# Chat-to-PDF Genesis

Aplikasi web untuk mengubah teks chat (termasuk notasi matematika LaTeX) menjadi file PDF yang profesional dan mudah dibaca.

## Tech Stack

- **Frontend:** Vue.js 3 + Vite + Tailwind CSS
- **Backend:** Node.js + Express.js
- **Database:** PostgreSQL (Neon) + Prisma ORM
- **Rendering:** KaTeX (preview) + Puppeteer (PDF generation)

## Project Structure

```
chat-to-pdf-genesis/
├── client/                 # Frontend Vue.js
│   ├── src/
│   │   ├── components/     # ChatEditor.vue, LivePreview.vue, Toolbar.vue
│   │   ├── composables/    # useLatexParser.js
│   │   └── App.vue
│   └── package.json
├── server/                 # Backend Node.js
│   ├── src/
│   │   ├── controllers/    # pdfController.js
│   │   ├── services/       # pdfService.js
│   │   └── app.js
│   ├── prisma/
│   │   └── schema.prisma
│   └── package.json
└── README.md
```

## Getting Started

### Client
```bash
cd client
npm install
npm run dev
```

### Server
```bash
cd server
npm install
npm run dev
```