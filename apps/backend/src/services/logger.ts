import pino from 'pino';
import type { Env } from '../config/env.js';
import type { RoundManagerLogger } from '../game/types.js';

export function createLogger(env: Env): RoundManagerLogger {
  const logger = pino({
    level: env.LOG_LEVEL,
    base: null,
    timestamp: pino.stdTimeFunctions.isoTime,
  });

  return {
    info(message, meta) {
      if (meta === undefined) {
        logger.info(message);
        return;
      }

      logger.info({ meta }, message);
    },
    warn(message, meta) {
      if (meta === undefined) {
        logger.warn(message);
        return;
      }

      logger.warn({ meta }, message);
    },
    error(message, meta) {
      if (meta === undefined) {
        logger.error(message);
        return;
      }

      logger.error({ meta }, message);
    },
  };
}
