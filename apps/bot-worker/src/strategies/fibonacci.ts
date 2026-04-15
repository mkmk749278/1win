import type { BotDecision, CrashEvent } from '@crash/shared';
import type { BotStrategy, StrategyContext } from './baseStrategy.js';

const sequence = [1, 1, 2, 3, 5, 8];

export class FibonacciStrategy implements BotStrategy {
  readonly name = 'fibonacci' as const;

  onEvent(event: CrashEvent, context: StrategyContext): BotDecision | null {
    if (event.type !== 'round_prepare') {
      return null;
    }

    const lowCrashStreak = context.recentCrashes.slice(-2).every((value) => value < 1.6);
    if (!lowCrashStreak) {
      return null;
    }

    const stakeIndex = Math.min(context.skippedRounds, sequence.length - 1);
    const suggestedStake = sequence[stakeIndex] ?? sequence[sequence.length - 1] ?? 1;

    return {
      shouldEnter: true,
      reason: 'two short rounds in a row triggered fibonacci simulation',
      targetMultiplier: context.targetMultiplier,
      suggestedStake,
    };
  }
}
