import { isValidConfidence, MAX_CONFIDENCE, MIN_CONFIDENCE } from '@/lib/confidence';
import { computeLevelTimes } from '@/lib/priority/thresholdLevels';
import { prisma } from '@/lib/prisma';

// Routes for the collection of study cards. Creating a card belongs here, not under
// /api/cards/:id, because a new card has no id until the database assigns one.
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
  // SELECT * FROM Card
  const cards = await prisma.card.findMany();
  return Response.json(cards, { status: 200 });
}

/**
 * Creates a card from `{ question, confidence }`.
 *
 * The server assigns `id`, `createdAt`, and `lastReviewedAt`, and stores when the card will
 * cross each priority level. The created card is returned so the client can use those
 * values instead of guessing them.
 */
export async function POST(request: Request) {
  // Input: the JSON body ({ "question": "...", "confidence": 3 }).
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

  // A new card counts as reviewed at creation, so one timestamp serves for both fields.
  // Then compute its cross time for every level. Pure math, no database.
  const now = new Date();
  const levelTimes = computeLevelTimes({
    confidence: confidence,
    createdAt: now.getTime(),
    lastReviewedAt: now.getTime(),
  });

  // One transaction writes both tables, so a card never exists without its level rows:
  //   INSERT INTO Card (question, confidence, createdAt, lastReviewedAt)   → id assigned
  //   INSERT the level rows, with cardId filled in by Prisma from that new id
  const card = await prisma.card.create({
    data: {
      question: question, // Card table
      confidence: confidence, // Card table
      createdAt: now, // Card table
      lastReviewedAt: now, // Card table
      levelTimes: { create: levelTimes }, // CardLevelTime table, through the relation field
    },
  });

  // 201 Created: success, and the response holds the new card.
  return Response.json(card, { status: 201 });
}
