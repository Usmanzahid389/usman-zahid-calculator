/** Display formatting. All functions take integer cents / basis points. */

import type { ShareGroup, Split } from './split';

const groupDigits = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });

/** 123456 → "$1,234.56". */
export function formatMoney(cents: number): string {
  const dollars = Math.floor(cents / 100);
  const rest = String(cents % 100).padStart(2, '0');
  return `$${groupDigits.format(dollars)}.${rest}`;
}

/** 1500 → "15", 1250 → "12.5", 1225 → "12.25". */
export function formatPercent(basisPoints: number): string {
  const whole = Math.floor(basisPoints / 100);
  const frac = basisPoints % 100;
  if (frac === 0) return String(whole);
  return `${whole}.${String(frac).padStart(2, '0').replace(/0+$/, '')}`;
}

function groupPhrase(g: ShareGroup): string {
  return g.count === 1
    ? `1 person pays ${formatMoney(g.cents)}`
    : `${g.count} people pay ${formatMoney(g.cents)}`;
}

/** "Each person pays $30.00" / "1 person pays $90.00" / "1 person pays $33.34 and 2 people pay $33.33". */
export function shareSentence(split: Split): string {
  const [first, second] = split.groups;
  if (!second) {
    return split.people === 1 ? groupPhrase(first) : `Each person pays ${formatMoney(first.cents)}`;
  }
  return `${groupPhrase(first)} and ${groupPhrase(second)}`;
}

export function tooSmallMessage(totalCents: number, people: number): string {
  return (
    `The total of ${formatMoney(totalCents)} is too small to split between ${people} people. ` +
    'Each person must pay at least $0.01.'
  );
}

export interface BreakdownLine {
  label: string;
  value: string;
}

export function breakdownLines(split: Split): BreakdownLine[] {
  const sum = split.groups.reduce((acc, g) => acc + g.count * g.cents, 0);
  return [
    { label: 'Bill', value: formatMoney(split.billCents) },
    { label: `Tip (${formatPercent(split.tipBasisPoints)}%)`, value: formatMoney(split.tipCents) },
    { label: 'Total', value: formatMoney(split.totalCents) },
    { label: 'Shares add up to', value: formatMoney(sum) },
  ];
}
