"use client"

import { ref, computed } from "vue"
import axios from "axios"
import type { Product, ProductFilters, PaginationMeta, PaginationLinks } from "@/types/Product"
import { useToast } from "@/composables/useToast"
import { useI18n } from "@/composables/useI18n"
import { useAuth } from "@/composables/useAuth"

const products = ref<Product[]>([])
const loading = ref(false)
const filters = ref<ProductFilters>({
  search: "",
})
const paginationMeta = ref<PaginationMeta | null>(null)
const paginationLinks = ref<PaginationLinks | null>(null)

// Track sync status
const syncInProgress = ref(false)
const selectedProducts = ref<string[]>([])
const syncStatusTrigger = ref(0) // Trigger untuk force reactivity

// Search debounce
let searchTimeout: NodeJS.Timeout | null = null

// Mock data for offline fallback with pagination
const mockProducts: Product[] = Array.from({ length: 50 }, (_, i) => ({
  id: (i + 1).toString(),
  name: `Product ${i + 1}`,
  sku: `PRD${String(i + 1).padStart(3, "0")}`,
  description: `Description for product ${i + 1}`,
  price: Math.floor(Math.random() * 100000) + 10000,
  stock: Math.floor(Math.random() * 100) + 1,
  unit_id: "1",
  category_id: "1",
  brand_id: "1",
  status: i % 2 === 0 ? "active" : "inactive",
  created_at: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
  updated_at: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
  unit: { id: "1", name: "Piece", short_name: "PCS" },
  category: { id: "1", name: "General" },
  brand: { id: "1", name: "Generic" },
}))

export function useProducts() {
  const { success, error, info, warning } = useToast()
  const { t } = useI18n()
  const { hasPermission } = useAuth()

  // Permissions
  const canView = computed(() => hasPermission("view products"))
  const canCreate = computed(() => hasPermission("create products"))
  const canEdit = computed(() => hasPermission("edit products"))
  const canDelete = computed(() => hasPermission("delete products"))

  // Sync details
  const syncFailures = computed(() => {
    syncStatusTrigger.value

    const failures = JSON.parse(localStorage.getItem("productSyncFailures") || "[]")
    const validFailures = failures.filter((failure: any) => {
      const failureTime = failure.timestamp || Date.now()
      const hoursDiff = (Date.now() - failureTime) / (1000 * 60 * 60)
      return hoursDiff < 24
    })

    if (validFailures.length !== failures.length) {
      localStorage.setItem("productSyncFailures", JSON.stringify(validFailures))
    }

    return validFailures
  })

  const pendingSyncCount = computed(() => {
    syncStatusTrigger.value

    const syncQueue = JSON.parse(localStorage.getItem("productSyncQueue") || "[]")
    const deleteQueue = JSON.parse(localStorage.getItem("productDeleteQueue") || "[]")

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
      localStorage.setItem("productSyncQueue", JSON.stringify(validSyncQueue))
    }
    if (validDeleteQueue.length !== deleteQueue.length) {
      localStorage.setItem("productDeleteQueue", JSON.stringify(validDeleteQueue))
    }

    return validSyncQueue.length + validDeleteQueue.length
  })

  const hasSyncIssues = computed(() => {
    return syncFailures.value.length > 0 || pendingSyncCount.value > 0
  })

  const getAllOfflineProducts = (): Product[] => {
    try {
      const allCachedProducts = new Map<string, Product>()

      const allProductsCache = localStorage.getItem("allProducts")
      if (allProductsCache) {
        const parsed = JSON.parse(allProductsCache)
        if (Array.isArray(parsed)) {
          parsed.forEach((product) => {
            allCachedProducts.set(product.id, product)
          })
        }
      }

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && key.startsWith("products_page_")) {
          try {
            const pageCache = JSON.parse(localStorage.getItem(key) || "{}")
            if (pageCache.products && Array.isArray(pageCache.products)) {
              pageCache.products.forEach((product: Product) => {
                allCachedProducts.set(product.id, product)
              })
            }
          } catch (e) {
            console.warn(`Failed to parse cache for ${key}`, e)
          }
        }
      }

      const mergedProducts = Array.from(allCachedProducts.values())

      mergedProducts.sort((a, b) => {
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      })

      if (mergedProducts.length > 0) {
        return mergedProducts
      }

      return [...mockProducts]
    } catch (error) {
      console.error("Failed to get offline products:", error)
      return [...mockProducts]
    }
  }

  const initializeProducts = async (page = 1, search = "") => {
    if (!canView.value) {
      error(t("permission.viewProducts"))
      return
    }

    loading.value = true
    try {
      products.value = []

      if (navigator.onLine) {
        try {
          const params = new URLSearchParams({
            page: page.toString(),
          })

          if (search.trim()) {
            params.append("search", search.trim())
          }

          if (filters.value.status) {
            params.append("status", filters.value.status)
          }

          if (filters.value.unit_id) {
            params.append("unit_id", filters.value.unit_id)
          }

          if (filters.value.category_id) {
            params.append("category_id", filters.value.category_id)
          }

          if (filters.value.brand_id) {
            params.append("brand_id", filters.value.brand_id)
          }

          const response = await axios.get(`/api/products?${params.toString()}`)
          const responseData = response.data

          if (responseData && responseData.data && Array.isArray(responseData.data)) {
            products.value = responseData.data
            paginationMeta.value = responseData.meta
            paginationLinks.value = responseData.links

            // Cache the current page data
            const cacheKey = `products_page_${page}_search_${search}`
            localStorage.setItem(
              cacheKey,
              JSON.stringify({
                products: products.value,
                meta: paginationMeta.value,
                links: paginationLinks.value,
                timestamp: Date.now(),
              }),
            )
            localStorage.setItem("products_last_cache_key", cacheKey)

            // Only fetch all data if needed and on first page without search
            const allProductsCache = localStorage.getItem("allProducts")
            const lastFullCacheTime = localStorage.getItem("allProducts_last_cache_time")
            const needsFullRefresh =
              !allProductsCache ||
              !lastFullCacheTime ||
              Date.now() - Number.parseInt(lastFullCacheTime) > 24 * 60 * 60 * 1000

            if (page === 1 && !search.trim() && needsFullRefresh) {
              setTimeout(async () => {
                try {
                  const allDataResponse = await axios.get("/api/products?per_page=1000")
                  if (allDataResponse.data && allDataResponse.data.data) {
                    localStorage.setItem("allProducts", JSON.stringify(allDataResponse.data.data))
                    localStorage.setItem("allProducts_last_cache_time", Date.now().toString())
                  }
                } catch (allDataError) {
                  console.warn("Failed to cache all products:", allDataError)
                }
              }, 1000)
            }
          } else if (Array.isArray(response.data)) {
            products.value = response.data
            paginationMeta.value = null
            paginationLinks.value = null
          } else {
            console.warn("Unexpected API response format:", responseData)
            products.value = []
          }
        } catch (apiError) {
          console.warn("API call failed, using cached data:", apiError)
          loadFromCache(page, search)
        }
      } else {
        loadFromCache(page, search)
      }
    } catch (err) {
      console.error("Failed to load products:", err)
      error(t("toast.failedLoad"))
      products.value = []
    } finally {
      loading.value = false
    }
  }

  const loadFromCache = (page = 1, search = "") => {
    try {
      // First try to load from specific page cache
      const cacheKey = `products_page_${page}_search_${search}`
      const pageCache = localStorage.getItem(cacheKey)

      if (pageCache) {
        try {
          const cached = JSON.parse(pageCache)
          const cacheAge = Date.now() - (cached.timestamp || 0)

          // Use cached data if it's less than 1 hour old
          if (cacheAge < 60 * 60 * 1000) {
            products.value = cached.products || []
            paginationMeta.value = cached.meta || null
            paginationLinks.value = cached.links || null
            return
          }
        } catch (e) {
          console.warn("Failed to parse page cache:", e)
        }
      }

      // Fallback to getAllOfflineProducts
      const allProducts = getAllOfflineProducts()

      const perPage = 10
      let filteredProducts = allProducts

      if (search.trim()) {
        const searchTerm = search.toLowerCase()
        filteredProducts = allProducts.filter(
          (product) =>
            product.name.toLowerCase().includes(searchTerm) ||
            product.sku.toLowerCase().includes(searchTerm) ||
            (product.description && product.description.toLowerCase().includes(searchTerm)),
        )
      }

      if (filters.value.status) {
        filteredProducts = filteredProducts.filter((product) => product.status === filters.value.status)
      }

      if (filters.value.unit_id) {
        filteredProducts = filteredProducts.filter((product) => product.unit_id === filters.value.unit_id)
      }

      if (filters.value.category_id) {
        filteredProducts = filteredProducts.filter((product) => product.category_id === filters.value.category_id)
      }

      if (filters.value.brand_id) {
        filteredProducts = filteredProducts.filter((product) => product.brand_id === filters.value.brand_id)
      }

      const total = filteredProducts.length
      const lastPage = Math.ceil(total / perPage)
      const from = total > 0 ? (page - 1) * perPage + 1 : 0
      const to = Math.min(page * perPage, total)

      const startIndex = (page - 1) * perPage
      const endIndex = startIndex + perPage
      products.value = filteredProducts.slice(startIndex, endIndex)

      paginationMeta.value = {
        current_page: page,
        from: products.value.length > 0 ? from : 0,
        last_page: lastPage,
        per_page: perPage,
        to: products.value.length > 0 ? to : 0,
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
      products.value = [...mockProducts.slice(0, 10)]

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

  const getSyncAction = (productId: string): "create" | "update" | "delete" | null => {
    const syncQueue = JSON.parse(localStorage.getItem("productSyncQueue") || "[]")
    const deleteQueue = JSON.parse(localStorage.getItem("productDeleteQueue") || "[]")

    const deleteItem = deleteQueue.find((item: any) => item.id === productId)
    if (deleteItem) return "delete"

    const syncItem = syncQueue.find((item: any) => item.product.id === productId)
    if (syncItem) {
      return syncItem.action === "create" ? "create" : "update"
    }

    return null
  }

  const filteredProducts = computed(() => {
    syncStatusTrigger.value

    if (!Array.isArray(products.value)) {
      console.warn("products.value is not an array:", products.value)
      return []
    }

    return products.value.map((product) => ({
      ...product,
      _pendingSync: isPendingSync(product.id),
      _syncAction: getSyncAction(product.id),
    }))
  })

  const shouldShowPagination = computed(() => {
    return paginationMeta.value && paginationMeta.value.total > 0 && paginationMeta.value.last_page > 1
  })

  // Update the addProduct function to handle base64 images
  const addProduct = async (productData: any): Promise<Product> => {
    if (!canCreate.value) {
      error(t("permission.createProducts"))
      throw new Error("Permission denied")
    }

    loading.value = true
    try {
      if (navigator.onLine) {
        try {
          // Prepare the payload with base64 images
          const payload = {
            ...productData,
            // Images are already in the correct format from ProductFormPage
          }

          const response = await axios.post("/api/products", payload, {
            headers: {
              "Content-Type": "application/json",
            },
          })
          const savedProduct = response.data.data || response.data

          await initializeProducts(paginationMeta.value?.current_page || 1, filters.value.search)
          success(t("toast.productCreated"))
          return savedProduct
        } catch (apiError: any) {
          console.error("API save failed:", apiError)

          if (apiError.response?.status === 422 && apiError.response?.data?.errors) {
            throw apiError
          }

          const newProduct: Product = {
            id: `temp_${Date.now()}`,
            name: productData.name,
            sku: productData.sku,
            variant_name: productData.variant_name,
            description: productData.description,
            price: productData.price,
            purchase_price: productData.purchase_price,
            stock: productData.stock,
            min_stock: productData.min_stock,
            unit_id: productData.unit_id,
            category_id: productData.category_id,
            brand_id: productData.brand_id,
            status: productData.status,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }

          saveLocallyAndQueue(newProduct, "create")
          return newProduct
        }
      } else {
        const newProduct: Product = {
          id: `temp_${Date.now()}`,
          name: productData.name,
          sku: productData.sku,
          variant_name: productData.variant_name,
          description: productData.description,
          price: productData.price,
          purchase_price: productData.purchase_price,
          stock: productData.stock,
          min_stock: productData.min_stock,
          unit_id: productData.unit_id,
          category_id: productData.category_id,
          brand_id: productData.brand_id,
          status: productData.status,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }

        saveLocallyAndQueue(newProduct, "create")
        return newProduct
      }
    } catch (err: any) {
      console.error("Failed to add product:", err)

      if (!(err.response?.status === 422 && err.response?.data?.errors)) {
        error(t("toast.failedCreate"))
      }

      throw err
    } finally {
      loading.value = false
    }
  }

  // Update the updateProduct function to handle base64 images
  const updateProduct = async (id: string, productData: any): Promise<Product> => {
    if (!canEdit.value) {
      error(t("permission.editProducts"))
      throw new Error("Permission denied")
    }

    loading.value = true
    try {
      const allProducts = getAllOfflineProducts()
      const index = allProducts.findIndex((product) => product.id === id)
      if (index === -1) {
        throw new Error("Product not found")
      }

      const updatedProduct: Product = {
        ...allProducts[index],
        name: productData.name,
        sku: productData.sku,
        variant_name: productData.variant_name,
        description: productData.description,
        price: productData.price,
        purchase_price: productData.purchase_price,
        stock: productData.stock,
        min_stock: productData.min_stock,
        unit_id: productData.unit_id,
        category_id: productData.category_id,
        brand_id: productData.brand_id,
        status: productData.status,
        updated_at: new Date().toISOString(),
      }

      if (navigator.onLine) {
        try {
          // Prepare the payload with base64 images
          const payload = {
            ...productData,
            // Images are already in the correct format from ProductFormPage
          }

          const response = await axios.put(`/api/products/${id}`, payload, {
            headers: {
              "Content-Type": "application/json",
            },
          })
          const savedProduct = response.data.data || response.data

          await initializeProducts(paginationMeta.value?.current_page || 1, filters.value.search)
          success(t("toast.productUpdated"))
          return savedProduct
        } catch (apiError: any) {
          console.error("API update failed:", apiError)

          if (apiError.response?.status === 422 && apiError.response?.data?.errors) {
            throw apiError
          }

          allProducts[index] = updatedProduct
          localStorage.setItem("allProducts", JSON.stringify(allProducts))
          saveLocallyAndQueue(updatedProduct, "update")
          return updatedProduct
        }
      } else {
        allProducts[index] = updatedProduct
        localStorage.setItem("allProducts", JSON.stringify(allProducts))
        saveLocallyAndQueue(updatedProduct, "update")
        return updatedProduct
      }
    } catch (err: any) {
      console.error("Failed to update product:", err)

      if (!(err.response?.status === 422 && err.response?.data?.errors)) {
        error(t("toast.failedUpdate"))
      }

      throw err
    } finally {
      loading.value = false
    }
  }

  const deleteProduct = async (id: string): Promise<void> => {
    if (!canDelete.value) {
      error(t("permission.deleteProducts"))
      throw new Error("Permission denied")
    }

    loading.value = true
    try {
      if (navigator.onLine) {
        try {
          await axios.delete(`/api/products/${id}`)
          await initializeProducts(paginationMeta.value?.current_page || 1, filters.value.search)
          success(t("toast.productDeleted"))
        } catch (apiError) {
          console.warn("API delete failed, marking for deletion:", apiError)
          queueForDeletion(id)
          removeFromLocalCache(id)
          success("Product marked for deletion (will sync when online)")
        }
      } else {
        queueForDeletion(id)
        removeFromLocalCache(id)
        success("Product marked for deletion (will sync when online)")
      }
    } catch (err) {
      console.error("Failed to delete product:", err)
      error(t("toast.failedDelete"))
      throw err
    } finally {
      loading.value = false
    }
  }

  const deleteSelectedProducts = async (): Promise<void> => {
    if (!canDelete.value) {
      error(t("permission.deleteProducts"))
      throw new Error("Permission denied")
    }

    if (selectedProducts.value.length === 0) {
      error("No products selected")
      return
    }

    loading.value = true
    try {
      if (navigator.onLine) {
        try {
          await axios.post("/api/products/bulk-delete", {
            ids: selectedProducts.value,
          })
          await initializeProducts(paginationMeta.value?.current_page || 1, filters.value.search)
          success(t("toast.productsDeleted"))
        } catch (apiError) {
          console.warn("API bulk delete failed, marking for deletion:", apiError)
          selectedProducts.value.forEach((id) => {
            queueForDeletion(id)
            removeFromLocalCache(id)
          })
          success(`${selectedProducts.value.length} products marked for deletion (will sync when online)`)
        }
      } else {
        selectedProducts.value.forEach((id) => {
          queueForDeletion(id)
          removeFromLocalCache(id)
        })
        success(`${selectedProducts.value.length} products marked for deletion (will sync when online)`)
      }

      selectedProducts.value = []
    } catch (err) {
      console.error("Failed to delete selected products:", err)
      error(t("toast.failedDelete"))
      throw err
    } finally {
      loading.value = false
    }
  }

  const removeFromLocalCache = (id: string) => {
    try {
      const allProducts = getAllOfflineProducts()
      const filteredProducts = allProducts.filter((product) => product.id !== id)
      localStorage.setItem("allProducts", JSON.stringify(filteredProducts))

      products.value = products.value.filter((product) => product.id !== id)

      const cachedProducts = localStorage.getItem("products")
      if (cachedProducts) {
        const parsed = JSON.parse(cachedProducts)
        if (Array.isArray(parsed)) {
          const filtered = parsed.filter((product) => product.id !== id)
          localStorage.setItem("products", JSON.stringify(filtered))
        }
      }
    } catch (error) {
      console.error("Failed to remove from local cache:", error)
    }
  }

  const saveLocallyAndQueue = (product: Product, action: "create" | "update") => {
    try {
      const allProducts = getAllOfflineProducts()

      if (action === "create") {
        allProducts.unshift(product)
        products.value.unshift(product)
      } else {
        const index = allProducts.findIndex((u) => u.id === product.id)
        if (index !== -1) {
          allProducts[index] = product
        }
        const currentIndex = products.value.findIndex((u) => u.id === product.id)
        if (currentIndex !== -1) {
          products.value[currentIndex] = product
        }
      }

      localStorage.setItem("allProducts", JSON.stringify(allProducts))
      localStorage.setItem("products", JSON.stringify(products.value))

      const syncQueue = JSON.parse(localStorage.getItem("productSyncQueue") || "[]")
      const existingIndex = syncQueue.findIndex((item: any) => item.product.id === product.id && item.action === action)

      const queueItem = {
        product,
        action,
        timestamp: Date.now(),
        id: `${product.id}_${action}_${Date.now()}`,
      }

      if (existingIndex !== -1) {
        syncQueue[existingIndex] = queueItem
      } else {
        syncQueue.push(queueItem)
      }

      localStorage.setItem("productSyncQueue", JSON.stringify(syncQueue))

      success(`Product ${action}d locally (will sync when online)`)
    } catch (error) {
      console.error("Failed to save locally and queue:", error)
    }
  }

  const queueForDeletion = (id: string) => {
    try {
      const deleteQueue = JSON.parse(localStorage.getItem("productDeleteQueue") || "[]")

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

      localStorage.setItem("productDeleteQueue", JSON.stringify(deleteQueue))
    } catch (error) {
      console.error("Failed to queue for deletion:", error)
    }
  }

  const isPendingSync = (productId: string): boolean => {
    const syncQueue = JSON.parse(localStorage.getItem("productSyncQueue") || "[]")
    const deleteQueue = JSON.parse(localStorage.getItem("productDeleteQueue") || "[]")

    return (
      syncQueue.some((item: any) => item.product.id === productId) ||
      deleteQueue.some((item: any) => item.id === productId)
    )
  }

  const syncPendingChanges = async () => {
    if (!navigator.onLine || syncInProgress.value) return

    syncInProgress.value = true
    let syncedCount = 0
    const failedSyncs: any[] = []

    try {
      const syncQueue = JSON.parse(localStorage.getItem("productSyncQueue") || "[]")
      const successfulSyncs: any[] = []

      for (const item of syncQueue) {
        try {
          if (item.action === "create") {
            if (item.product.id.startsWith("temp_")) {
              const response = await axios.post("/api/products", {
                name: item.product.name,
                sku: item.product.sku,
                description: item.product.description,
                price: item.product.price,
                stock: item.product.stock,
                unit_id: item.product.unit_id,
                category_id: item.product.category_id,
                brand_id: item.product.brand_id,
                status: item.product.status,
              })

              const serverProduct = response.data.data || response.data
              const allProducts = getAllOfflineProducts()
              const index = allProducts.findIndex((u) => u.id === item.product.id)
              if (index !== -1) {
                allProducts[index] = { ...allProducts[index], id: serverProduct.id }
                localStorage.setItem("allProducts", JSON.stringify(allProducts))
              }
            }
          } else if (item.action === "update") {
            if (!item.product.id.startsWith("temp_")) {
              await axios.put(`/api/products/${item.product.id}`, {
                name: item.product.name,
                sku: item.product.sku,
                description: item.product.description,
                price: item.product.price,
                stock: item.product.stock,
                unit_id: item.product.unit_id,
                category_id: item.product.category_id,
                brand_id: item.product.brand_id,
                status: item.product.status,
              })
            }
          }
          successfulSyncs.push(item)
          syncedCount++
        } catch (syncError: any) {
          console.error("Failed to sync product:", syncError)

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
                synced.id === item.id || (synced.product.id === item.product.id && synced.action === item.action),
            ),
        )
        localStorage.setItem("productSyncQueue", JSON.stringify(remainingQueue))
      }

      const deleteQueue = JSON.parse(localStorage.getItem("productDeleteQueue") || "[]")
      const successfulDeletes: any[] = []

      for (const item of deleteQueue) {
        try {
          if (!item.id.startsWith("temp_")) {
            await axios.delete(`/api/products/${item.id}`)
          }
          successfulDeletes.push(item)
          syncedCount++
        } catch (syncError: any) {
          console.error("Failed to sync product deletion:", syncError)

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
        localStorage.setItem("productDeleteQueue", JSON.stringify(remainingDeletes))
      }

      if (failedSyncs.length > 0) {
        localStorage.setItem("productSyncFailures", JSON.stringify(failedSyncs))
      } else {
        localStorage.setItem("productSyncFailures", JSON.stringify([]))
      }

      syncStatusTrigger.value++

      const isAutoSync = arguments.length === 0 || arguments[0] === true

      if (syncedCount > 0 && !isAutoSync) {
        await initializeProducts()
        success(t("toast.syncCompleted"))
      } else if (syncedCount > 0 && isAutoSync) {
        await initializeProducts()
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
    const failures = JSON.parse(localStorage.getItem("productSyncFailures") || "[]")
    if (failures.length === 0) {
      info("No sync failures to retry")
      return
    }

    const syncQueue = JSON.parse(localStorage.getItem("productSyncQueue") || "[]")
    const deleteQueue = JSON.parse(localStorage.getItem("productDeleteQueue") || "[]")

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
          (item: any) => item.product.id === failure.product.id && item.action === failure.action,
        )
        if (!exists) {
          syncQueue.push({
            product: failure.product,
            action: failure.action,
            timestamp: Date.now(),
            id: `${failure.product.id}_${failure.action}_retry_${Date.now()}`,
          })
          retryCount++
        }
      }
    })

    localStorage.setItem("productSyncQueue", JSON.stringify(syncQueue))
    localStorage.setItem("productDeleteQueue", JSON.stringify(deleteQueue))
    localStorage.setItem("productSyncFailures", JSON.stringify([]))

    if (retryCount > 0) {
      info(`Retrying ${retryCount} failed sync operations...`)
    } else {
      warning("All failed operations are already queued for retry")
    }

    await syncPendingChanges()
  }

  const clearSyncFailures = () => {
    localStorage.setItem("productSyncFailures", JSON.stringify([]))
    success("Sync errors cleared")
  }

  const clearAllSyncData = () => {
    localStorage.setItem("productSyncQueue", JSON.stringify([]))
    localStorage.setItem("productDeleteQueue", JSON.stringify([]))
    localStorage.setItem("productSyncFailures", JSON.stringify([]))

    syncInProgress.value = false
    selectedProducts.value = []
    syncStatusTrigger.value++

    products.value = products.value.map((product) => ({
      ...product,
      _pendingSync: false,
    }))

    success("All sync data cleared")

    setTimeout(() => {
      syncStatusTrigger.value++
      products.value = [...products.value]
    }, 100)
  }

  const setFilters = async (newFilters: Partial<ProductFilters>) => {
    filters.value = { ...filters.value, ...newFilters }

    if (searchTimeout) {
      clearTimeout(searchTimeout)
    }

    searchTimeout = setTimeout(async () => {
      await initializeProducts(1, filters.value.search)
    }, 500)
  }

  const clearFilters = async () => {
    filters.value = {
      search: "",
    }
    await initializeProducts(1, "")
  }

  const downloadTemplate = () => {
    const csvContent =
      "Name,SKU,Description,Price,Stock,Unit ID,Category ID,Brand ID,Status\nSample Product,PRD001,Sample description,10000,100,1,1,1,active"
    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "products_template.csv"
    a.click()
    window.URL.revokeObjectURL(url)
    success(t("toast.templateDownloaded"))
  }

  const exportProducts = async (exportAll = false) => {
    try {
      const params = new URLSearchParams()

      if (!exportAll && filters.value.search) {
        params.append("search", filters.value.search)
      }

      const response = await axios.post(`/api/products/export?${params.toString()}`)

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
      await initializeProducts(page, filters.value.search)
    }
  }

  const updateSyncStatus = () => {
    syncStatusTrigger.value++
  }

  // New method from the simplified version
  const getProductById = async (id: string): Promise<Product | null> => {
    try {
      // First check local cache
      const allProducts = getAllOfflineProducts()
      const localProduct = allProducts.find((p) => p.id === id)

      if (localProduct) {
        return localProduct
      }

      // If not found locally and online, fetch from API
      if (navigator.onLine) {
        try {
          const response = await axios.get(`/api/products/${id}`)
          const product = response.data.data || response.data
          return product
        } catch (err) {
          console.error("Error fetching product from API:", err)
          return null
        }
      }

      return null
    } catch (error) {
      console.error("Error fetching product:", error)
      return null
    }
  }

  return {
    products,
    loading,
    filters,
    filteredProducts,
    paginationMeta,
    paginationLinks,
    shouldShowPagination,
    selectedProducts,
    canView,
    canCreate,
    canEdit,
    canDelete,
    syncFailures,
    pendingSyncCount,
    hasSyncIssues,
    syncStatusTrigger,
    initializeProducts,
    addProduct,
    updateProduct,
    deleteProduct,
    deleteSelectedProducts,
    setFilters,
    clearFilters,
    downloadTemplate,
    exportProducts,
    syncPendingChanges,
    retrySyncFailures,
    clearSyncFailures,
    clearAllSyncData,
    goToPage,
    updateSyncStatus,
    getSyncAction,
    getProductById, // New method added from the simplified version
  }
}
