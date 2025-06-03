import { ref } from "vue"
import type { Modal } from "@/types/ui"

const activeModal = ref<Modal | null>(null)

export function useModal() {
  const openModal = (component: any, props: Record<string, any> = {}) => {
    activeModal.value = { component, props }
  }

  const closeModal = () => {
    activeModal.value = null
  }

  return {
    activeModal,
    openModal,
    closeModal,
  }
}
