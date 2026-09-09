/**
 * networkStatus.js
 * Auto-detects real-time network connectivity using browser APIs.
 * No manual toggle needed — status follows actual network condition.
 */

import { useState, useEffect } from 'react';

/**
 * Returns true if the browser currently reports network connectivity.
 */
export function getIsOnline() {
  if (typeof navigator === 'undefined') return true;
  return navigator.onLine;
}

/**
 * React hook that reactively tracks online/offline status.
 * Automatically updates when network changes — no polling required.
 *
 * @returns {boolean} isOnline — true when network is available
 */
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(getIsOnline);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}
