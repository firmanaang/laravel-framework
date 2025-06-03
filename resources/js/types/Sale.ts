export interface Sale {
  id: string
  customer_id: string
  customer_name?: string
  sale_number: string
  sale_date: string
  total_amount: number
  status: "pending" | "completed" | "cancelled"
  notes?: string
  created_at: string
  updated_at: string
}

export interface SaleFormData {
  customer_id: string
  sale_number: string
  sale_date: string
  total_amount: number
  status: "pending" | "completed" | "cancelled"
  notes?: string
}

export interface SaleFilters {
  search: string
  status?: string
  customer_id?: string
  date_from?: string
  date_to?: string
  page?: number
}

// Pagination types
export interface PaginationMeta {
  current_page: number
  from: number | null
  last_page: number
  per_page: number
  to: number | null
  total: number
  links: PaginationLink[]
}

export interface PaginationLinks {
  first: string | null
  last: string | null
  prev: string | null
  next: string | null
}

export interface PaginationLink {
  url: string | null
  label: string
  active: boolean
}

export interface PaginatedSalesResponse {
  data: Sale[]
  links: PaginationLinks
  meta: PaginationMeta
}
