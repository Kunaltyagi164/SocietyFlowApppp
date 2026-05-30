/**
 * Event Emitter for real-time app events
 * Used for cross-component communication without prop drilling
 */

class AppEventEmitter {
  constructor() {
    this.listeners = {};
  }

  /**
   * Subscribe to an event
   * @param {string} eventName - Name of the event
   * @param {function} callback - Callback function to execute
   * @returns {function} Unsubscribe function
   */
  on(eventName, callback) {
    if (!this.listeners[eventName]) {
      this.listeners[eventName] = [];
    }
    this.listeners[eventName].push(callback);

    // Return unsubscribe function
    return () => {
      this.listeners[eventName] = this.listeners[eventName].filter(cb => cb !== callback);
      if (this.listeners[eventName].length === 0) {
        delete this.listeners[eventName];
      }
    };
  }

  /**
   * Subscribe to an event, execute once, then unsubscribe
   * @param {string} eventName - Name of the event
   * @param {function} callback - Callback function to execute
   */
  once(eventName, callback) {
    const unsubscribe = this.on(eventName, (data) => {
      callback(data);
      unsubscribe();
    });
    return unsubscribe;
  }

  /**
   * Emit an event
   * @param {string} eventName - Name of the event
   * @param {any} data - Data to pass to listeners
   */
  emit(eventName, data) {
    if (!this.listeners[eventName]) {
      return;
    }
    this.listeners[eventName].forEach(callback => {
      try {
        callback(data);
      } catch (err) {
        console.error(`❌ Error in event listener for "${eventName}":`, err.message);
      }
    });
  }

  /**
   * Remove all listeners for an event
   * @param {string} eventName - Name of the event
   */
  off(eventName) {
    delete this.listeners[eventName];
  }

  /**
   * Remove all listeners
   */
  removeAllListeners() {
    this.listeners = {};
  }
}

export const EventEmitter = new AppEventEmitter();

// Event names for easy reference
export const EVENTS = {
  VISITOR_APPROVED: 'visitor_approved',
  VISITOR_REJECTED: 'visitor_rejected',
  NOTIFICATION_UPDATED: 'notification_updated',
  VISITOR_LIST_UPDATED: 'visitor_list_updated',
  COMMUNITY_POST_CREATED: 'community_post_created',
  COMMUNITY_POST_LIKED: 'community_post_liked',
};
