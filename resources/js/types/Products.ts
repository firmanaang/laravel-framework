export interface Product {
  id: string
  name: string
  sku: string
  description?: string
  purchase_price: number
  stock: number
  min_stock: number
  unit_id: string
  category_id: string
  brand_id: string
  status: "active" | "inactive"
  has_variants: boolean
  images?: ProductImage[]
  featured_image?: string
  created_at: string
  updated_at: string
  // Relations
  unit?: {
    id: string
    name: string
    short_name: string
  }
  category?: {
    id: string
    name: string
  }
  brand?: {
    id: string
    name: string
  }
  variants?: ProductVariant[]
  price_types?: ProductPriceType[]
  unit_conversions?: ProductUnitConversion[]
}

export interface ProductVariant {
  id: string
  product_id: string
  name: string
  sku: string
  description?: string
  stock: number
  min_stock: number
  images?: ProductImage[]
  featured_image?: string
  status: "active" | "inactive"
  created_at: string
  updated_at: string
  price_types?: ProductVariantPriceType[]
}

export interface ProductPriceType {
  id: string
  product_id: string
  price_type_id: string
  price: number
  price_type?: {
    id: string
    name: string
    description?: string
  }
}

export interface ProductVariantPriceType {
  id: string
  variant_id: string
  price_type_id: string
  price: number
  price_type?: {
    id: string
    name: string
    description?: string
  }
}

export interface ProductUnitConversion {
  id: string
  product_id: string
  from_unit_id: string
  to_unit_id: string
  conversion_factor: number
  from_unit?: {
    id: string
    name: string
    short_name: string
  }
  to_unit?: {
    id: string
    name: string
    short_name: string
  }
}

export interface ProductImage {
  id: string
  url: string
  alt_text?: string
  is_featured: boolean
  sort_order: number
}

export interface ProductFormData {
  name: string
  sku: string
  description?: string
  purchase_price: number
  stock: number
  min_stock: number
  unit_id: string
  category_id: string
  brand_id: string
  status: "active" | "inactive"
  has_variants: boolean
  images?: ProductImageData[]
  featured_image?: ProductImageData | null
  remove_images?: string[]
  variants?: ProductVariantFormData[]
  price_types?: ProductPriceTypeFormData[]
  unit_conversions?: ProductUnitConversionFormData[]
}

export interface ProductVariantFormData {
  id?: string
  name: string
  sku: string
  description?: string
  stock: number
  min_stock: number
  status: "active" | "inactive"
  images?: ProductImageData[]
  featured_image?: ProductImageData | null
  remove_images?: string[]
  price_types?: ProductVariantPriceTypeFormData[]
}

export interface ProductPriceTypeFormData {
  id?: string
  price_type_id: string
  price: number
}

export interface ProductVariantPriceTypeFormData {
  id?: string
  price_type_id: string
  price: number
}

export interface ProductUnitConversionFormData {
  id?: string
  from_unit_id: string
  to_unit_id: string
  conversion_factor: number
}

export interface ProductImageData {
  file?: File
  base64?: string
  name: string
  size: number
  type: string
  url?: string // for existing images
  id?: string // for existing images
}

export interface ProductFilters {
  search: string
  status?: string
  unit_id?: string
  category_id?: string
  brand_id?: string
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

export interface PaginatedProductsResponse {
  data: Product[]
  links: PaginationLinks
  meta: PaginationMeta
}
