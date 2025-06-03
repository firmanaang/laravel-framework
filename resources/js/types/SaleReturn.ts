export interface SaleReturn {
  id: string
  sale_id: string
  sale_number?: string
  return_number: string
  return_date: string
  total_amount: number
  status: "pending" | "completed" | "cancelled"
  reason?: string
  notes?: string
  created_at: string
  updated_at: string
}

export interface SaleReturnFormData {
  sale_id: string
  return_number: string
  return_date: string
  total_amount: number
  status: "pending" | "completed" | "cancelled"
  reason?: string
  notes?: string
}

export interface SaleReturnFilters {
  search: string
  status?: string
  sale_id?: string
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

export interface PaginatedSaleReturnsResponse {
  data: SaleReturn[]
  links: PaginationLinks
  meta: PaginationMeta
}
