"use client"

import { ref } from "vue"
import type { Toast } from "@/types/ui"

const toasts = ref<Toast[]>([])

export function useToast() {
  const addToast = (toast: Omit<Toast, "id">) => {
    const id = Date.now().toString()
    const newToast: Toast = { ...toast, id }

    toasts.value.push(newToast)

    // Auto remove after duration
    if (toast.duration !== 0) {
      setTimeout(() => {
        removeToast(id)
      }, toast.duration || 5000)
    }

    return id
  }

  const removeToast = (id: string) => {
    const index = toasts.value.findIndex((toast) => toast.id === id)
    if (index > -1) {
      toasts.value.splice(index, 1)
    }
  }

  const clearAllToasts = () => {
    toasts.value = []
  }

  // Convenience methods
  const success = (title: string, message?: string, duration?: number) => {
    return addToast({ type: "success", title, message, duration })
  }

  const error = (title: string, message?: string, duration?: number) => {
    return addToast({ type: "error", title, message, duration })
  }

  const warning = (title: string, message?: string, duration?: number) => {
    return addToast({ type: "warning", title, message, duration })
  }

  const info = (title: string, message?: string, duration?: number) => {
    return addToast({ type: "info", title, message, duration })
  }

  return {
    toasts,
    addToast,
    removeToast,
    clearAllToasts,
    success,
    error,
    warning,
    info,
  }
}
