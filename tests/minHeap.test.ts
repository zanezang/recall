import assert from 'node:assert/strict';
import { test } from 'node:test';

import { MinHeap } from '../src/lib/minHeap.ts';

/** Ascending order for numbers. */
function compareNumbers(a: number, b: number): number {
  return a - b;
}

/** `count` deterministic numbers from 0 to 100, with duplicates. */
function makeNumbers(count: number): number[] {
  const numbers: number[] = [];
  for (let i = 0; i < count; i++) {
    numbers.push((i * 7919) % 101);
  }
  return numbers;
}

/** Removes every item, which must come out in ascending order. */
function removeAll(heap: MinHeap<number>): number[] {
  const removed: number[] = [];
  while (heap.size() > 0) {
    removed.push(heap.removeRoot() as number);
  }
  return removed;
}

test('an empty heap has size 0 and returns undefined', () => {
  const heap = new MinHeap<number>(compareNumbers);
  assert.equal(heap.size(), 0);
  assert.equal(heap.peek(), undefined);
  assert.equal(heap.removeRoot(), undefined);
});

test('add then remove returns items in ascending order', () => {
  for (let count = 0; count <= 60; count++) {
    const numbers = makeNumbers(count);
    const heap = new MinHeap<number>(compareNumbers);
    for (const number of numbers) {
      heap.add(number);
    }
    assert.equal(heap.size(), count);
    assert.deepEqual(removeAll(heap), [...numbers].sort(compareNumbers));
  }
});

test('build heap from an array returns items in ascending order', () => {
  for (let count = 0; count <= 60; count++) {
    const numbers = makeNumbers(count);
    const heap = new MinHeap<number>(compareNumbers, numbers);
    assert.equal(heap.size(), count);
    assert.deepEqual(removeAll(heap), [...numbers].sort(compareNumbers));
  }
});

test('peek always returns the current smallest item', () => {
  const heap = new MinHeap<number>(compareNumbers);
  let smallest = Infinity;
  for (const number of makeNumbers(40)) {
    heap.add(number);
    smallest = Math.min(smallest, number);
    assert.equal(heap.peek(), smallest);
  }
});
