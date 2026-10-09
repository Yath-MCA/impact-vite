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
