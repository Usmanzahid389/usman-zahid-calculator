/**
 * S-12 (phone use) and S-13 (keyboard and screen reader) from docs/user-stories.md, in real browsers.
 */
import { expect, test, type Locator, type Page } from '@playwright/test';

async function setField(field: Locator, value: string): Promise<void> {
  await field.click();
  await field.press('ControlOrMeta+a');
  await field.press('Backspace');
  if (value) await field.pressSequentially(value);
}
const noSideScroll = (p: Page) =>
  p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test.describe('S-12 Use it on a phone at the table', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
  });

  test('fits 320px with no sideways scroll', async ({ page }) => {
    expect(await noSideScroll(page)).toBe(true);
    for (const el of [
      page.getByLabel('Bill amount'),
      page.getByRole('radio', { name: 'Custom', exact: true }),
      page.getByLabel('Number of people'),
      page.getByRole('button', { name: 'Reset' }),
      page.locator('#result-message'),
    ]) {
      const box = (await el.boundingBox())!;
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(320);
    }
  });

  test('a 20-digit bill error wraps without sideways scroll', async ({ page }) => {
    await setField(page.getByLabel('Bill amount'), '99999999999999999999');
    await expect(page.locator('#bill-error')).toHaveText('The bill amount must be 1,000,000.00 or less.');
    expect(await noSideScroll(page)).toBe(true);
  });

  test('the longest result wraps without sideways scroll', async ({ page }) => {
    await setField(page.getByLabel('Bill amount'), '1000000');
    await page.getByRole('radio', { name: 'Custom', exact: true }).click();
    await page.getByLabel('Custom tip (%)').pressSequentially('100');
    await setField(page.getByLabel('Number of people'), '3');
    await expect(page.locator('#result-message')).toHaveText(
      '2 people pay $666,666.67 and 1 person pays $666,666.66',
    );
    expect(await noSideScroll(page)).toBe(true);
  });

  test('number keyboards: decimal for money and tip, numeric for people', async ({ page }) => {
    await expect(page.getByLabel('Bill amount')).toHaveAttribute('inputmode', 'decimal');
    await expect(page.getByLabel('Custom tip (%)')).toHaveAttribute('inputmode', 'decimal');
    await expect(page.getByLabel('Number of people')).toHaveAttribute('inputmode', 'numeric');
  });

  test('tap targets are at least 44px tall', async ({ page }) => {
    await page.getByRole('radio', { name: 'Custom', exact: true }).click();
    const targets = [
      ...(await page.locator('.tip-options label').all()),
      page.getByLabel('Bill amount'),
      page.getByLabel('Custom tip (%)'),
      page.getByLabel('Number of people'),
      page.getByRole('button', { name: 'Reset' }),
    ];
    for (const t of targets) {
      const h = (await t.boundingBox())!.height;
      expect(h, `${await t.evaluate((e) => e.outerHTML.slice(0, 60))} is ${h}px tall`).toBeGreaterThanOrEqual(44);
    }
  });
});

test.describe('S-13 Use it with a keyboard or a screen reader', () => {
  test('accessible names and the Tip radio group', async ({ page }) => {
    await page.getByRole('radio', { name: 'Custom', exact: true }).click();
    await expect(page.getByRole('textbox', { name: 'Bill amount' })).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Number of people' })).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Custom tip (%)' })).toBeVisible();
    const group = page.getByRole('group', { name: 'Tip' });
    for (const name of ['No tip', '10%', '15%', '20%', 'Custom']) {
      await expect(group.getByRole('radio', { name, exact: true })).toBeVisible();
    }
  });

  test('arrow keys change the tip and update the result', async ({ page, isMobile }) => {
    test.skip(isMobile, 'No physical keyboard on phones');
    await setField(page.getByLabel('Bill amount'), '100');
    await page.getByRole('radio', { name: 'No tip' }).focus();
    await page.keyboard.press('ArrowRight');
    await expect(page.getByRole('radio', { name: '10%' })).toBeChecked();
    await expect(page.locator('#result-message')).toHaveText('Each person pays $55.00');
  });

  test('visible focus outline (≥ 2px, accent colour) on every control', async ({ page, isMobile }) => {
    test.skip(isMobile, 'Focus rings are a keyboard feature');
    await page.getByRole('radio', { name: 'Custom', exact: true }).click();
    const accent = await page.evaluate(() => {
      const probe = document.createElement('div');
      probe.style.color = getComputedStyle(document.documentElement).getPropertyValue('--accent');
      document.body.append(probe);
      const c = getComputedStyle(probe).color;
      probe.remove();
      return c;
    });
    const controls = [
      page.getByLabel('Bill amount'),
      page.getByRole('radio', { name: '15%' }),
      page.getByLabel('Custom tip (%)'),
      page.getByLabel('Number of people'),
      page.getByRole('button', { name: 'Reset' }),
    ];
    for (const c of controls) {
      // Reach each control from the keyboard so :focus-visible applies.
      await c.focus();
      await page.keyboard.press('Shift+Tab');
      await page.keyboard.press('Tab');
      if (!(await c.evaluate((e) => e === document.activeElement))) await c.focus();
      const s = await c.evaluate((e) => {
        const cs = getComputedStyle(e);
        return { style: cs.outlineStyle, width: parseFloat(cs.outlineWidth), color: cs.outlineColor };
      });
      const name = await c.evaluate((e) => e.id || (e as HTMLInputElement).value || e.textContent);
      expect(s.style, `${name} outline style`).not.toBe('none');
      expect(s.width, `${name} outline width`).toBeGreaterThanOrEqual(2);
      expect(s.color, `${name} outline colour`).toBe(accent);
    }
  });

  test('choosing Custom moves focus to the custom tip field', async ({ page }) => {
    await page.getByRole('radio', { name: 'Custom', exact: true }).click();
    await expect(page.getByLabel('Custom tip (%)')).toBeFocused();
  });

  test('the result is a polite live region', async ({ page }) => {
    await expect(page.locator('#result')).toHaveAttribute('aria-live', 'polite');
  });

  test('errors: aria-invalid and accessible description', async ({ page }) => {
    await setField(page.getByLabel('Number of people'), '0');
    const people = page.getByLabel('Number of people');
    await expect(people).toHaveAttribute('aria-invalid', 'true');
    await expect(people).toHaveAccessibleDescription('There must be at least 1 person.');
  });
});
