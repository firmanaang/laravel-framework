<template>
  <div class="modal-overlay">
    <div class="modal-content max-w-md">
      <!-- Header -->
      <div class="flex items-center space-x-4 mb-6">
        <div class="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
          <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <div>
          <h3 class="text-lg font-semibold text-neutral-900 dark:text-white">Reset Password</h3>
          <p class="text-sm text-neutral-600 dark:text-neutral-400">Enter your email to receive reset instructions</p>
        </div>
      </div>

      <!-- Success Message -->
      <Transition name="slide-down">
        <div v-if="successMessage" class="alert-brainwave alert-success mb-6">
          <div class="flex items-center">
            <svg class="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            {{ successMessage }}
          </div>
        </div>
      </Transition>

      <!-- Error Message -->
      <Transition name="slide-down">
        <div v-if="errorMessage" class="alert-brainwave alert-error mb-6">
          <div class="flex items-center">
            <svg class="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {{ errorMessage }}
          </div>
        </div>
      </Transition>

      <!-- Form -->
      <form @submit.prevent="handleSubmit" class="space-y-6">
        <div class="space-y-2">
          <label class="block text-sm font-semibold text-neutral-900 dark:text-white">
            Email Address
          </label>
          <div class="relative">
            <input
              v-model="email"
              type="email"
              required
              :class="[
                'input-brainwave pl-12',
                emailError ? 'input-error' : ''
              ]"
              placeholder="Enter your email address"
              :disabled="loading || sent"
            >
            <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
              </svg>
            </div>
          </div>
          <p v-if="emailError" class="text-sm text-red-600 dark:text-red-400 flex items-center">
            <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {{ emailError }}
          </p>
        </div>

        <!-- Instructions -->
        <div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-4">
          <div class="flex items-start space-x-3">
            <svg class="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div class="text-sm text-blue-800 dark:text-blue-200">
              <p class="font-medium mb-1">What happens next?</p>
              <ul class="space-y-1 text-blue-700 dark:text-blue-300">
                <li>• We'll send a reset link to your email</li>
                <li>• Click the link to create a new password</li>
                <li>• The link expires in 1 hour for security</li>
              </ul>
            </div>
          </div>
        </div>
      </form>

      <!-- Footer -->
      <div class="flex justify-end space-x-3 mt-6 pt-6 border-t border-neutral-200 dark:border-neutral-800">
        <Button variant="ghost" @click="$emit('close')" :disabled="loading">
          Cancel
        </Button>
        <Button
          variant="primary"
          @click="handleSubmit"
          :loading="loading"
          :disabled="!email.trim() || !email.includes('@') || sent"
        >
          <svg v-if="!loading && !sent" class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          <svg v-if="sent" class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
          {{ sent ? 'Email Sent!' : 'Send Reset Link' }}
        </Button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import axios from 'axios'
import Button from './Button.vue'

const emit = defineEmits<{
  close: []
  success: [message: string]
}>()

const email = ref('')
const loading = ref(false)
const sent = ref(false)
const emailError = ref('')
const successMessage = ref('')
const errorMessage = ref('')

const clearMessages = () => {
  emailError.value = ''
  successMessage.value = ''
  errorMessage.value = ''
}

const validateEmail = (): boolean => {
  clearMessages()

  if (!email.value.trim()) {
    emailError.value = 'Email is required'
    return false
  }

  if (!email.value.includes('@')) {
    emailError.value = 'Please enter a valid email address'
    return false
  }

  return true
}

const handleSubmit = async () => {
  if (!validateEmail() || sent.value) return

  loading.value = true
  clearMessages()

  try {
    const response = await axios.post('/api/auth/forgot-password', {
      email: email.value.trim()
    })

    if (response.data.success) {
      sent.value = true
      successMessage.value = 'Password reset instructions have been sent to your email.'

      // Emit success event to parent
      setTimeout(() => {
        emit('success', successMessage.value)
      }, 2000)
    } else {
      errorMessage.value = response.data.message || 'Failed to send reset email. Please try again.'
    }

  } catch (err: any) {
    console.error('Forgot password error:', err)

    if (err.response) {
      const status = err.response.status
      const data = err.response.data

      if (status === 404) {
        errorMessage.value = 'No account found with this email address.'
      } else if (status === 429) {
        errorMessage.value = 'Too many requests. Please try again later.'
      } else if (status === 422) {
        if (data.errors?.email) {
          emailError.value = data.errors.email[0]
        } else {
          errorMessage.value = data.message || 'Please check your email and try again.'
        }
      } else {
        errorMessage.value = data.message || 'Failed to send reset email. Please try again.'
      }
    } else if (err.request) {
      errorMessage.value = 'Network error. Please check your connection and try again.'
    } else {
      errorMessage.value = 'An unexpected error occurred. Please try again.'
    }
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.3s ease;
}

.slide-down-enter-from {
  opacity: 0;
  transform: translateY(-20px);
}

.slide-down-leave-to {
  opacity: 0;
  transform: translateY(-20px);
}
</style>
