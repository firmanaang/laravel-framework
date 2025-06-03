<template>
  <div class="flex items-center space-x-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
    <div :class="iconClasses" class="w-10 h-10 rounded-full flex items-center justify-center">
      <component :is="iconComponent" class="w-5 h-5" />
    </div>
    <div class="flex-1">
      <p class="text-sm font-medium text-gray-900 dark:text-white">{{ activity.user }}</p>
      <p class="text-sm text-gray-600 dark:text-gray-400">{{ activity.action }}</p>
    </div>
    <div class="text-sm text-gray-500 dark:text-gray-400">
      {{ activity.time }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, h } from 'vue'

interface Activity {
  id: number
  user: string
  action: string
  time: string
  type: 'success' | 'warning' | 'info'
}

interface Props {
  activity: Activity
}

const props = defineProps<Props>()

const iconComponent = computed(() => {
  const icons: Record<string, any> = {
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
  return icons[props.activity.type] || icons.info
})

const iconClasses = computed(() => {
  const classes = {
    success: 'bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400',
    warning: 'bg-yellow-100 dark:bg-yellow-900 text-yellow-600 dark:text-yellow-400',
    info: 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400'
  }
  return classes[props.activity.type] || classes.info
})
</script>
