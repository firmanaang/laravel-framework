<template>
  <teleport to="body">
    <div class="fixed inset-0 z-50 overflow-y-auto" v-if="activeModal || show">
      <div class="flex items-center justify-center min-h-screen px-2 py-4 text-center sm:p-0">
        <!-- Background overlay -->
        <div
          class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          @click="closeModal"
        ></div>

        <!-- Modal panel -->
        <div class="relative inline-block w-full transform transition-all sm:align-middle">
          <component v-if="activeModal" :is="activeModal.component" v-bind="activeModal.props" @close="closeModal" />
          <slot v-else></slot>
        </div>
      </div>
    </div>
  </teleport>
</template>

<script setup lang="ts">
import { useModal } from '@/composables/useModal'

const { activeModal, closeModal } = useModal()

const props = defineProps<{
  show?: boolean
}>()

defineEmits<{
  close: []
}>()
</script>
