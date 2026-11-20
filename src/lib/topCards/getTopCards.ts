import type { Card } from '../types.ts';
import { findLevel } from './findLevel.ts';
import { getCandidateCards } from './getCandidateCards.ts';
import { selectTopCards } from './selectTopCards.ts';

/**
 * Top cards: runs the three steps in order. Server-only, because steps 1 and 2 use the
 * Prisma client.
 */

/** How many top cards a request returns when it does not say. */
export const DEFAULT_TOP_CARDS_COUNT = 5;

/**
 * The most top cards a request may ask for. findLevel reads up to k index entries per level,
 * so this also bounds the cost of a request.
 */
export const MAX_TOP_CARDS_COUNT = 100;

/**
 * Returns the `k` cards with the highest priority at `nowMs`, highest first, or every card
 * when there are fewer than `k`.
 *
 * The same `nowMs` is passed to all three steps, so the level probe, the candidate load,
 * and the scoring all agree on what "now" is.
 */
export async function getTopCards(nowMs: number, k: number): Promise<Card[]> {
  const level = await findLevel(nowMs, k);
  const candidates = await getCandidateCards(level, nowMs);
  return selectTopCards(candidates, nowMs, k);
}
