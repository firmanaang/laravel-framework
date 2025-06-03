<template>
  <div class="relative">
    <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
      <span class="text-gray-500 dark:text-gray-400 text-sm">{{ currencySymbol }}</span>
    </div>
    <input
      ref="input"
      :value="displayValue"
      type="text"
      :placeholder="placeholder"
      :disabled="disabled"
      :class="[
        'input-brainwave pl-12',
        {
          'border-red-500 focus:border-red-500': hasError,
          'cursor-not-allowed opacity-50': disabled
        }
      ]"
      @input="onInput"
      @focus="onFocus"
      @blur="onBlur"
      @keydown="onKeydown"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'

interface Props {
  modelValue: number
  placeholder?: string
  disabled?: boolean
  hasError?: boolean
  currencySymbol?: string
  min?: number
  max?: number
}

interface Emits {
  (e: 'update:modelValue', value: number): void
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: '0',
  disabled: false,
  hasError: false,
  currencySymbol: 'Rp',
  min: 0
})

const emit = defineEmits<Emits>()

const input = ref<HTMLInputElement>()
const isFocused = ref(false)

// Format number with thousand separators
const formatNumber = (value: number): string => {
  if (isNaN(value) || value === 0) return ''
  return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

// Parse formatted string to number
const parseNumber = (value: string): number => {
  const cleaned = value.replace(/\./g, '').replace(/[^\d]/g, '')
  return cleaned ? parseInt(cleaned, 10) : 0
}

// Display value (formatted when not focused, raw when focused)
const displayValue = computed(() => {
  if (isFocused.value) {
    // Show raw number when focused for easier editing
    return props.modelValue > 0 ? props.modelValue.toString() : ''
  } else {
    // Show formatted number when not focused
    return formatNumber(props.modelValue)
  }
})

// Event handlers
const onInput = (event: Event) => {
  const target = event.target as HTMLInputElement
  const value = target.value

  // Only allow numbers
  const numericValue = value.replace(/[^\d]/g, '')

  if (numericValue !== value) {
    target.value = numericValue
  }

  const parsedValue = numericValue ? parseInt(numericValue, 10) : 0

  // Apply min/max constraints
  let finalValue = parsedValue
  if (props.min !== undefined && finalValue < props.min) {
    finalValue = props.min
  }
  if (props.max !== undefined && finalValue > props.max) {
    finalValue = props.max
  }

  emit('update:modelValue', finalValue)
}

const onFocus = () => {
  isFocused.value = true
  // Select all text on focus for easier editing
  setTimeout(() => {
    input.value?.select()
  }, 0)
}

const onBlur = () => {
  isFocused.value = false
}

const onKeydown = (event: KeyboardEvent) => {
  // Allow: backspace, delete, tab, escape, enter
  if ([8, 9, 27, 13, 46].indexOf(event.keyCode) !== -1 ||
      // Allow: Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
      (event.keyCode === 65 && event.ctrlKey === true) ||
      (event.keyCode === 67 && event.ctrlKey === true) ||
      (event.keyCode === 86 && event.ctrlKey === true) ||
      (event.keyCode === 88 && event.ctrlKey === true) ||
      // Allow: home, end, left, right
      (event.keyCode >= 35 && event.keyCode <= 39)) {
    return
  }

  // Ensure that it is a number and stop the keypress
  if ((event.shiftKey || (event.keyCode < 48 || event.keyCode > 57)) && (event.keyCode < 96 || event.keyCode > 105)) {
    event.preventDefault()
  }
}

// Watch for external value changes
watch(() => props.modelValue, (newValue) => {
  if (!isFocused.value && input.value) {
    input.value.value = displayValue.value
  }
})
</script>
