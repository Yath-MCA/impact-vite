import { test, expect } from '@playwright/test';

test('home then login updates title favicon and logos', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle('IMPACT');
  await expect(page.locator('#app [data-brand="header-logo"]')).toHaveAttribute('src', /favicon\.svg/);

  await page.evaluate(() => {
    location.hash = '#/login';
  });
  await expect(page).toHaveTitle('IMPACT | Log In');
  await expect(page.locator('#app [data-brand="login-logo"]')).toHaveAttribute('src', /favicon\.svg/);
  await expect(page.locator('link[rel="icon"]')).toHaveAttribute('href', /favicon\.svg/);
});
