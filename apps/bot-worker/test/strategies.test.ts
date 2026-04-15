import { describe, expect, it } from 'vitest';
import { FixedTargetStrategy } from '../src/strategies/fixedTarget.js';
import { FibonacciStrategy } from '../src/strategies/fibonacci.js';

describe('bot strategies', () => {
  it('fixed target reacts to signals after skipped rounds', () => {
    const strategy = new FixedTargetStrategy();
    const decision = strategy.onEvent(
      { type: 'signal', roundId: 'r1', signal: 'test', level: 'info' },
      { skippedRounds: 2, recentCrashes: [2, 2.2], targetMultiplier: 1.8 },
    );

    expect(decision?.shouldEnter).toBe(true);
    expect(decision?.targetMultiplier).toBe(1.8);
  });

  it('fibonacci reacts to short crash streaks', () => {
    const strategy = new FibonacciStrategy();
    const decision = strategy.onEvent(
      { type: 'round_prepare', roundId: 'r2', startsInMs: 1000, history: [1.2, 1.3] },
      { skippedRounds: 3, recentCrashes: [1.2, 1.3], targetMultiplier: 2.5 },
    );

    expect(decision?.shouldEnter).toBe(true);
    expect(decision?.suggestedStake).toBe(3);
  });
});
