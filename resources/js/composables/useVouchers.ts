"use client"

import { ref, computed } from "vue"
import axios from "axios"
import type { Voucher, VoucherFormData, VoucherFilters, PaginationMeta, PaginationLinks } from "@/types/Voucher"
import { useToast } from "@/composables/useToast"
import { useI18n } from "@/composables/useI18n"
import { useAuth } from "@/composables/useAuth"

const vouchers = ref<Voucher[]>([])
const loading = ref(false)
const filters = ref<VoucherFilters>({
  search: "",
})
const paginationMeta = ref<PaginationMeta | null>(null)
const paginationLinks = ref<PaginationLinks | null>(null)

// Track sync status
const syncInProgress = ref(false)
const selectedVouchers = ref<string[]>([])
const syncStatusTrigger = ref(0)

// Search debounce
let searchTimeout: NodeJS.Timeout | null = null

// Mock data for offline fallback with pagination
const mockVouchers: Voucher[] = Array.from({ length: 50 }, (_, i) => ({
  id: (i + 1).toString(),
  code: `VOUCHER${i + 1}`,
  name: `Voucher ${i + 1}`,
  description: `Description for voucher ${i + 1}`,
  type: i % 2 === 0 ? "percentage" : "fixed",
  value: i % 2 === 0 ? 10 + (i % 5) * 5 : 50000 + (i % 10) * 10000,
  min_purchase: 100000 + (i % 5) * 50000,
  max_discount: i % 2 === 0 ? 100000 : undefined,
  usage_limit: 100 + (i % 10) * 50,
  used_count: i % 20,
  start_date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
  end_date: new Date(Date.now() + (30 - i) * 24 * 60 * 60 * 1000).toISOString(),
  is_active: i % 3 !== 0,
  created_at: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
  updated_at: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
}))

export function useVouchers() {
  const { success, error, info, warning } = useToast()
  const { t } = useI18n()
  const { hasPermission } = useAuth()

  // Permissions
  const canView = computed(() => hasPermission("view vouchers"))
  const canCreate = computed(() => hasPermission("create vouchers"))
  const canEdit = computed(() => hasPermission("edit vouchers"))
  const canDelete = computed(() => hasPermission("delete vouchers"))

  // Sync details
  const syncFailures = computed(() => {
    syncStatusTrigger.value
    const failures = JSON.parse(localStorage.getItem("voucherSyncFailures") || "[]")
    const validFailures = failures.filter((failure: any) => {
      const failureTime = failure.timestamp || Date.now()
      const hoursDiff = (Date.now() - failureTime) / (1000 * 60 * 60)
      return hoursDiff < 24
    })

    if (validFailures.length !== failures.length) {
      localStorage.setItem("voucherSyncFailures", JSON.stringify(validFailures))
    }

    return validFailures
  })

  const pendingSyncCount = computed(() => {
    syncStatusTrigger.value
    const syncQueue = JSON.parse(localStorage.getItem("voucherSyncQueue") || "[]")
    const deleteQueue = JSON.parse(localStorage.getItem("voucherDeleteQueue") || "[]")

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
      localStorage.setItem("voucherSyncQueue", JSON.stringify(validSyncQueue))
    }
    if (validDeleteQueue.length !== deleteQueue.length) {
      localStorage.setItem("voucherDeleteQueue", JSON.stringify(validDeleteQueue))
    }

    return validSyncQueue.length + validDeleteQueue.length
  })

  const hasSyncIssues = computed(() => {
    return syncFailures.value.length > 0 || pendingSyncCount.value > 0
  })

  const getAllOfflineVouchers = (): Voucher[] => {
    try {
      const allCachedVouchers = new Map<string, Voucher>()

      const allVouchersCache = localStorage.getItem("allVouchers")
      if (allVouchersCache) {
        const parsed = JSON.parse(allVouchersCache)
        if (Array.isArray(parsed)) {
          parsed.forEach((voucher) => {
            allCachedVouchers.set(voucher.id, voucher)
          })
        }
      }

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && key.startsWith("vouchers_page_")) {
          try {
            const pageCache = JSON.parse(localStorage.getItem(key) || "{}")
            if (pageCache.vouchers && Array.isArray(pageCache.vouchers)) {
              pageCache.vouchers.forEach((voucher: Voucher) => {
                allCachedVouchers.set(voucher.id, voucher)
              })
            }
          } catch (e) {
            console.warn(`Failed to parse cache for ${key}`, e)
          }
        }
      }

      const mergedVouchers = Array.from(allCachedVouchers.values())
      mergedVouchers.sort((a, b) => {
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      })

      if (mergedVouchers.length > 0) {
        return mergedVouchers
      }

      return [...mockVouchers]
    } catch (error) {
      console.error("Failed to get offline vouchers:", error)
      return [...mockVouchers]
    }
  }

  const initializeVouchers = async (page = 1, search = "") => {
    if (!canView.value) {
      error(t("permission.viewVouchers"))
      return
    }

    loading.value = true
    try {
      vouchers.value = []

      if (navigator.onLine) {
        try {
          const params = new URLSearchParams({
            page: page.toString(),
          })

          if (search.trim()) {
            params.append("search", search.trim())
          }

          const response = await axios.get(`/api/vouchers?${params.toString()}`)
          const responseData = response.data

          if (responseData && responseData.data && Array.isArray(responseData.data)) {
            vouchers.value = responseData.data
            paginationMeta.value = responseData.meta
            paginationLinks.value = responseData.links

            const cacheKey = `vouchers_page_${page}_search_${search}`
            localStorage.setItem(
              cacheKey,
              JSON.stringify({
                vouchers: vouchers.value,
                meta: paginationMeta.value,
                links: paginationLinks.value,
                timestamp: Date.now(),
              }),
            )
            localStorage.setItem("vouchers_last_cache_key", cacheKey)

            const allVouchersCache = localStorage.getItem("allVouchers")
            const lastFullCacheTime = localStorage.getItem("allVouchers_last_cache_time")
            const needsFullRefresh =
              !allVouchersCache ||
              !lastFullCacheTime ||
              Date.now() - Number.parseInt(lastFullCacheTime) > 24 * 60 * 60 * 1000

            if (page === 1 && !search.trim() && needsFullRefresh) {
              setTimeout(async () => {
                try {
                  const allDataResponse = await axios.get("/api/vouchers?per_page=1000")
                  if (allDataResponse.data && allDataResponse.data.data) {
                    localStorage.setItem("allVouchers", JSON.stringify(allDataResponse.data.data))
                    localStorage.setItem("allVouchers_last_cache_time", Date.now().toString())
                  }
                } catch (allDataError) {
                  console.warn("Failed to cache all vouchers:", allDataError)
                }
              }, 1000)
            }
          } else if (Array.isArray(response.data)) {
            vouchers.value = response.data
            paginationMeta.value = null
            paginationLinks.value = null
          } else {
            console.warn("Unexpected API response format:", responseData)
            vouchers.value = []
          }
        } catch (apiError) {
          console.warn("API call failed, using cached data:", apiError)
          loadFromCache(page, search)
        }
      } else {
        loadFromCache(page, search)
      }
    } catch (err) {
      console.error("Failed to load vouchers:", err)
      error(t("toast.failedLoad"))
      vouchers.value = []
    } finally {
      loading.value = false
    }
  }

  const loadFromCache = (page = 1, search = "") => {
    try {
      const cacheKey = `vouchers_page_${page}_search_${search}`
      const pageCache = localStorage.getItem(cacheKey)

      if (pageCache) {
        try {
          const cached = JSON.parse(pageCache)
          const cacheAge = Date.now() - (cached.timestamp || 0)

          if (cacheAge < 60 * 60 * 1000) {
            vouchers.value = cached.vouchers || []
            paginationMeta.value = cached.meta || null
            paginationLinks.value = cached.links || null
            return
          }
        } catch (e) {
          console.warn("Failed to parse page cache:", e)
        }
      }

      const allVouchers = getAllOfflineVouchers()
      const perPage = 10
      let filteredVouchers = allVouchers

      if (search.trim()) {
        const searchTerm = search.toLowerCase()
        filteredVouchers = allVouchers.filter(
          (voucher) =>
            voucher.code.toLowerCase().includes(searchTerm) ||
            voucher.name.toLowerCase().includes(searchTerm) ||
            (voucher.description && voucher.description.toLowerCase().includes(searchTerm)),
        )
      }

      const total = filteredVouchers.length
      const lastPage = Math.ceil(total / perPage)
      const from = total > 0 ? (page - 1) * perPage + 1 : 0
      const to = Math.min(page * perPage, total)

      const startIndex = (page - 1) * perPage
      const endIndex = startIndex + perPage
      vouchers.value = filteredVouchers.slice(startIndex, endIndex)

      paginationMeta.value = {
        current_page: page,
        from: vouchers.value.length > 0 ? from : 0,
        last_page: lastPage,
        per_page: perPage,
        to: vouchers.value.length > 0 ? to : 0,
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
      vouchers.value = [...mockVouchers.slice(0, 10)]

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

  const getSyncAction = (voucherId: string): "create" | "update" | "delete" | null => {
    const syncQueue = JSON.parse(localStorage.getItem("voucherSyncQueue") || "[]")
    const deleteQueue = JSON.parse(localStorage.getItem("voucherDeleteQueue") || "[]")

    const deleteItem = deleteQueue.find((item: any) => item.id === voucherId)
    if (deleteItem) return "delete"

    const syncItem = syncQueue.find((item: any) => item.voucher.id === voucherId)
    if (syncItem) {
      return syncItem.action === "create" ? "create" : "update"
    }

    return null
  }

  const filteredVouchers = computed(() => {
    syncStatusTrigger.value

    if (!Array.isArray(vouchers.value)) {
      console.warn("vouchers.value is not an array:", vouchers.value)
      return []
    }

    return vouchers.value.map((voucher) => ({
      ...voucher,
      _pendingSync: isPendingSync(voucher.id),
      _syncAction: getSyncAction(voucher.id),
    }))
  })

  const shouldShowPagination = computed(() => {
    return paginationMeta.value && paginationMeta.value.total > 0 && paginationMeta.value.last_page > 1
  })

  const addVoucher = async (voucherData: VoucherFormData): Promise<Voucher> => {
    if (!canCreate.value) {
      error(t("permission.createVouchers"))
      throw new Error("Permission denied")
    }

    loading.value = true
    try {
      if (navigator.onLine) {
        try {
          const response = await axios.post("/api/vouchers", voucherData)
          const savedVoucher = response.data.data || response.data

          await initializeVouchers(paginationMeta.value?.current_page || 1, filters.value.search)
          success(t("toast.voucherCreated"))
          return savedVoucher
        } catch (apiError: any) {
          console.error("API save failed:", apiError)

          if (apiError.response?.status === 422 && apiError.response?.data?.errors) {
            throw apiError
          }

          const newVoucher: Voucher = {
            id: `temp_${Date.now()}`,
            ...voucherData,
            code: voucherData.code.toUpperCase(),
            used_count: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }

          saveLocallyAndQueue(newVoucher, "create")
          return newVoucher
        }
      } else {
        const newVoucher: Voucher = {
          id: `temp_${Date.now()}`,
          ...voucherData,
          code: voucherData.code.toUpperCase(),
          used_count: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }

        saveLocallyAndQueue(newVoucher, "create")
        return newVoucher
      }
    } catch (err: any) {
      console.error("Failed to add voucher:", err)

      if (!(err.response?.status === 422 && err.response?.data?.errors)) {
        error(t("toast.failedCreate"))
      }

      throw err
    } finally {
      loading.value = false
    }
  }

  const updateVoucher = async (id: string, voucherData: VoucherFormData): Promise<Voucher> => {
    if (!canEdit.value) {
      error(t("permission.editVouchers"))
      throw new Error("Permission denied")
    }

    loading.value = true
    try {
      const allVouchers = getAllOfflineVouchers()
      const index = allVouchers.findIndex((voucher) => voucher.id === id)
      if (index === -1) {
        throw new Error("Voucher not found")
      }

      const updatedVoucher: Voucher = {
        ...allVouchers[index],
        ...voucherData,
        code: voucherData.code.toUpperCase(),
        updated_at: new Date().toISOString(),
      }

      if (navigator.onLine) {
        try {
          const response = await axios.put(`/api/vouchers/${id}`, voucherData)
          const savedVoucher = response.data.data || response.data

          await initializeVouchers(paginationMeta.value?.current_page || 1, filters.value.search)
          success(t("toast.voucherUpdated"))
          return savedVoucher
        } catch (apiError: any) {
          console.error("API update failed:", apiError)

          if (apiError.response?.status === 422 && apiError.response?.data?.errors) {
            throw apiError
          }

          allVouchers[index] = updatedVoucher
          localStorage.setItem("allVouchers", JSON.stringify(allVouchers))
          saveLocallyAndQueue(updatedVoucher, "update")
          return updatedVoucher
        }
      } else {
        allVouchers[index] = updatedVoucher
        localStorage.setItem("allVouchers", JSON.stringify(allVouchers))
        saveLocallyAndQueue(updatedVoucher, "update")
        return updatedVoucher
      }
    } catch (err: any) {
      console.error("Failed to update voucher:", err)

      if (!(err.response?.status === 422 && err.response?.data?.errors)) {
        error(t("toast.failedUpdate"))
      }

      throw err
    } finally {
      loading.value = false
    }
  }

  const deleteVoucher = async (id: string): Promise<void> => {
    if (!canDelete.value) {
      error(t("permission.deleteVouchers"))
      throw new Error("Permission denied")
    }

    loading.value = true
    try {
      if (navigator.onLine) {
        try {
          await axios.delete(`/api/vouchers/${id}`)
          await initializeVouchers(paginationMeta.value?.current_page || 1, filters.value.search)
          success(t("toast.voucherDeleted"))
        } catch (apiError) {
          console.warn("API delete failed, marking for deletion:", apiError)
          queueForDeletion(id)
          removeFromLocalCache(id)
          success("Voucher marked for deletion (will sync when online)")
        }
      } else {
        queueForDeletion(id)
        removeFromLocalCache(id)
        success("Voucher marked for deletion (will sync when online)")
      }
    } catch (err) {
      console.error("Failed to delete voucher:", err)
      error(t("toast.failedDelete"))
      throw err
    } finally {
      loading.value = false
    }
  }

  const deleteSelectedVouchers = async (): Promise<void> => {
    if (!canDelete.value) {
      error(t("permission.deleteVouchers"))
      throw new Error("Permission denied")
    }

    if (selectedVouchers.value.length === 0) {
      error("No vouchers selected")
      return
    }

    loading.value = true
    try {
      if (navigator.onLine) {
        try {
          await axios.post("/api/vouchers/bulk-delete", {
            ids: selectedVouchers.value,
          })
          await initializeVouchers(paginationMeta.value?.current_page || 1, filters.value.search)
          success(t("toast.vouchersDeleted"))
        } catch (apiError) {
          console.warn("API bulk delete failed, marking for deletion:", apiError)
          selectedVouchers.value.forEach((id) => {
            queueForDeletion(id)
            removeFromLocalCache(id)
          })
          success(`${selectedVouchers.value.length} vouchers marked for deletion (will sync when online)`)
        }
      } else {
        selectedVouchers.value.forEach((id) => {
          queueForDeletion(id)
          removeFromLocalCache(id)
        })
        success(`${selectedVouchers.value.length} vouchers marked for deletion (will sync when online)`)
      }

      selectedVouchers.value = []
    } catch (err) {
      console.error("Failed to delete selected vouchers:", err)
      error(t("toast.failedDelete"))
      throw err
    } finally {
      loading.value = false
    }
  }

  const removeFromLocalCache = (id: string) => {
    try {
      const allVouchers = getAllOfflineVouchers()
      const filteredVouchers = allVouchers.filter((voucher) => voucher.id !== id)
      localStorage.setItem("allVouchers", JSON.stringify(filteredVouchers))

      vouchers.value = vouchers.value.filter((voucher) => voucher.id !== id)

      const cachedVouchers = localStorage.getItem("vouchers")
      if (cachedVouchers) {
        const parsed = JSON.parse(cachedVouchers)
        if (Array.isArray(parsed)) {
          const filtered = parsed.filter((voucher) => voucher.id !== id)
          localStorage.setItem("vouchers", JSON.stringify(filtered))
        }
      }
    } catch (error) {
      console.error("Failed to remove from local cache:", error)
    }
  }

  const saveLocallyAndQueue = (voucher: Voucher, action: "create" | "update") => {
    try {
      const allVouchers = getAllOfflineVouchers()

      if (action === "create") {
        allVouchers.unshift(voucher)
        vouchers.value.unshift(voucher)
      } else {
        const index = allVouchers.findIndex((v) => v.id === voucher.id)
        if (index !== -1) {
          allVouchers[index] = voucher
        }
        const currentIndex = vouchers.value.findIndex((v) => v.id === voucher.id)
        if (currentIndex !== -1) {
          vouchers.value[currentIndex] = voucher
        }
      }

      localStorage.setItem("allVouchers", JSON.stringify(allVouchers))
      localStorage.setItem("vouchers", JSON.stringify(vouchers.value))

      const syncQueue = JSON.parse(localStorage.getItem("voucherSyncQueue") || "[]")
      const existingIndex = syncQueue.findIndex((item: any) => item.voucher.id === voucher.id && item.action === action)

      const queueItem = {
        voucher,
        action,
        timestamp: Date.now(),
        id: `${voucher.id}_${action}_${Date.now()}`,
      }

      if (existingIndex !== -1) {
        syncQueue[existingIndex] = queueItem
      } else {
        syncQueue.push(queueItem)
      }

      localStorage.setItem("voucherSyncQueue", JSON.stringify(syncQueue))

      success(`Voucher ${action}d locally (will sync when online)`)
    } catch (error) {
      console.error("Failed to save locally and queue:", error)
    }
  }

  const queueForDeletion = (id: string) => {
    try {
      const deleteQueue = JSON.parse(localStorage.getItem("voucherDeleteQueue") || "[]")

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

      localStorage.setItem("voucherDeleteQueue", JSON.stringify(deleteQueue))
    } catch (error) {
      console.error("Failed to queue for deletion:", error)
    }
  }

  const isPendingSync = (voucherId: string): boolean => {
    const syncQueue = JSON.parse(localStorage.getItem("voucherSyncQueue") || "[]")
    const deleteQueue = JSON.parse(localStorage.getItem("voucherDeleteQueue") || "[]")

    return (
      syncQueue.some((item: any) => item.voucher.id === voucherId) ||
      deleteQueue.some((item: any) => item.id === voucherId)
    )
  }

  const syncPendingChanges = async () => {
    if (!navigator.onLine || syncInProgress.value) return

    syncInProgress.value = true
    let syncedCount = 0
    const failedSyncs: any[] = []

    try {
      const syncQueue = JSON.parse(localStorage.getItem("voucherSyncQueue") || "[]")
      const successfulSyncs: any[] = []

      for (const item of syncQueue) {
        try {
          if (item.action === "create") {
            if (item.voucher.id.startsWith("temp_")) {
              const response = await axios.post("/api/vouchers", {
                code: item.voucher.code,
                name: item.voucher.name,
                description: item.voucher.description,
                type: item.voucher.type,
                value: item.voucher.value,
                min_purchase: item.voucher.min_purchase,
                max_discount: item.voucher.max_discount,
                usage_limit: item.voucher.usage_limit,
                start_date: item.voucher.start_date,
                end_date: item.voucher.end_date,
                is_active: item.voucher.is_active,
              })

              const serverVoucher = response.data.data || response.data
              const allVouchers = getAllOfflineVouchers()
              const index = allVouchers.findIndex((v) => v.id === item.voucher.id)
              if (index !== -1) {
                allVouchers[index] = { ...allVouchers[index], id: serverVoucher.id }
                localStorage.setItem("allVouchers", JSON.stringify(allVouchers))
              }
            }
          } else if (item.action === "update") {
            if (!item.voucher.id.startsWith("temp_")) {
              await axios.put(`/api/vouchers/${item.voucher.id}`, {
                code: item.voucher.code,
                name: item.voucher.name,
                description: item.voucher.description,
                type: item.voucher.type,
                value: item.voucher.value,
                min_purchase: item.voucher.min_purchase,
                max_discount: item.voucher.max_discount,
                usage_limit: item.voucher.usage_limit,
                start_date: item.voucher.start_date,
                end_date: item.voucher.end_date,
                is_active: item.voucher.is_active,
              })
            }
          }
          successfulSyncs.push(item)
          syncedCount++
        } catch (syncError: any) {
          console.error("Failed to sync voucher:", syncError)

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
                synced.id === item.id || (synced.voucher.id === item.voucher.id && synced.action === item.action),
            ),
        )
        localStorage.setItem("voucherSyncQueue", JSON.stringify(remainingQueue))
      }

      const deleteQueue = JSON.parse(localStorage.getItem("voucherDeleteQueue") || "[]")
      const successfulDeletes: any[] = []

      for (const item of deleteQueue) {
        try {
          if (!item.id.startsWith("temp_")) {
            await axios.delete(`/api/vouchers/${item.id}`)
          }
          successfulDeletes.push(item)
          syncedCount++
        } catch (syncError: any) {
          console.error("Failed to sync voucher deletion:", syncError)

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
        localStorage.setItem("voucherDeleteQueue", JSON.stringify(remainingDeletes))
      }

      if (failedSyncs.length > 0) {
        localStorage.setItem("voucherSyncFailures", JSON.stringify(failedSyncs))
      } else {
        localStorage.setItem("voucherSyncFailures", JSON.stringify([]))
      }

      syncStatusTrigger.value++

      const isAutoSync = arguments.length === 0 || arguments[0] === true

      if (syncedCount > 0 && !isAutoSync) {
        await initializeVouchers()
        success(t("toast.syncCompleted"))
      } else if (syncedCount > 0 && isAutoSync) {
        await initializeVouchers()
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
    const failures = JSON.parse(localStorage.getItem("voucherSyncFailures") || "[]")
    if (failures.length === 0) {
      info("No sync failures to retry")
      return
    }

    const syncQueue = JSON.parse(localStorage.getItem("voucherSyncQueue") || "[]")
    const deleteQueue = JSON.parse(localStorage.getItem("voucherDeleteQueue") || "[]")

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
          (item: any) => item.voucher.id === failure.voucher.id && item.action === failure.action,
        )
        if (!exists) {
          syncQueue.push({
            voucher: failure.voucher,
            action: failure.action,
            timestamp: Date.now(),
            id: `${failure.voucher.id}_${failure.action}_retry_${Date.now()}`,
          })
          retryCount++
        }
      }
    })

    localStorage.setItem("voucherSyncQueue", JSON.stringify(syncQueue))
    localStorage.setItem("voucherDeleteQueue", JSON.stringify(deleteQueue))
    localStorage.setItem("voucherSyncFailures", JSON.stringify([]))

    if (retryCount > 0) {
      info(`Retrying ${retryCount} failed sync operations...`)
    } else {
      warning("All failed operations are already queued for retry")
    }

    await syncPendingChanges()
  }

  const clearSyncFailures = () => {
    localStorage.setItem("voucherSyncFailures", JSON.stringify([]))
    success("Sync errors cleared")
  }

  const clearAllSyncData = () => {
    localStorage.setItem("voucherSyncQueue", JSON.stringify([]))
    localStorage.setItem("voucherDeleteQueue", JSON.stringify([]))
    localStorage.setItem("voucherSyncFailures", JSON.stringify([]))

    syncInProgress.value = false
    selectedVouchers.value = []
    syncStatusTrigger.value++

    vouchers.value = vouchers.value.map((voucher) => ({
      ...voucher,
      _pendingSync: false,
    }))

    success("All sync data cleared")

    setTimeout(() => {
      syncStatusTrigger.value++
      vouchers.value = [...vouchers.value]
    }, 100)
  }

  const setFilters = async (newFilters: Partial<VoucherFilters>) => {
    filters.value = { ...filters.value, ...newFilters }

    if (searchTimeout) {
      clearTimeout(searchTimeout)
    }

    searchTimeout = setTimeout(async () => {
      await initializeVouchers(1, filters.value.search)
    }, 500)
  }

  const clearFilters = async () => {
    filters.value = {
      search: "",
    }
    await initializeVouchers(1, "")
  }

  const downloadTemplate = () => {
    const csvContent =
      "Code,Name,Description,Type,Value,Min Purchase,Max Discount,Usage Limit,Start Date,End Date,Is Active\nSAVE20,Save 20%,Get 20% discount,percentage,20,100000,50000,100,2024-01-01,2024-12-31,true\nWELCOME50,Welcome Bonus,Welcome bonus 50k,fixed,50000,200000,,50,2024-01-01,2024-12-31,true"
    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "vouchers_template.csv"
    a.click()
    window.URL.revokeObjectURL(url)
    success(t("toast.templateDownloaded"))
  }

  const exportVouchers = async (exportAll = false) => {
    try {
      const params = new URLSearchParams()

      if (!exportAll && filters.value.search) {
        params.append("search", filters.value.search)
      }

      const response = await axios.post(`/api/vouchers/export?${params.toString()}`)

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
      await initializeVouchers(page, filters.value.search)
    }
  }

  const updateSyncStatus = () => {
    syncStatusTrigger.value++
  }

  return {
    vouchers,
    loading,
    filters,
    filteredVouchers,
    paginationMeta,
    paginationLinks,
    shouldShowPagination,
    selectedVouchers,
    canView,
    canCreate,
    canEdit,
    canDelete,
    syncFailures,
    pendingSyncCount,
    hasSyncIssues,
    syncStatusTrigger,
    initializeVouchers,
    addVoucher,
    updateVoucher,
    deleteVoucher,
    deleteSelectedVouchers,
    setFilters,
    clearFilters,
    downloadTemplate,
    exportVouchers,
    syncPendingChanges,
    retrySyncFailures,
    clearSyncFailures,
    clearAllSyncData,
    goToPage,
    updateSyncStatus,
    getSyncAction,
  }
}
