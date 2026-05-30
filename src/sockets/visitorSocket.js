/**
 * Visitor Socket Service
 * 
 * Handles real-time visitor data:
 * - Pending visitor registrations
 * - Check-in/check-out updates
 * - Overstay alerts
 * - Duration updates
 */

import socketManager from './socketManager';

class VisitorSocket {
  constructor() {
    this.unsubscribers = [];
    this.isInitialized = false;
    this.pendingVisitors = [];
    this.checkedInVisitors = [];
  }

  /**
   * Setup all visitor listeners
   * Call once on app startup
   */
  initialize() {
    if (this.isInitialized) return;

    // Listen for new pending visitor registrations
    const unsubPending = socketManager.on('PENDING_VISITOR_ADDED', (data) => {
      console.log('📋 [VisitorSocket] Pending visitor added:', data);
      this.handlePendingAdded(data);
    });

    // Listen for visitor approval/rejection status
    const unsubStatus = socketManager.on('PENDING_STATUS_CHANGED', (data) => {
      console.log('✅ [VisitorSocket] Pending status changed:', data);
      this.handlePendingStatusChanged(data);
    });

    // Listen for visitor check-in
    const unsubCheckIn = socketManager.on('VISITOR_CHECKED_IN', (data) => {
      console.log('✅ [VisitorSocket] Visitor checked in:', data);
      this.handleVisitorCheckIn(data);
    });

    // Listen for visitor check-out
    const unsubCheckOut = socketManager.on('VISITOR_CHECKED_OUT', (data) => {
      console.log('🚶 [VisitorSocket] Visitor checked out:', data);
      this.handleVisitorCheckOut(data);
    });

    // Listen for overstay alerts
    const unsubOverstay = socketManager.on('OVERSTAY_ALERT', (data) => {
      console.log('⚠️  [VisitorSocket] Overstay alert:', data);
      this.handleOverstayAlert(data);
    });

    // Listen for bulk visitor list updates
    const unsubBulk = socketManager.on('VISITORS_BULK_UPDATE', (data) => {
      console.log('📊 [VisitorSocket] Bulk update:', data);
      this.handleBulkUpdate(data);
    });

    this.unsubscribers = [
      unsubPending,
      unsubStatus,
      unsubCheckIn,
      unsubCheckOut,
      unsubOverstay,
      unsubBulk,
    ];
    this.isInitialized = true;
    console.log('✅ [VisitorSocket] Initialized');
  }

  handlePendingAdded(data) {
    this.pendingVisitors.push(data);
    global.emit?.('visitor:pendingAdded', data);
  }

  handlePendingStatusChanged(data) {
    const { visitRegistrationId, status } = data;
    this.pendingVisitors = this.pendingVisitors.filter(v => v.id !== visitRegistrationId);
    global.emit?.('visitor:statusChanged', data);
  }

  handleVisitorCheckIn(data) {
    this.checkedInVisitors.push(data);
    global.emit?.('visitor:checkedIn', data);
  }

  handleVisitorCheckOut(data) {
    const { visitorId } = data;
    this.checkedInVisitors = this.checkedInVisitors.filter(v => v.id !== visitorId);
    global.emit?.('visitor:checkedOut', data);
  }

  handleOverstayAlert(data) {
    global.emit?.('visitor:overstay', data);
  }

  handleBulkUpdate(data) {
    const { pending, checkedIn } = data;
    if (pending) this.pendingVisitors = pending;
    if (checkedIn) this.checkedInVisitors = checkedIn;
    global.emit?.('visitor:bulkUpdate', data);
  }

  /**
   * Get current pending visitors (cached)
   */
  getPendingVisitors() {
    return this.pendingVisitors;
  }

  /**
   * Get current checked-in visitors (cached)
   */
  getCheckedInVisitors() {
    return this.checkedInVisitors;
  }

  /**
   * Request initial sync from server
   */
  requestSync() {
    console.log('🔄 [VisitorSocket] Requesting initial sync...');
    return socketManager.send('VISITOR_SYNC_REQUEST', {
      timestamp: Date.now(),
    });
  }

  /**
   * Send visitor action (approve/reject/checkout)
   */
  sendAction(action, visitorId, details = {}) {
    console.log(`📤 [VisitorSocket] Sending ${action} for visitor ${visitorId}`);
    return socketManager.send('VISITOR_ACTION', {
      action,
      visitorId,
      ...details,
      timestamp: Date.now(),
    });
  }

  /**
   * Subscribe to visitor updates
   */
  on(eventType, callback) {
    return socketManager.on(`VISITOR_${eventType}`, callback);
  }

  /**
   * Cleanup and remove all listeners
   */
  destroy() {
    this.unsubscribers.forEach(unsub => unsub());
    this.unsubscribers = [];
    this.pendingVisitors = [];
    this.checkedInVisitors = [];
    this.isInitialized = false;
    console.log('🔌 [VisitorSocket] Destroyed');
  }
}

export default new VisitorSocket();
