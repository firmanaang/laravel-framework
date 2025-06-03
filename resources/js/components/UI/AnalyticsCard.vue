<template>
  <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
    <div class="flex items-center justify-between">
      <div>
        <p class="text-sm font-medium text-gray-600 dark:text-gray-400">{{ title }}</p>
        <p class="text-2xl font-bold text-gray-900 dark:text-white">{{ value }}</p>
      </div>
      <div :class="trendClasses" class="flex items-center text-sm font-medium">
        <component :is="trendIcon" class="w-4 h-4 mr-1" />
        {{ change }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, h } from 'vue'

interface Props {
  title: string
  value: string
  change: string
  trend: 'up' | 'down'
  color: string
}

const props = defineProps<Props>()

const trendIcon = computed(() => {
  if (props.trend === 'up') {
    return () => h('svg', { 
      class: 'w-4 h-4', 
      fill: 'none', 
      stroke: 'currentColor', 
      viewBox: '0 0 24 24' 
    }, [
      h('path', { 
        'stroke-linecap': 'round', 
        'stroke-linejoin': 'round', 
        'stroke-width': '2', 
        d: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6' 
      })
    ])
  } else {
    return () => h('svg', { 
      class: 'w-4 h-4', 
      fill: 'none', 
      stroke: 'currentColor', 
      viewBox: '0 0 24 24' 
    }, [
      h('path', { 
        'stroke-linecap': 'round', 
        'stroke-linejoin': 'round', 
        'stroke-width': '2', 
        d: 'M13 17h8m0 0V9m0 8l-8-8-4 4-6-6' 
      })
    ])
  }
})

const trendClasses = computed(() => {
  return props.trend === 'up' 
    ? 'text-green-600 dark:text-green-400' 
    : 'text-red-600 dark:text-red-400'
})
</script>
