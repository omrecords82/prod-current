import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useWebSocket } from './WebSocketContext';
import { apiClient } from '@/api/utils/axiosInstance';

// Types
export interface NotificationType {
    id: number;
    user_id: number;
    notification_type_id: number;
    title: string;
    message: string;
    data?: any;
    priority: 'low' | 'normal' | 'high' | 'urgent';
    is_read: boolean;
    is_dismissed: boolean;
    read_at?: string;
    dismissed_at?: string;
    expires_at?: string;
    action_url?: string;
    action_text?: string;
    icon?: string;
    image_url?: string;
    created_at: string;
    updated_at: string;
    type_name: string;
    category: string;
}

export interface NotificationCounts {
    total: number;
    unread: number;
    urgent: number;
    high: number;
}

export interface NotificationPreference {
    type_name: string;
    category: string;
    email_enabled: boolean;
    push_enabled: boolean;
    in_app_enabled: boolean;
    sms_enabled: boolean;
    frequency: 'immediate' | 'daily' | 'weekly' | 'monthly' | 'disabled';
}

interface NotificationContextType {
    // State
    notifications: NotificationType[];
    counts: NotificationCounts;
    preferences: NotificationPreference[];
    loading: boolean;
    error: string | null;

    // Actions
    fetchNotifications: (options?: {
        limit?: number;
        offset?: number;
        unread_only?: boolean;
        category?: string;
        priority?: string;
    }) => Promise<void>;
    fetchCounts: () => Promise<void>;
    fetchPreferences: () => Promise<void>;
    markAsRead: (id: number) => Promise<void>;
    markAllAsRead: () => Promise<void>;
    dismissNotification: (id: number) => Promise<void>;
    updatePreferences: (preferences: NotificationPreference[]) => Promise<void>;

    // Real-time updates
    addNotification: (notification: NotificationType) => void;
    updateNotification: (id: number, updates: Partial<NotificationType>) => void;
    removeNotification: (id: number) => void;

    // Utility functions
    getNotificationsByCategory: (category: string) => NotificationType[];
    getNotificationsByPriority: (priority: string) => NotificationType[];
    getUnreadCount: () => number;
    hasUnreadNotifications: () => boolean;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotifications must be used within a NotificationProvider');
    }
    return context;
};

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { authenticated, user } = useAuth();
    const { onNewNotification, isConnected } = useWebSocket();
    const [notifications, setNotifications] = useState<NotificationType[]>([]);
    const [counts, setCounts] = useState<NotificationCounts>({
        total: 0,
        unread: 0,
        urgent: 0,
        high: 0
    });
    const [preferences, setPreferences] = useState<NotificationPreference[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Fetch notifications
    const fetchNotifications = useCallback(async (options = {}) => {
        // Hard guard: Do not fetch if not authenticated or user not fully initialized
        if (!authenticated || !user || !user.id) return;

        try {
            setLoading(true);
            setError(null);

            const params = new URLSearchParams();
            if (options.limit) params.append('limit', options.limit.toString());
            if (options.offset) params.append('offset', options.offset.toString());
            if (options.unread_only) params.append('unread_only', 'true');
            if (options.category) params.append('category', options.category);
            if (options.priority) params.append('priority', options.priority);

            const data = await apiClient.get<any>(`/notifications?${params.toString()}`);
            if (data.success) {
                setNotifications(data.notifications);
            } else {
                setError(data.message || 'Failed to fetch notifications');
            }
        } catch (err: any) {
            setError(err.message || 'Failed to fetch notifications');
        } finally {
            setLoading(false);
        }
    }, [authenticated]);

    // Fetch notification counts
    const fetchCounts = useCallback(async () => {
        if (!authenticated) return;

        try {
            const data = await apiClient.get<any>('/notifications/counts');
            if (data.success) {
                setCounts(data.counts);
            }
        } catch (err: any) {
            // Silently handle errors - don't spam console
            return;
        }
    }, [authenticated]);

    // Fetch notification preferences
    const fetchPreferences = useCallback(async () => {
        // Hard guard: Do not fetch if not authenticated or user not fully initialized
        if (!authenticated || !user || !user.id) return;

        try {
            const data = await apiClient.get<any>('/notifications/preferences');
            if (data.success) {
                setPreferences(data.preferences);
            }
        } catch (err: any) {
            // Silently handle errors - don't spam console
            return;
        }
    }, [authenticated]);

    // Mark notification as read
    const markAsRead = useCallback(async (id: number) => {
        try {
            const data = await apiClient.put<any>(`/notifications/${id}/read`);
            if (data.success) {
                setNotifications(prev =>
                    prev.map(notification =>
                        notification.id === id
                            ? { ...notification, is_read: true, read_at: new Date().toISOString() }
                            : notification
                    )
                );
                fetchCounts(); // Refresh counts
            }
        } catch (err: any) {
            console.error('Error marking notification as read:', err);
        }
    }, [fetchCounts]);

    // Mark all notifications as read
    const markAllAsRead = useCallback(async () => {
        try {
            const data = await apiClient.put<any>('/notifications/read-all');
            if (data.success) {
                setNotifications(prev =>
                    prev.map(notification => ({
                        ...notification,
                        is_read: true,
                        read_at: new Date().toISOString()
                    }))
                );
                fetchCounts(); // Refresh counts
            }
        } catch (err: any) {
            console.error('Error marking all notifications as read:', err);
        }
    }, [fetchCounts]);

    // Dismiss notification
    const dismissNotification = useCallback(async (id: number) => {
        try {
            const data = await apiClient.delete<any>(`/notifications/${id}`);
            if (data.success) {
                setNotifications(prev => prev.filter(notification => notification.id !== id));
                fetchCounts(); // Refresh counts
            }
        } catch (err: any) {
            console.error('Error dismissing notification:', err);
        }
    }, [fetchCounts]);

    // Update notification preferences
    const updatePreferences = useCallback(async (newPreferences: NotificationPreference[]) => {
        try {
            const data = await apiClient.put<any>('/notifications/preferences', { preferences: newPreferences });
            if (data.success) {
                setPreferences(newPreferences);
            }
        } catch (err: any) {
            console.error('Error updating notification preferences:', err);
            throw err;
        }
    }, []);

    // Add notification (for real-time updates)
    const addNotification = useCallback((notification: NotificationType) => {
        setNotifications(prev => [notification, ...prev]);
        fetchCounts(); // Refresh counts
    }, [fetchCounts]);

    // Update notification (for real-time updates)
    const updateNotification = useCallback((id: number, updates: Partial<NotificationType>) => {
        setNotifications(prev =>
            prev.map(notification =>
                notification.id === id
                    ? { ...notification, ...updates }
                    : notification
            )
        );
        fetchCounts(); // Refresh counts
    }, [fetchCounts]);

    // Remove notification (for real-time updates)
    const removeNotification = useCallback((id: number) => {
        setNotifications(prev => prev.filter(notification => notification.id !== id));
        fetchCounts(); // Refresh counts
    }, [fetchCounts]);

    // Utility functions
    const getNotificationsByCategory = useCallback((category: string) => {
        return notifications.filter(notification => notification.category === category);
    }, [notifications]);

    const getNotificationsByPriority = useCallback((priority: string) => {
        return notifications.filter(notification => notification.priority === priority);
    }, [notifications]);

    const getUnreadCount = useCallback(() => {
        return notifications.filter(notification => !notification.is_read).length;
    }, [notifications]);

    const hasUnreadNotifications = useCallback(() => {
        return notifications.some(notification => !notification.is_read);
    }, [notifications]);

    // Initialize data when authenticated AND user is set AND session is confirmed
    // Hard guard: Do not call notification APIs until login succeeds, user is fully initialized, AND session is verified
    useEffect(() => {
        // Only proceed if:
        // 1. authenticated is true
        // 2. user exists with required fields
        // 3. User has been set for at least 100ms (allows session to be established)
        if (authenticated && user && user.id && user.email) {
            // Add small delay to ensure session is fully established on backend
            const timer = setTimeout(() => {
                // Double-check user is still authenticated before making API calls
                if (authenticated && user && user.id) {
                    console.log('📬 NotificationContext: User authenticated, fetching notifications');
                    fetchNotifications();
                    fetchCounts();
                    fetchPreferences();
                }
            }, 100); // Small delay to ensure session is persisted

            return () => clearTimeout(timer);
        } else {
            // Clear notification state if not authenticated or user not fully initialized
            setNotifications([]);
            setCounts({ total: 0, unread: 0, urgent: 0, high: 0 });
            setPreferences([]);
        }
    }, [authenticated, user, fetchNotifications, fetchCounts, fetchPreferences]);

    // Set up real-time updates via WebSocket
    useEffect(() => {
        if (!authenticated || !isConnected) return;

        // Listen for new notifications via WebSocket
        const unsubscribe = onNewNotification((notificationData: any) => {
            console.log('📨 Received new notification via WebSocket:', notificationData);
            
            // Transform the notification data to match NotificationType
            const notification: NotificationType = {
                id: notificationData.id || 0,
                user_id: notificationData.user_id || user?.id || 0,
                notification_type_id: notificationData.notification_type_id || 0,
                title: notificationData.title || 'Notification',
                message: notificationData.message || '',
                data: notificationData.data || {},
                priority: notificationData.priority || 'normal',
                is_read: notificationData.is_read || false,
                is_dismissed: notificationData.is_dismissed || false,
                read_at: notificationData.read_at,
                dismissed_at: notificationData.dismissed_at,
                expires_at: notificationData.expires_at,
                action_url: notificationData.action_url,
                action_text: notificationData.action_text,
                icon: notificationData.icon,
                image_url: notificationData.image_url,
                created_at: notificationData.created_at || notificationData.timestamp || new Date().toISOString(),
                updated_at: notificationData.updated_at || new Date().toISOString(),
                type_name: notificationData.type_name || notificationData.type || 'admin_message',
                category: notificationData.category || 'admin'
            };

            addNotification(notification);
        });

        return () => {
            unsubscribe();
        };
    }, [authenticated, isConnected, onNewNotification, addNotification, user]);

    // Polling fallback for counts (in case WebSocket is not available)
    // Only poll if authenticated and WebSocket is not connected
    useEffect(() => {
        if (!authenticated || isConnected) return;

        let consecutiveErrors = 0;
        const maxErrors = 3; // Stop polling after 3 consecutive 401 errors

        const interval = setInterval(async () => {
            try {
                await fetchCounts();
                consecutiveErrors = 0; // Reset on success
            } catch (err: any) {
                if (err.status === 401) {
                    consecutiveErrors++;
                    if (consecutiveErrors >= maxErrors) {
                        clearInterval(interval);
                        return;
                    }
                } else {
                    consecutiveErrors++;
                    if (consecutiveErrors >= maxErrors) {
                        clearInterval(interval);
                    }
                }
            }
        }, 30000); // Check for new notifications every 30 seconds

        return () => {
            clearInterval(interval);
        };
    }, [authenticated, user, isConnected, fetchCounts]);

    const value: NotificationContextType = {
        // State
        notifications,
        counts,
        preferences,
        loading,
        error,

        // Actions
        fetchNotifications,
        fetchCounts,
        fetchPreferences,
        markAsRead,
        markAllAsRead,
        dismissNotification,
        updatePreferences,

        // Real-time updates
        addNotification,
        updateNotification,
        removeNotification,

        // Utility functions
        getNotificationsByCategory,
        getNotificationsByPriority,
        getUnreadCount,
        hasUnreadNotifications,
    };

    return (
        <NotificationContext.Provider value={value}>
            {children}
        </NotificationContext.Provider>
    );
};
