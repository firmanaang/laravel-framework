import axios from "@/bootstrap"
import { ref } from "vue"

interface Role {
  id: number
  name: string
  description: string
  permissions: string[]
  created_at: string
  updated_at: string
}

const roles = ref<Role[]>([])
const loading = ref(false)

export function useRoles() {
  const fetchRoles = async () => {
    loading.value = true
    try {
      const response = await axios.get("/api/roles")
      roles.value = response.data.data || response.data
    } catch (error) {
      console.error("Failed to fetch roles:", error)
      throw error
    } finally {
      loading.value = false
    }
  }

  const createRole = async (roleData: Partial<Role>) => {
    try {
      const response = await axios.post("/api/roles", roleData)
      const newRole = response.data.data || response.data
      roles.value.unshift(newRole)
      return newRole
    } catch (error) {
      console.error("Failed to create role:", error)
      throw error
    }
  }

  const updateRole = async (id: number, roleData: Partial<Role>) => {
    try {
      const response = await axios.put(`/api/roles/${id}`, roleData)
      const updatedRole = response.data.data || response.data

      const index = roles.value.findIndex((role) => role.id === id)
      if (index !== -1) {
        roles.value[index] = updatedRole
      }
      return updatedRole
    } catch (error) {
      console.error("Failed to update role:", error)
      throw error
    }
  }

  const deleteRole = async (id: number) => {
    try {
      await axios.delete(`/api/roles/${id}`)

      const index = roles.value.findIndex((role) => role.id === id)
      if (index !== -1) {
        roles.value.splice(index, 1)
      }
      return true
    } catch (error) {
      console.error("Failed to delete role:", error)
      throw error
    }
  }

  return {
    roles,
    loading,
    fetchRoles,
    createRole,
    updateRole,
    deleteRole,
  }
}
