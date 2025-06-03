import { defineStore } from "pinia"
import { ref, watch } from "vue"

export const useSidebarStore = defineStore("sidebar", () => {
  // Initialize from localStorage or default to true
  const getInitialState = (): boolean => {
    try {
      const saved = localStorage.getItem("sidebar_state")
      const state = saved !== null ? JSON.parse(saved) : true
      console.log("🔄 Sidebar initial state loaded from localStorage:", state)
      return state
    } catch (e) {
      console.error("❌ Error reading sidebar state from localStorage:", e)
      return true
    }
  }

  const isOpen = ref(getInitialState())

  // Persist state changes to localStorage with debounce
  let saveTimeout: NodeJS.Timeout | null = null

  watch(
    isOpen,
    (newState) => {
      // Clear previous timeout
      if (saveTimeout) {
        clearTimeout(saveTimeout)
      }

      // Debounce save to prevent excessive localStorage writes
      saveTimeout = setTimeout(() => {
        try {
          localStorage.setItem("sidebar_state", JSON.stringify(newState))
          console.log("💾 Sidebar state saved to localStorage:", newState)
        } catch (e) {
          console.error("❌ Error saving sidebar state to localStorage:", e)
        }
      }, 100)
    },
    { immediate: false },
  )

  function toggle() {
    const newState = !isOpen.value
    console.log("🔄 Sidebar toggle:", isOpen.value, "→", newState)
    isOpen.value = newState
  }

  function open() {
    console.log("📖 Sidebar open")
    isOpen.value = true
  }

  function close() {
    console.log("📕 Sidebar close")
    isOpen.value = false
  }

  function set(state: boolean) {
    console.log("⚙️ Sidebar set:", state)
    isOpen.value = state
  }

  // Force reload state from localStorage
  function reloadFromStorage() {
    const newState = getInitialState()
    console.log("🔄 Sidebar reload from storage:", isOpen.value, "→", newState)
    isOpen.value = newState
  }

  return {
    isOpen,
    toggle,
    open,
    close,
    set,
    reloadFromStorage,
  }
})
