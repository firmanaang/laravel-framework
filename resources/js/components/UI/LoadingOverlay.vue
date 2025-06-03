<template>
  <div class="loading-overlay">
    <!-- Background with animated gradient -->
    <div class="loading-background"></div>

    <!-- Main loading container -->
    <div class="loading-container">
      <!-- Enhanced spinner with multiple rings -->
      <div class="loading-spinner-container">
        <div class="loading-ring loading-ring-1"></div>
        <div class="loading-ring loading-ring-2"></div>
        <div class="loading-ring loading-ring-3"></div>
        <div class="loading-center-dot"></div>
      </div>

      <!-- Enhanced text with typing animation -->
      <div class="loading-text-container">
        <h3 class="loading-title">{{ loadingTitle }}</h3>
        <p class="loading-subtitle">{{ loadingSubtitle }}</p>

        <!-- Progress dots -->
        <div class="loading-dots">
          <div class="loading-dot"></div>
          <div class="loading-dot"></div>
          <div class="loading-dot"></div>
        </div>
      </div>

      <!-- Environment info -->
      <div class="loading-info">
        <div class="loading-badge">
          <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          {{ environmentInfo }}
        </div>
      </div>
    </div>

    <!-- Floating particles -->
    <div class="loading-particles">
      <div v-for="i in 6" :key="i" class="loading-particle" :style="getParticleStyle(i)"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

const loadingTitle = ref('Loading Dashboard')
const loadingSubtitle = ref('Preparing your workspace...')

const environmentInfo = import.meta.env.DEV ? 'Development Mode' : 'Production Ready'

// Simulate loading progress
onMounted(() => {
  const messages = [
    'Initializing components...',
    'Loading user preferences...',
    'Connecting to services...',
    'Almost ready...'
  ]

  let messageIndex = 0
  const interval = setInterval(() => {
    if (messageIndex < messages.length) {
      loadingSubtitle.value = messages[messageIndex]
      messageIndex++
    } else {
      clearInterval(interval)
    }
  }, 800)
})

const getParticleStyle = (index: number) => {
  const delay = index * 0.5
  const duration = 3 + Math.random() * 2
  const size = 4 + Math.random() * 8

  return {
    '--delay': `${delay}s`,
    '--duration': `${duration}s`,
    '--size': `${size}px`,
    left: `${Math.random() * 100}%`,
    top: `${Math.random() * 100}%`
  }
}
</script>

<style scoped>
.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100vw;
  height: 100vh;
  z-index: 99999;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.loading-background {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg,
    #f8fafc 0%,
    #e2e8f0 25%,
    #f1f5f9 50%,
    #e2e8f0 75%,
    #f8fafc 100%
  );
  background-size: 400% 400%;
  animation: gradientShift 8s ease-in-out infinite;
}

.dark .loading-background {
  background: linear-gradient(135deg,
    #020617 0%,
    #0f172a 25%,
    #1e293b 50%,
    #0f172a 75%,
    #020617 100%
  );
}

.loading-container {
  position: relative;
  z-index: 10;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 2rem;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border-radius: 24px;
  border: 1px solid rgba(226, 232, 240, 0.5);
  box-shadow:
    0 20px 25px -5px rgba(0, 0, 0, 0.1),
    0 10px 10px -5px rgba(0, 0, 0, 0.04),
    0 0 0 1px rgba(255, 255, 255, 0.05);
  animation: containerFloat 6s ease-in-out infinite;
}

.dark .loading-container {
  background: rgba(15, 23, 42, 0.95);
  border-color: rgba(51, 65, 85, 0.5);
  box-shadow:
    0 20px 25px -5px rgba(0, 0, 0, 0.4),
    0 10px 10px -5px rgba(0, 0, 0, 0.2),
    0 0 0 1px rgba(255, 255, 255, 0.05);
}

.loading-spinner-container {
  position: relative;
  width: 80px;
  height: 80px;
  margin-bottom: 2rem;
}

.loading-ring {
  position: absolute;
  border-radius: 50%;
  border: 2px solid transparent;
  animation: spin 2s linear infinite;
}

.loading-ring-1 {
  width: 80px;
  height: 80px;
  border-top: 2px solid #3b82f6;
  border-right: 2px solid #3b82f6;
  animation-duration: 2s;
}

.loading-ring-2 {
  width: 60px;
  height: 60px;
  top: 10px;
  left: 10px;
  border-top: 2px solid #8b5cf6;
  border-left: 2px solid #8b5cf6;
  animation-duration: 1.5s;
  animation-direction: reverse;
}

.loading-ring-3 {
  width: 40px;
  height: 40px;
  top: 20px;
  left: 20px;
  border-top: 2px solid #06b6d4;
  border-bottom: 2px solid #06b6d4;
  animation-duration: 1s;
}

.loading-center-dot {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 12px;
  height: 12px;
  background: linear-gradient(45deg, #3b82f6, #8b5cf6);
  border-radius: 50%;
  transform: translate(-50%, -50%);
  animation: pulse 2s ease-in-out infinite;
}

.loading-text-container {
  margin-bottom: 1.5rem;
}

.loading-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 0.5rem;
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: titleGlow 3s ease-in-out infinite;
}

.dark .loading-title {
  color: #f8fafc;
}

.loading-subtitle {
  font-size: 0.875rem;
  color: #64748b;
  font-weight: 500;
  margin-bottom: 1rem;
  min-height: 1.25rem;
  animation: textFade 2s ease-in-out infinite;
}

.dark .loading-subtitle {
  color: #94a3b8;
}

.loading-dots {
  display: flex;
  justify-content: center;
  gap: 0.5rem;
}

.loading-dot {
  width: 8px;
  height: 8px;
  background: #3b82f6;
  border-radius: 50%;
  animation: dotBounce 1.4s ease-in-out infinite both;
}

.loading-dot:nth-child(1) { animation-delay: -0.32s; }
.loading-dot:nth-child(2) { animation-delay: -0.16s; }
.loading-dot:nth-child(3) { animation-delay: 0s; }

.loading-info {
  margin-top: 1rem;
}

.loading-badge {
  display: inline-flex;
  align-items: center;
  padding: 0.5rem 1rem;
  background: rgba(59, 130, 246, 0.1);
  color: #3b82f6;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  border: 1px solid rgba(59, 130, 246, 0.2);
}

.dark .loading-badge {
  background: rgba(59, 130, 246, 0.2);
  color: #93c5fd;
  border-color: rgba(59, 130, 246, 0.3);
}

.loading-particles {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}

.loading-particle {
  position: absolute;
  width: var(--size);
  height: var(--size);
  background: linear-gradient(45deg, #3b82f6, #8b5cf6);
  border-radius: 50%;
  opacity: 0.6;
  animation: particleFloat var(--duration) ease-in-out infinite;
  animation-delay: var(--delay);
}

/* Animations */
@keyframes gradientShift {
  0%, 100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
}

@keyframes containerFloat {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-10px); }
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

@keyframes pulse {
  0%, 100% {
    transform: translate(-50%, -50%) scale(1);
    opacity: 1;
  }
  50% {
    transform: translate(-50%, -50%) scale(1.2);
    opacity: 0.8;
  }
}

@keyframes titleGlow {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.8; }
}

@keyframes textFade {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

@keyframes dotBounce {
  0%, 80%, 100% {
    transform: scale(0);
    opacity: 0.5;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}

@keyframes particleFloat {
  0% {
    transform: translateY(100vh) rotate(0deg);
    opacity: 0;
  }
  10% {
    opacity: 0.6;
  }
  90% {
    opacity: 0.6;
  }
  100% {
    transform: translateY(-100px) rotate(360deg);
    opacity: 0;
  }
}

/* Responsive adjustments */
@media (max-width: 640px) {
  .loading-container {
    padding: 1.5rem;
    margin: 1rem;
  }

  .loading-spinner-container {
    width: 60px;
    height: 60px;
  }

  .loading-ring-1 {
    width: 60px;
    height: 60px;
  }

  .loading-ring-2 {
    width: 45px;
    height: 45px;
    top: 7.5px;
    left: 7.5px;
  }

  .loading-ring-3 {
    width: 30px;
    height: 30px;
    top: 15px;
    left: 15px;
  }

  .loading-title {
    font-size: 1.25rem;
  }

  .loading-subtitle {
    font-size: 0.8rem;
  }
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
  .loading-ring,
  .loading-center-dot,
  .loading-particle {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
  }

  .loading-container {
    animation: none;
  }

  .loading-background {
    animation: none;
    background: #f8fafc;
  }

  .dark .loading-background {
    background: #020617;
  }
}
</style>
