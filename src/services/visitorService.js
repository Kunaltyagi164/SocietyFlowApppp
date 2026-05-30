/**
 * Visitor Service - Business Logic Layer
 * 
 * Handles visitor data management and coordination with backend
 * Uses VisitorSocket for real-time updates
 * 
 * Architecture:
 * Socket Layer: visitorSocket.js (listens to WebSocket)
 *   ↓
 * Service Layer: THIS FILE (business logic, caching, state)
 *   ↓
 * Component Layer: components/VisitorAlert.js (display)
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getVisitors, getPendingVisitors, approveRegistration, rejectRegistration, checkoutVisitor } from './api';
import { visitorSocket } from '../sockets';

const PENDING_STORAGE_KEY = 'pending_visitors';
const CHECKED_IN_STORAGE_KEY = 'checked_in_visitors';

class VisitorService {
  constructor() {
    this.pendingVisitors = [];
    this.checkedInVisitors = [];
    this.listeners = [];
    this.isInitialized = false;
  }

  /**
   * Initialize service - load from cache and setup listeners
   */
  async initialize() {
    if (this.isInitialized) return;

    try {
      // Load from cache
      const [pending, checkedIn] = await Promise.all([
        AsyncStorage.getItem(PENDING_STORAGE_KEY),
        AsyncStorage.getItem(CHECKED_IN_STORAGE_KEY),
      ]);

      this.pendingVisitors = pending ? JSON.parse(pending) : [];
      this.checkedInVisitors = checkedIn ? JSON.parse(checkedIn) : [];

      // Setup socket listeners
      this.setupListeners();

      this.isInitialized = true;
      console.log(
        `✅ [VisitorService] Initialized: ${this.pendingVisitors.length} pending, ${this.checkedInVisitors.length} checked-in`
      );
    } catch (err) {
      console.error('[VisitorService] Init error:', err.message);
    }
  }

  setupListeners() {
    // New pending visitor added
    global.on?.('visitor:pendingAdded', (data) => {
      this.handlePendingAdded(data);
    });

    // Pending status changed (approved/rejected)
    global.on?.('visitor:statusChanged', (data) => {
      this.handleStatusChanged(data);
    });

    // Visitor checked in
    global.on?.('visitor:checkedIn', (data) => {
      this.handleCheckIn(data);
    });

    // Visitor checked out
    global.on?.('visitor:checkedOut', (data) => {
      this.handleCheckOut(data);
    });

    // Overstay alert
    global.on?.('visitor:overstay', (data) => {
      this.notifyListeners('overstay', data);
    });

    // Bulk update
    global.on?.('visitor:bulkUpdate', (data) => {
      this.handleBulkUpdate(data);
    });
  }

  async handlePendingAdded(data) {
    this.pendingVisitors.unshift(data);
    await this.savePending();
    this.notifyListeners('pendingAdded', data);
  }

  async handleStatusChanged(data) {
    const { visitRegistrationId, status } = data;
    this.pendingVisitors = this.pendingVisitors.filter(v => v.id !== visitRegistrationId);
    await this.savePending();
    this.notifyListeners('statusChanged', data);
  }

  async handleCheckIn(data) {
    this.checkedInVisitors.unshift(data);
    await this.saveCheckedIn();
    this.notifyListeners('checkedIn', data);
  }

  async handleCheckOut(data) {
    const { visitorId } = data;
    this.checkedInVisitors = this.checkedInVisitors.filter(v => v.id !== visitorId);
    await this.saveCheckedIn();
    this.notifyListeners('checkedOut', data);
  }

  async handleBulkUpdate(data) {
    const { pending, checkedIn } = data;
    if (pending) {
      this.pendingVisitors = pending;
      await this.savePending();
    }
    if (checkedIn) {
      this.checkedInVisitors = checkedIn;
      await this.saveCheckedIn();
    }
    this.notifyListeners('bulkUpdate', data);
  }

  /**
   * HTTP fallback: Fetch pending visitors directly from API
   */
  async fetchPendingVisitors() {
    try {
      console.log('📥 [VisitorService] Fetching pending visitors...');
      const pending = await getPendingVisitors();
      this.pendingVisitors = pending;
      await this.savePending();
      this.notifyListeners('updated', { pending });
      return pending;
    } catch (err) {
      console.error('[VisitorService] Fetch pending error:', err.message);
      return this.pendingVisitors;
    }
  }

  /**
   * HTTP fallback: Fetch checked-in visitors directly from API
   */
  async fetchCheckedInVisitors() {
    try {
      console.log('📥 [VisitorService] Fetching checked-in visitors...');
      const res = await getVisitors();
      const visitors = res.data?.data || [];
      this.checkedInVisitors = visitors;
      await this.saveCheckedIn();
      this.notifyListeners('updated', { checkedIn: visitors });
      return visitors;
    } catch (err) {
      console.error('[VisitorService] Fetch checked-in error:', err.message);
      return this.checkedInVisitors;
    }
  }

  /**
   * Approve pending visitor
   */
  async approvePending(visitorId) {
    try {
      console.log(`✅ [VisitorService] Approving visitor ${visitorId}`);
      
      // API call
      await approveRegistration(visitorId, {
        status: 'approved',
        approval_date: new Date().toISOString(),
      });

      // Remove from pending
      this.pendingVisitors = this.pendingVisitors.filter(v => v.id !== visitorId);
      await this.savePending();
      
      // Notify
      this.notifyListeners('approved', { visitorId });

      // Optionally notify socket
      visitorSocket.sendAction('approve', visitorId);

      return true;
    } catch (err) {
      console.error('[VisitorService] Approve error:', err.message);
      throw err;
    }
  }

  /**
   * Reject pending visitor
   */
  async rejectPending(visitorId) {
    try {
      console.log(`❌ [VisitorService] Rejecting visitor ${visitorId}`);

      // API call
      await rejectRegistration(visitorId, {
        status: 'rejected',
        rejection_date: new Date().toISOString(),
      });

      // Remove from pending
      this.pendingVisitors = this.pendingVisitors.filter(v => v.id !== visitorId);
      await this.savePending();

      // Notify
      this.notifyListeners('rejected', { visitorId });

      // Optionally notify socket
      visitorSocket.sendAction('reject', visitorId);

      return true;
    } catch (err) {
      console.error('[VisitorService] Reject error:', err.message);
      throw err;
    }
  }

  /**
   * Checkout visitor
   */
  async checkoutVisitorById(visitorId) {
    try {
      console.log(`🚶 [VisitorService] Checking out visitor ${visitorId}`);

      // API call
      await checkoutVisitor(visitorId);

      // Remove from checked-in
      this.checkedInVisitors = this.checkedInVisitors.filter(v => v.id !== visitorId);
      await this.saveCheckedIn();

      // Notify
      this.notifyListeners('checkedOut', { visitorId });

      return true;
    } catch (err) {
      console.error('[VisitorService] Checkout error:', err.message);
      throw err;
    }
  }

  // ── Getters ──────────────────────────────────────────────────

  getPendingVisitors() {
    return [...this.pendingVisitors];
  }

  getCheckedInVisitors() {
    return [...this.checkedInVisitors];
  }

  getPendingCount() {
    return this.pendingVisitors.length;
  }

  getCheckedInCount() {
    return this.checkedInVisitors.length;
  }

  getOverstayVisitors() {
    return this.checkedInVisitors.filter(v => v.is_overstay);
  }

  // ── Storage ──────────────────────────────────────────────────

  async savePending() {
    try {
      await AsyncStorage.setItem(PENDING_STORAGE_KEY, JSON.stringify(this.pendingVisitors));
    } catch (err) {
      console.error('[VisitorService] Save pending error:', err.message);
    }
  }

  async saveCheckedIn() {
    try {
      await AsyncStorage.setItem(CHECKED_IN_STORAGE_KEY, JSON.stringify(this.checkedInVisitors));
    } catch (err) {
      console.error('[VisitorService] Save checked-in error:', err.message);
    }
  }

  // ── Listeners ────────────────────────────────────────────────

  subscribe(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  notifyListeners(event, data) {
    this.listeners.forEach(cb => {
      try {
        cb(event, data);
      } catch (err) {
        console.error('[VisitorService] Listener error:', err.message);
      }
    });
  }

  // ── Cleanup ──────────────────────────────────────────────────

  destroy() {
    this.listeners = [];
    this.isInitialized = false;
    console.log('🔌 [VisitorService] Destroyed');
  }
}

export default new VisitorService();
