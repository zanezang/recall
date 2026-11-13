/**
 * The confidence scale, shared by the page and the API so both enforce the same range.
 *
 * Confidence is the learner's own rating of how well they know a card, from 1 (just
 * starting out) to 5 (very confident).
 */

/** Every allowed confidence value, lowest first. */
export const CONFIDENCE_LEVELS = [1, 2, 3, 4, 5];

export const MIN_CONFIDENCE = CONFIDENCE_LEVELS[0];
export const MAX_CONFIDENCE = CONFIDENCE_LEVELS[CONFIDENCE_LEVELS.length - 1];

/**
 * Returns true if `value` is one of the allowed confidence levels.
 *
 * Accepts `unknown` so it can check untrusted input, such as a parsed request body, and
 * narrows `value` to `number` when it returns true.
 */
export function isValidConfidence(value: unknown): value is number {
  return typeof value === 'number' && CONFIDENCE_LEVELS.includes(value);
}
