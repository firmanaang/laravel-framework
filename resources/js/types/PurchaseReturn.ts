export interface PurchaseReturn {
  id: string
  purchase_id: string
  purchase_number?: string
  return_number: string
  return_date: string
  total_amount: number
  status: "pending" | "completed" | "cancelled"
  reason?: string
  notes?: string
  created_at: string
  updated_at: string
}

export interface PurchaseReturnFormData {
  purchase_id: string
  return_number: string
  return_date: string
  total_amount: number
  status: "pending" | "completed" | "cancelled"
  reason?: string
  notes?: string
}

export interface PurchaseReturnFilters {
  search: string
  status?: string
  purchase_id?: string
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

export interface PaginatedPurchaseReturnsResponse {
  data: PurchaseReturn[]
  links: PaginationLinks
  meta: PaginationMeta
}
