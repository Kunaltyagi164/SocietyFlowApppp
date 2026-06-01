/**
 * Socket Manager - Central WebSocket Connection Handler
 * 
 * Manages a single WebSocket connection with:
 * - Automatic reconnection with exponential backoff
 * - Event listener management
 * - Auth token injection
 * - Connection pooling for multiple features
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const SOCKET_URL = 'ws://api.societyflow.in:5000';
const RECONNECT_DELAYS = [1000, 2000, 5000, 10000]; // ms

class SocketManager {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.reconnectAttempt = 0;
    this.messageListeners = new Map(); // { eventType: [callbacks] }
    this.reconnectTimer = null;
  }

  /**
   * Initialize WebSocket connection
   * Called once on app startup
   */
  async connect() {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        console.warn('[SocketManager] No token available, skipping connection');
        return;
      }

      // Create WebSocket with auth header
      this.socket = new WebSocket(
        `${SOCKET_URL}?token=${token}`
      );

      this.socket.onopen = () => this.handleOpen();
      this.socket.onmessage = (e) => this.handleMessage(e);
      this.socket.onerror = (e) => this.handleError(e);
      this.socket.onclose = () => this.handleClose();

      console.log('🌐 [SocketManager] Connecting...');
    } catch (err) {
      console.error('[SocketManager] Connection error:', err.message);
      this.scheduleReconnect();
    }
  }

  handleOpen() {
    console.log('✅ [SocketManager] Connected');
    this.isConnected = true;
    this.reconnectAttempt = 0;
    this.emit('connected', { timestamp: Date.now() });
  }

  handleMessage(event) {
    try {
      const data = JSON.parse(event.data);
      const { type, payload } = data;

      console.log(`📩 [SocketManager] Received: ${type}`, payload);

      // Emit to all registered listeners for this event type
      if (this.messageListeners.has(type)) {
        const callbacks = this.messageListeners.get(type);
        callbacks.forEach(cb => {
          try {
            cb(payload);
          } catch (err) {
            console.error(`[SocketManager] Listener error for ${type}:`, err.message);
          }
        });
      }
    } catch (err) {
      console.error('[SocketManager] Message parse error:', err.message);
    }
  }

  handleError(event) {
    console.error('❌ [SocketManager] Error:', event.message);
    this.isConnected = false;
  }

  handleClose() {
    console.warn('🔌 [SocketManager] Disconnected');
    this.isConnected = false;
    this.scheduleReconnect();
  }

  /**
   * Schedule reconnection with exponential backoff
   */
  scheduleReconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);

    if (this.reconnectAttempt < RECONNECT_DELAYS.length) {
      const delay = RECONNECT_DELAYS[this.reconnectAttempt];
      console.log(
        `⏱️  [SocketManager] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempt + 1})`
      );

      this.reconnectTimer = setTimeout(() => {
        this.reconnectAttempt++;
        this.connect();
      }, delay);
    } else {
      console.error('[SocketManager] Max reconnection attempts reached');
    }
  }

  /**
   * Send message to server
   */
  send(type, payload = {}) {
    if (!this.isConnected) {
      console.warn(`[SocketManager] Not connected, queuing ${type}`);
      return false;
    }

    try {
      const message = JSON.stringify({ type, payload });
      this.socket.send(message);
      console.log(`📤 [SocketManager] Sent: ${type}`, payload);
      return true;
    } catch (err) {
      console.error(`[SocketManager] Send error (${type}):`, err.message);
      return false;
    }
  }

  /**
   * Register listener for specific event type
   * Returns unsubscribe function
   */
  on(type, callback) {
    if (!this.messageListeners.has(type)) {
      this.messageListeners.set(type, []);
    }
    this.messageListeners.get(type).push(callback);

    console.log(`📌 [SocketManager] Listener registered for: ${type}`);

    // Return unsubscribe function
    return () => {
      const callbacks = this.messageListeners.get(type);
      const index = callbacks.indexOf(callback);
      if (index > -1) callbacks.splice(index, 1);
      console.log(`📌 [SocketManager] Listener unregistered for: ${type}`);
    };
  }

  /**
   * Remove all listeners for event type
   */
  off(type) {
    this.messageListeners.delete(type);
  }

  /**
   * Internal emit for connection events
   */
  emit(type, payload) {
    if (this.messageListeners.has(type)) {
      const callbacks = this.messageListeners.get(type);
      callbacks.forEach(cb => cb(payload));
    }
  }

  /**
   * Disconnect and cleanup
   */
  disconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.isConnected = false;
    this.messageListeners.clear();
    console.log('🔌 [SocketManager] Disconnected');
  }

  /**
   * Get connection status
   */
  getStatus() {
    return {
      isConnected: this.isConnected,
      url: SOCKET_URL,
      listeners: Array.from(this.messageListeners.keys()),
      reconnectAttempt: this.reconnectAttempt,
    };
  }
}

// Export singleton instance
export default new SocketManager();
