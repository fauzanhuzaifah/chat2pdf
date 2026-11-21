<template>
  <div class="flex flex-col">
    <label class="text-sm font-medium text-gray-700 mb-2">Editor (Ukuran A4)</label>
    <div class="bg-white border border-gray-300 rounded-lg p-4 shadow-md" style="width: 210mm; min-height: 297mm; max-width: 100%; margin: 0 auto;">
      <textarea
        ref="textareaRef"
        v-model="localValue"
        @input="handleInput"
        @paste="handlePaste"
        @keydown="handleKeydown"
        class="w-full h-full border-none resize-none font-mono text-sm focus:outline-none bg-transparent"
        style="min-height: 265mm;"
        placeholder="Ketik teks chat Anda di sini... Gunakan $rumus$ untuk math inline dan $$rumus$$ untuk math display. Anda juga bisa paste gambar dari clipboard!"
      ></textarea>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['update:modelValue', 'paste-image'])

const textareaRef = ref(null)
const localValue = ref(props.modelValue)
const history = ref([])
const historyIndex = ref(-1)
const maxHistory = ref(50)

watch(() => props.modelValue, (newVal) => {
  if (newVal !== localValue.value) {
    localValue.value = newVal
  }
})

watch(localValue, (newVal) => {
  emit('update:modelValue', newVal)
})

const handleInput = () => {
  emit('update:modelValue', localValue.value)
}

const insertText = (text) => {
  if (textareaRef.value) {
    saveToHistory()
    const start = textareaRef.value.selectionStart
    const end = textareaRef.value.selectionEnd
    const value = textareaRef.value.value

    const newValue = value.substring(0, start) + text + value.substring(end)
    localValue.value = newValue
    
    setTimeout(() => {
      textareaRef.value.selectionStart = textareaRef.value.selectionEnd = start + text.length
      textareaRef.value.focus()
    }, 0)
  }
}

const handlePaste = (event) => {
  const items = event.clipboardData.items
  for (let i = 0; i < items.length; i++) {
    if (items[i].type.indexOf('image') !== -1) {
      event.preventDefault()
      const blob = items[i].getAsFile()
      const reader = new FileReader()
      reader.onload = (e) => {
        emit('paste-image', e.target.result)
      }
      reader.readAsDataURL(blob)
      return
    }
  }
  saveToHistory()
}

const saveToHistory = () => {
  if (historyIndex.value < history.value.length - 1) {
    history.value = history.value.slice(0, historyIndex.value + 1)
  }
  history.value.push(localValue.value)
  if (history.value.length > maxHistory.value) {
    history.value.shift()
  }
  historyIndex.value = history.value.length - 1
}

const undo = () => {
  if (historyIndex.value > 0) {
    historyIndex.value--
    localValue.value = history.value[historyIndex.value]
    emit('update:modelValue', localValue.value)
    return true
  }
  return false
}

const handleKeydown = (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key === 'z') {
    event.preventDefault()
    undo()
  }
}

defineExpose({
  insertText,
  undo
})

onMounted(() => {
  saveToHistory()
})
</script>