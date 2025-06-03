<template>
  <button
    @click="$emit('toggle')"
    class="p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700 transition-colors"
    :title="darkMode ? 'Switch to light mode' : 'Switch to dark mode'"
  >
    <SunIcon v-if="darkMode" class="w-5 h-5" />
    <MoonIcon v-else class="w-5 h-5" />
  </button>
</template>

<script setup lang="ts">
import { SunIcon, MoonIcon } from '@heroicons/vue/24/outline'

interface Props {
  darkMode: boolean
}

defineProps<Props>()

defineEmits<{
  toggle: []
}>()
</script>
