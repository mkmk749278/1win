import type { SignalEvent } from '@crash/shared';

export class SignalService {
  private lastRoundId: string | null = null;
  private emittedForRound = false;

  reset(roundId: string) {
    this.lastRoundId = roundId;
    this.emittedForRound = false;
  }

  maybeCreateSignal(roundId: string, multiplier: number, history: number[]): SignalEvent | null {
    if (this.lastRoundId !== roundId) {
      this.reset(roundId);
    }

    if (this.emittedForRound || multiplier < 2) {
      return null;
    }

    const recent = history.slice(-3);
    const stableTrend = recent.length === 3 && recent.every((value) => value >= 1.8);
    const level = stableTrend ? 'info' : 'warning';
    const signal = stableTrend
      ? 'Signal: recent rounds stayed stable; simulated cashout window near 2x.'
      : 'Signal: volatility increased; if testing bots, keep entries conservative.';

    this.emittedForRound = true;

    return {
      type: 'signal',
      roundId,
      signal,
      level,
    };
  }
}
