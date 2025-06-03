import { ref, computed } from "vue"
import {
  BoltIcon,
  CubeIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  StarIcon,
  FireIcon,
  LightBulbIcon,
  RocketLaunchIcon,
} from "@heroicons/vue/24/outline"

interface AppSettings {
  appName: string
  appIcon: string
  appDescription: string
}

// Get company data from Laravel with better error handling
const getCompanyData = () => {
  try {
    const data = (window as any).companyData
    console.log("Getting company data from window:", data)

    if (data && typeof data === "object") {
      return {
        name: data.name || "Laravel Vue Dashboard",
        description: data.description || "Modern Dashboard Platform",
        logo: data.logo || "lightning",
      }
    }
  } catch (error) {
    console.warn("Error getting company data:", error)
  }

  // Fallback
  return {
    name: "Laravel Vue Dashboard",
    description: "Modern Dashboard Platform",
    logo: "lightning",
  }
}

const companyData = getCompanyData()
console.log("Company data loaded in composable:", companyData)

const defaultSettings: AppSettings = {
  appName: companyData.name,
  appIcon: companyData.logo,
  appDescription: companyData.description,
}

console.log("Default settings:", defaultSettings)

const appSettings = ref<AppSettings>({ ...defaultSettings })

const iconMap = {
  lightning: BoltIcon,
  cube: CubeIcon,
  chart: ChartBarIcon,
  settings: Cog6ToothIcon,
  star: StarIcon,
  fire: FireIcon,
  bulb: LightBulbIcon,
  rocket: RocketLaunchIcon,
}

export function useAppSettings() {
  const loadSettings = () => {
    try {
      const saved = localStorage.getItem("appSettings")
      console.log("Saved settings from localStorage:", saved)

      if (saved) {
        const parsed = JSON.parse(saved)
        console.log("Parsed settings:", parsed)
        // Merge with company data as fallback
        appSettings.value = {
          appName: parsed.appName || companyData.name,
          appIcon: parsed.appIcon || companyData.logo,
          appDescription: parsed.appDescription || companyData.description,
        }
      } else {
        // Use company data as initial values
        console.log("No saved settings, using company data:", companyData)
        appSettings.value = { ...defaultSettings }
      }

      console.log("Final app settings:", appSettings.value)
    } catch (error) {
      console.error("Failed to load app settings:", error)
      appSettings.value = { ...defaultSettings }
    }
  }

  const saveSettings = (newSettings: Partial<AppSettings>) => {
    try {
      console.log("Saving new settings:", newSettings)
      appSettings.value = { ...appSettings.value, ...newSettings }
      localStorage.setItem("appSettings", JSON.stringify(appSettings.value))

      // Update document title
      document.title = `${appSettings.value.appName} - Dashboard`

      // Dispatch event for components to listen
      window.dispatchEvent(
        new CustomEvent("appSettingsChanged", {
          detail: appSettings.value,
        }),
      )

      console.log("Settings saved successfully:", appSettings.value)
      return true
    } catch (error) {
      console.error("Failed to save app settings:", error)
      return false
    }
  }

  const resetSettings = () => {
    console.log("Resetting settings to company defaults:", companyData)
    appSettings.value = {
      appName: companyData.name,
      appIcon: companyData.logo,
      appDescription: companyData.description,
    }
    localStorage.removeItem("appSettings")
    document.title = `${appSettings.value.appName} - Dashboard`

    window.dispatchEvent(
      new CustomEvent("appSettingsChanged", {
        detail: appSettings.value,
      }),
    )
  }

  const getIconComponent = computed(() => {
    return iconMap[appSettings.value.appIcon as keyof typeof iconMap] || BoltIcon
  })

  const appName = computed(() => appSettings.value.appName)
  const appIcon = computed(() => appSettings.value.appIcon)
  const appDescription = computed(() => appSettings.value.appDescription)

  // Initialize on first use
  loadSettings()

  return {
    appSettings,
    appName,
    appIcon,
    appDescription,
    getIconComponent,
    loadSettings,
    saveSettings,
    resetSettings,
    companyData, // Export company data for direct access
  }
}
