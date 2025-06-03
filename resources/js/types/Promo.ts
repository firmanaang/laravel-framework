export interface Promo {
  id: string
  title: string
  description: string
  type: "discount" | "buy_get" | "bundle"
  discount_type?: "percentage" | "fixed"
  discount_value?: number
  min_purchase?: number
  max_discount?: number
  buy_quantity?: number
  get_quantity?: number
  applicable_products?: string[]
  start_date: string
  end_date: string
  is_active: boolean
  priority: number
  created_at: string
  updated_at: string
}

export interface PromoFormData {
  title: string
  description: string
  type: "discount" | "buy_get" | "bundle"
  discount_type?: "percentage" | "fixed"
  discount_value?: number
  min_purchase?: number
  max_discount?: number
  buy_quantity?: number
  get_quantity?: number
  applicable_products?: string[]
  start_date: string
  end_date: string
  is_active: boolean
  priority: number
}

export interface PromoFilters {
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

export interface PaginatedPromosResponse {
  data: Promo[]
  links: PaginationLinks
  meta: PaginationMeta
}
