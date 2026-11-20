import { MinHeap } from '../minHeap.ts';
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

/** Orders scored cards by priority, lowest first, so the heap's root is the lowest kept. */
function compareByPriority(a: ScoredCard, b: ScoredCard): number {
  return a.priority - b.priority;
}

/**
 * Returns the `k` candidates with the highest priority at `nowMs`, highest first.
 * Returns all of them, still ranked, when there are fewer than `k`.
 *
 * `nowMs` is read once per request and passed in, so every card is scored at the same
 * instant as the level probe that selected it.
 *
 * Keeps the best k seen so far in a min-heap, whose root is the weakest of them, so each
 * new candidate only has to beat the root. O(m log k) for m candidates, instead of
 * O(m log m) for sorting them all.
 */
export function selectTopCards(candidateCards: Card[], nowMs: number, k: number): Card[] {
  // Score the first k candidates and build the heap from them in O(k).
  const firstKScoredCards: ScoredCard[] = [];
  for (let index = 0; index < k && index < candidateCards.length; index++) {
    const card = candidateCards[index];
    firstKScoredCards.push({ card: card, priority: priorityAt(card, nowMs) });
  }
  const heap = new MinHeap<ScoredCard>(compareByPriority, firstKScoredCards);

  // Each remaining candidate replaces the root if it beats the lowest card kept so far.
  for (let index = k; index < candidateCards.length; index++) {
    const card = candidateCards[index];
    const priority = priorityAt(card, nowMs);
    const lowestKept = heap.peek();
    if (lowestKept !== undefined && priority > lowestKept.priority) {
      heap.removeRoot();
      heap.add({ card: card, priority: priority });
    }
  }

  // Removing the roots gives lowest first, so reverse for highest first.
  const topCards: Card[] = [];
  while (heap.size() > 0) {
    const scoredCard = heap.removeRoot();
    if (scoredCard !== undefined) {
      topCards.push(scoredCard.card);
    }
  }
  topCards.reverse();
  return topCards;
}
