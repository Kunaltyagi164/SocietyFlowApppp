// src/services/LocalNotificationService.js
/**
 * 🔔 Local Notification Service
 * 
 * Instead of polling the API for notifications, this service uses LOCAL logic
 * to detect new visitors, notices, bills, and community messages based on
 * home screen data.
 * 
 * No API calls needed - everything is calculated from existing data!
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'local_notifications_state';
const NOTIFICATIONS_KEY = 'local_notifications_list';

/**
 * Local notification object structure:
 * {
 *   id: 'unique-id',
 *   type: 'visitor' | 'notice' | 'bill' | 'community',
 *   title: 'You have a new visitor',
 *   message: 'Ram is visiting flat 101',
 *   icon: '🚶',
 *   action: 'navigate',
 *   navigationScreen: 'VisitorsTab',
 *   timestamp: Date.now(),
 *   read: false
 * }
 */

export const LocalNotificationService = {
  /**
   * Generate notifications from home screen data
   * Called from HomeScreenModern after loading stats
   */
  generateNotifications: async (homeData = {}) => {
    try {
      const {
        visitors = [],
        notices = [],
        communityMessages = [],
        bills = [],
        userFlatNo = '',
      } = homeData;

      // Get previous state to detect NEW items
      const previousState = await LocalNotificationService._getPreviousState();

      const newNotifications = [];

      /**
       * 1️⃣ VISITOR NOTIFICATIONS
       * Detect new pending visitors for THIS user's flat
       */
      if (visitors && Array.isArray(visitors)) {
        const pendingVisitors = visitors.filter(
          (v) =>
            (v.status || '').toLowerCase() === 'pending' &&
            userFlatNo &&
            v.visiting_flat &&
            v.visiting_flat.toUpperCase() === userFlatNo.toUpperCase()
        );

        // Check if there are NEW visitors (not in previous state)
        const previousVisitorIds = previousState.visitorIds || [];
        const currentVisitorIds = pendingVisitors.map((v) => v.id);

        pendingVisitors.forEach((visitor) => {
          // Only create notification for NEW visitors
          if (!previousVisitorIds.includes(visitor.id)) {
            newNotifications.push({
              id: `visitor_${visitor.id}`,
              type: 'visitor',
              title: '🚶 New Visitor Arrival',
              message: `${visitor.name || 'A visitor'} is arriving to visit flat ${userFlatNo}`,
              subtitle: `Purpose: ${visitor.purpose || 'Not specified'}`,
              icon: '🚶',
              data: visitor,
              navigationScreen: 'VisitorsTab',
              navigationParams: { filterStatus: 'pending' },
              timestamp: Date.now(),
              read: false,
              action: 'approval', // Shows approve/reject buttons
            });
          }
        });

        // Update previous visitor IDs
        previousState.visitorIds = currentVisitorIds;
      }

      /**
       * 2️⃣ NOTICE NOTIFICATIONS
       * Detect new notices
       */
      if (notices && Array.isArray(notices)) {
        const previousNoticeIds = previousState.noticeIds || [];
        const currentNoticeIds = notices.map((n) => n.id);

        notices.forEach((notice) => {
          // Only create notification for NEW notices
          if (!previousNoticeIds.includes(notice.id)) {
            newNotifications.push({
              id: `notice_${notice.id}`,
              type: 'notice',
              title: '📢 New Notice',
              message: notice.title || 'A new notice has been posted',
              subtitle: notice.description?.substring(0, 50) + '...',
              icon: '📢',
              data: notice,
              navigationScreen: 'Notices',
              timestamp: Date.now(),
              read: false,
              action: 'view',
            });
          }
        });

        // Update previous notice IDs
        previousState.noticeIds = currentNoticeIds;
      }

      /**
       * 3️⃣ COMMUNITY MESSAGE NOTIFICATIONS
       * Detect new community posts/messages
       */
      if (communityMessages && Array.isArray(communityMessages)) {
        const previousMessageIds = previousState.messageIds || [];
        const currentMessageIds = communityMessages.map((m) => m.id);

        communityMessages.forEach((message) => {
          // Only create notification for NEW messages
          if (!previousMessageIds.includes(message.id)) {
            newNotifications.push({
              id: `community_${message.id}`,
              type: 'community',
              title: '💬 New Community Message',
              message: message.title || message.content || 'New post in community',
              subtitle:
                message.author_name ||
                `Posted by: ${message.created_by || 'Someone'}`,
              icon: '💬',
              data: message,
              navigationScreen: 'CommunityTab',
              timestamp: Date.now(),
              read: false,
              action: 'view',
            });
          }
        });

        // Update previous message IDs
        previousState.messageIds = currentMessageIds;
      }

      /**
       * 4️⃣ BILL DUE NOTIFICATIONS
       * Detect unpaid bills or overdue bills
       */
      if (bills && Array.isArray(bills)) {
        const previousBillIds = previousState.billIds || [];

        // Only show ONE bill notification for all unpaid bills
        const unpaidBills = bills.filter(
          (b) => (b.status || '').toLowerCase() === 'unpaid'
        );

        if (unpaidBills.length > 0) {
          // Only notify if there are NEW unpaid bills
          const newUnpaidCount =
            unpaidBills.length - (previousState.lastBillNotificationCount || 0);

          if (newUnpaidCount > 0) {
            const totalAmount = unpaidBills.reduce(
              (sum, b) => sum + (parseFloat(b.amount) || 0),
              0
            );

            newNotifications.push({
              id: 'bills_unpaid',
              type: 'bill',
              title: '💳 Bill Payment Due',
              message: `You have ${unpaidBills.length} bill(s) due for payment`,
              subtitle: `Total: ₹${totalAmount.toFixed(2)}`,
              icon: '💳',
              navigationScreen: 'BillsTab',
              data: { bills: unpaidBills, total: totalAmount },
              timestamp: Date.now(),
              read: false,
              action: 'pay',
            });
          }
        }

        // Update bill tracking
        previousState.lastBillNotificationCount = unpaidBills.length;
        previousState.billIds = bills.map((b) => b.id);
      }

      // Save updated state
      await LocalNotificationService._setPreviousState(previousState);

      // Save new notifications to storage
      if (newNotifications.length > 0) {
        await LocalNotificationService._addToNotificationsList(newNotifications);
        console.log(
          `📬 [LocalNotificationService] Generated ${newNotifications.length} new notification(s)`
        );
      }

      return newNotifications;
    } catch (error) {
      console.error(
        '[LocalNotificationService] Error generating notifications:',
        error.message
      );
      return [];
    }
  },

  /**
   * Get all stored notifications (both new and old)
   */
  getNotifications: async () => {
    try {
      const stored = await AsyncStorage.getItem(NOTIFICATIONS_KEY);
      const notifications = stored ? JSON.parse(stored) : [];

      // Sort by timestamp, newest first
      return notifications.sort(
        (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
      );
    } catch (error) {
      console.error('[LocalNotificationService] Error getting notifications:', error.message);
      return [];
    }
  },

  /**
   * Get count of UNREAD notifications
   */
  getUnreadCount: async () => {
    try {
      const notifications = await LocalNotificationService.getNotifications();
      return notifications.filter((n) => !n.read).length;
    } catch (error) {
      console.error('[LocalNotificationService] Error getting unread count:', error.message);
      return 0;
    }
  },

  /**
   * Mark a notification as read
   */
  markAsRead: async (notificationId) => {
    try {
      const notifications = await LocalNotificationService.getNotifications();

      const updated = notifications.map((n) =>
        n.id === notificationId ? { ...n, read: true } : n
      );

      await AsyncStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(updated));
      console.log(`✅ [LocalNotificationService] Marked ${notificationId} as read`);
    } catch (error) {
      console.error('[LocalNotificationService] Error marking as read:', error.message);
    }
  },

  /**
   * Mark all notifications as read
   */
  markAllAsRead: async () => {
    try {
      const notifications = await LocalNotificationService.getNotifications();

      const updated = notifications.map((n) => ({ ...n, read: true }));

      await AsyncStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(updated));
      console.log(`✅ [LocalNotificationService] Marked all as read`);
    } catch (error) {
      console.error('[LocalNotificationService] Error marking all as read:', error.message);
    }
  },

  /**
   * Delete a notification
   */
  deleteNotification: async (notificationId) => {
    try {
      const notifications = await LocalNotificationService.getNotifications();

      const updated = notifications.filter((n) => n.id !== notificationId);

      await AsyncStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(updated));
      console.log(
        `🗑️ [LocalNotificationService] Deleted ${notificationId}`
      );
    } catch (error) {
      console.error('[LocalNotificationService] Error deleting notification:', error.message);
    }
  },

  /**
   * Clear all notifications
   */
  clearAllNotifications: async () => {
    try {
      await AsyncStorage.removeItem(NOTIFICATIONS_KEY);
      console.log(`🗑️ [LocalNotificationService] Cleared all notifications`);
    } catch (error) {
      console.error('[LocalNotificationService] Error clearing notifications:', error.message);
    }
  },

  /**
   * Get notification breakdown by type
   */
  getNotificationCounts: async () => {
    try {
      const notifications = await LocalNotificationService.getNotifications();

      const counts = {
        visitor: 0,
        notice: 0,
        community: 0,
        bill: 0,
        unread: 0,
        total: notifications.length,
      };

      notifications.forEach((n) => {
        if (counts.hasOwnProperty(n.type)) {
          counts[n.type]++;
        }
        if (!n.read) {
          counts.unread++;
        }
      });

      return counts;
    } catch (error) {
      console.error('[LocalNotificationService] Error getting counts:', error.message);
      return {
        visitor: 0,
        notice: 0,
        community: 0,
        bill: 0,
        unread: 0,
        total: 0,
      };
    }
  },

  // ────────────────────────────────────────────────────────────
  // PRIVATE HELPERS
  // ────────────────────────────────────────────────────────────

  /**
   * Get previous state (for detecting NEW items)
   */
  _getPreviousState: async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      return {};
    }
  },

  /**
   * Save previous state
   */
  _setPreviousState: async (state) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.error('[LocalNotificationService] Error saving state:', error.message);
    }
  },

  /**
   * Add new notifications to storage list
   */
  _addToNotificationsList: async (newNotifications) => {
    try {
      const existing = await LocalNotificationService.getNotifications();

      // Combine and remove duplicates by ID
      const notificationMap = new Map();

      // Add existing
      existing.forEach((n) => notificationMap.set(n.id, n));

      // Add new (will overwrite if duplicate)
      newNotifications.forEach((n) => notificationMap.set(n.id, n));

      // Convert back to array and keep max 100 recent notifications
      const combined = Array.from(notificationMap.values())
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, 100);

      await AsyncStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(combined));
    } catch (error) {
      console.error('[LocalNotificationService] Error adding notifications:', error.message);
    }
  },
};

export default LocalNotificationService;
