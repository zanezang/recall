/**
 * Data types shared across the priority formula, the level table, and the top cards.
 * Type-only, with no runtime code, so both server code and the page can import it.
 */

/** The inputs to the priority formula. Times are milliseconds since the Unix epoch. */
export type PriorityFactors = {
  confidence: number;
  createdAt: number;
  lastReviewedAt: number;
};

/** One row of the CardLevelTime table, before it is saved: when the card's priority crosses `level`. */
export type LevelTime = {
  level: number;
  crossesAt: Date;
};

/**
 * A card as the app uses it outside the database: its id, its question, and the inputs to
 * the priority formula, with times as milliseconds so they can be subtracted. The `&` adds
 * these fields to PriorityInputs, so a card can be passed anywhere PriorityInputs are
 * expected.
 */
export type Card = PriorityFactors & {
  id: number;
  question: string;
};
