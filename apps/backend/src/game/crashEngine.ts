import { clamp, defaultRandomSource, type RandomSource } from '../utils/random.js';

export class CrashEngine {
  constructor(
    private readonly random: RandomSource = defaultRandomSource,
    private readonly minCrash = 1.05,
    private readonly maxCrash = 15,
    private readonly houseEdge = 0.01,
    private readonly instantBustProbability = 0.03,
  ) {}

  // The multiplier accelerates over time so the graph feels like a real crash round.
  getMultiplier(elapsedMs: number): number {
    const seconds = Math.max(elapsedMs, 0) / 1000;
    const multiplier = 1 + seconds * 0.45 + seconds * seconds * 0.18;
    return Number(multiplier.toFixed(2));
  }

  // This remains simulation-focused, but the curve better reflects the long-tail shape of a crash game.
  generateCrashPoint(): number {
    const roll = clamp(this.random(), 0, 0.999999);
    if (roll <= this.instantBustProbability) {
      return this.minCrash;
    }

    const normalized = (roll - this.instantBustProbability) / (1 - this.instantBustProbability);
    const crashPoint = (1 - this.houseEdge) / (1 - normalized);
    return Number(clamp(crashPoint, this.minCrash, this.maxCrash).toFixed(2));
  }
}
