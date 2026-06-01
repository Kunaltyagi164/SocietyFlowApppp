/**
 * Update Service - Business Logic Layer
 * 
 * Handles app versioning, feature flags, and update management
 * Uses UpdateSocket for real-time update notifications
 * 
 * Architecture:
 * Socket Layer: updateSocket.js (listens to WebSocket)
 *   ↓
 * Service Layer: THIS FILE (business logic, version tracking)
 *   ↓
 * Component Layer: components/UpdatePrompt.js (display)
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { updateSocket } from '../sockets';

const FEATURE_FLAGS_KEY = 'feature_flags';
const UPDATE_VERSION_KEY = 'last_update_version';
const VERSION_SEEN_KEY = 'version_seen_at';

class UpdateService {
  constructor() {
    this.currentVersion = '1.0.0';
    this.featureFlags = {};
    this.listeners = [];
    this.isInitialized = false;
  }

  /**
   * Initialize service with current app version
   */
  async initialize(appVersion = '1.0.0') {
    if (this.isInitialized) return;

    try {
      this.currentVersion = appVersion;

      // Load feature flags from cache
      const cached = await AsyncStorage.getItem(FEATURE_FLAGS_KEY);
      if (cached) {
        this.featureFlags = JSON.parse(cached);
        console.log(`✅ [UpdateService] Loaded ${Object.keys(this.featureFlags).length} feature flags`);
      }

      // Setup socket listeners
      this.setupListeners();

      this.isInitialized = true;
      console.log(`✅ [UpdateService] Initialized (v${appVersion})`);
    } catch (err) {
      console.error('[UpdateService] Init error:', err.message);
    }
  }

  setupListeners() {
    // New version available
    global.on?.('update:available', (data) => {
      console.log('📦 [UpdateService] New version:', data.version);
      this.notifyListeners('versionAvailable', data);
    });

    // Update required
    global.on?.('update:required', (data) => {
      console.log('🚨 [UpdateService] Update required:', data.version);
      this.notifyListeners('updateRequired', data);
    });

    // Feature flags updated
    global.on?.('update:featureFlags', (flags) => {
      this.handleFeatureFlagsUpdated(flags);
    });

    // Maintenance scheduled
    global.on?.('update:maintenance', (data) => {
      console.log('🔧 [UpdateService] Maintenance scheduled');
      this.notifyListeners('maintenanceScheduled', data);
    });

    // Bug alert
    global.on?.('update:bugAlert', (data) => {
      console.log(`🐛 [UpdateService] Bug alert (${data.severity})`);
      this.notifyListeners('bugAlert', data);
    });
  }

  async handleFeatureFlagsUpdated(flags) {
    this.featureFlags = { ...this.featureFlags, ...flags };
    try {
      await AsyncStorage.setItem(FEATURE_FLAGS_KEY, JSON.stringify(this.featureFlags));
    } catch (err) {
      console.warn('[UpdateService] Save flags error:', err.message);
    }
    this.notifyListeners('featureFlagsUpdated', this.featureFlags);
  }

  /**
   * Check if feature is enabled
   * Default: enabled (true means feature is on)
   */
  isFeatureEnabled(featureName) {
    const enabled = this.featureFlags[featureName] !== false;
    console.log(`🚩 [UpdateService] Feature "${featureName}": ${enabled ? 'ON' : 'OFF'}`);
    return enabled;
  }

  /**
   * Get feature flag value
   */
  getFeatureFlag(featureName, defaultValue = null) {
    return this.featureFlags[featureName] ?? defaultValue;
  }

  /**
   * Get all feature flags
   */
  getAllFeatureFlags() {
    return { ...this.featureFlags };
  }

  /**
   * Check if newer version is available
   */
  isNewerVersion(version) {
    return this.compareVersions(version, this.currentVersion) > 0;
  }

  /**
   * Compare two version strings
   * Returns: 1 if v1 > v2, -1 if v1 < v2, 0 if equal
   */
  compareVersions(v1, v2) {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);

    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
      const p1 = parts1[i] || 0;
      const p2 = parts2[i] || 0;
      if (p1 > p2) return 1;
      if (p1 < p2) return -1;
    }
    return 0;
  }

  /**
   * Mark version as seen (prevent duplicate prompts)
   */
  async markVersionSeen(version) {
    try {
      const key = `${VERSION_SEEN_KEY}_${version}`;
      await AsyncStorage.setItem(key, JSON.stringify(Date.now()));
      console.log(`✅ [UpdateService] Marked v${version} as seen`);
    } catch (err) {
      console.warn('[UpdateService] Mark seen error:', err.message);
    }
  }

  /**
   * Check if version was already shown to user
   */
  async hasVersionBeenSeen(version) {
    try {
      const key = `${VERSION_SEEN_KEY}_${version}`;
      const seen = await AsyncStorage.getItem(key);
      return !!seen;
    } catch (err) {
      return false;
    }
  }

  /**
   * Report that user tapped "Update Now"
   */
  reportUpdateStarted(version) {
    console.log(`📊 [UpdateService] Reporting update started: v${version}`);
    return updateSocket.reportUpdateSeen(version);
  }

  /**
   * Report that update was completed
   */
  reportUpdateCompleted(version) {
    console.log(`📊 [UpdateService] Reporting update completed: v${version}`);
    return updateSocket.reportUpdateCompleted(version);
  }

  /**
   * Request latest feature flags from server
   */
  requestFeatureFlagsRefresh() {
    console.log('🔄 [UpdateService] Requesting feature flags refresh...');
    return updateSocket.requestFeatureFlags();
  }

  /**
   * Get current app version
   */
  getCurrentVersion() {
    return this.currentVersion;
  }

  /**
   * Get version info object
   */
  getVersionInfo() {
    return {
      current: this.currentVersion,
      features: Object.keys(this.featureFlags).length,
      featureFlags: this.getAllFeatureFlags(),
    };
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
        console.error('[UpdateService] Listener error:', err.message);
      }
    });
  }

  // ── Cleanup ──────────────────────────────────────────────────

  destroy() {
    this.listeners = [];
    this.isInitialized = false;
    console.log('🔌 [UpdateService] Destroyed');
  }
}

export default new UpdateService();
