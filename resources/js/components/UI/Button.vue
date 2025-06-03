<template>
  <button
    :disabled="disabled || loading"
    :class="buttonClasses"
    class="btn-brainwave micro-bounce focus-brainwave"
    @click="$emit('click')"
  >
    <LoadingSpinner v-if="loading" class="w-3 h-3 mr-1" />
    <slot />
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import LoadingSpinner from './LoadingSpinner.vue'

interface Props {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline' | 'success'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'primary',
  size: 'md',
  disabled: false,
  loading: false
})

defineEmits<{
  click: []
}>()

const buttonClasses = computed(() => {
  const variants = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    danger: 'btn-danger',
    success: 'bg-green-600 text-white hover:bg-green-700 shadow-md hover:shadow-lg hover:-translate-y-0.5',
    ghost: 'btn-ghost',
    outline: 'btn-outline'
  }

  const sizes = {
    sm: 'h-7 px-2.5 text-xs',
    md: 'h-8 px-3 text-xs',
    lg: 'h-9 px-4 text-sm'
  }

  return `${variants[props.variant]} ${sizes[props.size]}`
})
</script>
