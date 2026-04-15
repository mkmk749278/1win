import { describe, expect, it } from 'vitest';
import { CrashEngine } from '../src/game/crashEngine.js';

describe('CrashEngine', () => {
  it('grows multiplier over time', () => {
    const engine = new CrashEngine(() => 0.4, 1.05, 10);
    expect(engine.getMultiplier(0)).toBe(1);
    expect(engine.getMultiplier(2_000)).toBeGreaterThan(1.5);
  });

  it('keeps crash point within bounds', () => {
    const engine = new CrashEngine(() => 0.9, 1.05, 10);
    const crashPoint = engine.generateCrashPoint();
    expect(crashPoint).toBeGreaterThanOrEqual(1.05);
    expect(crashPoint).toBeLessThanOrEqual(10);
  });

  it('can produce instant bust rounds from the configured floor', () => {
    const engine = new CrashEngine(() => 0.01, 1.05, 10, 0.01, 0.03);
    expect(engine.generateCrashPoint()).toBe(1.05);
  });

  it('follows a realistic long-tail distribution for midrange rolls', () => {
    const engine = new CrashEngine(() => 0.5, 1.05, 10, 0.01, 0.03);
    expect(engine.generateCrashPoint()).toBe(1.92);
  });
});
