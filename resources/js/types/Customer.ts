export interface Customer {
  id: number
  name: string
  code: string
  contact_person?: string
  phone?: string
  email?: string
  address?: string
  city?: string
  country?: string
  tax_number?: string
  customer_type: "individual" | "company"
  credit_limit?: number
  status: "active" | "inactive"
  notes?: string
  created_at: string
  updated_at: string
}

export interface CustomerFormData {
  name: string
  code: string
  contact_person?: string
  phone?: string
  email?: string
  address?: string
  city?: string
  country?: string
  tax_number?: string
  customer_type: "individual" | "company"
  credit_limit?: number
  status: "active" | "inactive"
  notes?: string
}

export interface CustomerFilters {
  search?: string
  status?: string
  customer_type?: string
  city?: string
  country?: string
}
