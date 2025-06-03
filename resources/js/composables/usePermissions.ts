import axios from "@/bootstrap"
import { ref } from "vue"

interface Permission {
  id: number
  name: string
  description: string
  category: string
  created_at: string
  updated_at: string
}

const permissions = ref<Permission[]>([])
const loading = ref(false)

export function usePermissions() {
  const fetchPermissions = async () => {
    loading.value = true
    try {
      const response = await axios.get("/api/permissions")
      permissions.value = response.data.data || response.data
    } catch (error) {
      console.error("Failed to fetch permissions:", error)
      throw error
    } finally {
      loading.value = false
    }
  }

  const createPermission = async (permissionData: Partial<Permission>) => {
    try {
      const response = await axios.post("/api/permissions", permissionData)
      const newPermission = response.data.data || response.data
      permissions.value.unshift(newPermission)
      return newPermission
    } catch (error) {
      console.error("Failed to create permission:", error)
      throw error
    }
  }

  const updatePermission = async (id: number, permissionData: Partial<Permission>) => {
    try {
      const response = await axios.put(`/api/permissions/${id}`, permissionData)
      const updatedPermission = response.data.data || response.data

      const index = permissions.value.findIndex((permission) => permission.id === id)
      if (index !== -1) {
        permissions.value[index] = updatedPermission
      }
      return updatedPermission
    } catch (error) {
      console.error("Failed to update permission:", error)
      throw error
    }
  }

  const deletePermission = async (id: number) => {
    try {
      await axios.delete(`/api/permissions/${id}`)

      const index = permissions.value.findIndex((permission) => permission.id === id)
      if (index !== -1) {
        permissions.value.splice(index, 1)
      }
      return true
    } catch (error) {
      console.error("Failed to delete permission:", error)
      throw error
    }
  }

  return {
    permissions,
    loading,
    fetchPermissions,
    createPermission,
    updatePermission,
    deletePermission,
  }
}
