import { createRouter, createWebHistory } from "vue-router"
import type { RouteRecordRaw } from "vue-router"

// Import page components
import DashboardPage from "@/components/Pages/DashboardPage.vue"
import SettingsPage from "@/components/Pages/SettingsPage.vue"
import NotFoundPage from "@/components/Pages/NotFoundPage.vue"
import UnitsPage from "@/components/Pages/UnitsPage/index.vue"

const routes: RouteRecordRaw[] = [
  {
    path: "/",
    redirect: "/dashboard",
  },
  {
    path: "/dashboard",
    name: "dashboard",
    component: DashboardPage,
    meta: {
      title: "Dashboard",
      icon: "dashboard",
      requiresAuth: true,
      layout: "app", // Use app layout
    },
  },
  {
    path: "/units",
    name: "units",
    component: UnitsPage,
    meta: {
      title: "Units",
      icon: "units",
      requiresAuth: true,
      layout: "app", // Use app layout
      permission: "view units",
    },
  },
  {
    path: "/categories",
    name: "categories",
    component: () => import("@/components/Pages/CategoriesPage/index.vue"),
    meta: {
      title: "Categories",
      icon: "categories",
      requiresAuth: true,
      layout: "app",
      permission: "view categories",
    },
  },
  {
    path: "/brands",
    name: "brands",
    component: () => import("@/components/Pages/BrandsPage/index.vue"),
    meta: {
      title: "Brands",
      icon: "brands",
      requiresAuth: true,
      layout: "app",
      permission: "view brands",
    },
  },
  {
    path: "/products",
    name: "products",
    component: () => import("@/components/Pages/ProductsPage/index.vue"),
    meta: {
      title: "Products",
      icon: "products",
      requiresAuth: true,
      layout: "app",
      permission: "view products",
    },
  },
  {
    path: "/products/create",
    name: "products-create",
    component: () => import("@/components/Pages/ProductsPage/ProductFormPage.vue"),
    meta: {
      title: "Add Product",
      icon: "products",
      requiresAuth: true,
      layout: "app",
      permission: "create products",
    },
  },
  {
    path: "/products/:id/edit",
    name: "products-edit",
    component: () => import("@/components/Pages/ProductsPage/ProductFormPage.vue"),
    meta: {
      title: "Edit Product",
      icon: "products",
      requiresAuth: true,
      layout: "app",
      permission: "edit products",
    },
  },
  {
    path: "/products/:id",
    name: "products-detail",
    component: () => import("@/components/Pages/ProductsPage/ProductDetailPage.vue"),
    meta: {
      title: "Product Detail",
      icon: "products",
      requiresAuth: true,
      layout: "app",
      permission: "view products",
    },
  },
  {
    path: "/purchases",
    name: "purchases",
    component: () => import("@/components/Pages/PurchasesPage/index.vue"),
    meta: {
      title: "Purchases",
      icon: "purchases",
      requiresAuth: true,
      layout: "app",
      permission: "view purchases",
    },
  },
  {
    path: "/sales",
    name: "sales",
    component: () => import("@/components/Pages/SalesPage/index.vue"),
    meta: {
      title: "Sales",
      icon: "sales",
      requiresAuth: true,
      layout: "app",
      permission: "view sales",
    },
  },
  {
    path: "/purchase-returns",
    name: "purchase-returns",
    component: () => import("@/components/Pages/PurchaseReturnsPage/index.vue"),
    meta: {
      title: "Purchase Returns",
      icon: "purchase-returns",
      requiresAuth: true,
      layout: "app",
      permission: "view purchase returns",
    },
  },
  {
    path: "/sale-returns",
    name: "sale-returns",
    component: () => import("@/components/Pages/SaleReturnsPage/index.vue"),
    meta: {
      title: "Sale Returns",
      icon: "sale-returns",
      requiresAuth: true,
      layout: "app",
      permission: "view sale returns",
    },
  },
  {
    path: "/suppliers",
    name: "suppliers",
    component: () => import("@/components/Pages/SuppliersPage/index.vue"),
    meta: {
      title: "Suppliers",
      icon: "suppliers",
      requiresAuth: true,
      layout: "app",
      permission: "view suppliers",
    },
  },
  {
    path: "/customers",
    name: "customers",
    component: () => import("@/components/Pages/CustomersPage/index.vue"),
    meta: {
      title: "Customers",
      icon: "customers",
      requiresAuth: true,
      layout: "app",
      permission: "view customers",
    },
  },
  {
    path: "/settings",
    name: "settings",
    component: SettingsPage,
    meta: {
      title: "Settings",
      icon: "settings",
      requiresAuth: true,
      layout: "app", // Use app layout
      permission: "view settings",
    },
  },
  {
    path: "/:pathMatch(.*)*",
    name: "not-found",
    component: NotFoundPage,
    meta: {
      title: "Page Not Found",
      requiresAuth: false,
      layout: "guest", // Use guest layout
    },
  },
  {
    path: "/login",
    name: "login",
    component: () => import("@/components/Pages/LoginPage.vue"),
    meta: {
      title: "Login",
      requiresGuest: true,
      requiresAuth: false,
      layout: "guest", // Use guest layout - no sidebar/header
    },
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition
    } else {
      return { top: 0 }
    }
  },
})

// Navigation guards
router.beforeEach((to, from, next) => {
  console.log("Router guard - navigating to:", to.path)

  // Update document title
  const title = to.meta?.title as string
  if (title) {
    document.title = `${title} - Dashboard`
  }

  // Check authentication
  const token = localStorage.getItem("auth_token")
  const userData = localStorage.getItem("user_data")

  console.log("Router guard - token exists:", !!token, "user data exists:", !!userData)

  const requiresAuth = to.matched.some((record) => record.meta.requiresAuth !== false)
  const requiresGuest = to.matched.some((record) => record.meta.requiresGuest === true)

  console.log("Router guard - requires auth:", requiresAuth, "requires guest:", requiresGuest)

  // Handle guest-only routes (like login)
  if (requiresGuest && token && userData) {
    console.log("Authenticated user accessing guest page, redirecting to dashboard")
    return next("/dashboard")
  }

  // Handle protected routes - check both token and user data
  if (!requiresGuest && (!token || !userData) && to.path !== "/login") {
    console.log("Unauthenticated user accessing protected page, redirecting to login")
    return next("/login")
  }

  // Additional check: if we have token but it's invalid format, redirect to login
  if (token && !token.includes("|")) {
    console.log("Invalid token format, clearing and redirecting to login")
    localStorage.removeItem("auth_token")
    localStorage.removeItem("user_data")
    if (to.path !== "/login") {
      return next("/login")
    }
  }

  // Check permission for protected routes
  if (requiresAuth && to.meta?.permission) {
    try {
      const user = JSON.parse(userData || "{}")
      const userPermissions = user.permissions || []
      const requiredPermission = to.meta.permission as string

      // Admin can access everything
      if (user.role === "admin") {
        console.log("Admin user, access granted")
        return next()
      }

      // Check if user has required permission
      if (!userPermissions.includes(requiredPermission)) {
        console.log(`User lacks permission: ${requiredPermission}`)
        return next("/dashboard") // Redirect to dashboard if no permission
      }
    } catch (err) {
      console.error("Error checking permissions:", err)
      return next("/login")
    }
  }

  console.log("Navigation allowed")
  next()
})

export default router
