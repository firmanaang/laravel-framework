import { ref } from "vue"
import type { PriceType, PriceTypeFormData, PriceTypeFilters } from "@/types/PriceType"
import axios from "@/bootstrap"

const priceTypes = ref<PriceType[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

export function usePriceTypes() {
  const fetchPriceTypes = async (filters: PriceTypeFilters = { search: "" }) => {
    loading.value = true
    error.value = null

    try {
      const params: Record<string, string> = {}
      if (filters.search && filters.search.trim()) {
        params.search = filters.search.trim()
      }

      const response = await axios.get("/api/price-types", { params })
      priceTypes.value = response.data.data || response.data
    } catch (err) {
      error.value = "Failed to fetch price types"
      console.error("Error fetching price types:", err)
      priceTypes.value = []
    } finally {
      loading.value = false
    }
  }

  const createPriceType = async (data: PriceTypeFormData): Promise<PriceType> => {
    loading.value = true
    error.value = null

    try {
      // Validate data
      if (!data.name || data.name.trim().length < 2) {
        throw new Error("Invalid price type name")
      }

      const response = await axios.post("/api/price-types", {
        name: data.name.trim(),
      })

      const newPriceType = response.data.data || response.data

      // Add to local state
      priceTypes.value.unshift(newPriceType)

      return newPriceType
    } catch (err: any) {
      error.value = err.response?.data?.message || err.message || "Failed to create price type"
      throw err
    } finally {
      loading.value = false
    }
  }

  const updatePriceType = async (id: string, data: PriceTypeFormData): Promise<PriceType> => {
    loading.value = true
    error.value = null

    try {
      // Validate data
      if (!data.name || data.name.trim().length < 2) {
        throw new Error("Invalid price type name")
      }

      const response = await axios.put(`/api/price-types/${id}`, {
        name: data.name.trim(),
      })

      const updatedPriceType = response.data.data || response.data

      // Update local state
      const index = priceTypes.value.findIndex((pt) => pt.id === id)
      if (index !== -1) {
        priceTypes.value[index] = updatedPriceType
      }

      return updatedPriceType
    } catch (err: any) {
      error.value = err.response?.data?.message || err.message || "Failed to update price type"
      throw err
    } finally {
      loading.value = false
    }
  }

  const deletePriceType = async (id: string): Promise<void> => {
    loading.value = true
    error.value = null

    try {
      await axios.delete(`/api/price-types/${id}`)

      // Remove from local state
      const index = priceTypes.value.findIndex((pt) => pt.id === id)
      if (index !== -1) {
        priceTypes.value.splice(index, 1)
      }
    } catch (err: any) {
      error.value = err.response?.data?.message || err.message || "Failed to delete price type"
      throw err
    } finally {
      loading.value = false
    }
  }

  const getPriceTypeById = (id: string): PriceType | undefined => {
    return priceTypes.value.find((pt) => pt.id === id)
  }

  return {
    priceTypes,
    loading,
    error,
    fetchPriceTypes,
    createPriceType,
    updatePriceType,
    deletePriceType,
    getPriceTypeById,
  }
}
