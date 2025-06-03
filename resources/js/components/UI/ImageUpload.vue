<template>
  <div class="image-upload">
    <!-- Featured Image Upload -->
    <div class="mb-6">
      <label class="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
        {{ t('productForm.featuredImage') }} <span class="text-red-500">*</span>
      </label>

      <div
        class="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors"
        :class="[
          featuredImage ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800',
          hasError ? 'border-red-500 bg-red-50 dark:bg-red-900/20' : ''
        ]"
        @dragover.prevent="onDragOver"
        @dragleave.prevent="onDragLeave"
        @drop.prevent="onDropFeaturedImage"
      >
        <div v-if="!featuredImage" class="py-4">
          <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">
            {{ t('productForm.dragDropImage') }}
          </p>
          <p class="mt-1 text-xs text-gray-500 dark:text-gray-500">
            {{ t('productForm.imageFormats') }}
          </p>
          <button
            type="button"
            class="mt-3 inline-flex items-center px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800"
            @click="triggerFeaturedImageInput"
          >
            {{ t('productForm.selectImage') }}
          </button>
        </div>

        <div v-else class="relative">
          <img
            :src="featuredImagePreview"
            alt="Featured product image"
            class="max-h-48 mx-auto rounded-md object-contain"
          />
          <button
            type="button"
            @click.stop="removeFeaturedImage"
            class="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <!-- Loading indicator for base64 conversion -->
          <div v-if="convertingFeatured" class="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-md">
            <div class="text-white text-sm flex items-center">
              <svg class="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Converting...
            </div>
          </div>
        </div>
      </div>

      <input
        ref="featuredImageInput"
        type="file"
        accept="image/*"
        class="hidden"
        @change="onFeaturedImageChange"
        :disabled="disabled"
      />

      <p v-if="errorMessage" class="mt-2 text-sm text-red-600 dark:text-red-400 flex items-center">
        <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        {{ errorMessage }}
      </p>
    </div>

    <!-- Additional Images Upload -->
    <div>
      <label class="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
        {{ t('productForm.additionalImages') }}
        <span class="text-sm font-normal text-gray-500 dark:text-gray-400 ml-1">
          ({{ t('productForm.optional') }})
        </span>
      </label>

      <div class="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
        <!-- Existing Images -->
        <div
          v-for="(image, index) in additionalImagesPreview"
          :key="index"
          class="relative aspect-square border rounded-md overflow-hidden bg-gray-100 dark:bg-gray-800"
        >
          <img
            :src="image.preview"
            alt="Product image"
            class="w-full h-full object-contain"
          />
          <button
            type="button"
            @click="removeAdditionalImage(index)"
            class="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            :disabled="disabled || image.converting"
          >
            <svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <!-- Loading indicator for base64 conversion -->
          <div v-if="image.converting" class="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-md">
            <div class="text-white text-xs flex items-center">
              <svg class="animate-spin h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Converting...
            </div>
          </div>
        </div>

        <!-- Add Image Button -->
        <div
          v-if="additionalImages.length < maxAdditionalImages"
          class="aspect-square border-2 border-dashed rounded-md flex items-center justify-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          :class="[hasError ? 'border-red-500' : 'border-gray-300 dark:border-gray-600']"
          @click="triggerAdditionalImagesInput"
          @dragover.prevent="onDragOver"
          @dragleave.prevent="onDragLeave"
          @drop.prevent="onDropAdditionalImage"
        >
          <div class="text-center p-2">
            <svg class="mx-auto h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <span class="mt-1 text-xs text-gray-500 dark:text-gray-400 block">
              {{ t('productForm.addImage') }}
            </span>
          </div>
        </div>
      </div>

      <input
        ref="additionalImagesInput"
        type="file"
        accept="image/*"
        multiple
        class="hidden"
        @change="onAdditionalImagesChange"
        :disabled="disabled"
      />

      <p class="text-xs text-gray-500 dark:text-gray-400">
        {{ t('productForm.maxImages', { max: maxAdditionalImages }) }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from '@/composables/useI18n'
import type { ProductImageData } from '@/types/Product'

interface Props {
  featuredImage: ProductImageData | null
  additionalImages: ProductImageData[]
  hasError?: boolean
  errorMessage?: string
  disabled?: boolean
  maxAdditionalImages?: number
}

interface Emits {
  (e: 'update:featuredImage', value: ProductImageData | null): void
  (e: 'update:additionalImages', value: ProductImageData[]): void
}

const props = withDefaults(defineProps<Props>(), {
  featuredImage: null,
  additionalImages: () => [],
  hasError: false,
  errorMessage: '',
  disabled: false,
  maxAdditionalImages: 5
})

const emit = defineEmits<Emits>()
const { t } = useI18n()

const featuredImageInput = ref<HTMLInputElement | null>(null)
const additionalImagesInput = ref<HTMLInputElement | null>(null)
const isDragging = ref(false)
const convertingFeatured = ref(false)

// Image previews
const featuredImagePreview = computed(() => {
  if (!props.featuredImage) return ''

  if (props.featuredImage.url) {
    return props.featuredImage.url
  }

  if (props.featuredImage.base64) {
    return props.featuredImage.base64
  }

  if (props.featuredImage.file) {
    return URL.createObjectURL(props.featuredImage.file)
  }

  return ''
})

const additionalImagesPreview = computed(() => {
  return props.additionalImages.map((image, index) => {
    let preview = ''

    if (image.url) {
      preview = image.url
    } else if (image.base64) {
      preview = image.base64
    } else if (image.file) {
      preview = URL.createObjectURL(image.file)
    }

    return {
      preview,
      converting: !image.base64 && !image.url && !!image.file
    }
  })
})

// Convert File to base64
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = error => reject(error)
  })
}

// Create ProductImageData from File
const createImageData = async (file: File): Promise<ProductImageData> => {
  const base64 = await fileToBase64(file)

  return {
    file,
    base64,
    name: file.name,
    size: file.size,
    type: file.type
  }
}

// Input triggers
const triggerFeaturedImageInput = () => {
  if (props.disabled) return
  featuredImageInput.value?.click()
}

const triggerAdditionalImagesInput = () => {
  if (props.disabled) return
  additionalImagesInput.value?.click()
}

// Image change handlers
const onFeaturedImageChange = async (event: Event) => {
  const input = event.target as HTMLInputElement
  if (!input.files || input.files.length === 0) return

  const file = input.files[0]

  // Validate file type and size
  if (!validateImage(file)) return

  convertingFeatured.value = true

  try {
    const imageData = await createImageData(file)
    emit('update:featuredImage', imageData)
  } catch (error) {
    console.error('Failed to convert image to base64:', error)
  } finally {
    convertingFeatured.value = false
  }

  // Reset input to allow selecting the same file again
  input.value = ''
}

const onAdditionalImagesChange = async (event: Event) => {
  const input = event.target as HTMLInputElement
  if (!input.files || input.files.length === 0) return

  const files = Array.from(input.files)
  const validFiles = files.filter(validateImage)

  // Check max images limit
  const currentCount = props.additionalImages.length
  const newFiles = validFiles.slice(0, props.maxAdditionalImages - currentCount)

  if (newFiles.length > 0) {
    // Convert files to base64 in parallel
    try {
      const imageDataPromises = newFiles.map(file => createImageData(file))
      const imageDataArray = await Promise.all(imageDataPromises)

      emit('update:additionalImages', [...props.additionalImages, ...imageDataArray])
    } catch (error) {
      console.error('Failed to convert images to base64:', error)
    }
  }

  // Reset input to allow selecting the same files again
  input.value = ''
}

// Drag and drop handlers
const onDragOver = () => {
  if (props.disabled) return
  isDragging.value = true
}

const onDragLeave = () => {
  isDragging.value = false
}

const onDropFeaturedImage = async (event: DragEvent) => {
  if (props.disabled) return
  isDragging.value = false

  const files = event.dataTransfer?.files
  if (!files || files.length === 0) return

  const file = files[0]

  // Validate file type and size
  if (!validateImage(file)) return

  convertingFeatured.value = true

  try {
    const imageData = await createImageData(file)
    emit('update:featuredImage', imageData)
  } catch (error) {
    console.error('Failed to convert image to base64:', error)
  } finally {
    convertingFeatured.value = false
  }
}

const onDropAdditionalImage = async (event: DragEvent) => {
  if (props.disabled) return
  isDragging.value = false

  const files = event.dataTransfer?.files
  if (!files || files.length === 0) return

  const droppedFiles = Array.from(files)
  const validFiles = droppedFiles.filter(validateImage)

  // Check max images limit
  const currentCount = props.additionalImages.length
  const newFiles = validFiles.slice(0, props.maxAdditionalImages - currentCount)

  if (newFiles.length > 0) {
    try {
      const imageDataPromises = newFiles.map(file => createImageData(file))
      const imageDataArray = await Promise.all(imageDataPromises)

      emit('update:additionalImages', [...props.additionalImages, ...imageDataArray])
    } catch (error) {
      console.error('Failed to convert images to base64:', error)
    }
  }
}

// Remove image handlers
const removeFeaturedImage = () => {
  if (props.disabled) return
  emit('update:featuredImage', null)
}

const removeAdditionalImage = (index: number) => {
  if (props.disabled) return
  const updatedImages = [...props.additionalImages]
  updatedImages.splice(index, 1)
  emit('update:additionalImages', updatedImages)
}

// Image validation
const validateImage = (file: File): boolean => {
  // Check file type
  const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
  if (!validTypes.includes(file.type)) {
    console.error('Invalid file type:', file.type)
    return false
  }

  // Check file size (5MB max)
  const maxSize = 5 * 1024 * 1024 // 5MB
  if (file.size > maxSize) {
    console.error('File too large:', file.size)
    return false
  }

  return true
}

// Clean up object URLs on component unmount
watch(additionalImagesPreview, (newVal, oldVal) => {
  if (oldVal) {
    oldVal.forEach(item => {
      if (item.preview && item.preview.startsWith('blob:')) {
        URL.revokeObjectURL(item.preview)
      }
    })
  }
})

watch(featuredImagePreview, (newVal, oldVal) => {
  if (oldVal && typeof oldVal === 'string' && oldVal.startsWith('blob:')) {
    URL.revokeObjectURL(oldVal)
  }
})
</script>
