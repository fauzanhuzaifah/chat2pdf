<template>
  <div class="flex flex-col">
    <label class="text-sm font-medium text-gray-700 mb-2">Preview (Ukuran A4)</label>
    <div class="bg-white border border-gray-300 rounded-lg shadow-md overflow-auto" style="width: 210mm; min-height: 297mm; max-width: 100%; margin: 0 auto;">
      <div class="p-8" :style="previewStyle">
        <div v-if="settings.author || settings.title" class="mb-6 pb-4 border-b border-gray-200">
          <h2 v-if="settings.title" class="text-2xl font-bold text-gray-900 mb-2">{{ settings.title }}</h2>
          <p v-if="settings.author" class="text-sm text-gray-600">Oleh: {{ settings.author}}</p>
        </div>
        <div v-html="renderedContent" class="prose max-w-none"></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { renderToHtml } from '@shared/render'

const props = defineProps({
  content: {
    type: String,
    default: ''
  },
  settings: {
    type: Object,
    default: () => ({
      author: '',
      title: '',
      margin: '2',
      alignment: 'justify'
    })
  }
})

const previewStyle = computed(() => ({
  padding: `${parseInt(props.settings.margin) * 10}mm`,
  textAlign: props.settings.alignment
}))

// Pipeline render identik dengan server (shared/render.js) — placeholder gambar
// sudah diganti App.vue sebelum sampai di sini; placeholder tak dikenal tampil
// sebagai teks polos, sama seperti perilaku PDF server.
const renderedContent = computed(() => renderToHtml(props.content))
</script>

<style>
@import 'katex/dist/katex.min.css';

.prose {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  line-height: 1.6;
  color: #1f2937;
}

.prose p {
  margin-bottom: 1em;
}

.prose ul, .prose ol {
  margin-left: 2em;
  margin-bottom: 1em;
  text-align: left;
}

.prose strong {
  font-weight: 600;
}

.prose em {
  font-style: italic;
}

.prose h1, .prose h2, .prose h3 {
  font-family: 'Merriweather', serif;
  color: #065f46;
  margin-top: 1.5em;
  margin-bottom: 0.5em;
}

.prose h1 { font-size: 18pt; }
.prose h2 { font-size: 14pt; }
.prose h3 { font-size: 12pt; }

.prose blockquote {
  border-left: 4px solid #065f46;
  padding-left: 1em;
  margin-left: 0;
  font-style: italic;
  color: #4b5563;
}

.prose table {
  width: 100%;
  border-collapse: collapse;
  margin: 1.5em 0;
  font-size: 10pt;
}

.prose img {
  max-width: 100%;
  height: auto;
  display: block;
  margin: 1em auto;
  border-radius: 4px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.image-container {
  margin: 1.5em 0;
  text-align: center;
}

.image-caption {
  font-size: 0.9em;
  color: #6b7280;
  margin-top: 0.5em;
  font-style: italic;
}
</style>