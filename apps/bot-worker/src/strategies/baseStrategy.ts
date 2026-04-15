import type { BotDecision, BotStrategyName, CrashEvent } from '@crash/shared';

export type StrategyContext = {
  skippedRounds: number;
  recentCrashes: number[];
  targetMultiplier: number;
};

export interface BotStrategy {
  readonly name: BotStrategyName;
  onEvent(event: CrashEvent, context: StrategyContext): BotDecision | null;
}
