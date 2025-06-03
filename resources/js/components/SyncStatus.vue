<!-- resources/js/components/SyncStatus.vue -->
<template>
  <div v-if="hasPendingOperations || syncing" class="sync-status-widget">
    <div class="sync-content" :class="{ syncing: syncing }">
      <div class="sync-icon">
        <span v-if="syncing" class="spinner-icon">🔄</span>
        <span v-else class="pending-icon">⏳</span>
      </div>

      <div class="sync-text">
        <div class="sync-title">
          {{ syncing ? 'Syncing...' : 'Pending Sync' }}
        </div>
        <div class="sync-details">
          {{ pendingOperations }} operation{{ pendingOperations !== 1 ? 's' : '' }}
          {{ syncing ? 'syncing' : 'waiting' }}
        </div>
      </div>

      <button v-if="!syncing && isOnline" @click="forcSync" class="sync-button">
        Sync Now
      </button>
    </div>

    <div class="sync-progress" v-if="syncing">
      <div class="progress-bar"></div>
    </div>
  </div>
</template>

<script>
import { computed } from 'vue';
import { usePostsStore } from '../stores/posts';

export default {
  name: 'SyncStatus',
  setup() {
    const postsStore = usePostsStore();

    const forcSync = () => {
      postsStore.syncOfflineOperations();
    };

    return {
      hasPendingOperations: computed(() => postsStore.hasPendingOperations),
      pendingOperations: computed(() => postsStore.pendingOperations),
      syncing: computed(() => postsStore.syncing),
      isOnline: computed(() => postsStore.isOnline),
      forcSync
    };
  }
};
</script>

<style scoped>
.sync-status-widget {
  position: fixed;
  bottom: 2rem;
  right: 2rem;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  border: 1px solid #e9ecef;
  overflow: hidden;
  z-index: 1000;
  min-width: 280px;
}

.sync-content {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
}

.sync-content.syncing {
  background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
}

.sync-icon {
  font-size: 1.5rem;
  flex-shrink: 0;
}

.spinner-icon {
  animation: spin 1s linear infinite;
  display: inline-block;
}

.sync-text {
  flex: 1;
}

.sync-title {
  font-weight: 600;
  color: #2c3e50;
  font-size: 0.9rem;
}

.sync-details {
  color: #6c757d;
  font-size: 0.8rem;
  margin-top: 0.25rem;
}

.sync-button {
  background-color: #007bff;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.8rem;
  font-weight: 600;
  transition: background-color 0.3s;
}

.sync-button:hover {
  background-color: #0056b3;
}

.sync-progress {
  height: 3px;
  background-color: #e9ecef;
  overflow: hidden;
}

.progress-bar {
  height: 100%;
  background: linear-gradient(90deg, #007bff, #0056b3);
  animation: progress 2s ease-in-out infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

@keyframes progress {
  0% { transform: translateX(-100%); }
  50% { transform: translateX(0%); }
  100% { transform: translateX(100%); }
}

@media (max-width: 768px) {
  .sync-status-widget {
    bottom: 1rem;
    right: 1rem;
    left: 1rem;
    min-width: auto;
  }
}
</style>
