<template>
  <div class="stats-card">
    <div class="flex items-center justify-between">
      <div class="flex-1">
        <p class="stats-label mb-0.5 text-xs">{{ title }}</p>
        <p class="stats-value mb-1.5 text-neutral-900 dark:text-white text-lg">{{ value }}</p>
        <div v-if="trend" :class="trendClasses" class="stats-trend text-xs">
          <component :is="trendIcon" class="w-3.5 h-3.5 mr-1" />
          {{ trend }}
        </div>
      </div>
      <div :class="iconClasses" class="w-12 h-12 rounded-xl flex items-center justify-center">
        <component :is="iconComponent" class="w-6 h-6" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  UsersIcon,
  CubeIcon,
  HeartIcon,
  CircleStackIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon
} from '@heroicons/vue/24/outline'

interface Props {
  title: string
  value: string
  icon: string
  color: string
  trend?: string
}

const props = defineProps<Props>()

const iconComponent = computed(() => {
  const icons: Record<string, any> = {
    users: UsersIcon,
    units: CubeIcon,
    health: HeartIcon,
    storage: CircleStackIcon
  }
  return icons[props.icon] || UsersIcon
})

const iconClasses = computed(() => {
  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
    green: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
    emerald: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400',
    orange: 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400',
    purple: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'
  }
  return colorClasses[props.color] || colorClasses.blue
})

const trendIcon = computed(() => {
  if (!props.trend) return null
  return props.trend.startsWith('+') ? ArrowTrendingUpIcon : ArrowTrendingDownIcon
})

const trendClasses = computed(() => {
  if (!props.trend) return ''

  const isPositive = props.trend.startsWith('+')
  return isPositive
    ? 'stats-trend-up'
    : 'stats-trend-down'
})
</script>
