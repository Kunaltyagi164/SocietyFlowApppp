// src/services/socket.js
import io from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SOCKET_URL = 'http://api.societyflow.in:5000';

class SocketService {
  constructor() {
    this.socket = null;
    this.connected = false;
    this.listeners = {};
  }

  /**
   * Initialize socket connection with JWT token
   */
  async initialize() {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        console.warn('⚠️  [Socket] No token available for connection');
        return false;
      }

      if (this.socket?.connected) {
        console.log('✅ [Socket] Already connected');
        return true;
      }

      console.log('🔌 [Socket] Connecting to', SOCKET_URL);
      
      this.socket = io(SOCKET_URL, {
        auth: { token },
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 5,
        transports: ['websocket', 'polling'],
      });

      this.socket.on('connect', () => {
        console.log('✅ [Socket] Connected successfully');
        this.connected = true;
        this.emit('socket:connected');
      });

      this.socket.on('disconnect', () => {
        console.log('❌ [Socket] Disconnected');
        this.connected = false;
        this.emit('socket:disconnected');
      });

      this.socket.on('error', (error) => {
        console.warn('❌ [Socket] Error:', error);
        this.emit('socket:error', error);
      });

      this.socket.on('connect_error', (error) => {
        console.warn('❌ [Socket] Connection Error:', error);
      });

      // Register emergency-specific listeners
      this.setupEmergencyListeners();

      return true;
    } catch (err) {
      console.error('❌ [Socket] Initialization error:', err.message);
      return false;
    }
  }

  /**
   * Setup emergency-related socket event listeners
   */
  setupEmergencyListeners() {
    // Listen for emergency contacts update
    this.socket.on('emergency:contacts-updated', (data) => {
      console.log('📞 [Socket] Emergency contacts updated from admin:', data);
      this.emit('emergency:contacts-updated', data);
    });

    // Listen for emergency alerts
    this.socket.on('emergency:alert', (data) => {
      console.log('🚨 [Socket] Emergency alert received:', data);
      this.emit('emergency:alert', data);
    });

    // Listen for emergency config changes
    this.socket.on('emergency:config-updated', (data) => {
      console.log('⚙️  [Socket] Emergency config updated:', data);
      this.emit('emergency:config-updated', data);
    });
  }

  /**
   * Request emergency contacts from server (socket-based)
   */
  requestEmergencyContacts() {
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) {
        reject(new Error('Socket not connected'));
        return;
      }

      console.log('📡 [Socket] Requesting emergency contacts...');
      
      // Set a timeout to prevent hanging
      const timeout = setTimeout(() => {
        reject(new Error('Emergency contacts request timeout'));
      }, 10000);

      this.socket.emit('emergency:get-contacts', (response) => {
        clearTimeout(timeout);
        console.log('✅ [Socket] Emergency contacts received:', response);
        resolve(response);
      });
    });
  }

  /**
   * Request emergency config (SOS number, etc)
   */
  requestEmergencyConfig() {
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) {
        reject(new Error('Socket not connected'));
        return;
      }

      console.log('⚙️  [Socket] Requesting emergency config...');
      
      const timeout = setTimeout(() => {
        reject(new Error('Emergency config request timeout'));
      }, 10000);

      this.socket.emit('emergency:get-config', (response) => {
        clearTimeout(timeout);
        console.log('✅ [Socket] Emergency config received:', response);
        resolve(response);
      });
    });
  }

  /**
   * Request emergency alerts
   */
  requestEmergencyAlerts() {
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) {
        reject(new Error('Socket not connected'));
        return;
      }

      console.log('🚨 [Socket] Requesting emergency alerts...');
      
      const timeout = setTimeout(() => {
        reject(new Error('Emergency alerts request timeout'));
      }, 10000);

      this.socket.emit('emergency:get-alerts', (response) => {
        clearTimeout(timeout);
        console.log('✅ [Socket] Emergency alerts received:', response);
        resolve(response);
      });
    });
  }

  /**
   * Generic event listener registration
   */
  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
    
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  /**
   * Generic event emitter
   */
  emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(callback => callback(data));
    }
  }

  /**
   * Disconnect socket
   */
  disconnect() {
    if (this.socket) {
      console.log('🔌 [Socket] Disconnecting...');
      this.socket.disconnect();
      this.connected = false;
    }
  }

  /**
   * Reconnect socket
   */
  async reconnect() {
    this.disconnect();
    return this.initialize();
  }

  /**
   * Check if socket is connected
   */
  isConnected() {
    return this.connected && this.socket?.connected;
  }
}

// Export singleton instance
export default new SocketService();
