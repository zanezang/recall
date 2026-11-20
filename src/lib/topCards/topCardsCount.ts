/**
 * How many top cards a request may ask for. Shared by the API, which enforces it, and the
 * page, which checks the typed count before sending it. Kept apart from getTopCards.ts
 * because that file uses the Prisma client, which must never be bundled into the page.
 */

/** How many top cards a request returns when it does not say. */
export const DEFAULT_TOP_CARDS_COUNT = 5;

/**
 * The most top cards a request may ask for. findLevel reads up to k index entries per level,
 * so this also bounds the cost of a request.
 */
export const MAX_TOP_CARDS_COUNT = 100;
