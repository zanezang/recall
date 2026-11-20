import { Prisma } from '@prisma/client';

import { isValidConfidence, MAX_CONFIDENCE, MIN_CONFIDENCE } from '@/lib/confidence';
import { computeLevelTimes } from '@/lib/priority/thresholdLevels';
import { prisma } from '@/lib/prisma';

// Routes for a single study card. The [id] folder name makes Next.js pass the URL segment
// as `params.id`, so /api/cards/7 gives id "7".
//
//   PATCH  /api/cards/:id   200  the reviewed card   (400 invalid input, 404 no such card)
//   DELETE /api/cards/:id   204  no body             (400 invalid id,    404 no such card)

/** The second argument Next.js passes to these handlers. In Next.js 16, `params` is a Promise. */
type CardRouteContext = {
  params: Promise<{ id: string }>;
};

/** Fields a client may send when reviewing a card. Typed `unknown` until validated. */
type ReviewCardBody = {
  confidence?: unknown;
};

/** Parses the `:id` URL segment, which is always a string. Returns null unless it is a positive integer. */
function parseCardId(rawId: string): number | null {
  const id = Number(rawId);
  if (Number.isInteger(id) && id > 0) {
    return id;
  }
  return null;
}

/** True for Prisma's "record not found" error (P2025), which update and delete throw. */
function isRecordNotFound(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025';
}

/**
 * Records a review: saves the card's new confidence, marks it as reviewed now, and
 * recomputes when it will cross each priority level.
 *
 * The server sets `lastReviewedAt` itself so every review is timed by one trusted clock,
 * not by whatever clock the client happens to have.
 */
export async function PATCH(request: Request, context: CardRouteContext) {
  // Input 1: the card id, from the URL (/api/cards/7).
  const params = await context.params;
  const cardId = parseCardId(params.id);
  if (cardId === null) {
    return Response.json({ error: 'Card id must be a positive integer.' }, { status: 400 });
  }

  // Input 2: the new confidence, from the JSON body ({ "confidence": 3 }).
  // Malformed JSON becomes null and is rejected by the check below.
  const body: ReviewCardBody | null = await request.json().catch(() => null);
  const confidence = body?.confidence;
  if (!isValidConfidence(confidence)) {
    return Response.json(
      { error: `confidence must be a whole number from ${MIN_CONFIDENCE} to ${MAX_CONFIDENCE}.` },
      { status: 400 },
    );
  }

  // Read the card's creation time: the priority formula depends on the card's age.
  const oldCard = await prisma.card.findUnique({
    where: { id: cardId },
    select: { createdAt: true },
  });
  if (oldCard === null) {
    return Response.json({ error: 'Card not found.' }, { status: 404 });
  }

  // Compute the new cross time for every level. Pure math, no database.
  const now = new Date();
  const levelTimes = computeLevelTimes({
    confidence: confidence,
    createdAt: oldCard.createdAt.getTime(),
    lastReviewedAt: now.getTime(),
  });

  try {
    // One transaction updates both tables, so they can never disagree:
    //   UPDATE Card SET confidence, lastReviewedAt WHERE id = cardId
    //   DELETE FROM CardLevelTime WHERE cardId = cardId     (finds the rows by the (cardId, level) key)
    //   INSERT the new level rows, with cardId filled in by Prisma
    const card = await prisma.card.update({
      where: { id: cardId },
      data: {
        confidence: confidence, // Card table
        lastReviewedAt: now, // Card table
        levelTimes: {
          // CardLevelTime table, reached through the relation field
          deleteMany: {}, // every row of this card ({} adds no extra filter)
          create: levelTimes, // the new rows, one per level
        },
      },
    });
    return Response.json(card);
  } catch (error) {
    // The card can still be deleted between the read above and this update.
    if (isRecordNotFound(error)) {
      return Response.json({ error: 'Card not found.' }, { status: 404 });
    }
    // Anything else is unexpected. Rethrow so Next.js responds with a 500.
    throw error;
  }
}

/**
 * Deletes a card. Its level rows are deleted by the database itself, through the
 * `onDelete: Cascade` rule on CardLevelTime's foreign key.
 */
export async function DELETE(_request: Request, context: CardRouteContext) {
  // The card id, from the URL (/api/cards/7).
  const params = await context.params;
  const cardId = parseCardId(params.id);
  if (cardId === null) {
    return Response.json({ error: 'Card id must be a positive integer.' }, { status: 400 });
  }

  try {
    // DELETE FROM Card WHERE id = cardId; the cascade removes its CardLevelTime rows.
    await prisma.card.delete({ where: { id: cardId } });
  } catch (error) {
    if (isRecordNotFound(error)) {
      return Response.json({ error: 'Card not found.' }, { status: 404 });
    }
    throw error;
  }

  // 204 No Content: success, with nothing to send back.
  return new Response(null, { status: 204 });
}
