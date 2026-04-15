import { loadEnv } from './config/env.js';
import { RoundManager } from './game/roundManager.js';
import { createApp } from './server/app.js';
import { createRealtimeHub } from './server/websocket.js';
import { createLogger } from './services/logger.js';
import { CrashEngine } from './game/crashEngine.js';

const env = loadEnv();
const logger = createLogger(env);

async function bootstrap() {
  const roundManager = new RoundManager({
    tickMs: env.TICK_MS,
    prepMs: env.PREP_MS,
    engine: new CrashEngine(undefined, env.CRASH_MIN, env.CRASH_MAX),
    onBroadcast: () => undefined,
    logger,
  });

  const app = await createApp(env, logger, roundManager);
  const realtimeHub = createRealtimeHub(app.server, logger, () => roundManager.getPublicState());
  roundManager.setBroadcaster(realtimeHub.broadcast);

  const shutdown = async (signal: string) => {
    logger.info(`received ${signal}, shutting down`);
    roundManager.stop();
    realtimeHub.close();
    await app.close();
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('uncaughtException', (error) => logger.error('uncaught exception', error));
  process.on('unhandledRejection', (error) => logger.error('unhandled rejection', error));

  await app.listen({ host: env.HOST, port: env.BACKEND_PORT });
  logger.info(`backend listening on http://${env.HOST}:${env.BACKEND_PORT}`);
  roundManager.start();
}

void bootstrap();
