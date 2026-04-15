import { describe, expect, it, vi } from 'vitest';
import { RoundManager } from '../src/game/roundManager.js';
import { CrashEngine } from '../src/game/crashEngine.js';

describe('RoundManager', () => {
  it('emits prepare, tick, and crash events', () => {
    vi.useFakeTimers();
    let now = 0;
    const events: Array<{ type: string }> = [];
    const engine = new CrashEngine(() => 0.2, 1.05, 1.4);
    const manager = new RoundManager({
      tickMs: 100,
      prepMs: 200,
      engine,
      onBroadcast: (payload) => events.push(payload),
      logger: {
        info: () => undefined,
        warn: () => undefined,
        error: () => undefined,
      },
      now: () => now,
    });

    manager.start();
    vi.advanceTimersByTime(200);

    for (let step = 0; step < 20; step += 1) {
      now += 100;
      vi.advanceTimersByTime(100);
    }

    manager.stop();
    expect(events.some((event) => event.type === 'round_prepare')).toBe(true);
    expect(events.some((event) => event.type === 'round_tick')).toBe(true);
    expect(events.some((event) => event.type === 'round_crash')).toBe(true);
    vi.useRealTimers();
  });
});
