import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  LOG_LEVEL: z.string().default('info'),
  HOST: z.string().default('0.0.0.0'),
  BACKEND_PORT: z.coerce.number().int().positive().default(3001),
  PREP_MS: z.coerce.number().int().positive().default(5000),
  TICK_MS: z.coerce.number().int().positive().default(100),
  CRASH_MIN: z.coerce.number().min(1.01).default(1.05),
  CRASH_MAX: z.coerce.number().min(1.1).default(15),
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  return envSchema.parse(source);
}
