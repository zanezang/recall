import { findDueTime, type CardTiming } from './dueTime.ts';

/**
 * Threshold levels and queue-size limits.
 *
 * A level is a fixed priority score. For every card, the moment its priority crosses each
 * level is stored in the CardLevel table. Because priority only rises between reviews, a
 * card is above a level exactly when that stored moment has passed, so the levels act as
 * an indexed pre-filter for the study queue.
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

/** How many cards the study queue returns when the request does not say. */
export const DEFAULT_QUEUE_SIZE = 5;

/** The largest queue size a request may ask for. */
export const MAX_QUEUE_SIZE = 100;

/** One row of the CardLevel table, before it is saved. */
export type LevelCrossing = {
  level: number;
  crossesAt: Date;
};

/**
 * Computes when the card's priority will cross each level, from its timing at the moment
 * of its latest review. Called whenever a card is created or reviewed.
 */
export function computeLevelCrossings(card: CardTiming): LevelCrossing[] {
  const crossings: LevelCrossing[] = [];
  for (let level = 0; level < LEVEL_SCORES.length; level++) {
    const crossesAtMs = findDueTime(card, LEVEL_SCORES[level]);
    crossings.push({ level: level, crossesAt: new Date(crossesAtMs) });
  }
  return crossings;
}
