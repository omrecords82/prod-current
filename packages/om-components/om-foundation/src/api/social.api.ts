/**
 * Social API Service for OrthodMetrics
 * Handles social features including blog posts, comments, likes, and social interactions
 */

import { apiJson } from '@/shared/lib/apiClient';

// Social types
export interface BlogPost {
  id: number;
  title: string;
  content: string;
  excerpt: string;
  slug: string;
  authorId: number;
  authorName: string;
  authorAvatar?: string;
  featuredImage?: string;
  tags: string[];
  category: string;
  status: 'draft' | 'published' | 'archived';
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  isLiked: boolean;
  isBookmarked: boolean;
}

export interface BlogPostFilters {
  search?: string;
  category?: string;
  tags?: string[];
  authorId?: number;
  status?: string;
  publishedAfter?: string;
  publishedBefore?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface BlogPostResponse {
  posts: BlogPost[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface Comment {
  id: number;
  postId: number;
  authorId: number;
  authorName: string;
  authorAvatar?: string;
  content: string;
  parentId?: number;
  replies: Comment[];
  likeCount: number;
  isLiked: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CommentFilters {
  postId?: number;
  parentId?: number;
  authorId?: number;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface CommentResponse {
  comments: Comment[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface Like {
  id: number;
  userId: number;
  resourceType: 'post' | 'comment';
  resourceId: number;
  createdAt: string;
}

export interface Bookmark {
  id: number;
  userId: number;
  postId: number;
  createdAt: string;
}

export interface SocialUser {
  id: number;
  username: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  bio?: string;
  location?: string;
  website?: string;
  followerCount: number;
  followingCount: number;
  postCount: number;
  isFollowing: boolean;
  isFollower: boolean;
}

export interface SocialUserFilters {
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface SocialUserResponse {
  users: SocialUser[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface FollowRelationship {
  id: number;
  followerId: number;
  followingId: number;
  createdAt: string;
}

export interface Notification {
  id: number;
  userId: number;
  type: 'like' | 'comment' | 'follow' | 'mention' | 'post';
  title: string;
  message: string;
  data: any;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationResponse {
  notifications: Notification[];
  total: number;
  unreadCount: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Social API class
export class SocialAPI {
  private baseUrl = '/social';

  // Blog Posts
  /**
   * Get blog posts with filters
   */
  async getBlogPosts(filters: BlogPostFilters = {}): Promise<BlogPostResponse> {
    const params = new URLSearchParams();
    
    if (filters.search) params.append('search', filters.search);
    if (filters.category) params.append('category', filters.category);
    if (filters.tags?.length) params.append('tags', filters.tags.join(','));
    if (filters.authorId) params.append('authorId', filters.authorId.toString());
    if (filters.status) params.append('status', filters.status);
    if (filters.publishedAfter) params.append('publishedAfter', filters.publishedAfter);
    if (filters.publishedBefore) params.append('publishedBefore', filters.publishedBefore);
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.limit) params.append('limit', filters.limit.toString());
    if (filters.sortBy) params.append('sortBy', filters.sortBy);
    if (filters.sortOrder) params.append('sortOrder', filters.sortOrder);

    const queryString = params.toString();
    const url = queryString ? `${this.baseUrl}/blog/posts?${queryString}` : `${this.baseUrl}/blog/posts`;

    return apiJson<BlogPostResponse>(url);
  }

  /**
   * Get blog post by ID or slug
   */
  async getBlogPost(idOrSlug: string | number): Promise<BlogPost> {
    return apiJson<BlogPost>(`${this.baseUrl}/blog/posts/${idOrSlug}`);
  }

  /**
   * Create new blog post
   */
  async createBlogPost(post: Omit<BlogPost, 'id' | 'createdAt' | 'updatedAt' | 'viewCount' | 'likeCount' | 'commentCount' | 'isLiked' | 'isBookmarked'>): Promise<BlogPost> {
    return apiJson<BlogPost>(`${this.baseUrl}/blog/posts`, {
      method: 'POST',
      body: JSON.stringify(post)
    });
  }

  /**
   * Update blog post
   */
  async updateBlogPost(id: number, post: Partial<BlogPost>): Promise<BlogPost> {
    return apiJson<BlogPost>(`${this.baseUrl}/blog/posts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(post)
    });
  }

  /**
   * Delete blog post
   */
  async deleteBlogPost(id: number): Promise<void> {
    return apiJson<void>(`${this.baseUrl}/blog/posts/${id}`, {
      method: 'DELETE'
    });
  }

  /**
   * Like/unlike blog post
   */
  async toggleLikePost(postId: number): Promise<{ isLiked: boolean; likeCount: number }> {
    return apiJson<{ isLiked: boolean; likeCount: number }>(`${this.baseUrl}/blog/posts/${postId}/react`, {
      method: 'POST',
      body: JSON.stringify({ reaction_type: 'like' })
    });
  }

  /**
   * Remove reaction from blog post
   */
  async removePostReaction(postId: number): Promise<void> {
    return apiJson<void>(`${this.baseUrl}/blog/posts/${postId}/react`, {
      method: 'DELETE'
    });
  }

  // Comments
  /**
   * Get comments for a post
   */
  async getComments(postId: number, filters: Omit<CommentFilters, 'postId'> = {}): Promise<CommentResponse> {
    const params = new URLSearchParams();

    if (filters.parentId) params.append('parentId', filters.parentId.toString());
    if (filters.authorId) params.append('authorId', filters.authorId.toString());
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.limit) params.append('limit', filters.limit.toString());
    if (filters.sortBy) params.append('sortBy', filters.sortBy);
    if (filters.sortOrder) params.append('sortOrder', filters.sortOrder);

    const queryString = params.toString();
    const url = queryString
      ? `${this.baseUrl}/blog/posts/${postId}/comments?${queryString}`
      : `${this.baseUrl}/blog/posts/${postId}/comments`;

    return apiJson<CommentResponse>(url);
  }

  /**
   * Create new comment on a post
   */
  async createComment(postId: number, data: { content: string; parent_id?: number }): Promise<Comment> {
    return apiJson<Comment>(`${this.baseUrl}/blog/posts/${postId}/comments`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  // Users
  /**
   * Get social users
   */
  async getSocialUsers(filters: SocialUserFilters = {}): Promise<SocialUserResponse> {
    const params = new URLSearchParams();
    
    if (filters.search) params.append('search', filters.search);
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.limit) params.append('limit', filters.limit.toString());
    if (filters.sortBy) params.append('sortBy', filters.sortBy);
    if (filters.sortOrder) params.append('sortOrder', filters.sortOrder);

    const queryString = params.toString();
    const url = queryString ? `${this.baseUrl}/users?${queryString}` : `${this.baseUrl}/users`;
    
    return apiJson<SocialUserResponse>(url);
  }

  /**
   * Get social user by ID
   */
  async getSocialUser(id: number): Promise<SocialUser> {
    return apiJson<SocialUser>(`${this.baseUrl}/users/${id}`);
  }

  /**
   * Follow/unfollow user
   */
  async toggleFollow(userId: number): Promise<{ isFollowing: boolean; followerCount: number }> {
    return apiJson<{ isFollowing: boolean; followerCount: number }>(`${this.baseUrl}/users/${userId}/follow`, {
      method: 'POST'
    });
  }

  /**
   * Get user's followers
   */
  async getFollowers(userId: number, page: number = 1, limit: number = 20): Promise<SocialUserResponse> {
    return apiJson<SocialUserResponse>(`${this.baseUrl}/users/${userId}/followers?page=${page}&limit=${limit}`);
  }

  /**
   * Get user's following
   */
  async getFollowing(userId: number, page: number = 1, limit: number = 20): Promise<SocialUserResponse> {
    return apiJson<SocialUserResponse>(`${this.baseUrl}/users/${userId}/following?page=${page}&limit=${limit}`);
  }

  // Notifications
  /**
   * Get user notifications
   */
  async getNotifications(page: number = 1, limit: number = 20): Promise<NotificationResponse> {
    return apiJson<NotificationResponse>(`${this.baseUrl}/notifications?page=${page}&limit=${limit}`);
  }

  /**
   * Mark notification as read
   */
  async markNotificationAsRead(id: number): Promise<void> {
    return apiJson<void>(`${this.baseUrl}/notifications/${id}/read`, {
      method: 'PUT'
    });
  }

  /**
   * Mark all notifications as read
   */
  async markAllNotificationsAsRead(): Promise<void> {
    return apiJson<void>(`${this.baseUrl}/notifications/mark-all-read`, {
      method: 'PUT'
    });
  }

  /**
   * Delete notification
   */
  async deleteNotification(id: number): Promise<void> {
    return apiJson<void>(`${this.baseUrl}/notifications/${id}`, {
      method: 'DELETE'
    });
  }

  // Categories and Tags
  /**
   * Get blog categories
   */
  async getCategories(): Promise<Array<{ id: number; name: string; slug: string; postCount: number }>> {
    return apiJson(`${this.baseUrl}/blog/categories`);
  }

  /**
   * Get popular tags
   */
  async getPopularTags(limit: number = 20): Promise<Array<{ name: string; count: number }>> {
    return apiJson(`${this.baseUrl}/blog/tags/popular?limit=${limit}`);
  }

  /**
   * Search tags
   */
  async searchTags(query: string): Promise<Array<{ name: string; count: number }>> {
    return apiJson(`${this.baseUrl}/blog/tags/search?q=${encodeURIComponent(query)}`);
  }

  // Chat
  chat = {
    /**
     * Get all conversations for the current user
     */
    getConversations: async (): Promise<any[]> => {
      return apiJson<any[]>(`${this.baseUrl}/chat/conversations`);
    },

    /**
     * Get a specific conversation
     */
    getConversation: async (conversationId: number): Promise<any> => {
      return apiJson<any>(`${this.baseUrl}/chat/conversations/${conversationId}`);
    },

    /**
     * Get messages for a conversation
     */
    getMessages: async (conversationId: number, offset: number = 0, limit: number = 50): Promise<any> => {
      return apiJson<any>(`${this.baseUrl}/chat/conversations/${conversationId}/messages?offset=${offset}&limit=${limit}`);
    },

    /**
     * Send a message
     */
    sendMessage: async (conversationId: number, data: { content: string; message_type?: string; reply_to_id?: number }): Promise<any> => {
      return apiJson<any>(`${this.baseUrl}/chat/conversations/${conversationId}/messages`, {
        method: 'POST',
        body: JSON.stringify(data)
      });
    },

    /**
     * Edit a message
     */
    editMessage: async (messageId: number, data: { content: string }): Promise<any> => {
      return apiJson<any>(`${this.baseUrl}/chat/messages/${messageId}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      });
    },

    /**
     * Delete a message
     */
    deleteMessage: async (messageId: number): Promise<void> => {
      return apiJson<void>(`${this.baseUrl}/chat/messages/${messageId}`, {
        method: 'DELETE'
      });
    },

    /**
     * Mark conversation as read
     */
    markAsRead: async (conversationId: number): Promise<void> => {
      return apiJson<void>(`${this.baseUrl}/chat/conversations/${conversationId}/read`, {
        method: 'PUT'
      });
    },

    /**
     * React to a message
     */
    reactToMessage: async (messageId: number, data: { reaction_type: string }): Promise<any> => {
      return apiJson<any>(`${this.baseUrl}/chat/messages/${messageId}/react`, {
        method: 'POST',
        body: JSON.stringify(data)
      });
    },

    /**
     * Create a new conversation
     */
    createConversation: async (data: { type: string; participant_ids: number[]; name?: string }): Promise<any> => {
      return apiJson<any>(`${this.baseUrl}/chat/conversations`, {
        method: 'POST',
        body: JSON.stringify(data)
      });
    },

    /**
     * Start a direct conversation with a friend
     */
    startConversation: async (userId: number): Promise<any> => {
      return apiJson<any>(`${this.baseUrl}/chat/start/${userId}`, {
        method: 'POST'
      });
    },
  };

  // Friends
  friends = {
    /**
     * Get all friends
     */
    getAll: async (): Promise<any[]> => {
      return apiJson<any[]>(`${this.baseUrl}/friends`);
    },

    /**
     * Get friend requests
     */
    getRequests: async (): Promise<any> => {
      return apiJson<any>(`${this.baseUrl}/friends/requests?type=all&status=all`);
    },

    /**
     * Search for friends
     */
    search: async (query: string): Promise<any> => {
      return apiJson<any>(`${this.baseUrl}/friends/search?q=${encodeURIComponent(query)}`);
    },

    /**
     * Send friend request
     */
    sendRequest: async (userId: number): Promise<any> => {
      return apiJson<any>(`${this.baseUrl}/friends/request/${userId}`, {
        method: 'POST',
        body: JSON.stringify({})
      });
    },

    /**
     * Respond to friend request (accept/reject)
     */
    respondToRequest: async (requestId: number, data: { action: 'accept' | 'reject' }): Promise<any> => {
      // Backend expects PUT with action in body
      const action = data.action === 'accept' ? 'accept' : 'decline';
      return apiJson<any>(`${this.baseUrl}/friends/requests/${requestId}`, {
        method: 'PUT',
        body: JSON.stringify({ action })
      });
    },

    /**
     * Remove friend
     */
    remove: async (friendId: number): Promise<void> => {
      return apiJson<void>(`${this.baseUrl}/friends/${friendId}`, {
        method: 'DELETE'
      });
    },
  };

  // Notifications
  notifications = {
    /**
     * Get all notifications
     */
    getAll: async (filters?: any): Promise<any> => {
      const params = new URLSearchParams();
      if (filters?.unread) params.append('unread', 'true');
      if (filters?.type) params.append('type', filters.type);
      if (filters?.page) params.append('page', filters.page.toString());
      if (filters?.limit) params.append('limit', filters.limit.toString());
      
      const queryString = params.toString();
      const url = queryString ? `${this.baseUrl}/notifications?${queryString}` : `${this.baseUrl}/notifications`;
      return apiJson<any>(url);
    },

    /**
     * Get notification settings
     */
    getSettings: async (): Promise<any> => {
      return apiJson<any>(`${this.baseUrl}/notifications/settings`);
    },

    /**
     * Mark notification as read
     */
    markAsRead: async (notificationId: number): Promise<void> => {
      return apiJson<void>(`${this.baseUrl}/notifications/${notificationId}/read`, {
        method: 'PUT'
      });
    },

    /**
     * Mark all notifications as read
     */
    markAllAsRead: async (): Promise<void> => {
      return apiJson<void>(`${this.baseUrl}/notifications/mark-all-read`, {
        method: 'PUT'
      });
    },

    /**
     * Delete notification
     */
    delete: async (notificationId: number): Promise<void> => {
      return apiJson<void>(`${this.baseUrl}/notifications/${notificationId}`, {
        method: 'DELETE'
      });
    },

    /**
     * Update notification settings
     */
    updateSettings: async (settings: any): Promise<any> => {
      return apiJson<any>(`${this.baseUrl}/notifications/settings`, {
        method: 'PUT',
        body: JSON.stringify(settings)
      });
    },
  };
}

// Export singleton instance
export const socialAPI = new SocialAPI();
