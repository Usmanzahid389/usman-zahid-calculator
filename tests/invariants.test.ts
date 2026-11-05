/**
 * S-3 property: for any valid bill, tip and number of people, the shares add up to
 * exactly the total and no two shares differ by more than one cent.
 * Uses a seeded generator so a failure is reproducible.
 */
import { describe, expect, it } from 'vitest';
import { MAX_BILL_CENTS, MAX_PEOPLE, MAX_TIP_BASIS_POINTS } from '../src/lib/parse';
import { splitBill, tipCents } from '../src/lib/split';
import { formatMoney } from '../src/lib/format';

function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe('S-3 invariants over random inputs', () => {
  it('shares sum to the total and differ by at most 1 cent (20,000 cases, including limits)', () => {
    const rand = mulberry32(20261105);
    const int = (min: number, max: number) => min + Math.floor(rand() * (max - min + 1));
    const cases: Array<[number, number, number]> = [
      [1, 0, 1],
      [MAX_BILL_CENTS, MAX_TIP_BASIS_POINTS, MAX_PEOPLE],
      [MAX_BILL_CENTS, MAX_TIP_BASIS_POINTS, 3],
      [100, 0, 100],
    ];
    for (let i = 0; i < 20_000; i++) {
      // Mix tiny, typical and huge bills.
      const bill = i % 3 === 0 ? int(1, 500) : i % 3 === 1 ? int(1, 100_000) : int(1, MAX_BILL_CENTS);
      cases.push([bill, int(0, MAX_TIP_BASIS_POINTS), int(1, MAX_PEOPLE)]);
    }

    for (const [bill, tip, people] of cases) {
      const r = splitBill(bill, tip, people);
      const total = bill + tipCents(bill, tip);
      if (!r.ok) {
        expect(total).toBeLessThan(people);
        continue;
      }
      const { groups, totalCents } = r.split;
      expect(totalCents).toBe(total);
      expect(groups.reduce((n, g) => n + g.count, 0)).toBe(people);
      expect(groups.reduce((s, g) => s + g.count * g.cents, 0)).toBe(totalCents);
      const amounts = groups.map((g) => g.cents);
      expect(Math.max(...amounts) - Math.min(...amounts)).toBeLessThanOrEqual(1);
      expect(Math.min(...amounts)).toBeGreaterThanOrEqual(1);
      expect(Number.isInteger(totalCents)).toBe(true);
    }
  });

  it('tip rounding is half-up on exact cents', () => {
    expect(tipCents(3333, 1500)).toBe(500); // 499.95 → 500
    expect(tipCents(1, 5000)).toBe(1); // 0.5 → 1
    expect(tipCents(1, 4999)).toBe(0); // 0.4999 → 0
    expect(tipCents(MAX_BILL_CENTS, MAX_TIP_BASIS_POINTS)).toBe(MAX_BILL_CENTS);
  });

  it('money formatting never shows floats, NaN or exponents', () => {
    expect(formatMoney(0)).toBe('$0.00');
    expect(formatMoney(5)).toBe('$0.05');
    expect(formatMoney(123456)).toBe('$1,234.56');
    expect(formatMoney(200_000_000)).toBe('$2,000,000.00');
  });
});
