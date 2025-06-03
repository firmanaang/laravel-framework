<template>
  <div class="fixed inset-0 z-50 overflow-y-auto">
    <div class="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
      <!-- Background overlay -->
      <div class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" @click="$emit('close')"></div>

      <!-- Modal panel -->
      <div class="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
        <!-- Header -->
        <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 class="text-lg font-medium text-gray-900 dark:text-white">
            {{ title }}
          </h3>
        </div>

        <!-- Form Content Slot -->
        <div class="px-6 py-4">
          <slot name="form" />
        </div>

        <!-- Footer -->
        <div class="px-6 py-4 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600 flex justify-end space-x-3">
          <Button @click="$emit('close')" variant="secondary">
            Cancel
          </Button>
          <Button @click="$emit('submit')" :loading="loading" :variant="submitVariant">
            {{ submitText }}
          </Button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import Button from './Button.vue'

interface Props {
  title: string
  submitText?: string
  submitVariant?: 'primary' | 'secondary' | 'danger'
  loading?: boolean
}

withDefaults(defineProps<Props>(), {
  submitText: 'Save',
  submitVariant: 'primary',
  loading: false
})

defineEmits<{
  close: []
  submit: []
}>()
</script>
