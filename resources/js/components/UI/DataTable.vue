<template>
  <div class="bg-white dark:bg-neutral-950 rounded-lg shadow border border-gray-200 dark:border-neutral-800 overflow-hidden">
    <!-- Table Header -->
    <div v-if="title || $slots.header" class="px-6 py-4 border-b border-gray-200 dark:border-neutral-800 bg-gray-50 dark:bg-neutral-900">
      <div class="flex items-center justify-between">
        <h3 v-if="title" class="text-lg font-semibold text-gray-900 dark:text-white">{{ title }}</h3>
        <slot name="header" />
      </div>
    </div>

    <!-- Table -->
    <div class="overflow-x-auto">
      <table class="w-full">
        <thead class="bg-gray-50 dark:bg-neutral-900">
          <tr>
            <th
              v-for="column in columns"
              :key="column.key"
              class="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-neutral-400 uppercase tracking-wider"
            >
              {{ column.label }}
            </th>
            <th v-if="showActions" class="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-neutral-400 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-200 dark:divide-neutral-800 bg-white dark:bg-neutral-950">
          <tr v-for="(item, index) in data" :key="getItemKey(item, index)" class="hover:bg-gray-50 dark:hover:bg-neutral-900 transition-colors">
            <td v-for="column in columns" :key="column.key" class="px-4 py-2 whitespace-nowrap">
              <slot :name="`cell-${column.key}`" :item="item" :value="getNestedValue(item, column.key)">
                <span class="text-sm text-gray-900 dark:text-white">
                  {{ formatCellValue(getNestedValue(item, column.key), column) }}
                </span>
              </slot>
            </td>
            <td v-if="showActions" class="px-4 py-2 whitespace-nowrap text-sm font-medium">
              <slot name="actions" :item="item" :index="index">
                <button
                  v-if="!hideEdit"
                  @click="$emit('edit', item)"
                  class="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 mr-3 transition-colors"
                >
                  Edit
                </button>
                <button
                  v-if="!hideDelete"
                  @click="$emit('delete', item)"
                  class="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                >
                  Delete
                </button>
              </slot>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Empty State -->
      <div v-if="data.length === 0" class="text-center py-12 bg-white dark:bg-neutral-950">
        <slot name="empty">
          <div class="w-24 h-24 mx-auto mb-4 bg-gray-200 dark:bg-neutral-800 rounded-full flex items-center justify-center">
            <svg class="w-12 h-12 text-gray-400 dark:text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"></path>
            </svg>
          </div>
          <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">{{ emptyTitle || 'No data found' }}</h3>
          <p class="text-gray-500 dark:text-neutral-400">{{ emptyMessage || 'There are no items to display.' }}</p>
        </slot>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Column {
  key: string
  label: string
  type?: 'text' | 'date' | 'badge' | 'custom'
  format?: (value: any) => string
}

interface Props {
  title?: string
  columns: Column[]
  data: any[]
  showActions?: boolean
  hideEdit?: boolean
  hideDelete?: boolean
  emptyTitle?: string
  emptyMessage?: string
  keyField?: string
}

const props = withDefaults(defineProps<Props>(), {
  showActions: true,
  hideEdit: false,
  hideDelete: false,
  keyField: 'id'
})

defineEmits<{
  edit: [item: any]
  delete: [item: any]
}>()

const getItemKey = (item: any, index: number): string | number => {
  return item[props.keyField] || index
}

const getNestedValue = (obj: any, path: string): any => {
  return path.split('.').reduce((current, key) => current?.[key], obj)
}

const formatCellValue = (value: any, column: Column): string => {
  if (column.format) {
    return column.format(value)
  }

  if (column.type === 'date' && value) {
    return new Date(value).toLocaleDateString()
  }

  return value?.toString() || ''
}
</script>
