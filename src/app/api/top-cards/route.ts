import { type NextRequest } from 'next/server';

import { DEFAULT_TOP_CARDS_COUNT, getTopCards, MAX_TOP_CARDS_COUNT } from '@/lib/topCards/getTopCards';
import { prisma } from '@/lib/prisma';

// The cards to study next.
//
//   GET /api/top-cards?k=5   200  { cards: the top k cards, highest priority first, totalCount }
//                            400  if k is not a whole number from 1 to MAX_TOP_CARDS_COUNT

/**
 * Returns the `k` highest-priority cards (default DEFAULT_TOP_CARDS_COUNT), plus the total
 * number of cards so the page can show it without loading every card.
 *
 * The server reads the clock once here and passes that time down, so every step of the
 * ranking agrees on "now", and the client's clock is never trusted.
 */
export async function GET(request: NextRequest) {
  const kText = request.nextUrl.searchParams.get('k');

  let k = DEFAULT_TOP_CARDS_COUNT;
  if (kText !== null) {
    k = Number(kText);
    if (!Number.isInteger(k) || k < 1 || k > MAX_TOP_CARDS_COUNT) {
      return Response.json(
        { error: `k must be a whole number from 1 to ${MAX_TOP_CARDS_COUNT}.` },
        { status: 400 },
      );
    }
  }

  const nowMs = Date.now();
  const cards = await getTopCards(nowMs, k);
  const totalCount = await prisma.card.count();

  return Response.json({ cards: cards, totalCount: totalCount }, { status: 200 });
}
