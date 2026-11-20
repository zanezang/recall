import { Prisma } from '@prisma/client';

import { isValidConfidence, MAX_CONFIDENCE, MIN_CONFIDENCE } from '@/lib/confidence';
import { computeLevelTimes } from '@/lib/priority/levels';
import { prisma } from '@/lib/prisma';

// Routes for a single study card.
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

/** Parses the `:id` URL segment. Returns null unless it is a positive integer. */
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
  const params = await context.params;
  const cardId = parseCardId(params.id);
  if (cardId === null) {
    return Response.json({ error: 'Card id must be a positive integer.' }, { status: 400 });
  }

  // Malformed JSON is treated as a missing field and rejected by the check below.
  const body: ReviewCardBody | null = await request.json().catch(() => null);
  const confidence = body?.confidence;
  if (!isValidConfidence(confidence)) {
    return Response.json(
      { error: `confidence must be a whole number from ${MIN_CONFIDENCE} to ${MAX_CONFIDENCE}.` },
      { status: 400 },
    );
  }

  // The level cross times depend on when the card was created, so that is read first.
  const existing = await prisma.card.findUnique({
    where: { id: cardId },
    select: { createdAt: true },
  });
  if (existing === null) {
    return Response.json({ error: 'Card not found.' }, { status: 404 });
  }

  const now = new Date();
  const levelTimes = computeLevelTimes({
    confidence: confidence,
    createdAt: existing.createdAt.getTime(),
    lastReviewedAt: now.getTime(),
  });

  try {
    // A nested update: the card's old level rows are deleted and the new ones created in
    // the same transaction as the card update, so the two can never disagree.
    const card = await prisma.card.update({
      where: { id: cardId },
      data: {
        confidence: confidence,
        lastReviewedAt: now,
        levelTimes: { deleteMany: {}, create: levelTimes },
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

/** Deletes a card. */
export async function DELETE(_request: Request, { params }: CardRouteContext) {
  const { id } = await params;
  const cardId = parseCardId(id);
  if (cardId === null) {
    return Response.json({ error: 'Card id must be a positive integer.' }, { status: 400 });
  }

  try {
    await prisma.card.delete({ where: { id: cardId } });
  } catch (error) {
    if (isRecordNotFound(error)) {
      return Response.json({ error: 'Card not found.' }, { status: 404 });
    }
    throw error;
  }

  return new Response(null, { status: 204 });
}
