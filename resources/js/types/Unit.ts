export interface Unit {
  id: string
  name: string
  short_name: string
  created_at: string
  updated_at: string
}

export interface UnitFormData {
  name: string
  short_name: string
}

export interface UnitFilters {
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

export interface PaginatedUnitsResponse {
  data: Unit[]
  links: PaginationLinks
  meta: PaginationMeta
}
