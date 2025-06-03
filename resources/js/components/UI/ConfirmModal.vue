<template>
  <div class="modal-overlay">
    <div class="modal-content max-w-sm">
      <!-- Header -->
      <div class="flex items-center space-x-3 mb-4">
        <div class="w-10 h-10 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg">
          <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <div>
          <h3 class="text-sm font-semibold text-neutral-900 dark:text-white">{{ title }}</h3>
          <p class="text-xs text-neutral-600 dark:text-neutral-400">{{ t('confirm.deleteDesc') }}</p>
        </div>
      </div>

      <!-- Body -->
      <div class="mb-4">
        <p class="text-xs text-neutral-700 dark:text-neutral-300 leading-relaxed">
          {{ message }}
        </p>
      </div>

      <!-- Footer -->
      <div class="flex justify-end space-x-2">
        <Button variant="ghost" @click="$emit('cancel')">
          {{ t('confirm.cancel') }}
        </Button>
        <Button variant="danger" @click="$emit('confirm')">
          <svg class="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          {{ t('confirm.deletePermanent') }}
        </Button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import Button from './Button.vue'
import { useI18n } from '@/composables/useI18n'

interface Props {
  title: string
  message: string
}

const { t } = useI18n()

defineProps<Props>()

defineEmits<{
  confirm: []
  cancel: []
}>()
</script>
