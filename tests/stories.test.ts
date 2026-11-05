/**
 * Acceptance criteria from docs/user-stories.md, one test per criterion where practical.
 * Test names start with the story ID so failures trace straight back to the spec.
 */
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_INPUTS,
  RESULT_MESSAGES,
  UNTOUCHED,
  evaluate,
  type FormInputs,
  type TipChoice,
  type View,
} from '../src/lib/evaluate';

const ALL_TOUCHED = { bill: true, people: true, customTip: true };

function run(bill: string, people: string, tipChoice: TipChoice = 'none', customTip = ''): View {
  return evaluate({ bill, people, tipChoice, customTip }, ALL_TOUCHED);
}

function sentence(v: View): string {
  if (v.result.kind !== 'split') throw new Error(`Expected a split, got ${v.result.kind}: ${JSON.stringify(v.result)}`);
  return v.result.sentence;
}

function lines(v: View): string[] {
  if (v.result.kind !== 'split') throw new Error(`Expected a split, got ${v.result.kind}`);
  return v.result.breakdown.map((l) => `${l.label} ${l.value}`);
}

function expectInvalid(v: View): void {
  expect(v.result).toEqual({ kind: 'invalid', message: RESULT_MESSAGES.fixFields });
}

describe('Shared rules', () => {
  it('starting state: empty bill, no tip, 2 people, prompt shown, no errors', () => {
    expect(DEFAULT_INPUTS).toEqual({ bill: '', people: '2', tipChoice: 'none', customTip: '' });
    const v = evaluate(DEFAULT_INPUTS, UNTOUCHED);
    expect(v.errors).toEqual({});
    expect(v.result).toEqual({ kind: 'prompt', message: 'Enter the bill amount to see the split.' });
  });
});

describe('S-1 Split a bill evenly', () => {
  it.each([
    ['90', '3', 'Each person pays $30.00'],
    ['84.50', '2', 'Each person pays $42.25'],
    ['90', '1', '1 person pays $90.00'],
    ['$84.50', '2', 'Each person pays $42.25'],
    [' 84.50 ', '2', 'Each person pays $42.25'],
    ['1,250.00', '2', 'Each person pays $625.00'],
    ['.50', '2', 'Each person pays $0.25'],
    ['12.', '2', 'Each person pays $6.00'],
    ['1', '100', 'Each person pays $0.01'],
    ['1000000', '2', 'Each person pays $500,000.00'],
  ])('bill %j, people %j → %s', (bill, people, expected) => {
    expect(sentence(run(bill, people))).toBe(expected);
  });
});

describe('S-2 Add a tip as a percentage', () => {
  it('bill 100, 2 people, 15% → $57.50 each', () => {
    expect(sentence(run('100', '2', '15'))).toBe('Each person pays $57.50');
  });
  it('switching 15% → 20% updates the result', () => {
    expect(sentence(run('100', '2', '20'))).toBe('Each person pays $60.00');
  });
  it('bill 33.33 at 15% rounds the tip half up to $5.00', () => {
    const v = run('33.33', '1', '15');
    expect(sentence(v)).toBe('1 person pays $38.33');
    expect(lines(v)).toContain('Tip (15%) $5.00');
  });
  it.each([
    ['80', '12.5', '1 person pays $90.00'],
    ['50', '100', '1 person pays $100.00'],
    ['50', '0', '1 person pays $50.00'],
  ])('custom: bill %j, tip %j%% → %s', (bill, tip, expected) => {
    expect(sentence(run(bill, '1', 'custom', tip))).toBe(expected);
  });
  it('Custom selected but untouched: no error, tip prompt shown', () => {
    const v = evaluate(
      { bill: '100', people: '2', tipChoice: 'custom', customTip: '' },
      { bill: true, people: false, customTip: false },
    );
    expect(v.errors).toEqual({});
    expect(v.result).toEqual({ kind: 'prompt', message: 'Enter a tip percentage to see the split.' });
  });
  it('a custom value is ignored once a preset is selected', () => {
    expect(sentence(run('100', '1', '10', '12.5'))).toBe('1 person pays $110.00');
  });
});

describe('S-3 Shares always add up to the total', () => {
  it('100 split 3 ways → $33.34 + 2 × $33.33 = $100.00', () => {
    const v = run('100', '3');
    expect(sentence(v)).toBe('1 person pays $33.34 and 2 people pay $33.33');
    expect(lines(v)).toContain('Shares add up to $100.00');
  });
  it('100 split 6 ways', () => {
    const v = run('100', '6');
    expect(sentence(v)).toBe('4 people pay $16.67 and 2 people pay $16.66');
    expect(lines(v)).toContain('Shares add up to $100.00');
  });
  it('10 with 15% tip split 3 ways', () => {
    const v = run('10', '3', '15');
    expect(sentence(v)).toBe('1 person pays $3.84 and 2 people pay $3.83');
    expect(lines(v)).toContain('Shares add up to $11.50');
  });
  it('1,000,000 with 100% tip split 3 ways', () => {
    const v = run('1000000', '3', 'custom', '100');
    expect(sentence(v)).toBe('2 people pay $666,666.67 and 1 person pays $666,666.66');
    expect(lines(v)).toContain('Shares add up to $2,000,000.00');
  });
  it('0.03 split 3 ways → $0.01 each', () => {
    expect(sentence(run('0.03', '3'))).toBe('Each person pays $0.01');
  });
  it('0.02 split 3 ways is too small', () => {
    expect(run('0.02', '3').result).toEqual({
      kind: 'too-small',
      message: 'The total of $0.02 is too small to split between 3 people. Each person must pay at least $0.01.',
    });
  });
});

describe('S-4 See how the amount was reached', () => {
  it('bill 100, 15%, 2 people → full breakdown', () => {
    expect(lines(run('100', '2', '15'))).toEqual([
      'Bill $100.00',
      'Tip (15%) $15.00',
      'Total $115.00',
      'Shares add up to $115.00',
    ]);
  });
  it('custom 12.5% is shown with its decimal', () => {
    expect(lines(run('80', '1', 'custom', '12.5'))).toContain('Tip (12.5%) $10.00');
  });
  it('no tip shows Tip (0%) $0.00', () => {
    const l = lines(run('90', '3'));
    expect(l).toContain('Tip (0%) $0.00');
    expect(l).toContain('Total $90.00');
  });
  it('no breakdown when any field is invalid', () => {
    expect(run('abc', '2').result.kind).toBe('invalid');
  });
});

describe('S-5 Clear errors for an invalid bill amount', () => {
  it.each([
    ['abc', 'Enter the bill as a number, for example 84.50.'],
    ['12abc', 'Enter the bill as a number, for example 84.50.'],
    ['1e5', 'Enter the bill as a number, for example 84.50.'],
    ['12,5', 'Enter the bill as a number, for example 84.50.'],
    ['-20', "The bill amount can't be negative."],
    ['0', 'The bill amount must be more than 0.'],
    ['0.00', 'The bill amount must be more than 0.'],
    ['12.345', 'The bill amount can have at most 2 decimal places.'],
    ['1000000.01', 'The bill amount must be 1,000,000.00 or less.'],
    ['99999999999999999999', 'The bill amount must be 1,000,000.00 or less.'],
    ['', 'Enter the bill amount.'],
  ])('bill %j → %s', (bill, message) => {
    const v = run(bill, '2');
    expect(v.errors).toEqual({ bill: message });
    expectInvalid(v);
  });
});

describe('S-6 Clear errors for an invalid number of people', () => {
  it.each([
    ['0', 'There must be at least 1 person.'],
    ['-2', 'There must be at least 1 person.'],
    ['2.5', 'Enter the number of people as a whole number, for example 4.'],
    ['two', 'Enter the number of people as a whole number, for example 4.'],
    ['1e2', 'Enter the number of people as a whole number, for example 4.'],
    ['101', 'The number of people must be 100 or fewer.'],
    ['', 'Enter the number of people.'],
  ])('people %j → %s', (people, message) => {
    const v = run('90', people);
    expect(v.errors).toEqual({ people: message });
    expectInvalid(v);
  });
  it('100 people is allowed', () => {
    const v = run('90', '100');
    expect(v.errors).toEqual({});
    expect(sentence(v)).toBe('Each person pays $0.90');
  });
});

describe('S-7 Clear errors for an invalid custom tip', () => {
  it.each([
    ['-5', "The tip can't be negative."],
    ['150', 'The tip must be 100% or less.'],
    ['abc', 'Enter the tip as a number, for example 15.'],
    ['12.345', 'The tip can have at most 2 decimal places.'],
    ['', 'Enter a tip percentage.'],
  ])('custom tip %j → %s', (tip, message) => {
    const v = run('100', '2', 'custom', tip);
    expect(v.errors).toEqual({ customTip: message });
    expectInvalid(v);
  });
  it('selecting a preset clears the custom tip error', () => {
    const v = run('100', '2', '15', 'abc');
    expect(v.errors).toEqual({});
    expect(sentence(v)).toBe('Each person pays $57.50');
  });
});

describe('S-8 Carry on after a result or an error (logic level; DOM tests in ui.test.ts)', () => {
  it('both errors are shown at the same time', () => {
    const v = run('abc', '0');
    expect(v.errors).toEqual({
      bill: 'Enter the bill as a number, for example 84.50.',
      people: 'There must be at least 1 person.',
    });
    expectInvalid(v);
  });
  it('fixing only the bill keeps the people error and shows no split', () => {
    const v = run('100', '0');
    expect(v.errors).toEqual({ people: 'There must be at least 1 person.' });
    expectInvalid(v);
  });
});

describe('Inputs are never mutated by evaluation', () => {
  it('evaluate is pure', () => {
    const inputs: FormInputs = { bill: 'abc', people: '0', tipChoice: 'custom', customTip: 'x' };
    const copy = { ...inputs };
    evaluate(inputs, ALL_TOUCHED);
    expect(inputs).toEqual(copy);
  });
});
