/**
 * Parsing of raw text typed into the three fields.
 *
 * Every function takes the exact string from the input and returns either a
 * valid value in integer units (cents, basis points, people) or an error with
 * the exact user-facing message from docs/user-stories.md (S-5, S-6, S-7).
 *
 * No floating-point arithmetic is used: amounts are built from their digit
 * strings, so "0.1 + 0.2" style errors and Infinity/NaN cannot occur.
 */

export type ParseResult =
  | { ok: true; value: number }
  | { ok: false; empty: boolean; message: string };

export const MAX_BILL_CENTS = 100_000_000; // $1,000,000.00
export const MAX_TIP_BASIS_POINTS = 10_000; // 100.00 %
export const MAX_PEOPLE = 100;

export const MESSAGES = {
  billEmpty: 'Enter the bill amount.',
  billNotNumber: 'Enter the bill as a number, for example 84.50.',
  billNegative: "The bill amount can't be negative.",
  billZero: 'The bill amount must be more than 0.',
  billDecimals: 'The bill amount can have at most 2 decimal places.',
  billTooLarge: 'The bill amount must be 1,000,000.00 or less.',

  peopleEmpty: 'Enter the number of people.',
  peopleNotWhole: 'Enter the number of people as a whole number, for example 4.',
  peopleTooFew: 'There must be at least 1 person.',
  peopleTooMany: 'The number of people must be 100 or fewer.',

  tipEmpty: 'Enter a tip percentage.',
  tipNotNumber: 'Enter the tip as a number, for example 15.',
  tipNegative: "The tip can't be negative.",
  tipDecimals: 'The tip can have at most 2 decimal places.',
  tipTooLarge: 'The tip must be 100% or less.',
} as const;

const ok = (value: number): ParseResult => ({ ok: true, value });
const fail = (message: string, empty = false): ParseResult => ({ ok: false, empty, message });

/** Integer part: plain digits, or digits grouped with commas (1,250). Optional "." and fraction. */
const MONEY_SHAPE = /^(\d+|\d{1,3}(?:,\d{3})+)?(?:\.(\d*))?$/;
const PERCENT_SHAPE = /^(\d+)?(?:\.(\d*))?$/;

interface DecimalParts {
  intDigits: string; // digits only, leading zeros removed, "" means 0
  fracDigits: string; // as typed, may be longer than 2
}

function decimalParts(text: string, shape: RegExp): DecimalParts | null {
  const m = shape.exec(text);
  if (!m) return null;
  const intRaw = (m[1] ?? '').replace(/,/g, '');
  const fracRaw = m[2] ?? '';
  if (intRaw === '' && fracRaw === '') return null; // "", "." or "$"
  return { intDigits: intRaw.replace(/^0+/, ''), fracDigits: fracRaw };
}

/** Converts validated parts to hundredths (cents or basis points). Caller bounds intDigits length. */
function toHundredths(p: DecimalParts): number {
  const whole = p.intDigits === '' ? 0 : Number(p.intDigits);
  return whole * 100 + Number(p.fracDigits.padEnd(2, '0'));
}

/** Bill amount → cents. Accepts "84.50", "$84.50", " 84.50 ", "1,250.00", ".50", "12.". */
export function parseBill(raw: string): ParseResult {
  let text = raw.trim();
  if (text === '') return fail(MESSAGES.billEmpty, true);

  let negative = false;
  if (text.startsWith('-')) {
    negative = true;
    text = text.slice(1).trim();
  }
  if (text.startsWith('$')) text = text.slice(1).trim();
  if (!negative && text.startsWith('-')) {
    // "$-20"
    negative = true;
    text = text.slice(1).trim();
  }

  const parts = decimalParts(text, MONEY_SHAPE);
  if (!parts) return fail(MESSAGES.billNotNumber);
  if (negative) return fail(MESSAGES.billNegative);
  if (parts.fracDigits.length > 2) return fail(MESSAGES.billDecimals);
  // More than 7 integer digits is always above $1,000,000.00; checking length
  // first keeps 20-digit input away from Number precision limits.
  if (parts.intDigits.length > 7) return fail(MESSAGES.billTooLarge);

  const cents = toHundredths(parts);
  if (cents === 0) return fail(MESSAGES.billZero);
  if (cents > MAX_BILL_CENTS) return fail(MESSAGES.billTooLarge);
  return ok(cents);
}

/** Custom tip percentage → basis points (15 → 1500, 12.5 → 1250). Accepts a trailing "%". */
export function parseTip(raw: string): ParseResult {
  let text = raw.trim();
  if (text === '') return fail(MESSAGES.tipEmpty, true);

  if (text.endsWith('%')) text = text.slice(0, -1).trim();
  let negative = false;
  if (text.startsWith('-')) {
    negative = true;
    text = text.slice(1).trim();
  }

  const parts = decimalParts(text, PERCENT_SHAPE);
  if (!parts) return fail(MESSAGES.tipNotNumber);
  if (negative) return fail(MESSAGES.tipNegative);
  if (parts.fracDigits.length > 2) return fail(MESSAGES.tipDecimals);
  if (parts.intDigits.length > 3) return fail(MESSAGES.tipTooLarge);

  const basisPoints = toHundredths(parts);
  if (basisPoints > MAX_TIP_BASIS_POINTS) return fail(MESSAGES.tipTooLarge);
  return ok(basisPoints);
}

/** Number of people → whole number from 1 to 100. */
export function parsePeople(raw: string): ParseResult {
  const text = raw.trim();
  if (text === '') return fail(MESSAGES.peopleEmpty, true);

  if (/^-\s*\d+$/.test(text)) return fail(MESSAGES.peopleTooFew);
  if (!/^\d+$/.test(text)) return fail(MESSAGES.peopleNotWhole);

  const digits = text.replace(/^0+/, '');
  if (digits === '') return fail(MESSAGES.peopleTooFew);
  if (digits.length > 3) return fail(MESSAGES.peopleTooMany);

  const n = Number(digits);
  if (n > MAX_PEOPLE) return fail(MESSAGES.peopleTooMany);
  return ok(n);
}
