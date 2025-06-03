<template>
  <div class="flex items-center space-x-2">
    <div 
      :class="isOnline ? 'bg-green-400' : 'bg-red-400'" 
      class="w-3 h-3 rounded-full animate-pulse"
    ></div>
    <span class="text-sm text-gray-600 dark:text-gray-400">
      {{ isOnline ? 'Online' : 'Offline' }}
    </span>
  </div>
</template>

<script setup lang="ts">
interface Props {
  isOnline: boolean
}

defineProps<Props>()
</script>
