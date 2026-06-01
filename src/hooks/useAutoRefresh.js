// src/hooks/useAutoRefresh.js
import { useEffect, useRef } from 'react';

/**
 * Auto-refresh hook — calls a refresh function every 20 seconds
 * @param {Function} refreshFn - Function to call for refresh (should be async)
 * @param {boolean} enabled - Whether to enable auto-refresh (default: true)
 * @param {number} interval - Interval in ms (default: 20000 = 20 seconds)
 */
export const useAutoRefresh = (refreshFn, enabled = true, interval = 20000) => {
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!enabled || !refreshFn) return;

    // Set up interval for auto-refresh
    intervalRef.current = setInterval(() => {
      console.log(`🔄 [AutoRefresh] Refreshing (${interval / 1000}s interval)...`);
      refreshFn().catch(err => {
        console.warn('[AutoRefresh] Refresh error:', err.message);
      });
    }, interval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [refreshFn, enabled, interval]);

  return {
    // Optionally expose ability to manually trigger refresh
    manualRefresh: refreshFn,
  };
};

export default useAutoRefresh;
