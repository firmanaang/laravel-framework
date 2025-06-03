<template>
  <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
    <div class="flex flex-col sm:flex-row gap-4">
      <!-- Search Input -->
      <div v-if="showSearch" class="flex-1">
        <input 
          :value="modelValue.search || ''"
          @input="updateFilter('search', ($event.target as HTMLInputElement).value)"
          type="text" 
          :placeholder="searchPlaceholder"
          class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
      </div>

      <!-- Filter Selects -->
      <select 
        v-for="filter in filters" 
        :key="filter.key"
        :value="modelValue[filter.key] || ''"
        @change="updateFilter(filter.key, ($event.target as HTMLSelectElement).value)"
        class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
      >
        <option value="">{{ filter.placeholder }}</option>
        <option v-for="option in filter.options" :key="option.value" :value="option.value">
          {{ option.label }}
        </option>
      </select>

      <!-- Clear Filters Button -->
      <Button v-if="hasActiveFilters" variant="secondary" @click="clearFilters">
        Clear
      </Button>

      <!-- Custom Actions Slot -->
      <slot name="actions" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import Button from './Button.vue'

interface FilterOption {
  label: string
  value: string
}

interface Filter {
  key: string
  placeholder: string
  options: FilterOption[]
}

interface Props {
  modelValue: Record<string, any>
  filters?: Filter[]
  showSearch?: boolean
  searchPlaceholder?: string
}

const props = withDefaults(defineProps<Props>(), {
  filters: () => [],
  showSearch: true,
  searchPlaceholder: 'Search...'
})

const emit = defineEmits<{
  'update:modelValue': [value: Record<string, any>]
}>()

const hasActiveFilters = computed(() => {
  return Object.values(props.modelValue).some(value => value && value !== '')
})

const updateFilter = (key: string, value: string) => {
  emit('update:modelValue', {
    ...props.modelValue,
    [key]: value
  })
}

const clearFilters = () => {
  const clearedFilters: Record<string, any> = {}
  Object.keys(props.modelValue).forEach(key => {
    clearedFilters[key] = ''
  })
  emit('update:modelValue', clearedFilters)
}
</script>
