import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, test } from 'node:test';

import { computeLevelTimes } from '../../src/lib/priority/levels.ts';
import { priorityAt } from '../../src/lib/priority/priorityMath.ts';
import type { Card } from '../../src/lib/types.ts';

/**
 * Checks the whole top-cards pipeline against brute force: on a throwaway database of
 * random cards, getTopCards must return exactly the cards that scoring and sorting every
 * card would return.
 */

const CARD_COUNT = 300;
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

/** Every card in the test database, as the brute-force ranking sees it. */
const allCards: Card[] = [];

/** When the random cards were generated. Every card was last reviewed before this. */
const START_MS = Date.now();

/** A temporary folder holding the test database, deleted after the tests. */
const tempFolder = mkdtempSync(join(tmpdir(), 'recall-top-cards-'));

/**
 * A seeded random number generator (mulberry32), so a failure can be reproduced by
 * running the test again. Returns numbers in [0, 1).
 */
function createRandom(seed: number): () => number {
  let state = seed;
  return function nextRandom() {
    state = (state + 0x6d2b79f5) | 0;
    let mixed = Math.imul(state ^ (state >>> 15), 1 | state);
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

/** The ids of the k highest-priority cards at nowMs, found by scoring every card. */
function bruteForceTopIds(nowMs: number, k: number): number[] {
  const scored: { id: number; priority: number }[] = [];
  for (const card of allCards) {
    scored.push({ id: card.id, priority: priorityAt(card, nowMs) });
  }
  scored.sort((a, b) => b.priority - a.priority);

  const topIds: number[] = [];
  for (let index = 0; index < k && index < scored.length; index++) {
    topIds.push(scored[index].id);
  }
  return topIds;
}

// The modules that use the database are imported only after DATABASE_URL points at the
// test database, because the Prisma client reads it when it is first loaded.
let getTopCards: (nowMs: number, k: number) => Promise<Card[]>;
let disconnect: () => Promise<void>;

before(async () => {
  const databaseUrl = `file:${join(tempFolder, 'test.db')}`;
  process.env.DATABASE_URL = databaseUrl;
  execSync('npx prisma migrate deploy', {
    env: { ...process.env, DATABASE_URL: databaseUrl },
    stdio: 'ignore',
  });

  const prismaModule = await import('../../src/lib/prisma.ts');
  const topCardsModule = await import('../../src/lib/topCards/getTopCards.ts');
  getTopCards = topCardsModule.getTopCards;
  disconnect = () => prismaModule.prisma.$disconnect();

  // Random cards: created up to 90 days ago, last reviewed some time after creation,
  // with every confidence value represented.
  const random = createRandom(1332);
  for (let index = 0; index < CARD_COUNT; index++) {
    const createdAt = START_MS - Math.floor(random() * 90 * DAY_MS);
    const lastReviewedAt = createdAt + Math.floor(random() * (START_MS - createdAt));
    const confidence = 1 + Math.floor(random() * 5);

    const saved = await prismaModule.prisma.card.create({
      data: {
        question: `Random card ${index}`,
        confidence: confidence,
        createdAt: new Date(createdAt),
        lastReviewedAt: new Date(lastReviewedAt),
        levelTimes: {
          create: computeLevelTimes({ confidence, createdAt, lastReviewedAt }),
        },
      },
    });
    allCards.push({
      id: saved.id,
      question: saved.question,
      confidence: confidence,
      createdAt: createdAt,
      lastReviewedAt: lastReviewedAt,
    });
  }
});

after(async () => {
  await disconnect();
  rmSync(tempFolder, { recursive: true, force: true });
});

test('getTopCards matches brute force at many times and sizes', async () => {
  // From right now (few cards above high levels) to a year later (most cards above all).
  const offsets = [0, HOUR_MS, DAY_MS, 7 * DAY_MS, 30 * DAY_MS, 365 * DAY_MS];
  // Includes k larger than the number of cards, which takes the every-card fallback.
  const sizes = [1, 2, 5, 20, 100, CARD_COUNT, CARD_COUNT + 50];

  for (const offset of offsets) {
    const nowMs = START_MS + offset;
    for (const k of sizes) {
      const topCards = await getTopCards(nowMs, k);
      const topIds: number[] = [];
      for (const card of topCards) {
        topIds.push(card.id);
      }
      assert.deepEqual(topIds, bruteForceTopIds(nowMs, k), `offset ${offset} ms, k = ${k}`);
    }
  }
});
