import { ref } from "vue"

const globalLoading = ref(false)
const isOnline = ref(navigator.onLine)
const appInitialized = ref(false)

// Initialize sidebar state from localStorage immediately
const getSavedSidebarState = (): boolean => {
  try {
    const saved = localStorage.getItem("sidebar_open")
    return saved !== null ? saved === "true" : true // Default true jika belum ada
  } catch (error) {
    console.warn("Failed to read sidebar state from localStorage:", error)
    return true // Default fallback
  }
}

const sidebarOpen = ref(getSavedSidebarState())

export function useGlobalState() {
  const setGlobalLoading = (loading: boolean) => {
    globalLoading.value = loading
  }

  const setOnlineStatus = (online: boolean) => {
    isOnline.value = online
  }

  const setSidebarOpen = (open: boolean) => {
    sidebarOpen.value = open
    // Simpan ke localStorage secara sinkron
    try {
      localStorage.setItem("sidebar_open", open.toString())
    } catch (error) {
      console.warn("Failed to save sidebar state to localStorage:", error)
    }
  }

  const loadSidebarState = () => {
    try {
      const saved = localStorage.getItem("sidebar_open")
      if (saved !== null) {
        sidebarOpen.value = saved === "true"
      }
    } catch (error) {
      console.warn("Failed to load sidebar state from localStorage:", error)
    }
  }

  const initializeApp = async () => {
    if (appInitialized.value) return

    try {
      // Initialize app-wide services
      console.log("Initializing application...")

      // Ensure sidebar state is loaded
      loadSidebarState()

      // You can add initialization logic here:
      // - Load user preferences
      // - Initialize analytics
      // - Setup error tracking
      // - Load configuration

      appInitialized.value = true
    } catch (error) {
      console.error("Failed to initialize app:", error)
      throw error
    }
  }

  return {
    globalLoading,
    isOnline,
    appInitialized,
    sidebarOpen,
    setGlobalLoading,
    setOnlineStatus,
    setSidebarOpen,
    loadSidebarState,
    initializeApp,
  }
}
