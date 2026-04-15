import { WebSocket, WebSocketServer } from 'ws';
import type { Server } from 'node:http';
import { SOCKET_PATH, type CrashEvent, type PublicRoundState } from '@crash/shared';
import type { RoundManagerLogger } from '../game/types.js';

export function createRealtimeHub(server: Server, logger: RoundManagerLogger, getSnapshot: () => PublicRoundState) {
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    if (request.url !== SOCKET_PATH) {
      socket.destroy();
      return;
    }

    wss.handleUpgrade(request, socket, head, (client) => {
      wss.emit('connection', client, request);
    });
  });

  wss.on('connection', (client) => {
    logger.info('websocket client connected');
    client.send(JSON.stringify({ type: 'system', message: 'connected' }));
    client.send(JSON.stringify({ type: 'state', payload: getSnapshot() }));
    client.on('error', (error) => logger.warn('websocket client error', error));
  });

  return {
    broadcast(payload: CrashEvent) {
      const message = JSON.stringify(payload);
      for (const client of wss.clients) {
        if (client.readyState === WebSocket.OPEN) {
          client.send(message);
        }
      }
    },
    close() {
      wss.close();
    },
  };
}
