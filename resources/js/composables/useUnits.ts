"use client"

import { ref, computed } from "vue"
import axios from "axios"
import type { Unit, UnitFormData, UnitFilters, PaginationMeta, PaginationLinks } from "@/types/Unit"
import { useToast } from "@/composables/useToast"
import { useI18n } from "@/composables/useI18n"
import { useAuth } from "@/composables/useAuth"

const units = ref<Unit[]>([])
const loading = ref(false)
const filters = ref<UnitFilters>({
  search: "",
})
const paginationMeta = ref<PaginationMeta | null>(null)
const paginationLinks = ref<PaginationLinks | null>(null)

// Track sync status
const syncInProgress = ref(false)
const selectedUnits = ref<string[]>([])
const syncStatusTrigger = ref(0) // TAMBAHAN: Trigger untuk force reactivity

// Search debounce
let searchTimeout: NodeJS.Timeout | null = null

// Mock data for offline fallback with pagination
const mockUnits: Unit[] = Array.from({ length: 50 }, (_, i) => ({
  id: (i + 1).toString(),
  name: `Unit ${i + 1}`,
  short_name: `U${i + 1}`,
  created_at: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
  updated_at: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
}))

export function useUnits() {
  const { success, error, info, warning } = useToast()
  const { t } = useI18n()
  const { hasPermission } = useAuth()

  // Permissions
  const canView = computed(() => hasPermission("view units"))
  const canCreate = computed(() => hasPermission("create units"))
  const canEdit = computed(() => hasPermission("edit units"))
  const canDelete = computed(() => hasPermission("delete units"))

  // Sync details - PERBAIKAN: Bersihkan data yang sudah tidak valid
  const syncFailures = computed(() => {
    // Force reactivity dengan trigger
    syncStatusTrigger.value

    const failures = JSON.parse(localStorage.getItem("unitSyncFailures") || "[]")
    // Filter failures yang masih valid (tidak lebih dari 24 jam)
    const validFailures = failures.filter((failure: any) => {
      const failureTime = failure.timestamp || Date.now()
      const hoursDiff = (Date.now() - failureTime) / (1000 * 60 * 60)
      return hoursDiff < 24 // Hanya simpan failure dalam 24 jam terakhir
    })

    // Update localStorage dengan data yang sudah dibersihkan
    if (validFailures.length !== failures.length) {
      localStorage.setItem("unitSyncFailures", JSON.stringify(validFailures))
    }

    return validFailures
  })

  const pendingSyncCount = computed(() => {
    // Force reactivity dengan trigger
    syncStatusTrigger.value

    const syncQueue = JSON.parse(localStorage.getItem("unitSyncQueue") || "[]")
    const deleteQueue = JSON.parse(localStorage.getItem("unitDeleteQueue") || "[]")

    // Filter queue yang masih valid
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

    // Update localStorage
    if (validSyncQueue.length !== syncQueue.length) {
      localStorage.setItem("unitSyncQueue", JSON.stringify(validSyncQueue))
    }
    if (validDeleteQueue.length !== deleteQueue.length) {
      localStorage.setItem("unitDeleteQueue", JSON.stringify(validDeleteQueue))
    }

    return validSyncQueue.length + validDeleteQueue.length
  })

  const hasSyncIssues = computed(() => {
    return syncFailures.value.length > 0 || pendingSyncCount.value > 0
  })

  // PERBAIKAN: Fungsi untuk mendapatkan semua data offline untuk search
  const getAllOfflineUnits = (): Unit[] => {
    try {
      // Get all cached pages first
      const allCachedUnits = new Map<string, Unit>()

      // Try to get from full cache first
      const allUnitsCache = localStorage.getItem("allUnits")
      if (allUnitsCache) {
        const parsed = JSON.parse(allUnitsCache)
        if (Array.isArray(parsed)) {
          parsed.forEach((unit) => {
            allCachedUnits.set(unit.id, unit)
          })
        }
      }

      // Then add any page-specific cached units that might be more recent
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && key.startsWith("units_page_")) {
          try {
            const pageCache = JSON.parse(localStorage.getItem(key) || "{}")
            if (pageCache.units && Array.isArray(pageCache.units)) {
              pageCache.units.forEach((unit: Unit) => {
                allCachedUnits.set(unit.id, unit)
              })
            }
          } catch (e) {
            console.warn(`Failed to parse cache for ${key}`, e)
          }
        }
      }

      // Convert map back to array
      const mergedUnits = Array.from(allCachedUnits.values())

      // Sort by most recent first (assuming updated_at is reliable)
      mergedUnits.sort((a, b) => {
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      })

      if (mergedUnits.length > 0) {
        return mergedUnits
      }

      // Fallback to mock data if nothing in cache
      return [...mockUnits]
    } catch (error) {
      console.error("Failed to get offline units:", error)
      return [...mockUnits]
    }
  }

  const initializeUnits = async (page = 1, search = "") => {
    if (!canView.value) {
      error(t("permission.viewUnits"))
      return
    }

    loading.value = true
    try {
      // Initialize units as empty array
      units.value = []

      // Try to fetch from API first
      if (navigator.onLine) {
        try {
          const params = new URLSearchParams({
            page: page.toString(),
          })

          if (search.trim()) {
            params.append("search", search.trim())
          }

          const response = await axios.get(`/api/units?${params.toString()}`)
          const responseData = response.data

          // Handle Laravel pagination response
          if (responseData && responseData.data && Array.isArray(responseData.data)) {
            units.value = responseData.data
            paginationMeta.value = responseData.meta
            paginationLinks.value = responseData.links

            // Cache the current page data
            const cacheKey = `units_page_${page}_search_${search}`
            localStorage.setItem(
              cacheKey,
              JSON.stringify({
                units: units.value,
                meta: paginationMeta.value,
                links: paginationLinks.value,
                timestamp: Date.now(),
              }),
            )
            localStorage.setItem("units_last_cache_key", cacheKey)

            // Only fetch all data if we don't have it cached yet or it's been more than a day
            // AND only on first page without search to avoid unnecessary calls
            const allUnitsCache = localStorage.getItem("allUnits")
            const lastFullCacheTime = localStorage.getItem("allUnits_last_cache_time")
            const needsFullRefresh =
              !allUnitsCache ||
              !lastFullCacheTime ||
              Date.now() - Number.parseInt(lastFullCacheTime) > 24 * 60 * 60 * 1000 // 24 hours

            // Only fetch all data in background if it's really needed and we're on first page
            if (page === 1 && !search.trim() && needsFullRefresh) {
              // Fetch this in the background without blocking the main request
              setTimeout(async () => {
                try {
                  const allDataResponse = await axios.get("/api/units?per_page=1000")
                  if (allDataResponse.data && allDataResponse.data.data) {
                    localStorage.setItem("allUnits", JSON.stringify(allDataResponse.data.data))
                    localStorage.setItem("allUnits_last_cache_time", Date.now().toString())
                  }
                } catch (allDataError) {
                  console.warn("Failed to cache all units:", allDataError)
                }
              }, 1000) // Delay 1 second to avoid immediate double call
            }
          } else if (Array.isArray(response.data)) {
            // Fallback for direct array response
            units.value = response.data
            paginationMeta.value = null
            paginationLinks.value = null
          } else {
            console.warn("Unexpected API response format:", responseData)
            units.value = []
          }
        } catch (apiError) {
          console.warn("API call failed, using cached data:", apiError)
          loadFromCache(page, search)
        }
      } else {
        // Load from cache when offline with pagination simulation
        loadFromCache(page, search)
      }
    } catch (err) {
      console.error("Failed to load units:", err)
      error(t("toast.failedLoad"))
      units.value = []
    } finally {
      loading.value = false
    }
  }

  const loadFromCache = (page = 1, search = "") => {
    try {
      // First try to load from specific page cache
      const cacheKey = `units_page_${page}_search_${search}`
      const pageCache = localStorage.getItem(cacheKey)

      if (pageCache) {
        try {
          const cached = JSON.parse(pageCache)
          const cacheAge = Date.now() - (cached.timestamp || 0)

          // Use cached data if it's less than 1 hour old
          if (cacheAge < 60 * 60 * 1000) {
            units.value = cached.units || []
            paginationMeta.value = cached.meta || null
            paginationLinks.value = cached.links || null
            return
          }
        } catch (e) {
          console.warn("Failed to parse page cache:", e)
        }
      }

      // Fallback to getAllOfflineUnits for search and pagination simulation
      const allUnits = getAllOfflineUnits()

      // Simulate pagination for offline
      const perPage = 10
      let filteredUnits = allUnits

      // Apply search filter
      if (search.trim()) {
        const searchTerm = search.toLowerCase()
        filteredUnits = allUnits.filter(
          (unit) => unit.name.toLowerCase().includes(searchTerm) || unit.short_name.toLowerCase().includes(searchTerm),
        )
      }

      const total = filteredUnits.length
      const lastPage = Math.ceil(total / perPage)
      const from = total > 0 ? (page - 1) * perPage + 1 : 0
      const to = Math.min(page * perPage, total)

      // Get current page data
      const startIndex = (page - 1) * perPage
      const endIndex = startIndex + perPage
      units.value = filteredUnits.slice(startIndex, endIndex)

      // Create pagination meta
      paginationMeta.value = {
        current_page: page,
        from: units.value.length > 0 ? from : 0,
        last_page: lastPage,
        per_page: perPage,
        to: units.value.length > 0 ? to : 0,
        total: total,
        links: [],
      }

      // Create pagination links
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
      units.value = [...mockUnits.slice(0, 10)]

      // Create basic pagination for fallback
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

  const getSyncAction = (unitId: string): "create" | "update" | "delete" | null => {
    const syncQueue = JSON.parse(localStorage.getItem("unitSyncQueue") || "[]")
    const deleteQueue = JSON.parse(localStorage.getItem("unitDeleteQueue") || "[]")

    // Check delete queue first
    const deleteItem = deleteQueue.find((item: any) => item.id === unitId)
    if (deleteItem) return "delete"

    // Check sync queue
    const syncItem = syncQueue.find((item: any) => item.unit.id === unitId)
    if (syncItem) {
      return syncItem.action === "create" ? "create" : "update"
    }

    return null
  }

  const filteredUnits = computed(() => {
    // Force reactivity dengan trigger
    syncStatusTrigger.value

    if (!Array.isArray(units.value)) {
      console.warn("units.value is not an array:", units.value)
      return []
    }

    return units.value.map((unit) => ({
      ...unit,
      _pendingSync: isPendingSync(unit.id),
      _syncAction: getSyncAction(unit.id), // TAMBAHAN: Include sync action
    }))
  })

  const shouldShowPagination = computed(() => {
    return paginationMeta.value && paginationMeta.value.total > 0 && paginationMeta.value.last_page > 1
  })

  const addUnit = async (unitData: UnitFormData): Promise<Unit> => {
    if (!canCreate.value) {
      error(t("permission.createUnits"))
      throw new Error("Permission denied")
    }

    loading.value = true
    try {
      if (navigator.onLine) {
        try {
          const response = await axios.post("/api/units", unitData)
          const savedUnit = response.data.data || response.data

          await initializeUnits(paginationMeta.value?.current_page || 1, filters.value.search)
          success(t("toast.unitCreated"))
          return savedUnit
        } catch (apiError: any) {
          console.error("API save failed:", apiError)

          // PERBAIKAN: Jangan tampilkan toast untuk validation error, biarkan component handle
          if (apiError.response?.status === 422 && apiError.response?.data?.errors) {
            throw apiError // Re-throw untuk ditangani component
          }

          const newUnit: Unit = {
            id: `temp_${Date.now()}`,
            ...unitData,
            short_name: unitData.short_name.toUpperCase(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }

          saveLocallyAndQueue(newUnit, "create")
          return newUnit
        }
      } else {
        const newUnit: Unit = {
          id: `temp_${Date.now()}`,
          ...unitData,
          short_name: unitData.short_name.toUpperCase(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }

        saveLocallyAndQueue(newUnit, "create")
        return newUnit
      }
    } catch (err: any) {
      console.error("Failed to add unit:", err)

      // PERBAIKAN: Hanya tampilkan toast untuk error non-validation
      if (!(err.response?.status === 422 && err.response?.data?.errors)) {
        error(t("toast.failedCreate"))
      }

      throw err
    } finally {
      loading.value = false
    }
  }

  const updateUnit = async (id: string, unitData: UnitFormData): Promise<Unit> => {
    if (!canEdit.value) {
      error(t("permission.editUnits"))
      throw new Error("Permission denied")
    }

    loading.value = true
    try {
      const allUnits = getAllOfflineUnits()
      const index = allUnits.findIndex((unit) => unit.id === id)
      if (index === -1) {
        throw new Error("Unit not found")
      }

      const updatedUnit: Unit = {
        ...allUnits[index],
        ...unitData,
        short_name: unitData.short_name.toUpperCase(),
        updated_at: new Date().toISOString(),
      }

      if (navigator.onLine) {
        try {
          const response = await axios.put(`/api/units/${id}`, unitData)
          const savedUnit = response.data.data || response.data

          await initializeUnits(paginationMeta.value?.current_page || 1, filters.value.search)
          success(t("toast.unitUpdated"))
          return savedUnit
        } catch (apiError: any) {
          console.error("API update failed:", apiError)

          // PERBAIKAN: Jangan tampilkan toast untuk validation error
          if (apiError.response?.status === 422 && apiError.response?.data?.errors) {
            throw apiError
          }

          allUnits[index] = updatedUnit
          localStorage.setItem("allUnits", JSON.stringify(allUnits))
          saveLocallyAndQueue(updatedUnit, "update")
          return updatedUnit
        }
      } else {
        allUnits[index] = updatedUnit
        localStorage.setItem("allUnits", JSON.stringify(allUnits))
        saveLocallyAndQueue(updatedUnit, "update")
        return updatedUnit
      }
    } catch (err: any) {
      console.error("Failed to update unit:", err)

      // PERBAIKAN: Hanya tampilkan toast untuk error non-validation
      if (!(err.response?.status === 422 && err.response?.data?.errors)) {
        error(t("toast.failedUpdate"))
      }

      throw err
    } finally {
      loading.value = false
    }
  }

  const deleteUnit = async (id: string): Promise<void> => {
    if (!canDelete.value) {
      error(t("permission.deleteUnits"))
      throw new Error("Permission denied")
    }

    loading.value = true
    try {
      if (navigator.onLine) {
        try {
          await axios.delete(`/api/units/${id}`)
          await initializeUnits(paginationMeta.value?.current_page || 1, filters.value.search)
          success(t("toast.unitDeleted"))
        } catch (apiError) {
          console.warn("API delete failed, marking for deletion:", apiError)
          queueForDeletion(id)
          removeFromLocalCache(id)
          success("Unit marked for deletion (will sync when online)")
        }
      } else {
        queueForDeletion(id)
        removeFromLocalCache(id)
        success("Unit marked for deletion (will sync when online)")
      }
    } catch (err) {
      console.error("Failed to delete unit:", err)
      error(t("toast.failedDelete"))
      throw err
    } finally {
      loading.value = false
    }
  }

  const deleteSelectedUnits = async (): Promise<void> => {
    if (!canDelete.value) {
      error(t("permission.deleteUnits"))
      throw new Error("Permission denied")
    }

    if (selectedUnits.value.length === 0) {
      error("No units selected")
      return
    }

    loading.value = true
    try {
      if (navigator.onLine) {
        try {
          await axios.post("/api/units/bulk-delete", {
            ids: selectedUnits.value,
          })
          await initializeUnits(paginationMeta.value?.current_page || 1, filters.value.search)
          success(t("toast.unitsDeleted"))
        } catch (apiError) {
          console.warn("API bulk delete failed, marking for deletion:", apiError)
          selectedUnits.value.forEach((id) => {
            queueForDeletion(id)
            removeFromLocalCache(id)
          })
          success(`${selectedUnits.value.length} units marked for deletion (will sync when online)`)
        }
      } else {
        selectedUnits.value.forEach((id) => {
          queueForDeletion(id)
          removeFromLocalCache(id)
        })
        success(`${selectedUnits.value.length} units marked for deletion (will sync when online)`)
      }

      selectedUnits.value = []
    } catch (err) {
      console.error("Failed to delete selected units:", err)
      error(t("toast.failedDelete"))
      throw err
    } finally {
      loading.value = false
    }
  }

  // PERBAIKAN: Fungsi untuk menghapus dari cache lokal
  const removeFromLocalCache = (id: string) => {
    try {
      // Update allUnits cache
      const allUnits = getAllOfflineUnits()
      const filteredUnits = allUnits.filter((unit) => unit.id !== id)
      localStorage.setItem("allUnits", JSON.stringify(filteredUnits))

      // Update current units display
      units.value = units.value.filter((unit) => unit.id !== id)

      // Update regular cache
      const cachedUnits = localStorage.getItem("units")
      if (cachedUnits) {
        const parsed = JSON.parse(cachedUnits)
        if (Array.isArray(parsed)) {
          const filtered = parsed.filter((unit) => unit.id !== id)
          localStorage.setItem("units", JSON.stringify(filtered))
        }
      }
    } catch (error) {
      console.error("Failed to remove from local cache:", error)
    }
  }

  const saveLocallyAndQueue = (unit: Unit, action: "create" | "update") => {
    try {
      // Update allUnits cache
      const allUnits = getAllOfflineUnits()

      if (action === "create") {
        allUnits.unshift(unit)
        units.value.unshift(unit)
      } else {
        const index = allUnits.findIndex((u) => u.id === unit.id)
        if (index !== -1) {
          allUnits[index] = unit
        }
        const currentIndex = units.value.findIndex((u) => u.id === unit.id)
        if (currentIndex !== -1) {
          units.value[currentIndex] = unit
        }
      }

      localStorage.setItem("allUnits", JSON.stringify(allUnits))
      localStorage.setItem("units", JSON.stringify(units.value))

      // PERBAIKAN: Cek duplikasi sebelum menambah ke queue
      const syncQueue = JSON.parse(localStorage.getItem("unitSyncQueue") || "[]")
      const existingIndex = syncQueue.findIndex((item: any) => item.unit.id === unit.id && item.action === action)

      const queueItem = {
        unit,
        action,
        timestamp: Date.now(),
        id: `${unit.id}_${action}_${Date.now()}`, // Unique identifier
      }

      if (existingIndex !== -1) {
        // Update existing queue item
        syncQueue[existingIndex] = queueItem
      } else {
        // Add new queue item
        syncQueue.push(queueItem)
      }

      localStorage.setItem("unitSyncQueue", JSON.stringify(syncQueue))

      success(`Unit ${action}d locally (will sync when online)`)
    } catch (error) {
      console.error("Failed to save locally and queue:", error)
    }
  }

  const queueForDeletion = (id: string) => {
    try {
      const deleteQueue = JSON.parse(localStorage.getItem("unitDeleteQueue") || "[]")

      // PERBAIKAN: Cek duplikasi sebelum menambah ke queue
      const existingIndex = deleteQueue.findIndex((item: any) => item.id === id)
      const queueItem = {
        id,
        timestamp: Date.now(),
        queueId: `${id}_delete_${Date.now()}`, // Unique identifier
      }

      if (existingIndex !== -1) {
        // Update existing queue item
        deleteQueue[existingIndex] = queueItem
      } else {
        // Add new queue item
        deleteQueue.push(queueItem)
      }

      localStorage.setItem("unitDeleteQueue", JSON.stringify(deleteQueue))
    } catch (error) {
      console.error("Failed to queue for deletion:", error)
    }
  }

  const isPendingSync = (unitId: string): boolean => {
    const syncQueue = JSON.parse(localStorage.getItem("unitSyncQueue") || "[]")
    const deleteQueue = JSON.parse(localStorage.getItem("unitDeleteQueue") || "[]")

    return syncQueue.some((item: any) => item.unit.id === unitId) || deleteQueue.some((item: any) => item.id === unitId)
  }

  const syncPendingChanges = async () => {
    if (!navigator.onLine || syncInProgress.value) return

    syncInProgress.value = true
    let syncedCount = 0
    const failedSyncs: any[] = []

    try {
      // Sync create/update queue
      const syncQueue = JSON.parse(localStorage.getItem("unitSyncQueue") || "[]")
      const successfulSyncs: any[] = []

      for (const item of syncQueue) {
        try {
          if (item.action === "create") {
            // PERBAIKAN: Skip jika unit sudah ada di server
            if (item.unit.id.startsWith("temp_")) {
              const response = await axios.post("/api/units", {
                name: item.unit.name,
                short_name: item.unit.short_name,
              })

              // Update local cache dengan ID yang benar dari server
              const serverUnit = response.data.data || response.data
              const allUnits = getAllOfflineUnits()
              const index = allUnits.findIndex((u) => u.id === item.unit.id)
              if (index !== -1) {
                allUnits[index] = { ...allUnits[index], id: serverUnit.id }
                localStorage.setItem("allUnits", JSON.stringify(allUnits))
              }
            }
          } else if (item.action === "update") {
            // Skip temporary IDs untuk update
            if (!item.unit.id.startsWith("temp_")) {
              await axios.put(`/api/units/${item.unit.id}`, {
                name: item.unit.name,
                short_name: item.unit.short_name,
              })
            }
          }
          successfulSyncs.push(item)
          syncedCount++
        } catch (syncError: any) {
          console.error("Failed to sync unit:", syncError)

          // Extract validation errors if available
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

      // Remove successfully synced items
      if (successfulSyncs.length > 0) {
        const remainingQueue = syncQueue.filter(
          (item: any) =>
            !successfulSyncs.some(
              (synced) => synced.id === item.id || (synced.unit.id === item.unit.id && synced.action === item.action),
            ),
        )
        localStorage.setItem("unitSyncQueue", JSON.stringify(remainingQueue))
      }

      // Sync delete queue
      const deleteQueue = JSON.parse(localStorage.getItem("unitDeleteQueue") || "[]")
      const successfulDeletes: any[] = []

      for (const item of deleteQueue) {
        try {
          // Skip temporary IDs
          if (!item.id.startsWith("temp_")) {
            await axios.delete(`/api/units/${item.id}`)
          }
          successfulDeletes.push(item)
          syncedCount++
        } catch (syncError: any) {
          console.error("Failed to sync unit deletion:", syncError)

          // Extract validation errors if available
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

      // Remove successfully synced deletes
      if (successfulDeletes.length > 0) {
        const remainingDeletes = deleteQueue.filter(
          (item: any) =>
            !successfulDeletes.some((deleted) => deleted.queueId === item.queueId || deleted.id === item.id),
        )
        localStorage.setItem("unitDeleteQueue", JSON.stringify(remainingDeletes))
      }

      // Store failed syncs for notification system
      if (failedSyncs.length > 0) {
        localStorage.setItem("unitSyncFailures", JSON.stringify(failedSyncs))
      } else {
        // PERBAIKAN: Clear failures jika semua berhasil
        localStorage.setItem("unitSyncFailures", JSON.stringify([]))
      }

      // PERBAIKAN: Force update reactive status
      syncStatusTrigger.value++

      // PERBAIKAN: Hanya tampilkan toast jika ada yang di-sync dan bukan auto-sync
      const isAutoSync = arguments.length === 0 || arguments[0] === true

      if (syncedCount > 0 && !isAutoSync) {
        await initializeUnits()
        success(t("toast.syncCompleted"))
      } else if (syncedCount > 0 && isAutoSync) {
        // Silent refresh untuk auto-sync
        await initializeUnits()
      }

      if (failedSyncs.length > 0 && !isAutoSync) {
        error(t("toast.syncFailed"))
      }

      // HAPUS bagian ini di akhir syncPendingChanges:
      // setTimeout(() => {
      //   window.dispatchEvent(new CustomEvent("sync-status-updated"))
      // }, 100)
    } catch (err) {
      console.error("Failed to sync pending changes:", err)
    } finally {
      syncInProgress.value = false
    }
  }

  const retrySyncFailures = async () => {
    const failures = JSON.parse(localStorage.getItem("unitSyncFailures") || "[]")
    if (failures.length === 0) {
      info("No sync failures to retry")
      return
    }

    // Move failures back to sync queue
    const syncQueue = JSON.parse(localStorage.getItem("unitSyncQueue") || "[]")
    const deleteQueue = JSON.parse(localStorage.getItem("unitDeleteQueue") || "[]")

    let retryCount = 0

    failures.forEach((failure: any) => {
      if (failure.action === "delete") {
        // PERBAIKAN: Cek duplikasi
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
        // PERBAIKAN: Cek duplikasi
        const exists = syncQueue.some((item: any) => item.unit.id === failure.unit.id && item.action === failure.action)
        if (!exists) {
          syncQueue.push({
            unit: failure.unit,
            action: failure.action,
            timestamp: Date.now(),
            id: `${failure.unit.id}_${failure.action}_retry_${Date.now()}`,
          })
          retryCount++
        }
      }
    })

    localStorage.setItem("unitSyncQueue", JSON.stringify(syncQueue))
    localStorage.setItem("unitDeleteQueue", JSON.stringify(deleteQueue))
    localStorage.setItem("unitSyncFailures", JSON.stringify([]))

    // Show retry feedback
    if (retryCount > 0) {
      info(`Retrying ${retryCount} failed sync operations...`)
    } else {
      warning("All failed operations are already queued for retry")
    }

    // Retry sync
    await syncPendingChanges()
  }

  const clearSyncFailures = () => {
    localStorage.setItem("unitSyncFailures", JSON.stringify([]))
    success("Sync errors cleared")
  }

  const clearAllSyncData = () => {
    localStorage.setItem("unitSyncQueue", JSON.stringify([]))
    localStorage.setItem("unitDeleteQueue", JSON.stringify([]))
    localStorage.setItem("unitSyncFailures", JSON.stringify([]))

    // PERBAIKAN: Force update computed values dan clear selected units
    syncInProgress.value = false
    selectedUnits.value = [] // Clear selected units
    syncStatusTrigger.value++ // Force reactivity

    // PERBAIKAN: Update units display untuk menghilangkan pending sync status
    units.value = units.value.map((unit) => ({
      ...unit,
      _pendingSync: false,
    }))

    success("All sync data cleared")

    // Ganti dengan ini:
    setTimeout(() => {
      syncStatusTrigger.value++
      // Force re-computation of filteredUnits
      units.value = [...units.value]
    }, 100)
  }

  const setFilters = async (newFilters: Partial<UnitFilters>) => {
    filters.value = { ...filters.value, ...newFilters }

    // Clear existing timeout
    if (searchTimeout) {
      clearTimeout(searchTimeout)
    }

    // Debounce search
    searchTimeout = setTimeout(async () => {
      await initializeUnits(1, filters.value.search)
    }, 500)
  }

  const clearFilters = async () => {
    filters.value = {
      search: "",
    }
    await initializeUnits(1, "")
  }

  const downloadTemplate = () => {
    const csvContent = "Name,Short Name\nKilogram,KG\nMeter,M\nLiter,L"
    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "units_template.csv"
    a.click()
    window.URL.revokeObjectURL(url)
    success(t("toast.templateDownloaded"))
  }

  const exportUnits = async (exportAll = false) => {
    try {
      const params = new URLSearchParams()

      if (!exportAll && filters.value.search) {
        params.append("search", filters.value.search)
      }

      const response = await axios.post(`/api/units/export?${params.toString()}`)

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
      await initializeUnits(page, filters.value.search)
    }
  }

  // HAPUS fungsi ini yang menyebabkan infinite loop:
  // const updateSyncStatus = () => {
  //   // Force update reactive status
  //   syncStatusTrigger.value++

  //   // Dispatch event untuk update UI
  //   window.dispatchEvent(new CustomEvent("sync-status-updated"))
  // }

  const updateSyncStatus = () => {
    // Hanya update trigger tanpa dispatch event untuk menghindari infinite loop
    syncStatusTrigger.value++
  }

  // Tambahkan updateSyncStatus ke return statement
  return {
    units,
    loading,
    filters,
    filteredUnits,
    paginationMeta,
    paginationLinks,
    shouldShowPagination,
    selectedUnits,
    canView,
    canCreate,
    canEdit,
    canDelete,
    syncFailures,
    pendingSyncCount,
    hasSyncIssues,
    syncStatusTrigger,
    initializeUnits,
    addUnit,
    updateUnit,
    deleteUnit,
    deleteSelectedUnits,
    setFilters,
    clearFilters,
    downloadTemplate,
    exportUnits,
    syncPendingChanges,
    retrySyncFailures,
    clearSyncFailures,
    clearAllSyncData,
    goToPage,
    updateSyncStatus, // TAMBAHAN: Export fungsi updateSyncStatus
    getSyncAction, // TAMBAHAN: Export getSyncAction
  }
}
