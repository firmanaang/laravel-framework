export interface Voucher {
  id: string
  code: string
  name: string
  description?: string
  type: "percentage" | "fixed"
  value: number
  min_purchase?: number
  max_discount?: number
  usage_limit?: number
  used_count: number
  start_date: string
  end_date: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface VoucherFormData {
  code: string
  name: string
  description?: string
  type: "percentage" | "fixed"
  value: number
  min_purchase?: number
  max_discount?: number
  usage_limit?: number
  start_date: string
  end_date: string
  is_active: boolean
}

export interface VoucherFilters {
  search: string
  type?: string
  status?: string
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

export interface PaginatedVouchersResponse {
  data: Voucher[]
  links: PaginationLinks
  meta: PaginationMeta
}
