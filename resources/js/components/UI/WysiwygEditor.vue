<template>
  <div class="wysiwyg-editor">
    <div class="border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden bg-white dark:bg-gray-800" :class="{ 'border-red-500': hasError }">
      <!-- Toolbar -->
      <div v-if="editor" class="border-b border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 px-3 py-2">
        <div class="flex flex-wrap gap-1">
          <!-- Format buttons -->
          <button
            type="button"
            @click="editor.chain().focus().toggleBold().run()"
            :class="[
              'p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors',
              { 'bg-gray-300 dark:bg-gray-600': editor.isActive('bold') }
            ]"
            :disabled="disabled"
            title="Bold (Ctrl+B)"
          >
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M5 3a1 1 0 000 2h1.5v10H5a1 1 0 100 2h5a4 4 0 001.996-7.464A3.5 3.5 0 0010.5 3H5zm2.5 2h3a1.5 1.5 0 110 3h-3V5zm0 5h3a1.5 1.5 0 110 3h-3V5zm0 5h3.5a2 2 0 110 4H7.5v-4z"/>
            </svg>
          </button>

          <button
            type="button"
            @click="editor.chain().focus().toggleItalic().run()"
            :class="[
              'p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors',
              { 'bg-gray-300 dark:bg-gray-600': editor.isActive('italic') }
            ]"
            :disabled="disabled"
            title="Italic (Ctrl+I)"
          >
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M8 3a1 1 0 000 2h1.5L7.382 15H6a1 1 0 100 2h4a1 1 0 100-2h-1.5l2.118-10H12a1 1 0 100-2H8z"/>
            </svg>
          </button>

          <button
            type="button"
            @click="editor.chain().focus().toggleUnderline().run()"
            :class="[
              'p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors',
              { 'bg-gray-300 dark:bg-gray-600': editor.isActive('underline') }
            ]"
            :disabled="disabled"
            title="Underline (Ctrl+U)"
          >
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M4 17a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM6 3a1 1 0 000 2v6a4 4 0 108 0V5a1 1 0 100-2 1 1 0 00-1 1v6a2 2 0 11-4 0V4a1 1 0 00-1-1z"/>
            </svg>
          </button>

          <button
            type="button"
            @click="editor.chain().focus().toggleStrike().run()"
            :class="[
              'p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors',
              { 'bg-gray-300 dark:bg-gray-600': editor.isActive('strike') }
            ]"
            :disabled="disabled"
            title="Strikethrough"
          >
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M6 10a2 2 0 00-2 2v1a2 2 0 002 2h8a2 2 0 002-2v-1a2 2 0 00-2-2H6zM5 6a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1zM5 14a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1z"/>
            </svg>
          </button>

          <div class="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1"></div>

          <!-- List buttons -->
          <button
            type="button"
            @click="editor.chain().focus().toggleBulletList().run()"
            :class="[
              'p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors',
              { 'bg-gray-300 dark:bg-gray-600': editor.isActive('bulletList') }
            ]"
            :disabled="disabled"
            title="Bullet List"
          >
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 16a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"/>
            </svg>
          </button>

          <button
            type="button"
            @click="editor.chain().focus().toggleOrderedList().run()"
            :class="[
              'p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors',
              { 'bg-gray-300 dark:bg-gray-600': editor.isActive('orderedList') }
            ]"
            :disabled="disabled"
            title="Numbered List"
          >
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 16a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"/>
            </svg>
          </button>

          <div class="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1"></div>

          <!-- Link button -->
          <button
            type="button"
            @click="setLink"
            :class="[
              'p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors',
              { 'bg-gray-300 dark:bg-gray-600': editor.isActive('link') }
            ]"
            :disabled="disabled"
            title="Add Link"
          >
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z"/>
            </svg>
          </button>

          <!-- Clear formatting -->
          <button
            type="button"
            @click="editor.chain().focus().clearNodes().unsetAllMarks().run()"
            class="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            :disabled="disabled"
            title="Clear Formatting"
          >
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M8.707 7.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l2-2a1 1 0 00-1.414-1.414L11 7.586V3a1 1 0 10-2 0v4.586l-.293-.293z"/>
              <path d="M3 5a2 2 0 012-2h1a1 1 0 010 2H5v7h2l1 2H4a2 2 0 01-2-2V5zM15 5a2 2 0 00-2-2h-1a1 1 0 000 2h1v7h-2l-1 2h4a2 2 0 002-2V5z"/>
            </svg>
          </button>
        </div>
      </div>

      <!-- Editor Content -->
      <EditorContent
        :editor="editor"
        :class="[
          'prose prose-sm max-w-none dark:prose-invert min-h-[120px] p-3',
          {
            'opacity-50 cursor-not-allowed': disabled
          }
        ]"
      />
    </div>

    <!-- Character count and error message -->
    <div class="flex justify-between items-center mt-2 text-sm">
      <span v-if="hasError && errorMessage" class="text-red-600 dark:text-red-400">
        {{ errorMessage }}
      </span>
      <span v-if="maxLength" class="ml-auto" :class="{ 'text-red-600 dark:text-red-400': isOverLimit }">
        {{ currentLength }} / {{ maxLength }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import CharacterCount from '@tiptap/extension-character-count'

interface Props {
  modelValue: string
  placeholder?: string
  maxLength?: number
  hasError?: boolean
  errorMessage?: string
  disabled?: boolean
}

interface Emits {
  (e: 'update:modelValue', value: string): void
  (e: 'focus'): void
  (e: 'blur'): void
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: 'Enter description...',
  maxLength: 0,
  hasError: false,
  errorMessage: '',
  disabled: false
})

const emit = defineEmits<Emits>()

const editor = useEditor({
  content: props.modelValue,
  extensions: [
    StarterKit.configure({
      heading: false, // Disable headings for simplicity
      codeBlock: false, // Disable code blocks
      blockquote: false, // Disable blockquotes
    }),
    Underline,
    Link.configure({
      openOnClick: false,
      HTMLAttributes: {
        class: 'text-blue-600 dark:text-blue-400 underline hover:text-blue-800 dark:hover:text-blue-300',
      },
    }),
    CharacterCount.configure({
      limit: props.maxLength || undefined,
    }),
  ],
  editorProps: {
    attributes: {
      class: 'prose prose-sm max-w-none dark:prose-invert focus:outline-none min-h-[100px] p-0',
      'data-placeholder': props.placeholder,
    },
  },
  onUpdate: ({ editor }) => {
    const html = editor.getHTML()
    emit('update:modelValue', html)
  },
  onFocus: () => {
    emit('focus')
  },
  onBlur: () => {
    emit('blur')
  },
  editable: !props.disabled,
})

const currentLength = computed(() => {
  return editor.value?.storage.characterCount.characters() || 0
})

const isOverLimit = computed(() => {
  return props.maxLength > 0 && currentLength.value > props.maxLength
})

// Link functionality
const setLink = () => {
  if (!editor.value) return

  const previousUrl = editor.value.getAttributes('link').href
  const url = window.prompt('URL', previousUrl)

  // cancelled
  if (url === null) {
    return
  }

  // empty
  if (url === '') {
    editor.value.chain().focus().extendMarkRange('link').unsetLink().run()
    return
  }

  // update link
  editor.value.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
}

// Watch for external changes
watch(() => props.modelValue, (newValue) => {
  if (editor.value && editor.value.getHTML() !== newValue) {
    editor.value.commands.setContent(newValue, false)
  }
})

// Watch for disabled state changes
watch(() => props.disabled, (disabled) => {
  if (editor.value) {
    editor.value.setEditable(!disabled)
  }
})

onUnmounted(() => {
  if (editor.value) {
    editor.value.destroy()
  }
})
</script>

<style scoped>
/* Placeholder styling */
.wysiwyg-editor :deep(.ProseMirror p.is-editor-empty:first-child::before) {
  content: attr(data-placeholder);
  float: left;
  color: #9ca3af;
  pointer-events: none;
  height: 0;
}

.dark .wysiwyg-editor :deep(.ProseMirror p.is-editor-empty:first-child::before) {
  color: #6b7280;
}

/* Focus styles */
.wysiwyg-editor :deep(.ProseMirror:focus) {
  outline: none;
}

/* List styles */
.wysiwyg-editor :deep(.ProseMirror ul) {
  list-style-type: disc;
  margin-left: 1.5rem;
  padding-left: 0;
}

.wysiwyg-editor :deep(.ProseMirror ol) {
  list-style-type: decimal;
  margin-left: 1.5rem;
  padding-left: 0;
}

.wysiwyg-editor :deep(.ProseMirror li) {
  margin: 0.25rem 0;
}

.wysiwyg-editor :deep(.ProseMirror li p) {
  margin: 0;
}

/* Paragraph styles */
.wysiwyg-editor :deep(.ProseMirror p) {
  margin: 0.5rem 0;
}

.wysiwyg-editor :deep(.ProseMirror p:first-child) {
  margin-top: 0;
}

.wysiwyg-editor :deep(.ProseMirror p:last-child) {
  margin-bottom: 0;
}

/* Text formatting */
.wysiwyg-editor :deep(.ProseMirror strong) {
  font-weight: 600;
}

.wysiwyg-editor :deep(.ProseMirror em) {
  font-style: italic;
}

.wysiwyg-editor :deep(.ProseMirror u) {
  text-decoration: underline;
}

.wysiwyg-editor :deep(.ProseMirror s) {
  text-decoration: line-through;
}

/* Link styles */
.wysiwyg-editor :deep(.ProseMirror a) {
  color: #3b82f6;
  text-decoration: underline;
  cursor: pointer;
}

.wysiwyg-editor :deep(.ProseMirror a:hover) {
  color: #1e40af;
}

.dark .wysiwyg-editor :deep(.ProseMirror a) {
  color: #60a5fa;
}

.dark .wysiwyg-editor :deep(.ProseMirror a:hover) {
  color: #93c5fd;
}

/* Selection styles */
.wysiwyg-editor :deep(.ProseMirror) ::selection {
  background-color: rgba(59, 130, 246, 0.25);
}

.dark .wysiwyg-editor :deep(.ProseMirror) ::selection {
  background-color: rgba(96, 165, 250, 0.3);
}

/* Font family and size */
.wysiwyg-editor :deep(.ProseMirror) {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 12px;
  line-height: 1.5;
  color: #374151;
}

.dark .wysiwyg-editor :deep(.ProseMirror) {
  color: #f9fafb;
}

/* Disabled state */
.wysiwyg-editor :deep(.ProseMirror[contenteditable="false"]) {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
