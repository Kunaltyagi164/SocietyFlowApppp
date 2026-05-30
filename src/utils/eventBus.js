/**
 * Global Event Bus
 * 
 * Provides pub/sub communication between socket layer and service layer
 * Makes sockets → services → components architecture work seamlessly
 * 
 * Usage:
 * eventBus.on('notification:visitorArrival', (data) => { ... })
 * eventBus.emit('notification:visitorArrival', data)
 */

class EventBus {
  constructor() {
    this.listeners = new Map();
    console.log('✅ [EventBus] Initialized');
  }

  /**
   * Subscribe to event
   * Returns unsubscribe function
   */
  on(eventName, callback) {
    if (!eventName || typeof callback !== 'function') {
      console.error('[EventBus] Invalid on() call:', eventName);
      return () => {};
    }

    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, []);
    }

    this.listeners.get(eventName).push(callback);
    console.log(`📌 [EventBus] Listener added: ${eventName}`);

    // Return unsubscribe function
    return () => {
      const callbacks = this.listeners.get(eventName);
      if (!callbacks) return;
      const index = callbacks.indexOf(callback);
      if (index > -1) callbacks.splice(index, 1);
      console.log(`📌 [EventBus] Listener removed: ${eventName}`);
    };
  }

  /**
   * Emit event to all listeners
   */
  emit(eventName, data) {
    if (!eventName) {
      console.error('[EventBus] Invalid emit() call');
      return;
    }

    const callbacks = this.listeners.get(eventName);
    if (!callbacks || callbacks.length === 0) {
      return; // No listeners, skip
    }

    console.log(`📤 [EventBus] Emitting: ${eventName}`, data);
    callbacks.forEach(cb => {
      try {
        cb(data);
      } catch (err) {
        console.error(`[EventBus] Listener error (${eventName}):`, err.message);
      }
    });
  }

  /**
   * Listen once then auto-unsubscribe
   */
  once(eventName, callback) {
    const unsubscribe = this.on(eventName, (data) => {
      callback(data);
      unsubscribe();
    });
    return unsubscribe;
  }

  /**
   * Get all listeners for debugging
   */
  getListeners() {
    const result = {};
    for (const [event, callbacks] of this.listeners) {
      result[event] = callbacks.length;
    }
    return result;
  }

  /**
   * Remove all listeners (cleanup)
   */
  clear() {
    this.listeners.clear();
    console.log('🧹 [EventBus] Cleared all listeners');
  }
}

// Export singleton
const eventBus = new EventBus();

// Also attach to global for convenience
if (typeof global !== 'undefined') {
  global.eventBus = eventBus;
  global.on = eventBus.on.bind(eventBus);
  global.emit = eventBus.emit.bind(eventBus);
  global.once = eventBus.once.bind(eventBus);
}

export default eventBus;
