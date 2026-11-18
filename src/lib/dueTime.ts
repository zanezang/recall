/**
 * Card priority and due-time calculations, shared by the page and the API.
 *
 * A card's priority rises continuously from 0 at its last review. Because it only ever
 * rises, the moment it reaches a given threshold can be computed once, at review time,
 * and stored. "Is this card due?" then becomes a timestamp comparison instead of a
 * formula evaluated on every card.
 */

/** The fields that determine a card's priority. Times are milliseconds since the Unix epoch. */
export type CardTiming = {
  confidence: number;
  createdAt: number;
  lastReviewedAt: number;
};

/** Weight on time since the last review in the priority formula. 1 leaves it unscaled. */
export const ELAPSED_TIME_WEIGHT = 1;

/** First step tried when looking for a time at which a card is due, in milliseconds. */
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
export function priorityAt(card: CardTiming, timeMs: number): number {
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
 * Runs in O(log d) evaluations of the formula, where d is the time until the card is due.
 */
export function findDueTime(card: CardTiming, threshold: number): number {
  // A threshold of 0 or less is already reached at the review time, and an infinite or
  // non-numeric threshold is never reached, so the search below would not terminate.
  if (!Number.isFinite(threshold) || threshold <= 0) {
    throw new RangeError('threshold must be a finite number greater than 0.');
  }

  // Phase 1: find two times that bracket the answer.
  //
  // `notDue` is a time at which priority is below the threshold. It starts at the last
  // review, where priority is 0. `due` is a later candidate time. While the candidate is
  // still below the threshold, it becomes the new `notDue` and the next candidate is
  // placed twice as far ahead, so the gap grows exponentially.
  let notDue = card.lastReviewedAt;
  let step = INITIAL_SEARCH_STEP_MS;
  let due = notDue + step;
  while (priorityAt(card, due) < threshold) {
    notDue = due;
    step = step * 2;
    due = notDue + step;
  }

  // Phase 2: binary search between the two times.
  //
  // Invariant: priority(notDue) < threshold <= priority(due).
  // Each pass tests the midpoint and moves one of the two times onto it, which halves
  // the gap and keeps the invariant. When the times are one millisecond apart, `due` is
  // the first millisecond at which the threshold is reached.
  while (due - notDue > 1) {
    const middle = notDue + Math.floor((due - notDue) / 2);
    if (priorityAt(card, middle) < threshold) {
      notDue = middle;
    } else {
      due = middle;
    }
  }

  return due;
}
