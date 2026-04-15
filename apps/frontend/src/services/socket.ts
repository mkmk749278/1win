import type { CrashEvent, PublicRoundState } from '@crash/shared';

export type SocketEnvelope = CrashEvent | { type: 'state'; payload: PublicRoundState };

function resolveSocketUrl(rawUrl?: string) {
  if (rawUrl?.startsWith('ws://') || rawUrl?.startsWith('wss://')) {
    return rawUrl;
  }

  if (rawUrl?.startsWith('/')) {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}${rawUrl}`;
  }

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}/ws`;
}

export function createCrashSocket(onMessage: (payload: SocketEnvelope) => void) {
  const socketUrl = resolveSocketUrl(import.meta.env.VITE_WS_URL);
  const socket = new WebSocket(socketUrl);
  socket.onmessage = (event) => onMessage(JSON.parse(event.data) as SocketEnvelope);
  return socket;
}
