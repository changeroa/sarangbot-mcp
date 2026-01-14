import { randomInt } from "crypto";

/**
 * Pick a random item from an array
 */
export function pickRandom<T>(items: T[]): T {
  const index = randomInt(0, items.length);
  return items[index];
}

/**
 * Pick a random integer between min (inclusive) and max (exclusive)
 */
export function getRandomInt(min: number, max: number): number {
  return randomInt(min, max);
}

/**
 * Shuffle an array (Fisher-Yates algorithm)
 */
export function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = randomInt(0, i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
