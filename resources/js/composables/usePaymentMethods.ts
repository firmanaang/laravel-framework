"use client"

import { ref, computed } from "vue"
import type { PaymentMethod, PaymentMethodFormData, CreatePaymentMethodData } from "@/types/PaymentMethod"
import { useToast } from "./useToast"
import axios from "@/bootstrap"

const paymentMethods = ref<PaymentMethod[]>([])

const loading = ref(false)
const error = ref<string | null>(null)

export function usePaymentMethods() {
  const { showToast } = useToast()

  const activePaymentMethods = computed(() => paymentMethods.value.filter((method) => method.status === "active"))

  const fetchPaymentMethods = async (filters?: any): Promise<PaymentMethod[]> => {
    loading.value = true
    error.value = null

    try {
      const params: Record<string, string> = {}
      if (filters?.search && filters.search.trim()) {
        params.search = filters.search.trim()
      }
      if (filters?.type) {
        params.type = filters.type
      }
      if (filters?.status) {
        params.status = filters.status
      }

      const response = await axios.get("/api/payment-methods", { params })
      const methods = response.data.data || response.data
      paymentMethods.value = methods
      return methods
    } catch (err) {
      error.value = "Failed to fetch payment methods"
      throw err
    } finally {
      loading.value = false
    }
  }

  const getPaymentMethods = async (): Promise<PaymentMethod[]> => {
    return fetchPaymentMethods()
  }

  const createPaymentMethod = async (data: CreatePaymentMethodData): Promise<PaymentMethod> => {
    loading.value = true
    error.value = null

    try {
      const response = await axios.post("/api/payment-methods", data)
      const newPaymentMethod = response.data.data || response.data
      paymentMethods.value.push(newPaymentMethod)
      showToast("Payment method created successfully", "success")
      return newPaymentMethod
    } catch (err) {
      error.value = "Failed to create payment method"
      showToast("Failed to create payment method", "error")
      throw err
    } finally {
      loading.value = false
    }
  }

  const updatePaymentMethod = async (id: number, data: PaymentMethodFormData): Promise<PaymentMethod> => {
    loading.value = true
    error.value = null

    try {
      const response = await axios.put(`/api/payment-methods/${id}`, data)
      const updatedPaymentMethod = response.data.data || response.data

      const index = paymentMethods.value.findIndex((method) => method.id === id)
      if (index !== -1) {
        paymentMethods.value[index] = updatedPaymentMethod
      }
      showToast("Payment method updated successfully", "success")
      return updatedPaymentMethod
    } catch (err) {
      error.value = "Failed to update payment method"
      showToast("Failed to update payment method", "error")
      throw err
    } finally {
      loading.value = false
    }
  }

  const deletePaymentMethod = async (id: number): Promise<void> => {
    loading.value = true
    error.value = null

    try {
      await axios.delete(`/api/payment-methods/${id}`)

      const index = paymentMethods.value.findIndex((method) => method.id === id)
      if (index !== -1) {
        paymentMethods.value.splice(index, 1)
      }
      showToast("Payment method deleted successfully", "success")
    } catch (err) {
      error.value = "Failed to delete payment method"
      showToast("Failed to delete payment method", "error")
      throw err
    } finally {
      loading.value = false
    }
  }

  const togglePaymentMethodStatus = async (id: number): Promise<void> => {
    const method = paymentMethods.value.find((m) => m.id === id)
    if (method) {
      const newStatus: "active" | "inactive" = method.status === "active" ? "inactive" : "active"
      await updatePaymentMethod(id, {
        name: method.name,
        type: method.type,
        description: method.description || "",
        fee_type: method.fee_type,
        fee_amount: method.fee_amount,
        min_amount: method.min_amount || 0,
        max_amount: method.max_amount,
        status: newStatus,
      })
    }
  }

  const getPaymentMethodById = (id: number): PaymentMethod | undefined => {
    return paymentMethods.value.find((method) => method.id === id)
  }

  const getPaymentMethodsByType = (type: PaymentMethod["type"]): PaymentMethod[] => {
    return paymentMethods.value.filter((method) => method.type === type)
  }

  const getPaymentMethodsByStatus = (status: "active" | "inactive"): PaymentMethod[] => {
    return paymentMethods.value.filter((method) => method.status === status)
  }

  return {
    paymentMethods: computed(() => paymentMethods.value),
    activePaymentMethods,
    loading: computed(() => loading.value),
    error: computed(() => error.value),
    fetchPaymentMethods,
    getPaymentMethods,
    createPaymentMethod,
    updatePaymentMethod,
    deletePaymentMethod,
    togglePaymentMethodStatus,
    getPaymentMethodById,
    getPaymentMethodsByType,
    getPaymentMethodsByStatus,
  }
}
