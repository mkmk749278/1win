import type { BotDecision, CrashEvent } from '@crash/shared';
import type { BotStrategy, StrategyContext } from './baseStrategy.js';

export class FixedTargetStrategy implements BotStrategy {
  readonly name = 'fixedTarget' as const;

  onEvent(event: CrashEvent, context: StrategyContext): BotDecision | null {
    if (event.type !== 'signal' || context.skippedRounds < 1) {
      return null;
    }

    return {
      shouldEnter: true,
      reason: `signal received after ${context.skippedRounds} skipped rounds`,
      targetMultiplier: context.targetMultiplier,
      suggestedStake: 1,
    };
  }
}
