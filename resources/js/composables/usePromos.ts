"use client"

import { ref, computed } from "vue"
import axios from "axios"
import type { Promo, PromoFormData, PromoFilters, PaginationMeta, PaginationLinks } from "@/types/Promo"
import { useToast } from "@/composables/useToast"
import { useI18n } from "@/composables/useI18n"
import { useAuth } from "@/composables/useAuth"

const promos = ref<Promo[]>([])
const loading = ref(false)
const filters = ref<PromoFilters>({
  search: "",
})
const paginationMeta = ref<PaginationMeta | null>(null)
const paginationLinks = ref<PaginationLinks | null>(null)

// Track sync status
const syncInProgress = ref(false)
const selectedPromos = ref<string[]>([])
const syncStatusTrigger = ref(0)

// Search debounce
let searchTimeout: NodeJS.Timeout | null = null

// Mock data for offline fallback with pagination
const mockPromos: Promo[] = Array.from({ length: 50 }, (_, i) => ({
  id: (i + 1).toString(),
  title: `Promotion ${i + 1}`,
  description: `Description for promotion ${i + 1}`,
  type: i % 3 === 0 ? "discount" : i % 3 === 1 ? "buy_get" : "bundle",
  discount_type: i % 2 === 0 ? "percentage" : "fixed",
  discount_value: i % 2 === 0 ? 10 + (i % 5) * 5 : 50000 + (i % 10) * 10000,
  min_purchase: 100000 + (i % 5) * 50000,
  max_discount: i % 2 === 0 ? 100000 : undefined,
  buy_quantity: i % 3 === 1 ? 2 + (i % 3) : undefined,
  get_quantity: i % 3 === 1 ? 1 : undefined,
  applicable_products: [],
  start_date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
  end_date: new Date(Date.now() + (30 - i) * 24 * 60 * 60 * 1000).toISOString(),
  is_active: i % 3 !== 0,
  priority: 1 + (i % 10),
  created_at: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
  updated_at: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
}))

export function usePromos() {
  const { success, error, info, warning } = useToast()
  const { t } = useI18n()
  const { hasPermission } = useAuth()

  // Permissions
  const canView = computed(() => hasPermission("view promos"))
  const canCreate = computed(() => hasPermission("create promos"))
  const canEdit = computed(() => hasPermission("edit promos"))
  const canDelete = computed(() => hasPermission("delete promos"))

  // Sync details
  const syncFailures = computed(() => {
    syncStatusTrigger.value
    const failures = JSON.parse(localStorage.getItem("promoSyncFailures") || "[]")
    const validFailures = failures.filter((failure: any) => {
      const failureTime = failure.timestamp || Date.now()
      const hoursDiff = (Date.now() - failureTime) / (1000 * 60 * 60)
      return hoursDiff < 24
    })

    if (validFailures.length !== failures.length) {
      localStorage.setItem("promoSyncFailures", JSON.stringify(validFailures))
    }

    return validFailures
  })

  const pendingSyncCount = computed(() => {
    syncStatusTrigger.value
    const syncQueue = JSON.parse(localStorage.getItem("promoSyncQueue") || "[]")
    const deleteQueue = JSON.parse(localStorage.getItem("promoDeleteQueue") || "[]")

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
      localStorage.setItem("promoSyncQueue", JSON.stringify(validSyncQueue))
    }
    if (validDeleteQueue.length !== deleteQueue.length) {
      localStorage.setItem("promoDeleteQueue", JSON.stringify(validDeleteQueue))
    }

    return validSyncQueue.length + validDeleteQueue.length
  })

  const hasSyncIssues = computed(() => {
    return syncFailures.value.length > 0 || pendingSyncCount.value > 0
  })

  const getAllOfflinePromos = (): Promo[] => {
    try {
      const allCachedPromos = new Map<string, Promo>()

      const allPromosCache = localStorage.getItem("allPromos")
      if (allPromosCache) {
        const parsed = JSON.parse(allPromosCache)
        if (Array.isArray(parsed)) {
          parsed.forEach((promo) => {
            allCachedPromos.set(promo.id, promo)
          })
        }
      }

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && key.startsWith("promos_page_")) {
          try {
            const pageCache = JSON.parse(localStorage.getItem(key) || "{}")
            if (pageCache.promos && Array.isArray(pageCache.promos)) {
              pageCache.promos.forEach((promo: Promo) => {
                allCachedPromos.set(promo.id, promo)
              })
            }
          } catch (e) {
            console.warn(`Failed to parse cache for ${key}`, e)
          }
        }
      }

      const mergedPromos = Array.from(allCachedPromos.values())
      mergedPromos.sort((a, b) => {
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      })

      if (mergedPromos.length > 0) {
        return mergedPromos
      }

      return [...mockPromos]
    } catch (error) {
      console.error("Failed to get offline promos:", error)
      return [...mockPromos]
    }
  }

  const initializePromos = async (page = 1, search = "") => {
    if (!canView.value) {
      error(t("permission.viewPromos"))
      return
    }

    loading.value = true
    try {
      promos.value = []

      if (navigator.onLine) {
        try {
          const params = new URLSearchParams({
            page: page.toString(),
          })

          if (search.trim()) {
            params.append("search", search.trim())
          }

          const response = await axios.get(`/api/promos?${params.toString()}`)
          const responseData = response.data

          if (responseData && responseData.data && Array.isArray(responseData.data)) {
            promos.value = responseData.data
            paginationMeta.value = responseData.meta
            paginationLinks.value = responseData.links

            const cacheKey = `promos_page_${page}_search_${search}`
            localStorage.setItem(
              cacheKey,
              JSON.stringify({
                promos: promos.value,
                meta: paginationMeta.value,
                links: paginationLinks.value,
                timestamp: Date.now(),
              }),
            )
            localStorage.setItem("promos_last_cache_key", cacheKey)

            const allPromosCache = localStorage.getItem("allPromos")
            const lastFullCacheTime = localStorage.getItem("allPromos_last_cache_time")
            const needsFullRefresh =
              !allPromosCache ||
              !lastFullCacheTime ||
              Date.now() - Number.parseInt(lastFullCacheTime) > 24 * 60 * 60 * 1000

            if (page === 1 && !search.trim() && needsFullRefresh) {
              setTimeout(async () => {
                try {
                  const allDataResponse = await axios.get("/api/promos?per_page=1000")
                  if (allDataResponse.data && allDataResponse.data.data) {
                    localStorage.setItem("allPromos", JSON.stringify(allDataResponse.data.data))
                    localStorage.setItem("allPromos_last_cache_time", Date.now().toString())
                  }
                } catch (allDataError) {
                  console.warn("Failed to cache all promos:", allDataError)
                }
              }, 1000)
            }
          } else if (Array.isArray(response.data)) {
            promos.value = response.data
            paginationMeta.value = null
            paginationLinks.value = null
          } else {
            console.warn("Unexpected API response format:", responseData)
            promos.value = []
          }
        } catch (apiError) {
          console.warn("API call failed, using cached data:", apiError)
          loadFromCache(page, search)
        }
      } else {
        loadFromCache(page, search)
      }
    } catch (err) {
      console.error("Failed to load promos:", err)
      error(t("toast.failedLoad"))
      promos.value = []
    } finally {
      loading.value = false
    }
  }

  const loadFromCache = (page = 1, search = "") => {
    try {
      const cacheKey = `promos_page_${page}_search_${search}`
      const pageCache = localStorage.getItem(cacheKey)

      if (pageCache) {
        try {
          const cached = JSON.parse(pageCache)
          const cacheAge = Date.now() - (cached.timestamp || 0)

          if (cacheAge < 60 * 60 * 1000) {
            promos.value = cached.promos || []
            paginationMeta.value = cached.meta || null
            paginationLinks.value = cached.links || null
            return
          }
        } catch (e) {
          console.warn("Failed to parse page cache:", e)
        }
      }

      const allPromos = getAllOfflinePromos()
      const perPage = 10
      let filteredPromos = allPromos

      if (search.trim()) {
        const searchTerm = search.toLowerCase()
        filteredPromos = allPromos.filter(
          (promo) =>
            promo.title.toLowerCase().includes(searchTerm) || promo.description.toLowerCase().includes(searchTerm),
        )
      }

      const total = filteredPromos.length
      const lastPage = Math.ceil(total / perPage)
      const from = total > 0 ? (page - 1) * perPage + 1 : 0
      const to = Math.min(page * perPage, total)

      const startIndex = (page - 1) * perPage
      const endIndex = startIndex + perPage
      promos.value = filteredPromos.slice(startIndex, endIndex)

      paginationMeta.value = {
        current_page: page,
        from: promos.value.length > 0 ? from : 0,
        last_page: lastPage,
        per_page: perPage,
        to: promos.value.length > 0 ? to : 0,
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
      promos.value = [...mockPromos.slice(0, 10)]

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

  const getSyncAction = (promoId: string): "create" | "update" | "delete" | null => {
    const syncQueue = JSON.parse(localStorage.getItem("promoSyncQueue") || "[]")
    const deleteQueue = JSON.parse(localStorage.getItem("promoDeleteQueue") || "[]")

    const deleteItem = deleteQueue.find((item: any) => item.id === promoId)
    if (deleteItem) return "delete"

    const syncItem = syncQueue.find((item: any) => item.promo.id === promoId)
    if (syncItem) {
      return syncItem.action === "create" ? "create" : "update"
    }

    return null
  }

  const filteredPromos = computed(() => {
    syncStatusTrigger.value

    if (!Array.isArray(promos.value)) {
      console.warn("promos.value is not an array:", promos.value)
      return []
    }

    return promos.value.map((promo) => ({
      ...promo,
      _pendingSync: isPendingSync(promo.id),
      _syncAction: getSyncAction(promo.id),
    }))
  })

  const shouldShowPagination = computed(() => {
    return paginationMeta.value && paginationMeta.value.total > 0 && paginationMeta.value.last_page > 1
  })

  const addPromo = async (promoData: PromoFormData): Promise<Promo> => {
    if (!canCreate.value) {
      error(t("permission.createPromos"))
      throw new Error("Permission denied")
    }

    loading.value = true
    try {
      if (navigator.onLine) {
        try {
          const response = await axios.post("/api/promos", promoData)
          const savedPromo = response.data.data || response.data

          await initializePromos(paginationMeta.value?.current_page || 1, filters.value.search)
          success(t("toast.promoCreated"))
          return savedPromo
        } catch (apiError: any) {
          console.error("API save failed:", apiError)

          if (apiError.response?.status === 422 && apiError.response?.data?.errors) {
            throw apiError
          }

          const newPromo: Promo = {
            id: `temp_${Date.now()}`,
            ...promoData,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }

          saveLocallyAndQueue(newPromo, "create")
          return newPromo
        }
      } else {
        const newPromo: Promo = {
          id: `temp_${Date.now()}`,
          ...promoData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }

        saveLocallyAndQueue(newPromo, "create")
        return newPromo
      }
    } catch (err: any) {
      console.error("Failed to add promo:", err)

      if (!(err.response?.status === 422 && err.response?.data?.errors)) {
        error(t("toast.failedCreate"))
      }

      throw err
    } finally {
      loading.value = false
    }
  }

  const updatePromo = async (id: string, promoData: PromoFormData): Promise<Promo> => {
    if (!canEdit.value) {
      error(t("permission.editPromos"))
      throw new Error("Permission denied")
    }

    loading.value = true
    try {
      const allPromos = getAllOfflinePromos()
      const index = allPromos.findIndex((promo) => promo.id === id)
      if (index === -1) {
        throw new Error("Promo not found")
      }

      const updatedPromo: Promo = {
        ...allPromos[index],
        ...promoData,
        updated_at: new Date().toISOString(),
      }

      if (navigator.onLine) {
        try {
          const response = await axios.put(`/api/promos/${id}`, promoData)
          const savedPromo = response.data.data || response.data

          await initializePromos(paginationMeta.value?.current_page || 1, filters.value.search)
          success(t("toast.promoUpdated"))
          return savedPromo
        } catch (apiError: any) {
          console.error("API update failed:", apiError)

          if (apiError.response?.status === 422 && apiError.response?.data?.errors) {
            throw apiError
          }

          allPromos[index] = updatedPromo
          localStorage.setItem("allPromos", JSON.stringify(allPromos))
          saveLocallyAndQueue(updatedPromo, "update")
          return updatedPromo
        }
      } else {
        allPromos[index] = updatedPromo
        localStorage.setItem("allPromos", JSON.stringify(allPromos))
        saveLocallyAndQueue(updatedPromo, "update")
        return updatedPromo
      }
    } catch (err: any) {
      console.error("Failed to update promo:", err)

      if (!(err.response?.status === 422 && err.response?.data?.errors)) {
        error(t("toast.failedUpdate"))
      }

      throw err
    } finally {
      loading.value = false
    }
  }

  const deletePromo = async (id: string): Promise<void> => {
    if (!canDelete.value) {
      error(t("permission.deletePromos"))
      throw new Error("Permission denied")
    }

    loading.value = true
    try {
      if (navigator.onLine) {
        try {
          await axios.delete(`/api/promos/${id}`)
          await initializePromos(paginationMeta.value?.current_page || 1, filters.value.search)
          success(t("toast.promoDeleted"))
        } catch (apiError) {
          console.warn("API delete failed, marking for deletion:", apiError)
          queueForDeletion(id)
          removeFromLocalCache(id)
          success("Promo marked for deletion (will sync when online)")
        }
      } else {
        queueForDeletion(id)
        removeFromLocalCache(id)
        success("Promo marked for deletion (will sync when online)")
      }
    } catch (err) {
      console.error("Failed to delete promo:", err)
      error(t("toast.failedDelete"))
      throw err
    } finally {
      loading.value = false
    }
  }

  const deleteSelectedPromos = async (): Promise<void> => {
    if (!canDelete.value) {
      error(t("permission.deletePromos"))
      throw new Error("Permission denied")
    }

    if (selectedPromos.value.length === 0) {
      error("No promos selected")
      return
    }

    loading.value = true
    try {
      if (navigator.onLine) {
        try {
          await axios.post("/api/promos/bulk-delete", {
            ids: selectedPromos.value,
          })
          await initializePromos(paginationMeta.value?.current_page || 1, filters.value.search)
          success(t("toast.promosDeleted"))
        } catch (apiError) {
          console.warn("API bulk delete failed, marking for deletion:", apiError)
          selectedPromos.value.forEach((id) => {
            queueForDeletion(id)
            removeFromLocalCache(id)
          })
          success(`${selectedPromos.value.length} promos marked for deletion (will sync when online)`)
        }
      } else {
        selectedPromos.value.forEach((id) => {
          queueForDeletion(id)
          removeFromLocalCache(id)
        })
        success(`${selectedPromos.value.length} promos marked for deletion (will sync when online)`)
      }

      selectedPromos.value = []
    } catch (err) {
      console.error("Failed to delete selected promos:", err)
      error(t("toast.failedDelete"))
      throw err
    } finally {
      loading.value = false
    }
  }

  const removeFromLocalCache = (id: string) => {
    try {
      const allPromos = getAllOfflinePromos()
      const filteredPromos = allPromos.filter((promo) => promo.id !== id)
      localStorage.setItem("allPromos", JSON.stringify(filteredPromos))

      promos.value = promos.value.filter((promo) => promo.id !== id)

      const cachedPromos = localStorage.getItem("promos")
      if (cachedPromos) {
        const parsed = JSON.parse(cachedPromos)
        if (Array.isArray(parsed)) {
          const filtered = parsed.filter((promo) => promo.id !== id)
          localStorage.setItem("promos", JSON.stringify(filtered))
        }
      }
    } catch (error) {
      console.error("Failed to remove from local cache:", error)
    }
  }

  const saveLocallyAndQueue = (promo: Promo, action: "create" | "update") => {
    try {
      const allPromos = getAllOfflinePromos()

      if (action === "create") {
        allPromos.unshift(promo)
        promos.value.unshift(promo)
      } else {
        const index = allPromos.findIndex((p) => p.id === promo.id)
        if (index !== -1) {
          allPromos[index] = promo
        }
        const currentIndex = promos.value.findIndex((p) => p.id === promo.id)
        if (currentIndex !== -1) {
          promos.value[currentIndex] = promo
        }
      }

      localStorage.setItem("allPromos", JSON.stringify(allPromos))
      localStorage.setItem("promos", JSON.stringify(promos.value))

      const syncQueue = JSON.parse(localStorage.getItem("promoSyncQueue") || "[]")
      const existingIndex = syncQueue.findIndex((item: any) => item.promo.id === promo.id && item.action === action)

      const queueItem = {
        promo,
        action,
        timestamp: Date.now(),
        id: `${promo.id}_${action}_${Date.now()}`,
      }

      if (existingIndex !== -1) {
        syncQueue[existingIndex] = queueItem
      } else {
        syncQueue.push(queueItem)
      }

      localStorage.setItem("promoSyncQueue", JSON.stringify(syncQueue))

      success(`Promo ${action}d locally (will sync when online)`)
    } catch (error) {
      console.error("Failed to save locally and queue:", error)
    }
  }

  const queueForDeletion = (id: string) => {
    try {
      const deleteQueue = JSON.parse(localStorage.getItem("promoDeleteQueue") || "[]")

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

      localStorage.setItem("promoDeleteQueue", JSON.stringify(deleteQueue))
    } catch (error) {
      console.error("Failed to queue for deletion:", error)
    }
  }

  const isPendingSync = (promoId: string): boolean => {
    const syncQueue = JSON.parse(localStorage.getItem("promoSyncQueue") || "[]")
    const deleteQueue = JSON.parse(localStorage.getItem("promoDeleteQueue") || "[]")

    return (
      syncQueue.some((item: any) => item.promo.id === promoId) || deleteQueue.some((item: any) => item.id === promoId)
    )
  }

  const syncPendingChanges = async () => {
    if (!navigator.onLine || syncInProgress.value) return

    syncInProgress.value = true
    let syncedCount = 0
    const failedSyncs: any[] = []

    try {
      const syncQueue = JSON.parse(localStorage.getItem("promoSyncQueue") || "[]")
      const successfulSyncs: any[] = []

      for (const item of syncQueue) {
        try {
          if (item.action === "create") {
            if (item.promo.id.startsWith("temp_")) {
              const response = await axios.post("/api/promos", {
                title: item.promo.title,
                description: item.promo.description,
                type: item.promo.type,
                discount_type: item.promo.discount_type,
                discount_value: item.promo.discount_value,
                min_purchase: item.promo.min_purchase,
                max_discount: item.promo.max_discount,
                buy_quantity: item.promo.buy_quantity,
                get_quantity: item.promo.get_quantity,
                applicable_products: item.promo.applicable_products,
                start_date: item.promo.start_date,
                end_date: item.promo.end_date,
                is_active: item.promo.is_active,
                priority: item.promo.priority,
              })

              const serverPromo = response.data.data || response.data
              const allPromos = getAllOfflinePromos()
              const index = allPromos.findIndex((p) => p.id === item.promo.id)
              if (index !== -1) {
                allPromos[index] = { ...allPromos[index], id: serverPromo.id }
                localStorage.setItem("allPromos", JSON.stringify(allPromos))
              }
            }
          } else if (item.action === "update") {
            if (!item.promo.id.startsWith("temp_")) {
              await axios.put(`/api/promos/${item.promo.id}`, {
                title: item.promo.title,
                description: item.promo.description,
                type: item.promo.type,
                discount_type: item.promo.discount_type,
                discount_value: item.promo.discount_value,
                min_purchase: item.promo.min_purchase,
                max_discount: item.promo.max_discount,
                buy_quantity: item.promo.buy_quantity,
                get_quantity: item.promo.get_quantity,
                applicable_products: item.promo.applicable_products,
                start_date: item.promo.start_date,
                end_date: item.promo.end_date,
                is_active: item.promo.is_active,
                priority: item.promo.priority,
              })
            }
          }
          successfulSyncs.push(item)
          syncedCount++
        } catch (syncError: any) {
          console.error("Failed to sync promo:", syncError)

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
              (synced) => synced.id === item.id || (synced.promo.id === item.promo.id && synced.action === item.action),
            ),
        )
        localStorage.setItem("promoSyncQueue", JSON.stringify(remainingQueue))
      }

      const deleteQueue = JSON.parse(localStorage.getItem("promoDeleteQueue") || "[]")
      const successfulDeletes: any[] = []

      for (const item of deleteQueue) {
        try {
          if (!item.id.startsWith("temp_")) {
            await axios.delete(`/api/promos/${item.id}`)
          }
          successfulDeletes.push(item)
          syncedCount++
        } catch (syncError: any) {
          console.error("Failed to sync promo deletion:", syncError)

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
        localStorage.setItem("promoDeleteQueue", JSON.stringify(remainingDeletes))
      }

      if (failedSyncs.length > 0) {
        localStorage.setItem("promoSyncFailures", JSON.stringify(failedSyncs))
      } else {
        localStorage.setItem("promoSyncFailures", JSON.stringify([]))
      }

      syncStatusTrigger.value++

      const isAutoSync = arguments.length === 0 || arguments[0] === true

      if (syncedCount > 0 && !isAutoSync) {
        await initializePromos()
        success(t("toast.syncCompleted"))
      } else if (syncedCount > 0 && isAutoSync) {
        await initializePromos()
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
    const failures = JSON.parse(localStorage.getItem("promoSyncFailures") || "[]")
    if (failures.length === 0) {
      info("No sync failures to retry")
      return
    }

    const syncQueue = JSON.parse(localStorage.getItem("promoSyncQueue") || "[]")
    const deleteQueue = JSON.parse(localStorage.getItem("promoDeleteQueue") || "[]")

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
          (item: any) => item.promo.id === failure.promo.id && item.action === failure.action,
        )
        if (!exists) {
          syncQueue.push({
            promo: failure.promo,
            action: failure.action,
            timestamp: Date.now(),
            id: `${failure.promo.id}_${failure.action}_retry_${Date.now()}`,
          })
          retryCount++
        }
      }
    })

    localStorage.setItem("promoSyncQueue", JSON.stringify(syncQueue))
    localStorage.setItem("promoDeleteQueue", JSON.stringify(deleteQueue))
    localStorage.setItem("promoSyncFailures", JSON.stringify([]))

    if (retryCount > 0) {
      info(`Retrying ${retryCount} failed sync operations...`)
    } else {
      warning("All failed operations are already queued for retry")
    }

    await syncPendingChanges()
  }

  const clearSyncFailures = () => {
    localStorage.setItem("promoSyncFailures", JSON.stringify([]))
    success("Sync errors cleared")
  }

  const clearAllSyncData = () => {
    localStorage.setItem("promoSyncQueue", JSON.stringify([]))
    localStorage.setItem("promoDeleteQueue", JSON.stringify([]))
    localStorage.setItem("promoSyncFailures", JSON.stringify([]))

    syncInProgress.value = false
    selectedPromos.value = []
    syncStatusTrigger.value++

    promos.value = promos.value.map((promo) => ({
      ...promo,
      _pendingSync: false,
    }))

    success("All sync data cleared")

    setTimeout(() => {
      syncStatusTrigger.value++
      promos.value = [...promos.value]
    }, 100)
  }

  const setFilters = async (newFilters: Partial<PromoFilters>) => {
    filters.value = { ...filters.value, ...newFilters }

    if (searchTimeout) {
      clearTimeout(searchTimeout)
    }

    searchTimeout = setTimeout(async () => {
      await initializePromos(1, filters.value.search)
    }, 500)
  }

  const clearFilters = async () => {
    filters.value = {
      search: "",
    }
    await initializePromos(1, "")
  }

  const downloadTemplate = () => {
    const csvContent =
      "Title,Description,Type,Discount Type,Discount Value,Min Purchase,Max Discount,Buy Quantity,Get Quantity,Start Date,End Date,Priority,Is Active\nFlash Sale,Flash sale discount,discount,percentage,20,100000,50000,,,2024-01-01,2024-12-31,1,true\nBuy 2 Get 1,Buy 2 get 1 free,buy_get,,,,,2,1,2024-01-01,2024-12-31,2,true"
    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "promos_template.csv"
    a.click()
    window.URL.revokeObjectURL(url)
    success(t("toast.templateDownloaded"))
  }

  const exportPromos = async (exportAll = false) => {
    try {
      const params = new URLSearchParams()

      if (!exportAll && filters.value.search) {
        params.append("search", filters.value.search)
      }

      const response = await axios.post(`/api/promos/export?${params.toString()}`)

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
      await initializePromos(page, filters.value.search)
    }
  }

  const updateSyncStatus = () => {
    syncStatusTrigger.value++
  }

  return {
    promos,
    loading,
    filters,
    filteredPromos,
    paginationMeta,
    paginationLinks,
    shouldShowPagination,
    selectedPromos,
    canView,
    canCreate,
    canEdit,
    canDelete,
    syncFailures,
    pendingSyncCount,
    hasSyncIssues,
    syncStatusTrigger,
    initializePromos,
    addPromo,
    updatePromo,
    deletePromo,
    deleteSelectedPromos,
    setFilters,
    clearFilters,
    downloadTemplate,
    exportPromos,
    syncPendingChanges,
    retrySyncFailures,
    clearSyncFailures,
    clearAllSyncData,
    goToPage,
    updateSyncStatus,
    getSyncAction,
  }
}
