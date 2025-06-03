export interface Toast {
  id: string
  type: "success" | "error" | "warning" | "info"
  title: string
  message?: string
  duration?: number
}

export interface Modal {
  id: string
  component: any
  props?: Record<string, any>
  persistent?: boolean
}

export interface GlobalState {
  isLoading: boolean
  user: any | null
  theme: "light" | "dark" | "system"
  language: string
  isOnline: boolean
}
