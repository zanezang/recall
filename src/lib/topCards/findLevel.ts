import { LEVEL_SCORES } from '../priority/thresholdLevels.ts';
import { prisma } from '../prisma.ts';

/**
 * Top cards, step 1 of 3: choose the level to read candidates from.
 * Server-only, because it uses the Prisma client.
 */

/**
 * Returns the highest level that at least `k` cards have crossed by `nowMs`,
 * or null if no level has that many, in which case every card must be scored.
 *
 * Every card above a level outranks every card below it, so when `k` cards are above
 * the returned level, the top `k` cards are all among them.
 *
 * Each probe reads at most `k` index entries, so the whole search costs
 * O(L × (log n + k)) for L levels and n cards.
 */
export async function findLevel(nowMs: number, k: number): Promise<number | null> {
  const now = new Date(nowMs);
  const topLevel = LEVEL_SCORES.length - 1;

  // Probe from the highest level down; the first level with k cards above it is the answer.
  for (let currLevel = topLevel; currLevel >= 0; currLevel = currLevel - 1) {
    const rowsAboveLevel = await prisma.cardLevelTime.findMany({
      select: { cardId: true },
      where: {
        level: currLevel,
        crossesAt: { lte: now },
      },
      // Matches the index order. Without it, Prisma orders by the primary key, which
      // makes SQLite read and sort every row at this level before applying `take`.
      orderBy: { crossesAt: 'asc' },
      take: k,
    });

    if (rowsAboveLevel.length === k) {
      return currLevel;
    }
  }

  // Every level, including the lowest, has fewer than k cards above it.
  return null;
}
