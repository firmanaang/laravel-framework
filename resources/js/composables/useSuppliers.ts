"use client"

import { ref, computed } from "vue"
import axios from "axios"
import type { Supplier, SupplierFormData, SupplierFilters, PaginationMeta, PaginationLinks } from "@/types/Supplier"
import { useToast } from "@/composables/useToast"
import { useI18n } from "@/composables/useI18n"
import { useAuth } from "@/composables/useAuth"

function debounce<T extends (...args: any[]) => any>(func: T, wait: number): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout>
  return (...args: Parameters<T>) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

const suppliers = ref<Supplier[]>([])
const loading = ref(false)
const filters = ref<SupplierFilters>({
  search: "",
  status: "",
  city: "",
  country: "",
})
const paginationMeta = ref<PaginationMeta | null>(null)
const paginationLinks = ref<PaginationLinks | null>(null)

// Track sync status
const syncInProgress = ref(false)
const selectedSuppliers = ref<string[]>([])
const syncStatusTrigger = ref(0)

// Search debounce
let searchTimeout: NodeJS.Timeout | null = null

// Mock data for offline fallback with pagination
const mockSuppliers: Supplier[] = Array.from({ length: 50 }, (_, i) => ({
  id: (i + 1).toString(),
  name: `Supplier ${i + 1}`,
  contact_person: `Contact Person ${i + 1}`,
  email: `supplier${i + 1}@example.com`,
  phone: `+62${Math.floor(Math.random() * 1000000000)}`,
  address: `Address ${i + 1}`,
  city: `City ${i + 1}`,
  country: "Indonesia",
  created_at: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
  updated_at: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
}))

export function useSuppliers() {
  const { success, error, info, warning } = useToast()
  const { t } = useI18n()
  const { hasPermission } = useAuth()

  // Permissions
  const canView = computed(() => hasPermission("view suppliers"))
  const canCreate = computed(() => hasPermission("create suppliers"))
  const canEdit = computed(() => hasPermission("edit suppliers"))
  const canDelete = computed(() => hasPermission("delete suppliers"))

  // Sync details
  const syncFailures = computed(() => {
    syncStatusTrigger.value

    const failures = JSON.parse(localStorage.getItem("supplierSyncFailures") || "[]")
    const validFailures = failures.filter((failure: any) => {
      const failureTime = failure.timestamp || Date.now()
      const hoursDiff = (Date.now() - failureTime) / (1000 * 60 * 60)
      return hoursDiff < 24
    })

    if (validFailures.length !== failures.length) {
      localStorage.setItem("supplierSyncFailures", JSON.stringify(validFailures))
    }

    return validFailures
  })

  const pendingSyncCount = computed(() => {
    syncStatusTrigger.value

    const syncQueue = JSON.parse(localStorage.getItem("supplierSyncQueue") || "[]")
    const deleteQueue = JSON.parse(localStorage.getItem("supplierDeleteQueue") || "[]")

    const validSyncQueue = syncQueue.filter((item: any) => {
      const itemTime = item.timestamp || Date.now()
      const hoursDiff = (Date.now() - itemTime) / (1000 * 60 * 60)
      return hoursDiff < 24
    })

    const validDeleteQueue = deleteQueue.filter((item: any) => {
      const itemTime = item.timestamp || Date.now()
      const hoursDiff = (Date.now() - itemTime) / (1000 * 60 * 60)
      return hoursDiff < 24
    })

    if (validSyncQueue.length !== syncQueue.length) {
      localStorage.setItem("supplierSyncQueue", JSON.stringify(validSyncQueue))
    }
    if (validDeleteQueue.length !== deleteQueue.length) {
      localStorage.setItem("supplierDeleteQueue", JSON.stringify(validDeleteQueue))
    }

    return validSyncQueue.length + validDeleteQueue.length
  })

  const hasSyncIssues = computed(() => {
    return syncFailures.value.length > 0 || pendingSyncCount.value > 0
  })

  const getAllOfflineSuppliers = (): Supplier[] => {
    try {
      const allCachedSuppliers = new Map<string, Supplier>()

      const allSuppliersCache = localStorage.getItem("allSuppliers")
      if (allSuppliersCache) {
        const parsed = JSON.parse(allSuppliersCache)
        if (Array.isArray(parsed)) {
          parsed.forEach((supplier) => {
            allCachedSuppliers.set(supplier.id, supplier)
          })
        }
      }

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && key.startsWith("suppliers_page_")) {
          try {
            const pageCache = JSON.parse(localStorage.getItem(key) || "{}")
            if (pageCache.suppliers && Array.isArray(pageCache.suppliers)) {
              pageCache.suppliers.forEach((supplier: Supplier) => {
                allCachedSuppliers.set(supplier.id, supplier)
              })
            }
          } catch (e) {
            console.warn(`Failed to parse cache for ${key}`, e)
          }
        }
      }

      const mergedSuppliers = Array.from(allCachedSuppliers.values())

      mergedSuppliers.sort((a, b) => {
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      })

      if (mergedSuppliers.length > 0) {
        return mergedSuppliers
      }

      return [...mockSuppliers]
    } catch (error) {
      console.error("Failed to get offline suppliers:", error)
      return [...mockSuppliers]
    }
  }

  const initializeSuppliers = async (page = 1, search = "", status = "", city = "", country = "") => {
    if (!canView.value) {
      error(t("permission.viewSuppliers"))
      return
    }

    loading.value = true
    try {
      suppliers.value = []

      if (navigator.onLine) {
        try {
          const params = new URLSearchParams({
            page: page.toString(),
          })

          if (search.trim()) params.append("search", search.trim())
          if (status) params.append("status", status)
          if (city) params.append("city", city)
          if (country) params.append("country", country)

          const response = await axios.get(`/api/suppliers?${params.toString()}`)
          const responseData = response.data

          if (responseData && responseData.data && Array.isArray(responseData.data)) {
            suppliers.value = responseData.data
            paginationMeta.value = responseData.meta
            paginationLinks.value = responseData.links

            const cacheKey = `suppliers_page_${page}_search_${search}_status_${status}_city_${city}_country_${country}`
            localStorage.setItem(
              cacheKey,
              JSON.stringify({
                suppliers: suppliers.value,
                meta: paginationMeta.value,
                links: paginationLinks.value,
                timestamp: Date.now(),
              }),
            )
            localStorage.setItem("suppliers_last_cache_key", cacheKey)

            const allSuppliersCache = localStorage.getItem("allSuppliers")
            const lastFullCacheTime = localStorage.getItem("allSuppliers_last_cache_time")
            const needsFullRefresh =
              !allSuppliersCache ||
              !lastFullCacheTime ||
              Date.now() - Number.parseInt(lastFullCacheTime) > 24 * 60 * 60 * 1000

            if (page === 1 && !search.trim() && !status && !city && !country && needsFullRefresh) {
              setTimeout(async () => {
                try {
                  const allDataResponse = await axios.get("/api/suppliers?per_page=1000")
                  if (allDataResponse.data && allDataResponse.data.data) {
                    localStorage.setItem("allSuppliers", JSON.stringify(allDataResponse.data.data))
                    localStorage.setItem("allSuppliers_last_cache_time", Date.now().toString())
                  }
                } catch (allDataError) {
                  console.warn("Failed to cache all suppliers:", allDataError)
                }
              }, 1000)
            }
          } else if (Array.isArray(response.data)) {
            suppliers.value = response.data
            paginationMeta.value = null
            paginationLinks.value = null
          } else {
            console.warn("Unexpected API response format:", responseData)
            suppliers.value = []
          }
        } catch (apiError) {
          console.warn("API call failed, using cached data:", apiError)
          loadFromCache(page, search, status, city, country)
        }
      } else {
        loadFromCache(page, search, status, city, country)
      }
    } catch (err) {
      console.error("Failed to load suppliers:", err)
      error(t("toast.failedLoad"))
      suppliers.value = []
    } finally {
      loading.value = false
    }
  }

  const loadFromCache = (page = 1, search = "", status = "", city = "", country = "") => {
    try {
      const cacheKey = `suppliers_page_${page}_search_${search}_status_${status}_city_${city}_country_${country}`
      const pageCache = localStorage.getItem(cacheKey)

      if (pageCache) {
        try {
          const cached = JSON.parse(pageCache)
          const cacheAge = Date.now() - (cached.timestamp || 0)

          if (cacheAge < 60 * 60 * 1000) {
            suppliers.value = cached.suppliers || []
            paginationMeta.value = cached.meta || null
            paginationLinks.value = cached.links || null
            return
          }
        } catch (e) {
          console.warn("Failed to parse page cache:", e)
        }
      }

      const allSuppliers = getAllOfflineSuppliers()
      const perPage = 10
      let filteredSuppliers = allSuppliers

      if (search.trim()) {
        const searchTerm = search.toLowerCase()
        filteredSuppliers = allSuppliers.filter(
          (supplier) =>
            supplier.name.toLowerCase().includes(searchTerm) ||
            supplier.contact_person.toLowerCase().includes(searchTerm) ||
            supplier.email.toLowerCase().includes(searchTerm) ||
            supplier.phone.toLowerCase().includes(searchTerm) ||
            supplier.city.toLowerCase().includes(searchTerm) ||
            supplier.country.toLowerCase().includes(searchTerm),
        )
      }

      if (status) {
        // Add status filtering logic if needed
      }

      if (city) {
        filteredSuppliers = filteredSuppliers.filter((supplier) =>
          supplier.city.toLowerCase().includes(city.toLowerCase()),
        )
      }

      if (country) {
        filteredSuppliers = filteredSuppliers.filter((supplier) =>
          supplier.country.toLowerCase().includes(country.toLowerCase()),
        )
      }

      const total = filteredSuppliers.length
      const lastPage = Math.ceil(total / perPage)
      const from = total > 0 ? (page - 1) * perPage + 1 : 0
      const to = Math.min(page * perPage, total)

      const startIndex = (page - 1) * perPage
      const endIndex = startIndex + perPage
      suppliers.value = filteredSuppliers.slice(startIndex, endIndex)

      paginationMeta.value = {
        current_page: page,
        from: suppliers.value.length > 0 ? from : 0,
        last_page: lastPage,
        per_page: perPage,
        to: suppliers.value.length > 0 ? to : 0,
        total: total,
        links: [],
      }

      const links = []
      for (let i = 1; i <= lastPage; i++) {
        links.push({
          url: i === page ? null : `?page=${i}`,
          label: i.toString(),
          active: i === page,
        })
      }
      paginationMeta.value.links = links
    } catch (error) {
      console.error("Failed to load from cache:", error)
      suppliers.value = [...mockSuppliers.slice(0, 10)]

      paginationMeta.value = {
        current_page: 1,
        from: 1,
        last_page: 5,
        per_page: 10,
        to: 10,
        total: 50,
        links: [
          { url: null, label: "1", active: true },
          { url: "?page=2", label: "2", active: false },
          { url: "?page=3", label: "3", active: false },
          { url: "?page=4", label: "4", active: false },
          { url: "?page=5", label: "5", active: false },
        ],
      }
    }
  }

  const getSyncAction = (supplierId: string): "create" | "update" | "delete" | null => {
    const syncQueue = JSON.parse(localStorage.getItem("supplierSyncQueue") || "[]")
    const deleteQueue = JSON.parse(localStorage.getItem("supplierDeleteQueue") || "[]")

    const deleteItem = deleteQueue.find((item: any) => item.id === supplierId)
    if (deleteItem) return "delete"

    const syncItem = syncQueue.find((item: any) => item.supplier.id === supplierId)
    if (syncItem) {
      return syncItem.action === "create" ? "create" : "update"
    }

    return null
  }

  const filteredSuppliers = computed(() => {
    syncStatusTrigger.value

    if (!Array.isArray(suppliers.value)) {
      console.warn("suppliers.value is not an array:", suppliers.value)
      return []
    }

    return suppliers.value.map((supplier) => ({
      ...supplier,
      _pendingSync: isPendingSync(supplier.id),
      _syncAction: getSyncAction(supplier.id),
    }))
  })

  const shouldShowPagination = computed(() => {
    return paginationMeta.value && paginationMeta.value.total > 0 && paginationMeta.value.last_page > 1
  })

  const addSupplier = async (supplierData: SupplierFormData): Promise<Supplier> => {
    if (!canCreate.value) {
      error(t("permission.createSuppliers"))
      throw new Error("Permission denied")
    }

    loading.value = true
    try {
      if (navigator.onLine) {
        try {
          const response = await axios.post("/api/suppliers", supplierData)
          const savedSupplier = response.data.data || response.data

          await initializeSuppliers(
            paginationMeta.value?.current_page || 1,
            filters.value.search,
            filters.value.status,
            filters.value.city,
            filters.value.country,
          )
          success(t("toast.supplierCreated"))
          return savedSupplier
        } catch (apiError: any) {
          console.error("API save failed:", apiError)

          if (apiError.response?.status === 422 && apiError.response?.data?.errors) {
            throw apiError
          }

          const newSupplier: Supplier = {
            id: `temp_${Date.now()}`,
            ...supplierData,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }

          saveLocallyAndQueue(newSupplier, "create")
          return newSupplier
        }
      } else {
        const newSupplier: Supplier = {
          id: `temp_${Date.now()}`,
          ...supplierData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }

        saveLocallyAndQueue(newSupplier, "create")
        return newSupplier
      }
    } catch (err: any) {
      console.error("Failed to add supplier:", err)

      if (!(err.response?.status === 422 && err.response?.data?.errors)) {
        error(t("toast.failedCreate"))
      }

      throw err
    } finally {
      loading.value = false
    }
  }

  const updateSupplier = async (id: string, supplierData: SupplierFormData): Promise<Supplier> => {
    if (!canEdit.value) {
      error(t("permission.editSuppliers"))
      throw new Error("Permission denied")
    }

    loading.value = true
    try {
      const allSuppliers = getAllOfflineSuppliers()
      const index = allSuppliers.findIndex((supplier) => supplier.id === id)
      if (index === -1) {
        throw new Error("Supplier not found")
      }

      const updatedSupplier: Supplier = {
        ...allSuppliers[index],
        ...supplierData,
        updated_at: new Date().toISOString(),
      }

      if (navigator.onLine) {
        try {
          const response = await axios.put(`/api/suppliers/${id}`, supplierData)
          const savedSupplier = response.data.data || response.data

          await initializeSuppliers(
            paginationMeta.value?.current_page || 1,
            filters.value.search,
            filters.value.status,
            filters.value.city,
            filters.value.country,
          )
          success(t("toast.supplierUpdated"))
          return savedSupplier
        } catch (apiError: any) {
          console.error("API update failed:", apiError)

          if (apiError.response?.status === 422 && apiError.response?.data?.errors) {
            throw apiError
          }

          allSuppliers[index] = updatedSupplier
          localStorage.setItem("allSuppliers", JSON.stringify(allSuppliers))
          saveLocallyAndQueue(updatedSupplier, "update")
          return updatedSupplier
        }
      } else {
        allSuppliers[index] = updatedSupplier
        localStorage.setItem("allSuppliers", JSON.stringify(allSuppliers))
        saveLocallyAndQueue(updatedSupplier, "update")
        return updatedSupplier
      }
    } catch (err: any) {
      console.error("Failed to update supplier:", err)

      if (!(err.response?.status === 422 && err.response?.data?.errors)) {
        error(t("toast.failedUpdate"))
      }

      throw err
    } finally {
      loading.value = false
    }
  }

  const deleteSupplier = async (id: string): Promise<void> => {
    if (!canDelete.value) {
      error(t("permission.deleteSuppliers"))
      throw new Error("Permission denied")
    }

    loading.value = true
    try {
      if (navigator.onLine) {
        try {
          await axios.delete(`/api/suppliers/${id}`)
          await initializeSuppliers(
            paginationMeta.value?.current_page || 1,
            filters.value.search,
            filters.value.status,
            filters.value.city,
            filters.value.country,
          )
          success(t("toast.supplierDeleted"))
        } catch (apiError) {
          console.warn("API delete failed, marking for deletion:", apiError)
          queueForDeletion(id)
          removeFromLocalCache(id)
          success("Supplier marked for deletion (will sync when online)")
        }
      } else {
        queueForDeletion(id)
        removeFromLocalCache(id)
        success("Supplier marked for deletion (will sync when online)")
      }
    } catch (err) {
      console.error("Failed to delete supplier:", err)
      error(t("toast.failedDelete"))
      throw err
    } finally {
      loading.value = false
    }
  }

  const deleteSelectedSuppliers = async (): Promise<void> => {
    if (!canDelete.value) {
      error(t("permission.deleteSuppliers"))
      throw new Error("Permission denied")
    }

    if (selectedSuppliers.value.length === 0) {
      error("No suppliers selected")
      return
    }

    loading.value = true
    try {
      if (navigator.onLine) {
        try {
          await axios.post("/api/suppliers/bulk-delete", {
            ids: selectedSuppliers.value,
          })
          await initializeSuppliers(
            paginationMeta.value?.current_page || 1,
            filters.value.search,
            filters.value.status,
            filters.value.city,
            filters.value.country,
          )
          success(t("toast.suppliersDeleted"))
        } catch (apiError) {
          console.warn("API bulk delete failed, marking for deletion:", apiError)
          selectedSuppliers.value.forEach((id) => {
            queueForDeletion(id)
            removeFromLocalCache(id)
          })
          success(`${selectedSuppliers.value.length} suppliers marked for deletion (will sync when online)`)
        }
      } else {
        selectedSuppliers.value.forEach((id) => {
          queueForDeletion(id)
          removeFromLocalCache(id)
        })
        success(`${selectedSuppliers.value.length} suppliers marked for deletion (will sync when online)`)
      }

      selectedSuppliers.value = []
    } catch (err) {
      console.error("Failed to delete selected suppliers:", err)
      error(t("toast.failedDelete"))
      throw err
    } finally {
      loading.value = false
    }
  }

  const removeFromLocalCache = (id: string) => {
    try {
      const allSuppliers = getAllOfflineSuppliers()
      const filteredSuppliers = allSuppliers.filter((supplier) => supplier.id !== id)
      localStorage.setItem("allSuppliers", JSON.stringify(filteredSuppliers))

      suppliers.value = suppliers.value.filter((supplier) => supplier.id !== id)

      const cachedSuppliers = localStorage.getItem("suppliers")
      if (cachedSuppliers) {
        const parsed = JSON.parse(cachedSuppliers)
        if (Array.isArray(parsed)) {
          const filtered = parsed.filter((supplier) => supplier.id !== id)
          localStorage.setItem("suppliers", JSON.stringify(filtered))
        }
      }
    } catch (error) {
      console.error("Failed to remove from local cache:", error)
    }
  }

  const saveLocallyAndQueue = (supplier: Supplier, action: "create" | "update") => {
    try {
      const allSuppliers = getAllOfflineSuppliers()

      if (action === "create") {
        allSuppliers.unshift(supplier)
        suppliers.value.unshift(supplier)
      } else {
        const index = allSuppliers.findIndex((s) => s.id === supplier.id)
        if (index !== -1) {
          allSuppliers[index] = supplier
        }
        const currentIndex = suppliers.value.findIndex((s) => s.id === supplier.id)
        if (currentIndex !== -1) {
          suppliers.value[currentIndex] = supplier
        }
      }

      localStorage.setItem("allSuppliers", JSON.stringify(allSuppliers))
      localStorage.setItem("suppliers", JSON.stringify(suppliers.value))

      const syncQueue = JSON.parse(localStorage.getItem("supplierSyncQueue") || "[]")
      const existingIndex = syncQueue.findIndex(
        (item: any) => item.supplier.id === supplier.id && item.action === action,
      )

      const queueItem = {
        supplier,
        action,
        timestamp: Date.now(),
        id: `${supplier.id}_${action}_${Date.now()}`,
      }

      if (existingIndex !== -1) {
        syncQueue[existingIndex] = queueItem
      } else {
        syncQueue.push(queueItem)
      }

      localStorage.setItem("supplierSyncQueue", JSON.stringify(syncQueue))

      success(`Supplier ${action}d locally (will sync when online)`)
    } catch (error) {
      console.error("Failed to save locally and queue:", error)
    }
  }

  const queueForDeletion = (id: string) => {
    try {
      const deleteQueue = JSON.parse(localStorage.getItem("supplierDeleteQueue") || "[]")

      const existingIndex = deleteQueue.findIndex((item: any) => item.id === id)
      const queueItem = {
        id,
        timestamp: Date.now(),
        queueId: `${id}_delete_${Date.now()}`,
      }

      if (existingIndex !== -1) {
        deleteQueue[existingIndex] = queueItem
      } else {
        deleteQueue.push(queueItem)
      }

      localStorage.setItem("supplierDeleteQueue", JSON.stringify(deleteQueue))
    } catch (error) {
      console.error("Failed to queue for deletion:", error)
    }
  }

  const isPendingSync = (supplierId: string): boolean => {
    const syncQueue = JSON.parse(localStorage.getItem("supplierSyncQueue") || "[]")
    const deleteQueue = JSON.parse(localStorage.getItem("supplierDeleteQueue") || "[]")

    return (
      syncQueue.some((item: any) => item.supplier.id === supplierId) ||
      deleteQueue.some((item: any) => item.id === supplierId)
    )
  }

  const syncPendingChanges = async () => {
    if (!navigator.onLine || syncInProgress.value) return

    syncInProgress.value = true
    let syncedCount = 0
    const failedSyncs: any[] = []

    try {
      const syncQueue = JSON.parse(localStorage.getItem("supplierSyncQueue") || "[]")
      const successfulSyncs: any[] = []

      for (const item of syncQueue) {
        try {
          if (item.action === "create") {
            if (item.supplier.id.startsWith("temp_")) {
              const response = await axios.post("/api/suppliers", {
                name: item.supplier.name,
                contact_person: item.supplier.contact_person,
                email: item.supplier.email,
                phone: item.supplier.phone,
                address: item.supplier.address,
                city: item.supplier.city,
                country: item.supplier.country,
              })

              const serverSupplier = response.data.data || response.data
              const allSuppliers = getAllOfflineSuppliers()
              const index = allSuppliers.findIndex((s) => s.id === item.supplier.id)
              if (index !== -1) {
                allSuppliers[index] = { ...allSuppliers[index], id: serverSupplier.id }
                localStorage.setItem("allSuppliers", JSON.stringify(allSuppliers))
              }
            }
          } else if (item.action === "update") {
            if (!item.supplier.id.startsWith("temp_")) {
              await axios.put(`/api/suppliers/${item.supplier.id}`, {
                name: item.supplier.name,
                contact_person: item.supplier.contact_person,
                email: item.supplier.email,
                phone: item.supplier.phone,
                address: item.supplier.address,
                city: item.supplier.city,
                country: item.supplier.country,
              })
            }
          }
          successfulSyncs.push(item)
          syncedCount++
        } catch (syncError: any) {
          console.error("Failed to sync supplier:", syncError)

          const validationErrors = syncError.response?.data?.errors || null
          const errorMessage = syncError.response?.data?.message || syncError.message || "Sync failed"

          failedSyncs.push({
            ...item,
            message: errorMessage,
            validationErrors: validationErrors,
            timestamp: Date.now(),
          })
        }
      }

      if (successfulSyncs.length > 0) {
        const remainingQueue = syncQueue.filter(
          (item: any) =>
            !successfulSyncs.some(
              (synced) =>
                synced.id === item.id || (synced.supplier.id === item.supplier.id && synced.action === item.action),
            ),
        )
        localStorage.setItem("supplierSyncQueue", JSON.stringify(remainingQueue))
      }

      const deleteQueue = JSON.parse(localStorage.getItem("supplierDeleteQueue") || "[]")
      const successfulDeletes: any[] = []

      for (const item of deleteQueue) {
        try {
          if (!item.id.startsWith("temp_")) {
            await axios.delete(`/api/suppliers/${item.id}`)
          }
          successfulDeletes.push(item)
          syncedCount++
        } catch (syncError: any) {
          console.error("Failed to sync supplier deletion:", syncError)

          const validationErrors = syncError.response?.data?.errors || null
          const errorMessage = syncError.response?.data?.message || syncError.message || "Delete sync failed"

          failedSyncs.push({
            id: item.id,
            action: "delete",
            message: errorMessage,
            validationErrors: validationErrors,
            timestamp: Date.now(),
          })
        }
      }

      if (successfulDeletes.length > 0) {
        const remainingDeletes = deleteQueue.filter(
          (item: any) =>
            !successfulDeletes.some((deleted) => deleted.queueId === item.queueId || deleted.id === item.id),
        )
        localStorage.setItem("supplierDeleteQueue", JSON.stringify(remainingDeletes))
      }

      if (failedSyncs.length > 0) {
        localStorage.setItem("supplierSyncFailures", JSON.stringify(failedSyncs))
      } else {
        localStorage.setItem("supplierSyncFailures", JSON.stringify([]))
      }

      syncStatusTrigger.value++

      const isAutoSync = arguments.length === 0 || arguments[0] === true

      if (syncedCount > 0 && !isAutoSync) {
        await initializeSuppliers()
        success(t("toast.syncCompleted"))
      } else if (syncedCount > 0 && isAutoSync) {
        await initializeSuppliers()
      }

      if (failedSyncs.length > 0 && !isAutoSync) {
        error(t("toast.syncFailed"))
      }
    } catch (err) {
      console.error("Failed to sync pending changes:", err)
    } finally {
      syncInProgress.value = false
    }
  }

  const retrySyncFailures = async () => {
    const failures = JSON.parse(localStorage.getItem("supplierSyncFailures") || "[]")
    if (failures.length === 0) {
      info("No sync failures to retry")
      return
    }

    const syncQueue = JSON.parse(localStorage.getItem("supplierSyncQueue") || "[]")
    const deleteQueue = JSON.parse(localStorage.getItem("supplierDeleteQueue") || "[]")

    let retryCount = 0

    failures.forEach((failure: any) => {
      if (failure.action === "delete") {
        const exists = deleteQueue.some((item: any) => item.id === failure.id)
        if (!exists) {
          deleteQueue.push({
            id: failure.id,
            timestamp: Date.now(),
            queueId: `${failure.id}_delete_retry_${Date.now()}`,
          })
          retryCount++
        }
      } else {
        const exists = syncQueue.some(
          (item: any) => item.supplier.id === failure.supplier.id && item.action === failure.action,
        )
        if (!exists) {
          syncQueue.push({
            supplier: failure.supplier,
            action: failure.action,
            timestamp: Date.now(),
            id: `${failure.supplier.id}_${failure.action}_retry_${Date.now()}`,
          })
          retryCount++
        }
      }
    })

    localStorage.setItem("supplierSyncQueue", JSON.stringify(syncQueue))
    localStorage.setItem("supplierDeleteQueue", JSON.stringify(deleteQueue))
    localStorage.setItem("supplierSyncFailures", JSON.stringify([]))

    if (retryCount > 0) {
      info(`Retrying ${retryCount} failed sync operations...`)
    } else {
      warning("All failed operations are already queued for retry")
    }

    await syncPendingChanges()
  }

  const clearSyncFailures = () => {
    localStorage.setItem("supplierSyncFailures", JSON.stringify([]))
    success("Sync errors cleared")
  }

  const clearAllSyncData = () => {
    localStorage.setItem("supplierSyncQueue", JSON.stringify([]))
    localStorage.setItem("supplierDeleteQueue", JSON.stringify([]))
    localStorage.setItem("supplierSyncFailures", JSON.stringify([]))

    syncInProgress.value = false
    selectedSuppliers.value = []
    syncStatusTrigger.value++

    suppliers.value = suppliers.value.map((supplier) => ({
      ...supplier,
      _pendingSync: false,
    }))

    success("All sync data cleared")

    setTimeout(() => {
      syncStatusTrigger.value++
      suppliers.value = [...suppliers.value]
    }, 100)
  }

  const setFilters = async (newFilters: Partial<SupplierFilters>) => {
    filters.value = { ...filters.value, ...newFilters }

    if (searchTimeout) {
      clearTimeout(searchTimeout)
    }

    searchTimeout = setTimeout(async () => {
      await initializeSuppliers(
        1,
        filters.value.search,
        filters.value.status,
        filters.value.city,
        filters.value.country,
      )
    }, 500)
  }

  const clearFilters = async () => {
    filters.value = {
      search: "",
      status: "",
      city: "",
      country: "",
    }
    await initializeSuppliers(1, "", "", "", "")
  }

  const downloadTemplate = () => {
    const csvContent =
      "Name,Contact Person,Email,Phone,Address,City,Country\nSupplier 1,John Doe,john@example.com,+1234567890,123 Main St,New York,USA"
    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "suppliers_template.csv"
    a.click()
    window.URL.revokeObjectURL(url)
    success(t("toast.templateDownloaded"))
  }

  const exportSuppliers = async (exportAll = false) => {
    try {
      const params = new URLSearchParams()

      if (!exportAll) {
        if (filters.value.search) params.append("search", filters.value.search)
        if (filters.value.status) params.append("status", filters.value.status)
        if (filters.value.city) params.append("city", filters.value.city)
        if (filters.value.country) params.append("country", filters.value.country)
      }

      const response = await axios.post(`/api/suppliers/export?${params.toString()}`)

      if (response.data.success) {
        success(t("toast.exportStarted"))
      }
    } catch (err) {
      console.error("Failed to start export:", err)
      error(t("toast.failedExport"))
    }
  }

  const goToPage = async (page: number) => {
    if (paginationMeta.value && page >= 1 && page <= paginationMeta.value.last_page) {
      await initializeSuppliers(
        page,
        filters.value.search,
        filters.value.status,
        filters.value.city,
        filters.value.country,
      )
    }
  }

  const updateSyncStatus = () => {
    syncStatusTrigger.value++
  }

  return {
    suppliers,
    loading,
    filters,
    filteredSuppliers,
    paginationMeta,
    paginationLinks,
    shouldShowPagination,
    selectedSuppliers,
    canView,
    canCreate,
    canEdit,
    canDelete,
    syncFailures,
    pendingSyncCount,
    hasSyncIssues,
    syncStatusTrigger,
    initializeSuppliers,
    addSupplier,
    updateSupplier,
    deleteSupplier,
    deleteSelectedSuppliers,
    setFilters,
    clearFilters,
    downloadTemplate,
    exportSuppliers,
    syncPendingChanges,
    retrySyncFailures,
    clearSyncFailures,
    clearAllSyncData,
    goToPage,
    updateSyncStatus,
    getSyncAction,
  }
}
