<template>
  <Transition name="slide-up">
    <div v-if="!isOnline" class="fixed bottom-6 left-6 right-6 md:right-auto md:w-80 z-50">
      <div class="card-modern p-4 border-l-4 border-yellow-500">
        <div class="flex items-center space-x-3">
          <div class="w-10 h-10 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl flex items-center justify-center shadow-modern">
            <svg class="w-5 h-5 text-white animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <div class="flex-1">
            <p class="text-sm font-semibold text-foreground">{{ message }}</p>
            <p class="text-xs text-muted-foreground">Changes will sync when connection is restored</p>
          </div>
          <button 
            v-if="showClose"
            @click="$emit('close')"
            class="btn-modern p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 focus-modern"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
interface Props {
  isOnline: boolean
  message?: string
  showClose?: boolean
}

withDefaults(defineProps<Props>(), {
  message: 'Working Offline',
  showClose: false
})

defineEmits<{
  close: []
}>()
</script>

<style scoped>
.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.slide-up-enter-from {
  opacity: 0;
  transform: translateY(100%) scale(0.95);
}

.slide-up-leave-to {
  opacity: 0;
  transform: translateY(100%) scale(0.95);
}
</style>
