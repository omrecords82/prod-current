import { useEffect, useState } from 'react';

/**
 * useDeploymentFingerprint — fetch the running build's identity for the
 * super_admin DeploymentFingerprintBar. Compares two sources:
 *
 *   - frontend: GET /version.json   (static file written into dist/ at build)
 *   - backend:  GET /api/admin/deployment-fingerprint   (super_admin route)
 *
 * Returns { frontend, backend, loading } — fields are null while loading and
 * also null when fetches fail. The bar renders 'unknown' chips in that case
 * rather than blocking the whole page.
 */

export interface BuildFingerprint {
  app: 'om' | 'omai' | string;
  target: 'frontend' | 'backend' | string;
  gitSha: string;
  gitBranch: string;
  builtAt: string | null;
  buildHost: string | null;
}

export interface DeploymentFingerprintState {
  frontend: BuildFingerprint | null;
  backend: BuildFingerprint | null;
  loading: boolean;
}

const FE_URL = '/version.json';
const BE_URL = '/api/admin/deployment-fingerprint';

export default function useDeploymentFingerprint(enabled: boolean): DeploymentFingerprintState {
  const [state, setState] = useState<DeploymentFingerprintState>({
    frontend: null,
    backend: null,
    loading: enabled,
  });

  useEffect(() => {
    if (!enabled) {
      setState({ frontend: null, backend: null, loading: false });
      return;
    }
    let cancelled = false;
    Promise.allSettled([
      fetch(FE_URL, { cache: 'no-store', credentials: 'same-origin' }).then(r => (r.ok ? r.json() : null)),
      fetch(BE_URL, { cache: 'no-store', credentials: 'same-origin' }).then(r => (r.ok ? r.json() : null)),
    ]).then(([fe, be]) => {
      if (cancelled) return;
      const feData = fe.status === 'fulfilled' && fe.value ? (fe.value as BuildFingerprint) : null;
      const beData =
        be.status === 'fulfilled' && be.value && (be.value as any).fingerprint
          ? ((be.value as any).fingerprint as BuildFingerprint)
          : null;
      setState({ frontend: feData, backend: beData, loading: false });
    });
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return state;
}
