import type { Card } from '../types.ts';
import { findLevel } from './findLevel.ts';
import { getCandidateCards } from './getCandidateCards.ts';
import { selectTopCards } from './selectTopCards.ts';

/**
 * Top cards: runs the three steps in order. Server-only, because steps 1 and 2 use the
 * Prisma client.
 */

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
