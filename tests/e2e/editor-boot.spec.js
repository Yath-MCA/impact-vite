import { test, expect } from '@playwright/test';

test('editor hash boots skeleton and CKEDITOR', async ({ page }) => {
  await page.goto('/#/editor');
  await expect(page.locator('#Body, .content-header-i, #navbar_row_1').first()).toBeVisible({
    timeout: 30000,
  });
  await expect
    .poll(async () => page.evaluate(() => typeof window.CKEDITOR !== 'undefined'))
    .toBe(true);
});

test('editor boot has no isValidVariable console error', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (err) => errors.push(String(err)));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  await page.goto('/#/editor');
  await expect(page.locator('#Body, .content-header-i, #navbar_row_1').first()).toBeVisible({
    timeout: 30000,
  });
  expect(errors.some((e) => /isValidVariable is not a function/i.test(e))).toBe(false);
});
