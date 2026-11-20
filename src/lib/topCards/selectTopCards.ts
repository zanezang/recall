import { priorityAt } from '../priority/priorityMath.ts';
import type { Card } from '../types.ts';

/**
 * Top cards, step 3 of 3: rank the candidates and keep the best k.
 * A pure function with no database access, so it can be tested directly against a
 * brute-force ranking.
 */

/** A candidate paired with its priority, so each priority is computed only once. */
type ScoredCard = {
  card: Card;
  priority: number;
};

/**
 * Returns the `k` candidates with the highest priority at `nowMs`, highest first.
 * Returns all of them, still ranked, when there are fewer than `k`.
 *
 * `nowMs` is read once per request and passed in, so every card is scored at the same
 * instant as the level probe that selected it.
 *
 * Sorts every candidate: O(m log m) for m candidates. A min-heap of size k would make
 * this O(m log k).
 */
export function selectTopCards(candidates: Card[], nowMs: number, k: number): Card[] {
  // Score each candidate once.
  const scoredCards: ScoredCard[] = [];
  for (const card of candidates) {
    scoredCards.push({ card: card, priority: priorityAt(card, nowMs) });
  }

  // Highest priority first. The comparator returns a negative number when `a` should
  // come before `b`, so `b - a` orders from largest to smallest.
  scoredCards.sort((a, b) => b.priority - a.priority);

  // Keep the first k. If there are fewer than k, the loop stops at the end of the array.
  const topCards: Card[] = [];
  for (let index = 0; index < k && index < scoredCards.length; index++) {
    topCards.push(scoredCards[index].card);
  }
  return topCards;
}
