"use client"

import { ref, computed } from "vue"
import axios from "axios"
import type { Customer, CustomerFormData, CustomerFilters } from "@/types/Customer"
import type { PaginationMeta, PaginationLinks } from "@/types/Pagination"
import { useToast } from "@/composables/useToast"
import { useI18n } from "@/composables/useI18n"
import { useAuth } from "@/composables/useAuth"

// Custom debounce function
function debounce<T extends (...args: any[]) => any>(func: T, wait: number): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout>
  return (...args: Parameters<T>) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

const customers = ref<Customer[]>([])
const loading = ref(false)
const filters = ref<CustomerFilters>({
  search: "",
})
const paginationMeta = ref<PaginationMeta | null>(null)
const paginationLinks = ref<PaginationLinks | null>(null)

// Track sync status
const syncInProgress = ref(false)
const selectedCustomers = ref<string[]>([])
const syncStatusTrigger = ref(0) // Trigger untuk force reactivity

// Search debounce
let searchTimeout: NodeJS.Timeout | null = null

// Mock data for offline fallback with pagination
const mockCustomers: Customer[] = Array.from({ length: 50 }, (_, i) => ({
  id: i + 1,
  name: `Customer ${i + 1}`,
  code: `CUST${String(i + 1).padStart(3, "0")}`,
  contact_person: `Contact Person ${i + 1}`,
  phone: `+62812345${String(i + 1).padStart(4, "0")}`,
  email: `customer${i + 1}@example.com`,
  address: `Address ${i + 1}`,
  city: `City ${i + 1}`,
  country: "Indonesia",
  tax_number: `TAX${String(i + 1).padStart(6, "0")}`,
  customer_type: i % 2 === 0 ? "company" : "individual",
  credit_limit: (i + 1) * 1000000,
  status: i % 3 === 0 ? "inactive" : "active",
  notes: `Notes for customer ${i + 1}`,
  created_at: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
  updated_at: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
}))

export function useCustomers() {
  const { success, error, info, warning } = useToast()
  const { t } = useI18n()
  const { hasPermission } = useAuth()

  // Permissions
  const canView = computed(() => hasPermission("view customers"))
  const canCreate = computed(() => hasPermission("create customers"))
  const canEdit = computed(() => hasPermission("edit customers"))
  const canDelete = computed(() => hasPermission("delete customers"))

  // Sync details
  const syncFailures = computed(() => {
    syncStatusTrigger.value
    const failures = JSON.parse(localStorage.getItem("customerSyncFailures") || "[]")
    const validFailures = failures.filter((failure: any) => {
      const failureTime = failure.timestamp || Date.now()
      const hoursDiff = (Date.now() - failureTime) / (1000 * 60 * 60)
      return hoursDiff < 24
    })

    if (validFailures.length !== failures.length) {
      localStorage.setItem("customerSyncFailures", JSON.stringify(validFailures))
    }

    return validFailures
  })

  const pendingSyncCount = computed(() => {
    syncStatusTrigger.value
    const syncQueue = JSON.parse(localStorage.getItem("customerSyncQueue") || "[]")
    const deleteQueue = JSON.parse(localStorage.getItem("customerDeleteQueue") || "[]")

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
      localStorage.setItem("customerSyncQueue", JSON.stringify(validSyncQueue))
    }
    if (validDeleteQueue.length !== deleteQueue.length) {
      localStorage.setItem("customerDeleteQueue", JSON.stringify(validDeleteQueue))
    }

    return validSyncQueue.length + validDeleteQueue.length
  })

  const hasSyncIssues = computed(() => {
    return syncFailures.value.length > 0 || pendingSyncCount.value > 0
  })

  const getAllOfflineCustomers = (): Customer[] => {
    try {
      const allCachedCustomers = new Map<number, Customer>()

      const allCustomersCache = localStorage.getItem("allCustomers")
      if (allCustomersCache) {
        const parsed = JSON.parse(allCustomersCache)
        if (Array.isArray(parsed)) {
          parsed.forEach((customer) => {
            allCachedCustomers.set(customer.id, customer)
          })
        }
      }

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && key.startsWith("customers_page_")) {
          try {
            const pageCache = JSON.parse(localStorage.getItem(key) || "{}")
            if (pageCache.customers && Array.isArray(pageCache.customers)) {
              pageCache.customers.forEach((customer: Customer) => {
                allCachedCustomers.set(customer.id, customer)
              })
            }
          } catch (e) {
            console.warn(`Failed to parse cache for ${key}`, e)
          }
        }
      }

      const mergedCustomers = Array.from(allCachedCustomers.values())

      mergedCustomers.sort((a, b) => {
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      })

      if (mergedCustomers.length > 0) {
        return mergedCustomers
      }

      return [...mockCustomers]
    } catch (error) {
      console.error("Failed to get offline customers:", error)
      return [...mockCustomers]
    }
  }

  const initializeCustomers = async (page = 1, search = "", filterParams?: CustomerFilters) => {
    if (!canView.value) {
      error(t("permission.viewCustomers"))
      return
    }

    loading.value = true
    try {
      customers.value = []

      if (navigator.onLine) {
        try {
          const params = new URLSearchParams({
            page: page.toString(),
          })

          if (search.trim()) {
            params.append("search", search.trim())
          }

          // Add filter parameters
          if (filterParams?.status) {
            params.append("status", filterParams.status)
          }
          if (filterParams?.customer_type) {
            params.append("customer_type", filterParams.customer_type)
          }
          if (filterParams?.city) {
            params.append("city", filterParams.city)
          }
          if (filterParams?.country) {
            params.append("country", filterParams.country)
          }

          const response = await axios.get(`/api/customers?${params.toString()}`)
          const responseData = response.data

          if (responseData && responseData.data && Array.isArray(responseData.data)) {
            customers.value = responseData.data
            paginationMeta.value = responseData.meta
            paginationLinks.value = responseData.links

            const cacheKey = `customers_page_${page}_search_${search}`
            localStorage.setItem(
              cacheKey,
              JSON.stringify({
                customers: customers.value,
                meta: paginationMeta.value,
                links: paginationLinks.value,
                timestamp: Date.now(),
              }),
            )
            localStorage.setItem("customers_last_cache_key", cacheKey)

            const allCustomersCache = localStorage.getItem("allCustomers")
            const lastFullCacheTime = localStorage.getItem("allCustomers_last_cache_time")
            const needsFullRefresh =
              !allCustomersCache ||
              !lastFullCacheTime ||
              Date.now() - Number.parseInt(lastFullCacheTime) > 24 * 60 * 60 * 1000

            if (page === 1 && !search.trim() && needsFullRefresh) {
              setTimeout(async () => {
                try {
                  const allDataResponse = await axios.get("/api/customers?per_page=1000")
                  if (allDataResponse.data && allDataResponse.data.data) {
                    localStorage.setItem("allCustomers", JSON.stringify(allDataResponse.data.data))
                    localStorage.setItem("allCustomers_last_cache_time", Date.now().toString())
                  }
                } catch (allDataError) {
                  console.warn("Failed to cache all customers:", allDataError)
                }
              }, 1000)
            }
          } else if (Array.isArray(response.data)) {
            customers.value = response.data
            paginationMeta.value = null
            paginationLinks.value = null
          } else {
            console.warn("Unexpected API response format:", responseData)
            customers.value = []
          }
        } catch (apiError) {
          console.warn("API call failed, using cached data:", apiError)
          loadFromCache(page, search)
        }
      } else {
        loadFromCache(page, search)
      }
    } catch (err) {
      console.error("Failed to load customers:", err)
      error(t("toast.failedLoad"))
      customers.value = []
    } finally {
      loading.value = false
    }
  }

  const loadFromCache = (page = 1, search = "") => {
    try {
      const cacheKey = `customers_page_${page}_search_${search}`
      const pageCache = localStorage.getItem(cacheKey)

      if (pageCache) {
        try {
          const cached = JSON.parse(pageCache)
          const cacheAge = Date.now() - (cached.timestamp || 0)

          if (cacheAge < 60 * 60 * 1000) {
            customers.value = cached.customers || []
            paginationMeta.value = cached.meta || null
            paginationLinks.value = cached.links || null
            return
          }
        } catch (e) {
          console.warn("Failed to parse page cache:", e)
        }
      }

      const allCustomers = getAllOfflineCustomers()
      const perPage = 10
      let filteredCustomers = allCustomers

      if (search.trim()) {
        const searchTerm = search.toLowerCase()
        filteredCustomers = allCustomers.filter(
          (customer) =>
            customer.name.toLowerCase().includes(searchTerm) ||
            customer.code.toLowerCase().includes(searchTerm) ||
            customer.email?.toLowerCase().includes(searchTerm) ||
            customer.phone?.toLowerCase().includes(searchTerm),
        )
      }

      const total = filteredCustomers.length
      const lastPage = Math.ceil(total / perPage)
      const from = total > 0 ? (page - 1) * perPage + 1 : 0
      const to = Math.min(page * perPage, total)

      const startIndex = (page - 1) * perPage
      const endIndex = startIndex + perPage
      customers.value = filteredCustomers.slice(startIndex, endIndex)

      paginationMeta.value = {
        current_page: page,
        from: customers.value.length > 0 ? from : 0,
        last_page: lastPage,
        per_page: perPage,
        to: customers.value.length > 0 ? to : 0,
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
      customers.value = [...mockCustomers.slice(0, 10)]

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

  const getSyncAction = (customerId: number): "create" | "update" | "delete" | null => {
    const syncQueue = JSON.parse(localStorage.getItem("customerSyncQueue") || "[]")
    const deleteQueue = JSON.parse(localStorage.getItem("customerDeleteQueue") || "[]")

    const deleteItem = deleteQueue.find((item: any) => item.id === customerId)
    if (deleteItem) return "delete"

    const syncItem = syncQueue.find((item: any) => item.customer.id === customerId)
    if (syncItem) {
      return syncItem.action === "create" ? "create" : "update"
    }

    return null
  }

  const filteredCustomers = computed(() => {
    syncStatusTrigger.value

    if (!Array.isArray(customers.value)) {
      console.warn("customers.value is not an array:", customers.value)
      return []
    }

    return customers.value.map((customer) => ({
      ...customer,
      _pendingSync: isPendingSync(customer.id),
      _syncAction: getSyncAction(customer.id),
    }))
  })

  const shouldShowPagination = computed(() => {
    return paginationMeta.value && paginationMeta.value.total > 0 && paginationMeta.value.last_page > 1
  })

  const addCustomer = async (customerData: CustomerFormData): Promise<Customer> => {
    if (!canCreate.value) {
      error(t("permission.createCustomers"))
      throw new Error("Permission denied")
    }

    loading.value = true
    try {
      if (navigator.onLine) {
        try {
          const response = await axios.post("/api/customers", customerData)
          const savedCustomer = response.data.data || response.data

          await initializeCustomers(paginationMeta.value?.current_page || 1, filters.value.search)
          success(t("toast.customerCreated"))
          return savedCustomer
        } catch (apiError: any) {
          console.error("API save failed:", apiError)

          if (apiError.response?.status === 422 && apiError.response?.data?.errors) {
            throw apiError
          }

          const newCustomer: Customer = {
            id: Date.now(), // Use timestamp as temporary ID
            ...customerData,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }

          saveLocallyAndQueue(newCustomer, "create")
          return newCustomer
        }
      } else {
        const newCustomer: Customer = {
          id: Date.now(),
          ...customerData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }

        saveLocallyAndQueue(newCustomer, "create")
        return newCustomer
      }
    } catch (err: any) {
      console.error("Failed to add customer:", err)

      if (!(err.response?.status === 422 && err.response?.data?.errors)) {
        error(t("toast.failedCreate"))
      }

      throw err
    } finally {
      loading.value = false
    }
  }

  const updateCustomer = async (id: number, customerData: CustomerFormData): Promise<Customer> => {
    if (!canEdit.value) {
      error(t("permission.editCustomers"))
      throw new Error("Permission denied")
    }

    loading.value = true
    try {
      const allCustomers = getAllOfflineCustomers()
      const index = allCustomers.findIndex((customer) => customer.id === id)
      if (index === -1) {
        throw new Error("Customer not found")
      }

      const updatedCustomer: Customer = {
        ...allCustomers[index],
        ...customerData,
        updated_at: new Date().toISOString(),
      }

      if (navigator.onLine) {
        try {
          const response = await axios.put(`/api/customers/${id}`, customerData)
          const savedCustomer = response.data.data || response.data

          await initializeCustomers(paginationMeta.value?.current_page || 1, filters.value.search)
          success(t("toast.customerUpdated"))
          return savedCustomer
        } catch (apiError: any) {
          console.error("API update failed:", apiError)

          if (apiError.response?.status === 422 && apiError.response?.data?.errors) {
            throw apiError
          }

          allCustomers[index] = updatedCustomer
          localStorage.setItem("allCustomers", JSON.stringify(allCustomers))
          saveLocallyAndQueue(updatedCustomer, "update")
          return updatedCustomer
        }
      } else {
        allCustomers[index] = updatedCustomer
        localStorage.setItem("allCustomers", JSON.stringify(allCustomers))
        saveLocallyAndQueue(updatedCustomer, "update")
        return updatedCustomer
      }
    } catch (err: any) {
      console.error("Failed to update customer:", err)

      if (!(err.response?.status === 422 && err.response?.data?.errors)) {
        error(t("toast.failedUpdate"))
      }

      throw err
    } finally {
      loading.value = false
    }
  }

  const deleteCustomer = async (id: number): Promise<void> => {
    if (!canDelete.value) {
      error(t("permission.deleteCustomers"))
      throw new Error("Permission denied")
    }

    loading.value = true
    try {
      if (navigator.onLine) {
        try {
          await axios.delete(`/api/customers/${id}`)
          await initializeCustomers(paginationMeta.value?.current_page || 1, filters.value.search)
          success(t("toast.customerDeleted"))
        } catch (apiError) {
          console.warn("API delete failed, marking for deletion:", apiError)
          queueForDeletion(id)
          removeFromLocalCache(id)
          success("Customer marked for deletion (will sync when online)")
        }
      } else {
        queueForDeletion(id)
        removeFromLocalCache(id)
        success("Customer marked for deletion (will sync when online)")
      }
    } catch (err) {
      console.error("Failed to delete customer:", err)
      error(t("toast.failedDelete"))
      throw err
    } finally {
      loading.value = false
    }
  }

  const deleteSelectedCustomers = async (): Promise<void> => {
    if (!canDelete.value) {
      error(t("permission.deleteCustomers"))
      throw new Error("Permission denied")
    }

    if (selectedCustomers.value.length === 0) {
      error("No customers selected")
      return
    }

    loading.value = true
    try {
      if (navigator.onLine) {
        try {
          await axios.post("/api/customers/bulk-delete", {
            ids: selectedCustomers.value,
          })
          await initializeCustomers(paginationMeta.value?.current_page || 1, filters.value.search)
          success(t("toast.customersDeleted"))
        } catch (apiError) {
          console.warn("API bulk delete failed, marking for deletion:", apiError)
          selectedCustomers.value.forEach((id) => {
            queueForDeletion(Number(id))
            removeFromLocalCache(Number(id))
          })
          success(`${selectedCustomers.value.length} customers marked for deletion (will sync when online)`)
        }
      } else {
        selectedCustomers.value.forEach((id) => {
          queueForDeletion(Number(id))
          removeFromLocalCache(Number(id))
        })
        success(`${selectedCustomers.value.length} customers marked for deletion (will sync when online)`)
      }

      selectedCustomers.value = []
    } catch (err) {
      console.error("Failed to delete selected customers:", err)
      error(t("toast.failedDelete"))
      throw err
    } finally {
      loading.value = false
    }
  }

  const removeFromLocalCache = (id: number) => {
    try {
      const allCustomers = getAllOfflineCustomers()
      const filteredCustomers = allCustomers.filter((customer) => customer.id !== id)
      localStorage.setItem("allCustomers", JSON.stringify(filteredCustomers))

      customers.value = customers.value.filter((customer) => customer.id !== id)

      const cachedCustomers = localStorage.getItem("customers")
      if (cachedCustomers) {
        const parsed = JSON.parse(cachedCustomers)
        if (Array.isArray(parsed)) {
          const filtered = parsed.filter((customer) => customer.id !== id)
          localStorage.setItem("customers", JSON.stringify(filtered))
        }
      }
    } catch (error) {
      console.error("Failed to remove from local cache:", error)
    }
  }

  const saveLocallyAndQueue = (customer: Customer, action: "create" | "update") => {
    try {
      const allCustomers = getAllOfflineCustomers()

      if (action === "create") {
        allCustomers.unshift(customer)
        customers.value.unshift(customer)
      } else {
        const index = allCustomers.findIndex((c) => c.id === customer.id)
        if (index !== -1) {
          allCustomers[index] = customer
        }
        const currentIndex = customers.value.findIndex((c) => c.id === customer.id)
        if (currentIndex !== -1) {
          customers.value[currentIndex] = customer
        }
      }

      localStorage.setItem("allCustomers", JSON.stringify(allCustomers))
      localStorage.setItem("customers", JSON.stringify(customers.value))

      const syncQueue = JSON.parse(localStorage.getItem("customerSyncQueue") || "[]")
      const existingIndex = syncQueue.findIndex(
        (item: any) => item.customer.id === customer.id && item.action === action,
      )

      const queueItem = {
        customer,
        action,
        timestamp: Date.now(),
        id: `${customer.id}_${action}_${Date.now()}`,
      }

      if (existingIndex !== -1) {
        syncQueue[existingIndex] = queueItem
      } else {
        syncQueue.push(queueItem)
      }

      localStorage.setItem("customerSyncQueue", JSON.stringify(syncQueue))

      success(`Customer ${action}d locally (will sync when online)`)
    } catch (error) {
      console.error("Failed to save locally and queue:", error)
    }
  }

  const queueForDeletion = (id: number) => {
    try {
      const deleteQueue = JSON.parse(localStorage.getItem("customerDeleteQueue") || "[]")

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

      localStorage.setItem("customerDeleteQueue", JSON.stringify(deleteQueue))
    } catch (error) {
      console.error("Failed to queue for deletion:", error)
    }
  }

  const isPendingSync = (customerId: number): boolean => {
    const syncQueue = JSON.parse(localStorage.getItem("customerSyncQueue") || "[]")
    const deleteQueue = JSON.parse(localStorage.getItem("customerDeleteQueue") || "[]")

    return (
      syncQueue.some((item: any) => item.customer.id === customerId) ||
      deleteQueue.some((item: any) => item.id === customerId)
    )
  }

  const syncPendingChanges = async () => {
    if (!navigator.onLine || syncInProgress.value) return

    syncInProgress.value = true
    let syncedCount = 0
    const failedSyncs: any[] = []

    try {
      const syncQueue = JSON.parse(localStorage.getItem("customerSyncQueue") || "[]")
      const successfulSyncs: any[] = []

      for (const item of syncQueue) {
        try {
          if (item.action === "create") {
            if (typeof item.customer.id === "number" && item.customer.id > 1000000000) {
              // Temporary ID
              const response = await axios.post("/api/customers", {
                name: item.customer.name,
                code: item.customer.code,
                contact_person: item.customer.contact_person,
                phone: item.customer.phone,
                email: item.customer.email,
                address: item.customer.address,
                city: item.customer.city,
                country: item.customer.country,
                tax_number: item.customer.tax_number,
                customer_type: item.customer.customer_type,
                credit_limit: item.customer.credit_limit,
                status: item.customer.status,
                notes: item.customer.notes,
              })

              const serverCustomer = response.data.data || response.data
              const allCustomers = getAllOfflineCustomers()
              const index = allCustomers.findIndex((c) => c.id === item.customer.id)
              if (index !== -1) {
                allCustomers[index] = { ...allCustomers[index], id: serverCustomer.id }
                localStorage.setItem("allCustomers", JSON.stringify(allCustomers))
              }
            }
          } else if (item.action === "update") {
            if (typeof item.customer.id === "number" && item.customer.id <= 1000000000) {
              // Real ID
              await axios.put(`/api/customers/${item.customer.id}`, {
                name: item.customer.name,
                code: item.customer.code,
                contact_person: item.customer.contact_person,
                phone: item.customer.phone,
                email: item.customer.email,
                address: item.customer.address,
                city: item.customer.city,
                country: item.customer.country,
                tax_number: item.customer.tax_number,
                customer_type: item.customer.customer_type,
                credit_limit: item.customer.credit_limit,
                status: item.customer.status,
                notes: item.customer.notes,
              })
            }
          }
          successfulSyncs.push(item)
          syncedCount++
        } catch (syncError: any) {
          console.error("Failed to sync customer:", syncError)

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
                synced.id === item.id || (synced.customer.id === item.customer.id && synced.action === item.action),
            ),
        )
        localStorage.setItem("customerSyncQueue", JSON.stringify(remainingQueue))
      }

      const deleteQueue = JSON.parse(localStorage.getItem("customerDeleteQueue") || "[]")
      const successfulDeletes: any[] = []

      for (const item of deleteQueue) {
        try {
          if (typeof item.id === "number" && item.id <= 1000000000) {
            // Real ID
            await axios.delete(`/api/customers/${item.id}`)
          }
          successfulDeletes.push(item)
          syncedCount++
        } catch (syncError: any) {
          console.error("Failed to sync customer deletion:", syncError)

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
        localStorage.setItem("customerDeleteQueue", JSON.stringify(remainingDeletes))
      }

      if (failedSyncs.length > 0) {
        localStorage.setItem("customerSyncFailures", JSON.stringify(failedSyncs))
      } else {
        localStorage.setItem("customerSyncFailures", JSON.stringify([]))
      }

      syncStatusTrigger.value++

      const isAutoSync = arguments.length === 0 || arguments[0] === true

      if (syncedCount > 0 && !isAutoSync) {
        await initializeCustomers()
        success(t("toast.syncCompleted"))
      } else if (syncedCount > 0 && isAutoSync) {
        await initializeCustomers()
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
    const failures = JSON.parse(localStorage.getItem("customerSyncFailures") || "[]")
    if (failures.length === 0) {
      info("No sync failures to retry")
      return
    }

    const syncQueue = JSON.parse(localStorage.getItem("customerSyncQueue") || "[]")
    const deleteQueue = JSON.parse(localStorage.getItem("customerDeleteQueue") || "[]")

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
          (item: any) => item.customer.id === failure.customer.id && item.action === failure.action,
        )
        if (!exists) {
          syncQueue.push({
            customer: failure.customer,
            action: failure.action,
            timestamp: Date.now(),
            id: `${failure.customer.id}_${failure.action}_retry_${Date.now()}`,
          })
          retryCount++
        }
      }
    })

    localStorage.setItem("customerSyncQueue", JSON.stringify(syncQueue))
    localStorage.setItem("customerDeleteQueue", JSON.stringify(deleteQueue))
    localStorage.setItem("customerSyncFailures", JSON.stringify([]))

    if (retryCount > 0) {
      info(`Retrying ${retryCount} failed sync operations...`)
    } else {
      warning("All failed operations are already queued for retry")
    }

    await syncPendingChanges()
  }

  const clearSyncFailures = () => {
    localStorage.setItem("customerSyncFailures", JSON.stringify([]))
    success("Sync errors cleared")
  }

  const clearAllSyncData = () => {
    localStorage.setItem("customerSyncQueue", JSON.stringify([]))
    localStorage.setItem("customerDeleteQueue", JSON.stringify([]))
    localStorage.setItem("customerSyncFailures", JSON.stringify([]))

    syncInProgress.value = false
    selectedCustomers.value = []
    syncStatusTrigger.value++

    customers.value = customers.value.map((customer) => ({
      ...customer,
      _pendingSync: false,
    }))

    success("All sync data cleared")

    setTimeout(() => {
      syncStatusTrigger.value++
      customers.value = [...customers.value]
    }, 100)
  }

  const setFilters = async (newFilters: Partial<CustomerFilters>) => {
    filters.value = { ...filters.value, ...newFilters }

    if (searchTimeout) {
      clearTimeout(searchTimeout)
    }

    searchTimeout = setTimeout(async () => {
      await initializeCustomers(1, filters.value.search, filters.value)
    }, 500)
  }

  const clearFilters = async () => {
    filters.value = {
      search: "",
    }
    await initializeCustomers(1, "")
  }

  const downloadTemplate = () => {
    const csvContent =
      "Name,Code,Customer Type,Contact Person,Phone,Email,Address,City,Country,Tax Number,Credit Limit,Status,Notes\nJohn Doe,CUST001,individual,John Doe,+6281234567890,john@example.com,Jl. Example No. 1,Jakarta,Indonesia,TAX001,5000000,active,VIP Customer"
    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "customers_template.csv"
    a.click()
    window.URL.revokeObjectURL(url)
    success(t("toast.templateDownloaded"))
  }

  const exportCustomers = async (exportAll = false) => {
    try {
      const params = new URLSearchParams()

      if (!exportAll && filters.value.search) {
        params.append("search", filters.value.search)
      }

      const response = await axios.post(`/api/customers/export?${params.toString()}`)

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
      await initializeCustomers(page, filters.value.search)
    }
  }

  const updateSyncStatus = () => {
    syncStatusTrigger.value++
  }

  return {
    customers,
    loading,
    filters,
    filteredCustomers,
    paginationMeta,
    paginationLinks,
    shouldShowPagination,
    selectedCustomers,
    canView,
    canCreate,
    canEdit,
    canDelete,
    syncFailures,
    pendingSyncCount,
    hasSyncIssues,
    syncStatusTrigger,
    initializeCustomers,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    deleteSelectedCustomers,
    setFilters,
    clearFilters,
    downloadTemplate,
    exportCustomers,
    syncPendingChanges,
    retrySyncFailures,
    clearSyncFailures,
    clearAllSyncData,
    goToPage,
    updateSyncStatus,
    getSyncAction,
  }
}
