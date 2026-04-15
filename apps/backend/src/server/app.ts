import Fastify from 'fastify';
import cors from '@fastify/cors';
import type { Env } from '../config/env.js';
import type { RoundManager } from '../game/roundManager.js';
import type { RoundManagerLogger } from '../game/types.js';

export async function createApp(env: Env, logger: RoundManagerLogger, roundManager: RoundManager) {
  const allowedOrigins = env.CORS_ORIGINS.split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
  const app = Fastify({ logger: false });
  await app.register(cors, {
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error('origin not allowed'), false);
    },
  });

  app.get('/health', async () => ({ ok: true, phase: roundManager.getPublicState().phase }));
  app.get('/state', async () => roundManager.getPublicState());
  app.get('/config', async () => ({ tickMs: env.TICK_MS, prepMs: env.PREP_MS }));

  app.setErrorHandler((error, _request, reply) => {
    logger.error('http request failed', error);
    reply.status(500).send({ message: 'internal server error' });
  });

  return app;
}
