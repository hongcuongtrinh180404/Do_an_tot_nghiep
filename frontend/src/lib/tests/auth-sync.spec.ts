// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AUTH_SYNC_CHANNEL,
  broadcastAuthEvent,
  getAuthSyncTabId,
  isAuthSyncMessageFromThisTab,
  type AuthSyncMessage,
} from '../auth-sync';

class FakeBroadcastChannel {
  static instances: FakeBroadcastChannel[] = [];

  readonly name: string;
  readonly messages: unknown[] = [];
  onmessage: ((event: MessageEvent) => void) | null = null;

  constructor(name: string) {
    this.name = name;
    FakeBroadcastChannel.instances.push(this);
  }

  postMessage(data: unknown): void {
    this.messages.push(data);
  }

  close(): void {}
}

describe('auth sync channel', () => {
  beforeEach(() => {
    FakeBroadcastChannel.instances = [];
    sessionStorage.clear();
    vi.stubGlobal('BroadcastChannel', FakeBroadcastChannel);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('keeps a stable tab id for the lifetime of the tab', () => {
    const first = getAuthSyncTabId();
    expect(first).toBe(getAuthSyncTabId());
    expect(sessionStorage.getItem('authSyncTabId')).toBe(first);
  });

  it('tags broadcasts so the emitting tab can ignore its own event', () => {
    broadcastAuthEvent({ type: 'AUTH_USER_SWITCHED', user: { role: 'admin' } });

    const [channel] = FakeBroadcastChannel.instances;
    expect(channel.name).toBe(AUTH_SYNC_CHANNEL);

    const message = channel.messages[0] as AuthSyncMessage;
    expect(message.type).toBe('AUTH_USER_SWITCHED');
    expect(message.senderId).toBe(getAuthSyncTabId());
    expect(isAuthSyncMessageFromThisTab(message)).toBe(true);
  });

  it('treats messages from other tabs and legacy messages as external', () => {
    expect(isAuthSyncMessageFromThisTab({ type: 'AUTH_LOGOUT', senderId: 'other-tab' })).toBe(false);
    expect(isAuthSyncMessageFromThisTab({ type: 'AUTH_LOGOUT' })).toBe(false);
  });
});
