import type { CrashEvent, PublicRoundState } from '@crash/shared';

export type SocketEnvelope = CrashEvent | { type: 'state'; payload: PublicRoundState };

export function createCrashSocket(onMessage: (payload: SocketEnvelope) => void) {
  const socketUrl = import.meta.env.VITE_WS_URL ?? 'ws://localhost:3001/ws';
  const socket = new WebSocket(socketUrl);
  socket.onmessage = (event) => onMessage(JSON.parse(event.data) as SocketEnvelope);
  return socket;
}
