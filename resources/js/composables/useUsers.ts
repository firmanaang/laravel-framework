import axios from "@/bootstrap"
import { ref } from "vue"

interface User {
  id: number
  name: string
  email: string
  role: string
  status: "active" | "inactive"
  created_at: string
  updated_at: string
}

interface UserFilters {
  search?: string
  role?: string
  status?: string
}

const users = ref<User[]>([])
const loading = ref(false)

export function useUsers() {
  const fetchUsers = async (filters: UserFilters = {}) => {
    loading.value = true
    try {
      const params: Record<string, string> = {}
      if (filters.search && filters.search.trim()) {
        params.search = filters.search.trim()
      }
      if (filters.role) {
        params.role = filters.role
      }
      if (filters.status) {
        params.status = filters.status
      }

      const response = await axios.get("/api/users", { params })
      users.value = response.data.data || response.data
    } catch (error) {
      console.error("Failed to fetch users:", error)
      throw error
    } finally {
      loading.value = false
    }
  }

  const createUser = async (userData: Partial<User>) => {
    try {
      const response = await axios.post("/api/users", userData)
      const newUser = response.data.data || response.data
      users.value.unshift(newUser)
      return newUser
    } catch (error) {
      console.error("Failed to create user:", error)
      throw error
    }
  }

  const updateUser = async (id: number, userData: Partial<User>) => {
    try {
      const response = await axios.put(`/api/users/${id}`, userData)
      const updatedUser = response.data.data || response.data

      const index = users.value.findIndex((user) => user.id === id)
      if (index !== -1) {
        users.value[index] = updatedUser
      }
      return updatedUser
    } catch (error) {
      console.error("Failed to update user:", error)
      throw error
    }
  }

  const deleteUser = async (id: number) => {
    try {
      await axios.delete(`/api/users/${id}`)

      const index = users.value.findIndex((user) => user.id === id)
      if (index !== -1) {
        users.value.splice(index, 1)
      }
      return true
    } catch (error) {
      console.error("Failed to delete user:", error)
      throw error
    }
  }

  return {
    users,
    loading,
    fetchUsers,
    createUser,
    updateUser,
    deleteUser,
  }
}
