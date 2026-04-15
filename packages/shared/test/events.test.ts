import { describe, expect, it } from 'vitest';
import { MAX_SIGNAL_HISTORY, SOCKET_PATH } from '../src/events.js';

describe('shared constants', () => {
  it('exports the websocket path and signal history limit', () => {
    expect(SOCKET_PATH).toBe('/ws');
    expect(MAX_SIGNAL_HISTORY).toBeGreaterThan(0);
  });
});
