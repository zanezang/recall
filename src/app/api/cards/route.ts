import { isValidConfidence, MAX_CONFIDENCE, MIN_CONFIDENCE } from '@/lib/confidence';
import { DUE_THRESHOLD, findDueTime } from '@/lib/dueTime';
import { prisma } from '@/lib/prisma';

// Collection routes for study cards.
//
//   GET  /api/cards   200  every card
//   POST /api/cards   201  the created card   (400 if the input is invalid)

/** Fields a client may send when creating a card. Typed `unknown` until validated. */
type CreateCardBody = {
  question?: unknown;
  confidence?: unknown;
};

/** Returns every card. */
export async function GET() {
  const cards = await prisma.card.findMany();
  return Response.json(cards, { status: 200 });
}

/**
 * Creates a card from `{ question, confidence }`.
 *
 * The server assigns `id`, `createdAt`, `lastReviewedAt`, and `dueAt`. The created card is
 * returned so the client can use those values instead of guessing them.
 */
export async function POST(request: Request) {
  let body: CreateCardBody | null;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }

  const question = typeof body?.question === 'string' ? body.question.trim() : '';
  const confidence = body?.confidence;

  // The form checks these too, but the API can be called without the form, so it must
  // validate its own input.
  if (question === '') {
    return Response.json({ error: 'question must be a non-empty string.' }, { status: 400 });
  }
  if (!isValidConfidence(confidence)) {
    return Response.json(
      { error: `confidence must be a whole number from ${MIN_CONFIDENCE} to ${MAX_CONFIDENCE}.` },
      { status: 400 },
    );
  }

  // A new card counts as reviewed at creation, so one timestamp serves for both fields
  // and for computing when the card first becomes due.
  const now = new Date();
  const dueAt = findDueTime(
    { confidence, createdAt: now.getTime(), lastReviewedAt: now.getTime() },
    DUE_THRESHOLD,
  );

  const card = await prisma.card.create({
    data: { question, confidence, createdAt: now, lastReviewedAt: now, dueAt: new Date(dueAt) },
  });
  return Response.json(card, { status: 201 });
}
