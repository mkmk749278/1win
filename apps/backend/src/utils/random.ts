export type RandomSource = () => number;

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export const defaultRandomSource: RandomSource = () => Math.random();
