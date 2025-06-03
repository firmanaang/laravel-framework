<template>
  <div class="relative" ref="menuRef">
    <button
      @click="toggleMenu"
      class="flex items-center space-x-1 p-1 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all duration-200 group"
    >
      <div class="relative">
        <div class="w-6 h-6 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center shadow-md group-hover:shadow-lg transition-all duration-200">
          <span class="text-white text-xs font-bold">{{ userInitials }}</span>
        </div>
        <div class="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-green-500 rounded-full border border-white dark:border-neutral-900"></div>
      </div>
      <div class="hidden xl:block text-left">
        <div class="text-xs font-semibold text-neutral-900 dark:text-white">{{ userName }}</div>
        <div class="text-xs text-neutral-500 dark:text-neutral-400">{{ currentUser?.role || 'User' }}</div>
      </div>
      <ChevronDownIcon class="w-3 h-3 text-neutral-500 dark:text-neutral-400 transition-transform duration-200" :class="{ 'rotate-180': isOpen }" />
    </button>

    <!-- Dropdown Menu -->
    <Transition name="dropdown">
      <div
        v-if="isOpen"
        class="dropdown-brainwave absolute right-0 mt-2 w-48"
      >
        <!-- User Info -->
        <div class="px-2.5 py-2 border-b border-neutral-200 dark:border-neutral-800">
          <div class="flex items-center space-x-2">
            <div class="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <span class="text-white font-bold text-xs">{{ userInitials }}</span>
            </div>
            <div>
              <div class="font-semibold text-neutral-900 dark:text-white text-xs">{{ userName }}</div>
              <div class="text-xs text-neutral-500 dark:text-neutral-400">{{ userEmail }}</div>
              <div class="text-xs text-green-600 font-medium capitalize">{{ currentUser?.role || 'User' }}</div>
            </div>
          </div>
        </div>

        <!-- Menu Items -->
        <div class="py-1">
          <a
            v-for="item in menuItems"
            :key="item.label"
            :href="item.href"
            @click="handleMenuClick(item)"
            class="dropdown-item text-xs py-1"
          >
            <component :is="item.icon" class="w-3.5 h-3.5 mr-2" />
            <span>{{ item.label }}</span>
            <span v-if="item.badge" class="ml-auto badge-brainwave badge-primary text-xs">{{ item.badge }}</span>
          </a>
        </div>

        <!-- Footer -->
        <div class="border-t border-neutral-200 dark:border-neutral-800 p-1">
          <button
            @click="handleMenuClick({ action: 'logout' })"
            class="dropdown-item w-full text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 py-1"
          >
            <ArrowRightOnRectangleIcon class="w-3.5 h-3.5 mr-2" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useAuth } from '@/composables/useAuth'
import {
  ChevronDownIcon,
  UserIcon,
  Cog6ToothIcon,
  BellIcon,
  CreditCardIcon,
  QuestionMarkCircleIcon,
  ArrowRightOnRectangleIcon
} from '@heroicons/vue/24/outline'

const isOpen = ref(false)
const menuRef = ref<HTMLElement>()

const { currentUser, userName, userEmail, userInitials, logout, hasPermission } = useAuth()

const menuItems = [
  {
    label: 'Profile',
    href: '#',
    icon: UserIcon,
    action: 'profile'
  },
  {
    label: 'Notifications',
    href: '#',
    icon: BellIcon,
    action: 'notifications',
    badge: '3'
  },
  {
    label: 'Billing',
    href: '#',
    icon: CreditCardIcon,
    action: 'billing'
  },
  {
    label: 'Settings',
    href: '#',
    icon: Cog6ToothIcon,
    action: 'settings'
  },
  {
    label: 'Help & Support',
    href: '#',
    icon: QuestionMarkCircleIcon,
    action: 'help'
  }
]

const toggleMenu = () => {
  isOpen.value = !isOpen.value
}

const handleMenuClick = (item: any) => {
  isOpen.value = false

  if (item.action === 'logout') {
    logout()
  } else {
    console.log(`Clicked: ${item.action}`)
  }
}

const handleClickOutside = (event: Event) => {
  if (menuRef.value && !menuRef.value.contains(event.target as Node)) {
    isOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>
