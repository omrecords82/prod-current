/**
 * OMAI control-panel embed: receive OM JWT from parent frame after session-bridge.
 * Also handles same-origin localStorage race when iframe loads before bridge completes.
 */
const MSG_SESSION = 'om-cp-embed-session';
const MSG_READY = 'om-cp-embed-ready';

function persistBridgedSession(payload: {
  access_token?: string;
  refresh_token?: string | null;
  user?: Record<string, unknown> | null;
}) {
  if (!payload.access_token) return;
  sessionStorage.removeItem('om_logged_out');
  sessionStorage.removeItem('om_logout_in_progress');
  localStorage.setItem('access_token', payload.access_token);
  if (payload.refresh_token) localStorage.setItem('refresh_token', payload.refresh_token);
  if (payload.user) localStorage.setItem('auth_user', JSON.stringify(payload.user));
  window.dispatchEvent(new CustomEvent('om-embed-session-ready'));
}

export function initCpEmbedSessionBridge(): void {
  if (typeof window === 'undefined') return;
  const params = new URLSearchParams(window.location.search);
  if (!params.get('cp_embed')) return;

  window.addEventListener('message', (event) => {
    if (event.data?.type !== MSG_SESSION) return;
    persistBridgedSession(event.data);
  });

  if (window.parent !== window) {
    window.parent.postMessage({ type: MSG_READY }, window.location.origin);
  }
}

export const CP_EMBED_MSG_SESSION = MSG_SESSION;
export const CP_EMBED_MSG_READY = MSG_READY;
