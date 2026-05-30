/**
 * Update Socket Service
 * 
 * Handles app updates and feature deployments:
 * - New version available notifications
 * - Feature flags updates
 * - Maintenance notifications
 * - Forced update requirements
 */

import socketManager from './socketManager';

class UpdateSocket {
  constructor() {
    this.unsubscribers = [];
    this.isInitialized = false;
    this.currentVersion = null;
    this.featureFlags = {};
  }

  /**
   * Setup all update listeners
   * Call once on app startup
   */
  initialize(currentVersion = '1.0.0') {
    if (this.isInitialized) return;

    this.currentVersion = currentVersion;

    // Listen for new version available
    const unsubVersion = socketManager.on('VERSION_AVAILABLE', (data) => {
      console.log('📦 [UpdateSocket] New version available:', data);
      this.handleVersionAvailable(data);
    });

    // Listen for forced update requirement
    const unsubForced = socketManager.on('UPDATE_REQUIRED', (data) => {
      console.log('🚨 [UpdateSocket] Update required:', data);
      this.handleUpdateRequired(data);
    });

    // Listen for feature flag updates
    const unsubFeatures = socketManager.on('FEATURE_FLAGS_UPDATED', (data) => {
      console.log('🚩 [UpdateSocket] Feature flags updated:', data);
      this.handleFeatureFlagsUpdated(data);
    });

    // Listen for maintenance window announcements
    const unsubMaintenance = socketManager.on('MAINTENANCE_SCHEDULED', (data) => {
      console.log('🔧 [UpdateSocket] Maintenance scheduled:', data);
      this.handleMaintenanceScheduled(data);
    });

    // Listen for critical bug alerts
    const unsubBugAlert = socketManager.on('BUG_ALERT', (data) => {
      console.log('🐛 [UpdateSocket] Bug alert:', data);
      this.handleBugAlert(data);
    });

    this.unsubscribers = [
      unsubVersion,
      unsubForced,
      unsubFeatures,
      unsubMaintenance,
      unsubBugAlert,
    ];

    // Request initial feature flags
    this.requestFeatureFlags();

    this.isInitialized = true;
    console.log('✅ [UpdateSocket] Initialized');
  }

  handleVersionAvailable(data) {
    const { version, releaseNotes, downloadUrl } = data;
    global.emit?.('update:available', {
      version,
      releaseNotes,
      downloadUrl,
      isRequired: false,
      timestamp: Date.now(),
    });
  }

  handleUpdateRequired(data) {
    const { version, reason, downloadUrl } = data;
    global.emit?.('update:required', {
      version,
      reason,
      downloadUrl,
      isRequired: true,
      timestamp: Date.now(),
    });
  }

  handleFeatureFlagsUpdated(data) {
    this.featureFlags = { ...this.featureFlags, ...data };
    global.emit?.('update:featureFlags', this.featureFlags);
  }

  handleMaintenanceScheduled(data) {
    const { startTime, endTime, reason } = data;
    global.emit?.('update:maintenance', {
      startTime,
      endTime,
      reason,
      timestamp: Date.now(),
    });
  }

  handleBugAlert(data) {
    const { severity, description, workaround } = data;
    global.emit?.('update:bugAlert', {
      severity, // 'critical', 'high', 'medium'
      description,
      workaround,
      timestamp: Date.now(),
    });
  }

  /**
   * Check if feature is enabled
   * Returns true if not in featureFlags (default allow)
   */
  isFeatureEnabled(featureName) {
    const enabled = this.featureFlags[featureName] !== false;
    console.log(`🚩 [UpdateSocket] Feature "${featureName}" is ${enabled ? 'enabled' : 'disabled'}`);
    return enabled;
  }

  /**
   * Get all feature flags
   */
  getFeatureFlags() {
    return { ...this.featureFlags };
  }

  /**
   * Request feature flags from server
   */
  requestFeatureFlags() {
    console.log('📤 [UpdateSocket] Requesting feature flags...');
    return socketManager.send('UPDATE_FEATURE_FLAGS_REQUEST', {
      version: this.currentVersion,
      timestamp: Date.now(),
    });
  }

  /**
   * Report that user has seen update alert
   */
  reportUpdateSeen(version) {
    return socketManager.send('UPDATE_SEEN', {
      version,
      timestamp: Date.now(),
    });
  }

  /**
   * Report that user performed update
   */
  reportUpdateCompleted(version) {
    return socketManager.send('UPDATE_COMPLETED', {
      version,
      timestamp: Date.now(),
    });
  }

  /**
   * Subscribe to update events
   */
  on(eventType, callback) {
    return socketManager.on(`UPDATE_${eventType}`, callback);
  }

  /**
   * Cleanup and remove all listeners
   */
  destroy() {
    this.unsubscribers.forEach(unsub => unsub());
    this.unsubscribers = [];
    this.featureFlags = {};
    this.isInitialized = false;
    console.log('🔌 [UpdateSocket] Destroyed');
  }
}

export default new UpdateSocket();
