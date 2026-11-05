// @vitest-environment jsdom
/**
 * DOM-level acceptance tests: what the user actually sees and does in the page.
 * Focus on S-8 (carry on after a result or an error), Reset, Enter, and accessibility (S-5).
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { mount } from '../src/ui/app';

let root: HTMLElement;
const $ = <T extends HTMLElement = HTMLElement>(sel: string) => root.querySelector<T>(sel)!;

function type(id: string, value: string): void {
  const input = $<HTMLInputElement>(`#${id}`);
  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

function chooseTip(value: string): void {
  const radio = $<HTMLInputElement>(`input[name="tip"][value="${value}"]`);
  radio.checked = true;
  radio.dispatchEvent(new Event('change', { bubbles: true }));
}

const resultText = () => $('#result-message').textContent;
const errorText = (id: string) => {
  const el = $(`#${id}-error`);
  return el.hidden ? null : el.textContent;
};
const breakdownVisible = () => !$('#breakdown').hidden;

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
  root = document.getElementById('app')!;
  mount(root);
});

describe('Starting state', () => {
  it('shows defaults and the bill prompt', () => {
    expect($<HTMLInputElement>('#bill').value).toBe('');
    expect($<HTMLInputElement>('#people').value).toBe('2');
    expect($<HTMLInputElement>('input[name="tip"]:checked').value).toBe('none');
    expect(resultText()).toBe('Enter the bill amount to see the split.');
    expect(errorText('bill')).toBeNull();
    expect($('#custom-tip-wrap').hidden).toBe(true);
  });
  it('S-2: tip options are No tip, 10%, 15%, 20%, Custom', () => {
    const labels = Array.from(root.querySelectorAll('.tip-options label')).map((l) => l.textContent!.trim());
    expect(labels).toEqual(['No tip', '10%', '15%', '20%', 'Custom']);
  });
});

describe('S-1 / S-3 / S-4 in the page', () => {
  it('100 split 3 ways shows the uneven sentence and the breakdown', () => {
    type('bill', '100');
    type('people', '3');
    expect(resultText()).toBe('1 person pays $33.34 and 2 people pay $33.33');
    const rows = Array.from(root.querySelectorAll('#breakdown div')).map((d) =>
      `${d.querySelector('dt')!.textContent} ${d.querySelector('dd')!.textContent}`,
    );
    expect(rows).toEqual(['Bill $100.00', 'Tip (0%) $0.00', 'Total $100.00', 'Shares add up to $100.00']);
  });
  it('S-2: selecting Custom reveals the field and prompts without an error', () => {
    type('bill', '100');
    chooseTip('custom');
    expect($('#custom-tip-wrap').hidden).toBe(false);
    expect(errorText('custom-tip')).toBeNull();
    expect(resultText()).toBe('Enter a tip percentage to see the split.');
  });
});

describe('S-5 accessibility of errors', () => {
  it('invalid bill is marked aria-invalid and linked to its message', () => {
    type('bill', 'abc');
    const bill = $<HTMLInputElement>('#bill');
    expect(bill.getAttribute('aria-invalid')).toBe('true');
    expect(bill.getAttribute('aria-describedby')).toBe('bill-error');
    expect(errorText('bill')).toBe('Enter the bill as a number, for example 84.50.');
    expect($('#result').getAttribute('aria-live')).toBe('polite');
  });
  it('typing then clearing the bill shows "Enter the bill amount."', () => {
    type('bill', '50');
    type('bill', '');
    expect(errorText('bill')).toBe('Enter the bill amount.');
  });
});

describe('S-7 in the page', () => {
  it('custom tip error disappears when a preset is chosen', () => {
    type('bill', '100');
    chooseTip('custom');
    type('custom-tip', 'abc');
    expect(errorText('custom-tip')).toBe('Enter the tip as a number, for example 15.');
    chooseTip('15');
    expect(errorText('custom-tip')).toBeNull();
    expect(resultText()).toBe('Each person pays $57.50');
  });
});

describe('S-8 Carry on after a result or an error', () => {
  it('changing people after a result updates it immediately', () => {
    type('bill', '100');
    type('people', '3');
    type('people', '4');
    expect(resultText()).toBe('Each person pays $25.00');
  });

  it('making the bill invalid removes the previous result (no stale result)', () => {
    type('bill', '100');
    expect(resultText()).toBe('Each person pays $50.00');
    type('bill', 'abc');
    expect(resultText()).toBe('Fix the highlighted fields to see the split.');
    expect(breakdownVisible()).toBe(false);
  });

  it('fixing people after an error clears it and shows the result', () => {
    type('bill', '100');
    type('people', '0');
    expect(errorText('people')).toBe('There must be at least 1 person.');
    type('people', '4');
    expect(errorText('people')).toBeNull();
    expect($<HTMLInputElement>('#people').getAttribute('aria-invalid')).toBe('false');
    expect(resultText()).toBe('Each person pays $25.00');
  });

  it('two errors at once; fixing one keeps the other and still shows no split', () => {
    type('bill', 'abc');
    type('people', '0');
    expect(errorText('bill')).not.toBeNull();
    expect(errorText('people')).not.toBeNull();
    type('bill', '100');
    expect(errorText('bill')).toBeNull();
    expect(errorText('people')).toBe('There must be at least 1 person.');
    expect(resultText()).toBe('Fix the highlighted fields to see the split.');
  });

  it('other fields keep their values exactly as typed when one is invalid', () => {
    type('bill', ' $84.50 ');
    chooseTip('custom');
    type('custom-tip', '12.5');
    type('people', 'two');
    expect($<HTMLInputElement>('#bill').value).toBe(' $84.50 ');
    expect($<HTMLInputElement>('#custom-tip').value).toBe('12.5');
    expect($<HTMLInputElement>('input[name="tip"]:checked').value).toBe('custom');
  });

  it('Reset restores defaults and clears all errors', () => {
    type('bill', 'abc');
    type('people', '0');
    chooseTip('custom');
    type('custom-tip', '-5');
    $<HTMLButtonElement>('#reset').click();
    expect($<HTMLInputElement>('#bill').value).toBe('');
    expect($<HTMLInputElement>('#people').value).toBe('2');
    expect($<HTMLInputElement>('input[name="tip"]:checked').value).toBe('none');
    expect(errorText('bill')).toBeNull();
    expect(errorText('people')).toBeNull();
    expect(errorText('custom-tip')).toBeNull();
    expect(resultText()).toBe('Enter the bill amount to see the split.');
  });

  it('after Reset, an untouched empty bill still shows no error', () => {
    type('bill', '5');
    type('bill', '');
    $<HTMLButtonElement>('#reset').click();
    expect(errorText('bill')).toBeNull();
  });

  it('pressing Enter (form submit) is prevented and keeps values', () => {
    type('bill', '100');
    const ev = new Event('submit', { cancelable: true, bubbles: true });
    $('#split-form').dispatchEvent(ev);
    expect(ev.defaultPrevented).toBe(true);
    expect($<HTMLInputElement>('#bill').value).toBe('100');
    expect(resultText()).toBe('Each person pays $50.00');
  });

  it('user text is rendered as text, never as HTML', () => {
    type('bill', '<img src=x onerror=alert(1)>');
    expect(root.querySelector('img')).toBeNull();
  });
});
