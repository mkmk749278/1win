import type { BotStrategyName } from '@crash/shared';
import type { BotStrategy } from './baseStrategy.js';
import { FibonacciStrategy } from './fibonacci.js';
import { FixedTargetStrategy } from './fixedTarget.js';

const strategyFactories: Record<BotStrategyName, () => BotStrategy> = {
  fibonacci: () => new FibonacciStrategy(),
  fixedTarget: () => new FixedTargetStrategy(),
};

export function createStrategy(strategyName: BotStrategyName): BotStrategy {
  return strategyFactories[strategyName]();
}
