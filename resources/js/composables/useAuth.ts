"use client"

import { ref, computed } from "vue"
import axios from "axios"
import { useRouter } from "vue-router"
import { useToast } from "./useToast"

interface User {
  id: number
  name: string
  email: string
  role: string
  permissions: string[]
  avatar?: string | null
  created_at: string
  updated_at: string
}

interface LoginResponse {
  success: boolean
  message: string
  data: {
    user: User
    token: string
    token_type: string
    expires_in: number
  }
}

const currentUser = ref<User | null>(null)
const isAuthenticated = ref(false)

export function useAuth() {
  const router = useRouter()
  const { success, error } = useToast()

  const initializeAuth = () => {
    try {
      const token = localStorage.getItem("auth_token")
      const userData = localStorage.getItem("user_data")

      console.log("Initializing auth with:", {
        hasToken: !!token,
        hasUserData: !!userData,
        tokenPreview: token ? token.substring(0, 10) + "..." : null,
      })

      if (token && userData) {
        const parsedUser = JSON.parse(userData)
        currentUser.value = parsedUser
        isAuthenticated.value = true
        axios.defaults.headers.common["Authorization"] = `Bearer ${token}`
        console.log("Auth initialized successfully with user:", parsedUser.name)
      } else {
        console.log("No auth data found, user not authenticated")
        currentUser.value = null
        isAuthenticated.value = false
      }
    } catch (err) {
      console.error("Failed to initialize auth:", err)
      logout()
    }
  }

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const response = await axios.post<LoginResponse>("/api/login", {
        email,
        password,
      })

      console.log("Login response:", response.data)

      if (response.data.success) {
        const { user, token, token_type } = response.data.data

        // Store authentication data
        localStorage.setItem("auth_token", token)
        localStorage.setItem("user_data", JSON.stringify(user))

        // Update reactive state immediately
        currentUser.value = user
        isAuthenticated.value = true

        // Set axios default header
        axios.defaults.headers.common["Authorization"] = `${token_type} ${token}`

        console.log("Auth state updated:", { user: user.name, isAuthenticated: isAuthenticated.value })

        success("Welcome back!", `Hello ${user.name}!`)
        return true
      } else {
        error("Login Failed", response.data.message || "Login failed")
        return false
      }
    } catch (err: any) {
      console.error("Login error:", err)

      let errorMessage = "Invalid credentials"

      if (err.response?.data?.message) {
        errorMessage = err.response.data.message
      } else if (err.response?.status === 422) {
        errorMessage = "Please check your email and password"
      } else if (err.response?.status === 401) {
        errorMessage = "Invalid email or password"
      } else if (err.response?.status >= 500) {
        errorMessage = "Server error. Please try again later."
      } else if (!err.response) {
        errorMessage = "Network error. Please check your connection."
      }

      error("Login Failed", errorMessage)
      return false
    }
  }

  const logout = async () => {
    try {
      // Try to call logout API if token exists
      const token = localStorage.getItem("auth_token")
      if (token) {
        await axios.post("/api/logout")
      }
    } catch (err) {
      console.warn("Logout API call failed:", err)
    } finally {
      // Clear local data regardless of API call result
      localStorage.removeItem("auth_token")
      localStorage.removeItem("user_data")
      delete axios.defaults.headers.common["Authorization"]

      currentUser.value = null
      isAuthenticated.value = false

      success("Goodbye!", "You have been logged out successfully")
      router.push("/login")
    }
  }

  const hasPermission = (permission: string): boolean => {
    return currentUser.value?.permissions?.includes(permission) || false
  }

  const hasRole = (role: string): boolean => {
    return currentUser.value?.role === role
  }

  const isAdmin = computed(() => hasRole("admin"))
  const userName = computed(() => currentUser.value?.name || "User")
  const userEmail = computed(() => currentUser.value?.email || "")
  const userAvatar = computed(() => currentUser.value?.avatar)
  const userInitials = computed(() => {
    if (!currentUser.value?.name) return "U"
    return currentUser.value.name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  })

  return {
    currentUser,
    isAuthenticated,
    userName,
    userEmail,
    userAvatar,
    userInitials,
    isAdmin,
    initializeAuth,
    login,
    logout,
    hasPermission,
    hasRole,
  }
}
