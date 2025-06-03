"use client"

import { ref, watch } from "vue"

const isDark = ref(false)
const theme = ref<"light" | "dark" | "auto">("auto")

export function useTheme() {
  const initializeTheme = async () => {
    try {
      // Check saved theme preference
      const savedTheme = localStorage.getItem("theme") as "light" | "dark" | "auto" | null

      if (savedTheme) {
        theme.value = savedTheme
      } else {
        // Default to auto if no preference saved
        theme.value = "auto"
      }

      // Apply theme immediately
      applyTheme()

      // Listen for system theme changes
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
      mediaQuery.addEventListener("change", handleSystemThemeChange)

      // Watch for theme changes and apply them
      watch(theme, () => {
        applyTheme()
      })

      watch(isDark, () => {
        // Force re-render of components when dark mode changes
        document.documentElement.style.colorScheme = isDark.value ? "dark" : "light"
      })
    } catch (error) {
      console.error("Failed to initialize theme:", error)
      // Fallback to light theme
      setTheme("light")
    }
  }

  const applyTheme = () => {
    try {
      const shouldBeDark =
        theme.value === "dark" || (theme.value === "auto" && window.matchMedia("(prefers-color-scheme: dark)").matches)

      if (shouldBeDark) {
        document.documentElement.classList.add("dark")
        document.documentElement.setAttribute("data-theme", "dark")
        isDark.value = true
      } else {
        document.documentElement.classList.remove("dark")
        document.documentElement.setAttribute("data-theme", "light")
        isDark.value = false
      }

      // Enhanced style recalculation
      document.documentElement.style.colorScheme = isDark.value ? "dark" : "light"

      // Dispatch custom event for theme change
      window.dispatchEvent(
        new CustomEvent("themeChanged", {
          detail: { isDark: isDark.value, theme: theme.value },
        }),
      )
    } catch (error) {
      console.error("Failed to apply theme:", error)
    }
  }

  const setTheme = (newTheme: "light" | "dark" | "auto") => {
    try {
      theme.value = newTheme
      localStorage.setItem("theme", newTheme)
      applyTheme()
    } catch (error) {
      console.error("Failed to set theme:", error)
    }
  }

  const toggleTheme = () => {
    const newTheme = isDark.value ? "light" : "dark"
    setTheme(newTheme)
  }

  const handleSystemThemeChange = () => {
    if (theme.value === "auto") {
      applyTheme()
    }
  }

  return {
    isDark,
    theme,
    initializeTheme,
    setTheme,
    toggleTheme,
  }
}
