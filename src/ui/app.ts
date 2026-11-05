/**
 * DOM wiring. Holds the form state, calls evaluate() on every change and renders the view.
 * All user-derived text is written with textContent, never innerHTML.
 */

import {
  DEFAULT_INPUTS,
  UNTOUCHED,
  evaluate,
  type FieldErrors,
  type FormInputs,
  type TipChoice,
  type Touched,
  type View,
} from '../lib/evaluate';

const TEMPLATE = /* html */ `
  <main class="card">
    <header>
      <h1>Fair Split</h1>
      <p class="tagline">Split a bill and tip so the shares always add up to the total.</p>
    </header>

    <form id="split-form" novalidate autocomplete="off">
      <div class="field">
        <label for="bill">Bill amount</label>
        <input id="bill" name="bill" type="text" inputmode="decimal"
               placeholder="e.g. 84.50" aria-describedby="bill-error" />
        <p id="bill-error" class="error" hidden></p>
      </div>

      <fieldset class="field">
        <legend>Tip</legend>
        <div class="tip-options">
          <label><input type="radio" name="tip" value="none" checked /> No tip</label>
          <label><input type="radio" name="tip" value="10" /> 10%</label>
          <label><input type="radio" name="tip" value="15" /> 15%</label>
          <label><input type="radio" name="tip" value="20" /> 20%</label>
          <label><input type="radio" name="tip" value="custom" /> Custom</label>
        </div>
        <div id="custom-tip-wrap" class="custom-tip" hidden>
          <label for="custom-tip">Custom tip (%)</label>
          <input id="custom-tip" name="custom-tip" type="text" inputmode="decimal"
                 placeholder="e.g. 12.5" aria-describedby="custom-tip-error" />
          <p id="custom-tip-error" class="error" hidden></p>
        </div>
      </fieldset>

      <div class="field">
        <label for="people">Number of people</label>
        <input id="people" name="people" type="text" inputmode="numeric"
               aria-describedby="people-error" />
        <p id="people-error" class="error" hidden></p>
      </div>

      <button id="reset" type="button" class="secondary">Reset</button>
    </form>

    <section id="result" class="result" aria-live="polite" aria-label="Result">
      <p id="result-message" class="result-message"></p>
      <dl id="breakdown" class="breakdown" hidden></dl>
    </section>
  </main>
`;

function byId<T extends HTMLElement>(root: ParentNode, id: string): T {
  const el = root.querySelector<T>(`#${id}`);
  if (!el) throw new Error(`Missing element #${id}`);
  return el;
}

export function mount(container: HTMLElement): void {
  container.innerHTML = TEMPLATE;

  const form = byId<HTMLFormElement>(container, 'split-form');
  const bill = byId<HTMLInputElement>(container, 'bill');
  const people = byId<HTMLInputElement>(container, 'people');
  const customTip = byId<HTMLInputElement>(container, 'custom-tip');
  const customWrap = byId<HTMLDivElement>(container, 'custom-tip-wrap');
  const resetButton = byId<HTMLButtonElement>(container, 'reset');
  const resultSection = byId<HTMLElement>(container, 'result');
  const resultMessage = byId<HTMLParagraphElement>(container, 'result-message');
  const breakdown = byId<HTMLDListElement>(container, 'breakdown');
  const tipRadios = Array.from(container.querySelectorAll<HTMLInputElement>('input[name="tip"]'));

  let touched: Touched = { ...UNTOUCHED };

  const readInputs = (): FormInputs => ({
    bill: bill.value,
    people: people.value,
    tipChoice: (tipRadios.find((r) => r.checked)?.value ?? 'none') as TipChoice,
    customTip: customTip.value,
  });

  const fields: Array<[keyof FieldErrors, HTMLInputElement]> = [
    ['bill', bill],
    ['people', people],
    ['customTip', customTip],
  ];

  function render(view: View, inputs: FormInputs): void {
    customWrap.hidden = inputs.tipChoice !== 'custom';

    for (const [key, input] of fields) {
      const errorEl = byId<HTMLParagraphElement>(container, `${input.id}-error`);
      const message = view.errors[key];
      input.setAttribute('aria-invalid', message ? 'true' : 'false');
      errorEl.textContent = message ?? '';
      errorEl.hidden = !message;
    }

    const r = view.result;
    resultSection.dataset.state = r.kind;
    breakdown.replaceChildren();
    if (r.kind === 'split') {
      resultMessage.textContent = r.sentence;
      for (const line of r.breakdown) {
        const row = document.createElement('div');
        const dt = document.createElement('dt');
        const dd = document.createElement('dd');
        dt.textContent = line.label;
        dd.textContent = line.value;
        row.append(dt, dd);
        breakdown.append(row);
      }
      breakdown.hidden = false;
    } else {
      resultMessage.textContent = r.message;
      breakdown.hidden = true;
    }
  }

  function update(): void {
    const inputs = readInputs();
    render(evaluate(inputs, touched), inputs);
  }

  function reset(): void {
    bill.value = DEFAULT_INPUTS.bill;
    people.value = DEFAULT_INPUTS.people;
    customTip.value = DEFAULT_INPUTS.customTip;
    for (const r of tipRadios) r.checked = r.value === DEFAULT_INPUTS.tipChoice;
    touched = { ...UNTOUCHED };
    update();
  }

  bill.addEventListener('input', () => {
    touched.bill = true;
    update();
  });
  people.addEventListener('input', () => {
    touched.people = true;
    update();
  });
  customTip.addEventListener('input', () => {
    touched.customTip = true;
    update();
  });
  for (const radio of tipRadios) {
    radio.addEventListener('change', () => {
      update();
      if (radio.value === 'custom' && radio.checked) customTip.focus();
    });
  }
  resetButton.addEventListener('click', () => {
    reset();
    bill.focus();
  });
  // Enter must never reload the page or lose values (S-8).
  form.addEventListener('submit', (e) => e.preventDefault());

  reset();
}
