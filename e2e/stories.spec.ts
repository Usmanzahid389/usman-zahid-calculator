/**
 * End-to-end acceptance tests in real browsers (Chromium, Firefox, WebKit, plus phone viewports).
 * Typing uses real key presses, so in-between states such as "-" or "12." are exercised as a user would.
 * Test names start with the story ID from docs/user-stories.md.
 */
import { expect, test, type Locator, type Page } from '@playwright/test';

const bill = (p: Page) => p.getByLabel('Bill amount');
const people = (p: Page) => p.getByLabel('Number of people');
const customTip = (p: Page) => p.getByLabel('Custom tip (%)');
const tip = (p: Page, name: 'No tip' | '10%' | '15%' | '20%' | 'Custom') =>
  p.getByRole('radio', { name, exact: true });
const result = (p: Page) => p.locator('#result-message');
const breakdown = (p: Page) => p.locator('#breakdown');
const error = (p: Page, id: 'bill' | 'people' | 'custom-tip') => p.locator(`#${id}-error`);

/** Clear a field with real keys, then type the value one key at a time. */
async function setField(field: Locator, value: string): Promise<void> {
  await field.click();
  await field.press('ControlOrMeta+a');
  await field.press('Backspace');
  if (value) await field.pressSequentially(value);
}

async function split(p: Page, billValue: string, peopleValue: string): Promise<void> {
  await setField(bill(p), billValue);
  await setField(people(p), peopleValue);
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('Starting state', async ({ page }) => {
  await expect(page).toHaveTitle('Fair Split');
  await expect(bill(page)).toHaveValue('');
  await expect(people(page)).toHaveValue('2');
  await expect(tip(page, 'No tip')).toBeChecked();
  await expect(result(page)).toHaveText('Enter the bill amount to see the split.');
  await expect(error(page, 'bill')).toBeHidden();
  await expect(customTip(page)).toBeHidden();
});

test.describe('S-1 Split a bill evenly', () => {
  const cases: Array<[string, string, string]> = [
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
  ];
  for (const [b, n, expected] of cases) {
    test(`bill ${JSON.stringify(b)}, people ${n} → ${expected}`, async ({ page }) => {
      await split(page, b, n);
      await expect(result(page)).toHaveText(expected);
    });
  }
});

test.describe('S-2 Add a tip as a percentage', () => {
  test('tip options, in order', async ({ page }) => {
    const labels = await page.locator('.tip-options label').allInnerTexts();
    expect(labels.map((l) => l.trim())).toEqual(['No tip', '10%', '15%', '20%', 'Custom']);
  });

  test('15% then 20% updates without any other action', async ({ page }) => {
    await split(page, '100', '2');
    await tip(page, '15%').click();
    await expect(result(page)).toHaveText('Each person pays $57.50');
    await tip(page, '20%').click();
    await expect(result(page)).toHaveText('Each person pays $60.00');
  });

  test('33.33 at 15% rounds the tip half up to $5.00', async ({ page }) => {
    await split(page, '33.33', '1');
    await tip(page, '15%').click();
    await expect(result(page)).toHaveText('1 person pays $38.33');
    await expect(breakdown(page)).toContainText('Tip (15%)$5.00');
  });

  for (const [b, t, expected] of [
    ['80', '12.5', '1 person pays $90.00'],
    ['50', '100', '1 person pays $100.00'],
    ['50', '0', '1 person pays $50.00'],
  ]) {
    test(`custom tip ${t}% on ${b} → ${expected}`, async ({ page }) => {
      await split(page, b, '1');
      await tip(page, 'Custom').click();
      await expect(customTip(page)).toBeFocused();
      await customTip(page).pressSequentially(t);
      await expect(result(page)).toHaveText(expected);
    });
  }

  test('Custom selected but untouched: prompt, no error', async ({ page }) => {
    await split(page, '100', '2');
    await tip(page, 'Custom').click();
    await expect(error(page, 'custom-tip')).toBeHidden();
    await expect(result(page)).toHaveText('Enter a tip percentage to see the split.');
  });

  test('custom value is ignored after selecting 10%', async ({ page }) => {
    await split(page, '100', '1');
    await tip(page, 'Custom').click();
    await customTip(page).pressSequentially('12.5');
    await tip(page, '10%').click();
    await expect(result(page)).toHaveText('1 person pays $110.00');
  });
});

test.describe('S-3 Shares always add up to the total', () => {
  test('100 split 3 ways', async ({ page }) => {
    await split(page, '100', '3');
    await expect(result(page)).toHaveText('1 person pays $33.34 and 2 people pay $33.33');
    await expect(breakdown(page)).toContainText('Shares add up to$100.00');
  });
  test('100 split 6 ways', async ({ page }) => {
    await split(page, '100', '6');
    await expect(result(page)).toHaveText('4 people pay $16.67 and 2 people pay $16.66');
  });
  test('10 with 15% split 3 ways', async ({ page }) => {
    await split(page, '10', '3');
    await tip(page, '15%').click();
    await expect(result(page)).toHaveText('1 person pays $3.84 and 2 people pay $3.83');
    await expect(breakdown(page)).toContainText('Shares add up to$11.50');
  });
  test('1,000,000 with 100% tip split 3 ways', async ({ page }) => {
    await split(page, '1000000', '3');
    await tip(page, 'Custom').click();
    await customTip(page).pressSequentially('100');
    await expect(result(page)).toHaveText('2 people pay $666,666.67 and 1 person pays $666,666.66');
    await expect(breakdown(page)).toContainText('Shares add up to$2,000,000.00');
  });
  test('0.03 / 3 is $0.01 each; 0.02 / 3 is too small', async ({ page }) => {
    await split(page, '0.03', '3');
    await expect(result(page)).toHaveText('Each person pays $0.01');
    await setField(bill(page), '0.02');
    await expect(result(page)).toHaveText(
      'The total of $0.02 is too small to split between 3 people. Each person must pay at least $0.01.',
    );
    await expect(breakdown(page)).toBeHidden();
  });
});

test.describe('S-4 See how the amount was reached', () => {
  test('breakdown for 100 at 15% between 2', async ({ page }) => {
    await split(page, '100', '2');
    await tip(page, '15%').click();
    const rows = await breakdown(page).locator('div').allInnerTexts();
    expect(rows.map((r) => r.replace(/\s+/g, ' ').trim())).toEqual([
      'Bill $100.00',
      'Tip (15%) $15.00',
      'Total $115.00',
      'Shares add up to $115.00',
    ]);
  });
  test('no breakdown when invalid', async ({ page }) => {
    await split(page, 'abc', '2');
    await expect(breakdown(page)).toBeHidden();
  });
});

test.describe('S-5 Clear errors for an invalid bill amount', () => {
  const cases: Array<[string, string]> = [
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
  ];
  for (const [b, message] of cases) {
    test(`bill ${JSON.stringify(b)} → ${message}`, async ({ page }) => {
      await split(page, b, '2');
      await expect(error(page, 'bill')).toHaveText(message);
      await expect(bill(page)).toHaveAttribute('aria-invalid', 'true');
      await expect(result(page)).toHaveText('Fix the highlighted fields to see the split.');
      await expect(page.locator('body')).not.toContainText(/NaN|Infinity|e\+/);
    });
  }

  test('typing then clearing shows "Enter the bill amount."', async ({ page }) => {
    await setField(bill(page), '50');
    await setField(bill(page), '');
    await expect(error(page, 'bill')).toHaveText('Enter the bill amount.');
  });

  test('error is linked to the field for screen readers', async ({ page }) => {
    await setField(bill(page), 'abc');
    await expect(bill(page)).toHaveAccessibleDescription('Enter the bill as a number, for example 84.50.');
  });
});

test.describe('S-6 Clear errors for an invalid number of people', () => {
  const cases: Array<[string, string]> = [
    ['0', 'There must be at least 1 person.'],
    ['-2', 'There must be at least 1 person.'],
    ['2.5', 'Enter the number of people as a whole number, for example 4.'],
    ['two', 'Enter the number of people as a whole number, for example 4.'],
    ['1e2', 'Enter the number of people as a whole number, for example 4.'],
    ['101', 'The number of people must be 100 or fewer.'],
    ['', 'Enter the number of people.'],
  ];
  for (const [n, message] of cases) {
    test(`people ${JSON.stringify(n)} → ${message}`, async ({ page }) => {
      await split(page, '90', n);
      await expect(error(page, 'people')).toHaveText(message);
      await expect(breakdown(page)).toBeHidden();
    });
  }
  test('100 people is allowed', async ({ page }) => {
    await split(page, '90', '100');
    await expect(error(page, 'people')).toBeHidden();
    await expect(result(page)).toHaveText('Each person pays $0.90');
  });
});

test.describe('S-7 Clear errors for an invalid custom tip', () => {
  const cases: Array<[string, string]> = [
    ['-5', "The tip can't be negative."],
    ['150', 'The tip must be 100% or less.'],
    ['abc', 'Enter the tip as a number, for example 15.'],
    ['12.345', 'The tip can have at most 2 decimal places.'],
  ];
  for (const [t, message] of cases) {
    test(`custom tip ${JSON.stringify(t)} → ${message}`, async ({ page }) => {
      await split(page, '100', '2');
      await tip(page, 'Custom').click();
      await customTip(page).pressSequentially(t);
      await expect(error(page, 'custom-tip')).toHaveText(message);
      await expect(result(page)).toHaveText('Fix the highlighted fields to see the split.');
    });
  }
  test('typing 15 then clearing shows "Enter a tip percentage."', async ({ page }) => {
    await split(page, '100', '2');
    await tip(page, 'Custom').click();
    await setField(customTip(page), '15');
    await setField(customTip(page), '');
    await expect(error(page, 'custom-tip')).toHaveText('Enter a tip percentage.');
  });
  test('choosing a preset clears the custom tip error', async ({ page }) => {
    await split(page, '100', '2');
    await tip(page, 'Custom').click();
    await customTip(page).pressSequentially('abc');
    await tip(page, '15%').click();
    await expect(error(page, 'custom-tip')).toBeHidden();
    await expect(result(page)).toHaveText('Each person pays $57.50');
  });
});

test.describe('S-8 Carry on after a result or an error', () => {
  test('changing people after a result updates immediately', async ({ page }) => {
    await split(page, '100', '3');
    await expect(result(page)).toHaveText('1 person pays $33.34 and 2 people pay $33.33');
    await setField(people(page), '4');
    await expect(result(page)).toHaveText('Each person pays $25.00');
  });

  test('an invalid bill removes the previous result', async ({ page }) => {
    await split(page, '100', '2');
    await expect(result(page)).toHaveText('Each person pays $50.00');
    await setField(bill(page), 'abc');
    await expect(result(page)).toHaveText('Fix the highlighted fields to see the split.');
    await expect(breakdown(page)).toBeHidden();
  });

  test('fixing people after an error clears it', async ({ page }) => {
    await split(page, '100', '0');
    await expect(error(page, 'people')).toHaveText('There must be at least 1 person.');
    await setField(people(page), '4');
    await expect(error(page, 'people')).toBeHidden();
    await expect(people(page)).toHaveAttribute('aria-invalid', 'false');
    await expect(result(page)).toHaveText('Each person pays $25.00');
  });

  test('two errors at once; fixing one keeps the other', async ({ page }) => {
    await split(page, 'abc', '0');
    await expect(error(page, 'bill')).toBeVisible();
    await expect(error(page, 'people')).toBeVisible();
    await setField(bill(page), '100');
    await expect(error(page, 'bill')).toBeHidden();
    await expect(error(page, 'people')).toHaveText('There must be at least 1 person.');
    await expect(result(page)).toHaveText('Fix the highlighted fields to see the split.');
  });

  test('other fields keep their values when one is invalid', async ({ page }) => {
    await setField(bill(page), '$84.50');
    await tip(page, 'Custom').click();
    await customTip(page).pressSequentially('12.5');
    await setField(people(page), 'two');
    await expect(bill(page)).toHaveValue('$84.50');
    await expect(customTip(page)).toHaveValue('12.5');
    await expect(tip(page, 'Custom')).toBeChecked();
  });

  test('Reset restores defaults and clears errors', async ({ page }) => {
    await split(page, 'abc', '0');
    await tip(page, 'Custom').click();
    await customTip(page).pressSequentially('-5');
    await page.getByRole('button', { name: 'Reset' }).click();
    await expect(bill(page)).toHaveValue('');
    await expect(people(page)).toHaveValue('2');
    await expect(tip(page, 'No tip')).toBeChecked();
    await expect(customTip(page)).toBeHidden();
    await expect(page.locator('.error:visible')).toHaveCount(0);
    await expect(result(page)).toHaveText('Enter the bill amount to see the split.');
  });

  test('Reset then Custom again starts with an untouched custom field', async ({ page }) => {
    await split(page, '100', '2');
    await tip(page, 'Custom').click();
    await customTip(page).pressSequentially('abc');
    await page.getByRole('button', { name: 'Reset' }).click();
    await setField(bill(page), '100');
    await tip(page, 'Custom').click();
    await expect(customTip(page)).toHaveValue('');
    await expect(error(page, 'custom-tip')).toBeHidden();
    await expect(result(page)).toHaveText('Enter a tip percentage to see the split.');
  });

  test('pressing Enter in each field does not reload or lose values', async ({ page }) => {
    await page.evaluate(() => ((window as unknown as { marker: number }).marker = 42));
    await split(page, '100', '3');
    await bill(page).press('Enter');
    await people(page).press('Enter');
    await tip(page, 'Custom').click();
    await customTip(page).pressSequentially('10');
    await customTip(page).press('Enter');
    expect(await page.evaluate(() => (window as unknown as { marker?: number }).marker)).toBe(42);
    await expect(bill(page)).toHaveValue('100');
    await expect(result(page)).toHaveText('2 people pay $36.67 and 1 person pays $36.66');
  });
});

test.describe('Real-user extras (not tied to a single criterion)', () => {
  test('typing "-5" key by key never shows a result for the "-" state', async ({ page }) => {
    await setField(bill(page), '-5');
    await expect(error(page, 'bill')).toHaveText("The bill amount can't be negative.");
  });

  test('pasting a value with spaces works', async ({ page }) => {
    await bill(page).fill('  1,250.00  ');
    await expect(result(page)).toHaveText('Each person pays $625.00');
  });

  test('keyboard only: Tab reaches bill → tip → people → Reset', async ({ page, browserName, isMobile }) => {
    test.skip(isMobile, 'No physical keyboard on phones');
    test.skip(browserName === 'webkit', 'Safari only tabs to buttons and radios when "Press Tab to highlight each item" is on');
    await bill(page).focus();
    await page.keyboard.press('Tab');
    await expect(tip(page, 'No tip')).toBeFocused();
    await page.keyboard.press('ArrowRight');
    await expect(tip(page, '10%')).toBeChecked();
    await page.keyboard.press('Tab');
    await expect(people(page)).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: 'Reset' })).toBeFocused();
  });

  test('a 20-digit bill does not cause horizontal scrolling at 320px', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await split(page, '99999999999999999999', '2');
    await setField(bill(page), '1000000');
    await setField(people(page), '3');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
