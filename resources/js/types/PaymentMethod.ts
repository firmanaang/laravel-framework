export interface PaymentMethod {
  id: number
  name: string
  type: "cash" | "card" | "transfer" | "ewallet" | "crypto"
  description?: string
  fee_type: "fixed" | "percentage"
  fee_amount: number
  min_amount?: number
  max_amount?: number | null
  status: "active" | "inactive"
  created_at: string
  updated_at: string
}

export interface PaymentMethodFormData {
  name: string
  type: string
  description: string
  fee_type: "fixed" | "percentage"
  fee_amount: number
  min_amount: number
  max_amount: number | null
  status: "active" | "inactive"
}

export interface CreatePaymentMethodData {
  name: string
  type: "cash" | "card" | "transfer" | "ewallet" | "crypto"
  description?: string
  fee_type: "fixed" | "percentage"
  fee_amount: number
  min_amount?: number
  max_amount?: number | null
  status: "active" | "inactive"
}

export interface UpdatePaymentMethodData extends Partial<CreatePaymentMethodData> {
  id: number
}
