<template>
  <div class="bg-white rounded-xl shadow-md p-5 mb-6">
    <h3 class="text-lg font-semibold text-gray-800 mb-4">Alat Cepat</h3>
    <div class="flex flex-wrap gap-2">
      <span class="text-sm font-medium text-gray-600 mr-2 self-center">Matematika:</span>
      <button
        v-for="symbol in mathSymbols"
        :key="symbol.name"
        @click="$emit('insert', symbol.value)"
        class="px-3 py-1.5 text-sm bg-gray-100 hover:bg-emerald-100 hover:text-emerald-700 rounded transition-colors font-mono"
        :title="symbol.name"
      >
        {{ symbol.display }}
      </button>
      <div class="h-6 w-px bg-gray-300 mx-2 self-center"></div>
      <span class="text-sm font-medium text-gray-600 mr-2 self-center">Format:</span>
      <button
        @click="$emit('insert', '**bold**')"
        class="px-3 py-1.5 text-sm bg-gray-100 hover:bg-emerald-100 hover:text-emerald-700 rounded transition-colors font-bold"
        title="Bold"
      >
        B
      </button>
      <button
        @click="$emit('insert', '*italic*')"
        class="px-3 py-1.5 text-sm bg-gray-100 hover:bg-emerald-100 hover:text-emerald-700 rounded transition-colors italic"
        title="Italic"
      >
        I
      </button>
      <button
        @click="$emit('insert', '# Heading 1\n')"
        class="px-3 py-1.5 text-sm bg-gray-100 hover:bg-emerald-100 hover:text-emerald-700 rounded transition-colors font-bold"
        title="Heading 1"
      >
        H1
      </button>
      <button
        @click="$emit('insert', '## Heading 2\n')"
        class="px-3 py-1.5 text-sm bg-gray-100 hover:bg-emerald-100 hover:text-emerald-700 rounded transition-colors font-bold"
        title="Heading 2"
      >
        H2
      </button>
      <button
        @click="$emit('insert', '- list item\n')"
        class="px-3 py-1.5 text-sm bg-gray-100 hover:bg-emerald-100 hover:text-emerald-700 rounded transition-colors"
        title="List"
      >
        • List
      </button>
      <button
        @click="$emit('insert', '1. numbered item\n')"
        class="px-3 py-1.5 text-sm bg-gray-100 hover:bg-emerald-100 hover:text-emerald-700 rounded transition-colors"
        title="Numbered List"
      >
        1. List
      </button>
      <button
        @click="$emit('insert', '> quote\n')"
        class="px-3 py-1.5 text-sm bg-gray-100 hover:bg-emerald-100 hover:text-emerald-700 rounded transition-colors"
        title="Quote"
      >
        " Quote
      </button>
      <div class="h-6 w-px bg-gray-300 mx-2 self-center"></div>
      <span class="text-sm font-medium text-gray-600 mr-2 self-center">Gambar:</span>
      <label class="px-3 py-1.5 text-sm bg-gray-100 hover:bg-emerald-100 hover:text-emerald-700 rounded transition-colors cursor-pointer" title="Sisipkan Gambar">
        📷 Gambar
        <input type="file" accept="image/*" class="hidden" @change="handleImageUpload">
      </label>
    </div>
  </div>
</template>

<script setup>
const emit = defineEmits(['insert', 'paste-image'])

const mathSymbols = [
  { name: 'Alpha', display: 'α', value: '$\\alpha$' },
  { name: 'Beta', display: 'β', value: '$\\beta$' },
  { name: 'Gamma', display: 'γ', value: '$\\gamma$' },
  { name: 'Delta', display: 'Δ', value: '$\\Delta$' },
  { name: 'Sum', display: '∑', value: '$$\\sum_{i=1}^{n} x_i$$' },
  { name: 'Integral', display: '∫', value: '$$\\int_{a}^{b} f(x) dx$$' },
  { name: 'Fraction', display: 'a/b', value: '$\\frac{a}{b}$' },
  { name: 'Square Root', display: '√x', value: '$\\sqrt{x}$' },
  { name: 'Power', display: 'xⁿ', value: '$x^n$' },
  { name: 'Limit', display: 'lim', value: '$$\\lim_{x \\to \\infty}$$' },
  { name: 'Matrix', display: '[]', value: '$$\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}$$' }
]

const handleImageUpload = (event) => {
  const file = event.target.files[0]
  if (file) {
    const reader = new FileReader()
    reader.onload = (e) => {
      emit('paste-image', e.target.result)
    }
    reader.readAsDataURL(file)
  }
  event.target.value = ''
}
</script>