/**
 * Socket Initialization Module
 * 
 * Initialize all socket services with a single call
 * Use in App.tsx useEffect
 */

import socketManager from './socketManager';
import notificationSocket from './notificationSocket';
import visitorSocket from './visitorSocket';
import updateSocket from './updateSocket';

/**
 * Initialize all socket services
 * Call this once on app startup (typically in useEffect of App.tsx or HomeScreen)
 */
export const initializeSockets = async (appVersion = '1.0.0') => {
  try {
    console.log('🚀 [Sockets] Initializing all socket services...');

    // Connect main WebSocket
    await socketManager.connect();

    // Initialize individual services
    notificationSocket.initialize();
    visitorSocket.initialize();
    updateSocket.initialize(appVersion);

    console.log('✅ [Sockets] All services initialized');

    // Log status
    const status = socketManager.getStatus();
    console.log('📊 [Sockets] Status:', status);

    return true;
  } catch (err) {
    console.error('❌ [Sockets] Initialization failed:', err.message);
    return false;
  }
};

/**
 * Cleanup all sockets
 * Call this on app unmount or logout
 */
export const cleanupSockets = () => {
  console.log('🧹 [Sockets] Cleaning up...');
  notificationSocket.destroy();
  visitorSocket.destroy();
  updateSocket.destroy();
  socketManager.disconnect();
  console.log('✅ [Sockets] Cleanup complete');
};

/**
 * Export all services for use throughout the app
 */
export { socketManager, notificationSocket, visitorSocket, updateSocket };
