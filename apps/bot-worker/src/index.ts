import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pino from 'pino';
import WebSocket from 'ws';
import type { CrashEvent, RoundCrashEvent } from '@crash/shared';
import { loadBotConfig } from './config.js';
import type { BotStrategy } from './strategies/baseStrategy.js';
import { createStrategy } from './strategies/index.js';

const logger = pino({ level: process.env.LOG_LEVEL ?? 'info', base: null, timestamp: pino.stdTimeFunctions.isoTime });
const defaultConfigPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../configs/bots/conservative.json',
);
const RECONNECT_DELAY_MULTIPLIER = 4;
const MIN_STALE_THRESHOLD_MS = 15_000;
const configPath = process.env.BOT_CONFIG_PATH ?? defaultConfigPath;
const socketUrl = process.env.BACKEND_WS_URL ?? 'ws://localhost:3001/ws';
const botHealthPort = Number(process.env.BOT_HEALTH_PORT ?? 3002);
const config = loadBotConfig(configPath);

class BotRuntime {
  private readonly strategy = createStrategy(config.strategy);
  private readonly startedAt = Date.now();
  private skippedRounds = 0;
  private recentCrashes: number[] = [];
  private simulatedEntriesToday = 0;
  private currentDay = new Date().toDateString();
  private socket: WebSocket | undefined;
  private reconnectTimer: NodeJS.Timeout | undefined;
  private connected = false;
  private shuttingDown = false;
  private lastMessageAt: number | null = null;
  private readonly healthServer = createServer((request, response) => this.handleHealthRequest(request, response));

  start() {
    this.healthServer.listen(botHealthPort, '0.0.0.0', () => {
      logger.info({ bot: config.name, port: botHealthPort }, 'bot health endpoint listening');
    });
    this.connect();
  }

  stop() {
    this.shuttingDown = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }

    this.socket?.removeAllListeners();
    this.socket?.terminate();
    this.healthServer.close();
  }

  private connect() {
    if (this.shuttingDown) {
      return;
    }

    logger.info({ bot: config.name, socketUrl }, 'connecting bot');
    this.socket = new WebSocket(socketUrl);

    this.socket.on('open', () => {
      this.connected = true;
      logger.info({ bot: config.name, strategy: this.strategy.name }, 'bot connected');
    });

    this.socket.on('message', (raw: WebSocket.RawData) => this.handleMessage(String(raw)));
    this.socket.on('close', () => {
      this.connected = false;
      if (this.shuttingDown) {
        return;
      }

      logger.warn({ bot: config.name }, 'bot disconnected, scheduling reconnect');
      this.reconnectTimer = setTimeout(() => this.connect(), config.reconnectDelayMs);
    });
    this.socket.on('error', (error: Error) => {
      logger.error({ bot: config.name, error }, 'bot websocket error');
    });
  }

  private handleMessage(raw: string) {
    this.lastMessageAt = Date.now();
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

  private handleHealthRequest(request: IncomingMessage, response: ServerResponse) {
    if (request.url !== '/health') {
      response.statusCode = 404;
      response.end('not found');
      return;
    }

    // Allow a few reconnect windows, with a 15s floor, before marking the worker unhealthy to avoid false positives
    // during expected reconnects or short backend restarts.
    const staleThresholdMs = Math.max(config.reconnectDelayMs * RECONNECT_DELAY_MULTIPLIER, MIN_STALE_THRESHOLD_MS);
    const messageAgeMs = this.lastMessageAt === null ? null : Date.now() - this.lastMessageAt;
    const healthy = this.connected && messageAgeMs !== null && messageAgeMs <= staleThresholdMs;

    response.statusCode = healthy ? 200 : 503;
    response.setHeader('content-type', 'application/json');
    response.end(
      JSON.stringify({
        ok: healthy,
        bot: config.name,
        strategy: this.strategy.name,
        connected: this.connected,
        uptimeMs: Date.now() - this.startedAt,
        lastMessageAgeMs: messageAgeMs,
      }),
    );
  }
}

const runtime = new BotRuntime();

process.on('SIGINT', () => runtime.stop());
process.on('SIGTERM', () => runtime.stop());
process.on('uncaughtException', (error) => logger.error({ error }, 'uncaught exception'));
process.on('unhandledRejection', (error) => logger.error({ error }, 'unhandled rejection'));

runtime.start();
