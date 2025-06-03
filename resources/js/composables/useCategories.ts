"use client"

import { ref, computed } from "vue"
import axios from "axios"
import type { Category, CategoryFormData, CategoryFilters, PaginationMeta, PaginationLinks } from "@/types/Category"
import { useToast } from "@/composables/useToast"
import { useI18n } from "@/composables/useI18n"
import { useAuth } from "@/composables/useAuth"

const categories = ref<Category[]>([])
const loading = ref(false)
const filters = ref<CategoryFilters>({
  search: "",
})
const paginationMeta = ref<PaginationMeta | null>(null)
const paginationLinks = ref<PaginationLinks | null>(null)

// Track sync status
const syncInProgress = ref(false)
const selectedCategories = ref<string[]>([])
const syncStatusTrigger = ref(0) // Trigger untuk force reactivity

// Search debounce
let searchTimeout: NodeJS.Timeout | null = null

// Mock data for offline fallback with pagination
const mockCategories: Category[] = Array.from({ length: 50 }, (_, i) => ({
  id: (i + 1).toString(),
  name: `Category ${i + 1}`,
  description: `Description for category ${i + 1}`,
  created_at: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
  updated_at: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
}))

export function useCategories() {
  const { success, error, info, warning } = useToast()
  const { t } = useI18n()
  const { hasPermission } = useAuth()

  // Permissions
  const canView = computed(() => hasPermission("view categories"))
  const canCreate = computed(() => hasPermission("create categories"))
  const canEdit = computed(() => hasPermission("edit categories"))
  const canDelete = computed(() => hasPermission("delete categories"))

  // Sync details
  const syncFailures = computed(() => {
    syncStatusTrigger.value

    const failures = JSON.parse(localStorage.getItem("categorySyncFailures") || "[]")
    const validFailures = failures.filter((failure: any) => {
      const failureTime = failure.timestamp || Date.now()
      const hoursDiff = (Date.now() - failureTime) / (1000 * 60 * 60)
      return hoursDiff < 24
    })

    if (validFailures.length !== failures.length) {
      localStorage.setItem("categorySyncFailures", JSON.stringify(validFailures))
    }

    return validFailures
  })

  const pendingSyncCount = computed(() => {
    syncStatusTrigger.value

    const syncQueue = JSON.parse(localStorage.getItem("categorySyncQueue") || "[]")
    const deleteQueue = JSON.parse(localStorage.getItem("categoryDeleteQueue") || "[]")

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
      localStorage.setItem("categorySyncQueue", JSON.stringify(validSyncQueue))
    }
    if (validDeleteQueue.length !== deleteQueue.length) {
      localStorage.setItem("categoryDeleteQueue", JSON.stringify(validDeleteQueue))
    }

    return validSyncQueue.length + validDeleteQueue.length
  })

  const hasSyncIssues = computed(() => {
    return syncFailures.value.length > 0 || pendingSyncCount.value > 0
  })

  const getAllOfflineCategories = (): Category[] => {
    try {
      const allCachedCategories = new Map<string, Category>()

      const allCategoriesCache = localStorage.getItem("allCategories")
      if (allCategoriesCache) {
        const parsed = JSON.parse(allCategoriesCache)
        if (Array.isArray(parsed)) {
          parsed.forEach((category) => {
            allCachedCategories.set(category.id, category)
          })
        }
      }

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && key.startsWith("categories_page_")) {
          try {
            const pageCache = JSON.parse(localStorage.getItem(key) || "{}")
            if (pageCache.categories && Array.isArray(pageCache.categories)) {
              pageCache.categories.forEach((category: Category) => {
                allCachedCategories.set(category.id, category)
              })
            }
          } catch (e) {
            console.warn(`Failed to parse cache for ${key}`, e)
          }
        }
      }

      const mergedCategories = Array.from(allCachedCategories.values())

      mergedCategories.sort((a, b) => {
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      })

      if (mergedCategories.length > 0) {
        return mergedCategories
      }

      return [...mockCategories]
    } catch (error) {
      console.error("Failed to get offline categories:", error)
      return [...mockCategories]
    }
  }

  const initializeCategories = async (page = 1, search = "") => {
    if (!canView.value) {
      error(t("permission.viewCategories"))
      return
    }

    loading.value = true
    try {
      categories.value = []

      if (navigator.onLine) {
        try {
          const params = new URLSearchParams({
            page: page.toString(),
          })

          if (search.trim()) {
            params.append("search", search.trim())
          }

          const response = await axios.get(`/api/categories?${params.toString()}`)
          const responseData = response.data

          if (responseData && responseData.data && Array.isArray(responseData.data)) {
            categories.value = responseData.data
            paginationMeta.value = responseData.meta
            paginationLinks.value = responseData.links

            // Cache the current page data
            const cacheKey = `categories_page_${page}_search_${search}`
            localStorage.setItem(
              cacheKey,
              JSON.stringify({
                categories: categories.value,
                meta: paginationMeta.value,
                links: paginationLinks.value,
                timestamp: Date.now(),
              }),
            )
            localStorage.setItem("categories_last_cache_key", cacheKey)

            // Only fetch all data if needed and on first page without search
            const allCategoriesCache = localStorage.getItem("allCategories")
            const lastFullCacheTime = localStorage.getItem("allCategories_last_cache_time")
            const needsFullRefresh =
              !allCategoriesCache ||
              !lastFullCacheTime ||
              Date.now() - Number.parseInt(lastFullCacheTime) > 24 * 60 * 60 * 1000

            if (page === 1 && !search.trim() && needsFullRefresh) {
              setTimeout(async () => {
                try {
                  const allDataResponse = await axios.get("/api/categories?per_page=1000")
                  if (allDataResponse.data && allDataResponse.data.data) {
                    localStorage.setItem("allCategories", JSON.stringify(allDataResponse.data.data))
                    localStorage.setItem("allCategories_last_cache_time", Date.now().toString())
                  }
                } catch (allDataError) {
                  console.warn("Failed to cache all categories:", allDataError)
                }
              }, 1000)
            }
          } else if (Array.isArray(response.data)) {
            categories.value = response.data
            paginationMeta.value = null
            paginationLinks.value = null
          } else {
            console.warn("Unexpected API response format:", responseData)
            categories.value = []
          }
        } catch (apiError) {
          console.warn("API call failed, using cached data:", apiError)
          loadFromCache(page, search)
        }
      } else {
        loadFromCache(page, search)
      }
    } catch (err) {
      console.error("Failed to load categories:", err)
      error(t("toast.failedLoad"))
      categories.value = []
    } finally {
      loading.value = false
    }
  }

  const loadFromCache = (page = 1, search = "") => {
    try {
      // First try to load from specific page cache
      const cacheKey = `categories_page_${page}_search_${search}`
      const pageCache = localStorage.getItem(cacheKey)

      if (pageCache) {
        try {
          const cached = JSON.parse(pageCache)
          const cacheAge = Date.now() - (cached.timestamp || 0)

          // Use cached data if it's less than 1 hour old
          if (cacheAge < 60 * 60 * 1000) {
            categories.value = cached.categories || []
            paginationMeta.value = cached.meta || null
            paginationLinks.value = cached.links || null
            return
          }
        } catch (e) {
          console.warn("Failed to parse page cache:", e)
        }
      }

      // Fallback to getAllOfflineCategories
      const allCategories = getAllOfflineCategories()

      const perPage = 10
      let filteredCategories = allCategories

      if (search.trim()) {
        const searchTerm = search.toLowerCase()
        filteredCategories = allCategories.filter(
          (category) =>
            category.name.toLowerCase().includes(searchTerm) || category.description.toLowerCase().includes(searchTerm),
        )
      }

      const total = filteredCategories.length
      const lastPage = Math.ceil(total / perPage)
      const from = total > 0 ? (page - 1) * perPage + 1 : 0
      const to = Math.min(page * perPage, total)

      const startIndex = (page - 1) * perPage
      const endIndex = startIndex + perPage
      categories.value = filteredCategories.slice(startIndex, endIndex)

      paginationMeta.value = {
        current_page: page,
        from: categories.value.length > 0 ? from : 0,
        last_page: lastPage,
        per_page: perPage,
        to: categories.value.length > 0 ? to : 0,
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
      categories.value = [...mockCategories.slice(0, 10)]

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

  const getSyncAction = (categoryId: string): "create" | "update" | "delete" | null => {
    const syncQueue = JSON.parse(localStorage.getItem("categorySyncQueue") || "[]")
    const deleteQueue = JSON.parse(localStorage.getItem("categoryDeleteQueue") || "[]")

    const deleteItem = deleteQueue.find((item: any) => item.id === categoryId)
    if (deleteItem) return "delete"

    const syncItem = syncQueue.find((item: any) => item.category.id === categoryId)
    if (syncItem) {
      return syncItem.action === "create" ? "create" : "update"
    }

    return null
  }

  const filteredCategories = computed(() => {
    syncStatusTrigger.value

    if (!Array.isArray(categories.value)) {
      console.warn("categories.value is not an array:", categories.value)
      return []
    }

    return categories.value.map((category) => ({
      ...category,
      _pendingSync: isPendingSync(category.id),
      _syncAction: getSyncAction(category.id),
    }))
  })

  const shouldShowPagination = computed(() => {
    return paginationMeta.value && paginationMeta.value.total > 0 && paginationMeta.value.last_page > 1
  })

  const addCategory = async (categoryData: CategoryFormData): Promise<Category> => {
    if (!canCreate.value) {
      error(t("permission.createCategories"))
      throw new Error("Permission denied")
    }

    loading.value = true
    try {
      if (navigator.onLine) {
        try {
          const response = await axios.post("/api/categories", categoryData)
          const savedCategory = response.data.data || response.data

          await initializeCategories(paginationMeta.value?.current_page || 1, filters.value.search)
          success(t("toast.categoryCreated"))
          return savedCategory
        } catch (apiError: any) {
          console.error("API save failed:", apiError)

          if (apiError.response?.status === 422 && apiError.response?.data?.errors) {
            throw apiError
          }

          const newCategory: Category = {
            id: `temp_${Date.now()}`,
            ...categoryData,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }

          saveLocallyAndQueue(newCategory, "create")
          return newCategory
        }
      } else {
        const newCategory: Category = {
          id: `temp_${Date.now()}`,
          ...categoryData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }

        saveLocallyAndQueue(newCategory, "create")
        return newCategory
      }
    } catch (err: any) {
      console.error("Failed to add category:", err)

      if (!(err.response?.status === 422 && err.response?.data?.errors)) {
        error(t("toast.failedCreate"))
      }

      throw err
    } finally {
      loading.value = false
    }
  }

  const updateCategory = async (id: string, categoryData: CategoryFormData): Promise<Category> => {
    if (!canEdit.value) {
      error(t("permission.editCategories"))
      throw new Error("Permission denied")
    }

    loading.value = true
    try {
      const allCategories = getAllOfflineCategories()
      const index = allCategories.findIndex((category) => category.id === id)
      if (index === -1) {
        throw new Error("Category not found")
      }

      const updatedCategory: Category = {
        ...allCategories[index],
        ...categoryData,
        updated_at: new Date().toISOString(),
      }

      if (navigator.onLine) {
        try {
          const response = await axios.put(`/api/categories/${id}`, categoryData)
          const savedCategory = response.data.data || response.data

          await initializeCategories(paginationMeta.value?.current_page || 1, filters.value.search)
          success(t("toast.categoryUpdated"))
          return savedCategory
        } catch (apiError: any) {
          console.error("API update failed:", apiError)

          if (apiError.response?.status === 422 && apiError.response?.data?.errors) {
            throw apiError
          }

          allCategories[index] = updatedCategory
          localStorage.setItem("allCategories", JSON.stringify(allCategories))
          saveLocallyAndQueue(updatedCategory, "update")
          return updatedCategory
        }
      } else {
        allCategories[index] = updatedCategory
        localStorage.setItem("allCategories", JSON.stringify(allCategories))
        saveLocallyAndQueue(updatedCategory, "update")
        return updatedCategory
      }
    } catch (err: any) {
      console.error("Failed to update category:", err)

      if (!(err.response?.status === 422 && err.response?.data?.errors)) {
        error(t("toast.failedUpdate"))
      }

      throw err
    } finally {
      loading.value = false
    }
  }

  const deleteCategory = async (id: string): Promise<void> => {
    if (!canDelete.value) {
      error(t("permission.deleteCategories"))
      throw new Error("Permission denied")
    }

    loading.value = true
    try {
      if (navigator.onLine) {
        try {
          await axios.delete(`/api/categories/${id}`)
          await initializeCategories(paginationMeta.value?.current_page || 1, filters.value.search)
          success(t("toast.categoryDeleted"))
        } catch (apiError) {
          console.warn("API delete failed, marking for deletion:", apiError)
          queueForDeletion(id)
          removeFromLocalCache(id)
          success("Category marked for deletion (will sync when online)")
        }
      } else {
        queueForDeletion(id)
        removeFromLocalCache(id)
        success("Category marked for deletion (will sync when online)")
      }
    } catch (err) {
      console.error("Failed to delete category:", err)
      error(t("toast.failedDelete"))
      throw err
    } finally {
      loading.value = false
    }
  }

  const deleteSelectedCategories = async (): Promise<void> => {
    if (!canDelete.value) {
      error(t("permission.deleteCategories"))
      throw new Error("Permission denied")
    }

    if (selectedCategories.value.length === 0) {
      error("No categories selected")
      return
    }

    loading.value = true
    try {
      if (navigator.onLine) {
        try {
          await axios.post("/api/categories/bulk-delete", {
            ids: selectedCategories.value,
          })
          await initializeCategories(paginationMeta.value?.current_page || 1, filters.value.search)
          success(t("toast.categoriesDeleted"))
        } catch (apiError) {
          console.warn("API bulk delete failed, marking for deletion:", apiError)
          selectedCategories.value.forEach((id) => {
            queueForDeletion(id)
            removeFromLocalCache(id)
          })
          success(`${selectedCategories.value.length} categories marked for deletion (will sync when online)`)
        }
      } else {
        selectedCategories.value.forEach((id) => {
          queueForDeletion(id)
          removeFromLocalCache(id)
        })
        success(`${selectedCategories.value.length} categories marked for deletion (will sync when online)`)
      }

      selectedCategories.value = []
    } catch (err) {
      console.error("Failed to delete selected categories:", err)
      error(t("toast.failedDelete"))
      throw err
    } finally {
      loading.value = false
    }
  }

  const removeFromLocalCache = (id: string) => {
    try {
      const allCategories = getAllOfflineCategories()
      const filteredCategories = allCategories.filter((category) => category.id !== id)
      localStorage.setItem("allCategories", JSON.stringify(filteredCategories))

      categories.value = categories.value.filter((category) => category.id !== id)

      const cachedCategories = localStorage.getItem("categories")
      if (cachedCategories) {
        const parsed = JSON.parse(cachedCategories)
        if (Array.isArray(parsed)) {
          const filtered = parsed.filter((category) => category.id !== id)
          localStorage.setItem("categories", JSON.stringify(filtered))
        }
      }
    } catch (error) {
      console.error("Failed to remove from local cache:", error)
    }
  }

  const saveLocallyAndQueue = (category: Category, action: "create" | "update") => {
    try {
      const allCategories = getAllOfflineCategories()

      if (action === "create") {
        allCategories.unshift(category)
        categories.value.unshift(category)
      } else {
        const index = allCategories.findIndex((c) => c.id === category.id)
        if (index !== -1) {
          allCategories[index] = category
        }
        const currentIndex = categories.value.findIndex((c) => c.id === category.id)
        if (currentIndex !== -1) {
          categories.value[currentIndex] = category
        }
      }

      localStorage.setItem("allCategories", JSON.stringify(allCategories))
      localStorage.setItem("categories", JSON.stringify(categories.value))

      const syncQueue = JSON.parse(localStorage.getItem("categorySyncQueue") || "[]")
      const existingIndex = syncQueue.findIndex(
        (item: any) => item.category.id === category.id && item.action === action,
      )

      const queueItem = {
        category,
        action,
        timestamp: Date.now(),
        id: `${category.id}_${action}_${Date.now()}`,
      }

      if (existingIndex !== -1) {
        syncQueue[existingIndex] = queueItem
      } else {
        syncQueue.push(queueItem)
      }

      localStorage.setItem("categorySyncQueue", JSON.stringify(syncQueue))

      success(`Category ${action}d locally (will sync when online)`)
    } catch (error) {
      console.error("Failed to save locally and queue:", error)
    }
  }

  const queueForDeletion = (id: string) => {
    try {
      const deleteQueue = JSON.parse(localStorage.getItem("categoryDeleteQueue") || "[]")

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

      localStorage.setItem("categoryDeleteQueue", JSON.stringify(deleteQueue))
    } catch (error) {
      console.error("Failed to queue for deletion:", error)
    }
  }

  const isPendingSync = (categoryId: string): boolean => {
    const syncQueue = JSON.parse(localStorage.getItem("categorySyncQueue") || "[]")
    const deleteQueue = JSON.parse(localStorage.getItem("categoryDeleteQueue") || "[]")

    return (
      syncQueue.some((item: any) => item.category.id === categoryId) ||
      deleteQueue.some((item: any) => item.id === categoryId)
    )
  }

  const syncPendingChanges = async () => {
    if (!navigator.onLine || syncInProgress.value) return

    syncInProgress.value = true
    let syncedCount = 0
    const failedSyncs: any[] = []

    try {
      const syncQueue = JSON.parse(localStorage.getItem("categorySyncQueue") || "[]")
      const successfulSyncs: any[] = []

      for (const item of syncQueue) {
        try {
          if (item.action === "create") {
            if (item.category.id.startsWith("temp_")) {
              const response = await axios.post("/api/categories", {
                name: item.category.name,
                description: item.category.description,
              })

              const serverCategory = response.data.data || response.data
              const allCategories = getAllOfflineCategories()
              const index = allCategories.findIndex((c) => c.id === item.category.id)
              if (index !== -1) {
                allCategories[index] = { ...allCategories[index], id: serverCategory.id }
                localStorage.setItem("allCategories", JSON.stringify(allCategories))
              }
            }
          } else if (item.action === "update") {
            if (!item.category.id.startsWith("temp_")) {
              await axios.put(`/api/categories/${item.category.id}`, {
                name: item.category.name,
                description: item.category.description,
              })
            }
          }
          successfulSyncs.push(item)
          syncedCount++
        } catch (syncError: any) {
          console.error("Failed to sync category:", syncError)

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
                synced.id === item.id || (synced.category.id === item.category.id && synced.action === item.action),
            ),
        )
        localStorage.setItem("categorySyncQueue", JSON.stringify(remainingQueue))
      }

      const deleteQueue = JSON.parse(localStorage.getItem("categoryDeleteQueue") || "[]")
      const successfulDeletes: any[] = []

      for (const item of deleteQueue) {
        try {
          if (!item.id.startsWith("temp_")) {
            await axios.delete(`/api/categories/${item.id}`)
          }
          successfulDeletes.push(item)
          syncedCount++
        } catch (syncError: any) {
          console.error("Failed to sync category deletion:", syncError)

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
        localStorage.setItem("categoryDeleteQueue", JSON.stringify(remainingDeletes))
      }

      if (failedSyncs.length > 0) {
        localStorage.setItem("categorySyncFailures", JSON.stringify(failedSyncs))
      } else {
        localStorage.setItem("categorySyncFailures", JSON.stringify([]))
      }

      syncStatusTrigger.value++

      const isAutoSync = arguments.length === 0 || arguments[0] === true

      if (syncedCount > 0 && !isAutoSync) {
        await initializeCategories()
        success(t("toast.syncCompleted"))
      } else if (syncedCount > 0 && isAutoSync) {
        await initializeCategories()
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
    const failures = JSON.parse(localStorage.getItem("categorySyncFailures") || "[]")
    if (failures.length === 0) {
      info("No sync failures to retry")
      return
    }

    const syncQueue = JSON.parse(localStorage.getItem("categorySyncQueue") || "[]")
    const deleteQueue = JSON.parse(localStorage.getItem("categoryDeleteQueue") || "[]")

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
          (item: any) => item.category.id === failure.category.id && item.action === failure.action,
        )
        if (!exists) {
          syncQueue.push({
            category: failure.category,
            action: failure.action,
            timestamp: Date.now(),
            id: `${failure.category.id}_${failure.action}_retry_${Date.now()}`,
          })
          retryCount++
        }
      }
    })

    localStorage.setItem("categorySyncQueue", JSON.stringify(syncQueue))
    localStorage.setItem("categoryDeleteQueue", JSON.stringify(deleteQueue))
    localStorage.setItem("categorySyncFailures", JSON.stringify([]))

    if (retryCount > 0) {
      info(`Retrying ${retryCount} failed sync operations...`)
    } else {
      warning("All failed operations are already queued for retry")
    }

    await syncPendingChanges()
  }

  const clearSyncFailures = () => {
    localStorage.setItem("categorySyncFailures", JSON.stringify([]))
    success("Sync errors cleared")
  }

  const clearAllSyncData = () => {
    localStorage.setItem("categorySyncQueue", JSON.stringify([]))
    localStorage.setItem("categoryDeleteQueue", JSON.stringify([]))
    localStorage.setItem("categorySyncFailures", JSON.stringify([]))

    syncInProgress.value = false
    selectedCategories.value = []
    syncStatusTrigger.value++

    categories.value = categories.value.map((category) => ({
      ...category,
      _pendingSync: false,
    }))

    success("All sync data cleared")

    setTimeout(() => {
      syncStatusTrigger.value++
      categories.value = [...categories.value]
    }, 100)
  }

  const setFilters = async (newFilters: Partial<CategoryFilters>) => {
    filters.value = { ...filters.value, ...newFilters }

    if (searchTimeout) {
      clearTimeout(searchTimeout)
    }

    searchTimeout = setTimeout(async () => {
      await initializeCategories(1, filters.value.search)
    }, 500)
  }

  const clearFilters = async () => {
    filters.value = {
      search: "",
    }
    await initializeCategories(1, "")
  }

  const downloadTemplate = () => {
    const csvContent = "Name,Short Name\nElectronics,ELEC\nClothing,CLOTH\nBooks,BOOK"
    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "categories_template.csv"
    a.click()
    window.URL.revokeObjectURL(url)
    success(t("toast.templateDownloaded"))
  }

  const exportCategories = async (exportAll = false) => {
    try {
      const params = new URLSearchParams()

      if (!exportAll && filters.value.search) {
        params.append("search", filters.value.search)
      }

      const response = await axios.post(`/api/categories/export?${params.toString()}`)

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
      await initializeCategories(page, filters.value.search)
    }
  }

  const updateSyncStatus = () => {
    syncStatusTrigger.value++
  }

  return {
    categories,
    loading,
    filters,
    filteredCategories,
    paginationMeta,
    paginationLinks,
    shouldShowPagination,
    selectedCategories,
    canView,
    canCreate,
    canEdit,
    canDelete,
    syncFailures,
    pendingSyncCount,
    hasSyncIssues,
    syncStatusTrigger,
    initializeCategories,
    addCategory,
    updateCategory,
    deleteCategory,
    deleteSelectedCategories,
    setFilters,
    clearFilters,
    downloadTemplate,
    exportCategories,
    syncPendingChanges,
    retrySyncFailures,
    clearSyncFailures,
    clearAllSyncData,
    goToPage,
    updateSyncStatus,
    getSyncAction,
  }
}
