/**
 * The split itself, in integer cents.
 *
 * Invariants (S-3, and the "must never" rules in docs/app-roles.md):
 *  - the shares add up to exactly the total (the Bill Payer is never short);
 *  - no share differs from another by more than 1 cent (no Group Member is overcharged).
 */

export interface ShareGroup {
  count: number; // how many people pay this amount
  cents: number; // the amount each of them pays
}

export interface Split {
  billCents: number;
  tipBasisPoints: number;
  tipCents: number;
  totalCents: number;
  people: number;
  /** Largest share first. One group if the total divides evenly, otherwise two. */
  groups: ShareGroup[];
}

export type SplitResult = { ok: true; split: Split } | { ok: false; totalCents: number; people: number };

/** Tip in cents, rounded to the nearest cent with half a cent rounded up. */
export function tipCents(billCents: number, tipBasisPoints: number): number {
  // bill (≤ 1e8) × basis points (≤ 1e4) ≤ 1e12, well inside Number's exact-integer range.
  return Math.floor((billCents * tipBasisPoints + 5_000) / 10_000);
}

export function splitBill(billCents: number, tipBasisPoints: number, people: number): SplitResult {
  const tip = tipCents(billCents, tipBasisPoints);
  const total = billCents + tip;
  if (total < people) return { ok: false, totalCents: total, people };

  const base = Math.floor(total / people);
  const extra = total % people; // this many people pay one more cent
  const groups: ShareGroup[] = [];
  if (extra > 0) groups.push({ count: extra, cents: base + 1 });
  groups.push({ count: people - extra, cents: base });

  return {
    ok: true,
    split: { billCents, tipBasisPoints, tipCents: tip, totalCents: total, people, groups },
  };
}
