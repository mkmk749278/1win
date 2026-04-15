import type { CrashEvent, PublicRoundState, SignalEvent } from '@crash/shared';
import { MAX_SIGNAL_HISTORY } from '@crash/shared';
import { CrashEngine } from './crashEngine.js';
import { SignalService } from '../services/signalService.js';
import type { BroadcastFn, RoundManagerLogger, RoundManagerSnapshot } from './types.js';

export type RoundManagerDeps = {
  tickMs: number;
  prepMs: number;
  engine?: CrashEngine;
  onBroadcast: BroadcastFn;
  logger: RoundManagerLogger;
  now?: () => number;
};

export class RoundManager {
  private readonly engine: CrashEngine;
  private readonly signalService = new SignalService();
  private readonly now: () => number;
  private broadcaster: BroadcastFn;
  private prepTimer?: NodeJS.Timeout;
  private tickTimer?: NodeJS.Timeout;
  private state: RoundManagerSnapshot = {
    roundId: 'round-0',
    phase: 'idle',
    multiplier: 1,
    crashPoint: null,
    history: [],
    signalHistory: [],
    startedAt: null,
  };
  private roundCounter = 0;

  constructor(private readonly deps: RoundManagerDeps) {
    this.engine = deps.engine ?? new CrashEngine();
    this.now = deps.now ?? (() => Date.now());
    this.broadcaster = deps.onBroadcast;
  }

  start() {
    this.scheduleNextRound();
  }

  stop() {
    if (this.prepTimer) {
      clearTimeout(this.prepTimer);
      this.prepTimer = undefined;
    }

    if (this.tickTimer) {
      clearInterval(this.tickTimer);
      this.tickTimer = undefined;
    }
  }

  getPublicState(): PublicRoundState {
    return structuredClone(this.state);
  }

  setBroadcaster(broadcaster: BroadcastFn) {
    this.broadcaster = broadcaster;
  }

  private scheduleNextRound() {
    this.stop();
    this.roundCounter += 1;
    const roundId = `round-${this.roundCounter}`;
    this.state = {
      ...this.state,
      roundId,
      phase: 'preparing',
      multiplier: 1,
      crashPoint: null,
      startedAt: null,
    };
    this.signalService.reset(roundId);

    this.safeBroadcast({
      type: 'round_prepare',
      roundId,
      startsInMs: this.deps.prepMs,
      history: [...this.state.history],
    });

    this.prepTimer = setTimeout(() => this.runLiveRound(roundId), this.deps.prepMs);
  }

  private runLiveRound(roundId: string) {
    const startedAt = this.now();
    const crashPoint = this.engine.generateCrashPoint();
    this.state = {
      ...this.state,
      roundId,
      phase: 'live',
      multiplier: 1,
      crashPoint,
      startedAt,
    };

    this.tickTimer = setInterval(() => {
      try {
        const elapsedMs = this.now() - startedAt;
        const multiplier = this.engine.getMultiplier(elapsedMs);

        if (multiplier >= crashPoint) {
          this.finishRound(roundId, crashPoint, elapsedMs);
          return;
        }

        this.state = {
          ...this.state,
          multiplier,
        };

        this.safeBroadcast({
          type: 'round_tick',
          roundId,
          multiplier,
          elapsedMs,
        });

        const signal = this.signalService.maybeCreateSignal(roundId, multiplier, this.state.history);
        if (signal) {
          this.pushSignal(signal);
          this.safeBroadcast(signal);
        }
      } catch (error) {
        this.deps.logger.error('round tick failed', error);
        this.scheduleRecovery();
      }
    }, this.deps.tickMs);
  }

  private finishRound(roundId: string, crashPoint: number, elapsedMs: number) {
    if (this.tickTimer) {
      clearInterval(this.tickTimer);
      this.tickTimer = undefined;
    }

    this.state = {
      ...this.state,
      roundId,
      phase: 'crashed',
      multiplier: crashPoint,
      crashPoint,
      history: [...this.state.history, crashPoint].slice(-20),
    };

    this.deps.logger.info('round crashed', { roundId, crashPoint, elapsedMs });
    this.safeBroadcast({
      type: 'round_crash',
      roundId,
      crashAt: crashPoint,
      elapsedMs,
    });

    this.prepTimer = setTimeout(() => this.scheduleNextRound(), this.deps.prepMs);
  }

  private pushSignal(signal: SignalEvent) {
    this.state = {
      ...this.state,
      signalHistory: [signal, ...this.state.signalHistory].slice(0, MAX_SIGNAL_HISTORY),
    };
  }

  private scheduleRecovery() {
    this.stop();
    this.prepTimer = setTimeout(() => this.scheduleNextRound(), 3000);
  }

  private safeBroadcast(payload: CrashEvent) {
    try {
      this.broadcaster(payload);
    } catch (error) {
      this.deps.logger.error('broadcast failed', error);
    }
  }
}
