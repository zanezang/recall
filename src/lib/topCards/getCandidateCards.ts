import { prisma } from '../prisma.ts';
import type { Card } from '../types.ts';

/**
 * Top cards, step 2 of 3: load every card above the chosen level.
 * Server-only, because it uses the Prisma client.
 */

/** The fields returned for each card: the id, the question to show, and the priority factors. */
const CANDIDATE_FIELDS = {
  id: true,
  question: true,
  confidence: true,
  createdAt: true,
  lastReviewedAt: true,
} as const;

/** A card as the database returns it, with times as Date objects. */
type CardRow = {
  id: number;
  question: string;
  confidence: number;
  createdAt: Date;
  lastReviewedAt: Date;
};

/** Converts the database's Date fields to the millisecond numbers the priority formula uses. */
function toCard(card: CardRow): Card {
  return {
    id: card.id,
    question: card.question,
    confidence: card.confidence,
    createdAt: card.createdAt.getTime(),
    lastReviewedAt: card.lastReviewedAt.getTime(),
  };
}

/**
 * Returns every card that has crossed `level` by `nowMs` (the candidates), with the fields
 * the priority formula needs. When `level` is null (no level had k cards above it),
 * returns every card.
 *
 * Runs two queries: one walks the (level, crossesAt) index for the matching card ids,
 * O(log n + m); the other looks each id up in the Card table, O(m log n). Here m is the
 * number of candidates and n the number of cards.
 */
export async function getCandidateCards(level: number | null, nowMs: number): Promise<Card[]> {
  // Fallback: no level narrows the search, so every card must be scored.
  if (level === null) {
    const allCards = await prisma.card.findMany({ select: CANDIDATE_FIELDS });
    const candidates: Card[] = [];
    for (const card of allCards) {
      candidates.push(toCard(card));
    }
    return candidates;
  }

  const now = new Date(nowMs);

  // Every row for this level whose cross time has passed, with its card attached.
  // No `take` and no `orderBy`: every candidate is needed and step 3 does the ranking.
  const rowsAboveLevel = await prisma.cardLevelTime.findMany({
    select: { card: { select: CANDIDATE_FIELDS } },
    where: {
      level: level,
      crossesAt: { lte: now },
    },
  });

  // Each row is { card: {...} }; keep just the card.
  const candidates: Card[] = [];
  for (const row of rowsAboveLevel) {
    candidates.push(toCard(row.card));
  }
  return candidates;
}
