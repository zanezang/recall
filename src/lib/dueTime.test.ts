import assert from 'node:assert/strict';
import { test } from 'node:test';

import { findDueTime, priorityAt, type CardTiming } from './dueTime.ts';

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const THRESHOLD = 1000;

/** A fixed reference time so the tests do not depend on the clock. */
const START = Date.UTC(2026, 0, 1);

/** Cards covering every confidence level, both newly created and long-lived. */
const CARDS: CardTiming[] = [];
for (let confidence = 1; confidence <= 5; confidence++) {
  // Created and reviewed at the same moment.
  CARDS.push({ confidence: confidence, createdAt: START, lastReviewedAt: START });
  // Created 90 days before its latest review.
  CARDS.push({ confidence: confidence, createdAt: START - 90 * DAY_MS, lastReviewedAt: START });
}

test('priority is 0 at the moment of review', () => {
  for (const card of CARDS) {
    assert.equal(priorityAt(card, card.lastReviewedAt), 0);
  }
});

test('the due time is the first millisecond at or above the threshold', () => {
  for (const card of CARDS) {
    const dueAt = findDueTime(card, THRESHOLD);
    assert.ok(priorityAt(card, dueAt) >= THRESHOLD);
    assert.ok(priorityAt(card, dueAt - 1) < THRESHOLD);
  }
});

test('the due time is always after the last review', () => {
  for (const card of CARDS) {
    assert.ok(findDueTime(card, THRESHOLD) > card.lastReviewedAt);
  }
});

test('a more confident card is due later', () => {
  const unsure = { confidence: 1, createdAt: START, lastReviewedAt: START };
  const confident = { confidence: 5, createdAt: START, lastReviewedAt: START };
  assert.ok(findDueTime(confident, THRESHOLD) > findDueTime(unsure, THRESHOLD));
});

test('a higher threshold is reached later', () => {
  for (const card of CARDS) {
    assert.ok(findDueTime(card, 2 * THRESHOLD) > findDueTime(card, THRESHOLD));
  }
});

test('a new confidence-1 card is due about 2.5 hours after review', () => {
  const card = { confidence: 1, createdAt: START, lastReviewedAt: START };
  const hoursUntilDue = (findDueTime(card, THRESHOLD) - START) / HOUR_MS;
  assert.ok(hoursUntilDue > 2.4 && hoursUntilDue < 2.6);
});

test('a non-positive threshold is rejected', () => {
  const card = { confidence: 3, createdAt: START, lastReviewedAt: START };
  assert.throws(() => findDueTime(card, 0), RangeError);
  assert.throws(() => findDueTime(card, -5), RangeError);
});

test('an infinite or non-numeric threshold is rejected', () => {
  const card = { confidence: 3, createdAt: START, lastReviewedAt: START };
  assert.throws(() => findDueTime(card, Infinity), RangeError);
  assert.throws(() => findDueTime(card, NaN), RangeError);
});
