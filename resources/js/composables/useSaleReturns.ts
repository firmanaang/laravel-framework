import { ref, reactive } from "vue"
import type { SaleReturn } from "@/types/SaleReturn"
import type { Pagination } from "@/types/Pagination"

const saleReturns = ref<SaleReturn[]>([])
const isLoading = ref(false)
const isExporting = ref(false)
const pagination = reactive<Pagination>({
  current_page: 1,
  last_page: 1,
  per_page: 15,
  total: 0,
  from: 0,
  to: 0,
})

export function useSaleReturns() {
  const fetchSaleReturns = async (params: any = {}) => {
    isLoading.value = true
    try {
      const response = await fetch("/api/sale-returns?" + new URLSearchParams(params))
      const data = await response.json()

      saleReturns.value = data.data
      Object.assign(pagination, data.meta)
    } catch (error) {
      console.error("Error fetching sale returns:", error)
      throw error
    } finally {
      isLoading.value = false
    }
  }

  const createSaleReturn = async (saleReturnData: Partial<SaleReturn>) => {
    try {
      const response = await fetch("/api/sale-returns", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(saleReturnData),
      })

      if (!response.ok) {
        throw new Error("Failed to create sale return")
      }

      return await response.json()
    } catch (error) {
      console.error("Error creating sale return:", error)
      throw error
    }
  }

  const updateSaleReturn = async (id: number, saleReturnData: Partial<SaleReturn>) => {
    try {
      const response = await fetch(`/api/sale-returns/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(saleReturnData),
      })

      if (!response.ok) {
        throw new Error("Failed to update sale return")
      }

      return await response.json()
    } catch (error) {
      console.error("Error updating sale return:", error)
      throw error
    }
  }

  const deleteSaleReturn = async (id: number) => {
    try {
      const response = await fetch(`/api/sale-returns/${id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to delete sale return")
      }
    } catch (error) {
      console.error("Error deleting sale return:", error)
      throw error
    }
  }

  const deleteSaleReturns = async (ids: number[]) => {
    try {
      const response = await fetch("/api/sale-returns/bulk-delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ids }),
      })

      if (!response.ok) {
        throw new Error("Failed to delete sale returns")
      }
    } catch (error) {
      console.error("Error deleting sale returns:", error)
      throw error
    }
  }

  const exportSaleReturns = async (params: any = {}) => {
    isExporting.value = true
    try {
      const response = await fetch("/api/sale-returns/export?" + new URLSearchParams(params))

      if (!response.ok) {
        throw new Error("Failed to export sale returns")
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `sale-returns-${new Date().toISOString().split("T")[0]}.xlsx`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error("Error exporting sale returns:", error)
      throw error
    } finally {
      isExporting.value = false
    }
  }

  return {
    saleReturns,
    isLoading,
    isExporting,
    pagination,
    fetchSaleReturns,
    createSaleReturn,
    updateSaleReturn,
    deleteSaleReturn,
    deleteSaleReturns,
    exportSaleReturns,
  }
}
