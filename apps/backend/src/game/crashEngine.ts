import { clamp, defaultRandomSource, type RandomSource } from '../utils/random.js';

export class CrashEngine {
  constructor(
    private readonly random: RandomSource = defaultRandomSource,
    private readonly minCrash = 1.05,
    private readonly maxCrash = 15,
  ) {}

  // The multiplier accelerates over time so the graph feels like a real crash round.
  getMultiplier(elapsedMs: number): number {
    const seconds = Math.max(elapsedMs, 0) / 1000;
    const multiplier = 1 + seconds * 0.45 + seconds * seconds * 0.18;
    return Number(multiplier.toFixed(2));
  }

  // This is intentionally simulation-focused and not a provably-fair production algorithm.
  generateCrashPoint(): number {
    const skewed = Math.pow(this.random(), 1.6);
    const crashPoint = this.minCrash + skewed * (this.maxCrash - this.minCrash);
    return Number(clamp(crashPoint, this.minCrash, this.maxCrash).toFixed(2));
  }
}
