import { ref, computed } from "vue"

// Import translation modules
import { commonTranslations } from "./i18n/common"
import { authTranslations } from "./i18n/auth"
import { navigationTranslations } from "./i18n/navigation"
import { unitsTranslations } from "./i18n/units"
import { categoriesTranslations } from "./i18n/categories"
import { brandsTranslations } from "./i18n/brands"
import { productsTranslations } from "./i18n/products"
import { usersTranslations } from "./i18n/users"
import { dashboardTranslations } from "./i18n/dashboard"
import { settingsTranslations } from "./i18n/settings"
import { validationTranslations } from "./i18n/validation"
import { toastTranslations } from "./i18n/toast"
import { permissionTranslations } from "./i18n/permissions"
import { priceTypesTranslations } from "./i18n/priceTypes"
import { paymentMethodsTranslations } from "./i18n/paymentMethods"
import { suppliersTranslations } from "./i18n/suppliers"
import { customersTranslations } from "./i18n/customers"
import { vouchersTranslations } from "./i18n/vouchers"
import { promosTranslations } from "./i18n/promos"
import { purchasesTranslations } from "./i18n/purchases"
import { salesTranslations } from "./i18n/sales"
import { purchaseReturnsTranslations } from "./i18n/purchaseReturns"
import { saleReturnsTranslations } from "./i18n/saleReturns"

type Locale = "en" | "id"

interface Translations {
  [key: string]: {
    [locale in Locale]: string
  }
}

const currentLocale = ref<Locale>("id") // Default ke Indonesia

// Merge all translation modules
const translations: Translations = {
  ...commonTranslations,
  ...authTranslations,
  ...navigationTranslations,
  ...unitsTranslations,
  ...categoriesTranslations,
  ...brandsTranslations,
  ...productsTranslations,
  ...usersTranslations,
  ...dashboardTranslations,
  ...settingsTranslations,
  ...validationTranslations,
  ...toastTranslations,
  ...permissionTranslations,
  ...priceTypesTranslations,
  ...paymentMethodsTranslations,
  ...suppliersTranslations,
  ...customersTranslations,
  ...vouchersTranslations,
  ...promosTranslations,
  ...purchasesTranslations,
  ...salesTranslations,
  ...purchaseReturnsTranslations,
  ...saleReturnsTranslations,
}

export function useI18n() {
  const setLocale = (locale: Locale) => {
    currentLocale.value = locale
    localStorage.setItem("locale", locale)
  }

  const initializeLocale = () => {
    const saved = localStorage.getItem("locale") as Locale
    if (saved && ["en", "id"].includes(saved)) {
      currentLocale.value = saved
    } else {
      // Default ke Indonesia
      currentLocale.value = "id"
    }
  }

  const t = (key: string): string => {
    const translation = translations[key]
    if (!translation) {
      console.warn(`Translation missing for key: ${key}`)
      return key
    }
    return translation[currentLocale.value] || translation.en || key
  }

  const locale = computed(() => currentLocale.value)

  return {
    locale,
    setLocale,
    initializeLocale,
    t,
  }
}
