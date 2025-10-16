import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { ref, onValue, push, remove, update, query, orderByChild, limitToLast } from 'firebase/database';
import { database } from '../firebase';
import { createDemoNotifications } from '../utils/notificationUtils';

interface Notification {
  id: string;
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
  type: 'info' | 'warning' | 'error' | 'success';
  link?: string;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  removeNotification: (id: string) => Promise<void>;
  clearAllNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    // Count unread notifications whenever notifications change
    const count = notifications.filter(notification => !notification.read).length;
    setUnreadCount(count);
  }, [notifications]);

  useEffect(() => {
    // Subscribe to notifications from Firebase
    const notificationsRef = query(
      ref(database, 'notifications'),
      orderByChild('timestamp'),
      limitToLast(20) // Limit to last 20 notifications
    );

    const unsubscribe = onValue(notificationsRef, (snapshot) => {
      if (snapshot.exists()) {
        const notificationsData = snapshot.val();
        const notificationsArray = Object.entries(notificationsData).map(([id, data]: [string, any]) => ({
          id,
          ...data,
        }));
        
        // Sort by timestamp in descending order (newest first)
        notificationsArray.sort((a, b) => b.timestamp - a.timestamp);
        setNotifications(notificationsArray);
      } else {
        setNotifications([]);
        // If there are no notifications, create demo notifications
        createDemoNotifications();
      }
    });

    // Unsubscribe when component unmounts
    return () => unsubscribe();
  }, []);

  const addNotification = async (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    try {
      const notificationsRef = ref(database, 'notifications');
      await push(notificationsRef, {
        ...notification,
        timestamp: Date.now(),
        read: false,
      });
    } catch (error) {
      console.error('Error adding notification:', error);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      const notificationRef = ref(database, `notifications/${id}`);
      await update(notificationRef, { read: true });
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const updates: { [key: string]: any } = {};
      notifications.forEach(notification => {
        if (!notification.read) {
          updates[`notifications/${notification.id}/read`] = true;
        }
      });
      
      if (Object.keys(updates).length > 0) {
        await update(ref(database), updates);
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const removeNotification = async (id: string) => {
    try {
      const notificationRef = ref(database, `notifications/${id}`);
      await remove(notificationRef);
    } catch (error) {
      console.error('Error removing notification:', error);
    }
  };

  const clearAllNotifications = async () => {
    try {
      const notificationsRef = ref(database, 'notifications');
      await remove(notificationsRef);
    } catch (error) {
      console.error('Error clearing notifications:', error);
    }
  };

  const value = {
    notifications,
    unreadCount,
    addNotification,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAllNotifications,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}; 