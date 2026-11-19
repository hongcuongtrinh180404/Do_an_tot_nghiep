export const AUTH_SYNC_CHANNEL = 'app_auth_sync';

const AUTH_SYNC_TAB_ID_KEY = 'authSyncTabId';

export interface AuthSyncMessage {
  type: 'AUTH_LOGOUT' | 'AUTH_USER_SWITCHED';
  reason?: string;
  user?: unknown;
  /** Identifies the tab that emitted the event so it can ignore its own message. */
  senderId?: string;
}

let fallbackTabId: string | null = null;

function createTabId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/**
 * Stable per-tab id. It survives reloads within the same tab (sessionStorage)
 * but differs across tabs, which lets a tab ignore its own broadcast events.
 */
export function getAuthSyncTabId(): string {
  if (typeof window === 'undefined') return 'server';

  try {
    const stored = sessionStorage.getItem(AUTH_SYNC_TAB_ID_KEY);
    if (stored) return stored;

    const created = createTabId();
    sessionStorage.setItem(AUTH_SYNC_TAB_ID_KEY, created);
    return created;
  } catch {
    fallbackTabId ??= createTabId();
    return fallbackTabId;
  }
}

export function isAuthSyncMessageFromThisTab(message: AuthSyncMessage): boolean {
  return !!message.senderId && message.senderId === getAuthSyncTabId();
}

/**
 * Notifies every other tab about an auth change. The emitting tab must update
 * its own state directly; this message intentionally carries a sender id so
 * other listeners can skip it.
 */
export function broadcastAuthEvent(message: Omit<AuthSyncMessage, 'senderId'>): void {
  if (typeof window === 'undefined' || !('BroadcastChannel' in window)) return;

  try {
    const channel = new BroadcastChannel(AUTH_SYNC_CHANNEL);
    channel.postMessage({ ...message, senderId: getAuthSyncTabId() });
    channel.close();
  } catch {
    // BroadcastChannel or storage can be unavailable (private mode, older browsers).
  }
}
