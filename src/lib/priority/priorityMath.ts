/**
 * Card priority and cross-time calculations, shared by the page and the API.
 *
 * A card's priority rises continuously from 0 at its last review. Because it only ever
 * rises, the moment it reaches a given threshold can be computed once, at review time,
 * and stored. "Is this card above that score?" then becomes a timestamp comparison instead of a
 * formula evaluated on every card.
 */

import type { PriorityFactors } from '../types.ts';

/** Weight on time since the last review in the priority formula. 1 leaves it unscaled. */
export const ELAPSED_TIME_WEIGHT = 1;

/** First step tried when looking for the time a card crosses a threshold, in milliseconds. */
const INITIAL_SEARCH_STEP_MS = 1000;

/**
 * Scores how urgently a card needs review at `timeMs`. Higher scores are studied first.
 *
 *   priority = (secondsSinceReview × ELAPSED_TIME_WEIGHT) / (confidence × ln(ageInSeconds + e))
 *
 * Priority rises with time since the last review and falls with confidence. The log term
 * gradually lowers the score of long-lived cards, and adding e keeps it at least 1, so a
 * brand-new card never divides by zero.
 */
export function priorityAt(card: PriorityFactors, timeMs: number): number {
  const secondsSinceReview = (timeMs - card.lastReviewedAt) / 1000;
  const ageInSeconds = (timeMs - card.createdAt) / 1000;

  return (
    (secondsSinceReview * ELAPSED_TIME_WEIGHT) /
    (card.confidence * Math.log(ageInSeconds + Math.E))
  );
}

/**
 * Returns the earliest time, in whole milliseconds, at which the card's priority reaches
 * `threshold`.
 *
 * The equation priority(t) = threshold has no closed-form solution because of the log
 * term, so the answer is found by binary search over time. This is valid because priority
 * is strictly increasing between reviews, and it terminates because priority grows
 * without bound.
 *
 * Runs in O(log d) evaluations of the formula, where d is the time until the card crosses.
 */
export function findCrossTime(card: PriorityFactors, threshold: number): number {
  // A threshold of 0 or less is already reached at the review time, and an infinite or
  // non-numeric threshold is never reached, so the search below would not terminate.
  if (!Number.isFinite(threshold) || threshold <= 0) {
    throw new RangeError('threshold must be a finite number greater than 0.');
  }

  // Phase 1: find two times that bracket the answer.
  //
  // `notCrossed` is a time at which priority is below the threshold. It starts at the last
  // review, where priority is 0. `crossed` is a later candidate time. While the candidate is
  // still below the threshold, it becomes the new `notCrossed` and the next candidate is
  // placed twice as far ahead, so the gap grows exponentially.
  let notCrossed = card.lastReviewedAt;
  let step = INITIAL_SEARCH_STEP_MS;
  let crossed = notCrossed + step;
  while (priorityAt(card, crossed) < threshold) {
    notCrossed = crossed;
    step = step * 2;
    crossed = notCrossed + step;
  }

  // Phase 2: binary search between the two times.
  //
  // Invariant: priority(notCrossed) < threshold <= priority(crossed).
  // Each pass tests the midpoint and moves one of the two times onto it, which halves
  // the gap and keeps the invariant. When the times are one millisecond apart, `crossed` is
  // the first millisecond at which the threshold is reached.
  while (crossed - notCrossed > 1) {
    const middle = notCrossed + Math.floor((crossed - notCrossed) / 2);
    if (priorityAt(card, middle) < threshold) {
      notCrossed = middle;
    } else {
      crossed = middle;
    }
  }

  return crossed;
}
