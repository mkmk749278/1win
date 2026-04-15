import type { PublicRoundState } from '@crash/shared';

export type RoundManagerLogger = {
  info: (message: string, meta?: unknown) => void;
  warn: (message: string, meta?: unknown) => void;
  error: (message: string, meta?: unknown) => void;
};

export type BroadcastFn = (payload: import('@crash/shared').CrashEvent) => void;

export type RoundManagerSnapshot = PublicRoundState;
