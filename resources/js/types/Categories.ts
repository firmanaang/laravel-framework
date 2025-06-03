export interface Category {
  id: string
  name: string
  description: string
  created_at: string
  updated_at: string
}

export interface CategoryFormData {
  name: string
  description: string
}

export interface CategoryFilters {
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

export interface PaginatedCategoriesResponse {
  data: Category[]
  links: PaginationLinks
  meta: PaginationMeta
}
