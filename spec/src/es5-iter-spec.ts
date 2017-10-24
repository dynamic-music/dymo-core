import {
  find,
  reduce,
  forEach
} from '../../src/util/es5-iter';

const a = new Map<string, number>();
a.set('one', 1);
a.set('two', 2);
a.set('three', 3);

describe('find', () => {
  it('locates first occurence of value in iterator', () => {
    expect(find(a.keys(), k => k === 'two')).toBe('two');
  });

  it('returns undefined when no occurance found', () => {
    expect(find(a.values(), v => v > 3)).toBeUndefined();
  });

  it('passes the current numerical index to the predicate fn', () => {
    const values: number[] = [];
    find(a.keys(), (n, i) => {
      values.push(i);
      return false;
    });
    expect(values.length).toBe(3);
    expect(values).toEqual([0, 1, 2]);
  });
});

describe('reduce', () => {
  it('folds to a single value', () => {
    expect(reduce(a.values(), (acc, x) => acc + x, 0)).toBe(6);
    expect(reduce(a.keys(), (acc, x) => acc + x, '')).toBe('onetwothree');
  });
});

describe('forEach', () => {
  it('calls the fn with each item', () => {
    const expected = new Array<number>(a.size);
    forEach(a.values(), (x, i) => { expected[i] = x; });
    expect(expected).toEqual([1, 2, 3]);
  });
});