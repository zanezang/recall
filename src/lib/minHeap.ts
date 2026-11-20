/**
 * A binary min-heap backed by an array, with the root at index 1 (index 0 is unused).
 *
 * For the node at index i: its parent is at floor(i / 2), and its children are at 2i and
 * 2i + 1. The smallest item by `compare` is always at the root.
 */
export class MinHeap<T> {
  /** The tree in level order. Index 0 is an empty placeholder so the index math above works. */
  private backingArray: T[];

  /** Orders two items: negative if `a` is smaller, positive if `b` is smaller, 0 if tied. */
  private compare: (a: T, b: T) => number;

  /**
   * Creates a heap ordered by `compare`. When `initialItems` is given, the heap is built from
   * them in O(n) with build heap, instead of adding them one at a time in O(n log n).
   */
  constructor(compare: (a: T, b: T) => number, initialItems: T[] = []) {
    this.compare = compare;
    this.backingArray = new Array<T>(1);
    for (const item of initialItems) {
      this.backingArray.push(item);
    }
    this.buildHeap();
  }

  /** The number of items in the heap. */
  size(): number {
    return this.backingArray.length - 1;
  }

  /** Returns the smallest item without removing it, or undefined when the heap is empty. */
  peek(): T | undefined {
    if (this.size() === 0) {
      return undefined;
    }
    return this.backingArray[1];
  }

  /** Adds an item in O(log n): place it at the next open spot, then up-heap it. */
  add(item: T): void {
    this.backingArray.push(item);
    this.upHeap(this.size());
  }

  /**
   * Removes and returns the smallest item in O(log n), or undefined when the heap is empty.
   * The last item moves to the root to keep the tree complete, then is down-heaped.
   */
  removeRoot(): T | undefined {
    if (this.size() === 0) {
      return undefined;
    }
    this.swap(1, this.size());
    const smallest = this.backingArray.pop();
    this.downHeap(1);
    return smallest;
  }

  /**
   * Restores the heap order over the whole array in O(n). Leaves are already valid heaps,
   * so it down-heaps each internal node, from the last one (floor(size / 2)) up to the root.
   */
  private buildHeap(): void {
    for (let index = Math.floor(this.size() / 2); index >= 1; index--) {
      this.downHeap(index);
    }
  }

  /** Moves the item at `index` up, swapping with its parent while it is smaller than the parent. */
  private upHeap(index: number): void {
    let current = index;
    while (current > 1) {
      const parent = Math.floor(current / 2);
      if (this.compare(this.backingArray[current], this.backingArray[parent]) >= 0) {
        return;
      }
      this.swap(current, parent);
      current = parent;
    }
  }

  /**
   * Moves the item at `index` down, swapping with its smaller child while that child is
   * smaller than it.
   */
  private downHeap(index: number): void {
    let current = index;
    while (2 * current <= this.size()) {
      const left = 2 * current;
      const right = left + 1;

      let smallerChild = left;
      if (right <= this.size() && this.compare(this.backingArray[right], this.backingArray[left]) < 0) {
        smallerChild = right;
      }

      if (this.compare(this.backingArray[smallerChild], this.backingArray[current]) >= 0) {
        return;
      }
      this.swap(current, smallerChild);
      current = smallerChild;
    }
  }

  /** Swaps the items at indexes `i` and `j`. */
  private swap(i: number, j: number): void {
    const temp = this.backingArray[i];
    this.backingArray[i] = this.backingArray[j];
    this.backingArray[j] = temp;
  }
}
