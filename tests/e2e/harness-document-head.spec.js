import { test, expect } from '@playwright/test';

test('harness applies document head and branding', async ({ page }) => {
  await page.goto('/tests/harness/document-head.html');
  await expect(page).toHaveTitle('Harness Title');
  await expect(page.locator('link[rel="icon"]')).toHaveAttribute('href', '/favicon.svg');
  await expect(page.locator('[data-brand="header-logo"]')).toHaveAttribute('src', '/favicon.svg');
});
