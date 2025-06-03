export interface Purchase {
  id: string
  supplier_id: string
  supplier_name?: string
  purchase_number: string
  purchase_date: string
  total_amount: number
  status: "pending" | "completed" | "cancelled"
  notes?: string
  created_at: string
  updated_at: string
}

export interface PurchaseFormData {
  supplier_id: string
  purchase_number: string
  purchase_date: string
  total_amount: number
  status: "pending" | "completed" | "cancelled"
  notes?: string
}

export interface PurchaseFilters {
  search: string
  status?: string
  supplier_id?: string
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

export interface PaginatedPurchasesResponse {
  data: Purchase[]
  links: PaginationLinks
  meta: PaginationMeta
}
