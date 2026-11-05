/**
 * Turns the current form state into what the screen should show.
 * Pure: no DOM access, so S-5..S-8 behaviour is unit-testable.
 */

import { parseBill, parsePeople, parseTip, type ParseResult } from './parse';
import { breakdownLines, shareSentence, tooSmallMessage, type BreakdownLine } from './format';
import { splitBill } from './split';

export type TipChoice = 'none' | '10' | '15' | '20' | 'custom';

export const TIP_PRESET_BASIS_POINTS: Record<Exclude<TipChoice, 'custom'>, number> = {
  none: 0,
  '10': 1000,
  '15': 1500,
  '20': 2000,
};

export interface FormInputs {
  bill: string;
  people: string;
  tipChoice: TipChoice;
  customTip: string;
}

/** A field is "touched" once the user has typed in it since the start or the last reset. */
export interface Touched {
  bill: boolean;
  people: boolean;
  customTip: boolean;
}

export const DEFAULT_INPUTS: FormInputs = { bill: '', people: '2', tipChoice: 'none', customTip: '' };
export const UNTOUCHED: Touched = { bill: false, people: false, customTip: false };

export const RESULT_MESSAGES = {
  promptBill: 'Enter the bill amount to see the split.',
  promptPeople: 'Enter the number of people to see the split.',
  promptTip: 'Enter a tip percentage to see the split.',
  fixFields: 'Fix the highlighted fields to see the split.',
} as const;

export interface FieldErrors {
  bill?: string;
  people?: string;
  customTip?: string;
}

export type ResultView =
  | { kind: 'prompt'; message: string }
  | { kind: 'invalid'; message: string }
  | { kind: 'too-small'; message: string }
  | { kind: 'split'; sentence: string; breakdown: BreakdownLine[] };

export interface View {
  errors: FieldErrors;
  result: ResultView;
}

/** An empty, untouched field shows no error; anything else invalid does. */
function visibleError(r: ParseResult, touched: boolean): string | undefined {
  if (r.ok) return undefined;
  if (r.empty && !touched) return undefined;
  return r.message;
}

export function evaluate(inputs: FormInputs, touched: Touched): View {
  const bill = parseBill(inputs.bill);
  const people = parsePeople(inputs.people);
  const tip: ParseResult =
    inputs.tipChoice === 'custom'
      ? parseTip(inputs.customTip)
      : { ok: true, value: TIP_PRESET_BASIS_POINTS[inputs.tipChoice] };

  const errors: FieldErrors = {};
  const billError = visibleError(bill, touched.bill);
  const peopleError = visibleError(people, touched.people);
  const tipError = inputs.tipChoice === 'custom' ? visibleError(tip, touched.customTip) : undefined;
  if (billError) errors.bill = billError;
  if (peopleError) errors.people = peopleError;
  if (tipError) errors.customTip = tipError;

  if (billError || peopleError || tipError) {
    return { errors, result: { kind: 'invalid', message: RESULT_MESSAGES.fixFields } };
  }
  // Remaining failures can only be untouched empty fields.
  if (!bill.ok) return { errors, result: { kind: 'prompt', message: RESULT_MESSAGES.promptBill } };
  if (!people.ok) return { errors, result: { kind: 'prompt', message: RESULT_MESSAGES.promptPeople } };
  if (!tip.ok) return { errors, result: { kind: 'prompt', message: RESULT_MESSAGES.promptTip } };

  const r = splitBill(bill.value, tip.value, people.value);
  if (!r.ok) {
    return { errors, result: { kind: 'too-small', message: tooSmallMessage(r.totalCents, r.people) } };
  }
  return {
    errors,
    result: { kind: 'split', sentence: shareSentence(r.split), breakdown: breakdownLines(r.split) },
  };
}
