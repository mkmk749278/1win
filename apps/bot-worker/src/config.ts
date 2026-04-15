import fs from 'node:fs';
import { z } from 'zod';
import type { BotConfig } from '@crash/shared';

const botConfigSchema = z.object({
  name: z.string().min(1),
  strategy: z.enum(['fixedTarget', 'fibonacci']),
  targetMultiplier: z.number().min(1.1),
  dryRun: z.boolean().default(true),
  reconnectDelayMs: z.number().int().positive().default(3_000),
  cooldownRounds: z.number().int().nonnegative().default(1),
  maxSimulatedEntriesPerDay: z.number().int().positive().default(25),
});

export function loadBotConfig(configPath: string): BotConfig {
  const raw = fs.readFileSync(configPath, 'utf8');
  return botConfigSchema.parse(JSON.parse(raw));
}
