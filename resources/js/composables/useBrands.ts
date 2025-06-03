"use client"

import { ref, computed } from "vue"
import axios from "axios"
import type { Brand, BrandFormData, BrandFilters, PaginationMeta, PaginationLinks } from "@/types/Brand"
import { useToast } from "@/composables/useToast"
import { useI18n } from "@/composables/useI18n"
import { useAuth } from "@/composables/useAuth"

const brands = ref<Brand[]>([])
const loading = ref(false)
const filters = ref<BrandFilters>({
  search: "",
})
const paginationMeta = ref<PaginationMeta | null>(null)
const paginationLinks = ref<PaginationLinks | null>(null)

// Track sync status
const syncInProgress = ref(false)
const selectedBrands = ref<string[]>([])
const syncStatusTrigger = ref(0) // Trigger untuk force reactivity

// Search debounce
let searchTimeout: NodeJS.Timeout | null = null

// Mock data for offline fallback with pagination
const mockBrands: Brand[] = Array.from({ length: 50 }, (_, i) => ({
  id: (i + 1).toString(),
  name: `Brand ${i + 1}`,
  description: `Description for brand ${i + 1}`,
  created_at: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
  updated_at: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
}))

export function useBrands() {
  const { success, error, info, warning } = useToast()
  const { t } = useI18n()
  const { hasPermission } = useAuth()

  // Permissions
  const canView = computed(() => hasPermission("view brands"))
  const canCreate = computed(() => hasPermission("create brands"))
  const canEdit = computed(() => hasPermission("edit brands"))
  const canDelete = computed(() => hasPermission("delete brands"))

  // Sync details
  const syncFailures = computed(() => {
    syncStatusTrigger.value

    const failures = JSON.parse(localStorage.getItem("brandSyncFailures") || "[]")
    const validFailures = failures.filter((failure: any) => {
      const failureTime = failure.timestamp || Date.now()
      const hoursDiff = (Date.now() - failureTime) / (1000 * 60 * 60)
      return hoursDiff < 24
    })

    if (validFailures.length !== failures.length) {
      localStorage.setItem("brandSyncFailures", JSON.stringify(validFailures))
    }

    return validFailures
  })

  const pendingSyncCount = computed(() => {
    syncStatusTrigger.value

    const syncQueue = JSON.parse(localStorage.getItem("brandSyncQueue") || "[]")
    const deleteQueue = JSON.parse(localStorage.getItem("brandDeleteQueue") || "[]")

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
      localStorage.setItem("brandSyncQueue", JSON.stringify(validSyncQueue))
    }
    if (validDeleteQueue.length !== deleteQueue.length) {
      localStorage.setItem("brandDeleteQueue", JSON.stringify(validDeleteQueue))
    }

    return validSyncQueue.length + validDeleteQueue.length
  })

  const hasSyncIssues = computed(() => {
    return syncFailures.value.length > 0 || pendingSyncCount.value > 0
  })

  const getAllOfflineBrands = (): Brand[] => {
    try {
      const allCachedBrands = new Map<string, Brand>()

      const allBrandsCache = localStorage.getItem("allBrands")
      if (allBrandsCache) {
        const parsed = JSON.parse(allBrandsCache)
        if (Array.isArray(parsed)) {
          parsed.forEach((brand) => {
            allCachedBrands.set(brand.id, brand)
          })
        }
      }

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && key.startsWith("brands_page_")) {
          try {
            const pageCache = JSON.parse(localStorage.getItem(key) || "{}")
            if (pageCache.brands && Array.isArray(pageCache.brands)) {
              pageCache.brands.forEach((brand: Brand) => {
                allCachedBrands.set(brand.id, brand)
              })
            }
          } catch (e) {
            console.warn(`Failed to parse cache for ${key}`, e)
          }
        }
      }

      const mergedBrands = Array.from(allCachedBrands.values())

      mergedBrands.sort((a, b) => {
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      })

      if (mergedBrands.length > 0) {
        return mergedBrands
      }

      return [...mockBrands]
    } catch (error) {
      console.error("Failed to get offline brands:", error)
      return [...mockBrands]
    }
  }

  const initializeBrands = async (page = 1, search = "") => {
    if (!canView.value) {
      error(t("permission.viewBrands"))
      return
    }

    loading.value = true
    try {
      brands.value = []

      if (navigator.onLine) {
        try {
          const params = new URLSearchParams({
            page: page.toString(),
          })

          if (search.trim()) {
            params.append("search", search.trim())
          }

          const response = await axios.get(`/api/brands?${params.toString()}`)
          const responseData = response.data

          if (responseData && responseData.data && Array.isArray(responseData.data)) {
            brands.value = responseData.data
            paginationMeta.value = responseData.meta
            paginationLinks.value = responseData.links

            // Cache the current page data
            const cacheKey = `brands_page_${page}_search_${search}`
            localStorage.setItem(
              cacheKey,
              JSON.stringify({
                brands: brands.value,
                meta: paginationMeta.value,
                links: paginationLinks.value,
                timestamp: Date.now(),
              }),
            )
            localStorage.setItem("brands_last_cache_key", cacheKey)

            // Only fetch all data if needed and on first page without search
            const allBrandsCache = localStorage.getItem("allBrands")
            const lastFullCacheTime = localStorage.getItem("allBrands_last_cache_time")
            const needsFullRefresh =
              !allBrandsCache ||
              !lastFullCacheTime ||
              Date.now() - Number.parseInt(lastFullCacheTime) > 24 * 60 * 60 * 1000

            if (page === 1 && !search.trim() && needsFullRefresh) {
              setTimeout(async () => {
                try {
                  const allDataResponse = await axios.get("/api/brands?per_page=1000")
                  if (allDataResponse.data && allDataResponse.data.data) {
                    localStorage.setItem("allBrands", JSON.stringify(allDataResponse.data.data))
                    localStorage.setItem("allBrands_last_cache_time", Date.now().toString())
                  }
                } catch (allDataError) {
                  console.warn("Failed to cache all brands:", allDataError)
                }
              }, 1000)
            }
          } else if (Array.isArray(response.data)) {
            brands.value = response.data
            paginationMeta.value = null
            paginationLinks.value = null
          } else {
            console.warn("Unexpected API response format:", responseData)
            brands.value = []
          }
        } catch (apiError) {
          console.warn("API call failed, using cached data:", apiError)
          loadFromCache(page, search)
        }
      } else {
        loadFromCache(page, search)
      }
    } catch (err) {
      console.error("Failed to load brands:", err)
      error(t("toast.failedLoad"))
      brands.value = []
    } finally {
      loading.value = false
    }
  }

  const loadFromCache = (page = 1, search = "") => {
    try {
      // First try to load from specific page cache
      const cacheKey = `brands_page_${page}_search_${search}`
      const pageCache = localStorage.getItem(cacheKey)

      if (pageCache) {
        try {
          const cached = JSON.parse(pageCache)
          const cacheAge = Date.now() - (cached.timestamp || 0)

          // Use cached data if it's less than 1 hour old
          if (cacheAge < 60 * 60 * 1000) {
            brands.value = cached.brands || []
            paginationMeta.value = cached.meta || null
            paginationLinks.value = cached.links || null
            return
          }
        } catch (e) {
          console.warn("Failed to parse page cache:", e)
        }
      }

      // Fallback to getAllOfflineBrands
      const allBrands = getAllOfflineBrands()

      const perPage = 10
      let filteredBrands = allBrands

      if (search.trim()) {
        const searchTerm = search.toLowerCase()
        filteredBrands = allBrands.filter(
          (brand) =>
            brand.name.toLowerCase().includes(searchTerm) || brand.description.toLowerCase().includes(searchTerm),
        )
      }

      const total = filteredBrands.length
      const lastPage = Math.ceil(total / perPage)
      const from = total > 0 ? (page - 1) * perPage + 1 : 0
      const to = Math.min(page * perPage, total)

      const startIndex = (page - 1) * perPage
      const endIndex = startIndex + perPage
      brands.value = filteredBrands.slice(startIndex, endIndex)

      paginationMeta.value = {
        current_page: page,
        from: brands.value.length > 0 ? from : 0,
        last_page: lastPage,
        per_page: perPage,
        to: brands.value.length > 0 ? to : 0,
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
      brands.value = [...mockBrands.slice(0, 10)]

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

  const getSyncAction = (brandId: string): "create" | "update" | "delete" | null => {
    const syncQueue = JSON.parse(localStorage.getItem("brandSyncQueue") || "[]")
    const deleteQueue = JSON.parse(localStorage.getItem("brandDeleteQueue") || "[]")

    const deleteItem = deleteQueue.find((item: any) => item.id === brandId)
    if (deleteItem) return "delete"

    const syncItem = syncQueue.find((item: any) => item.brand.id === brandId)
    if (syncItem) {
      return syncItem.action === "create" ? "create" : "update"
    }

    return null
  }

  const filteredBrands = computed(() => {
    syncStatusTrigger.value

    if (!Array.isArray(brands.value)) {
      console.warn("brands.value is not an array:", brands.value)
      return []
    }

    return brands.value.map((brand) => ({
      ...brand,
      _pendingSync: isPendingSync(brand.id),
      _syncAction: getSyncAction(brand.id),
    }))
  })

  const shouldShowPagination = computed(() => {
    return paginationMeta.value && paginationMeta.value.total > 0 && paginationMeta.value.last_page > 1
  })

  const addBrand = async (brandData: BrandFormData): Promise<Brand> => {
    if (!canCreate.value) {
      error(t("permission.createBrands"))
      throw new Error("Permission denied")
    }

    loading.value = true
    try {
      if (navigator.onLine) {
        try {
          const response = await axios.post("/api/brands", brandData)
          const savedBrand = response.data.data || response.data

          await initializeBrands(paginationMeta.value?.current_page || 1, filters.value.search)
          success(t("toast.brandCreated"))
          return savedBrand
        } catch (apiError: any) {
          console.error("API save failed:", apiError)

          if (apiError.response?.status === 422 && apiError.response?.data?.errors) {
            throw apiError
          }

          const newBrand: Brand = {
            id: `temp_${Date.now()}`,
            ...brandData,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }

          saveLocallyAndQueue(newBrand, "create")
          return newBrand
        }
      } else {
        const newBrand: Brand = {
          id: `temp_${Date.now()}`,
          ...brandData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }

        saveLocallyAndQueue(newBrand, "create")
        return newBrand
      }
    } catch (err: any) {
      console.error("Failed to add brand:", err)

      if (!(err.response?.status === 422 && err.response?.data?.errors)) {
        error(t("toast.failedCreate"))
      }

      throw err
    } finally {
      loading.value = false
    }
  }

  const updateBrand = async (id: string, brandData: BrandFormData): Promise<Brand> => {
    if (!canEdit.value) {
      error(t("permission.editBrands"))
      throw new Error("Permission denied")
    }

    loading.value = true
    try {
      const allBrands = getAllOfflineBrands()
      const index = allBrands.findIndex((brand) => brand.id === id)
      if (index === -1) {
        throw new Error("Brand not found")
      }

      const updatedBrand: Brand = {
        ...allBrands[index],
        ...brandData,
        updated_at: new Date().toISOString(),
      }

      if (navigator.onLine) {
        try {
          const response = await axios.put(`/api/brands/${id}`, brandData)
          const savedBrand = response.data.data || response.data

          await initializeBrands(paginationMeta.value?.current_page || 1, filters.value.search)
          success(t("toast.brandUpdated"))
          return savedBrand
        } catch (apiError: any) {
          console.error("API update failed:", apiError)

          if (apiError.response?.status === 422 && apiError.response?.data?.errors) {
            throw apiError
          }

          allBrands[index] = updatedBrand
          localStorage.setItem("allBrands", JSON.stringify(allBrands))
          saveLocallyAndQueue(updatedBrand, "update")
          return updatedBrand
        }
      } else {
        allBrands[index] = updatedBrand
        localStorage.setItem("allBrands", JSON.stringify(allBrands))
        saveLocallyAndQueue(updatedBrand, "update")
        return updatedBrand
      }
    } catch (err: any) {
      console.error("Failed to update brand:", err)

      if (!(err.response?.status === 422 && err.response?.data?.errors)) {
        error(t("toast.failedUpdate"))
      }

      throw err
    } finally {
      loading.value = false
    }
  }

  const deleteBrand = async (id: string): Promise<void> => {
    if (!canDelete.value) {
      error(t("permission.deleteBrands"))
      throw new Error("Permission denied")
    }

    loading.value = true
    try {
      if (navigator.onLine) {
        try {
          await axios.delete(`/api/brands/${id}`)
          await initializeBrands(paginationMeta.value?.current_page || 1, filters.value.search)
          success(t("toast.brandDeleted"))
        } catch (apiError) {
          console.warn("API delete failed, marking for deletion:", apiError)
          queueForDeletion(id)
          removeFromLocalCache(id)
          success("Brand marked for deletion (will sync when online)")
        }
      } else {
        queueForDeletion(id)
        removeFromLocalCache(id)
        success("Brand marked for deletion (will sync when online)")
      }
    } catch (err) {
      console.error("Failed to delete brand:", err)
      error(t("toast.failedDelete"))
      throw err
    } finally {
      loading.value = false
    }
  }

  const deleteSelectedBrands = async (): Promise<void> => {
    if (!canDelete.value) {
      error(t("permission.deleteBrands"))
      throw new Error("Permission denied")
    }

    if (selectedBrands.value.length === 0) {
      error("No brands selected")
      return
    }

    loading.value = true
    try {
      if (navigator.onLine) {
        try {
          await axios.post("/api/brands/bulk-delete", {
            ids: selectedBrands.value,
          })
          await initializeBrands(paginationMeta.value?.current_page || 1, filters.value.search)
          success(t("toast.brandsDeleted"))
        } catch (apiError) {
          console.warn("API bulk delete failed, marking for deletion:", apiError)
          selectedBrands.value.forEach((id) => {
            queueForDeletion(id)
            removeFromLocalCache(id)
          })
          success(`${selectedBrands.value.length} brands marked for deletion (will sync when online)`)
        }
      } else {
        selectedBrands.value.forEach((id) => {
          queueForDeletion(id)
          removeFromLocalCache(id)
        })
        success(`${selectedBrands.value.length} brands marked for deletion (will sync when online)`)
      }

      selectedBrands.value = []
    } catch (err) {
      console.error("Failed to delete selected brands:", err)
      error(t("toast.failedDelete"))
      throw err
    } finally {
      loading.value = false
    }
  }

  const removeFromLocalCache = (id: string) => {
    try {
      const allBrands = getAllOfflineBrands()
      const filteredBrands = allBrands.filter((brand) => brand.id !== id)
      localStorage.setItem("allBrands", JSON.stringify(filteredBrands))

      brands.value = brands.value.filter((brand) => brand.id !== id)

      const cachedBrands = localStorage.getItem("brands")
      if (cachedBrands) {
        const parsed = JSON.parse(cachedBrands)
        if (Array.isArray(parsed)) {
          const filtered = parsed.filter((brand) => brand.id !== id)
          localStorage.setItem("brands", JSON.stringify(filtered))
        }
      }
    } catch (error) {
      console.error("Failed to remove from local cache:", error)
    }
  }

  const saveLocallyAndQueue = (brand: Brand, action: "create" | "update") => {
    try {
      const allBrands = getAllOfflineBrands()

      if (action === "create") {
        allBrands.unshift(brand)
        brands.value.unshift(brand)
      } else {
        const index = allBrands.findIndex((c) => c.id === brand.id)
        if (index !== -1) {
          allBrands[index] = brand
        }
        const currentIndex = brands.value.findIndex((c) => c.id === brand.id)
        if (currentIndex !== -1) {
          brands.value[currentIndex] = brand
        }
      }

      localStorage.setItem("allBrands", JSON.stringify(allBrands))
      localStorage.setItem("brands", JSON.stringify(brands.value))

      const syncQueue = JSON.parse(localStorage.getItem("brandSyncQueue") || "[]")
      const existingIndex = syncQueue.findIndex((item: any) => item.brand.id === brand.id && item.action === action)

      const queueItem = {
        brand,
        action,
        timestamp: Date.now(),
        id: `${brand.id}_${action}_${Date.now()}`,
      }

      if (existingIndex !== -1) {
        syncQueue[existingIndex] = queueItem
      } else {
        syncQueue.push(queueItem)
      }

      localStorage.setItem("brandSyncQueue", JSON.stringify(syncQueue))

      success(`Brand ${action}d locally (will sync when online)`)
    } catch (error) {
      console.error("Failed to save locally and queue:", error)
    }
  }

  const queueForDeletion = (id: string) => {
    try {
      const deleteQueue = JSON.parse(localStorage.getItem("brandDeleteQueue") || "[]")

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

      localStorage.setItem("brandDeleteQueue", JSON.stringify(deleteQueue))
    } catch (error) {
      console.error("Failed to queue for deletion:", error)
    }
  }

  const isPendingSync = (brandId: string): boolean => {
    const syncQueue = JSON.parse(localStorage.getItem("brandSyncQueue") || "[]")
    const deleteQueue = JSON.parse(localStorage.getItem("brandDeleteQueue") || "[]")

    return (
      syncQueue.some((item: any) => item.brand.id === brandId) || deleteQueue.some((item: any) => item.id === brandId)
    )
  }

  const syncPendingChanges = async () => {
    if (!navigator.onLine || syncInProgress.value) return

    syncInProgress.value = true
    let syncedCount = 0
    const failedSyncs: any[] = []

    try {
      const syncQueue = JSON.parse(localStorage.getItem("brandSyncQueue") || "[]")
      const successfulSyncs: any[] = []

      for (const item of syncQueue) {
        try {
          if (item.action === "create") {
            if (item.brand.id.startsWith("temp_")) {
              const response = await axios.post("/api/brands", {
                name: item.brand.name,
                description: item.brand.description,
              })

              const serverBrand = response.data.data || response.data
              const allBrands = getAllOfflineBrands()
              const index = allBrands.findIndex((c) => c.id === item.brand.id)
              if (index !== -1) {
                allBrands[index] = { ...allBrands[index], id: serverBrand.id }
                localStorage.setItem("allBrands", JSON.stringify(allBrands))
              }
            }
          } else if (item.action === "update") {
            if (!item.brand.id.startsWith("temp_")) {
              await axios.put(`/api/brands/${item.brand.id}`, {
                name: item.brand.name,
                description: item.brand.description,
              })
            }
          }
          successfulSyncs.push(item)
          syncedCount++
        } catch (syncError: any) {
          console.error("Failed to sync brand:", syncError)

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
              (synced) => synced.id === item.id || (synced.brand.id === item.brand.id && synced.action === item.action),
            ),
        )
        localStorage.setItem("brandSyncQueue", JSON.stringify(remainingQueue))
      }

      const deleteQueue = JSON.parse(localStorage.getItem("brandDeleteQueue") || "[]")
      const successfulDeletes: any[] = []

      for (const item of deleteQueue) {
        try {
          if (!item.id.startsWith("temp_")) {
            await axios.delete(`/api/brands/${item.id}`)
          }
          successfulDeletes.push(item)
          syncedCount++
        } catch (syncError: any) {
          console.error("Failed to sync brand deletion:", syncError)

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
        localStorage.setItem("brandDeleteQueue", JSON.stringify(remainingDeletes))
      }

      if (failedSyncs.length > 0) {
        localStorage.setItem("brandSyncFailures", JSON.stringify(failedSyncs))
      } else {
        localStorage.setItem("brandSyncFailures", JSON.stringify([]))
      }

      syncStatusTrigger.value++

      const isAutoSync = arguments.length === 0 || arguments[0] === true

      if (syncedCount > 0 && !isAutoSync) {
        await initializeBrands()
        success(t("toast.syncCompleted"))
      } else if (syncedCount > 0 && isAutoSync) {
        await initializeBrands()
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
    const failures = JSON.parse(localStorage.getItem("brandSyncFailures") || "[]")
    if (failures.length === 0) {
      info("No sync failures to retry")
      return
    }

    const syncQueue = JSON.parse(localStorage.getItem("brandSyncQueue") || "[]")
    const deleteQueue = JSON.parse(localStorage.getItem("brandDeleteQueue") || "[]")

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
          (item: any) => item.brand.id === failure.brand.id && item.action === failure.action,
        )
        if (!exists) {
          syncQueue.push({
            brand: failure.brand,
            action: failure.action,
            timestamp: Date.now(),
            id: `${failure.brand.id}_${failure.action}_retry_${Date.now()}`,
          })
          retryCount++
        }
      }
    })

    localStorage.setItem("brandSyncQueue", JSON.stringify(syncQueue))
    localStorage.setItem("brandDeleteQueue", JSON.stringify(deleteQueue))
    localStorage.setItem("brandSyncFailures", JSON.stringify([]))

    if (retryCount > 0) {
      info(`Retrying ${retryCount} failed sync operations...`)
    } else {
      warning("All failed operations are already queued for retry")
    }

    await syncPendingChanges()
  }

  const clearSyncFailures = () => {
    localStorage.setItem("brandSyncFailures", JSON.stringify([]))
    success("Sync errors cleared")
  }

  const clearAllSyncData = () => {
    localStorage.setItem("brandSyncQueue", JSON.stringify([]))
    localStorage.setItem("brandDeleteQueue", JSON.stringify([]))
    localStorage.setItem("brandSyncFailures", JSON.stringify([]))

    syncInProgress.value = false
    selectedBrands.value = []
    syncStatusTrigger.value++

    brands.value = brands.value.map((brand) => ({
      ...brand,
      _pendingSync: false,
    }))

    success("All sync data cleared")

    setTimeout(() => {
      syncStatusTrigger.value++
      brands.value = [...brands.value]
    }, 100)
  }

  const setFilters = async (newFilters: Partial<BrandFilters>) => {
    filters.value = { ...filters.value, ...newFilters }

    if (searchTimeout) {
      clearTimeout(searchTimeout)
    }

    searchTimeout = setTimeout(async () => {
      await initializeBrands(1, filters.value.search)
    }, 500)
  }

  const clearFilters = async () => {
    filters.value = {
      search: "",
    }
    await initializeBrands(1, "")
  }

  const downloadTemplate = () => {
    const csvContent =
      "Name,Description\nApple,Technology and electronics\nNike,Sports and lifestyle\nCoca-Cola,Beverages and refreshments"
    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "brands_template.csv"
    a.click()
    window.URL.revokeObjectURL(url)
    success(t("toast.templateDownloaded"))
  }

  const exportBrands = async (exportAll = false) => {
    try {
      const params = new URLSearchParams()

      if (!exportAll && filters.value.search) {
        params.append("search", filters.value.search)
      }

      const response = await axios.post(`/api/brands/export?${params.toString()}`)

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
      await initializeBrands(page, filters.value.search)
    }
  }

  const updateSyncStatus = () => {
    syncStatusTrigger.value++
  }

  return {
    brands,
    loading,
    filters,
    filteredBrands,
    paginationMeta,
    paginationLinks,
    shouldShowPagination,
    selectedBrands,
    canView,
    canCreate,
    canEdit,
    canDelete,
    syncFailures,
    pendingSyncCount,
    hasSyncIssues,
    syncStatusTrigger,
    initializeBrands,
    addBrand,
    updateBrand,
    deleteBrand,
    deleteSelectedBrands,
    setFilters,
    clearFilters,
    downloadTemplate,
    exportBrands,
    syncPendingChanges,
    retrySyncFailures,
    clearSyncFailures,
    clearAllSyncData,
    goToPage,
    updateSyncStatus,
    getSyncAction,
  }
}
