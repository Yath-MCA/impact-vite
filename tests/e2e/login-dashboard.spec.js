import { test, expect } from '@playwright/test';

test('login with mocked API reaches dashboard shell', async ({ page }) => {
  await page.route('**/api/**userlogin**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        username: 'tester',
        userId: 'u1',
        cred: 1,
        apikey: 'test-key',
      }),
    });
  });

  await page.goto('/#/login');
  await expect(page.locator('#email')).toBeVisible();
  await page.locator('#email').fill('tester@example.com');
  await page.locator('#password').fill('secret');
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(page).toHaveURL(/#\/dashboard/);
  await expect(page.getByText(/Welcome/i)).toBeVisible();
  await expect(page.locator('.dashboard-layout')).toBeVisible();
});
