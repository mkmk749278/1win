export type RoundPhase = 'idle' | 'preparing' | 'live' | 'crashed';

export type RoundPrepareEvent = {
  type: 'round_prepare';
  roundId: string;
  startsInMs: number;
  history: number[];
};

export type RoundTickEvent = {
  type: 'round_tick';
  roundId: string;
  multiplier: number;
  elapsedMs: number;
};

export type RoundCrashEvent = {
  type: 'round_crash';
  roundId: string;
  crashAt: number;
  elapsedMs: number;
};

export type SignalLevel = 'info' | 'warning';

export type SignalEvent = {
  type: 'signal';
  roundId: string;
  signal: string;
  level: SignalLevel;
};

export type SystemEvent = {
  type: 'system';
  message: string;
};

export type CrashEvent =
  | RoundPrepareEvent
  | RoundTickEvent
  | RoundCrashEvent
  | SignalEvent
  | SystemEvent;

export type PublicRoundState = {
  roundId: string;
  phase: RoundPhase;
  multiplier: number;
  crashPoint: number | null;
  history: number[];
  signalHistory: SignalEvent[];
  startedAt: number | null;
};

export type BotStrategyName = 'fixedTarget' | 'fibonacci';

export type BotConfig = {
  name: string;
  strategy: BotStrategyName;
  targetMultiplier: number;
  dryRun: boolean;
  reconnectDelayMs: number;
  cooldownRounds: number;
  maxSimulatedEntriesPerDay: number;
};

export type BotDecision = {
  shouldEnter: boolean;
  reason: string;
  targetMultiplier: number;
  suggestedStake?: number;
};
