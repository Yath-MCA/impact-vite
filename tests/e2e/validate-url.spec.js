import { test, expect } from '@playwright/test';

test('validateurl valid key opens landing shell', async ({ page }) => {
  await page.route('**/*urlvalidity*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: { docid: 'doc-1', title: 'Sample Proof', client: 'DemoClient', rolename: 'Author' },
      }),
    });
  });
  await page.route('**/*getdocs*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: [] }),
    });
  });

  await page.goto('/#/validateurl?key=test-key-abc');
  await expect(page.getByTestId('landing-shell')).toBeVisible({ timeout: 15000 });
  await expect(page.getByRole('heading', { name: /sample proof/i })).toBeVisible();
});

test('validateurl invalid key shows INVALID alert, no landing', async ({ page }) => {
  await page.route('**/*urlvalidity*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ code: 'invalid', message: 'bad key' }),
    });
  });

  await page.goto('/#/validateurl?key=bad-key');
  await expect(page.getByRole('heading', { name: 'Invalid Link' })).toBeVisible({
    timeout: 15000,
  });
  await page.locator('.swal2-confirm').click();
  await expect(page.getByTestId('landing-shell')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: /validation failed/i })).toBeVisible();
});

test('validateurl valid key shows maintenance toast when schedule active', async ({ page }) => {
  const start = Date.now() + 60 * 60 * 1000;
  const end = start + 2 * 60 * 60 * 1000;
  await page.route('**/*urlvalidity*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: { docid: 'doc-2', title: 'Maint Proof', rolename: 'Author' },
      }),
    });
  });
  await page.route('**/*getdocs*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: [{ starttime: start, endtime: end, status: 'active' }],
      }),
    });
  });

  await page.goto('/#/validateurl?key=maint-key');
  await expect(page.getByTestId('landing-shell')).toBeVisible({ timeout: 15000 });
  await expect(page.locator('.swal2-toast')).toContainText(/scheduled maintenance/i, {
    timeout: 10000,
  });
});

test('validateurl with mocked expired api shows failure', async ({ page }) => {
  await page.route('**/*urlvalidity*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        code: 'expired',
        message: 'The link has expired',
      }),
    });
  });

  await page.goto('/#/validateurl?key=expired-key');
  const swalConfirm = page.locator('.swal2-confirm');
  await expect(swalConfirm).toBeVisible({ timeout: 15000 });
  await swalConfirm.click();
  await expect(page.getByRole('heading', { name: /validation failed/i })).toBeVisible({
    timeout: 10000,
  });
  await expect(page.getByTestId('landing-shell')).toHaveCount(0);
});
