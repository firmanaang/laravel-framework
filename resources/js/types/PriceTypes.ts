export interface PriceType {
  id: string
  name: string
  created_at: string
  updated_at: string
}

export interface PriceTypeFormData {
  name: string
}

export interface PriceTypeFilters {
  search: string
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

export interface PaginatedPriceTypesResponse {
  data: PriceType[]
  links: PaginationLinks
  meta: PaginationMeta
}
