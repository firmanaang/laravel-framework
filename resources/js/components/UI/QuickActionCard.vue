<template>
  <router-link
    :to="to"
    class="card-brainwave card-interactive p-4 block"
  >
    <div class="flex items-start justify-between">
      <div class="flex-1">
        <div :class="iconClasses" class="w-10 h-10 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300">
          <component :is="iconComponent" class="w-5 h-5" />
        </div>
        <h3 class="text-sm font-bold text-neutral-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors mb-1">
          {{ title }}
        </h3>
        <p class="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">{{ description }}</p>
      </div>
      <div class="ml-3">
        <ChevronRightIcon class="w-4 h-4 text-neutral-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-all duration-300 group-hover:translate-x-1" />
      </div>
    </div>
  </router-link>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  UsersIcon,
  CubeIcon,
  Cog6ToothIcon,
  ChevronRightIcon
} from '@heroicons/vue/24/outline'

interface Props {
  title: string
  description: string
  icon: string
  color: string
  to: string
}

const props = defineProps<Props>()

const iconComponent = computed(() => {
  const icons: Record<string, any> = {
    users: UsersIcon,
    units: CubeIcon,
    settings: Cog6ToothIcon
  }
  return icons[props.icon] || UsersIcon
})

const iconClasses = computed(() => {
  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
    green: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
    purple: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
    orange: 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400',
    indigo: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
  }
  return colorClasses[props.color] || colorClasses.blue
})
</script>
