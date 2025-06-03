<template>
  <div class="relative" ref="dropdownRef">
    <button
      @click="toggleDropdown"
      class="flex items-center space-x-1 px-2 py-1 bg-slate-100/50 dark:bg-slate-800/50 rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-700/50 transition-colors"
    >
      <div class="w-4 h-4 rounded-full overflow-hidden">
        <img :src="currentLanguage.flag" :alt="currentLanguage.name" class="w-full h-full object-cover" />
      </div>
      <span class="text-xs font-medium text-slate-900 dark:text-white">{{ currentLanguage.name }}</span>
      <svg class="w-3 h-3 text-slate-500 transition-transform" :class="{ 'rotate-180': isOpen }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
      </svg>
    </button>

    <!-- Dropdown -->
    <Transition name="dropdown">
      <div v-if="isOpen" class="absolute right-0 top-full mt-1 w-40 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 py-1 z-50">
        <button
          v-for="language in languages"
          :key="language.code"
          @click="selectLanguage(language)"
          class="w-full flex items-center space-x-2 px-3 py-2 text-xs hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          :class="{ 'bg-blue-50 dark:bg-blue-900/20': selectedLanguage.code === language.code }"
        >
          <div class="w-4 h-4 rounded-full overflow-hidden">
            <img :src="language.flag" :alt="language.name" class="w-full h-full object-cover" />
          </div>
          <span class="text-slate-900 dark:text-white">{{ language.name }}</span>
          <svg v-if="selectedLanguage.code === language.code" class="w-3 h-3 ml-auto text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
          </svg>
        </button>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useI18n } from '@/composables/useI18n'

const { locale, setLocale } = useI18n()

const isOpen = ref(false)
const dropdownRef = ref<HTMLElement | null>(null)

const languages = [
  {
    code: 'id' as const,
    name: 'Indonesia',
    flag: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjI0IiBoZWlnaHQ9IjEyIiByeD0iMCIgZmlsbD0iI0ZGNDQ0NCIvPgo8cmVjdCB5PSIxMiIgd2lkdGg9IjI0IiBoZWlnaHQ9IjEyIiByeD0iMCIgZmlsbD0id2hpdGUiLz4KPC9zdmc+'
  },
  {
    code: 'en' as const,
    name: 'English',
    flag: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjI0IiBoZWlnaHQ9IjI0IiByeD0iMCIgZmlsbD0iIzAwNTJCNCIvPgo8cGF0aCBkPSJNMCAwSDI0VjhIMFoiIGZpbGw9IiNGRkZGRkYiLz4KPHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSI+CjxyZWN0IHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgcng9IjAiIGZpbGw9IiNGRjAwMDAiLz4KPC9zdmc+'
  }
]

const selectedLanguage = ref(languages.find(lang => lang.code === locale.value) || languages[0])

const currentLanguage = computed(() => selectedLanguage.value)

const toggleDropdown = () => {
  isOpen.value = !isOpen.value
}

const selectLanguage = (language: typeof languages[0]) => {
  selectedLanguage.value = language
  setLocale(language.code)
  isOpen.value = false

  // Show toast notification
  console.log(`Language changed to ${language.name}`)
}

const handleClickOutside = (event: Event) => {
  if (dropdownRef.value && !dropdownRef.value.contains(event.target as Node)) {
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

<style scoped>
.dropdown-enter-active,
.dropdown-leave-active {
  transition: all 0.2s ease;
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
