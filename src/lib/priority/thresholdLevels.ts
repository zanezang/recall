import { findCrossTime } from './priorityMath.ts';
import type { PriorityFactors, LevelTime } from '../types.ts';

/**
 * Threshold levels.
 *
 * A level is a fixed priority score. For every card, the moment its priority crosses each
 * level is stored in the CardLevelTime table. Because priority only rises between reviews, a
 * card is above a level exactly when that stored moment has passed, so the levels act as
 * an indexed pre-filter when finding the top cards.
 */

/** The lowest level. A new card rated 1 reaches it about 2 minutes after review. */
const LOWEST_LEVEL_SCORE = 20;

/** Each level's score is this many times the score of the level below it. */
const LEVEL_RATIO = 2;

/** How many levels exist. The highest, 20 × 2^14 = 327,680, stays above most cards after a month without review. */
const LEVEL_COUNT = 15;

/**
 * The score of each level, lowest first: 20, 40, 80, ..., 327,680.
 * A level's number is its position in this array, so level 0 is the lowest.
 */
export const LEVEL_SCORES: number[] = [];
for (let level = 0; level < LEVEL_COUNT; level++) {
  LEVEL_SCORES.push(LOWEST_LEVEL_SCORE * Math.pow(LEVEL_RATIO, level));
}

/**
 * Computes when the card's priority will cross each level, from its timing at the moment
 * of its latest review. Called whenever a card is created or reviewed.
 */
export function computeLevelTimes(card: PriorityFactors): LevelTime[] {
  const levelTimes: LevelTime[] = [];
  for (let level = 0; level < LEVEL_SCORES.length; level++) {
    const crossesAtMs = findCrossTime(card, LEVEL_SCORES[level]);
    levelTimes.push({ level: level, crossesAt: new Date(crossesAtMs) });
  }
  return levelTimes;
}
