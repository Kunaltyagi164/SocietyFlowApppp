/**
 * Notification Socket Service
 * 
 * Handles real-time notifications:
 * - Visitor arrivals
 * - Recurring alerts
 * - System announcements
 */

import socketManager from './socketManager';

class NotificationSocket {
  constructor() {
    this.unsubscribers = [];
    this.isInitialized = false;
  }

  /**
   * Setup all notification listeners
   * Call once on app startup
   */
  initialize() {
    if (this.isInitialized) return;

    // Listen for new visitor arrivals
    const unsubVisitor = socketManager.on('VISITOR_ARRIVED', (data) => {
      console.log('🚪 [NotificationSocket] Visitor arrived:', data);
      this.handleVisitorArrival(data);
    });

    // Listen for recurring notifications
    const unsubRecurring = socketManager.on('RECURRING_ALERT', (data) => {
      console.log('🔔 [NotificationSocket] Recurring alert:', data);
      this.handleRecurringAlert(data);
    });

    // Listen for system announcements
    const unsubSystem = socketManager.on('SYSTEM_ANNOUNCEMENT', (data) => {
      console.log('📢 [NotificationSocket] System announcement:', data);
      this.handleSystemAnnouncement(data);
    });

    // Listen for maintenance alerts
    const unsubMaintenance = socketManager.on('MAINTENANCE_ALERT', (data) => {
      console.log('🔧 [NotificationSocket] Maintenance alert:', data);
      this.handleMaintenanceAlert(data);
    });

    this.unsubscribers = [
      unsubVisitor, 
      unsubRecurring, 
      unsubSystem, 
      unsubMaintenance
    ];
    this.isInitialized = true;
    console.log('✅ [NotificationSocket] Initialized');
  }

  handleVisitorArrival(data) {
    // Delegate to notification service (see notificationService.js)
    // This will trigger local notifications, play sound, etc.
    global.emit?.('notification:visitorArrival', data);
  }

  handleRecurringAlert(data) {
    global.emit?.('notification:recurring', data);
  }

  handleSystemAnnouncement(data) {
    global.emit?.('notification:system', data);
  }

  handleMaintenanceAlert(data) {
    global.emit?.('notification:maintenance', data);
  }

  /**
   * Subscribe to notification updates
   * Used by components/screens that want to listen
   */
  on(eventType, callback) {
    return socketManager.on(`NOTIFICATION_${eventType}`, callback);
  }

  /**
   * Send notification-related command to server
   */
  send(command, payload = {}) {
    return socketManager.send('NOTIFICATION_COMMAND', { command, payload });
  }

  /**
   * Mark notification as read on server
   */
  markAsRead(notificationId) {
    return this.send('MARK_READ', { id: notificationId });
  }

  /**
   * Cleanup and remove all listeners
   */
  destroy() {
    this.unsubscribers.forEach(unsub => unsub());
    this.unsubscribers = [];
    this.isInitialized = false;
    console.log('🔌 [NotificationSocket] Destroyed');
  }
}

export default new NotificationSocket();
