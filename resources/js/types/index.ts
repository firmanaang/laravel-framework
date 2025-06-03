// resources/js/types/index.ts
export interface Post {
  id: string | number;
  title: string;
  content: string;
  author: string;
  created_at: string;
  updated_at: string;
  _isOffline?: boolean;
  _tempId?: string;
  _isDeleted?: boolean;
}

export interface OfflineOperation {
  id: string | number;
  type: 'create' | 'update' | 'delete';
  data?: Partial<Post>;
  postId?: string | number;
  timestamp: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  offline?: boolean;
}

export interface PostsState {
  posts: Post[];
  currentPost: Post | null;
  loading: boolean;
  error: string | null;
  isOnline: boolean;
  offlineQueue: OfflineOperation[];
  syncing: boolean;
}

export interface ToastMessage {
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
}

export interface FormErrors {
  [key: string]: string[];
}
