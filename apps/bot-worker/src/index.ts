import pino from 'pino';
import WebSocket from 'ws';
import type { BotConfig, CrashEvent, RoundCrashEvent } from '@crash/shared';
import { loadBotConfig } from './config.js';
import { FibonacciStrategy } from './strategies/fibonacci.js';
import { FixedTargetStrategy } from './strategies/fixedTarget.js';
import type { BotStrategy } from './strategies/baseStrategy.js';

const logger = pino({ level: process.env.LOG_LEVEL ?? 'info', base: null, timestamp: pino.stdTimeFunctions.isoTime });
const configPath = process.env.BOT_CONFIG_PATH ?? '/home/runner/work/1win/1win/configs/bots/conservative.json';
const socketUrl = process.env.BACKEND_WS_URL ?? 'ws://localhost:3001/ws';
const config = loadBotConfig(configPath);

function createStrategy(botConfig: BotConfig): BotStrategy {
  return botConfig.strategy === 'fibonacci' ? new FibonacciStrategy() : new FixedTargetStrategy();
}

class BotRuntime {
  private readonly strategy = createStrategy(config);
  private skippedRounds = 0;
  private recentCrashes: number[] = [];
  private simulatedEntriesToday = 0;
  private currentDay = new Date().toDateString();
  private socket?: WebSocket;

  start() {
    this.connect();
  }

  private connect() {
    logger.info({ bot: config.name, socketUrl }, 'connecting bot');
    this.socket = new WebSocket(socketUrl);

    this.socket.on('open', () => {
      logger.info({ bot: config.name, strategy: this.strategy.name }, 'bot connected');
    });

    this.socket.on('message', (raw: WebSocket.RawData) => this.handleMessage(String(raw)));
    this.socket.on('close', () => {
      logger.warn({ bot: config.name }, 'bot disconnected, scheduling reconnect');
      setTimeout(() => this.connect(), config.reconnectDelayMs);
    });
    this.socket.on('error', (error: Error) => {
      logger.error({ bot: config.name, error }, 'bot websocket error');
    });
  }

  private handleMessage(raw: string) {
    const parsed = JSON.parse(raw) as CrashEvent | { type: 'state'; payload: { history: number[] } };

    if (parsed.type === 'state') {
      this.recentCrashes = parsed.payload.history;
      return;
    }

    this.rollDayIfNeeded();

    if (parsed.type === 'round_prepare') {
      this.skippedRounds += 1;
    }

    if (parsed.type === 'round_crash') {
      this.recentCrashes = [...this.recentCrashes, parsed.crashAt].slice(-10);
    }

    const decision = this.strategy.onEvent(parsed, {
      skippedRounds: this.skippedRounds,
      recentCrashes: this.recentCrashes,
      targetMultiplier: config.targetMultiplier,
    });

    if (!decision?.shouldEnter) {
      return;
    }

    if (this.skippedRounds <= config.cooldownRounds) {
      logger.info({ bot: config.name }, 'cooldown guard blocked simulated entry');
      return;
    }

    if (this.simulatedEntriesToday >= config.maxSimulatedEntriesPerDay) {
      logger.warn({ bot: config.name }, 'daily limit reached; skipping simulated entry');
      return;
    }

    this.executeDecision(decision, parsed.type === 'round_crash' ? parsed : undefined);
  }

  private executeDecision(decision: NonNullable<ReturnType<BotStrategy['onEvent']>>, crashEvent?: RoundCrashEvent) {
    this.simulatedEntriesToday += 1;
    this.skippedRounds = 0;

    logger.info(
      {
        bot: config.name,
        dryRun: config.dryRun,
        targetMultiplier: decision.targetMultiplier,
        suggestedStake: decision.suggestedStake,
        reason: decision.reason,
        lastCrash: crashEvent?.crashAt,
      },
      config.dryRun ? 'dry-run simulated entry' : 'live action requested by config',
    );
  }

  private rollDayIfNeeded() {
    const today = new Date().toDateString();
    if (today !== this.currentDay) {
      this.currentDay = today;
      this.simulatedEntriesToday = 0;
    }
  }
}

new BotRuntime().start();
