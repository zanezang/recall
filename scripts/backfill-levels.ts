/**
 * One-time backfill: computes level rows for cards created before the CardLevelTime table
 * existed. Safe to run again, because each card's rows are replaced, not added to.
 *
 * Run with:  node --env-file=.env scripts/backfill-levels.ts
 */
import { computeLevelTimes } from '../src/lib/priority/levels.ts';
import { prisma } from '../src/lib/prisma.ts';

const cards = await prisma.card.findMany();

for (const card of cards) {
  const levelTimes = computeLevelTimes({
    confidence: card.confidence,
    createdAt: card.createdAt.getTime(),
    lastReviewedAt: card.lastReviewedAt.getTime(),
  });

  // Replaces the card's level rows in one transaction, the same way a review does.
  await prisma.card.update({
    where: { id: card.id },
    data: { levelTimes: { deleteMany: {}, create: levelTimes } },
  });
}

console.log(`Backfilled level rows for ${cards.length} cards.`);
await prisma.$disconnect();
