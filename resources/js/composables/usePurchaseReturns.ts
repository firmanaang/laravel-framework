import { ref, reactive } from "vue"
import type { PurchaseReturn } from "@/types/PurchaseReturn"
import type { Pagination } from "@/types/Pagination"

const purchaseReturns = ref<PurchaseReturn[]>([])
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

export function usePurchaseReturns() {
  const fetchPurchaseReturns = async (params: any = {}) => {
    isLoading.value = true
    try {
      const response = await fetch("/api/purchase-returns?" + new URLSearchParams(params))
      const data = await response.json()

      purchaseReturns.value = data.data
      Object.assign(pagination, data.meta)
    } catch (error) {
      console.error("Error fetching purchase returns:", error)
      throw error
    } finally {
      isLoading.value = false
    }
  }

  const createPurchaseReturn = async (purchaseReturnData: Partial<PurchaseReturn>) => {
    try {
      const response = await fetch("/api/purchase-returns", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(purchaseReturnData),
      })

      if (!response.ok) {
        throw new Error("Failed to create purchase return")
      }

      return await response.json()
    } catch (error) {
      console.error("Error creating purchase return:", error)
      throw error
    }
  }

  const updatePurchaseReturn = async (id: number, purchaseReturnData: Partial<PurchaseReturn>) => {
    try {
      const response = await fetch(`/api/purchase-returns/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(purchaseReturnData),
      })

      if (!response.ok) {
        throw new Error("Failed to update purchase return")
      }

      return await response.json()
    } catch (error) {
      console.error("Error updating purchase return:", error)
      throw error
    }
  }

  const deletePurchaseReturn = async (id: number) => {
    try {
      const response = await fetch(`/api/purchase-returns/${id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to delete purchase return")
      }
    } catch (error) {
      console.error("Error deleting purchase return:", error)
      throw error
    }
  }

  const deletePurchaseReturns = async (ids: number[]) => {
    try {
      const response = await fetch("/api/purchase-returns/bulk-delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ids }),
      })

      if (!response.ok) {
        throw new Error("Failed to delete purchase returns")
      }
    } catch (error) {
      console.error("Error deleting purchase returns:", error)
      throw error
    }
  }

  const exportPurchaseReturns = async (params: any = {}) => {
    isExporting.value = true
    try {
      const response = await fetch("/api/purchase-returns/export?" + new URLSearchParams(params))

      if (!response.ok) {
        throw new Error("Failed to export purchase returns")
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `purchase-returns-${new Date().toISOString().split("T")[0]}.xlsx`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error("Error exporting purchase returns:", error)
      throw error
    } finally {
      isExporting.value = false
    }
  }

  return {
    purchaseReturns,
    isLoading,
    isExporting,
    pagination,
    fetchPurchaseReturns,
    createPurchaseReturn,
    updatePurchaseReturn,
    deletePurchaseReturn,
    deletePurchaseReturns,
    exportPurchaseReturns,
  }
}
