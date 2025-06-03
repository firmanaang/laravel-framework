<template>
  <div class="relative">
    <Combobox v-model="selectedValue" @update:modelValue="onSelectionChange">
      <div class="relative">
        <!-- Input Field -->
        <ComboboxInput
          :class="[
            'w-full h-8 px-3 py-1.5 text-xs border rounded-lg bg-white text-slate-900 placeholder-slate-500',
            'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
            'transition-all duration-200',
            {
              'border-red-500 focus:ring-red-500 focus:border-red-500': hasError,
              'border-slate-300': !hasError,
              'opacity-50 cursor-not-allowed': disabled,
              'dark:bg-slate-900 dark:border-slate-600 dark:text-slate-100 dark:placeholder-slate-400': true
            }
          ]"
          :displayValue="(option) => option?.label || ''"
          :placeholder="placeholder"
          :disabled="disabled"
          @change="onInputChange"
        />

        <!-- Loading Spinner -->
        <div v-if="isLoading" class="absolute inset-y-0 right-8 flex items-center">
          <svg class="animate-spin h-3 w-3 text-slate-400" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>

        <!-- Clear Button -->
        <button
          v-if="clearable && selectedValue && !disabled"
          type="button"
          class="absolute inset-y-0 right-8 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
          @click="clearSelection"
        >
          <svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>

        <!-- Dropdown Button -->
        <ComboboxButton class="absolute inset-y-0 right-0 flex items-center pr-2">
          <svg
            class="h-3 w-3 text-slate-400 transition-transform duration-200"
            :class="{ 'rotate-180': isOpen }"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
          </svg>
        </ComboboxButton>
      </div>

      <!-- Dropdown Options -->
      <Transition
        enter-active-class="transition duration-100 ease-out"
        enter-from-class="transform scale-95 opacity-0"
        enter-to-class="transform scale-100 opacity-100"
        leave-active-class="transition duration-75 ease-in"
        leave-from-class="transform scale-100 opacity-100"
        leave-to-class="transform scale-95 opacity-0"
      >
        <ComboboxOptions
          class="absolute z-[99999] mt-1 max-h-48 w-full overflow-auto rounded-lg bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none text-xs dark:bg-slate-800 dark:ring-slate-600"
          @before-enter="isOpen = true"
          @after-leave="isOpen = false"
        >
          <!-- No Results -->
          <div v-if="filteredOptions.length === 0 && query !== ''" class="relative cursor-default select-none py-2 px-3 text-slate-500 dark:text-slate-400">
            {{ t('common.noResults') }}
          </div>

          <!-- Options -->
          <ComboboxOption
            v-for="option in filteredOptions"
            :key="option.value"
            :value="option"
            as="template"
            v-slot="{ selected, active }"
          >
            <li
              :class="[
                'relative cursor-pointer select-none py-2 px-3',
                active ? 'bg-blue-50 text-blue-900 dark:bg-blue-900 dark:text-blue-100' : 'text-slate-900 dark:text-slate-100'
              ]"
            >
              <div class="flex items-center justify-between">
                <span :class="[selected ? 'font-medium' : 'font-normal', 'block truncate']">
                  {{ option.label }}
                </span>
                <span v-if="option.description" class="text-slate-400 text-xs ml-2">
                  {{ option.description }}
                </span>
              </div>

              <!-- Selected Indicator -->
              <span v-if="selected" class="absolute inset-y-0 right-0 flex items-center pr-3 text-blue-600 dark:text-blue-400">
                <svg class="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                </svg>
              </span>
            </li>
          </ComboboxOption>
        </ComboboxOptions>
      </Transition>
    </Combobox>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue'
import { Combobox, ComboboxInput, ComboboxButton, ComboboxOptions, ComboboxOption } from '@headlessui/vue'
import { useI18n } from '@/composables/useI18n'

interface Option {
  value: string
  label: string
  description?: string
}

interface Props {
  modelValue: string
  options: Option[]
  placeholder?: string
  disabled?: boolean
  hasError?: boolean
  loading?: boolean
  clearable?: boolean
  apiSearch?: (query: string) => Promise<Option[]>
}

interface Emits {
  (e: 'update:modelValue', value: string): void
  (e: 'search', query: string): void
  (e: 'select', option: Option): void
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: '',
  disabled: false,
  hasError: false,
  loading: false,
  clearable: true
})

const emit = defineEmits<Emits>()
const { t } = useI18n()

// State
const query = ref('')
const isOpen = ref(false)
const internalLoading = ref(false)
const apiOptions = ref<Option[]>([])

// Computed
const selectedValue = computed({
  get: () => {
    return allOptions.value.find(option => option.value === props.modelValue) || null
  },
  set: (option: Option | null) => {
    emit('update:modelValue', option?.value || '')
  }
})

const allOptions = computed(() => {
  const staticOptions = props.options.map(option => ({
    value: option.value,
    label: option.label,
    description: option.description
  }))

  const searchOptions = apiOptions.value.map(option => ({
    value: option.value,
    label: option.label,
    description: option.description
  }))

  // Combine and remove duplicates
  const combined = [...staticOptions, ...searchOptions]
  return combined.filter((option, index, self) =>
    index === self.findIndex(o => o.value === option.value)
  )
})

const filteredOptions = computed(() => {
  if (query.value === '') {
    return allOptions.value
  }

  return allOptions.value.filter((option) =>
    option.label.toLowerCase().includes(query.value.toLowerCase())
  )
})

const isLoading = computed(() => props.loading || internalLoading.value)

// Methods
const onInputChange = (event: Event) => {
  const target = event.target as HTMLInputElement
  query.value = target.value
  emit('search', query.value)

  if (props.apiSearch && query.value.length >= 2) {
    performApiSearch(query.value)
  } else {
    apiOptions.value = []
  }
}

const onSelectionChange = (option: Option | null) => {
  if (option) {
    emit('select', option)
    query.value = ''
  }
}

const clearSelection = () => {
  selectedValue.value = null
  query.value = ''
}

// API Search with debounce
let searchTimeout: NodeJS.Timeout | null = null
const performApiSearch = async (searchQuery: string) => {
  if (!props.apiSearch) return

  if (searchTimeout) {
    clearTimeout(searchTimeout)
  }

  searchTimeout = setTimeout(async () => {
    try {
      internalLoading.value = true
      const results = await props.apiSearch!(searchQuery)
      apiOptions.value = results
    } catch (error) {
      console.error('API search error:', error)
      apiOptions.value = []
    } finally {
      internalLoading.value = false
    }
  }, 300)
}

// Cleanup
onUnmounted(() => {
  if (searchTimeout) {
    clearTimeout(searchTimeout)
  }
})
</script>
