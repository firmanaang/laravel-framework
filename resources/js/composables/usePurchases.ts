"use client"

import { ref, computed } from "vue"
import axios from "axios"
import type { Purchase, PurchaseFormData, PurchaseFilters, PaginationMeta, PaginationLinks } from "@/types/Purchase"
import { useToast } from "@/composables/useToast"
import { useI18n } from "@/composables/useI18n"
import { useAuth } from "@/composables/useAuth"

const purchases = ref<Purchase[]>([])
const loading = ref(false)
const filters = ref<PurchaseFilters>({
  search: "",
})
const paginationMeta = ref<PaginationMeta | null>(null)
const paginationLinks = ref<PaginationLinks | null>(null)

// Track sync status
const syncInProgress = ref(false)
const selectedPurchases = ref<string[]>([])
const syncStatusTrigger = ref(0) // Trigger untuk force reactivity

// Search debounce
let searchTimeout: NodeJS.Timeout | null = null

// Mock data for offline fallback with pagination
const mockPurchases: Purchase[] = Array.from({ length: 50 }, (_, i) => ({
  id: (i + 1).toString(),
  supplier_id: `supplier_${(i % 5) + 1}`,
  supplier_name: `Supplier ${(i % 5) + 1}`,
  purchase_number: `PO-${String(i + 1).padStart(3, "0")}`,
  purchase_date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
  total_amount: (i + 1) * 100000,
  status: ["pending", "completed", "cancelled"][i % 3] as "pending" | "completed" | "cancelled",
  notes: i % 3 === 0 ? `Notes for purchase ${i + 1}` : undefined,
  created_at: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
  updated_at: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
}))

export function usePurchases() {
  const { success, error, info, warning } = useToast()
  const { t } = useI18n()
  const { hasPermission } = useAuth()

  // Permissions
  const canView = computed(() => hasPermission("view purchases"))
  const canCreate = computed(() => hasPermission("create purchases"))
  const canEdit = computed(() => hasPermission("edit purchases"))
  const canDelete = computed(() => hasPermission("delete purchases"))

  // Sync details
  const syncFailures = computed(() => {
    syncStatusTrigger.value

    const failures = JSON.parse(localStorage.getItem("purchaseSyncFailures") || "[]")
    const validFailures = failures.filter((failure: any) => {
      const failureTime = failure.timestamp || Date.now()
      const hoursDiff = (Date.now() - failureTime) / (1000 * 60 * 60)
      return hoursDiff < 24
    })

    if (validFailures.length !== failures.length) {
      localStorage.setItem("purchaseSyncFailures", JSON.stringify(validFailures))
    }

    return validFailures
  })

  const pendingSyncCount = computed(() => {
    syncStatusTrigger.value

    const syncQueue = JSON.parse(localStorage.getItem("purchaseSyncQueue") || "[]")
    const deleteQueue = JSON.parse(localStorage.getItem("purchaseDeleteQueue") || "[]")

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
      localStorage.setItem("purchaseSyncQueue", JSON.stringify(validSyncQueue))
    }
    if (validDeleteQueue.length !== deleteQueue.length) {
      localStorage.setItem("purchaseDeleteQueue", JSON.stringify(validDeleteQueue))
    }

    return validSyncQueue.length + validDeleteQueue.length
  })

  const hasSyncIssues = computed(() => {
    return syncFailures.value.length > 0 || pendingSyncCount.value > 0
  })

  const getAllOfflinePurchases = (): Purchase[] => {
    try {
      const allCachedPurchases = new Map<string, Purchase>()

      const allPurchasesCache = localStorage.getItem("allPurchases")
      if (allPurchasesCache) {
        const parsed = JSON.parse(allPurchasesCache)
        if (Array.isArray(parsed)) {
          parsed.forEach((purchase) => {
            allCachedPurchases.set(purchase.id, purchase)
          })
        }
      }

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && key.startsWith("purchases_page_")) {
          try {
            const pageCache = JSON.parse(localStorage.getItem(key) || "{}")
            if (pageCache.purchases && Array.isArray(pageCache.purchases)) {
              pageCache.purchases.forEach((purchase: Purchase) => {
                allCachedPurchases.set(purchase.id, purchase)
              })
            }
          } catch (e) {
            console.warn(`Failed to parse cache for ${key}`, e)
          }
        }
      }

      const mergedPurchases = Array.from(allCachedPurchases.values())

      mergedPurchases.sort((a, b) => {
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      })

      if (mergedPurchases.length > 0) {
        return mergedPurchases
      }

      return [...mockPurchases]
    } catch (error) {
      console.error("Failed to get offline purchases:", error)
      return [...mockPurchases]
    }
  }

  const initializePurchases = async (page = 1, search = "") => {
    if (!canView.value) {
      error(t("permission.viewPurchases"))
      return
    }

    loading.value = true
    try {
      purchases.value = []

      if (navigator.onLine) {
        try {
          const params = new URLSearchParams({
            page: page.toString(),
          })

          if (search.trim()) {
            params.append("search", search.trim())
          }

          const response = await axios.get(`/api/purchases?${params.toString()}`)
          const responseData = response.data

          if (responseData && responseData.data && Array.isArray(responseData.data)) {
            purchases.value = responseData.data
            paginationMeta.value = responseData.meta
            paginationLinks.value = responseData.links

            const cacheKey = `purchases_page_${page}_search_${search}`
            localStorage.setItem(
              cacheKey,
              JSON.stringify({
                purchases: purchases.value,
                meta: paginationMeta.value,
                links: paginationLinks.value,
                timestamp: Date.now(),
              }),
            )
            localStorage.setItem("purchases_last_cache_key", cacheKey)

            const allPurchasesCache = localStorage.getItem("allPurchases")
            const lastFullCacheTime = localStorage.getItem("allPurchases_last_cache_time")
            const needsFullRefresh =
              !allPurchasesCache ||
              !lastFullCacheTime ||
              Date.now() - Number.parseInt(lastFullCacheTime) > 24 * 60 * 60 * 1000

            if (page === 1 && !search.trim() && needsFullRefresh) {
              setTimeout(async () => {
                try {
                  const allDataResponse = await axios.get("/api/purchases?per_page=1000")
                  if (allDataResponse.data && allDataResponse.data.data) {
                    localStorage.setItem("allPurchases", JSON.stringify(allDataResponse.data.data))
                    localStorage.setItem("allPurchases_last_cache_time", Date.now().toString())
                  }
                } catch (allDataError) {
                  console.warn("Failed to cache all purchases:", allDataError)
                }
              }, 1000)
            }
          } else if (Array.isArray(response.data)) {
            purchases.value = response.data
            paginationMeta.value = null
            paginationLinks.value = null
          } else {
            console.warn("Unexpected API response format:", responseData)
            purchases.value = []
          }
        } catch (apiError) {
          console.warn("API call failed, using cached data:", apiError)
          loadFromCache(page, search)
        }
      } else {
        loadFromCache(page, search)
      }
    } catch (err) {
      console.error("Failed to load purchases:", err)
      error(t("toast.failedLoad"))
      purchases.value = []
    } finally {
      loading.value = false
    }
  }

  const loadFromCache = (page = 1, search = "") => {
    try {
      const cacheKey = `purchases_page_${page}_search_${search}`
      const pageCache = localStorage.getItem(cacheKey)

      if (pageCache) {
        try {
          const cached = JSON.parse(pageCache)
          const cacheAge = Date.now() - (cached.timestamp || 0)

          if (cacheAge < 60 * 60 * 1000) {
            purchases.value = cached.purchases || []
            paginationMeta.value = cached.meta || null
            paginationLinks.value = cached.links || null
            return
          }
        } catch (e) {
          console.warn("Failed to parse page cache:", e)
        }
      }

      const allPurchases = getAllOfflinePurchases()

      const perPage = 10
      let filteredPurchases = allPurchases

      if (search.trim()) {
        const searchTerm = search.toLowerCase()
        filteredPurchases = allPurchases.filter(
          (purchase) =>
            purchase.purchase_number.toLowerCase().includes(searchTerm) ||
            purchase.supplier_name?.toLowerCase().includes(searchTerm) ||
            purchase.notes?.toLowerCase().includes(searchTerm),
        )
      }

      const total = filteredPurchases.length
      const lastPage = Math.ceil(total / perPage)
      const from = total > 0 ? (page - 1) * perPage + 1 : 0
      const to = Math.min(page * perPage, total)

      const startIndex = (page - 1) * perPage
      const endIndex = startIndex + perPage
      purchases.value = filteredPurchases.slice(startIndex, endIndex)

      paginationMeta.value = {
        current_page: page,
        from: purchases.value.length > 0 ? from : 0,
        last_page: lastPage,
        per_page: perPage,
        to: purchases.value.length > 0 ? to : 0,
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
      purchases.value = [...mockPurchases.slice(0, 10)]

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

  const getSyncAction = (purchaseId: string): "create" | "update" | "delete" | null => {
    const syncQueue = JSON.parse(localStorage.getItem("purchaseSyncQueue") || "[]")
    const deleteQueue = JSON.parse(localStorage.getItem("purchaseDeleteQueue") || "[]")

    const deleteItem = deleteQueue.find((item: any) => item.id === purchaseId)
    if (deleteItem) return "delete"

    const syncItem = syncQueue.find((item: any) => item.purchase.id === purchaseId)
    if (syncItem) {
      return syncItem.action === "create" ? "create" : "update"
    }

    return null
  }

  const filteredPurchases = computed(() => {
    syncStatusTrigger.value

    if (!Array.isArray(purchases.value)) {
      console.warn("purchases.value is not an array:", purchases.value)
      return []
    }

    return purchases.value.map((purchase) => ({
      ...purchase,
      _pendingSync: isPendingSync(purchase.id),
      _syncAction: getSyncAction(purchase.id),
    }))
  })

  const shouldShowPagination = computed(() => {
    return paginationMeta.value && paginationMeta.value.total > 0 && paginationMeta.value.last_page > 1
  })

  const addPurchase = async (purchaseData: PurchaseFormData): Promise<Purchase> => {
    if (!canCreate.value) {
      error(t("permission.createPurchases"))
      throw new Error("Permission denied")
    }

    loading.value = true
    try {
      if (navigator.onLine) {
        try {
          const response = await axios.post("/api/purchases", purchaseData)
          const savedPurchase = response.data.data || response.data

          await initializePurchases(paginationMeta.value?.current_page || 1, filters.value.search)
          success(t("toast.purchaseCreated"))
          return savedPurchase
        } catch (apiError: any) {
          console.error("API save failed:", apiError)

          if (apiError.response?.status === 422 && apiError.response?.data?.errors) {
            throw apiError
          }

          const newPurchase: Purchase = {
            id: `temp_${Date.now()}`,
            ...purchaseData,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }

          saveLocallyAndQueue(newPurchase, "create")
          return newPurchase
        }
      } else {
        const newPurchase: Purchase = {
          id: `temp_${Date.now()}`,
          ...purchaseData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }

        saveLocallyAndQueue(newPurchase, "create")
        return newPurchase
      }
    } catch (err: any) {
      console.error("Failed to add purchase:", err)

      if (!(err.response?.status === 422 && err.response?.data?.errors)) {
        error(t("toast.failedCreate"))
      }

      throw err
    } finally {
      loading.value = false
    }
  }

  const updatePurchase = async (id: string, purchaseData: PurchaseFormData): Promise<Purchase> => {
    if (!canEdit.value) {
      error(t("permission.editPurchases"))
      throw new Error("Permission denied")
    }

    loading.value = true
    try {
      const allPurchases = getAllOfflinePurchases()
      const index = allPurchases.findIndex((purchase) => purchase.id === id)
      if (index === -1) {
        throw new Error("Purchase not found")
      }

      const updatedPurchase: Purchase = {
        ...allPurchases[index],
        ...purchaseData,
        updated_at: new Date().toISOString(),
      }

      if (navigator.onLine) {
        try {
          const response = await axios.put(`/api/purchases/${id}`, purchaseData)
          const savedPurchase = response.data.data || response.data

          await initializePurchases(paginationMeta.value?.current_page || 1, filters.value.search)
          success(t("toast.purchaseUpdated"))
          return savedPurchase
        } catch (apiError: any) {
          console.error("API update failed:", apiError)

          if (apiError.response?.status === 422 && apiError.response?.data?.errors) {
            throw apiError
          }

          allPurchases[index] = updatedPurchase
          localStorage.setItem("allPurchases", JSON.stringify(allPurchases))
          saveLocallyAndQueue(updatedPurchase, "update")
          return updatedPurchase
        }
      } else {
        allPurchases[index] = updatedPurchase
        localStorage.setItem("allPurchases", JSON.stringify(allPurchases))
        saveLocallyAndQueue(updatedPurchase, "update")
        return updatedPurchase
      }
    } catch (err: any) {
      console.error("Failed to update purchase:", err)

      if (!(err.response?.status === 422 && err.response?.data?.errors)) {
        error(t("toast.failedUpdate"))
      }

      throw err
    } finally {
      loading.value = false
    }
  }

  const deletePurchase = async (id: string): Promise<void> => {
    if (!canDelete.value) {
      error(t("permission.deletePurchases"))
      throw new Error("Permission denied")
    }

    loading.value = true
    try {
      if (navigator.onLine) {
        try {
          await axios.delete(`/api/purchases/${id}`)
          await initializePurchases(paginationMeta.value?.current_page || 1, filters.value.search)
          success(t("toast.purchaseDeleted"))
        } catch (apiError) {
          console.warn("API delete failed, marking for deletion:", apiError)
          queueForDeletion(id)
          removeFromLocalCache(id)
          success("Purchase marked for deletion (will sync when online)")
        }
      } else {
        queueForDeletion(id)
        removeFromLocalCache(id)
        success("Purchase marked for deletion (will sync when online)")
      }
    } catch (err) {
      console.error("Failed to delete purchase:", err)
      error(t("toast.failedDelete"))
      throw err
    } finally {
      loading.value = false
    }
  }

  const deleteSelectedPurchases = async (): Promise<void> => {
    if (!canDelete.value) {
      error(t("permission.deletePurchases"))
      throw new Error("Permission denied")
    }

    if (selectedPurchases.value.length === 0) {
      error("No purchases selected")
      return
    }

    loading.value = true
    try {
      if (navigator.onLine) {
        try {
          await axios.post("/api/purchases/bulk-delete", {
            ids: selectedPurchases.value,
          })
          await initializePurchases(paginationMeta.value?.current_page || 1, filters.value.search)
          success(t("toast.purchasesDeleted"))
        } catch (apiError) {
          console.warn("API bulk delete failed, marking for deletion:", apiError)
          selectedPurchases.value.forEach((id) => {
            queueForDeletion(id)
            removeFromLocalCache(id)
          })
          success(`${selectedPurchases.value.length} purchases marked for deletion (will sync when online)`)
        }
      } else {
        selectedPurchases.value.forEach((id) => {
          queueForDeletion(id)
          removeFromLocalCache(id)
        })
        success(`${selectedPurchases.value.length} purchases marked for deletion (will sync when online)`)
      }

      selectedPurchases.value = []
    } catch (err) {
      console.error("Failed to delete selected purchases:", err)
      error(t("toast.failedDelete"))
      throw err
    } finally {
      loading.value = false
    }
  }

  const removeFromLocalCache = (id: string) => {
    try {
      const allPurchases = getAllOfflinePurchases()
      const filteredPurchases = allPurchases.filter((purchase) => purchase.id !== id)
      localStorage.setItem("allPurchases", JSON.stringify(filteredPurchases))

      purchases.value = purchases.value.filter((purchase) => purchase.id !== id)

      const cachedPurchases = localStorage.getItem("purchases")
      if (cachedPurchases) {
        const parsed = JSON.parse(cachedPurchases)
        if (Array.isArray(parsed)) {
          const filtered = parsed.filter((purchase) => purchase.id !== id)
          localStorage.setItem("purchases", JSON.stringify(filtered))
        }
      }
    } catch (error) {
      console.error("Failed to remove from local cache:", error)
    }
  }

  const saveLocallyAndQueue = (purchase: Purchase, action: "create" | "update") => {
    try {
      const allPurchases = getAllOfflinePurchases()

      if (action === "create") {
        allPurchases.unshift(purchase)
        purchases.value.unshift(purchase)
      } else {
        const index = allPurchases.findIndex((p) => p.id === purchase.id)
        if (index !== -1) {
          allPurchases[index] = purchase
        }
        const currentIndex = purchases.value.findIndex((p) => p.id === purchase.id)
        if (currentIndex !== -1) {
          purchases.value[currentIndex] = purchase
        }
      }

      localStorage.setItem("allPurchases", JSON.stringify(allPurchases))
      localStorage.setItem("purchases", JSON.stringify(purchases.value))

      const syncQueue = JSON.parse(localStorage.getItem("purchaseSyncQueue") || "[]")
      const existingIndex = syncQueue.findIndex(
        (item: any) => item.purchase.id === purchase.id && item.action === action,
      )

      const queueItem = {
        purchase,
        action,
        timestamp: Date.now(),
        id: `${purchase.id}_${action}_${Date.now()}`,
      }

      if (existingIndex !== -1) {
        syncQueue[existingIndex] = queueItem
      } else {
        syncQueue.push(queueItem)
      }

      localStorage.setItem("purchaseSyncQueue", JSON.stringify(syncQueue))

      success(`Purchase ${action}d locally (will sync when online)`)
    } catch (error) {
      console.error("Failed to save locally and queue:", error)
    }
  }

  const queueForDeletion = (id: string) => {
    try {
      const deleteQueue = JSON.parse(localStorage.getItem("purchaseDeleteQueue") || "[]")

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

      localStorage.setItem("purchaseDeleteQueue", JSON.stringify(deleteQueue))
    } catch (error) {
      console.error("Failed to queue for deletion:", error)
    }
  }

  const isPendingSync = (purchaseId: string): boolean => {
    const syncQueue = JSON.parse(localStorage.getItem("purchaseSyncQueue") || "[]")
    const deleteQueue = JSON.parse(localStorage.getItem("purchaseDeleteQueue") || "[]")

    return (
      syncQueue.some((item: any) => item.purchase.id === purchaseId) ||
      deleteQueue.some((item: any) => item.id === purchaseId)
    )
  }

  const syncPendingChanges = async () => {
    if (!navigator.onLine || syncInProgress.value) return

    syncInProgress.value = true
    let syncedCount = 0
    const failedSyncs: any[] = []

    try {
      const syncQueue = JSON.parse(localStorage.getItem("purchaseSyncQueue") || "[]")
      const successfulSyncs: any[] = []

      for (const item of syncQueue) {
        try {
          if (item.action === "create") {
            if (item.purchase.id.startsWith("temp_")) {
              const response = await axios.post("/api/purchases", {
                supplier_id: item.purchase.supplier_id,
                purchase_number: item.purchase.purchase_number,
                purchase_date: item.purchase.purchase_date,
                total_amount: item.purchase.total_amount,
                status: item.purchase.status,
                notes: item.purchase.notes,
              })

              const serverPurchase = response.data.data || response.data
              const allPurchases = getAllOfflinePurchases()
              const index = allPurchases.findIndex((p) => p.id === item.purchase.id)
              if (index !== -1) {
                allPurchases[index] = { ...allPurchases[index], id: serverPurchase.id }
                localStorage.setItem("allPurchases", JSON.stringify(allPurchases))
              }
            }
          } else if (item.action === "update") {
            if (!item.purchase.id.startsWith("temp_")) {
              await axios.put(`/api/purchases/${item.purchase.id}`, {
                supplier_id: item.purchase.supplier_id,
                purchase_number: item.purchase.purchase_number,
                purchase_date: item.purchase.purchase_date,
                total_amount: item.purchase.total_amount,
                status: item.purchase.status,
                notes: item.purchase.notes,
              })
            }
          }
          successfulSyncs.push(item)
          syncedCount++
        } catch (syncError: any) {
          console.error("Failed to sync purchase:", syncError)

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
                synced.id === item.id || (synced.purchase.id === item.purchase.id && synced.action === item.action),
            ),
        )
        localStorage.setItem("purchaseSyncQueue", JSON.stringify(remainingQueue))
      }

      const deleteQueue = JSON.parse(localStorage.getItem("purchaseDeleteQueue") || "[]")
      const successfulDeletes: any[] = []

      for (const item of deleteQueue) {
        try {
          if (!item.id.startsWith("temp_")) {
            await axios.delete(`/api/purchases/${item.id}`)
          }
          successfulDeletes.push(item)
          syncedCount++
        } catch (syncError: any) {
          console.error("Failed to sync purchase deletion:", syncError)

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
        localStorage.setItem("purchaseDeleteQueue", JSON.stringify(remainingDeletes))
      }

      if (failedSyncs.length > 0) {
        localStorage.setItem("purchaseSyncFailures", JSON.stringify(failedSyncs))
      } else {
        localStorage.setItem("purchaseSyncFailures", JSON.stringify([]))
      }

      syncStatusTrigger.value++

      const isAutoSync = arguments.length === 0 || arguments[0] === true

      if (syncedCount > 0 && !isAutoSync) {
        await initializePurchases()
        success(t("toast.syncCompleted"))
      } else if (syncedCount > 0 && isAutoSync) {
        await initializePurchases()
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
    const failures = JSON.parse(localStorage.getItem("purchaseSyncFailures") || "[]")
    if (failures.length === 0) {
      info("No sync failures to retry")
      return
    }

    const syncQueue = JSON.parse(localStorage.getItem("purchaseSyncQueue") || "[]")
    const deleteQueue = JSON.parse(localStorage.getItem("purchaseDeleteQueue") || "[]")

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
          (item: any) => item.purchase.id === failure.purchase.id && item.action === failure.action,
        )
        if (!exists) {
          syncQueue.push({
            purchase: failure.purchase,
            action: failure.action,
            timestamp: Date.now(),
            id: `${failure.purchase.id}_${failure.action}_retry_${Date.now()}`,
          })
          retryCount++
        }
      }
    })

    localStorage.setItem("purchaseSyncQueue", JSON.stringify(syncQueue))
    localStorage.setItem("purchaseDeleteQueue", JSON.stringify(deleteQueue))
    localStorage.setItem("purchaseSyncFailures", JSON.stringify([]))

    if (retryCount > 0) {
      info(`Retrying ${retryCount} failed sync operations...`)
    } else {
      warning("All failed operations are already queued for retry")
    }

    await syncPendingChanges()
  }

  const clearSyncFailures = () => {
    localStorage.setItem("purchaseSyncFailures", JSON.stringify([]))
    success("Sync errors cleared")
  }

  const clearAllSyncData = () => {
    localStorage.setItem("purchaseSyncQueue", JSON.stringify([]))
    localStorage.setItem("purchaseDeleteQueue", JSON.stringify([]))
    localStorage.setItem("purchaseSyncFailures", JSON.stringify([]))

    syncInProgress.value = false
    selectedPurchases.value = []
    syncStatusTrigger.value++

    purchases.value = purchases.value.map((purchase) => ({
      ...purchase,
      _pendingSync: false,
    }))

    success("All sync data cleared")

    setTimeout(() => {
      syncStatusTrigger.value++
      purchases.value = [...purchases.value]
    }, 100)
  }

  const setFilters = async (newFilters: Partial<PurchaseFilters>) => {
    filters.value = { ...filters.value, ...newFilters }

    if (searchTimeout) {
      clearTimeout(searchTimeout)
    }

    searchTimeout = setTimeout(async () => {
      await initializePurchases(1, filters.value.search)
    }, 500)
  }

  const clearFilters = async () => {
    filters.value = {
      search: "",
    }
    await initializePurchases(1, "")
  }

  const downloadTemplate = () => {
    const csvContent =
      "Supplier ID,Purchase Number,Purchase Date,Total Amount,Status,Notes\nsupplier_1,PO-001,2024-01-15,1000000,pending,Sample purchase"
    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "purchases_template.csv"
    a.click()
    window.URL.revokeObjectURL(url)
    success(t("toast.templateDownloaded"))
  }

  const exportPurchases = async (exportAll = false) => {
    try {
      const params = new URLSearchParams()

      if (!exportAll && filters.value.search) {
        params.append("search", filters.value.search)
      }

      const response = await axios.post(`/api/purchases/export?${params.toString()}`)

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
      await initializePurchases(page, filters.value.search)
    }
  }

  const updateSyncStatus = () => {
    syncStatusTrigger.value++
  }

  return {
    purchases,
    loading,
    filters,
    filteredPurchases,
    paginationMeta,
    paginationLinks,
    shouldShowPagination,
    selectedPurchases,
    canView,
    canCreate,
    canEdit,
    canDelete,
    syncFailures,
    pendingSyncCount,
    hasSyncIssues,
    syncStatusTrigger,
    initializePurchases,
    addPurchase,
    updatePurchase,
    deletePurchase,
    deleteSelectedPurchases,
    setFilters,
    clearFilters,
    downloadTemplate,
    exportPurchases,
    syncPendingChanges,
    retrySyncFailures,
    clearSyncFailures,
    clearAllSyncData,
    goToPage,
    updateSyncStatus,
    getSyncAction,
  }
}
