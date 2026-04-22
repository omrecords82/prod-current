import { useEffect, useRef, useState, useCallback } from 'react';

interface BuildInfo {
  hash: string;
  version: string;
  gitSha: string;
  buildTime: string;
}

interface VersionCheckOptions {
  pollIntervalMs?: number;
}

const DEFAULT_POLL_INTERVAL = 60_000; // 60 seconds

/**
 * Hook that detects when a new frontend build has been deployed.
 *
 * Detection methods:
 *  A) Polls /build-info.json every `pollIntervalMs` and compares the hash.
 *  B) Listens for a Socket.IO "app:new_build" event for instant notification.
 *
 * Returns `updateAvailable` (boolean) and `dismiss` / `reload` helpers.
 */
export function useVersionCheck(options: VersionCheckOptions = {}) {
  const { pollIntervalMs = DEFAULT_POLL_INTERVAL } = options;

  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [latestBuild, setLatestBuild] = useState<BuildInfo | null>(null);
  const initialHash = useRef<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch build-info.json and compare hashes
  const checkForUpdate = useCallback(async () => {
    try {
      // rogue-fetch: intentional — /build-info.json is a static file served by Nginx,
      // not an API endpoint; apiClient would incorrectly prefix /api and add auth headers
      const res = await fetch('/build-info.json', { cache: 'no-store' });
      if (!res.ok) return;
      const info: BuildInfo = await res.json();

      // First fetch — store the baseline
      if (initialHash.current === null) {
        initialHash.current = info.hash;
        return;
      }

      // Compare
      if (info.hash !== initialHash.current) {
        setLatestBuild(info);
        setUpdateAvailable(true);
      }
    } catch {
      // Network errors are expected when offline — silently ignore
    }
  }, []);

  // Start polling on mount
  useEffect(() => {
    // Immediate first check to capture the baseline hash
    checkForUpdate();

    timerRef.current = setInterval(checkForUpdate, pollIntervalMs);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [checkForUpdate, pollIntervalMs]);

  // Listen for Socket.IO "app:new_build" event (works for authenticated users)
  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent).detail as BuildInfo | undefined;
      if (detail?.hash && detail.hash !== initialHash.current) {
        setLatestBuild(detail);
        setUpdateAvailable(true);
      } else if (!detail) {
        // If no payload, just mark as available
        setUpdateAvailable(true);
      }
    };

    window.addEventListener('app:new_build', handler);
    return () => window.removeEventListener('app:new_build', handler);
  }, []);

  const reload = useCallback(() => {
    window.location.reload();
  }, []);

  const dismiss = useCallback(() => {
    setUpdateAvailable(false);
  }, []);

  return { updateAvailable, latestBuild, reload, dismiss };
}

export default useVersionCheck;
