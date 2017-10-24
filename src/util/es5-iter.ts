// these are pretty naive, they all assume these IterableIterators are finite (not generators)

export function find<T>(
  arr: IterableIterator<T>,
  predicate: (value: T, index: number) => boolean
): T | undefined {
  let current: IteratorResult<T>;
  let count = 0;
  while((current = arr.next()).done !== true) {
    if (predicate(current.value, count++)) {
      return current.value;
    }
  }
  return undefined;
}

export function forEach<T>(
  arr: IterableIterator<T>,
  fn: (value: T, index: number) => void
): void {
  let current: IteratorResult<T>;
  let count = 0;
  while((current = arr.next()).done !== true) {
    fn(current.value, count++);
  }
}

export function reduce<T, U>(
  arr: IterableIterator<T>,
  fn: (previousValue: U, currentValue: T, currentIndex: number) => U,
  initialValue: U
): U {
  let current: IteratorResult<T>;
  let count = 0;
  let accumlator: U = initialValue;
  while((current = arr.next()).done !== true) {
    accumlator = fn(accumlator, current.value, count);
  }
  return accumlator;
}