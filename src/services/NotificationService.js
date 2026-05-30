/**
 * Notification Service - Business Logic Layer (REFACTORED)
 * 
 * Handles notification storage, management, and display
 * Uses NotificationSocket for real-time updates
 * 
 * Architecture:
 * Socket Layer: notificationSocket.js (listens to WebSocket)
 *   ↓
 * Service Layer: THIS FILE (business logic, storage, state)
 *   ↓
 * Component Layer: components/NotificationBell.js (display)
 */

import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'notifications';
const SHOWN_KEY = 'shown_notifications_history';

// Store shown notification IDs to prevent duplicate popups
let shownNotifications = new Set();
let notifications = [];
let listeners = [];

// Load shown notifications from storage on app start
export const initializeNotificationService = async () => {
  try {
    // Load shown notifications history
    const shown = await AsyncStorage.getItem(SHOWN_KEY);
    if (shown) {
      shownNotifications = new Set(JSON.parse(shown));
      console.log(`📋 [NotificationService] Loaded ${shownNotifications.size} shown notifications`);
    }

    // Load cached notifications
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    notifications = stored ? JSON.parse(stored) : [];
    console.log(`✅ [NotificationService] Initialized with ${notifications.length} cached`);
  } catch (err) {
    console.warn('[NotificationService] Init error:', err.message);
  }
};

// Check if a notification has already been shown
const hasBeenShown = (notificationId) => {
  return shownNotifications.has(notificationId.toString());
};

// Mark a notification as shown
const markAsShown = async (notificationId) => {
  shownNotifications.add(notificationId.toString());
  try {
    await AsyncStorage.setItem(SHOWN_KEY, JSON.stringify(Array.from(shownNotifications)));
  } catch (err) {
    console.warn('[NotificationService] Error saving shown notifications:', err.message);
  }
};

// Clear all shown notifications (for debugging/testing)
export const clearShownNotifications = async () => {
  shownNotifications.clear();
  await AsyncStorage.removeItem(SHOWN_KEY);
  console.log('🧹 [NotificationService] Cleared all shown notification history');
};

// Add notification to store
const addNotification = async (notification) => {
  const id = `${notification.type}_${Date.now()}`;
  const item = { id, ...notification, read: false, timestamp: Date.now() };
  notifications.unshift(item);
  await saveToStorage();
  notifyListeners('added', item);
  return item;
};

// Save to storage
const saveToStorage = async () => {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
  } catch (err) {
    console.error('[NotificationService] Storage error:', err.message);
  }
};

// Notify all listeners
const notifyListeners = (event, data) => {
  listeners.forEach(cb => {
    try {
      cb(event, data);
    } catch (err) {
      console.error('[NotificationService] Listener error:', err.message);
    }
  });
};

// Subscribe to changes
export const subscribe = (callback) => {
  listeners.push(callback);
  return () => {
    listeners = listeners.filter(cb => cb !== callback);
  };
};

// Show popup for new visitor request
export const showVisitorRequestAlert = (notification, onViewPress = () => {}) => {
  if (hasBeenShown(notification.id)) {
    return; // Already shown, don't show again
  }

  markAsShown(notification.id);

  console.log(`🚪 [NotificationService] NEW VISITOR ALERT: ${notification.message}`);

  Alert.alert(
    '🚪 New Visitor Request',
    notification.message || 'A new visitor is waiting for approval',
    [
      {
        text: 'View Details',
        onPress: onViewPress,
        style: 'default',
      },
      {
        text: 'Later',
        onPress: () => {},
        style: 'cancel',
      },
    ],
    { cancelable: false }
  );
};

// Show popup for new complaint
export const showComplaintAlert = (notification, onViewPress = () => {}) => {
  if (hasBeenShown(notification.id)) {
    return;
  }

  markAsShown(notification.id);

  console.log(`📢 [NotificationService] NEW COMPLAINT: ${notification.message}`);

  Alert.alert(
    '📢 New Complaint',
    notification.message || 'A new complaint has been filed',
    [
      {
        text: 'View',
        onPress: onViewPress,
        style: 'default',
      },
      {
        text: 'Dismiss',
        onPress: () => {},
        style: 'cancel',
      },
    ],
    { cancelable: false }
  );
};

// Show popup for security alerts (CCTV, stay exceeded, etc.)
export const showSecurityAlert = (notification, onViewPress = () => {}) => {
  if (hasBeenShown(notification.id)) {
    return;
  }

  markAsShown(notification.id);

  const icon = notification.type === 'cctv' ? '📹' : '⚠️';
  console.log(`${icon} [NotificationService] SECURITY ALERT: ${notification.message}`);

  Alert.alert(
    `${icon} Security Alert`,
    notification.message || 'A security event has been detected',
    [
      {
        text: 'Check It Out',
        onPress: onViewPress,
        style: 'default',
      },
      {
        text: 'Later',
        onPress: () => {},
        style: 'cancel',
      },
    ],
    { cancelable: false }
  );
};

// Show popup for pending resident approval
export const showPendingResidentAlert = (notification, onViewPress = () => {}) => {
  if (hasBeenShown(notification.id)) {
    return;
  }

  markAsShown(notification.id);

  console.log(`👤 [NotificationService] NEW RESIDENT PENDING: ${notification.message}`);

  Alert.alert(
    '👤 New Resident Approval',
    notification.message || 'A new resident is pending approval',
    [
      {
        text: 'Review',
        onPress: onViewPress,
        style: 'default',
      },
      {
        text: 'Later',
        onPress: () => {},
        style: 'cancel',
      },
    ],
    { cancelable: false }
  );
};

// Main handler: Show appropriate alert based on notification type
export const handleNewNotification = (notification, navigationCallback = {}) => {
  const { toVisitors = () => {}, toComplaints = () => {}, toSecurity = () => {}, toProfile = () => {} } =
    navigationCallback;

  switch (notification.type) {
    case 'visitor_request':
      showVisitorRequestAlert(notification, toVisitors);
      break;

    case 'complaint':
      showComplaintAlert(notification, toComplaints);
      break;

    case 'stay_exceeded':
    case 'cctv':
      showSecurityAlert(notification, toSecurity);
      break;

    case 'pending_resident':
      showPendingResidentAlert(notification, toProfile);
      break;

    default:
      console.log(`[NotificationService] Unknown notification type: ${notification.type}`);
  }
};

// Process multiple new notifications
export const handleNewNotifications = (notifications, navigationCallback = {}) => {
  const newNotifications = notifications.filter(n => !hasBeenShown(n.id));

  console.log(`📬 [NotificationService] Processing ${newNotifications.length} new notification(s)`);

  // Show popups for new notifications (limit to 1 at a time for better UX)
  if (newNotifications.length > 0) {
    handleNewNotification(newNotifications[0], navigationCallback);
  }
};

// ════════════════════════════════════════════════════════════
// NEW MODULAR SERVICE API (for use with socket architecture)
// ════════════════════════════════════════════════════════════

// Get all notifications
export const getAll = () => [...notifications];

// Get unread count
export const getUnreadCount = () => notifications.filter(n => !n.read).length;

// Get unread notifications
export const getUnread = () => notifications.filter(n => !n.read);

// Mark as read
export const markAsRead = async (notificationId) => {
  const notification = notifications.find(n => n.id === notificationId);
  if (notification) {
    notification.read = true;
    await saveToStorage();
    notifyListeners('marked-read', notification);
  }
};

// Mark all as read
export const markAllAsRead = async () => {
  notifications.forEach(n => (n.read = true));
  await saveToStorage();
  notifyListeners('marked-all-read', null);
};

// Delete notification
export const deleteNotification = async (notificationId) => {
  notifications = notifications.filter(n => n.id !== notificationId);
  await saveToStorage();
  notifyListeners('deleted', notificationId);
};

// Clear all
export const clearAll = async () => {
  notifications = [];
  await saveToStorage();
  notifyListeners('cleared', null);
};
