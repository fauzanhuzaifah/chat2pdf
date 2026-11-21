<template>
  <div class="min-h-screen bg-gray-100">
    <header class="bg-emerald-800 text-white py-6 px-8 shadow-lg">
  <div class="flex justify-between items-start">
    <div>
      <h1 class="text-3xl font-bold">Chat-to-PDF Genesis</h1>
      <p class="text-emerald-200 mt-1">Ubah teks chat dengan notasi matematika menjadi PDF profesional</p>
    </div>
    <div class="flex gap-2">
      <button 
        @click="saveProject"
        class="px-4 py-2 bg-white text-emerald-800 rounded-lg hover:bg-gray-100 transition-colors font-medium shadow-md"
        title="Simpan Proyek"
      >
        💾 Simpan
      </button>
      <button
        @click="openProject"
        class="px-4 py-2 bg-emerald-700 text-white rounded-lg hover:bg-emerald-600 transition-colors font-medium shadow-md"
        title="Buka Proyek"
      >
        📂 Buka
      </button>
      <button
        @click="exportMarkdown"
        class="px-4 py-2 bg-emerald-700 text-white rounded-lg hover:bg-emerald-600 transition-colors font-medium shadow-md"
        title="Unduh Markdown (.md)"
      >
        ⬇️ Markdown
      </button>
      <input 
        ref="fileInputRef"
        type="file" 
        accept=".chat2pdf"
        class="hidden"
        @change="handleFileOpen"
      />
    </div>
  </div>
</header>
    
    <main class="container mx-auto px-4 py-6">
      <div class="bg-white rounded-xl shadow-md p-5 mb-6">
        <h3 class="text-lg font-semibold text-gray-800 mb-4">Pengaturan Dokumen</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Judul Dokumen</label>
            <input 
              v-model="documentSettings.title"
              type="text" 
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="Masukkan judul dokumen"
            >
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Nama Penulis</label>
            <input 
              v-model="documentSettings.author"
              type="text" 
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="Masukkan nama penulis"
            >
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Margin (cm)</label>
            <select 
              v-model="documentSettings.margin"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="1">1 cm</option>
              <option value="2">2 cm</option>
              <option value="3">3 cm</option>
              <option value="4">4 cm</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Align Teks</label>
            <select 
              v-model="documentSettings.alignment"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="left">Kiri</option>
              <option value="justify">Rata Kanan-Kiri</option>
              <option value="center">Tengah</option>
              <option value="right">Kanan</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Daftar Isi</label>
            <label class="flex items-center gap-2 px-3 py-2.5 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
              <input
                v-model="documentSettings.includeToc"
                type="checkbox"
                class="w-4 h-4 accent-emerald-600"
              >
              <span class="text-sm text-gray-700">Sertakan Daftar Isi</span>
            </label>
          </div>
        </div>
      </div>
      
      <Toolbar @insert="handleInsert" @paste-image="handlePasteImage" />
      
      <div class="grid grid-cols-1 xl:grid-cols-2 gap-8 justify-items-center">
        <ChatEditor v-model="currentText" ref="editorRef" @paste-image="handlePasteImage" />
        <LivePreview :content="renderedContent" :settings="documentSettings" />
      </div>
    </main>

    <!-- Floating Action Button Panel - Selalu Terlihat -->
    <div 
      class="fixed z-50 flex flex-col gap-3"
      :style="{ bottom: fabPosition.bottom + 'px', right: fabPosition.right + 'px' }"
    >
      <button 
        @click="undo"
        class="w-14 h-14 bg-gray-700 hover:bg-gray-800 text-white rounded-full shadow-xl flex items-center justify-center text-2xl transition-all hover:scale-110"
        title="Undo (Ctrl+Z)"
      >
        ↩️
      </button>
      
      <button 
        @click="clearEditor"
        class="w-14 h-14 bg-red-600 hover:bg-red-700 text-white rounded-full shadow-xl flex items-center justify-center text-2xl transition-all hover:scale-110"
        title="Bersihkan Editor"
      >
        🗑️
      </button>
      
      <button 
        @click="downloadPDF"
        :disabled="isDownloading"
        class="w-14 h-14 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white rounded-full shadow-xl flex items-center justify-center text-2xl transition-all hover:scale-110"
        title="Download PDF"
      >
        <svg v-if="isDownloading" class="animate-spin h-6 w-6" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span v-else>📄</span>
      </button>
    </div>

    <!-- Floating Image Size Panel - Muncul Ketika Ada Gambar -->
    <div 
      v-if="hasImages" 
      class="fixed z-50 bg-white rounded-xl shadow-xl p-4 border border-blue-200"
      :style="{ bottom: imagePanelPosition.bottom + 'px', left: imagePanelPosition.left + 'px' }"
    >
      <div class="flex items-center gap-3">
        <span class="text-sm font-bold text-blue-800">📏 Ukuran:</span>
        <select 
          v-model="imageSize" 
          class="px-3 py-2 border border-blue-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 font-medium"
        >
          <option value="25">25%</option>
          <option value="50">50%</option>
          <option value="75">75%</option>
          <option value="100">100%</option>
        </select>
        <span class="text-xs text-gray-500">Auto terapkan</span>
      </div>
    </div>

    <!-- License Dialog -->
    <div v-if="showLicenseDialog" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
        <div class="text-center mb-6">
          <div class="text-4xl mb-3">🚀</div>
          <h2 class="text-2xl font-bold text-gray-800">Selamat Datang di Chat-to-PDF Genesis</h2>
          <p class="text-gray-600 mt-2">Pilih cara untuk menggunakan aplikasi</p>
        </div>

        <div class="space-y-4">
          <div class="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h3 class="font-bold text-blue-800 mb-2">🎁 Coba Demo Gratis (14 Hari)</h3>
            <p class="text-sm text-blue-700 mb-3">Nikmati semua fitur aplikasi selama 14 hari penuh sebelum membeli.</p>
            <button 
              @click="startDemo"
              class="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              Mulai Demo Sekarang
            </button>
          </div>

          <div class="relative">
            <div class="absolute inset-0 flex items-center">
              <div class="w-full border-t border-gray-300"></div>
            </div>
            <div class="relative flex justify-center">
              <span class="px-2 bg-white text-sm text-gray-500">atau</span>
            </div>
          </div>

          <div class="bg-gray-50 p-4 rounded-lg">
            <h3 class="font-bold text-gray-800 mb-3">🔐 Aktivasi Lisensi Penuh</h3>
            
            <div class="mb-3">
              <label class="block text-sm font-medium text-gray-700 mb-2">Machine ID (ID Perangkat Anda)</label>
              <div class="flex items-center gap-2">
                <code class="flex-1 bg-white px-3 py-2 border border-gray-300 rounded text-sm font-mono text-gray-800">
                  {{ machineId }}
                </code>
                <button 
                  @click="copyMachineId"
                  class="px-3 py-2 bg-gray-200 hover:bg-gray-300 rounded text-sm"
                  title="Salin Machine ID"
                >
                  📋
                </button>
              </div>
              <p class="text-xs text-gray-500 mt-2">Kirim Machine ID ini ke penjual untuk mendapatkan License Key</p>
            </div>

            <div class="mb-3">
              <label class="block text-sm font-medium text-gray-700 mb-2">License Key</label>
              <input 
                v-model="licenseKeyInput"
                type="text"
                class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-lg"
                placeholder="XXXX-XXXX-XXXX-XXXX-1YEAR-YYYYMMDD-HMAC"
              >
            </div>

            <button 
              @click="verifyLicense"
              :disabled="isVerifying"
              class="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white rounded-lg font-medium transition-colors"
            >
              {{ isVerifying ? 'Memverifikasi...' : 'Aktifkan Lisensi' }}
            </button>

            <p v-if="licenseError" class="text-red-600 text-sm text-center mt-2">{{ licenseError }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Demo Mode Indicator -->
    <div v-if="isDemoMode" class="fixed top-4 right-4 bg-yellow-50 border border-yellow-300 rounded-lg px-4 py-2 shadow-lg z-40">
      <div class="flex items-center gap-2">
        <span class="text-yellow-800 font-medium">⏱️ Demo Mode</span>
        <span class="bg-yellow-200 text-yellow-800 px-2 py-0.5 rounded-full text-sm font-bold">
          {{ demoDaysRemaining }} hari tersisa
        </span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import ChatEditor from './components/ChatEditor.vue'
import LivePreview from './components/LivePreview.vue'
import Toolbar from './components/Toolbar.vue'

const documentSettings = ref({
  title: 'Dokumen Chat-to-PDF',
  author: '',
  margin: '2',
  alignment: 'justify',
  includeToc: true
})

const currentText = ref(`# Contoh Chat dengan Matematika

Halo! Ini adalah contoh dari Chat-to-PDF Genesis.

## Rumus Matematika

Rumus kuadrat: $ax^2 + bx + c = 0$

Integral:
$$
\\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi}
$$

**Penjumlahan:**
$$
\\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}
$$

## Fitur

- *Markdown* **dasar**
- Notasi matematika $LaTeX$
- Preview real-time
`)

const imageStore = ref({})
let imageCounter = 0
const imageSize = ref('100')

const hasImages = computed(() => {
  return Object.keys(imageStore.value).length > 0
})

const fabPosition = ref({ bottom: 24, right: 24 })
const imagePanelPosition = ref({ bottom: 24, left: 24 })

const renderedContent = computed(() => {
  let text = currentText.value
  text = text.replace(/!\[([^\]]*)\]\[([^\]]+)\]/g, (match, caption, id) => {
    const base64Data = imageStore.value[id]
    if (base64Data) {
      const sizePercent = imageSize.value
      return `<div style="position: relative; margin: 1em 0;"><img src="${base64Data.match(/\(([^)]+)\)/)[1]}" alt="${caption || 'Gambar'}" style="max-width: ${sizePercent}%; height: auto; display: block; margin: 0 auto; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);" /><p style="text-align:center; color:#6b7280; font-style:italic; margin-top:0.5em; font-size:0.9em;">${caption || ''}</p></div>`
    }
    return match
  })
  return text
})

watch(currentText, (newText) => {
  const base64Pattern = /!\[([^\]]*)\]\(data:image[^)]+\)/g
  let match
  while ((match = base64Pattern.exec(newText)) !== null) {
    const fullMatch = match[0]
    const caption = match[1]
    const id = `img_${++imageCounter}`
    imageStore.value[id] = fullMatch
    currentText.value = currentText.value.replace(fullMatch, `![${caption}][${id}]`)
  }
})

const editorRef = ref(null)
const isDownloading = ref(false)
const fileInputRef = ref(null)

const handleInsert = (text) => {
  if (editorRef.value) {
    editorRef.value.insertText(text)
  }
}

const handlePasteImage = (base64Data) => {
  const id = `img_${Date.now()}`
  imageStore.value[id] = `![Gambar](${base64Data})`
  const placeholder = `![Gambar][${id}]\n`
  handleInsert(placeholder)
}

const undo = () => {
  if (editorRef.value) {
    editorRef.value.undo()
  }
}

const clearEditor = () => {
  if (confirm('Apakah Anda yakin ingin membersihkan editor?')) {
    currentText.value = ''
    imageStore.value = {}
    documentSettings.value = {
      title: 'Dokumen Chat-to-PDF',
      author: '',
      margin: '2',
      alignment: 'justify',
      includeToc: true
    }
  }
}

const downloadPDF = async () => {
  isDownloading.value = true
  try {
    const fullContent = renderedContent.value
    const response = await fetch('/api/generate-pdf', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        content: fullContent,
        settings: documentSettings.value
      })
    })
    
    if (!response.ok) {
      throw new Error('Failed to generate PDF')
    }
    
    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${documentSettings.value.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`
    a.click()
    window.URL.revokeObjectURL(url)
  } catch (error) {
    console.error('Download error:', error)
    alert('Gagal terhubung ke server. Pastikan aplikasi berjalan, lalu coba lagi.')
  } finally {
    isDownloading.value = false
  }
}

const saveProject = () => {
  const projectData = {
    version: '1.0',
    timestamp: new Date().toISOString(),
    text: currentText.value,
    documentSettings: { ...documentSettings.value },
    imageStore: { ...imageStore.value },
    imageSize: imageSize.value
  }
  
  const blob = new Blob([JSON.stringify(projectData, null, 2)], { type: 'application/json' })
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${documentSettings.value.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.chat2pdf`
  a.click()
  window.URL.revokeObjectURL(url)
}

// Ekspor konten editor sebagai file .md — gambar placeholder diganti data URI aslinya
const exportMarkdown = () => {
  const markdown = currentText.value.replace(/!\[([^\]]*)\]\[([^\]]+)\]/g, (match, caption, id) => {
    const stored = imageStore.value[id]
    if (stored) {
      return stored.replace(/^!\[[^\]]*\]/, `![${caption || 'Gambar'}]`)
    }
    return match
  })

  const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' })
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${documentSettings.value.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.md`
  a.click()
  window.URL.revokeObjectURL(url)
}

const openProject = () => {
  fileInputRef.value.click()
}

const handleFileOpen = (event) => {
  const file = event.target.files[0]
  if (!file) return
  
  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      const projectData = JSON.parse(e.target.result)
      
      if (projectData.version !== '1.0') {
        throw new Error('Format file tidak kompatibel')
      }
      
      currentText.value = projectData.text || ''
      documentSettings.value = projectData.documentSettings || {
        title: 'Dokumen Chat-to-PDF',
        author: '',
        margin: '2',
        alignment: 'justify',
        includeToc: true
      }
      imageStore.value = projectData.imageStore || {}
      imageSize.value = projectData.imageSize || '100'
      
      alert('Proyek berhasil dibuka!')
    } catch (error) {
      console.error('Error loading project:', error)
      alert('Gagal membuka file proyek. Format file tidak valid.')
    }
  }
  reader.readAsText(file)
  event.target.value = ''
}

// License System
const showLicenseDialog = ref(false)
const machineId = ref('')
const licenseKeyInput = ref('')
const licenseError = ref('')
const isVerifying = ref(false)

// Demo System
const isDemoMode = ref(false)
const demoDaysRemaining = ref(0)
const demoStartDate = ref(null)

const generateMachineId = async () => {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  ctx.textBaseline = 'top'
  ctx.font = '14px Arial'
  ctx.fillText('machine-id', 2, 2)
  const canvasData = canvas.toDataURL()
  
  const hardwareString = `${navigator.userAgent}-${navigator.language}-${screen.width}x${screen.height}-${canvasData}`
  
  let hash = 0
  for (let i = 0; i < hardwareString.length; i++) {
    const char = hardwareString.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  
  const hashStr = Math.abs(hash).toString(16).padStart(16, '0').toUpperCase()
  return `${hashStr.slice(0, 4)}-${hashStr.slice(4, 8)}-${hashStr.slice(8, 12)}-${hashStr.slice(12, 16)}`
}

// Verifikasi lisensi dilakukan di server (POST /api/license/verify, HMAC-SHA256).
// Client tidak menyimpan atau menghitung secret lisensi.
const verifyLicenseWithServer = async (key, deviceId) => {
  const response = await fetch('/api/license/verify', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-license-key': key
    },
    body: JSON.stringify({ machineId: deviceId })
  })
  if (!response.ok) {
    throw new Error(`Server menolak permintaan verifikasi (${response.status})`)
  }
  return response.json()
}

const verifyLicense = async () => {
  isVerifying.value = true
  licenseError.value = ''

  try {
    const key = licenseKeyInput.value.trim().toUpperCase()
    const keyParts = key.split('-')

    if (keyParts.length !== 7) {
      licenseError.value = 'Format License Key tidak valid'
      return
    }

    const providedMachineId = `${keyParts[0]}-${keyParts[1]}-${keyParts[2]}-${keyParts[3]}`
    if (providedMachineId !== machineId.value) {
      licenseError.value = 'License Key tidak cocok dengan perangkat ini'
      return
    }

    const result = await verifyLicenseWithServer(key, machineId.value)

    if (result.valid) {
      localStorage.setItem('chat2pdf_license', key)
      showLicenseDialog.value = false
      alert('Lisensi berhasil diaktifkan! Terima kasih telah menggunakan Chat-to-PDF Genesis.')
    } else {
      licenseError.value = 'License Key tidak valid. Silakan coba generate ulang.'
    }
  } catch (error) {
    console.error('License verification error:', error)
    licenseError.value = 'Terjadi kesalahan saat verifikasi'
  } finally {
    isVerifying.value = false
  }
}

const copyMachineId = async () => {
  try {
    await navigator.clipboard.writeText(machineId.value)
    alert('Machine ID berhasil disalin ke clipboard!')
  } catch (error) {
    alert('Gagal menyalin Machine ID')
  }
}

const startDemo = () => {
  const today = new Date().toISOString().split('T')[0]
  localStorage.setItem('chat2pdf_demo_start', today)
  demoStartDate.value = today
  isDemoMode.value = true
  calculateDemoDaysRemaining()
  showLicenseDialog.value = false
  alert(`Selamat datang di Demo Chat-to-PDF Genesis!\nAnda memiliki akses penuh selama 14 hari.`)
}

const calculateDemoDaysRemaining = () => {
  if (!demoStartDate.value) {
    const savedStart = localStorage.getItem('chat2pdf_demo_start')
    if (savedStart) {
      demoStartDate.value = savedStart
    } else {
      return 0
    }
  }
  
  const startDate = new Date(demoStartDate.value)
  const today = new Date()
  const diffTime = today.getTime() - startDate.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  const remaining = Math.max(0, 14 - diffDays)
  demoDaysRemaining.value = remaining
  return remaining
}

const checkLicense = async () => {
  machineId.value = await generateMachineId()

  const savedLicense = localStorage.getItem('chat2pdf_license')
  if (savedLicense) {
    try {
      const result = await verifyLicenseWithServer(savedLicense, machineId.value)
      if (result.valid) {
        isDemoMode.value = false
        showLicenseDialog.value = false
        return
      }
    } catch (error) {
      // Server tidak terjangkau: pertahankan lisensi tersimpan, jangan dihapus
      console.error('License check error:', error)
      return
    }
    localStorage.removeItem('chat2pdf_license')
  }

  const remainingDays = calculateDemoDaysRemaining()
  if (remainingDays > 0) {
    isDemoMode.value = true
    showLicenseDialog.value = false
  } else {
    showLicenseDialog.value = true
  }
}

checkLicense()
</script>