import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';

interface WebSocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  onlineUsers: Set<number>;
  
  // Chat functions
  joinConversation: (conversationId: number) => void;
  leaveConversation: (conversationId: number) => void;
  sendMessage: (conversationId: number, content: string, messageType?: string, replyToId?: number) => void;
  startTyping: (conversationId: number) => void;
  stopTyping: (conversationId: number) => void;
  markMessageRead: (conversationId: number, messageId: number) => void;
  
  // Notification functions
  markNotificationRead: (notificationId: number) => void;
  
  // Presence functions
  updatePresence: (status: 'online' | 'away' | 'busy' | 'offline') => void;
  
  // Event listeners
  onNewMessage: (callback: (message: any) => void) => () => void;
  onUserTyping: (callback: (data: any) => void) => () => void;
  onNewNotification: (callback: (notification: any) => void) => () => void;
  onAdminMessage: (callback: (message: any) => void) => () => void;
  onFriendPresenceUpdate: (callback: (data: any) => void) => () => void;
  onMessageRead: (callback: (data: any) => void) => () => void;
}

const WebSocketContext = createContext<WebSocketContextType | null>(null);

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};

interface WebSocketProviderProps {
  children: React.ReactNode;
}

export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<Set<number>>(new Set());
  
  // Store event listeners to clean them up
  const eventListeners = useRef<Map<string, Set<Function>>>(new Map());
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const reconnectTimeout = useRef<NodeJS.Timeout | null>(null);

  // Initialize socket connection
  const initializeSocket = useCallback(() => {
    if (!isAuthenticated || !user || socket) {
      return;
    }

    console.log('🔌 Initializing WebSocket connection...');

    // Use the current domain in production, localhost:3001 only in development
    const serverUrl = process.env.NODE_ENV === 'production' 
      ? window.location.origin 
      : (process.env.REACT_APP_SERVER_URL || 'http://localhost:3001');
    
    const newSocket = io(serverUrl, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      timeout: 20000,
      forceNew: true
    });

    // Connection events
    newSocket.on('connect', () => {
      console.log('✅ WebSocket connected:', newSocket.id);
      setIsConnected(true);
      reconnectAttempts.current = 0;
      
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
        reconnectTimeout.current = null;
      }
    });

    newSocket.on('disconnect', (reason) => {
      console.log('❌ WebSocket disconnected:', reason);
      setIsConnected(false);
      
      // Attempt to reconnect if not a manual disconnect
      if (reason !== 'io client disconnect' && reconnectAttempts.current < maxReconnectAttempts) {
        reconnectAttempts.current++;
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
        
        console.log(`🔄 Attempting to reconnect in ${delay}ms (attempt ${reconnectAttempts.current}/${maxReconnectAttempts})`);
        
        reconnectTimeout.current = setTimeout(() => {
          if (newSocket.connected === false) {
            newSocket.connect();
          }
        }, delay);
      }
    });

    newSocket.on('connect_error', (error) => {
      console.error('🔌 WebSocket connection error:', error);
      setIsConnected(false);
    });

    newSocket.on('connection_success', (data) => {
      console.log('🎉 WebSocket connection successful:', data);
    });

    // Bridge server-side "app:new_build" to a DOM CustomEvent so
    // useVersionCheck can react regardless of auth state
    newSocket.on('app:new_build', (data) => {
      console.log('🔄 New build notification received via WebSocket', data);
      window.dispatchEvent(new CustomEvent('app:new_build', { detail: data }));
    });

    newSocket.on('error', (error) => {
      console.error('🚨 WebSocket error:', error);
    });

    setSocket(newSocket);
    
    return newSocket;
  }, [isAuthenticated, user, socket]);

  // Clean up socket connection
  const cleanupSocket = useCallback(() => {
    if (socket) {
      console.log('🧹 Cleaning up WebSocket connection...');
      
      // Remove all event listeners
      socket.removeAllListeners();
      
      // Disconnect
      socket.disconnect();
      setSocket(null);
      setIsConnected(false);
      setOnlineUsers(new Set());
      
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
        reconnectTimeout.current = null;
      }
    }
  }, [socket]);

  // Initialize connection when user logs in
  useEffect(() => {
    if (isAuthenticated && user && !socket) {
      initializeSocket();
    } else if (!isAuthenticated && socket) {
      cleanupSocket();
    }

    return () => {
      if (socket) {
        cleanupSocket();
      }
    };
  }, [isAuthenticated, user, initializeSocket, cleanupSocket]);

  // Chat functions
  const joinConversation = useCallback((conversationId: number) => {
    if (socket && isConnected) {
      socket.emit('join_conversation', { conversationId });
    }
  }, [socket, isConnected]);

  const leaveConversation = useCallback((conversationId: number) => {
    if (socket && isConnected) {
      socket.emit('leave_conversation', { conversationId });
    }
  }, [socket, isConnected]);

  const sendMessage = useCallback((
    conversationId: number, 
    content: string, 
    messageType: string = 'text', 
    replyToId?: number
  ) => {
    if (socket && isConnected) {
      socket.emit('send_message', {
        conversationId,
        content,
        messageType,
        replyToId
      });
    }
  }, [socket, isConnected]);

  const startTyping = useCallback((conversationId: number) => {
    if (socket && isConnected) {
      socket.emit('typing_start', { conversationId });
    }
  }, [socket, isConnected]);

  const stopTyping = useCallback((conversationId: number) => {
    if (socket && isConnected) {
      socket.emit('typing_stop', { conversationId });
    }
  }, [socket, isConnected]);

  const markMessageRead = useCallback((conversationId: number, messageId: number) => {
    if (socket && isConnected) {
      socket.emit('message_read', { conversationId, messageId });
    }
  }, [socket, isConnected]);

  // Notification functions
  const markNotificationRead = useCallback((notificationId: number) => {
    if (socket && isConnected) {
      socket.emit('mark_notification_read', { notificationId });
    }
  }, [socket, isConnected]);

  // Presence functions
  const updatePresence = useCallback((status: 'online' | 'away' | 'busy' | 'offline') => {
    if (socket && isConnected) {
      socket.emit('update_presence', { status });
    }
  }, [socket, isConnected]);

  // Event listener helpers
  const addEventListener = useCallback((event: string, callback: Function) => {
    if (!eventListeners.current.has(event)) {
      eventListeners.current.set(event, new Set());
    }
    eventListeners.current.get(event)!.add(callback);

    if (socket) {
      socket.on(event, callback as any);
    }

    // Return cleanup function
    return () => {
      const listeners = eventListeners.current.get(event);
      if (listeners) {
        listeners.delete(callback);
        if (socket) {
          socket.off(event, callback as any);
        }
      }
    };
  }, [socket]);

  // Specific event listeners
  const onNewMessage = useCallback((callback: (message: any) => void) => {
    return addEventListener('new_message', callback);
  }, [addEventListener]);

  const onUserTyping = useCallback((callback: (data: any) => void) => {
    return addEventListener('user_typing', callback);
  }, [addEventListener]);

  const onNewNotification = useCallback((callback: (notification: any) => void) => {
    return addEventListener('new_notification', callback);
  }, [addEventListener]);

  const onAdminMessage = useCallback((callback: (message: any) => void) => {
    return addEventListener('admin_message', callback);
  }, [addEventListener]);

  const onFriendPresenceUpdate = useCallback((callback: (data: any) => void) => {
    return addEventListener('friend_presence_update', (data: any) => {
      // Update online users set
      setOnlineUsers(prev => {
        const newSet = new Set(prev);
        if (data.isOnline) {
          newSet.add(data.userId);
        } else {
          newSet.delete(data.userId);
        }
        return newSet;
      });
      
      callback(data);
    });
  }, [addEventListener]);

  const onMessageRead = useCallback((callback: (data: any) => void) => {
    return addEventListener('message_read', callback);
  }, [addEventListener]);

  // Re-attach event listeners when socket changes
  useEffect(() => {
    if (socket && isConnected) {
      // Reattach all existing listeners
      for (const [event, callbacks] of eventListeners.current.entries()) {
        for (const callback of callbacks) {
          socket.on(event, callback as any);
        }
      }
    }
  }, [socket, isConnected]);

  const value: WebSocketContextType = {
    socket,
    isConnected,
    onlineUsers,
    
    // Chat functions
    joinConversation,
    leaveConversation,
    sendMessage,
    startTyping,
    stopTyping,
    markMessageRead,
    
    // Notification functions
    markNotificationRead,
    
    // Presence functions
    updatePresence,
    
    // Event listeners
    onNewMessage,
    onUserTyping,
    onNewNotification,
    onAdminMessage,
    onFriendPresenceUpdate,
    onMessageRead,
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
};

export default WebSocketContext; 