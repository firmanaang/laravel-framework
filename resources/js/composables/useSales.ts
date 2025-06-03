import { ref, reactive } from "vue"
import type { Sale } from "@/types/Sale"
import type { Pagination } from "@/types/Pagination"

const sales = ref<Sale[]>([])
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

export function useSales() {
  const fetchSales = async (params: any = {}) => {
    isLoading.value = true
    try {
      const response = await fetch("/api/sales?" + new URLSearchParams(params))
      const data = await response.json()

      sales.value = data.data
      Object.assign(pagination, data.meta)
    } catch (error) {
      console.error("Error fetching sales:", error)
      throw error
    } finally {
      isLoading.value = false
    }
  }

  const createSale = async (saleData: Partial<Sale>) => {
    try {
      const response = await fetch("/api/sales", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(saleData),
      })

      if (!response.ok) {
        throw new Error("Failed to create sale")
      }

      return await response.json()
    } catch (error) {
      console.error("Error creating sale:", error)
      throw error
    }
  }

  const updateSale = async (id: number, saleData: Partial<Sale>) => {
    try {
      const response = await fetch(`/api/sales/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(saleData),
      })

      if (!response.ok) {
        throw new Error("Failed to update sale")
      }

      return await response.json()
    } catch (error) {
      console.error("Error updating sale:", error)
      throw error
    }
  }

  const deleteSale = async (id: number) => {
    try {
      const response = await fetch(`/api/sales/${id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to delete sale")
      }
    } catch (error) {
      console.error("Error deleting sale:", error)
      throw error
    }
  }

  const deleteSales = async (ids: number[]) => {
    try {
      const response = await fetch("/api/sales/bulk-delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ids }),
      })

      if (!response.ok) {
        throw new Error("Failed to delete sales")
      }
    } catch (error) {
      console.error("Error deleting sales:", error)
      throw error
    }
  }

  const exportSales = async (params: any = {}) => {
    isExporting.value = true
    try {
      const response = await fetch("/api/sales/export?" + new URLSearchParams(params))

      if (!response.ok) {
        throw new Error("Failed to export sales")
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `sales-${new Date().toISOString().split("T")[0]}.xlsx`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error("Error exporting sales:", error)
      throw error
    } finally {
      isExporting.value = false
    }
  }

  return {
    sales,
    isLoading,
    isExporting,
    pagination,
    fetchSales,
    createSale,
    updateSale,
    deleteSale,
    deleteSales,
    exportSales,
  }
}
