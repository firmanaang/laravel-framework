// resources/js/stores/posts.ts
import { defineStore } from 'pinia';
import axios, { AxiosError } from 'axios';
import type { Post, OfflineOperation, ApiResponse, PostsState } from '@/types';

export const usePostsStore = defineStore('posts', {
    state: (): PostsState => ({
        posts: [],
        currentPost: null,
        loading: false,
        error: null,
        isOnline: navigator.onLine,
        offlineQueue: [],
        syncing: false
    }),

    getters: {
        pendingOperations: (state): number => state.offlineQueue.length,
        hasPendingOperations: (state): boolean => state.offlineQueue.length > 0
    },

    actions: {
        // Generate temporary ID untuk post offline
        generateTempId(): string {
            return `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        },

        async fetchPosts(): Promise<void> {
            this.loading = true;
            this.error = null;

            try {
                if (this.isOnline) {
                    console.log('Fetching posts from API...');
                    const response = await axios.get<Post[]>('/api/posts');
                    console.log('API Response:', response.data);

                    this.posts = response.data;
                    localStorage.setItem('posts', JSON.stringify(response.data));
                    localStorage.setItem('posts_timestamp', Date.now().toString());
                } else {
                    console.log('Loading posts from cache (offline)...');
                    this.loadFromCache();
                }
            } catch (error) {
                console.error('Error fetching posts:', error);
                this.handleApiError(error as AxiosError);
                this.loadFromCache();
            } finally {
                this.loading = false;
            }
        },

        async createPost(postData: Omit<Post, 'id' | 'created_at' | 'updated_at'>): Promise<ApiResponse<Post>> {
            if (this.isOnline) {
                return await this.createPostOnline(postData);
            } else {
                return this.createPostOffline(postData);
            }
        },

        async createPostOnline(postData: Omit<Post, 'id' | 'created_at' | 'updated_at'>): Promise<ApiResponse<Post>> {
            try {
                this.loading = true;
                const response = await axios.post<Post>('/api/posts', postData);

                // Add to local posts array
                this.posts.unshift(response.data);

                // Update cache
                localStorage.setItem('posts', JSON.stringify(this.posts));

                return { success: true, data: response.data };
            } catch (error) {
                console.error('Error creating post online:', error);

                // Fallback to offline mode
                const axiosError = error as AxiosError;
                if (axiosError.response?.status >= 500 || !axiosError.response) {
                    return this.createPostOffline(postData);
                }

                return {
                    success: false,
                    error: axiosError.response?.data?.message || 'Failed to create post'
                };
            } finally {
                this.loading = false;
            }
        },

        createPostOffline(postData: Omit<Post, 'id' | 'created_at' | 'updated_at'>): ApiResponse<Post> {
            const tempId = this.generateTempId();
            const newPost: Post = {
                id: tempId,
                ...postData,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                _isOffline: true,
                _tempId: tempId
            };

            // Add to posts array
            this.posts.unshift(newPost);

            // Add to offline queue
            this.offlineQueue.push({
                id: tempId,
                type: 'create',
                data: postData,
                timestamp: Date.now()
            });

            // Update cache
            localStorage.setItem('posts', JSON.stringify(this.posts));
            localStorage.setItem('offlineQueue', JSON.stringify(this.offlineQueue));

            return { success: true, data: newPost, offline: true };
        },

        async updatePost(id: string | number, postData: Partial<Post>): Promise<ApiResponse<Post>> {
            if (this.isOnline) {
                return await this.updatePostOnline(id, postData);
            } else {
                return this.updatePostOffline(id, postData);
            }
        },

        async updatePostOnline(id: string | number, postData: Partial<Post>): Promise<ApiResponse<Post>> {
            try {
                this.loading = true;
                const response = await axios.put<Post>(`/api/posts/${id}`, postData);

                // Update local posts array
                const index = this.posts.findIndex(post => post.id === id);
                if (index !== -1) {
                    this.posts[index] = response.data;
                }

                // Update current post if it's the same
                if (this.currentPost?.id === id) {
                    this.currentPost = response.data;
                }

                // Update cache
                localStorage.setItem('posts', JSON.stringify(this.posts));
                localStorage.setItem(`post_${id}`, JSON.stringify(response.data));

                return { success: true, data: response.data };
            } catch (error) {
                console.error('Error updating post online:', error);

                // Fallback to offline mode
                const axiosError = error as AxiosError;
                if (axiosError.response?.status >= 500 || !axiosError.response) {
                    return this.updatePostOffline(id, postData);
                }

                return {
                    success: false,
                    error: axiosError.response?.data?.message || 'Failed to update post'
                };
            } finally {
                this.loading = false;
            }
        },

        updatePostOffline(id: string | number, postData: Partial<Post>): ApiResponse<Post> {
            // Update local posts array
            const index = this.posts.findIndex(post => post.id === id);
            if (index !== -1) {
                this.posts[index] = {
                    ...this.posts[index],
                    ...postData,
                    updated_at: new Date().toISOString(),
                    _isOffline: true
                };
            }

            // Update current post if it's the same
            if (this.currentPost?.id === id) {
                this.currentPost = {
                    ...this.currentPost,
                    ...postData,
                    updated_at: new Date().toISOString(),
                    _isOffline: true
                };
            }

            // Add to offline queue
            this.offlineQueue.push({
                id: Date.now(),
                type: 'update',
                postId: id,
                data: postData,
                timestamp: Date.now()
            });

            // Update cache
            localStorage.setItem('posts', JSON.stringify(this.posts));
            localStorage.setItem('offlineQueue', JSON.stringify(this.offlineQueue));

            return { success: true, data: this.posts[index], offline: true };
        },

        async deletePost(id: string | number): Promise<ApiResponse> {
            if (this.isOnline) {
                return await this.deletePostOnline(id);
            } else {
                return this.deletePostOffline(id);
            }
        },

        async deletePostOnline(id: string | number): Promise<ApiResponse> {
            try {
                this.loading = true;
                await axios.delete(`/api/posts/${id}`);

                // Remove from local posts array
                this.posts = this.posts.filter(post => post.id !== id);

                // Clear current post if it's the same
                if (this.currentPost?.id === id) {
                    this.currentPost = null;
                }

                // Update cache
                localStorage.setItem('posts', JSON.stringify(this.posts));
                localStorage.removeItem(`post_${id}`);

                return { success: true };
            } catch (error) {
                console.error('Error deleting post online:', error);

                // Fallback to offline mode
                const axiosError = error as AxiosError;
                if (axiosError.response?.status >= 500 || !axiosError.response) {
                    return this.deletePostOffline(id);
                }

                return {
                    success: false,
                    error: axiosError.response?.data?.message || 'Failed to delete post'
                };
            } finally {
                this.loading = false;
            }
        },

        deletePostOffline(id: string | number): ApiResponse {
            // Mark as deleted locally
            const index = this.posts.findIndex(post => post.id === id);
            if (index !== -1) {
                this.posts[index]._isDeleted = true;
                this.posts[index]._isOffline = true;
            }

            // Add to offline queue
            this.offlineQueue.push({
                id: Date.now(),
                type: 'delete',
                postId: id,
                timestamp: Date.now()
            });

            // Update cache
            localStorage.setItem('posts', JSON.stringify(this.posts));
            localStorage.setItem('offlineQueue', JSON.stringify(this.offlineQueue));

            return { success: true, offline: true };
        },

        // Sync offline operations when back online
        async syncOfflineOperations(): Promise<void> {
            if (!this.isOnline || this.offlineQueue.length === 0) return;

            this.syncing = true;
            const failedOperations: OfflineOperation[] = [];

            for (const operation of this.offlineQueue) {
                try {
                    switch (operation.type) {
                        case 'create':
                            await this.syncCreateOperation(operation);
                            break;
                        case 'update':
                            await this.syncUpdateOperation(operation);
                            break;
                        case 'delete':
                            await this.syncDeleteOperation(operation);
                            break;
                    }
                } catch (error) {
                    console.error('Failed to sync operation:', operation, error);
                    failedOperations.push(operation);
                }
            }

            // Keep only failed operations in queue
            this.offlineQueue = failedOperations;
            localStorage.setItem('offlineQueue', JSON.stringify(this.offlineQueue));

            this.syncing = false;

            // Refresh posts after sync
            if (failedOperations.length < this.offlineQueue.length) {
                await this.fetchPosts();
            }
        },

        async syncCreateOperation(operation: OfflineOperation): Promise<void> {
            if (!operation.data) return;

            const response = await axios.post<Post>('/api/posts', operation.data);

            // Replace temp post with real post
            const tempIndex = this.posts.findIndex(post => post._tempId === operation.id);
            if (tempIndex !== -1) {
                this.posts[tempIndex] = response.data;
            }
        },

        async syncUpdateOperation(operation: OfflineOperation): Promise<void> {
            if (!operation.data || !operation.postId) return;

            await axios.put(`/api/posts/${operation.postId}`, operation.data);
        },

        async syncDeleteOperation(operation: OfflineOperation): Promise<void> {
            if (!operation.postId) return;

            await axios.delete(`/api/posts/${operation.postId}`);

            // Remove from local posts
            this.posts = this.posts.filter(post => post.id !== operation.postId);
        },

        loadFromCache(): void {
            try {
                const cachedPosts = localStorage.getItem('posts');
                const cachedQueue = localStorage.getItem('offlineQueue');

                if (cachedPosts) {
                    this.posts = JSON.parse(cachedPosts);
                }

                if (cachedQueue) {
                    this.offlineQueue = JSON.parse(cachedQueue);
                }
            } catch (error) {
                console.error('Error loading from cache:', error);
            }
        },

        async fetchPost(id: string | number): Promise<void> {
            this.loading = true;
            this.error = null;

            try {
                if (this.isOnline) {
                    const response = await axios.get<Post>(`/api/posts/${id}`);
                    this.currentPost = response.data;
                    localStorage.setItem(`post_${id}`, JSON.stringify(response.data));
                } else {
                    this.loadPostFromCache(id);
                }
            } catch (error) {
                console.error(`Error fetching post ${id}:`, error);
                this.handleApiError(error as AxiosError);
                this.loadPostFromCache(id);
            } finally {
                this.loading = false;
            }
        },

        loadPostFromCache(id: string | number): void {
            try {
                const cachedPost = localStorage.getItem(`post_${id}`);
                if (cachedPost) {
                    this.currentPost = JSON.parse(cachedPost);
                } else {
                    this.currentPost = this.posts.find(post => post.id == id) || null;
                    if (!this.currentPost) {
                        this.error = 'Post not found in cache';
                    }
                }
            } catch (error) {
                console.error('Error loading post from cache:', error);
                this.error = 'Failed to load cached post';
            }
        },

        handleApiError(error: AxiosError): void {
            if (error.response) {
                this.error = `Server error: ${error.response.status} - ${error.response.data?.message || 'Unknown error'}`;
            } else if (error.request) {
                this.error = 'Network error: Unable to reach server';
            } else {
                this.error = `Error: ${error.message}`;
            }
        },

        updateOnlineStatus(): void {
            const wasOffline = !this.isOnline;
            this.isOnline = navigator.onLine;

            // Auto-sync when coming back online
            if (wasOffline && this.isOnline && this.offlineQueue.length > 0) {
                setTimeout(() => {
                    this.syncOfflineOperations();
                }, 1000);
            }
        },

        clearError(): void {
            this.error = null;
        }
    }
});
