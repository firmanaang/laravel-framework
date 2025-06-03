<template>
  <div
    :class="[toastClasses, 'toast-item']"
    class="relative max-w-sm w-full bg-white dark:bg-gray-800 shadow-xl rounded-xl pointer-events-auto overflow-hidden transform transition-all duration-300 hover:scale-105"
  >
    <!-- Colored left border -->
    <div :class="borderClasses" class="absolute left-0 top-0 bottom-0 w-1"></div>

    <!-- Content -->
    <div class="p-4 pl-6">
      <div class="flex items-start">
        <!-- Icon with background -->
        <div :class="iconBgClasses" class="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center">
          <component :is="iconComponent" :class="iconClasses" class="w-5 h-5" />
        </div>

        <!-- Text content -->
        <div class="ml-4 flex-1 pt-0.5">
          <p class="text-sm font-semibold text-gray-900 dark:text-white">
            {{ toast.title }}
          </p>
          <p v-if="toast.message" class="mt-1 text-sm text-gray-600 dark:text-gray-300">
            {{ toast.message }}
          </p>
        </div>

        <!-- Close button -->
        <div class="ml-4 flex-shrink-0">
          <button
            @click="$emit('close', toast.id)"
            class="inline-flex text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 rounded-md p-1 transition-colors duration-200"
          >
            <span class="sr-only">Close</span>
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- Progress bar for auto-dismiss -->
    <div v-if="toast.duration" class="absolute bottom-0 left-0 right-0 h-1 bg-gray-200 dark:bg-gray-700">
      <div
        :class="progressClasses"
        class="h-full transition-all duration-100 ease-linear"
        :style="{ width: progressWidth + '%' }"
      ></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, h, ref, onMounted, onUnmounted } from 'vue'
import type { Toast } from '@/types/ui'

interface Props {
  toast: Toast
}

const props = defineProps<Props>()

defineEmits<{
  close: [id: string]
}>()

// Progress bar for auto-dismiss
const progressWidth = ref(100)
let progressInterval: number | null = null

onMounted(() => {
  if (props.toast.duration) {
    const startTime = Date.now()
    const duration = props.toast.duration

    progressInterval = setInterval(() => {
      const elapsed = Date.now() - startTime
      const remaining = Math.max(0, duration - elapsed)
      progressWidth.value = (remaining / duration) * 100

      if (remaining <= 0) {
        clearInterval(progressInterval!)
      }
    }, 50)
  }
})

onUnmounted(() => {
  if (progressInterval) {
    clearInterval(progressInterval)
  }
})

const iconComponent = computed(() => {
  const iconMap = {
    success: () => h('svg', {
      class: 'w-5 h-5',
      fill: 'none',
      stroke: 'currentColor',
      viewBox: '0 0 24 24'
    }, [
      h('path', {
        'stroke-linecap': 'round',
        'stroke-linejoin': 'round',
        'stroke-width': '2',
        d: 'M5 13l4 4L19 7'
      })
    ]),
    warning: () => h('svg', {
      class: 'w-5 h-5',
      fill: 'none',
      stroke: 'currentColor',
      viewBox: '0 0 24 24'
    }, [
      h('path', {
        'stroke-linecap': 'round',
        'stroke-linejoin': 'round',
        'stroke-width': '2',
        d: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z'
      })
    ]),
    error: () => h('svg', {
      class: 'w-5 h-5',
      fill: 'none',
      stroke: 'currentColor',
      viewBox: '0 0 24 24'
    }, [
      h('path', {
        'stroke-linecap': 'round',
        'stroke-linejoin': 'round',
        'stroke-width': '2',
        d: 'M6 18L18 6M6 6l12 12'
      })
    ]),
    info: () => h('svg', {
      class: 'w-5 h-5',
      fill: 'none',
      stroke: 'currentColor',
      viewBox: '0 0 24 24'
    }, [
      h('path', {
        'stroke-linecap': 'round',
        'stroke-linejoin': 'round',
        'stroke-width': '2',
        d: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
      })
    ])
  }

  return iconMap[props.toast.type] || iconMap.info
})

const toastClasses = computed(() => {
  const classes = {
    success: 'ring-1 ring-green-200 dark:ring-green-800',
    warning: 'ring-1 ring-yellow-200 dark:ring-yellow-800',
    error: 'ring-1 ring-red-200 dark:ring-red-800',
    info: 'ring-1 ring-blue-200 dark:ring-blue-800'
  }
  return classes[props.toast.type]
})

const borderClasses = computed(() => {
  const classes = {
    success: 'bg-green-500',
    warning: 'bg-yellow-500',
    error: 'bg-red-500',
    info: 'bg-blue-500'
  }
  return classes[props.toast.type]
})

const iconBgClasses = computed(() => {
  const classes = {
    success: 'bg-green-100 dark:bg-green-900',
    warning: 'bg-yellow-100 dark:bg-yellow-900',
    error: 'bg-red-100 dark:bg-red-900',
    info: 'bg-blue-100 dark:bg-blue-900'
  }
  return classes[props.toast.type]
})

const iconClasses = computed(() => {
  const classes = {
    success: 'text-green-600 dark:text-green-400',
    warning: 'text-yellow-600 dark:text-yellow-400',
    error: 'text-red-600 dark:text-red-400',
    info: 'text-blue-600 dark:text-blue-400'
  }
  return classes[props.toast.type]
})

const progressClasses = computed(() => {
  const classes = {
    success: 'bg-green-500',
    warning: 'bg-yellow-500',
    error: 'bg-red-500',
    info: 'bg-blue-500'
  }
  return classes[props.toast.type]
})
</script>

<style scoped>
.toast-item {
  backdrop-filter: blur(10px);
}
</style>
